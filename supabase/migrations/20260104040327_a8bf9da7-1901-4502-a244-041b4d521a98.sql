-- Create occurrences table for the beta
CREATE TABLE public.occurrences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'aberta',
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  nascimento DATE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Administrativa',
  motivo TEXT NOT NULL,
  admin_descricao TEXT DEFAULT '',
  ia_resumo TEXT DEFAULT '',
  protocolo TEXT DEFAULT '',
  pdf_url TEXT DEFAULT ''
);

-- Enable RLS but allow public inserts for the beta (no auth required for registering)
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert occurrences (public form)
CREATE POLICY "Anyone can insert occurrences"
ON public.occurrences
FOR INSERT
WITH CHECK (true);

-- Only authenticated users can view occurrences (for admin panel later)
CREATE POLICY "Authenticated users can view occurrences"
ON public.occurrences
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only authenticated users can update occurrences
CREATE POLICY "Authenticated users can update occurrences"
ON public.occurrences
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Only authenticated users can delete occurrences
CREATE POLICY "Authenticated users can delete occurrences"
ON public.occurrences
FOR DELETE
USING (auth.uid() IS NOT NULL);