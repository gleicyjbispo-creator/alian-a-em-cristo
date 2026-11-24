-- Concede acesso administrativo ao usuário recriado do MARC.
-- Idempotente: pode ser executado novamente sem duplicar a permissão.
INSERT INTO public.user_roles (user_id, role)
VALUES ('1104e0c7-bcf2-4b14-aedc-a5994e899a6c'::uuid, 'admin'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;
