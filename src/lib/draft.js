// Helpers for "Draft with AI": turn official pages into text, build the AI
// prompt, and turn the AI's reply into a clean service entry.

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Readable text from a web page (runs in the browser, so it costs nothing). */
export function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = (doc.title || "").trim();
  doc.querySelectorAll("script,style,noscript,svg,iframe,form,nav,header,footer,aside").forEach((n) => n.remove());
  const main = doc.querySelector("main, [role=main], article, #content, .content") || doc.body;
  const clean = (node) =>
    (node?.textContent || "")
      .replace(/[ \t\r\f\v]+/g, " ")
      .replace(/\n\s*\n+/g, "\n")
      .trim();
  let text = clean(main);
  if (text.length < 300 && doc.body) text = clean(doc.body); // 'main' was too small, use the whole page
  return { title, text };
}

const TOTAL_CHARS = 14000; // keeps the request inside the free AI limits

export function buildDraftMessages({ name, department, notes, categories, sources }) {
  const perSource = Math.floor(TOTAL_CHARS / Math.max(sources.length, 1));
  const sourceText = sources
    .map(
      (s, i) =>
        `[Source ${i + 1}] ${s.url}${s.title ? `\nTitle: ${s.title}` : ""}\nText:\n${s.text.slice(0, perSource)}`
    )
    .join("\n\n----\n\n");

  const system = `You are helping build an entry for "IndiaAssist AI", an app that explains Indian government services to ordinary citizens in simple language.

Rules:
1. Use ONLY the information in the SOURCES. Do not use outside knowledge and do not guess.
2. If a detail is not stated in the sources, leave that field empty ("" or [] or {}) and add the field name to "missing".
3. Fees: include only amounts that are explicitly written in the sources, copied exactly (with the ₹ sign). Never invent or estimate a fee.
4. Write short, simple sentences for a first-time applicant. No marketing language.
5. "documents", "onlineSteps", "offlineSteps" and "commonMistakes" are lists of short strings (one item each, no numbering).
6. "faqs": 3 to 5 useful question/answer pairs that the sources actually answer.
7. "sourceNotes": a short note for each important fact (fees, deadlines, eligibility), like "Fee ₹107 -- Source 2".
8. Return ONLY one JSON object with exactly these keys, and nothing else (no markdown fences):
name, department, category, categoryIcon, overview, eligibility, documents, fees, processingTime, onlineSteps, offlineSteps, commonMistakes, faqs, missing, sourceNotes

- category: choose the best match from this list if one fits: ${categories.join(", ") || "(none yet)"}. Otherwise propose a short new category name.
- categoryIcon: one emoji that matches the category.
- fees: an object like {"Application fee": "₹107"}.
- faqs: [{"q": "...", "a": "..."}]`;

  const user = `Service name: ${name}
${department ? `Department: ${department}\n` : ""}${notes ? `Admin notes: ${notes}\n` : ""}
SOURCES:

${sourceText}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/** Pulls the JSON object out of the AI's reply (it sometimes adds fences or chatter). */
export function parseDraftJson(content) {
  const cleaned = String(content || "").replace(/```json|```/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("The AI did not return a draft. Try again.");
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (e) {
    throw new Error("The AI's draft was cut off or malformed. Try again (or use fewer/shorter sources).");
  }
}

const str = (v) => (typeof v === "string" ? v.trim() : "");
const list = (v) => (Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean) : []);

/** Makes sure every field has the right type before it reaches the editor. */
export function normalizeDraft(raw, { name, links }) {
  const fees = {};
  if (raw.fees && typeof raw.fees === "object" && !Array.isArray(raw.fees)) {
    Object.entries(raw.fees).forEach(([label, value]) => {
      const v = typeof value === "number" ? String(value) : str(value);
      if (label.trim() && v) fees[label.trim()] = v;
    });
  }
  const faqs = Array.isArray(raw.faqs)
    ? raw.faqs.map((f) => ({ q: str(f?.q), a: str(f?.a) })).filter((f) => f.q && f.a)
    : [];

  const draftName = str(raw.name) || name;
  const draft = {
    name: draftName,
    department: str(raw.department),
    category: str(raw.category),
    categoryIcon: str(raw.categoryIcon).slice(0, 4) || "📁",
    overview: str(raw.overview),
    eligibility: str(raw.eligibility),
    documents: list(raw.documents),
    fees,
    processingTime: str(raw.processingTime),
    onlineSteps: list(raw.onlineSteps),
    offlineSteps: list(raw.offlineSteps),
    commonMistakes: list(raw.commonMistakes),
    faqs,
    officialLinks: links.filter((l) => /^https:\/\//i.test(l)),
    stateOverrides: {},
    id: slugify(draftName),
  };
  return { draft, missing: list(raw.missing), notes: list(raw.sourceNotes) };
}
