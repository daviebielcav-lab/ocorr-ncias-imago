-- Drop the existing restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can insert occurrences" ON public.occurrences;

-- Create a PERMISSIVE policy for public inserts
CREATE POLICY "Public can insert occurrences"
ON public.occurrences
FOR INSERT
TO anon, authenticated
WITH CHECK (true);