import React, { useEffect, useState } from "react";
import { getAllJourneys, getAllServices, saveJourney, deleteJourney } from "../lib/data";
import { validateJourney, isValidId } from "../lib/validate";

const EMPTY = { id: "", title: "", icon: "🧭", description: "", stepsText: "", isNew: true };

// Steps are edited as one line per step: "serviceId | optional note"
function journeyToForm(j) {
  return {
    isNew: false,
    id: j.id,
    title: j.title || "",
    icon: j.icon || "🧭",
    description: j.description || "",
    stepsText: (j.steps || []).map((s) => `${s.serviceId}${s.note ? " | " + s.note : ""}`).join("\n"),
  };
}

function parseSteps(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [serviceId, ...rest] = line.split("|");
      return { serviceId: serviceId.trim(), note: rest.join("|").trim() };
    });
}

export default function Journeys() {
  const [journeys, setJourneys] = useState(null);
  const [editing, setEditing] = useState(null); // form state or null
  const [error, setError] = useState("");
  const [serviceIds, setServiceIds] = useState([]);

  function load() {
    getAllJourneys().then(setJourneys);
  }
  useEffect(load, []);
  useEffect(() => {
    getAllServices().then((list) => setServiceIds(list.map((s) => s.id).sort()));
  }, []);

  async function handleSave() {
    setError("");
    if (!isValidId(editing.id)) {
      setError("Journey ID must use lowercase letters, numbers and single hyphens, e.g. 'buying-a-home'.");
      return;
    }
    if (editing.isNew && journeys.some((j) => j.id === editing.id)) {
      setError("A journey with this ID already exists. Choose a different ID, or edit the existing one.");
      return;
    }
    const payload = {
      title: editing.title.trim(),
      icon: editing.icon,
      description: editing.description,
      steps: parseSteps(editing.stepsText),
    };
    const { errors } = validateJourney(payload, serviceIds);
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }
    try {
      await saveJourney(editing.id, payload);
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm(`Delete journey "${id}"? This can't be undone.`)) return;
    await deleteJourney(id);
    load();
  }

  if (!journeys) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div className="eyebrow">Life Events</div>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Journeys</h1>
      <div className="toolbar" style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 20 }}>
        <button
          className="btn"
          style={{ marginLeft: "auto" }}
          onClick={() => setEditing({ ...EMPTY })}
        >
          + New Journey
        </button>
      </div>

      {editing && (
        <div className="card">
          <label>Journey ID</label>
          <input
            type="text"
            value={editing.id}
            disabled={!editing.isNew}
            onChange={(e) => setEditing({ ...editing, id: e.target.value.trim().toLowerCase().replace(/\s+/g, "-") })}
            style={{ width: "100%" }}
          />
          <div className="form-grid">
            <div>
              <label>Title</label>
              <input type="text" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} style={{ width: "100%" }} />
            </div>
            <div>
              <label>Icon (one emoji)</label>
              <input type="text" value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} style={{ width: "100%" }} />
            </div>
          </div>
          <label>Description</label>
          <textarea rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          <label>Steps -- one per line: serviceId | optional note</label>
          <textarea
            rows={5}
            value={editing.stepsText}
            onChange={(e) => setEditing({ ...editing, stepsText: e.target.value })}
            style={{ fontFamily: "monospace" }}
            placeholder="pan-card-correction | Make sure your PAN is up to date"
          />
          <div className="hint" style={{ marginTop: 6 }}>
            Each step's service id must match an existing service id exactly
            ({serviceIds.length} available -- find ids on the Service Registry page).
          </div>
          {error && <div className="error">{error}</div>}
          <div className="form-actions">
            <button className="btn" onClick={handleSave}>Save</button>
            <button className="btn secondary" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="register">
        <table>
          <thead>
            <tr>
              <th>Journey</th>
              <th>Steps</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {journeys.map((j) => (
              <tr key={j.id}>
                <td className="entry-name">{j.icon} {j.title}</td>
                <td className="tag-mono">{(j.steps || []).length}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button className="btn secondary" onClick={() => setEditing(journeyToForm(j))}>Edit</button>
                  <button className="btn danger" onClick={() => handleDelete(j.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {journeys.length === 0 && (
              <tr className="empty-row"><td colSpan={3}>No journeys yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
