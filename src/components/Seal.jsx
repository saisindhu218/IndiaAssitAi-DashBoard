import React from "react";

// An original, colorful abstract mark -- a rounded square with a gradient
// fill and a simple spark/compass glyph. Not based on any real emblem.
export default function Mark({ size = 34, className }) {
  const id = "iaGrad";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
      <path
        d="M20 9 L23.2 17.4 L31.5 20 L23.2 22.6 L20 31 L16.8 22.6 L8.5 20 L16.8 17.4 Z"
        fill="white"
        opacity="0.95"
      />
    </svg>
  );
}
