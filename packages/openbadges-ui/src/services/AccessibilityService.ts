// src/services/AccessibilityService.ts
/**
 * Utility service for accessibility-related functionality
 * with enhanced support for neurodiversity considerations
 */
export class AccessibilityService {
  /**
   * Generates accessible alt text for badge images
   * @param badgeName The name of the badge
   * @returns Formatted alt text
   */
  static generateBadgeAltText(badgeName: string): string {
    return `Badge: ${badgeName}`;
  }

  /**
   * Formats a date for display in an accessible way
   * @param dateString ISO date string
   * @returns Formatted date string
   */
  static formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    } catch (e) {
      return dateString;
    }
  }

  /**
   * Gets initials from a name for avatar placeholders
   * @param name Full name
   * @param maxLength Maximum number of characters to return
   * @returns Uppercase initials
   */
  static getInitials(name: string, maxLength = 2): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, maxLength);
  }

  /**
   * Truncates text with ellipsis if it exceeds maxLength
   * @param text Text to truncate
   * @param maxLength Maximum length before truncation
   * @returns Truncated text with ellipsis if needed
   */
  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '…';
  }

  /**
   * Checks if a color has sufficient contrast against white or black
   * Simple implementation - for production use a full WCAG contrast checker
   * @param hexColor Hex color code (e.g., "#3182ce")
   * @returns Whether the color likely has sufficient contrast
   */
  static hasGoodContrast(hexColor: string): boolean {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Calculate relative luminance
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Return true if the color is likely to have good contrast
    return luminance > 128;
  }

  /**
   * Applies a theme to the document by adding a class to the body
   * @param themeName Name of the theme to apply
   */
  static applyTheme(
    themeName:
      | 'default'
      | 'dark'
      | 'high-contrast'
      | 'large-text'
      | 'dyslexia-friendly'
      | 'autism-friendly'
  ): void {
    // Remove any existing theme classes
    document.body.classList.remove(
      'ob-dark-theme',
      'ob-high-contrast-theme',
      'ob-large-text-theme',
      'ob-dyslexia-friendly-theme',
      'ob-autism-friendly-theme'
    );

    // Add the new theme class if not default
    if (themeName !== 'default') {
      document.body.classList.add(`ob-${themeName}-theme`);
    }
  }

  /**
   * Checks if reduced motion is preferred
   * @returns Whether reduced motion is preferred
   */
  static prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Simplifies text for better readability
   * Useful for users with cognitive disabilities, dyslexia, or ADHD
   * @param text The text to simplify
   * @param level The level of simplification (1-3, where 3 is most simplified)
   * @returns Simplified text
   */
  static simplifyText(text: string, level: 1 | 2 | 3 = 1): string {
    // Basic implementation - in a real app, this would use more sophisticated NLP
    if (level === 1) {
      // Light simplification - replace complex words and shorten sentences
      return text
        .replace(/\b(utilize|utilise)\b/g, 'use')
        .replace(/\b(implement|implementation)\b/g, 'use')
        .replace(/\b(additional)\b/g, 'more')
        .replace(/\b(sufficient)\b/g, 'enough')
        .replace(/\b(approximately)\b/g, 'about')
        .replace(/\b(subsequently)\b/g, 'later')
        .replace(/\b(nevertheless|nonetheless)\b/g, 'however');
    } else if (level === 2) {
      // Medium simplification - also break up longer sentences
      const simplified = text
        .replace(/\b(utilize|utilise)\b/g, 'use')
        .replace(/\b(implement|implementation)\b/g, 'use')
        .replace(/\b(additional)\b/g, 'more')
        .replace(/\b(sufficient)\b/g, 'enough')
        .replace(/\b(approximately)\b/g, 'about')
        .replace(/\b(subsequently)\b/g, 'later')
        .replace(/\b(nevertheless|nonetheless)\b/g, 'however');

      // Break up longer sentences (simple approach)
      return simplified.replace(/([.!?])\s+([A-Z])/g, '$1<br>$2');
    } else {
      // High simplification - also add visual breaks and simplify further
      const simplified = text
        .replace(/\b(utilize|utilise)\b/g, 'use')
        .replace(/\b(implement|implementation)\b/g, 'use')
        .replace(/\b(additional)\b/g, 'more')
        .replace(/\b(sufficient)\b/g, 'enough')
        .replace(/\b(approximately)\b/g, 'about')
        .replace(/\b(subsequently)\b/g, 'later')
        .replace(/\b(nevertheless|nonetheless)\b/g, 'however')
        .replace(/\b(therefore)\b/g, 'so')
        .replace(/\b(regarding)\b/g, 'about')
        .replace(/\b(concerning)\b/g, 'about')
        .replace(/\b(accordingly)\b/g, 'so');

      // Break up sentences and add more visual spacing
      return simplified.replace(/([.!?])\s+([A-Z])/g, '$1<br><br>$2');
    }
  }

  /**
   * Sets content density preference
   * Useful for users with ADHD, autism, or cognitive processing differences
   * @param density The content density preference
   */
  static setContentDensity(density: 'compact' | 'normal' | 'spacious'): void {
    // Remove any existing density classes
    document.body.classList.remove(
      'ob-density-compact',
      'ob-density-normal',
      'ob-density-spacious'
    );

    // Add the new density class
    document.body.classList.add(`ob-density-${density}`);
  }

  /**
   * Enables focus mode to reduce distractions
   * Particularly helpful for users with ADHD
   * @param enabled Whether focus mode is enabled
   */
  static setFocusMode(enabled: boolean): void {
    if (enabled) {
      document.body.classList.add('ob-focus-mode');
    } else {
      document.body.classList.remove('ob-focus-mode');
    }
  }

  /**
   * Controls animation and motion settings
   * Important for users with vestibular disorders, autism, ADHD
   * @param level The level of animation (none, minimal, full)
   */
  static setAnimationLevel(level: 'none' | 'minimal' | 'full'): void {
    // Remove any existing animation classes
    document.body.classList.remove(
      'ob-animations-none',
      'ob-animations-minimal',
      'ob-animations-full'
    );

    // Add the new animation class
    document.body.classList.add(`ob-animations-${level}`);
  }

  /**
   * Sets reading mode for improved text readability
   * Helpful for users with dyslexia, visual processing issues
   * @param mode The reading mode to apply
   */
  static setReadingMode(mode: 'default' | 'bionic' | 'ruler' | 'paragraph-focus'): void {
    // Remove any existing reading mode classes
    document.body.classList.remove(
      'ob-reading-bionic',
      'ob-reading-ruler',
      'ob-reading-paragraph-focus'
    );

    // Add the new reading mode class if not default
    if (mode !== 'default') {
      document.body.classList.add(`ob-reading-${mode}`);
    }
  }

  /**
   * Formats numbers in a way that's easier to read for people with dyscalculia
   * @param value The number to format
   * @param options Formatting options
   * @returns Formatted number string
   */
  static formatNumber(
    value: number,
    options: {
      useGrouping?: boolean;
      addVisualSeparators?: boolean;
      highlightDigits?: boolean;
    } = {}
  ): string {
    const { useGrouping = true, addVisualSeparators = false, highlightDigits = false } = options;

    // Format with locale and grouping
    let formatted = value.toLocaleString(undefined, {
      useGrouping,
    });

    // Add visual separators if requested
    if (addVisualSeparators) {
      formatted = formatted.replace(/,/g, '<span class="ob-number-separator">,</span>');
    }

    // Highlight alternating digits if requested
    if (highlightDigits) {
      let result = '';
      for (let i = 0; i < formatted.length; i++) {
        const char = formatted[i];
        if (/\d/.test(char) && i % 2 === 0) {
          result += `<span class="ob-number-highlight">${char}</span>`;
        } else {
          result += char;
        }
      }
      formatted = result;
    }

    return formatted;
  }
}
