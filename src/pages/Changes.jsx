import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllServices } from "../lib/data";
import { getWatchChanges, syncWatchList, dismissWatchChange, proxyConfigured } from "../lib/workerApi";

function formatDate(ms) {
  return ms ? new Date(ms).toISOString().slice(0, 16).replace("T", " ") : "--";
}

// First official link of every service, then second links, and so on
// (the free watcher can follow up to 300 pages).
function buildWatchList(services) {
  const items = [];
  for (let round = 0; round < 4; round++) {
    services.forEach((s) => {
      const url = (s.officialLinks || [])[round];
      if (url && /^https:\/\//i.test(url)) items.push({ serviceId: s.id, name: s.name, url });
    });
  }
  return items.slice(0, 300);
}

export default function Changes() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    setError("");
    getWatchChanges()
      .then(setData)
      .catch((e) => {
        setData({ flags: [], tracked: 0, stepMinutes: 2 });
        setError(e.message);
      });
  }
  useEffect(() => {
    if (proxyConfigured) load();
    else setData({ flags: [], tracked: 0, stepMinutes: 2 });
  }, []);

  async function sync() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const services = await getAllServices();
      const result = await syncWatchList(buildWatchList(services));
      setMessage(
        `Now watching ${result.tracked} official page(s)` +
          (result.skipped ? ` (${result.skipped} skipped: not on an allowed official site or duplicate)` : "") +
          ". First checks only record how each page looks today; changes appear after that."
      );
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function dismiss(flag) {
    await dismissWatchChange(flag.id);
    setData((d) => ({ ...d, flags: d.flags.filter((f) => f.id !== flag.id) }));
  }

  if (!data) return <div className="page">Loading...</div>;

  const cycleHours = data.tracked ? ((data.tracked * data.stepMinutes) / 60).toFixed(1) : null;

  return (
    <div className="page">
      <div className="eyebrow">Automation</div>
      <h1 className="page-title">Official Page Changes</h1>
      <p className="page-desc">
        A free background job re-checks the official pages linked from your services and tells you when
        their text changed (for example a new fee). It only flags -- you read the official page, update the
        service, and dismiss the flag.
      </p>

      {!proxyConfigured && (
        <div className="error">VITE_AI_PROXY_URL is not set in the admin .env, so this page can't reach your worker.</div>
      )}

      <div className="ledger-strip">
        <div className={`ledger-stat ${data.flags.length ? "warn" : ""}`}>
          <div className="num">{data.flags.length}</div>
          <div className="label">Pages Changed</div>
        </div>
        <div className="ledger-stat">
          <div className="num">{data.tracked}</div>
          <div className="label">Pages Watched</div>
        </div>
        <div className="ledger-stat">
          <div className="num">{cycleHours ?? "--"}</div>
          <div className="label">Hours Per Full Check</div>
        </div>
      </div>

      <div className="toolbar">
        <button className="btn" onClick={sync} disabled={busy || !proxyConfigured}>
          {busy ? "Syncing..." : "Sync watch list from my services"}
        </button>
        <button className="btn secondary" onClick={load} disabled={!proxyConfigured}>Refresh</button>
      </div>

      {message && <div className="hint" style={{ marginTop: 0, marginBottom: 12 }}>{message}</div>}
      {error && <div className="error">{error}</div>}

      {data.flags.map((f) => (
        <div className="card" key={f.id} style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 16 }}>
            {f.serviceId ? <Link to={`/services/${f.serviceId}`}>{f.name || f.serviceId}</Link> : f.name}
          </h2>
          <div className="hint" style={{ marginTop: 2 }}>
            Changed {formatDate(f.detectedAt)} &middot;{" "}
            <a href={f.url} target="_blank" rel="noreferrer">{f.url}</a>
          </div>

          {f.removed?.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              <strong style={{ color: "var(--danger)" }}>Was ({f.removedCount}):</strong>
              <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>{f.removed.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
          {f.added?.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              <strong>Now ({f.addedCount}):</strong>
              <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>{f.added.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}

          <div className="form-actions">
            <Link className="btn" to={f.serviceId ? `/services/${f.serviceId}` : "/"}>Open service</Link>
            <button className="btn secondary" onClick={() => dismiss(f)}>Dismiss</button>
          </div>
        </div>
      ))}
      {data.flags.length === 0 && (
        <p className="hint">No changes detected. After you sync, check back in a few hours -- the first pass just records each page.</p>
      )}
    </div>
  );
}
