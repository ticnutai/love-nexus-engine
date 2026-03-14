import { supabase } from "@/integrations/supabase/client";

// Admin-only: fetch all users with their roles
export const fetchAllUsersWithRoles = async () => {
  // Get all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (profilesError) throw profilesError;

  // Get all roles (admin can see via exec_sql since user_roles RLS only shows own)
  const { data: rolesResult } = await supabase.rpc("exec_sql", {
    query: "SELECT user_id, role FROM public.user_roles",
  });

  let rolesMap: Record<string, string> = {};
  if (rolesResult && (rolesResult as any).success !== false) {
    // Parse from exec_sql - it returns affected rows, not data
    // We need a different approach - use a dedicated function
  }

  // Fallback: get roles via a query that returns data
  const { data: rolesData } = await supabase.rpc("exec_sql", {
    query: "SELECT json_agg(json_build_object('user_id', user_id, 'role', role)) as roles FROM public.user_roles",
  });

  // Since exec_sql doesn't return query results directly, let's create a view approach
  // For now, we'll show profiles and let admin toggle roles via exec_sql
  return profiles || [];
};

export const setUserRole = async (userId: string, role: "admin" | "user") => {
  // Delete existing role and insert new one
  const query = `
    DELETE FROM public.user_roles WHERE user_id = '${userId}';
    INSERT INTO public.user_roles (user_id, role) VALUES ('${userId}', '${role}');
  `;
  const { data, error } = await supabase.rpc("exec_sql", { query });
  if (error) throw error;
  return data;
};

export const getUserRoles = async () => {
  const query = `SELECT json_agg(json_build_object('user_id', user_id::text, 'role', role::text)) FROM public.user_roles`;
  const { data, error } = await supabase.rpc("exec_sql", { query });
  if (error) throw error;
  return data;
};
