"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Sheet from "@/components/testPrep/runner/Sheet";
import { pw } from "@/data/providerWorkspace";
import { createCourse } from "@/lib/providerWorkspace";

// Step one of a new course: how it is delivered. Three large choices (on set dates, live online, on demand), each with "Learn more"
// in a side panel. Choosing one creates a draft and opens the course editor on its Description tab.
export default function ProviderNewCourse() {
  const router = useRouter();
  const [more, setMore] = useState(null);
  const [busy, setBusy] = useState("");
  const info = pw.formats.find((f) => f.key === more);

  const choose = (key) => {
    setBusy(key);
    const id = createCourse(key);
    router.push(`/provider/courses/${id}?tab=description`);
  };

  return (
    <div className="rt-acc__stack">
      <h2 className="rt-acc__h2 rt-pws-course-q">What is the format of your course?</h2>
      <ul className="rt-pws-course-formats">
        {pw.formats.map((f) => (
          <li key={f.key} className="rt-acc__card rt-pws-course-format">
            <span className="rt-benefit__icon" aria-hidden="true"><i className={`${f.icon} text-20`}></i></span>
            <h3 className="rt-pws-course-format__title">{f.label}</h3>
            <p className="rt-acc__note">{f.text}</p>
            <div className="rt-pws-course-format__actions">
              <button type="button" className="button -sm -purple-1 text-white" onClick={() => choose(f.key)} disabled={Boolean(busy)} aria-busy={busy === f.key ? "true" : undefined}>
                {busy === f.key ? "Creating…" : "Choose"}<span className="rt-sr"> {f.label}</span>
              </button>
              <button type="button" className="fb-textlink rt-pws-course-linkbtn" onClick={() => setMore(f.key)}>Learn more<span className="rt-sr"> about {f.label}</span></button>
            </div>
          </li>
        ))}
      </ul>
      <p className="rt-acc__note">You can add more ways to take the course later, in the course&apos;s Settings, as long as nobody has booked it yet.</p>

      <Sheet open={Boolean(info)} onClose={() => setMore(null)} title={info?.label || ""} closeLabel="Close">
        {info && (
          <div className="rt-q__form">
            <p className="rt-acc__note">{info.text}</p>
            <p>{info.more}</p>
            <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={() => choose(info.key)} disabled={Boolean(busy)} aria-busy={busy ? "true" : undefined}>{busy ? "Creating…" : "Choose this format"}</button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
