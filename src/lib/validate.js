// Pure validation helpers (no Firebase), used by the service and journey forms.
// Mistakes here would otherwise reach the mobile app and break a screen.

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HTTPS_URL = /^https:\/\/[^\s/$.?#][^\s]*\.[^\s]{2,}$/i;

export function isValidId(id) {
  return ID_PATTERN.test(id || "");
}

export function isValidLink(url) {
  return HTTPS_URL.test((url || "").trim());
}

/**
 * Checks a service payload.
 * errors   -> block saving (the app could break or show wrong things)
 * warnings -> allowed, but the admin is asked to confirm
 */
export function validateService(p) {
  const errors = [];
  const warnings = [];

  const required = [
    ["name", "Name"],
    ["department", "Department"],
    ["category", "Category"],
    ["overview", "Overview"],
    ["eligibility", "Eligibility"],
    ["processingTime", "Processing time"],
  ];
  required.forEach(([key, label]) => {
    if (!String(p[key] || "").trim()) errors.push(`${label} is required.`);
  });

  (p.officialLinks || []).forEach((url) => {
    if (!isValidLink(url)) {
      errors.push(`Official link "${url}" must be a full address starting with https:// (for example https://uidai.gov.in).`);
    }
  });

  Object.entries(p.fees || {}).forEach(([label, value]) => {
    if (!label.trim()) errors.push("Every fee needs a label (for example \"Application fee\").");
    if (!String(value || "").trim()) errors.push(`Fee "${label}" has no amount or description.`);
  });

  (p.faqs || []).forEach((f, i) => {
    if (!String(f.q || "").trim() || !String(f.a || "").trim()) {
      errors.push(`FAQ ${i + 1} needs both a question and an answer.`);
    }
  });

  if (p.stateOverrides && (typeof p.stateOverrides !== "object" || Array.isArray(p.stateOverrides))) {
    errors.push("State overrides must be a JSON object, like {\"Karnataka\": {...}}.");
  } else {
    Object.entries(p.stateOverrides || {}).forEach(([state, value]) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        errors.push(`State override for "${state}" must be an object.`);
      }
    });
  }

  if (!(p.officialLinks || []).length) warnings.push("No official link -- users will have nowhere to verify this.");
  if (!(p.documents || []).length) warnings.push("No required documents listed.");
  if (!(p.onlineSteps || []).length && !(p.offlineSteps || []).length) warnings.push("No steps (online or offline) listed.");
  if (!(p.faqs || []).length) warnings.push("No FAQs.");

  return { errors, warnings };
}

/** Checks a journey; `serviceIds` is the list of ids that really exist. */
export function validateJourney(p, serviceIds) {
  const errors = [];
  if (!String(p.title || "").trim()) errors.push("Title is required.");
  if (!(p.steps || []).length) errors.push("Add at least one step.");
  const known = new Set(serviceIds);
  const missing = (p.steps || []).map((s) => s.serviceId).filter((id) => !known.has(id));
  if (missing.length) {
    errors.push(`These steps point to services that don't exist: ${[...new Set(missing)].join(", ")}. Check the spelling of the service id.`);
  }
  return { errors };
}
