ALTER TABLE "profiles" ADD COLUMN "welcome_sent_at" timestamp with time zone;--> statement-breakpoint
-- Accounts confirmed before the welcome email existed count as welcomed, so nobody gets one out of the blue on their next
-- sign-in. (A fresh project has no accounts yet, so this changes nothing there.)
UPDATE public.profiles p SET welcome_sent_at = p.created_at FROM auth.users u WHERE u.id = p.id AND u.email_confirmed_at IS NOT NULL;
