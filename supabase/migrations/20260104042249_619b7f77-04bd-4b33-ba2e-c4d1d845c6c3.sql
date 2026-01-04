-- Drop ALL existing RLS policies on occurrences table
DROP POLICY IF EXISTS "Public can insert occurrences" ON public.occurrences;
DROP POLICY IF EXISTS "Anyone can insert occurrences" ON public.occurrences;
DROP POLICY IF EXISTS "Authenticated users can view occurrences" ON public.occurrences;
DROP POLICY IF EXISTS "Authenticated users can update occurrences" ON public.occurrences;
DROP POLICY IF EXISTS "Authenticated users can delete occurrences" ON public.occurrences;

-- Recreate ALL policies as PERMISSIVE
CREATE POLICY "Public can insert occurrences"
ON public.occurrences
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can view occurrences"
ON public.occurrences
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update occurrences"
ON public.occurrences
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete occurrences"
ON public.occurrences
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);