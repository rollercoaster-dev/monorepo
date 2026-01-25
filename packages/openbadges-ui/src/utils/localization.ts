/**
 * Localization utilities for Open Badges
 *
 * Handles extraction of localized strings from OB2/OB3 MultiLanguageString types
 */

/**
 * Extract a localized string from a value that may be:
 * - A plain string
 * - An array of strings (takes first)
 * - A MultiLanguageString object ({ "en": "...", "es": "...", etc. })
 *
 * @param value The value to extract a string from
 * @param preferredLanguage The preferred language code (default: "en")
 * @returns The extracted string, or empty string if not found
 *
 * @example
 * // Plain string
 * getLocalizedString("Badge Name") // "Badge Name"
 *
 * // Array of strings
 * getLocalizedString(["Badge Name", "Alternative"]) // "Badge Name"
 *
 * // MultiLanguageString
 * getLocalizedString({ "en": "Badge", "es": "Insignia" }) // "Badge"
 * getLocalizedString({ "es": "Insignia", "fr": "Badge" }, "es") // "Insignia"
 */
export function getLocalizedString(
  value: string | string[] | { [key: string]: string } | undefined,
  preferredLanguage = "en",
): string {
  if (!value) return "";

  // Plain string
  if (typeof value === "string") return value;

  // Array of strings - take first
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }

  // MultiLanguageString object
  if (typeof value === "object") {
    // Prefer specified language, fall back to English, then first available
    return (
      value[preferredLanguage] || value["en"] || Object.values(value)[0] || ""
    );
  }

  return "";
}
