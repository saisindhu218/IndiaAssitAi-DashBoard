// Talks to your free Cloudflare Worker (see /worker). Every call carries the
// admin's Firebase login, and the worker only accepts the admin email.
import { auth } from "./firebase";

const BASE = (import.meta.env.VITE_AI_PROXY_URL || "").trim().replace(/\/+$/, "");
export const proxyConfigured = !!BASE;

// Same order the mobile app uses; if Groq retires one, the next is tried.
const DRAFT_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.6-27b", "openai/gpt-oss-20b"];

async function call(path, options = {}) {
  if (!BASE) throw new Error("VITE_AI_PROXY_URL is not set in the admin .env file (see worker/README.md).");
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in again.");
  const token = await user.getIdToken();
  try {
    return await fetch(BASE + path, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
  } catch (e) {
    throw new Error("Couldn't reach the worker. Check VITE_AI_PROXY_URL and your internet connection.");
  }
}

async function readError(res) {
  const data = await res.json().catch(() => null);
  if (res.status === 401) return "Not signed in to the worker. Log out and log in again.";
  if (res.status === 403) return "The worker says you are not the admin. Check ADMIN_EMAIL in worker/wrangler.toml.";
  return data?.error || `The worker answered with status ${res.status}.`;
}

/** Downloads an official web page through the worker (the browser can't do this itself). */
export async function fetchOfficialPage(url) {
  const res = await call("/fetch?url=" + encodeURIComponent(url));
  if (!res.ok) throw new Error(await readError(res));
  return { html: await res.text(), finalUrl: res.headers.get("X-Final-Url") || url };
}

/** Asks the AI to write the draft. Returns the model's text reply. */
export async function askDraftModel(messages) {
  let lastError = null;
  for (const model of DRAFT_MODELS) {
    const res = await call("/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 4000 }),
    });
    if (res.status === 429) throw new Error("The free AI limit was reached. Wait a minute and try again.");
    if (res.status === 401 || res.status === 403) throw new Error(await readError(res));
    if (!res.ok) {
      const text = await res.text();
      lastError = new Error(`AI error ${res.status}: ${text.slice(0, 200)}`);
      if (res.status === 404 || (res.status === 400 && /model/i.test(text))) continue; // try the next model
      throw lastError;
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    return content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  }
  throw lastError || new Error("No AI model is available right now.");
}

export async function getWatchChanges() {
  const res = await call("/watch/changes");
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function syncWatchList(items) {
  const res = await call("/watch/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function dismissWatchChange(id) {
  const res = await call("/watch/dismiss", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(await readError(res));
}
