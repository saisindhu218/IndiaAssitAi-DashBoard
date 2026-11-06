import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";

// A service is flagged "review due" in the dashboard if it hasn't been
// verified in this many days. The mobile app starts showing a "may be
// outdated" warning to users at 180 days, so review before that.
// It's a reminder only -- it doesn't mean the content is wrong.
export const STALE_AFTER_DAYS = 180;

// Fields the service form edits. Anything else stored on a service document
// is kept untouched when saving (see ServiceForm).
export const KNOWN_SERVICE_FIELDS = [
  "name",
  "department",
  "category",
  "categoryIcon",
  "overview",
  "eligibility",
  "documents",
  "fees",
  "processingTime",
  "onlineSteps",
  "offlineSteps",
  "commonMistakes",
  "faqs",
  "officialLinks",
  "stateOverrides",
  "lastUpdated",
];

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return Infinity;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

export function isStale(service) {
  return daysSince(service.lastUpdated) > STALE_AFTER_DAYS;
}

// ---- Services ----

export async function getAllServices() {
  const snap = await getDocs(collection(db, "services"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getService(id) {
  const snap = await getDoc(doc(db, "services", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveService(id, data) {
  if (!id || !id.trim()) throw new Error("Service needs an id (used as its URL-safe key).");
  const { id: _drop, ...fields } = data; // id is the doc key, not a field
  await setDoc(doc(db, "services", id.trim()), fields, { merge: false });
}

/** Marks a service as checked today without changing its content. */
export async function markServiceVerified(id) {
  const date = todayISO();
  await updateDoc(doc(db, "services", id), { lastUpdated: date });
  return date;
}

export async function deleteService(id) {
  await deleteDoc(doc(db, "services", id));
}

/**
 * Text for src/data/sampleServices.js in the mobile app, built from the live
 * catalog. Paste it over that file to refresh the app's bundled offline copy.
 */
export function buildAppCatalogFile(services) {
  const clean = [...services]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({ ...s }));
  return `// Exported from the admin dashboard on ${todayISO()}.\nexport const SAMPLE_SERVICES = ${JSON.stringify(clean, null, 2)};\n`;
}

// ---- Journeys ----

export async function getAllJourneys() {
  const snap = await getDocs(collection(db, "journeys"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getJourney(id) {
  const snap = await getDoc(doc(db, "journeys", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveJourney(id, data) {
  if (!id || !id.trim()) throw new Error("Journey needs an id.");
  const { id: _drop, ...fields } = data;
  await setDoc(doc(db, "journeys", id.trim()), fields, { merge: false });
}

export async function deleteJourney(id) {
  await deleteDoc(doc(db, "journeys", id));
}

// ---- Reports (sent by app users) ----

export async function getReports() {
  const snap = await getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(300)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function setReportResolved(id, resolved) {
  await updateDoc(doc(db, "reports", id), { resolved });
}

export async function deleteReport(id) {
  await deleteDoc(doc(db, "reports", id));
}
