-- ONLY synthetic content. No real user/client/email/phone/address.
-- Authentication identities are created by test-auth-crud.mjs via local Auth,
-- not by raw INSERTs into auth.users.
INSERT INTO public.site_content (key, value) VALUES
  ('sandbox.ui.notice.ru', 'Тестовое окружение: все данные вымышлены.'),
  ('sandbox.ui.notice.tj', 'Муҳити санҷишӣ: маълумотҳо сохта мебошанд.'),
  ('sandbox.ui.notice.en', 'Synthetic sandbox data only.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value) VALUES
  ('sandbox_only', 'true'),
  ('sandbox_contact', 'No real customer contact data')
ON CONFLICT (key) DO NOTHING;
