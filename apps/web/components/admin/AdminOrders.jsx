"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sheet from "@/components/testPrep/runner/Sheet";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { Choice } from "@/components/providerWorkspace/providerParts";
import { EmptyState, ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { useAdmin } from "@/lib/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatDate, formatPrice } from "@/lib/format";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { Pager, Search, SortTh, TableSkeleton, Tabs, formatWhen, usePaging } from "./adminParts";
import { describedBy, field } from "./contentParts";
import { toPence, useMoneyRefresh } from "./moneyParts";
import DateField from "./DateField";
import { AdminStatus } from "./AdminStatus";

const copy = A.orders;
const TABS = Object.keys(copy.tabs);

// Orders and bookings (Part B, B4): every real order (API admin.orders.list), newest first, by status with counts, searchable,
// a page at a time. With the "book for a customer" switch an admin books by invoice or payment link (or free, with that
// switch), as Hurak's staff do for phone sales; the order opens straight away.
export default function AdminOrders() {
  const me = useAdminAccess();
  const canBook = me?.permissions?.includes("orders.book");
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [booking, setBooking] = useState(false);
  const paging = usePaging({ key: "booked", dir: -1 });
  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const pick = (t) => {
    setTab(t);
    paging.restart();
  };
  const list = api.admin.orders.list.useQuery({ q: search || undefined, status: tab === "all" ? undefined : tab, ...paging.input }, { enabled: paging.ready, placeholderData: (prev) => prev });
  const counts = list.data?.counts;
  const rows = list.data?.orders ?? [];
  const s = paging.sorter;
  const c = copy.columns;

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={TABS.map((key) => ({ key, label: copy.tabs[key], count: counts?.[key] }))} value={tab} onChange={pick} label="Show orders" />
        <div className="rt-adm-toolbar__end">
          <Search value={q} onChange={(v) => { setQ(v); paging.restart(); }} label={copy.search} />
          {canBook && <button type="button" className="button -md -purple-1 text-white" onClick={() => setBooking(true)}>{copy.book}</button>}
        </div>
      </div>

      {list.error ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <TableSkeleton />
      ) : rows.length ? (
        <>
          <div className="rt-acc__card rt-biz__tablecard" aria-busy={list.isFetching}>
            <table className="rt-biz__table rt-adm-table">
              <thead><tr><SortTh label={c.ref} col="booked" sorter={s} numeric /><SortTh label={c.buyer} col="buyer" sorter={s} /><th scope="col">{c.course}</th><th scope="col">{c.provider}</th><SortTh label={c.total} col="total" sorter={s} numeric /><SortTh label={c.state} col="status" sorter={s} /></tr></thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td data-label={c.ref}><Link href={`/admin/orders/${o.ref}`} className="rt-adm-strong">{o.ref}</Link><small>{formatWhen(Date.parse(o.at))}</small></td>
                    <td data-label={c.buyer}>{o.buyer.name}<small>{o.buyer.company || o.buyer.email}</small></td>
                    <td data-label={c.course}>{o.course}<small>{o.startsOn ? `${formatDate(o.startsOn)} · ` : ""}{o.quantity} {o.quantity === 1 ? "place" : "places"}</small></td>
                    <td data-label={c.provider}>{o.provider}{o.bookedBy && <small>{copy.staff.replace("{name}", o.bookedBy)}</small>}</td>
                    <td data-label={c.total}><span className="rt-adm-num-cell">{formatPrice(o.gross)}</span><small>{copy.methods[o.method]}</small></td>
                    <td data-label={c.state}><AdminStatus kind="order" status={o.status}>{copy.statuses[o.status]}</AdminStatus></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager paging={paging} total={list.data.total} label="orders" />
        </>
      ) : search || tab !== "all" ? (
        <EmptyState title={copy.none} action={search ? { label: copy.clear, onClick: () => setQ("") } : undefined} />
      ) : (
        <EmptyState icon="icon-basket" title={copy.empty} text={copy.emptyText} action={canBook ? { label: copy.book, onClick: () => setBooking(true) } : undefined} />
      )}

      <Sheet open={booking} onClose={() => setBooking(false)} title={copy.bookSheet.title} closeLabel="Close">
        {booking && <BookForm />}
      </Sheet>
    </div>
  );
}

function BookForm() {
  const me = useAdminAccess();
  const canFree = me?.permissions?.includes("orders.free");
  const data = useAdmin();
  const router = useRouter();
  const refresh = useMoneyRefresh();
  const providers = api.admin.providers.list.useQuery({ tab: "active", limit: 100, sort: "name", dir: "asc" });
  const book = api.admin.orders.book.useMutation();
  const [v, setV] = useState({ buyerName: "", buyerEmail: "", buyerCompany: "", providerId: "", courseId: "", startsOn: "", quantity: "1", unit: "", method: "invoice", note: "" });
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const ref = useRef(null);
  const b = copy.bookSheet;
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const courses = [...(data?.catalogue ?? [])].sort((x, y) => x.title.localeCompare(y.title));
  const pickCourse = (id) => {
    const course = courses.find((x) => String(x.id) === id);
    setV((x) => ({ ...x, courseId: id, unit: x.method === "free" ? "0" : course ? String(course.from) : x.unit }));
  };
  const free = v.method === "free";
  const qty = /^\d+$/.test(v.quantity) ? Number(v.quantity) : 0;
  const unit = free ? 0 : toPence(v.unit);
  const input = (k, props = {}) => <input id={`rt-bk-${k}`} value={v[k]} onChange={set(k)} aria-invalid={errors[k] ? true : undefined} aria-describedby={describedBy(`rt-bk-${k}`, props.hint, errors[k])} {...props} hint={undefined} />;

  const submit = async (e) => {
    e.preventDefault();
    setGeneral("");
    const found = {};
    if (v.buyerName.trim().length < 2) found.buyerName = "Enter the customer’s name.";
    if (!/^\S+@\S+\.\S+$/.test(v.buyerEmail.trim())) found.buyerEmail = "Enter a valid email address.";
    if (!v.providerId) found.providerId = "Choose a training provider.";
    if (!v.courseId) found.courseId = "Choose a course.";
    if (!qty || qty > 500) found.quantity = "Enter a whole number from 1 to 500.";
    if (!free && !unit) found.unitPence = "Enter the price a place, like 96.50.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    const course = courses.find((x) => String(x.id) === v.courseId);
    try {
      const r = await book.mutateAsync({ buyerName: v.buyerName.trim(), buyerEmail: v.buyerEmail.trim(), buyerCompany: v.buyerCompany.trim() || undefined, providerId: v.providerId, courseId: course.id, courseTitle: course.title, startsOn: v.startsOn || null, quantity: qty, unitPence: unit, method: v.method, note: v.note.trim() || undefined });
      await refresh();
      router.push(`/admin/orders/${r.ref}`);
    } catch (err) {
      const { fields, general: g } = errorsFrom(err);
      setErrors(fields);
      setGeneral(g);
      if (Object.keys(fields).length) focusFirstError(ref.current);
    }
  };

  return (
    <form className="rt-q__form rt-biz__sheetform rt-adm-couponform" onSubmit={submit} noValidate ref={ref}>
      <p className="rt-acc__note">{b.note}</p>
      {field("rt-bk-buyerName", b.buyerName, null, errors.buyerName, input("buyerName", { type: "text", autoComplete: "off" }))}
      {field("rt-bk-buyerEmail", b.buyerEmail, b.buyerEmailHint, errors.buyerEmail, input("buyerEmail", { type: "email", autoComplete: "off", hint: b.buyerEmailHint }))}
      {field("rt-bk-buyerCompany", b.buyerCompany, null, errors.buyerCompany, input("buyerCompany", { type: "text" }))}
      {field("rt-bk-providerId", b.provider, b.providerHint, errors.providerId, (
        <FieldSelect id="rt-bk-providerId" label={b.provider} value={v.providerId} onChange={(id) => setV((x) => ({ ...x, providerId: id }))} options={(providers.data?.providers ?? []).map((p) => ({ value: p.id, label: p.name }))} invalid={Boolean(errors.providerId)} describedBy={describedBy("rt-bk-providerId", b.providerHint, errors.providerId)} />
      ))}
      {field("rt-bk-courseId", b.course, null, errors.courseId, (
        <FieldSelect id="rt-bk-courseId" label={b.course} value={v.courseId} onChange={pickCourse} options={courses.map((x) => ({ value: String(x.id), label: x.title }))} invalid={Boolean(errors.courseId)} describedBy={describedBy("rt-bk-courseId", null, errors.courseId)} />
      ))}
      {field("rt-bk-startsOn", b.startsOn, null, errors.startsOn, <DateField id="rt-bk-startsOn" clearable value={v.startsOn} onChange={(d) => setV((x) => ({ ...x, startsOn: d }))} />)}
      <Choice name="rt-bk-method" legend={b.method} value={v.method} onChange={(m) => setV((x) => ({ ...x, method: m, unit: m === "free" ? "0" : x.unit === "0" ? "" : x.unit }))} options={["invoice", "payment_link", ...(canFree ? ["free"] : [])].map((m) => ({ value: m, label: b.methods[m] }))} />
      <div className="rt-adm-couponform__two">
        {field("rt-bk-quantity", b.quantity, null, errors.quantity, input("quantity", { type: "text", inputMode: "numeric", className: "rt-adm-num" }))}
        {field("rt-bk-unit", b.unit, null, errors.unitPence, <input id="rt-bk-unit" type="text" inputMode="decimal" className="rt-adm-num" value={free ? "0.00" : v.unit} readOnly={free} onChange={set("unit")} aria-invalid={errors.unitPence ? true : undefined} aria-describedby={describedBy("rt-bk-unit", null, errors.unitPence)} />)}
      </div>
      <p className="rt-adm-book__total"><span>{b.total}</span> <strong>{qty && (unit || free) ? formatPrice(((unit || 0) * qty) / 100) : "–"}</strong></p>
      {field("rt-bk-note", b.note, null, errors.note, <textarea id="rt-bk-note" rows={2} maxLength={500} value={v.note} onChange={set("note")} />)}
      {general && <p className="rt-q__err rt-acc__formerr" role="alert">{general}</p>}
      <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={book.isPending}>{b.submit}</button>
    </form>
  );
}
