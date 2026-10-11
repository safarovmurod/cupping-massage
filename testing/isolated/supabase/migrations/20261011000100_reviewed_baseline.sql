-- ISOLATED STAGING ONLY. Reviewed DDL from supabase/schema.sql with ALL top-level data backfills and seeds removed. Never run against production.
-- ============================================================
-- Cupping Massage — Supabase Schema (v2, безопасно перезапускать)
-- Вставить целиком в Supabase → SQL Editor → Run
-- ============================================================

-- ============================================================
-- 1. ТАБЛИЦЫ
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  preferred_time TEXT,
  for_whom TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  price TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB,
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы под сортировки/фильтры в админке
CREATE INDEX IF NOT EXISTS idx_leads_created_at     ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status         ON leads (status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at  ON profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_type       ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_activity_created_at  ON admin_activity (created_at DESC);

-- ============================================================
-- 2. ХЕЛПЕР is_admin()
-- ВАЖНО: SECURITY DEFINER — иначе RLS-политика на profiles,
-- которая сама читает profiles, даёт
-- "infinite recursion detected in policy for relation profiles"
-- и вход в админку полностью ломается.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content     ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE services         ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity   ENABLE ROW LEVEL SECURITY;

-- --- Сносим старые политики, чтобы скрипт был идемпотентным ---
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles','leads','site_content','site_settings',
                        'services','analytics_events','admin_activity')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- === PROFILES ===
-- Своя запись ИЛИ админ видит всех (одна политика вместо двух конфликтующих)
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Страховка, если триггер не сработал: юзер может создать свою запись
CREATE POLICY "profiles_insert_self" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- === LEADS ===
-- Заявку с сайта отправляет анонимный посетитель
CREATE POLICY "leads_insert_public" ON leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "leads_select_admin" ON leads
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "leads_update_admin" ON leads
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "leads_delete_admin" ON leads
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- === SITE_CONTENT === (публичное чтение, запись — админ)
CREATE POLICY "content_select_public" ON site_content
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "content_insert_admin" ON site_content
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "content_update_admin" ON site_content
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "content_delete_admin" ON site_content
  FOR DELETE TO authenticated USING (public.is_admin());

-- === SITE_SETTINGS ===
CREATE POLICY "settings_select_public" ON site_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "settings_insert_admin" ON site_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "settings_update_admin" ON site_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "settings_delete_admin" ON site_settings
  FOR DELETE TO authenticated USING (public.is_admin());

-- === SERVICES === (публично только активные, админ видит все)
CREATE POLICY "services_select" ON services
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin());

CREATE POLICY "services_insert_admin" ON services
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "services_update_admin" ON services
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "services_delete_admin" ON services
  FOR DELETE TO authenticated USING (public.is_admin());

-- === ANALYTICS_EVENTS === (анонимный insert, чтение — админ)
CREATE POLICY "analytics_insert_public" ON analytics_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "analytics_select_admin" ON analytics_events
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "analytics_delete_admin" ON analytics_events
  FOR DELETE TO authenticated USING (public.is_admin());

-- === ADMIN_ACTIVITY ===
CREATE POLICY "activity_select_admin" ON admin_activity
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "activity_insert_admin" ON admin_activity
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND user_id = auth.uid());

-- ============================================================
-- 4. АВТОСОЗДАНИЕ ПРОФИЛЯ ПРИ РЕГИСТРАЦИИ
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Isolated fixture: deliberately no auth.users backfill or client data.

-- ============================================================
-- 4.1. ЗАЩИТА ПРИВИЛЕГИРОВАННЫХ ПОЛЕЙ (role)
-- Запрещает обычному пользователю делать себя админом через API
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'user';
    RETURN NEW;
  END IF;

  NEW.role := OLD.role;
  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_fields ON public.profiles;
CREATE TRIGGER protect_profile_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- Запрещаем вызов внутренних триггерных функций через RPC API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_privileged_fields() FROM PUBLIC, anon, authenticated;
