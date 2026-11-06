import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllServices,
  isStale,
  daysSince,
  markServiceVerified,
  buildAppCatalogFile,
  STALE_AFTER_DAYS,
} from "../lib/data";
import { getCategoryColor } from "../lib/categoryColors";

export default function Dashboard() {
  const [services, setServices] = useState(null);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [staleOnly, setStaleOnly] = useState(false);
  const [gapsOnly, setGapsOnly] = useState(false);
  const [busyId, setBusyId] = useState(null);

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

  const hasGaps = (s) => !(s.officialLinks || []).length || !(s.faqs || []).length;

  const filtered = useMemo(() => {
    if (!services) return [];
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (category !== "All" && s.category !== category) return false;
      if (staleOnly && !isStale(s)) return false;
      if (gapsOnly && !hasGaps(s)) return false;
      if (q && !(s.name || "").toLowerCase().includes(q) && !s.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [services, category, search, staleOnly, gapsOnly]);

  const staleCount = services ? services.filter(isStale).length : 0;
  const gapCount = services ? services.filter(hasGaps).length : 0;

  async function handleVerify(s) {
    setBusyId(s.id);
    try {
      const date = await markServiceVerified(s.id);
      setServices((list) => list.map((x) => (x.id === s.id ? { ...x, lastUpdated: date } : x)));
    } catch (e) {
      alert(`Couldn't update: ${e.message}`);
    } finally {
      setBusyId(null);
    }
  }

  function handleExport() {
    const text = buildAppCatalogFile(services);
    const blob = new Blob([text], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sampleServices.js";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!services) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div className="eyebrow">Overview</div>
      <h1 className="page-title">Service Registry</h1>
      <p className="page-desc">
        Every government service entry currently published to the mobile app,
        drawn live from Firestore.
      </p>

      <div className="ledger-strip">
        <div className="ledger-stat">
          <div className="num">{services.length}</div>
          <div className="label">Total Entries</div>
        </div>
        <div className="ledger-stat">
          <div className="num">{categories.length - 1}</div>
          <div className="label">Departments</div>
        </div>
        <div className={`ledger-stat ${staleCount > 0 ? "warn" : ""}`}>
          <div className="num">{staleCount}</div>
          <div className="label">Review Due ({STALE_AFTER_DAYS}+ days)</div>
        </div>
        <div className={`ledger-stat ${gapCount > 0 ? "warn" : ""}`}>
          <div className="num">{gapCount}</div>
          <div className="label">Missing Link / FAQs</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search by name or id..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="toolbar-check" style={{ margin: 0, textTransform: "none", fontFamily: "inherit", letterSpacing: "normal" }}>
          <input type="checkbox" checked={staleOnly} onChange={(e) => setStaleOnly(e.target.checked)} />
          Review due only
        </label>
        <label className="toolbar-check" style={{ margin: 0, textTransform: "none", fontFamily: "inherit", letterSpacing: "normal" }}>
          <input type="checkbox" checked={gapsOnly} onChange={(e) => setGapsOnly(e.target.checked)} />
          Gaps only
        </label>
        <button className="btn secondary" style={{ marginLeft: "auto" }} onClick={handleExport} title="Download the live catalog as the app's sampleServices.js">
          Export for app
        </button>
        <Link to="/services/new" className="btn">
          + New Entry
        </Link>
      </div>

      <div className="register">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Entry Name</th>
              <th>Department</th>
              <th>Last Verified</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => {
              const c = getCategoryColor(s.category);
              const noLink = !(s.officialLinks || []).length;
              const noFaq = !(s.faqs || []).length;
              return (
                <tr key={s.id} className="row-enter" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                  <td className="row-num">{String(i + 1).padStart(3, "0")}</td>
                  <td className="entry-name">
                    <Link to={`/services/${s.id}`}>{s.name}</Link>
                    {(noLink || noFaq) && (
                      <div className="tag-mono" style={{ marginTop: 3 }}>
                        {noLink && "no official link"}
                        {noLink && noFaq && " · "}
                        {noFaq && "no FAQs"}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="cat-chip" style={{ color: c.text, background: c.bg, borderColor: c.border }}>
                      <span className="dot" style={{ background: c.dot }} />
                      {s.category}
                    </span>
                  </td>
                  <td className="date-mono">{s.lastUpdated || "--"} &middot; {daysSince(s.lastUpdated)}d</td>
                  <td>
                    {isStale(s) ? (
                      <span className="stamp review">Review Due</span>
                    ) : (
                      <span className="stamp verified">Verified</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn secondary"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      disabled={busyId === s.id}
                      onClick={() => handleVerify(s)}
                      title="I checked this against the official source and it is still correct"
                    >
                      {busyId === s.id ? "..." : "Mark verified"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr className="empty-row"><td colSpan={6}>No entries match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="hint">
        "Review Due" means <code>lastUpdated</code> is more than {STALE_AFTER_DAYS} days old (the
        mobile app starts warning users at the same point). Use <strong>Mark verified</strong> only after
        you have checked the entry against the official source -- it resets the clock without
        changing the content. <strong>Export for app</strong> downloads the live catalog as
        <code> sampleServices.js</code> so the app's bundled offline copy can be refreshed.
        Do not run the app's <code>npm run seed</code> after editing here: it overwrites Firestore
        with the older bundled copy.
      </p>
    </div>
  );
}
