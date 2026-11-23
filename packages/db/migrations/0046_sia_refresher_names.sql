-- The SIA renewal course is the "refresher" (its name since April 2025, and the client's): the catalogue's SIA top-up sub-category
-- and its two topics (from the starting list, migration 0008) take the refresher's names and addresses, and so do the things
-- that point at them by address: the reviews filed under a topic ("category/sub-category/topic") and ReadTraining's shared course
-- page for the door supervisor refresher. Each statement changes a row only while it still has the old name, so it is safe on any
-- project, and does nothing on one without them.
UPDATE public.subcategories SET slug = 'sia-refresher', name = 'SIA refresher' WHERE slug = 'sia-top-up';--> statement-breakpoint
UPDATE public.topics SET slug = 'door-supervisor-refresher', name = 'Door Supervisor refresher' WHERE slug = 'door-supervisor-top-up';--> statement-breakpoint
UPDATE public.topics SET slug = 'security-officer-refresher', name = 'Security Officer refresher' WHERE slug = 'security-officer-top-up';--> statement-breakpoint
UPDATE public.reviews
SET topic = replace(replace(replace(topic, '/sia-top-up', '/sia-refresher'), '/door-supervisor-top-up', '/door-supervisor-refresher'), '/security-officer-top-up', '/security-officer-refresher')
WHERE topic LIKE 'security/sia-top-up%';--> statement-breakpoint
-- the shared page: its address (the old one keeps working, next.config.ts redirects it), and its name and search title while they
-- still say Top-Up (once a person has written others, those stay)
UPDATE public.courses
SET slug = 'sia-door-supervisor-refresher-training',
    title = CASE WHEN title = 'SIA Door Supervisor Top-Up' THEN 'SIA Door Supervisor Refresher Training' ELSE title END,
    seo_title = CASE WHEN seo_title = 'SIA Door Supervisor Top-Up course' THEN 'SIA Door Supervisor Refresher Training course' ELSE seo_title END,
    updated_at = now()
WHERE kind = 'shared' AND slug = 'sia-door-supervisor-top-up';
