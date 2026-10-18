"use client";

import React, { useEffect, useRef, useState } from "react";
import { admin as A } from "@/data/admin";
import { saveFees, useAdmin } from "@/lib/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { focusFirstError } from "@/lib/focusFirstError";
import { api } from "@/lib/trpc/react";
import { formatWhen } from "./adminParts";
import { RateForm, formatRate } from "./commissionParts";

const copy = A.settings;
// what each fee field accepts: [min, max, whole numbers only]
const LIMITS = { card: [0, 10, false], bnpl: [0, 15, false], payoutDay: [1, 28, true], supportLimit: [0, 1000, true] };

// Settings: the platform's default commission (real, API admin.commission; changed with the "fees and commission" switch), then
// the fees and payouts preview (card and Klarna fees, payout day and the Support limit; DEMO until payments), checked and saved
// together. The admin team and the activity log have their own pages (/admin/team, /admin/activity).
export default function AdminSettings() {
  const data = useAdmin();
  const [fees, setFees] = useState(null);
  const [errors, setErrors] = useState({});
  const [said, setSaid] = useState("");
  const feeRef = useRef(null);
  useEffect(() => {
    if (data && !fees) setFees(Object.fromEntries(Object.entries(data.fees).map(([k, v]) => [k, String(v)])));
  }, [data, fees]);
  if (!data || !fees) return null;

  const err = (k) => errors[k] && <p className="rt-q__err" id={`rt-adm-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>;

  const submitFees = (e) => {
    e.preventDefault();
    const found = {};
    Object.entries(LIMITS).forEach(([k, [min, max, whole]]) => {
      const v = fees[k].trim();
      const ok = whole ? /^\d+$/.test(v) : /^\d+(\.\d{1,2})?$/.test(v);
      if (!ok || Number(v) < min || Number(v) > max) found[k] = `Enter ${whole ? "a whole number" : "a number"} from ${min} to ${max}.`;
    });
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(feeRef.current);
    saveFees(Object.fromEntries(Object.entries(fees).map(([k, v]) => [k, Number(v)])), data.fees);
    setSaid(copy.feesSaved);
  };

  return (
    <div className="rt-acc__stack">
      <p className="rt-sr" aria-live="polite">{said}</p>
      <CommissionCard onSaved={setSaid} />

      <form className="rt-acc__card rt-adm-fees" onSubmit={submitFees} noValidate ref={feeRef}>
        <div>
          <h2 className="rt-acc__h2">{copy.feesTitle}</h2>
          <p className="rt-acc__note">{copy.feesNote}</p>
        </div>
        <div className="rt-adm-fees__grid">
          {Object.entries(copy.fees).map(([k, f]) => (
            <div key={k} className="rt-field">
              <label htmlFor={`rt-adm-${k}`}>{f.label}{f.unit && ` (${f.unit})`}</label>
              <small className="rt-field__hint" id={`rt-adm-${k}-hint`}>{f.hint}</small>
              {err(k)}
              <input id={`rt-adm-${k}`} type="text" inputMode="decimal" value={fees[k]} onChange={(e) => setFees((x) => ({ ...x, [k]: e.target.value }))} aria-invalid={errors[k] ? true : undefined} aria-describedby={`rt-adm-${k}-hint${errors[k] ? ` rt-adm-${k}-e` : ""}`} className="rt-adm-num" />
            </div>
          ))}
        </div>
        <button type="submit" className="button -md -purple-1 text-white">Save settings</button>
      </form>
    </div>
  );
}

// The default commission: the rate, how many providers have their own, and (with the switch) the field to change it.
function CommissionCard({ onSaved }) {
  const c = copy.commission;
  const me = useAdminAccess();
  const utils = api.useUtils();
  const rate = api.admin.commission.get.useQuery();
  const save = api.admin.commission.setDefault.useMutation();
  if (!rate.data) return null;
  const { defaultBps, changedAt, ownRates } = rate.data;
  return (
    <section className="rt-acc__card" aria-labelledby="rt-adm-com-h">
      <div className="rt-acc__cardhead">
        <h2 className="rt-acc__h2" id="rt-adm-com-h">{c.title}</h2>
        <strong className="rt-adm-price">{formatRate(defaultBps)}</strong>
      </div>
      <p className="rt-acc__note">{ownRates ? c.own.replace("{n}", ownRates === 1 ? "1 provider" : `${ownRates} providers`) : c.none}{changedAt ? ` · ${c.changed.replace("{when}", formatWhen(Date.parse(changedAt)))}` : ""}</p>
      {me?.permissions?.includes("finance.settings") ? (
        <RateForm id="rt-adm-comdef" label={c.label} hint={c.hint} bps={defaultBps} saving={save.isPending} save={(bps) => save.mutateAsync({ bps })} onSaved={() => { onSaved(c.saved); utils.admin.commission.invalidate(); utils.admin.providers.invalidate(); }} />
      ) : <p className="rt-acc__notice rt-adm-mt">{c.readOnly}</p>}
    </section>
  );
}
