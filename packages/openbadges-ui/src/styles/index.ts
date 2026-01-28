// src/styles/index.ts
// Main entry point for styles
//
// Import order matters:
//   1. tokens  – foundational + semantic + component defaults (:root)
//   2. themes  – theme class overrides (no :root block)
//   3. accessibility – a11y utilities and media queries
import "./tokens.css";
import "./themes.css";
import "./accessibility.css";
