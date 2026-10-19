// The money maths (Part B, B4), as Hurak does it: the payment fee comes off the gross first, ReadTraining's commission is a
// share of what is left (the net), and the provider keeps the rest. Whole pence throughout; rounding is half up, and the
// provider's part is always worked out last so the three parts add up to the gross exactly.
// Rates are basis points: 300 = 3%, 3000 = 30%.

export type Split = { grossPence: number; feePence: number; commissionPence: number; providerPence: number }

const part = (pence: number, bps: number) => Math.round((pence * bps) / 10000)

// A purchase: gross → fee, commission, provider.
export function splitOf(grossPence: number, feeBps: number, commissionBps: number): Split {
  const feePence = part(grossPence, feeBps)
  const commissionPence = part(grossPence - feePence, commissionBps)
  return { grossPence, feePence, commissionPence, providerPence: grossPence - feePence - commissionPence }
}

// Giving back `amountPence` of an order (a refund, a cancellation, a lost dispute): the same split as the order, worked out on
// the amount, as negative numbers. A full amount reverses the purchase exactly (no rounding drift), even after part refunds:
// what has already been given back is passed in `already` and the last piece takes whatever is left.
export function reversalOf(order: Split, amountPence: number, already: Split = { grossPence: 0, feePence: 0, commissionPence: 0, providerPence: 0 }): Split {
  const left = { gross: order.grossPence + already.grossPence, fee: order.feePence + already.feePence, commission: order.commissionPence + already.commissionPence }
  if (amountPence > left.gross) throw new RangeError('more than is left to give back')
  const fee = amountPence === left.gross ? left.fee : Math.min(left.fee, Math.round((order.feePence * amountPence) / order.grossPence))
  const commission = amountPence === left.gross ? left.commission : Math.min(left.commission, Math.round((order.commissionPence * amountPence) / order.grossPence))
  return { grossPence: -amountPence, feePence: -fee, commissionPence: -commission, providerPence: -(amountPence - fee - commission) }
}

// What a provider can be paid now: their ledger balance, less what is held back for open refund requests and disputes on their
// orders (the provider's share of each, as it would be reversed). Never below zero.
export function payable(balancePence: number, heldPence: number) {
  return Math.max(0, balancePence - heldPence)
}

export const pounds = (pence: number) => (pence / 100).toFixed(2)
