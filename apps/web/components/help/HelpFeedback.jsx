"use client";

import React, { useState } from "react";
import { trackEvent } from "@/lib/analytics";

// "Was this article helpful?" Yes / No after an article: records the answer as an analytics event (lib/analytics.js) and
// thanks the reader. `text` is { question, yes, no, thanks }.
export default function HelpFeedback({ article, text }) {
  const [answer, setAnswer] = useState(null);
  const send = (helpful) => {
    setAnswer(helpful);
    trackEvent("help_article_feedback", { article, helpful });
  };
  return (
    <div className="rt-help__feedback">
      {answer === null ? (
        <>
          <p className="rt-help__feedback-q" id="rt-help-feedback-q">{text.question}</p>
          <div className="rt-help__feedback-actions" role="group" aria-labelledby="rt-help-feedback-q">
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => send(true)}>{text.yes}</button>
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => send(false)}>{text.no}</button>
          </div>
        </>
      ) : (
        <p className="rt-help__feedback-q" role="status">{text.thanks}</p>
      )}
    </div>
  );
}
