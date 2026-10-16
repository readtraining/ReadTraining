-- Profile photos. A PRIVATE bucket: the API (service role) uploads through signed upload URLs and shows photos through
-- short-lived signed URLs; there are no storage.objects policies, so the public key can't list, read or write anything.
-- Supabase enforces the size and type limits on every upload.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
