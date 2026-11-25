-- A shared course page lists every provider's dates, so its guide holds only what is true whichever provider runs the course.
-- The packages in the guides (the client's own offer as a provider: "Course + first aid", bundles with another course) were
-- added to every provider's dates on the page; packages are each provider's own now (its price plans), so they come out of the
-- guides. The cost table's first aid row keeps its label: its price is now the lowest live price of Emergency First Aid at Work,
-- worked out by the course page, so the typed one ("from") comes out too. An empty database has no guides: nothing happens.
UPDATE "public"."course_guides"
SET "content" = "content" - 'packages', "updated_at" = now()
WHERE "content" ? 'packages';
--> statement-breakpoint
UPDATE "public"."course_guides"
SET "content" = jsonb_set("content", '{costs,firstAid}', ("content"->'costs'->'firstAid') - 'from'), "updated_at" = now()
WHERE jsonb_typeof("content"->'costs'->'firstAid') = 'object' AND "content"->'costs'->'firstAid' ? 'from';
