CREATE TABLE public.expenses (
  id bigserial PRIMARY KEY,
  expense_date date NOT NULL DEFAULT current_date,
  category text NOT NULL,
  vendor text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  amount numeric NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
GRANT USAGE ON SEQUENCE public.expenses_id_seq TO authenticated, service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.product_returns (
  id bigserial PRIMARY KEY,
  product_id bigint,
  product_name text NOT NULL,
  outlet_name text NOT NULL DEFAULT '',
  quantity numeric NOT NULL CHECK (quantity > 0),
  condition text NOT NULL DEFAULT 'good' CHECK (condition IN ('good','damaged')),
  reason text NOT NULL DEFAULT '',
  value numeric NOT NULL DEFAULT 0 CHECK (value >= 0),
  owner text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_returns TO authenticated;
GRANT ALL ON public.product_returns TO service_role;
GRANT USAGE ON SEQUENCE public.product_returns_id_seq TO authenticated, service_role;
ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage returns" ON public.product_returns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.cashbox_days (
  id bigserial PRIMARY KEY,
  business_date date NOT NULL UNIQUE,
  opening numeric NOT NULL DEFAULT 0,
  cash_sales numeric NOT NULL DEFAULT 0,
  card_sales numeric NOT NULL DEFAULT 0,
  refunds numeric NOT NULL DEFAULT 0,
  counted numeric NOT NULL DEFAULT 0,
  denominations jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text NOT NULL DEFAULT '',
  closed_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cashbox_days TO authenticated;
GRANT ALL ON public.cashbox_days TO service_role;
GRANT USAGE ON SEQUENCE public.cashbox_days_id_seq TO authenticated, service_role;
ALTER TABLE public.cashbox_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cashbox" ON public.cashbox_days FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));