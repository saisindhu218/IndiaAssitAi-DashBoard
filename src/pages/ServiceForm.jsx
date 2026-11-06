import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getService,
  saveService,
  deleteService,
  getAllJourneys,
  KNOWN_SERVICE_FIELDS,
  todayISO,
} from "../lib/data";
import { validateService, isValidId } from "../lib/validate";

const EMPTY = {
  name: "",
  department: "",
  category: "",
  categoryIcon: "📁",
  overview: "",
  eligibility: "",
  documents: "",
  processingTime: "",
  onlineSteps: "",
  offlineSteps: "",
  commonMistakes: "",
  officialLinks: "",
  stateOverrides: "{}",
};

// Plain lists are edited as one-item-per-line text.
const LINE_FIELDS = ["documents", "onlineSteps", "offlineSteps", "commonMistakes", "officialLinks"];

function linesToArray(text) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

function serviceToFormState(service) {
  const state = { ...EMPTY };
  Object.keys(EMPTY).forEach((key) => {
    if (LINE_FIELDS.includes(key)) {
      state[key] = (service[key] || []).join("\n");
    } else if (key === "stateOverrides") {
      state[key] = JSON.stringify(service.stateOverrides || {}, null, 2);
    } else {
      state[key] = service[key] || (key === "categoryIcon" ? "📁" : "");
    }
  });
  return state;
}

const smallBtn = { padding: "4px 10px", fontSize: 12 };

export default function ServiceForm() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();

  const [docId, setDocId] = useState(isNew ? "" : id);
  const [form, setForm] = useState(EMPTY);
  const [fees, setFees] = useState([{ label: "", value: "" }]); // [{label, value}]
  const [faqs, setFaqs] = useState([]); // [{q, a}]
  const [original, setOriginal] = useState(null); // the saved document, so unknown fields survive
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (isNew) return;
    getService(id).then((s) => {
      if (s) {
        setOriginal(s);
        setForm(serviceToFormState(s));
        const feeRows = Object.entries(s.fees || {}).map(([label, value]) => ({ label, value: String(value) }));
        setFees(feeRows.length ? feeRows : [{ label: "", value: "" }]);
        setFaqs((s.faqs || []).map((f) => ({ q: f.q || "", a: f.a || "" })));
      }
      setLoading(false);
    });
  }, [id, isNew]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setErrors([]);

    let stateOverrides;
    try {
      stateOverrides = JSON.parse(form.stateOverrides || "{}");
    } catch (e) {
      setErrors([`State overrides is not valid JSON: ${e.message}`]);
      return;
    }

    if (isNew && !isValidId(docId)) {
      setErrors(["Service ID must use lowercase letters, numbers and single hyphens, e.g. 'pan-card-correction'."]);
      return;
    }

    const feeObject = {};
    fees
      .filter((row) => row.label.trim() || row.value.trim())
      .forEach((row) => {
        feeObject[row.label.trim()] = row.value.trim();
      });

    const payload = {
      name: form.name.trim(),
      department: form.department.trim(),
      category: form.category.trim(),
      categoryIcon: form.categoryIcon.trim() || "📁",
      overview: form.overview.trim(),
      eligibility: form.eligibility.trim(),
      documents: linesToArray(form.documents),
      fees: feeObject,
      processingTime: form.processingTime.trim(),
      onlineSteps: linesToArray(form.onlineSteps),
      offlineSteps: linesToArray(form.offlineSteps),
      commonMistakes: linesToArray(form.commonMistakes),
      faqs: faqs
        .filter((f) => f.q.trim() || f.a.trim())
        .map((f) => ({ q: f.q.trim(), a: f.a.trim() })),
      officialLinks: linesToArray(form.officialLinks),
      stateOverrides,
      lastUpdated: todayISO(), // resets the staleness clock
    };

    const { errors: problems, warnings } = validateService(payload);
    if (problems.length) {
      setErrors(problems);
      return;
    }
    if (warnings.length && !confirm(`Save anyway?\n\n- ${warnings.join("\n- ")}`)) return;

    // Keep any fields stored on the document that this form doesn't edit.
    const extras = {};
    if (original) {
      Object.keys(original).forEach((key) => {
        if (key !== "id" && !KNOWN_SERVICE_FIELDS.includes(key)) extras[key] = original[key];
      });
    }

    setSaving(true);
    try {
      await saveService(docId, { ...extras, ...payload });
      navigate("/");
    } catch (e) {
      setErrors([e.message]);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    // Warn if a journey still points at this service.
    let usedBy = [];
    try {
      const journeys = await getAllJourneys();
      usedBy = journeys.filter((j) => (j.steps || []).some((s) => s.serviceId === docId)).map((j) => j.title || j.id);
    } catch (e) {
      // ignore: just skip the extra warning
    }
    const extra = usedBy.length
      ? `\n\nThese journeys use it and will have a broken step: ${usedBy.join(", ")}.`
      : "";
    if (!confirm(`Delete "${form.name}" permanently? This can't be undone.${extra}`)) return;
    await deleteService(docId);
    navigate("/");
  }

  if (loading) return <div className="page">Loading entry...</div>;

  return (
    <div className="page">
      <div className="eyebrow">{isNew ? "New Entry" : `Entry / ${docId}`}</div>
      <h1 className="page-title" style={{ fontSize: 22, marginBottom: 24 }}>{isNew ? "Register a Service" : form.name || docId}</h1>
      <div className="card">
        <label>Service ID (lowercase, hyphens only, e.g. "pan-card-correction")</label>
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

        <label>Fees</label>
        {fees.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Label (e.g. Application fee)"
              value={row.label}
              onChange={(e) => setFees((list) => list.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))}
              style={{ flex: 1 }}
            />
            <input
              type="text"
              placeholder="Amount / details (e.g. ₹107)"
              value={row.value}
              onChange={(e) => setFees((list) => list.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))}
              style={{ flex: 2 }}
            />
            <button className="btn secondary" style={smallBtn} onClick={() => setFees((list) => list.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button className="btn secondary" style={smallBtn} onClick={() => setFees((list) => [...list, { label: "", value: "" }])}>
          + Add fee
        </button>

        <label>Processing Time</label>
        <input type="text" value={form.processingTime} onChange={(e) => update("processingTime", e.target.value)} style={{ width: "100%" }} />

        <label>Online Steps (one per line)</label>
        <textarea rows={5} value={form.onlineSteps} onChange={(e) => update("onlineSteps", e.target.value)} />

        <label>Offline Steps (one per line)</label>
        <textarea rows={4} value={form.offlineSteps} onChange={(e) => update("offlineSteps", e.target.value)} />

        <label>Common Mistakes (one per line)</label>
        <textarea rows={4} value={form.commonMistakes} onChange={(e) => update("commonMistakes", e.target.value)} />

        <label>FAQs</label>
        {faqs.map((f, i) => (
          <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Question"
              value={f.q}
              onChange={(e) => setFaqs((list) => list.map((r, j) => (j === i ? { ...r, q: e.target.value } : r)))}
              style={{ width: "100%", marginBottom: 6 }}
            />
            <textarea
              rows={2}
              placeholder="Answer"
              value={f.a}
              onChange={(e) => setFaqs((list) => list.map((r, j) => (j === i ? { ...r, a: e.target.value } : r)))}
            />
            <button className="btn secondary" style={smallBtn} onClick={() => setFaqs((list) => list.filter((_, j) => j !== i))}>
              Remove FAQ
            </button>
          </div>
        ))}
        <button className="btn secondary" style={smallBtn} onClick={() => setFaqs((list) => [...list, { q: "", a: "" }])}>
          + Add FAQ
        </button>

        <label>Official Links (one per line, must start with https://)</label>
        <textarea rows={3} value={form.officialLinks} onChange={(e) => update("officialLinks", e.target.value)} />

        <label>State Overrides (JSON object, optional -- see README)</label>
        <textarea rows={4} value={form.stateOverrides} onChange={(e) => update("stateOverrides", e.target.value)} style={{ fontFamily: "monospace" }} />

        {errors.length > 0 && (
          <div className="error">
            {errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}

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
