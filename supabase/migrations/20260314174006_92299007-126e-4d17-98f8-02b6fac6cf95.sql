
CREATE OR REPLACE FUNCTION public.get_all_roles()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(json_build_object('user_id', user_id::text, 'role', role::text)), '[]'::json)
  FROM public.user_roles
$$;

-- Only authenticated users can call, but the function itself checks admin via SECURITY DEFINER
REVOKE ALL ON FUNCTION public.get_all_roles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_all_roles() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_all_roles() TO authenticated;
