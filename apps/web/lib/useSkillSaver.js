"use client";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/lib/auth/authClient";
import { getLearning } from "@/lib/account";
import { skillSaverStatus } from "@/lib/skillSaver";

// The end dates of the courses this learner has completed. DEMO: read from the account's bookings in the browser
// (lib/account.js); with a backend the learner's level comes from the server instead.
export const completedCourseDates = () => getLearning().filter((l) => l.state === "completed").map((l) => l.endDate || l.date);

// The signed-in learner's Skill Saver level (lib/skillSaver.js skillSaverStatus): undefined while it is being worked out,
// null when nobody is signed in. The basket and the checkout use it for the discount.
export function useSkillSaver() {
  const person = useAuthUser();
  const [dates, setDates] = useState(null);
  useEffect(() => {
    setDates(completedCourseDates());
  }, []);
  if (person === undefined || dates === null) return undefined;
  return person ? skillSaverStatus(dates, true) : null;
}
