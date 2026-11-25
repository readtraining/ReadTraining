-- The course guide (course_guides) held three things every course has: the line above the syllabus, the text above the exam
-- table and one more exam column, matched to the exam rows by retyping each unit's name. They are now the course's own fields
-- (migration 0050: courses.syllabus_intro, courses.exams_intro, course_exams.assessment), so this moves each guide's values into
-- them and takes them out of the guide. It also makes the guide point at the two things now kept once for the whole site (Site
-- content): the team training section ("business": true, the words are the key teamTraining) and the licence fee in a cost table
-- (licenceFee.fee names one of the key licenceFees; every guide saved so far is an SIA page at the SIA's £204). An empty
-- database has no guides, so nothing happens there.

-- the syllabus intro and the exam table's intro, where the course has none of its own yet
UPDATE "public"."courses" c
SET "syllabus_intro" = nullif(btrim(g."content"->>'unitsIntro'), '')
FROM "public"."course_guides" g
WHERE g."course_id" = c."id" AND c."syllabus_intro" IS NULL AND g."content" ? 'unitsIntro';
--> statement-breakpoint
UPDATE "public"."courses" c
SET "exams_intro" = nullif(btrim(g."content"->'exams'->>'intro'), '')
FROM "public"."course_guides" g
WHERE g."course_id" = c."id" AND c."exams_intro" IS NULL AND jsonb_typeof(g."content"->'exams') = 'object' AND g."content"->'exams' ? 'intro';
--> statement-breakpoint

-- each exam row's assessment, matched by its unit's name as the course page matched it (case, spaces and punctuation aside). The
-- column was "Questions" unless the guide named another: a number of questions becomes "72 multiple-choice questions", and a dash
-- (a practical with no questions) becomes "Practical assessment" on a practical row and nothing on any other.
UPDATE "public"."course_exams" e
SET "assessment" = m."assessment"
FROM (
  SELECT g."course_id",
         btrim(regexp_replace(lower(x->>'unit'), '[^a-z0-9]+', ' ', 'g')) AS k,
         CASE
           WHEN btrim(x->>'value') ~ '^[0-9]+$' AND lower(coalesce(nullif(btrim(g."content"->'exams'->>'column'), ''), 'Questions')) = 'questions'
             THEN btrim(x->>'value') || ' multiple-choice questions'
           WHEN btrim(x->>'value') IN ('—', '–', '-', '')
             THEN CASE WHEN lower(x->>'unit') LIKE 'practical%' THEN 'Practical assessment' END
           ELSE btrim(x->>'value')
         END AS "assessment"
  FROM "public"."course_guides" g
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(g."content"->'exams'->'units') = 'array' THEN g."content"->'exams'->'units' ELSE '[]'::jsonb END) x
) m
WHERE e."course_id" = m."course_id" AND e."assessment" IS NULL AND btrim(regexp_replace(lower(e."unit"), '[^a-z0-9]+', ' ', 'g')) = m.k;
--> statement-breakpoint

-- the guides without those three, with the team training section as a switch and the licence fee as one of the site's fees
UPDATE "public"."course_guides"
SET "content" = "content" - 'unitsIntro' - 'exams', "updated_at" = now()
WHERE "content" ?| array['unitsIntro', 'exams'];
--> statement-breakpoint
UPDATE "public"."course_guides"
SET "content" = jsonb_set("content", '{business}', 'true'::jsonb), "updated_at" = now()
WHERE jsonb_typeof("content"->'business') = 'object';
--> statement-breakpoint
UPDATE "public"."course_guides"
SET "content" = jsonb_set("content", '{costs,licenceFee}', jsonb_build_object('label', "content"->'costs'->'licenceFee'->'label', 'fee', 'sia')), "updated_at" = now()
WHERE jsonb_typeof("content"->'costs'->'licenceFee') = 'object' AND ("content"->'costs'->'licenceFee'->>'amount') = '204';
