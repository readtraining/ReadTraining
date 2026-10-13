"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { markAllRead, markRead, useProvider } from "@/lib/providerWorkspace";
import { Empty, Loading, Tabs, formatWhen, getQuery, setQuery } from "./providerParts";

// Notifications, newest first: unread ones are marked; opening one marks it read and goes to the page it is about. "Mark all as
// read" clears the count in the sidebar.
export default function ProviderNotifications() {
  const data = useProvider();
  const [show, setShow] = useState("all");
  useEffect(() => {
    if (getQuery("show") === "unread") setShow("unread");
  }, []);
  if (!data) return <Loading rows={2} />;

  const all = [...data.notifications].sort((a, b) => b.at - a.at);
  const unread = all.filter((n) => !n.read);
  const list = show === "unread" ? unread : all;
  const tabs = [{ key: "all", label: "All", count: all.length }, { key: "unread", label: "Unread", count: unread.length }];

  if (!all.length) return <Empty title="No notifications yet" text="Updates on your courses, orders and reviews appear here." />;

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={show} onChange={(v) => { setShow(v); setQuery("show", v === "all" ? "" : v); }} label="Show notifications" />
        <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={markAllRead} disabled={!unread.length}>Mark all as read</button>
      </div>
      <p className="rt-sr" aria-live="polite">{`${unread.length} unread`}</p>
      {list.length ? (
        <ul className="rt-acc__card rt-pws-note">
          {list.map((n) => (
            <li key={n.id} className={n.read ? "" : "is-unread"}>
              <Link href={n.href} className="rt-pws-note__link" onClick={() => !n.read && markRead(n.id)}>
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
      ) : (
        <p className="rt-acc__card rt-acc__empty">You have read everything.</p>
      )}
    </div>
  );
}
