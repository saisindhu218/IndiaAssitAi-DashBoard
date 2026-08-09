import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getService, saveService, deleteService } from "../lib/data";

const EMPTY = {
  name: "",
  department: "",
  category: "",
  categoryIcon: "📁",
  overview: "",
  eligibility: "",
  documents: "",
  fees: "{}",
  processingTime: "",
  onlineSteps: "",
  offlineSteps: "",
  commonMistakes: "",
  faqs: "[]",
  officialLinks: "",
  stateOverrides: "{}",
};

// Array fields are edited as one-item-per-line text for simplicity;
// object/array-of-object fields (fees, faqs, stateOverrides) are edited
// as raw JSON, since their shape is more than a flat list.
const LINE_FIELDS = ["documents", "onlineSteps", "offlineSteps", "commonMistakes", "officialLinks"];
const JSON_FIELDS = ["fees", "faqs", "stateOverrides"];

function linesToArray(text) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

function serviceToFormState(service) {
  const state = { ...EMPTY };
  Object.keys(EMPTY).forEach((key) => {
    if (LINE_FIELDS.includes(key)) {
      state[key] = (service[key] || []).join("\n");
    } else if (JSON_FIELDS.includes(key)) {
      state[key] = JSON.stringify(service[key] || (key === "faqs" ? [] : {}), null, 2);
    } else {
      state[key] = service[key] || "";
    }
  });
  return state;
}

export default function ServiceForm() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();

  const [docId, setDocId] = useState(isNew ? "" : id);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew) return;
    getService(id).then((s) => {
      if (s) setForm(serviceToFormState(s));
      setLoading(false);
    });
  }, [id, isNew]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setError("");
    // Validate JSON fields before attempting to save.
    let fees, faqs, stateOverrides;
    try {
      fees = JSON.parse(form.fees || "{}");
      faqs = JSON.parse(form.faqs || "[]");
      stateOverrides = JSON.parse(form.stateOverrides || "{}");
    } catch (e) {
      setError(`Invalid JSON in Fees / FAQs / State Overrides: ${e.message}`);
      return;
    }
    if (!docId.trim()) {
      setError("Service ID is required (used as the internal key, e.g. 'pan-card-correction').");
      return;
    }

    const payload = {
      name: form.name,
      department: form.department,
      category: form.category,
      categoryIcon: form.categoryIcon,
      overview: form.overview,
      eligibility: form.eligibility,
      documents: linesToArray(form.documents),
      fees,
      processingTime: form.processingTime,
      onlineSteps: linesToArray(form.onlineSteps),
      offlineSteps: linesToArray(form.offlineSteps),
      commonMistakes: linesToArray(form.commonMistakes),
      faqs,
      officialLinks: linesToArray(form.officialLinks),
      stateOverrides,
      lastUpdated: new Date().toISOString().slice(0, 10), // resets the staleness clock
    };

    setSaving(true);
    try {
      await saveService(docId, payload);
      navigate("/");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${form.name}" permanently? This can't be undone.`)) return;
    await deleteService(docId);
    navigate("/");
  }

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <div className="card">
        <h2>{isNew ? "Add Service" : `Edit: ${form.name || docId}`}</h2>

        <label>Service ID (URL-safe key, e.g. "pan-card-correction")</label>
        <input
          type="text"
          value={docId}
          disabled={!isNew}
          onChange={(e) => setDocId(e.target.value.trim().toLowerCase().replace(/\s+/g, "-"))}
          style={{ width: "100%" }}
        />
        {!isNew && <div className="hint">ID can't be changed after creation -- delete and recreate if you need a different one.</div>}

        <div className="form-grid">
          <div>
            <label>Name</label>
            <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} style={{ width: "100%" }} />
          </div>
          <div>
            <label>Department</label>
            <input type="text" value={form.department} onChange={(e) => update("department", e.target.value)} style={{ width: "100%" }} />
          </div>
          <div>
            <label>Category (shown on Services screen)</label>
            <input type="text" value={form.category} onChange={(e) => update("category", e.target.value)} style={{ width: "100%" }} />
          </div>
          <div>
            <label>Category Icon (one emoji)</label>
            <input type="text" value={form.categoryIcon} onChange={(e) => update("categoryIcon", e.target.value)} style={{ width: "100%" }} />
          </div>
        </div>

        <label>Overview</label>
        <textarea rows={3} value={form.overview} onChange={(e) => update("overview", e.target.value)} />

        <label>Eligibility</label>
        <textarea rows={2} value={form.eligibility} onChange={(e) => update("eligibility", e.target.value)} />

        <label>Required Documents (one per line)</label>
        <textarea rows={4} value={form.documents} onChange={(e) => update("documents", e.target.value)} />

        <label>Fees (JSON object, e.g. {`{"application": "₹500"}`})</label>
        <textarea rows={3} value={form.fees} onChange={(e) => update("fees", e.target.value)} style={{ fontFamily: "monospace" }} />

        <label>Processing Time</label>
        <input type="text" value={form.processingTime} onChange={(e) => update("processingTime", e.target.value)} style={{ width: "100%" }} />

        <label>Online Steps (one per line)</label>
        <textarea rows={5} value={form.onlineSteps} onChange={(e) => update("onlineSteps", e.target.value)} />

        <label>Offline Steps (one per line)</label>
        <textarea rows={4} value={form.offlineSteps} onChange={(e) => update("offlineSteps", e.target.value)} />

        <label>Common Mistakes (one per line)</label>
        <textarea rows={4} value={form.commonMistakes} onChange={(e) => update("commonMistakes", e.target.value)} />

        <label>FAQs (JSON array of {`{"q": "...", "a": "..."}`})</label>
        <textarea rows={5} value={form.faqs} onChange={(e) => update("faqs", e.target.value)} style={{ fontFamily: "monospace" }} />

        <label>Official Links (one per line)</label>
        <textarea rows={2} value={form.officialLinks} onChange={(e) => update("officialLinks", e.target.value)} />

        <label>State Overrides (JSON object, optional -- see README)</label>
        <textarea rows={4} value={form.stateOverrides} onChange={(e) => update("stateOverrides", e.target.value)} style={{ fontFamily: "monospace" }} />

        {error && <div className="error">{error}</div>}

        <div className="form-actions">
          <button className="btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button className="btn secondary" onClick={() => navigate("/")}>Cancel</button>
          {!isNew && (
            <button className="btn danger" onClick={handleDelete} style={{ marginLeft: "auto" }}>
              Delete Service
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
