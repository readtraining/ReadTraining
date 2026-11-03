"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatDate } from "@/lib/format";
import { businessAccount as biz } from "@/data/businessAccount";

// Print a learner's certificate. There is no certificate file yet, so the certificate is drawn as an A4 page and the browser's print
// window opens (where "Save as PDF" keeps a copy); so the button says Print, not Download. The page is hidden on screen and is the
// only thing printed while it is open. `print(cert)` takes a certificate from getBusiness().certificates.
export function useCertificatePrint() {
  const [cert, setCert] = useState(null);
  useEffect(() => {
    if (!cert) return;
    const done = () => setCert(null);
    window.addEventListener("afterprint", done, { once: true });
    // print once the certificate is on the page
    const frame = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", done);
    };
  }, [cert]);
  const page = cert ? createPortal(<CertificatePage cert={cert} />, document.body) : null;
  return { print: setCert, page };
}

function CertificatePage({ cert }) {
  return (
    <div className="rt-certdoc" aria-hidden="true">
      <div className="rt-certdoc__frame">
        <p className="rt-certdoc__brand">ReadTraining</p>
        <p className="rt-certdoc__kicker">Certificate of achievement</p>
        <p className="rt-certdoc__line">This is to certify that</p>
        <p className="rt-certdoc__name">{cert.learner}</p>
        <p className="rt-certdoc__line">has successfully completed</p>
        <p className="rt-certdoc__course">{cert.title}</p>
        {cert.provider && <p className="rt-certdoc__line">delivered by {cert.provider}</p>}
        <dl className="rt-certdoc__facts">
          <div><dt>Certificate number</dt><dd>{cert.number}</dd></div>
          <div><dt>Issue date</dt><dd>{formatDate(cert.issued)}</dd></div>
          <div><dt>Expiry date</dt><dd>{formatDate(cert.expires)}</dd></div>
        </dl>
        <p className="rt-certdoc__check">Check this certificate at readtraining.co.uk/certificate-checker</p>
      </div>
    </div>
  );
}

// The printer (certificates and receipts)
export const PrintIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9V3h12v6" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><path d="M6 14h12v7H6z" />
  </svg>
);

// The Print button beside a certificate (a printer icon and a short word; `label` "Print" in a table, the full "Print certificate"
// where the button stands alone).
export function PrintCertificate({ cert, onPrint, label = biz.learners.print }) {
  return (
    <button type="button" className="fb-textlink rt-biz__linkbtn rt-biz__print" onClick={() => onPrint(cert)}>
      <PrintIcon />
      {label}<span className="rt-sr"> for {cert.learner}, {cert.title}</span>
    </button>
  );
}
