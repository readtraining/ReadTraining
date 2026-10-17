"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { markAllRead, markRead, useProvider } from "@/lib/providerWorkspace";
import CataloguePagination from "@/components/courses/CataloguePagination";
import { Loading, Tabs, formatWhen, getQuery, setQuery } from "./providerParts";
import { EmptyState } from "@/components/states/States";

const PER_PAGE = 10;

// Notifications, newest first, 10 a page (Hurak's: refund requests, reviews, orders): unread ones are marked; opening one marks it
// read and goes to the page it is about, whose back link then returns here (?from=notifications). "Mark all as read" clears the
// count on the bell.
export default function ProviderNotifications() {
  const data = useProvider();
  const [show, setShow] = useState("all");
  const [page, setPage] = useState(1);
  useEffect(() => {
    if (getQuery("show") === "unread") setShow("unread");
  }, []);
  if (!data) return <Loading rows={2} />;

  const all = [...data.notifications].sort((a, b) => b.at - a.at);
  const unread = all.filter((n) => !n.read);
  const list = show === "unread" ? unread : all;
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const at = Math.min(page, pages);
  const rows = list.slice((at - 1) * PER_PAGE, at * PER_PAGE);
  const tabs = [{ key: "all", label: "All", count: all.length }, { key: "unread", label: "Unread", count: unread.length }];

  if (!all.length) return <EmptyState title="No notifications yet" text="Updates on your courses, orders and reviews appear here." />;

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={show} onChange={(v) => { setShow(v); setPage(1); setQuery("show", v === "all" ? "" : v); }} label="Show notifications" />
        <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={markAllRead} disabled={!unread.length}>Mark all as read</button>
      </div>
      <p className="rt-sr" aria-live="polite">{`${unread.length} unread`}</p>
      {list.length ? (
        <div className="rt-acc__card">
        <ul className="rt-pws-note">
          {rows.map((n) => (
            <li key={n.id} className={n.read ? "" : "is-unread"}>
              <Link href={`${n.href}${n.href.includes("?") ? "&" : "?"}from=notifications`} className="rt-pws-note__link" onClick={() => !n.read && markRead(n.id)}>
                <span className="rt-pws-note__dot" aria-hidden="true"></span>
                <span className="rt-pws-note__body">
                  <span className="rt-pws-note__text">{!n.read && <span className="rt-sr">Unread: </span>}{n.text}</span>
                  <small>{formatWhen(n.at)}</small>
                </span>
                <i className="icon-chevron-right text-12" aria-hidden="true"></i>
              </Link>
            </li>
          ))}
        </ul>
        {pages > 1 && <div className="rt-pws-coh__pages"><CataloguePagination page={at} totalPages={pages} hrefFor={(p) => `?page=${p}`} onNavigate={setPage} /></div>}
        </div>
      ) : (
        <EmptyState title="You have read everything." />
      )}
    </div>
  );
}
