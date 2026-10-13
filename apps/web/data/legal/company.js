import { topBar } from "@/data/home";

// The trader details UK law asks a website to show (Electronic Commerce Regulations 2002, reg 6): legal name, registered
// number and office, VAT number and contact details. Values in [brackets] are placeholders until ReadTraining's details are
// supplied; the contact details are the ones the site shows in its top bar. An empty value is not shown.
export const company = {
  name: "[Company legal name] Ltd",
  tradingName: "ReadTraining",
  number: "[Company number]",
  register: "Registered in England and Wales",
  office: "[Registered office address]",
  vat: "[VAT number]",
  email: topBar.email,
  phone: topBar.phone,
  hours: topBar.hours,
};
