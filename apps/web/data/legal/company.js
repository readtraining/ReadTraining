import { topBar } from "@/data/home";

// The trader details UK law asks a website to show (Electronic Commerce Regulations 2002, reg 6): legal name, registered
// number and office, VAT number and contact details. The legal name is the client's (docs/project website.docx); values in
// [brackets] are placeholders until the rest are supplied; the contact details are the ones the site shows in its top bar. An empty value is not shown.
export const company = {
  name: "Read Education Services Limited",
  tradingName: "ReadTraining",
  number: "[Company number]",
  register: "Registered in England and Wales",
  office: "[Registered office address]",
  vat: "[VAT number]",
  email: topBar.email,
  phone: topBar.phone,
  hours: topBar.hours,
};
