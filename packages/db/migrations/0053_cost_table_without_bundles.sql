-- Shared course pages sell nothing (migration 0052): the SIA Door Supervisor cost table's line still told learners that "booking a
-- bundle can reduce your total", which no longer means anything on that page, so the sentence comes out (the rest of the line is
-- kept as the client wrote it). Only a guide with those exact words changes; an empty database has none.
UPDATE "public"."course_guides"
SET "content" = jsonb_set("content", '{costs,intro}', to_jsonb(btrim(replace("content"->'costs'->>'intro', 'Booking a bundle can reduce your total.', '')))), "updated_at" = now()
WHERE "content"->'costs'->>'intro' LIKE '%Booking a bundle can reduce your total.%';
