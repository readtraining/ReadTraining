"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatDate } from "@/lib/format";
import { businessAccount as biz } from "@/data/businessAccount";

// Download a learner's certificate (as Hurak's Business account does). There is no certificate file yet, so the certificate is drawn
// as an A4 page and the browser's print window opens, where "Save as PDF" downloads it. The page is hidden on screen and is the
// only thing printed while it is open. `download(cert)` takes a certificate from getBusiness().certificates.
export function useCertificateDownload() {
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
  return { download: setCert, page };
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

// The download arrow (certificates and invoices)
export const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" />
  </svg>
);

// The Download button beside a certificate (a download icon and a short word; `label` "Download" in a table, the full
// "Download certificate" where the button stands alone).
export function DownloadCertificate({ cert, onDownload, label = biz.learners.download }) {
  return (
    <button type="button" className="fb-textlink rt-biz__linkbtn rt-biz__download" onClick={() => onDownload(cert)}>
      <DownloadIcon />
      {label}<span className="rt-sr"> for {cert.learner}, {cert.title}</span>
    </button>
  );
}
