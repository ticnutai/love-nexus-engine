
-- People/contacts table for matchmaking data
CREATE TABLE public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  gender text,
  age integer,
  city text,
  phone text,
  email text,
  occupation text,
  education text,
  religiosity text,
  hobbies text,
  preferences text,
  status text NOT NULL DEFAULT 'available',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can CRUD their own people
CREATE POLICY "Users can view all people" ON public.people FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert people" ON public.people FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own people" ON public.people FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete people" ON public.people FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON public.people FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
