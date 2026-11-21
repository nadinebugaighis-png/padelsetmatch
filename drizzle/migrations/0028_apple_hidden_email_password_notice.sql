WITH targets AS (
  SELECT DISTINCT p.id AS profile_id
  FROM auth.identities i
  JOIN auth.users u ON u.id = i.user_id
  JOIN public.profiles p ON p.user_id = u.id
  WHERE i.provider = 'apple'
    AND u.email ILIKE '%@privaterelay.appleid.com'
    AND (u.encrypted_password IS NULL OR u.encrypted_password = '')
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.profile_id = p.id AND n.type = 'account_set_password'
    )
), ins AS (
  INSERT INTO public.notifications (profile_id, type, title, body, url)
  SELECT profile_id, 'account_set_password',
    'Keep your account safe · Protege tu cuenta',
    'Set a password so you can always sign in with your email. · Crea una contraseña para entrar siempre con tu email.',
    '/reset-password'
  FROM targets
  RETURNING profile_id
)
INSERT INTO public.push_outbox (profile_id, title, body, url, type)
SELECT profile_id,
  'Keep your account safe · Protege tu cuenta',
  'Set a password so you can always sign in with your email. · Crea una contraseña para entrar siempre con tu email.',
  '/reset-password',
  'account_set_password'
FROM ins;