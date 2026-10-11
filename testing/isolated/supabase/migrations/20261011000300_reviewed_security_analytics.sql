-- ISOLATED STAGING ONLY. Historic security/analytics DDL; production visitor backfill removed.
-- Existing data is preserved. Run after legacy migrations 02 through 08.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true);
$$;

CREATE TABLE IF NOT EXISTS private.request_limits (
  bucket text PRIMARY KEY, started_at timestamptz NOT NULL, hits integer NOT NULL
);
ALTER TABLE private.request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.request_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.allow_request(action text, max_hits integer, seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  identity text;
  result_hits integer;
BEGIN
  -- Only a short-lived hash is stored, never the raw address.
  identity := coalesce(headers->>'cf-connecting-ip', split_part(headers->>'x-forwarded-for', ',', 1), auth.uid()::text, 'unknown');
  INSERT INTO private.request_limits AS limits (bucket, started_at, hits)
    VALUES (action || ':' || md5(identity), clock_timestamp(), 1)
  ON CONFLICT (bucket) DO UPDATE SET
    hits = CASE WHEN limits.started_at < clock_timestamp() - make_interval(secs => seconds) THEN 1 ELSE limits.hits + 1 END,
    started_at = CASE WHEN limits.started_at < clock_timestamp() - make_interval(secs => seconds) THEN clock_timestamp() ELSE limits.started_at END
  RETURNING hits INTO result_hits;
  DELETE FROM private.request_limits WHERE started_at < now() - interval '2 days';
  RETURN result_hits <= max_hits;
END;
$$;
REVOKE ALL ON FUNCTION private.allow_request(text, integer, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.guard_public_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  NEW.created_at := now();
  IF TG_TABLE_NAME = 'analytics_events' THEN
    IF NOT private.allow_request('analytics', 120, 60) THEN RETURN NULL; END IF;
    IF NEW.event_type NOT IN ('page_view','heartbeat','whatsapp_click','instagram_click','form_submit','language_change','login','registration')
      OR octet_length(coalesce(NEW.event_data, '{}')::text) > 2048
      OR coalesce(NEW.page_url, '') NOT LIKE '/%'
      OR coalesce(NEW.visitor_id, '') !~ '^[a-zA-Z0-9_-]{10,64}$' THEN
      RAISE EXCEPTION 'Invalid analytics event' USING ERRCODE = '22023';
    END IF;
    -- Identity and time cannot be supplied on behalf of somebody else.
    NEW.user_id := auth.uid();
    IF NEW.event_type IN ('login','registration') AND NEW.user_id IS NULL THEN RETURN NULL; END IF;
  ELSE
    IF NOT private.allow_request('lead', 5, 3600) THEN
      RAISE EXCEPTION 'Too many requests. Please try again later.' USING ERRCODE = 'P0001';
    END IF;
    NEW.status := 'new';
    NEW.name := trim(NEW.name);
    NEW.phone := trim(NEW.phone);
    IF length(regexp_replace(NEW.phone, '[^0-9]', '', 'g')) NOT BETWEEN 9 AND 15 THEN
      RAISE EXCEPTION 'Invalid phone number' USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_public_insert() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_analytics_insert ON public.analytics_events;
CREATE TRIGGER guard_analytics_insert BEFORE INSERT ON public.analytics_events
  FOR EACH ROW EXECUTE FUNCTION private.guard_public_insert();
DROP TRIGGER IF EXISTS guard_lead_insert ON public.leads;
CREATE TRIGGER guard_lead_insert BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION private.guard_public_insert();

-- Aggregate in SQL: PostgREST's 1000-row response limit must not truncate totals.
CREATE OR REPLACE FUNCTION public.admin_analytics_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE result jsonb;
  today timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Dushanbe') AT TIME ZONE 'Asia/Dushanbe';
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'totalVisits', count(*) FILTER (WHERE event_type = 'page_view'),
    'uniqueVisitors', count(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view'),
    'viewsToday', count(*) FILTER (WHERE event_type = 'page_view' AND created_at >= today),
    'viewsWeek', count(*) FILTER (WHERE event_type = 'page_view' AND created_at >= today - interval '6 days'),
    'whatsappClicks', count(*) FILTER (WHERE event_type = 'whatsapp_click'),
    'instagramClicks', count(*) FILTER (WHERE event_type = 'instagram_click'),
    'onlineNow', count(DISTINCT visitor_id) FILTER (WHERE event_type IN ('page_view','heartbeat') AND created_at >= now() - interval '2 minutes')
  ) INTO result FROM public.analytics_events;
  result := result || (SELECT jsonb_build_object(
    'totalUsers', count(*), 'newToday', count(*) FILTER (WHERE created_at >= today),
    'newMonth', count(*) FILTER (WHERE created_at >= now() - interval '30 days')
  ) FROM public.profiles WHERE role = 'user');
  result := result || jsonb_build_object('formSubmits', (SELECT count(*) FROM public.leads));
  result := result || jsonb_build_object('sources', (SELECT coalesce(jsonb_agg(s), '[]') FROM (
    SELECT coalesce(source, 'unknown') AS key, count(*) AS views, count(DISTINCT visitor_id) AS visitors
    FROM public.analytics_events WHERE event_type='page_view' GROUP BY source ORDER BY count(*) DESC
  ) s));
  result := result || jsonb_build_object('days', (SELECT jsonb_agg(d ORDER BY day) FROM (
    SELECT day::date, count(e.id) FILTER (WHERE e.event_type='page_view') AS visits,
      count(e.id) FILTER (WHERE e.event_type='whatsapp_click') AS clicks
    FROM generate_series((today AT TIME ZONE 'Asia/Dushanbe') - interval '6 days', today AT TIME ZONE 'Asia/Dushanbe', interval '1 day') day
    LEFT JOIN public.analytics_events e ON e.created_at >= (day AT TIME ZONE 'Asia/Dushanbe')
      AND e.created_at < ((day + interval '1 day') AT TIME ZONE 'Asia/Dushanbe')
    GROUP BY day
  ) d));
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_analytics_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_analytics_summary() TO authenticated;
CREATE INDEX IF NOT EXISTS idx_analytics_type_created ON public.analytics_events(event_type, created_at DESC);

-- Serialize attempts: parallel requests must not bypass the five-attempt limit.
CREATE OR REPLACE FUNCTION public.reset_password_with_code(p_email text, p_code text, p_new_password text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target public.password_reset_requests;
BEGIN
  IF length(coalesce(p_new_password, '')) < 8 OR octet_length(p_new_password) > 72
    OR p_new_password !~ '[a-z]' OR p_new_password !~ '[A-Z]' OR p_new_password !~ '[0-9]' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'weak_password');
  END IF;
  IF NOT private.allow_request('reset_code', 15, 900) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'too_many');
  END IF;
  SELECT * INTO target FROM public.password_reset_requests
    WHERE email = lower(trim(p_email)) AND status = 'code_issued'
    ORDER BY issued_at DESC NULLS LAST LIMIT 1 FOR UPDATE;
  IF target.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'bad_code'); END IF;
  IF target.expires_at IS NULL OR target.expires_at <= now() OR target.attempts >= 5 THEN
    UPDATE public.password_reset_requests SET status='rejected', code=NULL WHERE id=target.id;
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  IF p_code IS NULL OR p_code !~ '^[0-9]{6}$' OR target.code IS DISTINCT FROM p_code THEN
    UPDATE public.password_reset_requests SET attempts=attempts+1 WHERE id=target.id;
    RETURN jsonb_build_object('ok', false, 'error', 'bad_code', 'left', 4-target.attempts);
  END IF;
  UPDATE auth.users SET encrypted_password=extensions.crypt(p_new_password, extensions.gen_salt('bf')), updated_at=now()
    WHERE id=target.user_id;
  DELETE FROM auth.sessions WHERE user_id=target.user_id;
  UPDATE public.password_reset_requests SET status='used', used_at=now(), code=NULL WHERE id=target.id;
  UPDATE public.password_reset_requests SET status='rejected', code=NULL
    WHERE user_id=target.user_id AND id<>target.id AND status='code_issued';
  INSERT INTO public.user_activity(user_id, action) VALUES(target.user_id, 'password_reset_code');
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.reset_password_with_code(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_password_with_code(text,text,text) TO anon, authenticated;


-- === analytics excluded visitors, without historical rows ===
-- One filtered dataset feeds both the overview and the paginated event log.
-- Existing raw events remain intact.
CREATE TABLE public.analytics_excluded_visitors (
  visitor_id text PRIMARY KEY CHECK (visitor_id ~ '^[a-zA-Z0-9_-]{10,64}$'),
  excluded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_excluded_visitors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analytics_excluded_visitors FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.analytics_excluded_visitors TO authenticated;
CREATE POLICY "admins_read_excluded_browsers" ON public.analytics_excluded_visitors
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "admins_exclude_own_browser" ON public.analytics_excluded_visitors
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()) AND excluded_by=(SELECT auth.uid()));
CREATE INDEX idx_analytics_excluded_by ON public.analytics_excluded_visitors(excluded_by);

-- Staging: production visitor backfill removed. No imported users/events.
CREATE VIEW public.analytics_visitor_events WITH (security_invoker=true) AS
  SELECT e.* FROM public.analytics_events e
  WHERE coalesce(e.page_url, '') NOT LIKE '/admin%'
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=e.user_id AND p.role='admin')
    AND NOT EXISTS (SELECT 1 FROM public.analytics_excluded_visitors excluded WHERE excluded.visitor_id=e.visitor_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.analytics_events history
      JOIN public.profiles p ON p.id=history.user_id
      WHERE p.role='admin' AND history.visitor_id=e.visitor_id
    );
REVOKE ALL ON public.analytics_visitor_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.analytics_visitor_events TO authenticated;

CREATE OR REPLACE FUNCTION private.guard_public_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  NEW.created_at := now();
  IF TG_TABLE_NAME = 'analytics_events' THEN
    IF coalesce(NEW.visitor_id, '') !~ '^[a-zA-Z0-9_-]{10,64}$' THEN
      RAISE EXCEPTION 'Invalid visitor identifier' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin') THEN
      INSERT INTO public.analytics_excluded_visitors(visitor_id, excluded_by)
        VALUES(NEW.visitor_id, auth.uid()) ON CONFLICT DO NOTHING;
      RETURN NULL;
    END IF;
    IF NEW.page_url LIKE '/admin%' OR EXISTS (
      SELECT 1 FROM public.analytics_excluded_visitors WHERE visitor_id=NEW.visitor_id
    ) THEN RETURN NULL; END IF;
    IF NOT private.allow_request('analytics', 120, 60) THEN RETURN NULL; END IF;
    IF NEW.event_type NOT IN ('page_view','heartbeat','whatsapp_click','instagram_click','form_submit','language_change','login','registration')
      OR octet_length(coalesce(NEW.event_data, '{}')::text) > 2048
      OR coalesce(NEW.page_url, '') NOT LIKE '/%'
      OR coalesce(NEW.visitor_id, '') !~ '^[a-zA-Z0-9_-]{10,64}$' THEN
      RAISE EXCEPTION 'Invalid analytics event' USING ERRCODE = '22023';
    END IF;
    -- Identity and time cannot be supplied on behalf of somebody else.
    NEW.user_id := auth.uid();
    IF NEW.event_type IN ('login','registration') AND NEW.user_id IS NULL THEN RETURN NULL; END IF;
  ELSE
    IF NOT private.allow_request('lead', 5, 3600) THEN
      RAISE EXCEPTION 'Too many requests. Please try again later.' USING ERRCODE = 'P0001';
    END IF;
    NEW.status := 'new';
    NEW.name := trim(NEW.name);
    NEW.phone := trim(NEW.phone);
    IF length(regexp_replace(NEW.phone, '[^0-9]', '', 'g')) NOT BETWEEN 9 AND 15 THEN
      RAISE EXCEPTION 'Invalid phone number' USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_public_insert() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_analytics_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE result jsonb;
  today timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Dushanbe') AT TIME ZONE 'Asia/Dushanbe';
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'totalVisits', count(*) FILTER (WHERE event_type = 'page_view'),
    'uniqueVisitors', count(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view'),
    'instagramVisitors', count(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view' AND source='instagram'),
    'whatsappVisitors', count(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view' AND source='whatsapp'),
    'viewsToday', count(*) FILTER (WHERE event_type = 'page_view' AND created_at >= today),
    'viewsWeek', count(*) FILTER (WHERE event_type = 'page_view' AND created_at >= today - interval '6 days'),
    'whatsappClicks', count(*) FILTER (WHERE event_type = 'whatsapp_click'),
    'instagramClicks', count(*) FILTER (WHERE event_type = 'instagram_click'),
    'onlineNow', count(DISTINCT visitor_id) FILTER (WHERE event_type IN ('page_view','heartbeat') AND created_at >= now() - interval '2 minutes')
  ) INTO result FROM public.analytics_visitor_events;
  result := result || (SELECT jsonb_build_object(
    'totalUsers', count(*), 'newToday', count(*) FILTER (WHERE created_at >= today),
    'newMonth', count(*) FILTER (WHERE created_at >= now() - interval '30 days')
  ) FROM public.profiles WHERE role = 'user');
  result := result || jsonb_build_object('formSubmits', (SELECT count(*) FROM public.leads));
  result := result || jsonb_build_object('sources', (SELECT coalesce(jsonb_agg(s), '[]') FROM (
    SELECT coalesce(source, 'unknown') AS key, count(*) AS views, count(DISTINCT visitor_id) AS visitors
    FROM public.analytics_visitor_events WHERE event_type='page_view' GROUP BY source ORDER BY count(*) DESC
  ) s));
  result := result || jsonb_build_object('days', (SELECT jsonb_agg(d ORDER BY day) FROM (
    SELECT day::date, count(e.id) FILTER (WHERE e.event_type='page_view') AS visits,
      count(e.id) FILTER (WHERE e.event_type='whatsapp_click') AS clicks
    FROM generate_series((today AT TIME ZONE 'Asia/Dushanbe') - interval '6 days', today AT TIME ZONE 'Asia/Dushanbe', interval '1 day') day
    LEFT JOIN public.analytics_visitor_events e ON e.created_at >= (day AT TIME ZONE 'Asia/Dushanbe')
      AND e.created_at < ((day + interval '1 day') AT TIME ZONE 'Asia/Dushanbe')
    GROUP BY day
  ) d));
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_analytics_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_analytics_summary() TO authenticated;

-- In an isolated new Supabase CLI stack reproduce the observed 2026-10-11
-- excessive table-level ACLs so the prepared TRUNCATE REVOKE can be exercised.
-- This GRANT is NOT for production; it targets synthetic staging tables only.
GRANT ALL PRIVILEGES ON TABLE
  public.admin_activity, public.analytics_events, public.leads,
  public.password_reset_requests, public.profiles, public.services,
  public.site_content, public.site_settings, public.user_activity
TO anon, authenticated, service_role;
