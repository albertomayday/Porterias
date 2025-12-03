-- Remove unique constraint on publish_date to allow multiple strips per day
ALTER TABLE public.comic_strips DROP CONSTRAINT IF EXISTS comic_strips_publish_date_key;