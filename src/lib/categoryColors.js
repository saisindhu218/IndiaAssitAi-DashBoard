// A fixed palette of vivid hues, one assigned per category (hashed
// deterministically so the same category always gets the same color
// across sessions). Tuned for the dark navy background -- bright,
// desaturated-enough hues read as translucent bordered pills rather than
// the pale-background chips a light theme would use.

const PALETTE = [
  { text: "#F87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.35)", dot: "#F87171" }, // red
  { text: "#FB923C", bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.35)", dot: "#FB923C" }, // orange
  { text: "#FBBF24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)", dot: "#FBBF24" }, // amber
  { text: "#A3E635", bg: "rgba(163,230,53,0.12)", border: "rgba(163,230,53,0.35)", dot: "#A3E635" }, // lime
  { text: "#34D399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)", dot: "#34D399" }, // emerald
  { text: "#2DD4BF", bg: "rgba(45,212,191,0.12)", border: "rgba(45,212,191,0.35)", dot: "#2DD4BF" }, // teal
  { text: "#22D3EE", bg: "rgba(34,211,238,0.12)", border: "rgba(34,211,238,0.35)", dot: "#22D3EE" }, // cyan
  { text: "#60A5FA", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.35)", dot: "#60A5FA" }, // blue
  { text: "#A78BFA", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.35)", dot: "#A78BFA" }, // violet
  { text: "#F472B6", bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.35)", dot: "#F472B6" }, // pink
];

export function getCategoryColor(category) {
  if (!category) return PALETTE[7];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) % PALETTE.length;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
