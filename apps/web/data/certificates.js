// Dummy certificate records for the certificate checker (/certificate-checker), read only through lib/certificates.js, which
// will call the API when it exists. `expires` is null for a certificate with no expiry date.
export const certificates = [
  {
    number: "RT-2026-004815",
    name: "Oliver Desuza",
    course: "SIA Door Supervisor Course",
    qualification: "Level 2 Award for Door Supervisors in the Private Security Industry",
    awardingBody: "Highfield Qualifications",
    provider: "Apex Training",
    issued: "2026-03-14",
    expires: null,
  },
  {
    number: "RT-2025-010342",
    name: "Laxley Lamley",
    course: "Emergency First Aid at Work",
    qualification: "Level 3 Award in Emergency First Aid at Work",
    awardingBody: "Qualsafe Awards",
    provider: "Northgate Learning",
    issued: "2025-11-20",
    expires: "2028-11-20",
  },
  {
    number: "RT-2023-001207",
    name: "Arton Asllani",
    course: "Fire Warden & Fire Marshal Course",
    qualification: "Level 2 Award in Fire Safety",
    awardingBody: "Highfield Qualifications",
    provider: "BrightPath Academy",
    issued: "2023-05-02",
    expires: "2026-05-02",
  },
];
