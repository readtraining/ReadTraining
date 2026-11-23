-- ReadTraining's shared course page for SIA CCTV operator training takes the client's address and name ("SIA CCTV Operator
-- Training", /course/sia-cctv-operator-training; the old address keeps working, next.config.ts redirects it). The name and search
-- title change only while they are still the starting ones, so words a person has written stay. Safe on any project, and does
-- nothing on one without the page.
UPDATE public.courses
SET slug = 'sia-cctv-operator-training',
    title = CASE WHEN title = 'SIA CCTV Operator (Public Space Surveillance)' THEN 'SIA CCTV Operator Training' ELSE title END,
    seo_title = CASE WHEN seo_title = 'SIA CCTV Operator (Public Space Surveillance) course' THEN 'SIA CCTV Operator Training course' ELSE seo_title END,
    updated_at = now()
WHERE kind = 'shared' AND slug = 'sia-cctv-operator'
  AND NOT EXISTS (SELECT 1 FROM public.courses c WHERE c.slug = 'sia-cctv-operator-training');
