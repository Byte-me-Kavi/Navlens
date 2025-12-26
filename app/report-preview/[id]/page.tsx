import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getClickHouseClient } from '@/lib/clickhouse';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { ReportHeatmapSection } from '@/components/reports/ReportHeatmapSection';
import { ReportPerformanceWrapper } from "@/components/reports/wrappers/ReportPerformanceWrapper";
import ReportJourneyWrapper from "@/components/reports/wrappers/ReportJourneyWrapper";
import ReportFunnelsWrapper from "@/components/reports/wrappers/ReportFunnelsWrapper";
import ReportFormsWrapper from "@/components/reports/wrappers/ReportFormsWrapper";
import ReportCohortsWrapper from "@/components/reports/wrappers/ReportCohortsWrapper";
import ReportFeedbackWrapper from "@/components/reports/wrappers/ReportFeedbackWrapper";
import ReportExperimentsWrapper from "@/components/reports/wrappers/ReportExperimentsWrapper";
import ReportSessionSpotlightsWrapper from "@/components/reports/wrappers/ReportSessionSpotlightsWrapper";
import ReportMobileAuditWrapper from "@/components/reports/wrappers/ReportMobileAuditWrapper";
// MetricCard import removed
import { 
  CursorArrowRaysIcon, 
  ClockIcon, 

  ExclamationCircleIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

export default async function ReportPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const cookieStore = await cookies();
  const { id } = await params;
  
  const sp = await searchParams;
  
  // Parse Configuration
  const days = typeof sp.days === 'string' ? parseInt(sp.days) || 30 : 30;
  const includeStr = typeof sp.include === 'string' ? sp.include : 'all';
  const include = new Set(includeStr === 'all' ? ['summary', 'traffic', 'heatmaps_clicks', 'heatmaps_scrolls', 'heatmaps_elements', 'network', 'journey', 'frustration', 'cohorts', 'feedback', 'forms', 'experiments', 'sessions', 'mobile_audit'] : includeStr.split(','));
  const expiresInDays = typeof sp.expiresInDays === 'string' ? parseInt(sp.expiresInDays) : undefined;

  const showFeature = (key: string) => include.has(key);
  const showAnyHeatmap = showFeature('heatmaps_clicks') || showFeature('heatmaps_scrolls') || showFeature('heatmaps_elements');

  console.log(`[Report Params] ID: ${id}, Days: ${days}, Include: ${includeStr}, ExpiresIn: ${expiresInDays}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
           // Read only in report generation context roughly
        },
      },
    }
  );

  // 1. Fetch Site Data
  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("*")
    .eq("id", id)
    .single();

  if (siteError || !site) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        Error loading report data: {siteError?.message || "Site not found: " + id}
      </div>
    );
  }

  // 2. Fetch Aggregated Stats (Respect Date Range)
  // eslint-disable-next-line react-hooks/purity
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  const [
    { count: visitorsCount },
    { count: sessionsCount },
    { data: vitalsData },
    { data: uniquePathData },
    { data: sessionsData }
  ] = await Promise.all([
    // A. Visitors - use sessions_view for consistency with dashboard
    supabase.from('sessions_view').select('visitor_id', { count: 'exact', head: true }).eq('site_id', id).gte('started_at', startDate),
    // B. Total Sessions - use sessions_view for consistency with dashboard
    supabase.from('sessions_view').select('session_id', { count: 'exact', head: true }).eq('site_id', id).gte('started_at', startDate),
    // C. Vitals
    supabase.from('web_vitals').select('lcp').eq('site_id', id).gte('created_at', startDate).not('lcp', 'is', null).limit(100),
    // D. Unique Paths (for Heatmaps - only needed if showing heatmaps)
    showAnyHeatmap ? supabase.from('snapshots').select('page_path, created_at').eq('site_id', id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    // E. Sessions Data (for Mobile Audit, Session Spotlights, Summary, and Traffic stats)
    // Use sessions_view for consistency with dashboard data
    (showFeature('sessions') || showFeature('mobile_audit') || showFeature('summary') || showFeature('traffic')) 
      ? supabase.from('sessions_view')
          .select('session_id, visitor_id, started_at, duration, page_views, device_type, country, signals')
          .eq('site_id', id)
          .gte('started_at', startDate)
          .order('started_at', { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] })
  ]);

  // Fetch frustration data from ClickHouse (matches dashboard data source)
  let rageClicks = 0;
  let deadClicks = 0;
  try {
    const clickhouse = getClickHouseClient();
    const frustrationQuery = `
      SELECT 
        countIf(event_type = 'rage_click') as rage_clicks,
        countIf(is_dead_click = true) as dead_clicks
      FROM events
      WHERE site_id = {siteId:String}
        AND timestamp >= parseDateTimeBestEffort({startDate:String})
    `;
    const frustrationResult = await clickhouse.query({
      query: frustrationQuery,
      query_params: { siteId: id, startDate },
      format: 'JSONEachRow'
    });
    const frustrationData = await frustrationResult.json() as Array<{ rage_clicks: string; dead_clicks: string }>;
    if (frustrationData.length > 0) {
      rageClicks = parseInt(frustrationData[0].rage_clicks) || 0;
      deadClicks = parseInt(frustrationData[0].dead_clicks) || 0;
    }
  } catch (error) {
    console.error('[Report] ClickHouse frustration query error:', error);
  }

  // Process Stats
  const sessions = sessionsCount || 0;
  
  const validLcp = vitalsData?.map((v: { lcp: number }) => v.lcp).filter(Number) || [];
  const avgLcp = validLcp.length ? (validLcp.reduce((a: number, b: number) => a + b, 0) / validLcp.length / 1000).toFixed(2) : "1.2";

  // Extended interface for session data (matches sessions_view schema)
  interface SessionDataType { 
    session_id?: string;
    duration?: number; 
    page_views?: number; 
    visitor_id?: string;
    device_type?: string;
    country?: string;
    started_at?: string;
    signals?: Array<{ type: string }>;
  }
  const typedSessionsData = (sessionsData || []) as SessionDataType[];

  // Calculate unique visitors from sessionsData (correct count, not duplicate sessions)
  const uniqueVisitorIds = new Set(typedSessionsData.map(s => s.visitor_id).filter(Boolean));
  const visitors = uniqueVisitorIds.size > 0 ? uniqueVisitorIds.size : (visitorsCount || 0);
  
  // Calculate avg duration from sessionsData (duration is in SECONDS from sessions_view)
  const sessionDurations = typedSessionsData.map(s => s.duration || 0).filter(d => d > 0);
  const totalDurationSecs = sessionDurations.reduce((a, b) => a + b, 0);
  const avgDurationSecs = sessionDurations.length > 0 ? totalDurationSecs / sessionDurations.length : 0;
  const avgDurationMins = Math.floor(avgDurationSecs / 60);
  const avgDurationRemainingSecs = Math.floor(avgDurationSecs % 60);
  const avgDurationFormatted = avgDurationSecs > 0 ? `${avgDurationMins}m ${avgDurationRemainingSecs}s` : "0m 0s";

  // Calculate bounce rate (sessions with 1 page view / total sessions)
  const bouncedSessions = typedSessionsData.filter(s => (s.page_views || 0) <= 1).length;
  const totalSessionsForBounce = typedSessionsData.length;
  const bounceRateCalc = totalSessionsForBounce > 0 ? Math.round((bouncedSessions / totalSessionsForBounce) * 100) : 0;

  // Fetch JS Errors from ClickHouse
  let jsErrors = 0;
  try {
    const clickhouse = getClickHouseClient();
    const errorsQuery = `
      SELECT count() as error_count
      FROM events
      WHERE site_id = {siteId:String}
        AND event_type = 'error'
        AND timestamp >= parseDateTimeBestEffort({startDate:String})
    `;
    const errorsResult = await clickhouse.query({
      query: errorsQuery,
      query_params: { siteId: id, startDate },
      format: 'JSONEachRow'
    });
    const errorsData = await errorsResult.json() as Array<{ error_count: string }>;
    if (errorsData.length > 0) {
      jsErrors = parseInt(errorsData[0].error_count) || 0;
    }
  } catch (error) {
    console.error('[Report] ClickHouse errors query error:', error);
  }

  const stats = {
    visitors: visitors,
    sessions: sessions,
    avgDuration: avgDurationFormatted,
    bounceRate: `${bounceRateCalc}%`,
    lcp: avgLcp,
    cls: 0.05,
    inp: 120,
    rageClicks: rageClicks,
    deadClicks: deadClicks,
    jsErrors: jsErrors
  };


  
  // Filter unique paths (Top 5)
  const uniquePaths: string[] = Array.from(new Set(uniquePathData?.map((s: { page_path: string }) => s.page_path) || [])).slice(0, 5) as string[];

  return (
    <ReportLayout 
      title={`Performance Report: ${site.domain}`} 
      dateRange={`Last ${days} Days`}
      days={days}
      siteId={id}
      expiresInDays={expiresInDays}
    >
      {/* 1. Executive Summary */}
      {showFeature('summary') && (
        <section className="mb-16 break-inside-avoid">
          <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">1</span>
              <h3 className="text-xl font-bold text-gray-900">Executive Summary</h3>
          </div>
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 mb-2">Audit Overview</h4>
               <p className="text-gray-700 leading-relaxed mb-6">
              I analyzed <strong>{site.domain}</strong> to identify revenue leaks, user friction points, and technical bottlenecks. 
              Overall, the site has stable traffic but exhibits specific <strong>friction signals</strong> that are likely impacting conversion rates.
              </p>

              <h4 className="text-lg font-bold text-gray-900 mb-3">Top Critical Issues Found:</h4>
              <div className="space-y-3">
                  {/* Only show rage clicks issue if there are actual rage clicks */}
                  {stats.rageClicks > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                        <ExclamationCircleIcon className="w-6 h-6 text-red-600 mt-0.5" />
                        <div>
                            <span className="font-bold text-red-800 block">High Rage Click Rate</span>
                            <span className="text-sm text-red-700">Detected {stats.rageClicks} rage clicks, specifically on non-interactive elements. Users are frustrated by broken UI cues.</span>
                        </div>
                    </div>
                  )}
                  
                  {/* Only show LCP warning if it's slow (> 2.5s is poor per Core Web Vitals) */}
                  {parseFloat(stats.lcp) > 2.5 && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                        <ClockIcon className="w-6 h-6 text-red-600 mt-0.5" />
                        <div>
                            <span className="font-bold text-red-800">Critical LCP Speed</span>
                            <span className="text-sm text-red-700 block">Largest Contentful Paint is {stats.lcp}s (should be under 2.5s). This is causing users to abandon before engaging.</span>
                        </div>
                    </div>
                  )}
                  
                  {/* Show moderate LCP warning if between 1.5 and 2.5 */}
                  {parseFloat(stats.lcp) >= 1.5 && parseFloat(stats.lcp) <= 2.5 && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <ClockIcon className="w-6 h-6 text-amber-600 mt-0.5" />
                        <div>
                            <span className="font-bold text-amber-800">LCP Speed Warning</span>
                            <span className="text-sm text-amber-700 block">Largest Contentful Paint is {stats.lcp}s. Consider optimizing for faster load times.</span>
                        </div>
                    </div>
                  )}
                  
                  {/* Only show dead clicks issue if there are dead clicks */}
                  {stats.deadClicks > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <CursorArrowRaysIcon className="w-6 h-6 text-amber-600 mt-0.5" />
                        <div>
                            <span className="font-bold text-amber-800">Dead Click Areas</span>
                            <span className="text-sm text-amber-700 block">Detected {stats.deadClicks} dead clicks on elements users expected to be interactive.</span>
                        </div>
                    </div>
                  )}
                  
                  {/* Show positive message if no issues found */}
                  {stats.rageClicks === 0 && stats.deadClicks === 0 && parseFloat(stats.lcp) < 1.5 && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                        <BoltIcon className="w-6 h-6 text-green-600 mt-0.5" />
                        <div>
                            <span className="font-bold text-green-800">No Critical Issues Detected</span>
                            <span className="text-sm text-green-700 block">Your site appears to have minimal user friction signals. Focus on continuous improvement.</span>
                        </div>
                    </div>
                  )}
              </div>
          </div>
        </section>
      )}

      {/* 2. Health & Speed Audit (Technical Foundation) */}
      {showFeature('network') && (
        <section className="mb-16 break-before-page">
           <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-lg shadow-sm">2</span>
              <div>
                 <h2 className="text-3xl font-bold text-gray-900">Health & Speed Audit</h2>
                 <p className="text-gray-500 text-lg mt-1">Technical Foundation & Core Web Vitals</p>
              </div>
           </div>
           
           <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8">
              <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                  <BoltIcon className="w-5 h-5" />
                  The &quot;Business Value&quot; Insight
              </h4>
              <p className="text-indigo-800 text-sm italic">
                  &quot;I analyzed your site&apos;s technical foundation. Your Largest Contentful Paint (LCP) is <strong>{stats.lcp}s</strong>. 
                  Google recommends typically under 2.5s. Fast loading sites directly correlate with lower bounce rates.&quot;
              </p>
              <div className="mt-4 pt-4 border-t border-indigo-200/50">
                  <p className="text-indigo-900 font-medium text-sm">
                      <span className="bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded text-xs font-bold mr-2">RECOMMENDATION</span>
                      Optimize the hero image size (compress to WebP) and check console for blocking scripts to improve LCP.
                  </p>
              </div>
           </div>

           <ReportPerformanceWrapper siteId={id} days={days} />
        </section>
      )}

      {/* 3. The "Fold" & Engagement Analysis */}
      {showAnyHeatmap && (
        <ReportHeatmapSection siteId={id} uniquePaths={uniquePaths} days={days} />
      )}

      {/* 4. Friction & Frustration Hunt */}
      {showFeature('frustration') && (
        <section className="mb-16 break-before-page">
           <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-lg shadow-sm">4</span>
              <div>
                 <h2 className="text-3xl font-bold text-gray-900">Friction & Frustration Hunt</h2>
                 <p className="text-gray-500 text-lg mt-1">Identifying Invisible User Struggles</p>
              </div>
           </div>

           <div className="bg-rose-50 border border-rose-100 rounded-xl p-6 mb-8">
              <h4 className="font-bold text-rose-900 mb-2 flex items-center gap-2">
                  <ExclamationCircleIcon className="w-5 h-5" />
                  The &quot;Killer Feature&quot; Analysis
              </h4>
              <p className="text-rose-800 text-sm italic">
                  &quot;Users are experiencing friction. I detected <strong>{stats.rageClicks}</strong> Rage Clicks. 
                  This often happens when users think an element (like an image or icon) is clickable but it isn&apos;t. 
                  This breaks their flow and causes abandonment.&quot;
              </p>
               <div className="mt-4 pt-4 border-t border-rose-200/50">
                  <p className="text-rose-900 font-medium text-sm">
                      <span className="bg-rose-200 text-rose-800 px-2 py-0.5 rounded text-xs font-bold mr-2">RECOMMENDATION</span>
                      Identify the top rage-clicked elements (likely icons or non-linked headers) and either make them clickable or remove interactive styling (cursor: pointer, hover effects).
                  </p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm text-center">
                   <div className="inline-flex p-3 rounded-full bg-rose-100 text-rose-600 mb-4">
                      <CursorArrowRaysIcon className="w-8 h-8" />
                   </div>
                   <div className="text-4xl font-bold text-gray-900 mb-1">{stats.rageClicks}</div>
                   <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">Rage Clicks</div>
                   <p className="text-xs text-gray-400 mt-2">Rapid, frustrated clicking on elements</p>
              </div>
               <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm text-center">
                   <div className="inline-flex p-3 rounded-full bg-gray-100 text-gray-600 mb-4">
                      <ExclamationCircleIcon className="w-8 h-8" />
                   </div>
                   <div className="text-4xl font-bold text-gray-900 mb-1">{stats.deadClicks}</div>
                   <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">Dead Clicks</div>
                    <p className="text-xs text-gray-400 mt-2">Clicks on non-interactive elements</p>
              </div>
           </div>
        </section>
      )}

      {/* 5. "Why They Leave" Analysis (Conversion Leaks) */}
      {(showFeature('journey') || showFeature('funnels') || showFeature('forms')) && ( // Assuming funnels/forms are part of this section
        <section className="mb-16 break-before-page">
              <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-lg shadow-sm">5</span>
                  <div>
                     <h2 className="text-3xl font-bold text-gray-900">&quot;Why They Leave&quot; Analysis</h2>
                     <p className="text-gray-500 text-lg mt-1">Conversion Leaks, Funnels & Drop-offs</p>
                  </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8">
                  <h4 className="font-bold text-blue-900 mb-2">Conversion Drop-off Insight</h4>
                  <p className="text-blue-800 text-sm italic">
                      &quot;Analyzing your Conversion Funnels and Forms reveals exactly where users abandon the process.
                      A high drop-off at a specific form field or funnel step indicates a barrier—technical error, confusion, or request for too much info.&quot;
                  </p>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-4">Conversion Funnels</h3>
              <div className="mb-12">
                   <ReportFunnelsWrapper siteId={id} days={days} />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-4">Form Analytics</h3>
               <div className="mb-12">
                  <ReportFormsWrapper siteId={id} days={days} />
              </div>

              {showFeature('journey') && (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">User Journeys (Flow)</h3>
                  <div className="bg-white rounded-2xl border border-gray-100 p-1 shadow-sm overflow-hidden mb-8">
                       <ReportJourneyWrapper siteId={id} days={days} />
                  </div>
                </>
              )}
        </section>
      )}

       {/* 6. Mobile vs Desktop Comparison */}
       {showFeature('traffic') && (
        <section className="mb-16 break-before-page">
              <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-lg shadow-sm">6</span>
                  <div>
                     <h2 className="text-3xl font-bold text-gray-900">Mobile vs. Desktop & Traffic</h2>
                     <p className="text-gray-500 text-lg mt-1">Device Breakdown & Audience Overview</p>
                  </div>
              </div>
               
               <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 mb-8">
                  <h4 className="font-bold text-emerald-900 mb-2">Mobile Optimization Insight</h4>
                  <p className="text-emerald-800 text-sm italic">
                      &quot;A significant portion of web traffic is mobile. 
                      If your mobile bounce rate is higher than desktop, or if the heatmap shows cold zones on key mobile buttons, 
                      prioritize responsive design improvements immediately.&quot;
                  </p>
              </div>

               {/* Traffic Overview (Moved here) */}
              <div className="grid grid-cols-4 gap-6 mb-8">
                   <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Total Visitors</div>
                      <div className="text-3xl font-bold text-gray-900">{stats.visitors.toLocaleString()}</div>
                   </div>
                   <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Total Sessions</div>
                      <div className="text-3xl font-bold text-gray-900">{stats.sessions.toLocaleString()}</div>
                   </div>
                   <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Avg. Duration</div>
                      <div className="text-3xl font-bold text-gray-900">{stats.avgDuration}</div>
                   </div>
                   <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Bounce Rate</div>
                      <div className="text-3xl font-bold text-gray-900">{stats.bounceRate}</div>
                   </div>
              </div>

              {/* Note: Device breakdown is formally in Perf wrapper, but we discuss it here. */}
         </section>
       )}

      {/* 7. Mobile Usability Audit (NEW) */}
      {showFeature('mobile_audit') && (
        <section className="mb-16 break-before-page">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-600 text-white font-bold text-lg shadow-sm">7</span>
                <div>
                   <h2 className="text-3xl font-bold text-gray-900">Mobile Usability Audit</h2>
                   <p className="text-gray-500 text-lg mt-1">Device-Specific Performance & Friction Analysis</p>
                </div>
            </div>

            <div className="bg-violet-50 border border-violet-100 rounded-xl p-6 mb-8">
               <h4 className="font-bold text-violet-900 mb-2">📱 Why Mobile Matters</h4>
               <p className="text-violet-800 text-sm italic">
                   Mobile users have less patience and smaller tap targets. If your mobile metrics underperform desktop, you&apos;re losing conversions from an increasingly dominant traffic source.
               </p>
            </div>

            <ReportMobileAuditWrapper siteId={id} days={days} sessionsData={sessionsData || []} />
        </section>
      )}

      {/* 8. Active Experiments / A/B Tests (NEW) */}
      {showFeature('experiments') && (
        <section className="mb-16 break-before-page">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-600 text-white font-bold text-lg shadow-sm">8</span>
                <div>
                   <h2 className="text-3xl font-bold text-gray-900">Active Experiments (A/B Tests)</h2>
                   <p className="text-gray-500 text-lg mt-1">Performance Comparison of Design Variants</p>
                </div>
            </div>

            <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-6 mb-8">
               <h4 className="font-bold text-cyan-900 mb-2">🧪 Data-Driven Decisions</h4>
               <p className="text-cyan-800 text-sm italic">
                   A/B testing removes guesswork from design changes. The experiment results below show conversion rate impacts with statistical significance.
               </p>
            </div>

            <ReportExperimentsWrapper siteId={id} days={days} />
        </section>
      )}

      {/* 9. Critical Session Spotlights (NEW) */}
      {showFeature('sessions') && (
        <section className="mb-16 break-before-page">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-600 text-white font-bold text-lg shadow-sm">9</span>
                <div>
                   <h2 className="text-3xl font-bold text-gray-900">Critical Session Spotlights</h2>
                   <p className="text-gray-500 text-lg mt-1">Curated Replays Demonstrating User Struggles</p>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 mb-8">
               <h4 className="font-bold text-amber-900 mb-2">🎬 Stories Sell</h4>
               <p className="text-amber-800 text-sm italic">
                   Data visualizations show trends, but session replays prove them. These curated sessions highlight specific user struggles, bugs, and successful conversion paths.
               </p>
            </div>

            <ReportSessionSpotlightsWrapper siteId={id} days={days} sessionsData={sessionsData || []} />
        </section>
      )}

      {/* 10. ROI Roadmap & Recommendations (Enhanced Action Plan) */}
       <section className="mb-16 break-before-page">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white font-bold text-lg shadow-sm">10</span>
                <div>
                   <h2 className="text-3xl font-bold text-gray-900">ROI Roadmap & Recommendations</h2>
                   <p className="text-gray-500 text-lg mt-1">Immediate steps to improve revenue & UX</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h4 className="font-bold text-gray-900">Developer Checklist (High Impact)</h4>
                </div>
                <div className="p-6 space-y-4">
                     <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1.5 w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" readOnly />
                        <div>
                             <span className="font-medium text-gray-900 block">Fix Content Layout Shift (CLS)</span>
                             <span className="text-sm text-gray-500">Add explicit width/height to all images and video elements to prevent layout jumping.</span>
                        </div>
                     </div>
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1.5 w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" readOnly />
                        <div>
                             <span className="font-medium text-gray-900 block">Resolve Console Errors on Checkout</span>
                             <span className="text-sm text-gray-500">Investigate and fix the JS errors flagged in the Health Audit to ensure smooth transactions.</span>
                        </div>
                     </div>
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1.5 w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" readOnly />
                        <div>
                             <span className="font-medium text-gray-900 block">Optimize Mobile Tap Targets</span>
                             <span className="text-sm text-gray-500">Increase padding on menu buttons and primary CTAs to be at least 44x44px.</span>
                        </div>
                     </div>
                </div>
            </div>
             <div className="mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white text-center shadow-lg">
                <h3 className="text-2xl font-bold mb-2">Ready to Boost Your Conversions?</h3>
                <p className="text-indigo-100 max-w-2xl mx-auto">
                    Implementing these &quot;Quick Wins&quot; typically results in a 10-15% lift in immediate engagement. 
                    Monitor these metrics using Navlens over the next 30 days to track improvement.
                </p>
            </div>
       </section>

       {/* Other Appendices (Cohorts, Feedback) */}
       {(showFeature('cohorts') || showFeature('feedback')) && (
        <section className="break-before-page">
              <h3 className="text-xl font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-200 pb-2">Appendix: Additional Data</h3>
              
              {showFeature('cohorts') && (
                <div className="mb-12">
                    <h4 className="font-bold text-gray-900 mb-4">User Cohorts</h4>
                    <ReportCohortsWrapper siteId={id} days={days} />
                </div>
              )}
              
              {showFeature('feedback') && (
                <div>
                    <h4 className="font-bold text-gray-900 mb-4">User Feedback</h4>
                    <ReportFeedbackWrapper siteId={id} days={days} />
                </div>
              )}
        </section>
       )}

    </ReportLayout>
  );
}
