import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { validators } from "@/lib/validation";


export async function POST(request: NextRequest) {
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

  const body = await request.json();
  const { siteId } = body;

  // Validate siteId parameter
  if (!siteId || typeof siteId !== 'string') {
    return NextResponse.json(
      { error: "siteId is required and must be a string" },
      { status: 400 }
    );
  }

  // Validate siteId format (UUID)
  if (!validators.isValidUUID(siteId)) {
    return NextResponse.json(
      { error: "Invalid siteId format" },
      { status: 400 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from("page_paths")
      .select("*")
      .eq("site_id", siteId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ pagePaths: data });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch page paths";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
