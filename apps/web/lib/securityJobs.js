// Security Jobs application rules. The application is sent through the jobs switch in lib/forms.js.

// An SIA licence number: 16 digits (spaces are ignored).
export const validLicenceNumber = (value) => /^\d{16}$/.test(value.replace(/\s+/g, ""));
