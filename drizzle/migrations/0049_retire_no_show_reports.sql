DROP TRIGGER IF EXISTS trg_handle_no_show ON public.no_shows;
REVOKE INSERT ON public.no_shows FROM authenticated;
DROP POLICY IF EXISTS "Reporter can insert no-show" ON public.no_shows;