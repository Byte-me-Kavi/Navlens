import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from "@/lib/auth";


export async function POST(request: NextRequest) {
  try {
    console.log("[site-details] API called");

    const { siteId } = await request.json();
    console.log("[site-details] Received siteId:", siteId);

    if (!siteId) {
      console.log("[site-details] No siteId provided");
      return NextResponse.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("[site-details] Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    console.log("[site-details] Authenticating user...");

    // Authenticate user and get their authorized sites
    const authResult = await authenticateAndAuthorize(request);

    if (!authResult.isAuthorized) {
      console.log("[site-details] Authentication failed:", authResult);
      return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
    }

    console.log("[site-details] User authenticated, checking site access...");

    // Check if user is authorized for this site
    if (!isAuthorizedForSite(authResult.userSites, siteId)) {
      console.log("[site-details] User not authorized for site:", siteId);
      return createUnauthorizedResponse();
    }

    console.log("[site-details] Creating Supabase client...");

    // Create Supabase client for fetching site details
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    console.log("[site-details] Fetching site details...");

    // Fetch the site details
    const { data: siteData, error: siteError } = await supabase
      .from("sites")
      .select("domain, site_name")
      .eq("id", siteId)
      .single();

    if (siteError) {
      console.error("[site-details] Error fetching site details:", siteError);
      return NextResponse.json(
        { error: "Failed to fetch site details" },
        { status: 500 }
      );
    }

    console.log("[site-details] Success! Returning site data:", siteData);
    return NextResponse.json(siteData);
  } catch (error: unknown) {
    console.error("[site-details] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}