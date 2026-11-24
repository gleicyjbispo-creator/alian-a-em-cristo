-- Concede acesso administrativo ao novo usuário do MARC.
-- Idempotente: pode ser executado novamente sem duplicar a permissão.
INSERT INTO public.user_roles (user_id, role)
VALUES ('75b42857-bb58-4321-98fb-a6c8c0b88f8b'::uuid, 'admin'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;
