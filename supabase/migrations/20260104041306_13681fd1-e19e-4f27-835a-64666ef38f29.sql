-- Create storage bucket for occurrence PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('occurrence-pdfs', 'occurrence-pdfs', true);

-- Allow public read access to PDFs
CREATE POLICY "Public can view occurrence PDFs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'occurrence-pdfs');

-- Allow service role to upload PDFs (via edge function)
CREATE POLICY "Service role can upload PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'occurrence-pdfs');

-- Allow service role to update PDFs
CREATE POLICY "Service role can update PDFs"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'occurrence-pdfs');

-- Create a sequence for protocol counter per day
CREATE TABLE IF NOT EXISTS public.protocol_counters (
  date_key TEXT PRIMARY KEY,
  counter INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS on protocol_counters
ALTER TABLE public.protocol_counters ENABLE ROW LEVEL SECURITY;

-- Allow the service role to manage counters
CREATE POLICY "Service role can manage counters"
ON public.protocol_counters
FOR ALL
USING (true)
WITH CHECK (true);