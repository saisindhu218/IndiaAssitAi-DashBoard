import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAllServices } from "../lib/data";
import { fetchOfficialPage, askDraftModel, proxyConfigured } from "../lib/workerApi";
import { htmlToText, buildDraftMessages, parseDraftJson, normalizeDraft } from "../lib/draft";

export default function Draft() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [name, setName] = useState(params.get("name") || "");
  const [department, setDepartment] = useState("");
  const [urls, setUrls] = useState("");
  const [pasted, setPasted] = useState("");
  const [notes, setNotes] = useState("");
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getAllServices().then((list) => setCategories([...new Set(list.map((s) => s.category).filter(Boolean))].sort()));
  }, []);

  const addLog = (line) => setLog((l) => [...l, line]);

  async function generate() {
    setError("");
    setLog([]);
    if (!name.trim()) {
      setError("Type the service name first.");
      return;
    }
    const urlList = [...new Set(urls.split("\n").map((u) => u.trim()).filter(Boolean))].slice(0, 3);
    const bad = urlList.find((u) => !/^https:\/\//i.test(u));
    if (bad) {
      setError(`"${bad}" must start with https://`);
      return;
    }
    if (!urlList.length && !pasted.trim()) {
      setError("Add at least one official page address, or paste the text from an official page.");
      return;
    }

    setBusy(true);
    try {
      const sources = [];
      const links = [];

      for (const url of urlList) {
        addLog(`Fetching ${url} ...`);
        try {
          const { html, finalUrl } = await fetchOfficialPage(url);
          const { title, text } = htmlToText(html);
          if (text.length < 200) {
            throw new Error("the page has almost no readable text (it may need JavaScript, or be a PDF). Paste its text instead.");
          }
          sources.push({ url: finalUrl, title, text });
          links.push(finalUrl);
          addLog(`  OK: ${title || finalUrl} (${text.length.toLocaleString()} characters)`);
        } catch (e) {
          addLog(`  FAILED: ${e.message}`);
        }
      }
      if (pasted.trim()) {
        sources.push({ url: "(text pasted by admin)", title: "Pasted text", text: pasted.trim() });
        addLog(`Using your pasted text (${pasted.trim().length.toLocaleString()} characters).`);
      }
      if (!sources.length) throw new Error("None of the pages could be read. Paste the text from the official page instead.");

      addLog("Asking the AI to write a draft from these sources ...");
      const messages = buildDraftMessages({ name: name.trim(), department: department.trim(), notes: notes.trim(), categories, sources });
      const reply = await askDraftModel(messages);
      const { draft, missing, notes: sourceNotes } = normalizeDraft(parseDraftJson(reply), { name: name.trim(), links });
      addLog("Draft ready. Opening the editor ...");

      navigate("/services/new", {
        state: {
          draft,
          missing,
          notes: sourceNotes,
          sources: sources.map((s) => ({ url: s.url, title: s.title })),
        },
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="eyebrow">Automation</div>
      <h1 className="page-title">Draft with AI</h1>
      <p className="page-desc">
        Give the service name and the official page(s) that describe it. The AI writes a first draft using
        ONLY those pages, and opens it in the editor for you to check and publish. Nothing is published
        automatically.
      </p>

      {!proxyConfigured && (
        <div className="error">
          VITE_AI_PROXY_URL is not set in the admin .env, so drafting can't reach your worker. See worker/README.md.
        </div>
      )}

      <div className="card">
        <label>Service name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} placeholder="e.g. Fishing Licence" />

        <label>Department (optional)</label>
        <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} style={{ width: "100%" }} placeholder="e.g. Fisheries Department" />

        <label>Official page addresses (1-3, one per line, https:// only)</label>
        <textarea rows={3} value={urls} onChange={(e) => setUrls(e.target.value)} placeholder={"https://uidai.gov.in/...\nhttps://services.india.gov.in/..."} />
        <div className="hint" style={{ marginTop: 6 }}>
          Only official sites are allowed (.gov.in, .nic.in, .ac.in, .edu.in, .org.in, plus any hosts you added in the worker's
          EXTRA_ALLOWED_HOSTS). PDFs and pages that need JavaScript can't be read -- paste their text below instead.
        </div>

        <label>Or paste text from an official page / PDF (optional)</label>
        <textarea rows={5} value={pasted} onChange={(e) => setPasted(e.target.value)} />

        <label>Notes for the AI (optional)</label>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: "100%" }} placeholder="e.g. focus on the online process for adults" />

        {error && <div className="error">{error}</div>}

        {log.length > 0 && (
          <pre style={{ background: "var(--surface-soft)", padding: 12, borderRadius: 8, fontSize: 12, whiteSpace: "pre-wrap", margin: "14px 0 0" }}>
            {log.join("\n")}
          </pre>
        )}

        <div className="form-actions">
          <button className="btn" onClick={generate} disabled={busy || !proxyConfigured}>
            {busy ? "Working..." : "Generate draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
