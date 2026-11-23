# Configurar o primeiro administrador

Este procedimento cria o vínculo de perfil administrativo para uma conta que **já existe** no Supabase Auth. Ele não cria usuário, não define senha e não altera credenciais.

## 1. Criar ou conferir o usuário

1. Abra o projeto correto no Supabase conectado ao Lovable.
2. Entre em **Authentication → Users**.
3. Procure o e-mail administrativo que será usado no sistema.
4. Se não existir, use **Add user** para criar a conta e defina uma senha temporária forte. Se existir, use o fluxo de redefinição de senha do Supabase; não compartilhe a senha no chat.
5. Confirme o e-mail, se a configuração do projeto exigir confirmação.

## 2. Conceder perfil de administrador

Abra **SQL Editor → New query**, substitua o e-mail de exemplo pelo e-mail exato da conta criada e execute:

```sql
do $$
declare
  target_user_id uuid;
begin
  select id
    into target_user_id
    from auth.users
   where lower(email) = lower('admin@exemplo.com')
   order by created_at
   limit 1;

  if target_user_id is null then
    raise exception 'Usuário não encontrado em Authentication → Users. Crie a conta primeiro.';
  end if;

  if not exists (
    select 1
      from public.user_roles
     where user_id = target_user_id
       and role = 'admin'
  ) then
    insert into public.user_roles (user_id, role)
    values (target_user_id, 'admin');
  end if;
end
$$;
```

## 3. Testar

1. Abra a prévia publicada/Preview do Lovable.
2. Entre com o e-mail e a senha definidos diretamente na tela do sistema.
3. O usuário deve abrir o painel com perfil **Administrador**.

## Segurança

- Nunca coloque senha, chave `service_role` ou token privado no código, GitHub ou conversa.
- Não habilite cadastro público para resolver o acesso.
- O perfil `admin` concede acesso a informações financeiras e de dízimos; conceda-o somente a quem deve ter essa permissão.
- Se o SQL retornar que a tabela ou enum não existe, pare e confira se o Supabase conectado é o mesmo projeto usado pela aplicação. Não crie tabelas improvisadas sem revisar o esquema completo.
