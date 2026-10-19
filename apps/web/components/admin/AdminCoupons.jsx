"use client";

import React, { useEffect, useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { Choice } from "@/components/providerWorkspace/providerParts";
import { EmptyState, ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { useAdmin } from "@/lib/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatDate, formatPrice } from "@/lib/format";
import { useTaxonomy } from "@/lib/taxonomyContext";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { RowMenu, Said, Search, TableSkeleton, Tabs, useSort, SortTh, getQuery } from "./adminParts";
import { describedBy, field } from "./contentParts";
import DateField from "./DateField";
import { AdminStatus, AdminTag } from "./AdminStatus";

const copy = A.coupons;
const f = copy.fields;
const TABS = Object.keys(copy.tabs);
const BLANK = { code: "", kind: "percent", value: "", startsOn: "", endsOn: "", usageLimit: "", scope: "all", categories: [], courses: [] };

export const discountText = (c) => (c.kind === "percent" ? `${c.value}% off` : `${formatPrice(c.value)} off`);
const appliesText = (c) =>
  c.scope === "all" ? copy.everything
    : c.scope === "categories" ? (c.categories.length === 1 ? copy.oneCategory : copy.categories.replace("{n}", c.categories.length))
    : c.courses.length === 1 ? copy.oneCourse : copy.courses.replace("{n}", c.courses.length);
const datesText = (c) =>
  c.startsOn && c.endsOn ? copy.between.replace("{from}", formatDate(c.startsOn)).replace("{to}", formatDate(c.endsOn))
    : c.startsOn ? copy.from.replace("{date}", formatDate(c.startsOn))
    : c.endsOn ? copy.until.replace("{date}", formatDate(c.endsOn))
    : copy.always;

// what each sortable column sorts by
const COUPON_SORT = { code: (x) => x.code, discount: (x) => (x.kind === "percent" ? x.value : x.value / 1000), dates: (x) => x.endsOn || x.startsOn, used: (x) => x.used, status: (x) => x.status };

// Coupons (Part B, B3): the real list (API admin.coupons), by status with counts, searchable by code. With the "coupons" switch an
// admin creates one, edits it, or turns it off and on again (never deletes it). Checkout (still demo) applies them once payments
// are real, so "Used" stays at 0 until then.
export default function AdminCoupons() {
  const me = useAdminAccess();
  const canEdit = me?.permissions?.includes("coupons");
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [sheet, setSheet] = useState(null); // null, or { coupon } (undefined coupon = a new one)
  const [said, setSaid] = useState("");
  const sorter = useSort();
  const utils = api.useUtils();
  const setActive = api.admin.coupons.setActive.useMutation();
  // a coupon opened from the admin search arrives with its code (?q=)
  useEffect(() => {
    const code = getQuery("q");
    if (code) setQ(code);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const list = api.admin.coupons.list.useQuery({ q: search || undefined, status: tab === "all" ? undefined : tab }, { placeholderData: (prev) => prev });

  const toggle = async (c) => {
    try {
      await setActive.mutateAsync({ id: c.id, active: c.status === "off" });
      await utils.admin.coupons.invalidate();
      utils.admin.activity.list.invalidate();
      setSaid((c.status === "off" ? copy.turnedOn : copy.turnedOff).replace("{code}", c.code));
    } catch (err) {
      setSaid(errorsFrom(err).general);
    }
  };
  const counts = list.data?.counts;
  const total = counts ? counts.live + counts.scheduled + counts.ended + counts.off : undefined;
  const rows = sorter.apply(list.data?.coupons ?? [], COUPON_SORT);
  const c = copy.columns;

  return (
    <div className="rt-acc__stack">
      <Said text={said} />
      <div className="rt-adm-toolbar">
        <Tabs tabs={TABS.map((key) => ({ key, label: copy.tabs[key], count: key === "all" ? total : counts?.[key] }))} value={tab} onChange={setTab} label="Show coupons" />
        <div className="rt-adm-toolbar__end">
          <Search value={q} onChange={setQ} label={copy.search} />
          {canEdit && <button type="button" className="button -md -purple-1 text-white" onClick={() => setSheet({})}>{copy.add}</button>}
        </div>
      </div>
      {!canEdit && <p className="rt-acc__notice">{copy.readOnly}</p>}

      {list.error ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.isLoading ? (
        <TableSkeleton rows={4} />
      ) : rows.length ? (
        <div className="rt-acc__card rt-biz__tablecard" aria-busy={list.isFetching}>
          <table className="rt-biz__table rt-adm-table">
            <thead><tr><SortTh label={c.code} col="code" sorter={sorter} /><SortTh label={c.discount} col="discount" sorter={sorter} numeric /><th scope="col">{c.applies}</th><SortTh label={c.dates} col="dates" sorter={sorter} /><SortTh label={c.used} col="used" sorter={sorter} numeric /><SortTh label={c.status} col="status" sorter={sorter} />{canEdit && <th scope="col"><span className="rt-sr">Actions</span></th>}</tr></thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id}>
                  <td data-label={c.code}><AdminTag code>{x.code}</AdminTag>{x.createdBy && <small>{x.createdBy}</small>}</td>
                  <td data-label={c.discount}>{discountText(x)}</td>
                  <td data-label={c.applies}>{appliesText(x)}</td>
                  <td data-label={c.dates}>{datesText(x)}</td>
                  <td data-label={c.used}>{x.usageLimit ? copy.of.replace("{used}", x.used).replace("{limit}", x.usageLimit) : copy.unlimited.replace("{used}", x.used)}</td>
                  <td data-label={c.status}><AdminStatus kind="coupon" status={x.status}>{copy.statuses[x.status]}</AdminStatus></td>
                  {canEdit && (
                    <td data-label="Actions">
                      <RowMenu label={`Actions for ${x.code}`} items={[{ label: copy.edit, onClick: () => setSheet({ coupon: x }) }, { label: x.status === "off" ? copy.turnOn : copy.turnOff, onClick: () => toggle(x), danger: x.status !== "off" }]} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : search || tab !== "all" ? (
        <EmptyState title={copy.none} action={search ? { label: copy.clear, onClick: () => setQ("") } : undefined} />
      ) : (
        <EmptyState icon="icon-coupon" title={copy.empty} text={copy.emptyText} action={canEdit ? { label: copy.add, onClick: () => setSheet({}) } : undefined} />
      )}
      {rows.length > 0 && <p className="rt-acc__note">{copy.usedNote}</p>}

      <Sheet open={Boolean(sheet)} onClose={() => setSheet(null)} title={sheet?.coupon ? copy.sheet.edit : copy.sheet.add} closeLabel="Close">
        {sheet && <CouponForm coupon={sheet.coupon} onDone={(message) => { setSheet(null); setSaid(message); }} />}
      </Sheet>
    </div>
  );
}

function CouponForm({ coupon, onDone }) {
  const taxonomy = useTaxonomy();
  const data = useAdmin();
  const utils = api.useUtils();
  const create = api.admin.coupons.create.useMutation();
  const update = api.admin.coupons.update.useMutation();
  const [v, setV] = useState(() => (coupon ? { ...coupon, value: String(coupon.value), startsOn: coupon.startsOn ?? "", endsOn: coupon.endsOn ?? "", usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "" } : BLANK));
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [find, setFind] = useState("");
  const ref = useRef(null);
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const pick = (k, item) => setV((x) => ({ ...x, [k]: x[k].includes(item) ? x[k].filter((y) => y !== item) : [...x[k], item] }));
  const courses = data?.catalogue ?? [];
  const needle = find.trim().toLowerCase();
  const shownCourses = courses.filter((x) => v.courses.includes(x.id) || (needle && x.title.toLowerCase().includes(needle))).slice(0, 40);

  const submit = async (e) => {
    e.preventDefault();
    setGeneral("");
    const found = {};
    const code = v.code.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9-]{2,29}$/.test(code)) found.code = "Enter 3 to 30 letters, numbers or hyphens, starting with a letter or number.";
    const value = Number(v.value);
    if (v.kind === "percent" ? !/^\d{1,3}$/.test(v.value.trim()) || value < 1 || value > 100 : !/^\d+(\.\d{1,2})?$/.test(v.value.trim()) || value <= 0 || value > 100000) {
      found.value = v.kind === "percent" ? f.value.percentHint : "Enter an amount in pounds and pence, like 20 or 12.50.";
    }
    if (v.startsOn && v.endsOn && v.endsOn < v.startsOn) found.endsOn = "The last day must be on or after the first day.";
    if (v.usageLimit.trim() && !/^\d+$/.test(v.usageLimit.trim())) found.usageLimit = "Enter a whole number, or leave it empty for no limit.";
    if (v.scope === "categories" && !v.categories.length) found.categories = "Choose at least one category.";
    if (v.scope === "courses" && !v.courses.length) found.courses = "Choose at least one course.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    const input = { code, kind: v.kind, value, startsOn: v.startsOn || null, endsOn: v.endsOn || null, usageLimit: v.usageLimit.trim() ? Number(v.usageLimit) : null, scope: v.scope, categories: v.categories, courses: v.courses };
    try {
      if (coupon) await update.mutateAsync({ ...input, id: coupon.id });
      else await create.mutateAsync(input);
      await utils.admin.coupons.invalidate();
      utils.admin.activity.list.invalidate();
      onDone((coupon ? copy.updated : copy.created).replace("{code}", code));
    } catch (err) {
      const { fields, general: g } = errorsFrom(err);
      setErrors(fields);
      setGeneral(g);
      if (Object.keys(fields).length) focusFirstError(ref.current);
    }
  };
  const input = (k, props = {}) => (
    <input id={`rt-cp-${k}`} value={v[k]} onChange={set(k)} aria-invalid={errors[k] ? true : undefined} aria-describedby={describedBy(`rt-cp-${k}`, f[k]?.hint, errors[k])} {...props} />
  );

  return (
    <form className="rt-q__form rt-biz__sheetform rt-adm-couponform" onSubmit={submit} noValidate ref={ref}>
      {field("rt-cp-code", f.code.label, f.code.hint, errors.code, input("code", { type: "text", autoCapitalize: "characters", spellCheck: false, className: "rt-adm-coupon-input" }))}
      <Choice name="rt-cp-kind" legend={f.kind.label} value={v.kind} onChange={(k) => setV((x) => ({ ...x, kind: k }))} options={[{ value: "percent", label: f.kind.percent }, { value: "amount", label: f.kind.amount }]} />
      {field("rt-cp-value", f.value[v.kind], v.kind === "percent" ? f.value.percentHint : f.value.amountHint, errors.value, (
        <input id="rt-cp-value" type="text" inputMode="decimal" className="rt-adm-num" value={v.value} onChange={set("value")} aria-invalid={errors.value ? true : undefined} aria-describedby={describedBy("rt-cp-value", true, errors.value)} />
      ))}
      <div className="rt-adm-couponform__two">
        {field("rt-cp-startsOn", f.startsOn.label, f.startsOn.hint, errors.startsOn, <DateField id="rt-cp-startsOn" clearable value={v.startsOn} onChange={(d) => setV((x) => ({ ...x, startsOn: d }))} invalid={Boolean(errors.startsOn)} describedBy={describedBy("rt-cp-startsOn", f.startsOn.hint, errors.startsOn)} />)}
        {field("rt-cp-endsOn", f.endsOn.label, f.endsOn.hint, errors.endsOn, <DateField id="rt-cp-endsOn" clearable min={v.startsOn || undefined} value={v.endsOn} onChange={(d) => setV((x) => ({ ...x, endsOn: d }))} invalid={Boolean(errors.endsOn)} describedBy={describedBy("rt-cp-endsOn", f.endsOn.hint, errors.endsOn)} />)}
      </div>
      {field("rt-cp-usageLimit", f.usageLimit.label, f.usageLimit.hint, errors.usageLimit, input("usageLimit", { type: "text", inputMode: "numeric", className: "rt-adm-num" }))}
      <Choice name="rt-cp-scope" legend={f.scope.label} value={v.scope} onChange={(k) => setV((x) => ({ ...x, scope: k }))} options={["all", "categories", "courses"].map((k) => ({ value: k, label: f.scope[k] }))} />
      {v.scope === "categories" && (
        <fieldset className="rt-field" aria-describedby={errors.categories ? "rt-cp-categories-e" : undefined}>
          <legend>{f.categories.label}</legend>
          {errors.categories && <p className="rt-q__err" id="rt-cp-categories-e"><span className="rt-sr">Error: </span>{errors.categories}</p>}
          <div className="rt-adm-couponform__checks" id="rt-cp-categories">
            {taxonomy.categories.filter((x) => x.active !== false).map((x) => (
              <label key={x.slug} className="rt-bk__check"><input type="checkbox" checked={v.categories.includes(x.slug)} onChange={() => pick("categories", x.slug)} />{x.name}</label>
            ))}
          </div>
        </fieldset>
      )}
      {v.scope === "courses" && (
        <fieldset className="rt-field" aria-describedby={errors.courses ? "rt-cp-courses-e" : undefined}>
          <legend>{f.courses.label}</legend>
          <small className="rt-field__hint">{f.courses.hint} {v.courses.length > 0 && f.courses.picked.replace("{n}", v.courses.length)}</small>
          {errors.courses && <p className="rt-q__err" id="rt-cp-courses-e"><span className="rt-sr">Error: </span>{errors.courses}</p>}
          <input id="rt-cp-courses" type="search" placeholder={f.courses.search} aria-label={f.courses.search} value={find} onChange={(e) => setFind(e.target.value)} />
          <div className="rt-adm-couponform__checks -courses">
            {shownCourses.map((x) => (
              <label key={x.id} className="rt-bk__check"><input type="checkbox" checked={v.courses.includes(x.id)} onChange={() => pick("courses", x.id)} />{x.title}</label>
            ))}
          </div>
        </fieldset>
      )}
      {general && <p className="rt-q__err rt-acc__formerr" role="alert">{general}</p>}
      <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={create.isPending || update.isPending}>{coupon ? copy.sheet.save : copy.sheet.create}</button>
    </form>
  );
}
