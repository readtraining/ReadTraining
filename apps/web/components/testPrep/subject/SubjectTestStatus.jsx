"use client";

import React, { useEffect, useState } from "react";
import { isSettled, readFinished, readProgress } from "@/components/testPrep/runner/attemptStore";
import { testPrepPage } from "@/data/testPrep";

// The reader's own progress on one test, from the attempts the test runner already keeps on this device: "In progress" while
// an attempt is open, "Completed" once one has been finished. Read after the page has loaded (storage only exists in the
// browser), so the server HTML and the first render match; nothing shows when there is no attempt.
export default function SubjectTestStatus({ subject, test }) {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    const p = readProgress(subject, test);
    const done = readFinished(subject, test);
    if (p && !isSettled(p, done)) setStatus("progress"); // a finished attempt whose result page has not opened yet counts as done
    else if (done) setStatus("done");
  }, [subject, test]);
  if (!status) return null;
  const labels = testPrepPage.subject.status;
  return <span className={`rt-pill rt-tps__status -${status}`}>{labels[status]}</span>;
}
