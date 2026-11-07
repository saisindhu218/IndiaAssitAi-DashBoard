import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getRequests, deleteRequests, getAllServices } from "../lib/data";

const normalize = (q) => String(q || "").toLowerCase().replace(/\s+/g, " ").trim();

function formatDate(ms) {
  return ms ? new Date(ms).toISOString().slice(0, 10) : "--";
}

// A few existing services whose names share words with the request,
// so you can tell if it's already covered under a different name.
function similarServices(request, services) {
  const words = normalize(request).split(" ").filter((w) => w.length > 3);
  if (!words.length) return [];
  return services
    .map((s) => ({ s, score: words.filter((w) => (s.name || "").toLowerCase().includes(w)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((x) => x.s);
}

export default function Requests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(null);
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");

  function load() {
    setError("");
    getRequests()
      .then(setRequests)
      .catch((e) => {
        setRequests([]);
        setError(`Couldn't load requests: ${e.message}. Check that the latest firestore.rules are published.`);
      });
  }
  useEffect(load, []);
  useEffect(() => {
    getAllServices().then(setServices).catch(() => {});
  }, []);

  const groups = useMemo(() => {
    const map = new Map();
    (requests || []).forEach((r) => {
      const key = normalize(r.query);
      if (!key) return;
      const g = map.get(key) || { key, label: r.query.trim(), count: 0, users: new Set(), last: 0, ids: [] };
      g.count += 1;
      g.users.add(r.uid);
      g.last = Math.max(g.last, r.createdAt || 0);
      g.ids.push(r.id);
      map.set(key, g);
    });
    return [...map.values()].sort((a, b) => b.users.size - a.users.size || b.count - a.count || b.last - a.last);
  }, [requests]);

  async function markDone(group) {
    if (!confirm(`Remove all ${group.count} request(s) for "${group.label}"? Do this once the service is added.`)) return;
    await deleteRequests(group.ids);
    setRequests((list) => list.filter((r) => !group.ids.includes(r.id)));
  }

  if (!requests) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div className="eyebrow">From app users</div>
      <h1 className="page-title">Service Requests</h1>
      <p className="page-desc">
        What people searched for but couldn't find, most-requested first (counted by different people).
        Click <strong>Draft with AI</strong> to start a new entry, then remove the request when it's published.
      </p>

      {error && <div className="error">{error}</div>}

      <div className="register">
        <table>
          <thead>
            <tr>
              <th>Requested</th>
              <th>People</th>
              <th>Last asked</th>
              <th>Maybe already covered by</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const similar = similarServices(g.label, services);
              return (
                <tr key={g.key}>
                  <td className="entry-name">{g.label}</td>
                  <td className="row-num">{g.users.size}{g.count > g.users.size ? ` (${g.count} asks)` : ""}</td>
                  <td className="date-mono">{formatDate(g.last)}</td>
                  <td>
                    {similar.length
                      ? similar.map((s, i) => (
                          <span key={s.id}>
                            {i > 0 && ", "}
                            <Link to={`/services/${s.id}`}>{s.name}</Link>
                          </span>
                        ))
                      : <span className="tag-mono">nothing similar</span>}
                  </td>
                  <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn" onClick={() => navigate(`/draft?name=${encodeURIComponent(g.label)}`)}>
                      Draft with AI
                    </button>
                    <button className="btn secondary" onClick={() => markDone(g)}>Done</button>
                  </td>
                </tr>
              );
            })}
            {groups.length === 0 && (
              <tr className="empty-row"><td colSpan={5}>No requests yet. They appear when app users tap "Request this service".</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
