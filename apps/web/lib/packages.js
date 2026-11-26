// A package of a provider's price plan (lib/catalogueData.js toPackages), read the same way by the server and the browser:
// what it includes (the provider's other courses in its price, and first aid set on its own on a plan from before) and whether it can be booked
// online yet (a package that includes a course taught on dates can't be until its date can be chosen, Milestone 4).
export const includedOf = (p) => [...(p.includes || []), ...(p.firstAid && !(p.includes || []).some((a) => a.firstAid) ? [{ id: "first-aid", name: "Emergency First Aid at Work", course: null }] : [])];
export const bookableOnline = (p) => !(p.includes || []).some((a) => a.dated);
