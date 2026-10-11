-- ISOLATED STAGING ONLY. Definitions from legacy migration_02..08; no top-level data backfills / content seeds. Never run against production.

-- === Reviewed feature step 2 ===
-- ============================================================
-- МИГРАЦИЯ 02: расширенные профили клиентов + журнал действий
-- Запускать в Supabase → SQL Editor → Run
-- Безопасно перезапускать.
-- ============================================================

-- ===== 1. НОВЫЕ ПОЛЯ В PROFILES =====
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name    TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name     TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone         TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date    DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender        TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nationality   TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country       TEXT DEFAULT 'Таджикистан';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region        TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city          TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address       TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url    TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notes         TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active     BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lang          TEXT DEFAULT 'ru';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_count   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT now();

-- Пол — только допустимые значения
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_gender_check
    CHECK (gender IS NULL OR gender IN ('male','female','other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== 2. ЖУРНАЛ ДЕЙСТВИЙ ПОЛЬЗОВАТЕЛЯ =====
CREATE TABLE IF NOT EXISTS public.user_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,          -- login / logout / register / profile_update / password_reset ...
  details     JSONB,
  page_url    TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user ON public.user_activity (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_date ON public.user_activity (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_phone     ON public.profiles (phone);
CREATE INDEX IF NOT EXISTS idx_profiles_active    ON public.profiles (is_active);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ua_insert_self"   ON public.user_activity;
DROP POLICY IF EXISTS "ua_select_self"   ON public.user_activity;
DROP POLICY IF EXISTS "ua_select_admin"  ON public.user_activity;

CREATE POLICY "ua_insert_self" ON public.user_activity
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "ua_select_self" ON public.user_activity
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "ua_select_admin" ON public.user_activity
  FOR SELECT TO authenticated USING (public.is_admin());

-- ===== 3. АДМИН МОЖЕТ УДАЛЯТЬ ПРОФИЛИ =====
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated USING (public.is_admin());

-- ===== 4. ТРИГГЕР РЕГИСТРАЦИИ: пишем все переданные поля =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE m JSONB;
BEGIN
  m := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  INSERT INTO public.profiles (
    id, email, full_name, first_name, last_name, phone,
    birth_date, gender, nationality, country, region, city,
    address, avatar_url, lang, role
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(m->>'full_name', TRIM(CONCAT(m->>'first_name',' ',m->>'last_name'))),
    m->>'first_name',
    m->>'last_name',
    m->>'phone',
    CASE WHEN (m->>'birth_date') ~ '^\d{4}-\d{2}-\d{2}$'
         THEN (m->>'birth_date')::date ELSE NULL END,
    m->>'gender',
    m->>'nationality',
    COALESCE(m->>'country', 'Таджикистан'),
    m->>'region',
    m->>'city',
    m->>'address',
    m->>'avatar_url',
    COALESCE(m->>'lang','ru'),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_activity (user_id, action, details)
  VALUES (NEW.id, 'register', jsonb_build_object('email', NEW.email));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== 5. АДМИН-ФУНКЦИЯ: СБРОС ПАРОЛЯ КЛИЕНТУ =====
-- Пароль в базе хранится как bcrypt-хеш и НЕ может быть показан.
-- Админ задаёт новый пароль и передаёт его клиенту.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.admin_set_user_password(
  target_user_id UUID,
  new_password   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Доступ запрещён');
  END IF;
  IF length(new_password) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Пароль минимум 6 символов');
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Пользователь не найден');
  END IF;

  INSERT INTO public.user_activity (user_id, action, details)
  VALUES (target_user_id, 'password_reset_by_admin',
          jsonb_build_object('by', auth.uid()));

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_password(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_password(UUID, TEXT) TO authenticated;

-- ===== 6. АДМИН-ФУНКЦИЯ: ПОЛНАЯ КАРТОЧКА ПОЛЬЗОВАТЕЛЯ =====
CREATE OR REPLACE FUNCTION public.admin_get_user_details(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('error', 'Доступ запрещён');
  END IF;

  SELECT jsonb_build_object(
    'profile', to_jsonb(p) - 'id',
    'auth', jsonb_build_object(
      'email',              u.email,
      'email_confirmed',    u.email_confirmed_at IS NOT NULL,
      'phone_auth',         u.phone,
      'created_at',         u.created_at,
      'last_sign_in_at',    u.last_sign_in_at,
      'provider',           u.raw_app_meta_data->>'provider',
      'banned_until',       u.banned_until,
      'password_is_hashed', true
    ),
    'activity', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'action', a.action, 'details', a.details,
               'page_url', a.page_url, 'created_at', a.created_at
             ) ORDER BY a.created_at DESC)
      FROM (SELECT * FROM public.user_activity
            WHERE user_id = target_user_id
            ORDER BY created_at DESC LIMIT 100) a
    ), '[]'::jsonb),
    'leads_count', (SELECT count(*) FROM public.leads l WHERE l.phone = p.phone)
  )
  INTO result
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = target_user_id;

  RETURN COALESCE(result, jsonb_build_object('error','Пользователь не найден'));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user_details(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_details(UUID) TO authenticated;


-- === Reviewed feature step 3 ===
-- ============================================================
-- МИГРАЦИЯ 03: Сброс пароля по 6-значному КОДУ (без email/SMTP)
-- ============================================================
-- Зачем: встроенный SMTP Supabase присылает всего ~2 письма в час.
-- Поэтому добавляем второй путь: клиент оставляет заявку -> админ
-- видит её в админ-панели, выдаёт 6-значный код и передаёт его
-- клиенту в WhatsApp -> клиент вводит код и новый пароль на сайте.
--
-- Запускать в Supabase -> SQL Editor -> Run.
-- Скрипт безопасно запускать повторно (idempotent).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------- 1. Таблица заявок на сброс пароля ----------
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  code        TEXT,                                  -- 6 цифр, виден только админу
  status      TEXT NOT NULL DEFAULT 'pending',       -- pending | code_issued | used | rejected
  attempts    INT  NOT NULL DEFAULT 0,               -- неудачные попытки ввода кода
  lang        TEXT DEFAULT 'ru',
  note        TEXT,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_at   TIMESTAMPTZ,
  used_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_prr_email   ON public.password_reset_requests(email);
CREATE INDEX IF NOT EXISTS idx_prr_status  ON public.password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_prr_created ON public.password_reset_requests(created_at DESC);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Читать/менять заявки может ТОЛЬКО админ.
DROP POLICY IF EXISTS "prr_admin_all"    ON public.password_reset_requests;
DROP POLICY IF EXISTS "prr_admin_select" ON public.password_reset_requests;
CREATE POLICY "prr_admin_select" ON public.password_reset_requests
  FOR SELECT USING (public.is_admin());
CREATE POLICY "prr_admin_update" ON public.password_reset_requests
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "prr_admin_delete" ON public.password_reset_requests
  FOR DELETE USING (public.is_admin());
-- INSERT только через функцию ниже (SECURITY DEFINER), напрямую никому нельзя.


-- ---------- 2. Клиент оставляет заявку (доступно всем) ----------
CREATE OR REPLACE FUNCTION public.request_password_reset(p_email TEXT, p_lang TEXT DEFAULT 'ru')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_user_id UUID;
  v_recent INT;
BEGIN
  IF v_email IS NULL OR v_email = '' OR position('@' in v_email) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_email');
  END IF;

  -- анти-спам: не более 3 заявок в час на один email
  SELECT count(*) INTO v_recent
  FROM public.password_reset_requests
  WHERE email = v_email AND created_at > now() - interval '1 hour';

  IF v_recent >= 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'too_many');
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email LIMIT 1;

  -- Заявку создаём даже если пользователя нет — чтобы не раскрывать,
  -- какие email зарегистрированы. Админ увидит пометку.
  INSERT INTO public.password_reset_requests (user_id, email, lang, status, note)
  VALUES (
    v_user_id, v_email, coalesce(p_lang, 'ru'), 'pending',
    CASE WHEN v_user_id IS NULL THEN 'Пользователь с таким email не найден' ELSE NULL END
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.request_password_reset(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_password_reset(TEXT, TEXT) TO anon, authenticated;


-- ---------- 3. Админ выдаёт 6-значный код ----------
CREATE OR REPLACE FUNCTION public.admin_issue_reset_code(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_row public.password_reset_requests;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Доступ запрещён');
  END IF;

  SELECT * INTO v_row FROM public.password_reset_requests WHERE id = p_request_id;
  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Заявка не найдена');
  END IF;
  IF v_row.user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Пользователь с таким email не зарегистрирован');
  END IF;

  -- Криптографически стойкий 6-значный код (100000..999999) через pgcrypto
  v_code := ((100000 + (abs(('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(31)::bigint) % 900000)))::TEXT;

  UPDATE public.password_reset_requests
  SET code = v_code, status = 'code_issued', attempts = 0,
      issued_at = now(), expires_at = now() + interval '30 minutes'
  WHERE id = p_request_id;

  RETURN jsonb_build_object('ok', true, 'code', v_code,
                            'email', v_row.email,
                            'expires_at', now() + interval '30 minutes');
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_issue_reset_code(UUID) TO authenticated;


-- ---------- 4. Админ выдаёт код сразу по email (без заявки) ----------
CREATE OR REPLACE FUNCTION public.admin_create_reset_code_for_email(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_user_id UUID;
  v_code TEXT;
  v_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Доступ запрещён');
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Пользователь с таким email не найден');
  END IF;

  -- Криптографически стойкий 6-значный код (100000..999999) через pgcrypto
  v_code := ((100000 + (abs(('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(31)::bigint) % 900000)))::TEXT;

  INSERT INTO public.password_reset_requests
    (user_id, email, code, status, issued_at, expires_at, note)
  VALUES
    (v_user_id, v_email, v_code, 'code_issued', now(), now() + interval '30 minutes',
     'Код создан администратором вручную')
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'code', v_code, 'id', v_id, 'email', v_email);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_create_reset_code_for_email(TEXT) TO authenticated;


-- ---------- 5. Клиент меняет пароль по коду (доступно всем) ----------
CREATE OR REPLACE FUNCTION public.reset_password_with_code(
  p_email TEXT, p_code TEXT, p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_code  TEXT := regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g');
  v_row   public.password_reset_requests;
BEGIN
  IF length(coalesce(p_new_password, '')) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'weak_password');
  END IF;

  -- последняя выданная заявка по этому email
  SELECT * INTO v_row
  FROM public.password_reset_requests
  WHERE email = v_email AND status = 'code_issued'
  ORDER BY issued_at DESC NULLS LAST
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_code');
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    UPDATE public.password_reset_requests SET status = 'rejected', note = 'Код истёк'
    WHERE id = v_row.id;
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF v_row.attempts >= 5 THEN
    UPDATE public.password_reset_requests SET status = 'rejected', note = 'Слишком много попыток'
    WHERE id = v_row.id;
    RETURN jsonb_build_object('ok', false, 'error', 'too_many');
  END IF;

  IF v_row.code IS DISTINCT FROM v_code THEN
    UPDATE public.password_reset_requests SET attempts = attempts + 1 WHERE id = v_row.id;
    RETURN jsonb_build_object('ok', false, 'error', 'bad_code',
                              'left', 5 - (v_row.attempts + 1));
  END IF;

  -- код верный -> меняем пароль
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  WHERE id = v_row.user_id;

  UPDATE public.password_reset_requests
  SET status = 'used', used_at = now(), code = NULL
  WHERE id = v_row.id;

  -- пишем в журнал действий пользователя (таблица из миграции 02)
  BEGIN
    INSERT INTO public.user_activity (user_id, action, details)
    VALUES (v_row.user_id, 'password_reset_code', jsonb_build_object('email', v_email));
  EXCEPTION WHEN others THEN NULL;
  END;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.reset_password_with_code(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_password_with_code(TEXT, TEXT, TEXT) TO anon, authenticated;


-- ---------- 6. Проверка ----------
SELECT 'Миграция 03 применена' AS status,
       (SELECT count(*) FROM public.password_reset_requests) AS requests_count;


-- === Reviewed feature step 4 ===
-- ============================================================
-- МИГРАЦИЯ 04: Удаление пользователей ИЗ АДМИН-ПАНЕЛИ
-- ============================================================
-- Зачем: чтобы больше НЕ нужно было заходить в SQL Editor.
-- После этой миграции в админке появится кнопка "Удалить" —
-- и тестовых/лишних пользователей можно удалять мышкой.
--
-- Запускать в Supabase -> SQL Editor -> Run. Можно повторно.
-- ============================================================

-- ---------- 1. Удалить ОДНОГО пользователя ----------
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Доступ запрещён');
  END IF;

  -- Защита: нельзя удалить самого себя
  IF target_user_id = auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Нельзя удалить свой собственный аккаунт');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = target_user_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Пользователь не найден');
  END IF;

  -- Защита: нельзя удалить последнего администратора
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id AND role = 'admin')
     AND (SELECT count(*) FROM public.profiles WHERE role = 'admin') <= 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Это последний администратор — удалить нельзя');
  END IF;

  -- Чистим связанные записи (на случай отсутствия ON DELETE CASCADE)
  BEGIN DELETE FROM public.user_activity WHERE user_id = target_user_id; EXCEPTION WHEN others THEN NULL; END;
  BEGIN DELETE FROM public.password_reset_requests WHERE user_id = target_user_id; EXCEPTION WHEN others THEN NULL; END;
  BEGIN DELETE FROM public.profiles WHERE id = target_user_id; EXCEPTION WHEN others THEN NULL; END;

  -- auth.identities + auth.sessions удалятся каскадом вместе с auth.users
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object('ok', true, 'email', v_email);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;


-- ---------- 2. Удалить ВСЕХ тестовых пользователей одной кнопкой ----------
-- Удаляет только НЕ-админов, чей email начинается на test / testuser
-- или совпадает с мусорным 'твой@email.com'.
CREATE OR REPLACE FUNCTION public.admin_delete_test_users()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ids UUID[];
  v_emails TEXT[];
  v_count INT;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Доступ запрещён');
  END IF;

  SELECT array_agg(u.id), array_agg(u.email)
  INTO v_ids, v_emails
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id <> auth.uid()
    AND coalesce(p.role, 'user') <> 'admin'
    AND (
      lower(u.email) LIKE 'test%@%'
      OR lower(u.email) LIKE 'testuser%@%'
      OR u.email = 'твой@email.com'
    );

  IF v_ids IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'deleted', 0, 'emails', '[]'::jsonb);
  END IF;

  BEGIN DELETE FROM public.user_activity WHERE user_id = ANY(v_ids); EXCEPTION WHEN others THEN NULL; END;
  BEGIN DELETE FROM public.password_reset_requests WHERE user_id = ANY(v_ids); EXCEPTION WHEN others THEN NULL; END;
  BEGIN DELETE FROM public.profiles WHERE id = ANY(v_ids); EXCEPTION WHEN others THEN NULL; END;

  DELETE FROM auth.users WHERE id = ANY(v_ids);
  v_count := array_length(v_ids, 1);

  RETURN jsonb_build_object('ok', true, 'deleted', v_count, 'emails', to_jsonb(v_emails));
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_test_users() TO authenticated;


SELECT 'Миграция 04 применена ✅ — теперь можно удалять клиентов кнопкой в админке' AS status;


-- === Reviewed feature step 5 ===
-- ============================================================
-- Миграция 05 — безопасность профилей
-- Вставить целиком в Supabase → SQL Editor → Run
--
-- ПРОБЛЕМА:
-- политика "profiles_update_own" разрешает пользователю менять ЛЮБЫЕ
-- поля своей строки, включая role и is_active. То есть любой
-- зарегистрированный человек мог из браузера выполнить
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', <свой id>)
-- и получить доступ в админку. RLS не умеет ограничивать отдельные
-- колонки, поэтому закрываем это триггером.
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.uid() пустой = запрос не от пользователя сайта
  -- (SQL Editor, service_role, триггер handle_new_user) — не мешаем.
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'user';
    NEW.is_active := TRUE;
    RETURN NEW;
  END IF;

  -- Обычный пользователь не может менять привилегированные поля
  NEW.role := OLD.role;
  NEW.is_active := OLD.is_active;
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

-- ============================================================
-- Проверка (выполнить после Run):
--   SELECT tgname FROM pg_trigger WHERE tgname = 'protect_profile_fields';
-- Должна вернуться одна строка.
-- ============================================================


-- === Reviewed feature step 6 ===
-- ============================================================
-- Миграция 06 — права на вызов функций через REST API
--
-- Проверка Supabase (Security Advisor) показала: все SECURITY DEFINER
-- функции по умолчанию доступны роли PUBLIC, то есть их можно дёрнуть
-- из браузера по /rest/v1/rpc/<имя> вообще без входа.
-- Внутри админских функций есть проверка is_admin(), но лишний рубеж
-- не мешает: анонимный посетитель не должен их даже видеть.
--
-- Применено на проекте 2026-09-09.
-- ============================================================

-- Триггерные функции никто не должен вызывать через API.
-- Права на триггер проверяются в момент CREATE TRIGGER, поэтому
-- регистрация (handle_new_user) после этого продолжает работать — проверено.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_privileged_fields() FROM PUBLIC, anon, authenticated;

-- Админские функции — только для вошедшего пользователя (роль проверяется внутри)
REVOKE ALL ON FUNCTION public.admin_create_reset_code_for_email(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_test_users()               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_user(UUID)                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_issue_reset_code(UUID)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_user_details(UUID)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_user_password(UUID, TEXT)     FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_create_reset_code_for_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_test_users()               TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_issue_reset_code(UUID)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_details(UUID)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_password(UUID, TEXT)     TO authenticated;

-- Восстановление пароля нужно человеку, который ещё не вошёл — оставляем открытым
GRANT EXECUTE ON FUNCTION public.request_password_reset(TEXT, TEXT)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_password_with_code(TEXT, TEXT, TEXT)  TO anon, authenticated;

-- is_admin() трогать НЕЛЬЗЯ: её вызывают сами RLS-политики от имени anon
-- и authenticated. Если забрать права — сломается чтение таблиц.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;


-- === Reviewed feature step 7 ===
-- ============================================================
-- Миграция 07 — «кто и откуда заходил на сайт»
--
-- Раньше в analytics_events не было ни посетителя, ни источника перехода,
-- а сам просмотр страницы вообще нигде не записывался. Поэтому статистика
-- посещений всегда была пустой.
--
-- visitor_id — случайная строка из localStorage браузера. Позволяет отличить
--   «10 просмотров одного человека» от «10 разных людей». Личных данных нет.
-- user_id    — заполняется, только если человек вошёл в аккаунт. Тогда в
--   админке видно имя, а не «Гость».
-- source     — откуда пришёл: instagram / whatsapp / telegram / google /
--   direct. Берётся из utm_source в ссылке или из referrer браузера.
--
-- Применено на проекте 2026-09-09.
-- ============================================================

ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS visitor_id TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT;

CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON public.analytics_events (visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_source  ON public.analytics_events (source);
CREATE INDEX IF NOT EXISTS idx_analytics_user    ON public.analytics_events (user_id);

-- Раньше аноним мог записать в аналитику что угодно, включая чужой user_id.
-- Теперь можно указать только свой.
DROP POLICY IF EXISTS "analytics_insert_public" ON public.analytics_events;
CREATE POLICY "analytics_insert_public" ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Защита от мусорных огромных строк
ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_sane_lengths;
ALTER TABLE public.analytics_events ADD CONSTRAINT analytics_sane_lengths CHECK (
  coalesce(length(event_type), 0) <= 40 AND
  coalesce(length(page_url), 0)   <= 200 AND
  coalesce(length(user_agent), 0) <= 300 AND
  coalesce(length(referrer), 0)   <= 300 AND
  coalesce(length(source), 0)     <= 40 AND
  coalesce(length(visitor_id), 0) <= 64
) NOT VALID;


-- === Reviewed feature step 8 ===
-- ============================================================
-- Миграция 08 — ограничение длины полей заявки
--
-- Заявку с сайта отправляет анонимный посетитель (политика
-- leads_insert_public), поэтому длину полей ограничиваем на уровне базы —
-- чтобы нельзя было залить в таблицу мусор мегабайтами.
--
-- Применено на проекте 2026-09-09.
-- ============================================================

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_sane_lengths;
ALTER TABLE public.leads ADD CONSTRAINT leads_sane_lengths CHECK (
  length(name) BETWEEN 2 AND 100 AND
  length(phone) BETWEEN 5 AND 40 AND
  coalesce(length(message), 0) <= 1000 AND
  coalesce(length(preferred_time), 0) <= 100 AND
  coalesce(length(for_whom), 0) <= 20
) NOT VALID;
