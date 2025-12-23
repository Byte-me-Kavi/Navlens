import DashboardClient from "./DashboardClient";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Server Component Fetch Logic
async function _getDashboardStats() {
  // This assumes your Vercel deployment has access to the internal API route
  // In a real deployed app, you might use an internal fetch URL or bypass the API route and call the logic directly.
  const url =
    process.env.NODE_ENV === "production"
      ? `https://${process.env.VERCEL_URL}/api/dashboard-stats` // Use Vercel URL in production
      : `http://localhost:3000/api/dashboard-stats`; // Use localhost in development

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store", // Always fetch fresh data
      headers: {
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch dashboard stats: ${response.status}`);
      return {
        totalSites: 0,
        stats: {
          totalClicks: { value: 0, trend: { value: 0, isPositive: true } },
          totalHeatmaps: { value: 0, trend: { value: 0, isPositive: true } },
          activeSessions: { value: 0, trend: { value: 0, isPositive: true } },
        },
      };
    }

    return response.json();
  } catch (error: unknown) {
    console.error("Error fetching dashboard stats:", error);
    return {
      totalSites: 0,
      stats: {
        totalClicks: { value: 0, trend: { value: 0, isPositive: true } },
        totalHeatmaps: { value: 0, trend: { value: 0, isPositive: true } },
        activeSessions: { value: 0, trend: { value: 0, isPositive: true } },
      },
    };
  }
}

export default async function DashboardOverview() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Check Authentication (Page Protection)
  if (!session) {
    redirect("/login");
  }

  return <DashboardClient />;
}
