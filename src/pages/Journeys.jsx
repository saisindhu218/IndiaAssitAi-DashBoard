import React, { useEffect, useState } from "react";
import { getAllJourneys, saveJourney, deleteJourney } from "../lib/data";

const EMPTY = { id: "", title: "", icon: "🧭", description: "", stepsText: "" };

// Steps are edited as one line per step: "serviceId | optional note"
function journeyToForm(j) {
  return {
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

  function load() {
    getAllJourneys().then(setJourneys);
  }
  useEffect(load, []);

  async function handleSave() {
    setError("");
    if (!editing.id.trim()) {
      setError("Journey needs an ID.");
      return;
    }
    try {
      await saveJourney(editing.id, {
        title: editing.title,
        icon: editing.icon,
        description: editing.description,
        steps: parseSteps(editing.stepsText),
      });
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

  if (!journeys) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <div className="filter-row">
        <h2 style={{ margin: 0 }}>Journeys</h2>
        <button
          className="btn"
          style={{ marginLeft: "auto" }}
          onClick={() => setEditing({ ...EMPTY })}
        >
          + Add Journey
        </button>
      </div>

      {editing && (
        <div className="card">
          <label>Journey ID</label>
          <input
            type="text"
            value={editing.id}
            disabled={!!journeys.find((j) => j.id === editing.id) && editing.id !== ""}
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
          {error && <div className="error">{error}</div>}
          <div className="form-actions">
            <button className="btn" onClick={handleSave}>Save</button>
            <button className="btn secondary" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

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
              <td>{j.icon} {j.title}</td>
              <td>{(j.steps || []).length}</td>
              <td style={{ display: "flex", gap: 8 }}>
                <button className="btn secondary" onClick={() => setEditing(journeyToForm(j))}>Edit</button>
                <button className="btn danger" onClick={() => handleDelete(j.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {journeys.length === 0 && (
            <tr><td colSpan={3} style={{ color: "#888", padding: 20 }}>No journeys yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
