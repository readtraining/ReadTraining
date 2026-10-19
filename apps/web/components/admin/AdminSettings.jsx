"use client";

import React, { useEffect, useRef, useState } from "react";
import { admin as A } from "@/data/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { focusFirstError } from "@/lib/focusFirstError";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { formatWhen, Said } from "./adminParts";
import { RateForm, formatRate } from "./commissionParts";

const copy = A.settings;
const F = A.fees;
// what each fee field accepts: [min, max, whole numbers only]
const LIMITS = { card: [0, 10, false], bnpl: [0, 15, false], payoutDay: [1, 28, true] };

// Financial settings: the platform's default commission (API admin.commission) and the payment fees and payout day (API
// admin.fees), both real and changed with the "fees and commission" switch. New orders take today's rates; existing orders keep
// theirs. The admin team (with each admin's refund limit) and the activity log have their own pages.
export default function AdminSettings() {
  const [said, setSaid] = useState("");
  return (
    <div className="rt-acc__stack">
      <Said text={said} />
      <CommissionCard onSaved={setSaid} />
      <FeesCard onSaved={setSaid} />
    </div>
  );
}

function FeesCard({ onSaved }) {
  const me = useAdminAccess();
  const canEdit = me?.permissions?.includes("finance.settings");
  const current = api.admin.fees.get.useQuery();
  const save = api.admin.fees.set.useMutation();
  const utils = api.useUtils();
  const [v, setV] = useState(null);
  const [errors, setErrors] = useState({});
  const ref = useRef(null);
  useEffect(() => {
    if (current.data && !v) setV({ card: String(current.data.cardPercent), bnpl: String(current.data.bnplPercent), payoutDay: String(current.data.payoutDay) });
  }, [current.data, v]);
  if (!v) return null;
  const err = (k) => errors[k] && <p className="rt-q__err" id={`rt-adm-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>;
  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    Object.entries(LIMITS).forEach(([k, [min, max, whole]]) => {
      const n = v[k].trim();
      const ok = whole ? /^\d+$/.test(n) : /^\d+(\.\d{1,2})?$/.test(n);
      if (!ok || Number(n) < min || Number(n) > max) found[k] = `Enter ${whole ? "a whole number" : "a number"} from ${min} to ${max}.`;
    });
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    try {
      await save.mutateAsync({ cardBps: Math.round(Number(v.card) * 100), bnplBps: Math.round(Number(v.bnpl) * 100), payoutDay: Number(v.payoutDay) });
      await utils.admin.fees.invalidate();
      utils.admin.activity.list.invalidate();
      onSaved(F.saved);
    } catch (err) {
      setErrors(errorsFrom(err).fields);
    }
  };
  return (
    <form className="rt-acc__card rt-adm-fees" onSubmit={submit} noValidate ref={ref}>
      <div>
        <h2 className="rt-acc__h2">{F.title}</h2>
        <p className="rt-acc__note">{F.note}</p>
      </div>
      {!canEdit && <p className="rt-acc__notice">{F.readOnly}</p>}
      <div className="rt-adm-fees__grid">
        {Object.keys(LIMITS).map((k) => (
          <div key={k} className="rt-field">
            <label htmlFor={`rt-adm-${k}`}>{F[k].label}</label>
            <small className="rt-field__hint" id={`rt-adm-${k}-hint`}>{F[k].hint}</small>
            {err(k)}
            <input id={`rt-adm-${k}`} type="text" inputMode="decimal" value={v[k]} readOnly={!canEdit} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} aria-invalid={errors[k] ? true : undefined} aria-describedby={`rt-adm-${k}-hint${errors[k] ? ` rt-adm-${k}-e` : ""}`} className="rt-adm-num" />
          </div>
        ))}
      </div>
      {canEdit && <button type="submit" className="button -md -purple-1 text-white" disabled={save.isPending}>{A.content.save}</button>}
    </form>
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
