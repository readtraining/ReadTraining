// The certificate checker's number format. The check itself goes through the certificate switch in lib/forms.js (the server
// matches the number and the holder's surname, so a number alone shows nothing).

// RT-2026-004815: "RT", the year of issue, six digits. Spaces are ignored, dashes are optional and letters may be lower case.
export const CERT_EXAMPLE = "RT-2026-004815";
export const normaliseCertNumber = (value) => {
  const m = value.replace(/\s+/g, "").toUpperCase().match(/^RT-?(\d{4})-?(\d{6})$/);
  return m ? `RT-${m[1]}-${m[2]}` : null;
};
