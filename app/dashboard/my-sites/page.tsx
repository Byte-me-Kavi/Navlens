import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SiteManager from "./SiteManager"; // This is the Client Component we will create

// Define the type for a Site object
export type Site = {
  id: string;
  created_at: string;
  site_name: string;
  domain: string;
  api_key: string;
  user_id: string;
};

// This is a Server Component, so we can fetch data directly
export default async function SitesPage() {
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

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirect("/login"); // Protect the page
  }

  // Fetch the list of sites
  // RLS (Step 2) automatically filters this to *only* this user's sites
  const { data: sites, error } = await supabase
    .from("sites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching sites:", error);
    // You could render an error state here
  }

  // Pass the fetched sites to the Client Component
  return <SiteManager sites={sites || []} />;
}
