import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// A service is flagged "needs review" in the dashboard if it hasn't been
// touched in this many days. Purely a reminder heuristic -- it doesn't
// mean the content is actually wrong, just that it's due a look.
export const STALE_AFTER_DAYS = 90;

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

export async function deleteService(id) {
  await deleteDoc(doc(db, "services", id));
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
