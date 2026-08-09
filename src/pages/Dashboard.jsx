import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAllServices, isStale, daysSince, STALE_AFTER_DAYS } from "../lib/data";

export default function Dashboard() {
  const [services, setServices] = useState(null);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [staleOnly, setStaleOnly] = useState(false);

  useEffect(() => {
    getAllServices().then((list) => {
      list.sort((a, b) => daysSince(b.lastUpdated) - daysSince(a.lastUpdated));
      setServices(list);
    });
  }, []);

  const categories = useMemo(() => {
    if (!services) return [];
    return ["All", ...new Set(services.map((s) => s.category).filter(Boolean))].sort();
  }, [services]);

  const filtered = useMemo(() => {
    if (!services) return [];
    return services.filter((s) => {
      if (category !== "All" && s.category !== category) return false;
      if (staleOnly && !isStale(s)) return false;
      if (search && !s.name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [services, category, search, staleOnly]);

  const staleCount = services ? services.filter(isStale).length : 0;

  if (!services) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <div className="stats-row">
        <div className="stat-box">
          <div className="num">{services.length}</div>
          <div className="label">Total services</div>
        </div>
        <div className="stat-box">
          <div className="num">{categories.length - 1}</div>
          <div className="label">Departments</div>
        </div>
        <div className={`stat-box ${staleCount > 0 ? "warn" : ""}`}>
          <div className="num">{staleCount}</div>
          <div className="label">Need review (90+ days old)</div>
        </div>
      </div>

      <div className="filter-row">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, margin: 0, textTransform: "none", fontWeight: 400 }}>
          <input type="checkbox" checked={staleOnly} onChange={(e) => setStaleOnly(e.target.checked)} />
          Needs review only
        </label>
        <Link to="/services/new" className="btn" style={{ marginLeft: "auto" }}>
          + Add Service
        </Link>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Last Updated</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => (
            <tr key={s.id}>
              <td><Link to={`/services/${s.id}`}>{s.name}</Link></td>
              <td><span className="badge category">{s.category}</span></td>
              <td>{s.lastUpdated || "--"} ({daysSince(s.lastUpdated)}d ago)</td>
              <td>
                {isStale(s) ? (
                  <span className="badge stale">Needs review</span>
                ) : (
                  <span className="badge ok">Fresh</span>
                )}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={4} style={{ color: "#888", padding: 20 }}>No services match this filter.</td></tr>
          )}
        </tbody>
      </table>

      <p className="hint" style={{ marginTop: 16 }}>
        "Needs review" just means the service's <code>lastUpdated</code> date is
        more than {STALE_AFTER_DAYS} days old -- it's a reminder to double-check
        it, not a signal that it's actually wrong. Ask Claude to verify current
        details, then paste the update into the edit form.
      </p>
    </div>
  );
}
