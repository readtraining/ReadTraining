// Checkout rules. The order is placed through the checkout switch in lib/forms.js (the payment milestone): the card fields then
// come from the payment provider's own secure fields (card details never touch our servers); an error with
// `code: "card_declined"` shows the declined message, anything else the general one.

export const ORDER_KEY = "rt-order"; // the last paid order, for the confirmation page (this browser tab only)
export const PAY_FAILED_KEY = "rt-pay-failed"; // the last payment that did not go through, until one succeeds
// Card number checks: digits only, 13 to 19 long, and the Luhn checksum every card number carries.
export function validCardNumber(digits) {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

// "MM / YY", not in the past.
export function validExpiry(value) {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(value.trim());
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

// UK postcodes: the outward and inward parts, the space optional.
export const validPostcode = (value) => /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(value.trim());
