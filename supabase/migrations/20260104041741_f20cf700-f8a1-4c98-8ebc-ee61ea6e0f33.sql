-- Add new columns for AI response
ALTER TABLE public.occurrences 
ADD COLUMN IF NOT EXISTS classificacao TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS conclusao TEXT DEFAULT '';