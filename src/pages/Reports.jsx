import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getReports, setReportResolved, deleteReport } from "../lib/data";

function formatDate(ms) {
  if (!ms) return "--";
  return new Date(ms).toISOString().slice(0, 16).replace("T", " ");
}

export default function Reports() {
  const [reports, setReports] = useState(null);
  const [filter, setFilter] = useState("open"); // open | resolved | all
  const [typeFilter, setTypeFilter] = useState("all"); // all | service | ai_answer
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState("");

  function load() {
    setError("");
    getReports()
      .then(setReports)
      .catch((e) => {
        setReports([]);
        setError(`Couldn't load reports: ${e.message}. Check that the latest firestore.rules are published.`);
      });
  }
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!reports) return [];
    return reports.filter((r) => {
      if (filter === "open" && r.resolved) return false;
      if (filter === "resolved" && !r.resolved) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      return true;
    });
  }, [reports, filter, typeFilter]);

  const openCount = reports ? reports.filter((r) => !r.resolved).length : 0;

  async function toggleResolved(r) {
    await setReportResolved(r.id, !r.resolved);
    setReports((list) => list.map((x) => (x.id === r.id ? { ...x, resolved: !r.resolved } : x)));
  }

  async function remove(r) {
    if (!confirm("Delete this report permanently?")) return;
    await deleteReport(r.id);
    setReports((list) => list.filter((x) => x.id !== r.id));
  }

  if (!reports) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div className="eyebrow">From app users</div>
      <h1 className="page-title">Reports</h1>
      <p className="page-desc">
        Problems users flagged: wrong or outdated service information, and AI answers that
        were wrong or unsafe. Fix the service, then mark the report resolved.
      </p>

      <div className="ledger-strip">
        <div className={`ledger-stat ${openCount > 0 ? "warn" : ""}`}>
          <div className="num">{openCount}</div>
          <div className="label">Open Reports</div>
        </div>
        <div className="ledger-stat">
          <div className="num">{reports.length}</div>
          <div className="label">Total (latest 300)</div>
        </div>
      </div>

      <div className="toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          <option value="service">Service information</option>
          <option value="ai_answer">AI answers</option>
        </select>
        <button className="btn secondary" style={{ marginLeft: "auto" }} onClick={load}>Refresh</button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="register">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Reason</th>
              <th>Service</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <React.Fragment key={r.id}>
                <tr>
                  <td className="date-mono">{formatDate(r.createdAt)}</td>
                  <td className="tag-mono">{r.type === "service" ? "Service info" : "AI answer"}</td>
                  <td>{r.reason}</td>
                  <td className="entry-name">
                    {r.serviceId && r.serviceId !== "life-events" ? (
                      <Link to={`/services/${r.serviceId}`}>{r.serviceName || r.serviceId}</Link>
                    ) : (
                      <span className="tag-mono">{r.serviceId === "life-events" ? "Life Events chat" : "Home chat"}</span>
                    )}
                  </td>
                  <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(r.question || r.answer) && (
                      <button className="btn secondary" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                        {expanded === r.id ? "Hide" : "View"}
                      </button>
                    )}
                    <button className="btn secondary" onClick={() => toggleResolved(r)}>
                      {r.resolved ? "Reopen" : "Resolve"}
                    </button>
                    <button className="btn danger" onClick={() => remove(r)}>Delete</button>
                  </td>
                </tr>
                {expanded === r.id && (
                  <tr>
                    <td colSpan={5} style={{ background: "var(--surface-soft)" }}>
                      {r.question && (
                        <p style={{ margin: "6px 0" }}><strong>Question:</strong> {r.question}</p>
                      )}
                      {r.answer && (
                        <p style={{ margin: "6px 0", whiteSpace: "pre-wrap" }}><strong>AI answer:</strong> {r.answer}</p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filtered.length === 0 && (
              <tr className="empty-row"><td colSpan={5}>No reports match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
