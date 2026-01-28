// src/styles/index.ts
// Main entry point for styles
//
// Import order matters:
//   1. fonts   – @font-face declarations and font family variables
//   2. tokens  – foundational + semantic + component defaults (:root)
//   3. themes  – theme class overrides (no :root block)
//   4. accessibility – a11y utilities and media queries
import "./fonts.css";
import "./tokens.css";
import "./themes.css";
import "./accessibility.css";
