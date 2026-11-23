-- ===== Perfis =====
CREATE TYPE public.app_role AS ENUM ('admin', 'secretaria');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'secretaria'))
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

CREATE POLICY "Usuário vê o próprio perfil; admin vê todos" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ===== updated_at =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ===== Membros =====
CREATE TYPE public.member_status AS ENUM ('ativo', 'inativo');

CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 150),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 30),
  phone_digits text GENERATED ALWAYS AS (NULLIF(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), '')) STORED,
  birth_date date,
  joined_at date,
  status public.member_status NOT NULL DEFAULT 'ativo',
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX members_name_idx ON public.members (lower(full_name));
CREATE INDEX members_phone_idx ON public.members (phone_digits);
GRANT SELECT, INSERT, UPDATE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER members_updated_at BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Equipe vê membros" ON public.members FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Equipe cadastra membros" ON public.members FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Equipe edita membros" ON public.members FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ===== Dizimista (somente admin) =====
CREATE TABLE public.member_tithers (
  member_id uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE RESTRICT,
  is_tither boolean NOT NULL DEFAULT false,
  updated_by uuid DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.member_tithers TO authenticated;
GRANT ALL ON public.member_tithers TO service_role;
ALTER TABLE public.member_tithers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER member_tithers_updated_at BEFORE UPDATE ON public.member_tithers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Admin vê dizimistas" ON public.member_tithers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin marca dizimistas" ON public.member_tithers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin altera dizimistas" ON public.member_tithers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== Visitantes =====
CREATE TABLE public.visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 150),
  phone text NOT NULL CHECK (char_length(regexp_replace(phone, '\D', '', 'g')) BETWEEN 10 AND 13 AND char_length(phone) <= 30),
  phone_digits text GENERATED ALWAYS AS (regexp_replace(phone, '\D', '', 'g')) STORED,
  visit_date date NOT NULL,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  converted_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX visitors_visit_date_idx ON public.visitors (visit_date);
CREATE INDEX visitors_phone_idx ON public.visitors (phone_digits);
GRANT SELECT, INSERT, UPDATE ON public.visitors TO authenticated;
GRANT ALL ON public.visitors TO service_role;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER visitors_updated_at BEFORE UPDATE ON public.visitors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Equipe vê visitantes" ON public.visitors FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Equipe cadastra visitantes" ON public.visitors FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Equipe edita visitantes" ON public.visitors FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Conversão de visitante em membro (idempotente)
CREATE OR REPLACE FUNCTION public.convert_visitor_to_member(_visitor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v public.visitors%ROWTYPE;
  m_id uuid;
  created boolean := false;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v FROM public.visitors WHERE id = _visitor_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visitante não encontrado';
  END IF;

  IF v.member_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.members WHERE id = v.member_id) THEN
    RETURN jsonb_build_object('member_id', v.member_id, 'created', false);
  END IF;

  -- Mesmo nome e mesmo telefone: reaproveita o membro existente
  SELECT id INTO m_id FROM public.members
   WHERE phone_digits = v.phone_digits
     AND lower(btrim(full_name)) = lower(btrim(v.full_name))
   ORDER BY created_at LIMIT 1;

  IF m_id IS NULL THEN
    INSERT INTO public.members (full_name, phone, joined_at, status, notes, created_by)
    VALUES (
      btrim(v.full_name), v.phone, (now() AT TIME ZONE 'America/Sao_Paulo')::date, 'ativo',
      left('Convertido de visitante (visita em ' || to_char(v.visit_date, 'DD/MM/YYYY') || ').'
        || COALESCE(E'\n' || v.notes, ''), 2000),
      auth.uid()
    )
    RETURNING id INTO m_id;
    created := true;
  END IF;

  UPDATE public.visitors
     SET member_id = m_id, converted_at = COALESCE(converted_at, now())
   WHERE id = _visitor_id;

  RETURN jsonb_build_object('member_id', m_id, 'created', created);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.convert_visitor_to_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_visitor_to_member(uuid) TO authenticated;

-- ===== Financeiro (somente admin) =====
CREATE TYPE public.entry_type AS ENUM ('dizimo', 'oferta');
CREATE TYPE public.payment_method AS ENUM ('pix', 'dinheiro', 'transferencia', 'outro');

CREATE TABLE public.financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type public.entry_type NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 100000000000),
  entry_date date NOT NULL,
  payment_method public.payment_method NOT NULL,
  member_id uuid REFERENCES public.members(id) ON DELETE RESTRICT,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  is_cancelled boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  cancelled_by uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT oferta_sem_doador CHECK (entry_type = 'dizimo' OR member_id IS NULL)
);
CREATE INDEX financial_entries_date_idx ON public.financial_entries (entry_date);
CREATE INDEX financial_entries_member_idx ON public.financial_entries (member_id);
GRANT SELECT, INSERT, UPDATE ON public.financial_entries TO authenticated;
GRANT ALL ON public.financial_entries TO service_role;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.financial_entries_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.is_cancelled := false;
    NEW.cancelled_at := NULL;
    NEW.cancelled_by := NULL;
    RETURN NEW;
  END IF;
  IF OLD.is_cancelled THEN
    RAISE EXCEPTION 'Lançamento cancelado não pode ser alterado';
  END IF;
  IF NEW.is_cancelled AND NOT OLD.is_cancelled THEN
    NEW.cancelled_at := now();
    NEW.cancelled_by := auth.uid();
  END IF;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER financial_entries_guard BEFORE INSERT OR UPDATE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.financial_entries_guard();

CREATE POLICY "Admin vê lançamentos" ON public.financial_entries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin registra lançamentos" ON public.financial_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin corrige lançamentos" ON public.financial_entries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));