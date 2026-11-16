-- Learning options: every provider course so far was taught one way (`method`), so that is its one enabled option. Shared
-- pages have no method and keep an empty list.
UPDATE public.courses SET methods = ARRAY[method] WHERE method IS NOT NULL;
