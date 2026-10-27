-- Course images and provider logos (Milestone 2). A PUBLIC bucket: anyone can view a file by its address (they are shown on
-- public course pages and provider profiles), but nobody can list, upload, change or delete files with the public key: there
-- are no storage.objects policies. The API (service role) uploads through signed upload URLs after checking the person may
-- edit that course or provider. Files live under <organisation id>/... so one provider's files never mix with another's.
-- Supabase enforces the size and type limits on every upload.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('course-media', 'course-media', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
