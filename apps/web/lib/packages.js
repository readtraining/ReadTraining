// A package of a provider's price plan (lib/catalogueData.js toPackages), read the same way by the server and the browser: whether
// it can be booked online yet (a package that includes a course taught on dates can't be until its date can be chosen, Milestone 4).
export const bookableOnline = (p) => !(p.includes || []).some((a) => a.dated);
