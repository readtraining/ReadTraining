// Places the order. There is no payments or bookings endpoint in apps/api yet, so this only simulates the call (as lib/quote.js does
// for group quotes) and makes up a booking reference. Replace the body with the real request when the endpoint exists; the card
// fields then come from the payment provider's own secure fields (card details never touch our servers). The form already handles
// a rejected promise: an error with `code: "card_declined"` shows the declined message, anything else the general one.
// Demo: the card number 4000 0000 0000 0002 is declined (the payment providers' usual test card for a decline).

export const ORDER_KEY = "rt-order"; // the last paid order, for the confirmation page (this browser tab only)
export const PAY_FAILED_KEY = "rt-pay-failed"; // the last payment that did not go through, until one succeeds
const DECLINE_CARD = "4000000000000002";

export async function placeOrder(order) {
  await new Promise((resolve) => setTimeout(resolve, 900));
  if (order.payment.method === "card" && order.payment.cardNumber === DECLINE_CARD) {
    const err = new Error("card_declined");
    err.code = "card_declined";
    throw err;
  }
  const reference = `RT-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;
  return { reference };
}

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
