// src/services/AccessibilityAudit.ts
/**
 * Utility service for performing accessibility audits on components
 * This is a simple implementation for demonstration purposes
 * Enhanced with neurodiversity considerations
 */
export class AccessibilityAudit {
  /**
   * Performs a basic accessibility audit on an element
   * @param element The element to audit
   * @returns Array of issues found
   */
  static auditElement(element: HTMLElement): Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    element: HTMLElement;
  }> {
    const issues: Array<{
      severity: 'error' | 'warning' | 'info';
      message: string;
      element: HTMLElement;
    }> = [];

    // Check for images without alt text
    const images = element.querySelectorAll('img');
    images.forEach((img) => {
      if (!img.hasAttribute('alt')) {
        issues.push({
          severity: 'error',
          message: 'Image is missing alt text',
          element: img as HTMLElement,
        });
      }
    });

    // Check for form inputs without labels
    const inputs = element.querySelectorAll('input, textarea, select');
    inputs.forEach((input) => {
      const id = input.getAttribute('id');
      if (id) {
        const label = element.querySelector(`label[for="${id}"]`);
        if (!label) {
          issues.push({
            severity: 'error',
            message: 'Form control is missing an associated label',
            element: input as HTMLElement,
          });
        }
      } else {
        issues.push({
          severity: 'error',
          message: 'Form control is missing an ID for label association',
          element: input as HTMLElement,
        });
      }
    });

    // Check for buttons without accessible names
    const buttons = element.querySelectorAll('button');
    buttons.forEach((button) => {
      if (!button.textContent?.trim() && !button.getAttribute('aria-label')) {
        issues.push({
          severity: 'error',
          message: 'Button is missing an accessible name',
          element: button as HTMLElement,
        });
      }
    });

    // Check for proper heading hierarchy
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.substring(1));
      if (previousLevel > 0 && level > previousLevel + 1) {
        issues.push({
          severity: 'warning',
          message: `Heading level skipped from h${previousLevel} to h${level}`,
          element: heading as HTMLElement,
        });
      }
      previousLevel = level;
    });

    // Check for color contrast (simplified check)
    const textElements = element.querySelectorAll(
      'p, span, div, a, button, h1, h2, h3, h4, h5, h6'
    );
    textElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const color = style.color;
      const backgroundColor = style.backgroundColor;

      // This is a simplified check - in a real implementation,
      // you would use a proper color contrast algorithm
      if (color === backgroundColor) {
        issues.push({
          severity: 'warning',
          message: 'Text color matches background color, may have insufficient contrast',
          element: el as HTMLElement,
        });
      }
    });

    // Check for interactive elements with small touch targets
    const interactiveElements = element.querySelectorAll('button, a, [role="button"]');
    interactiveElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        issues.push({
          severity: 'warning',
          message:
            'Interactive element may be too small for touch targets (should be at least 44x44px)',
          element: el as HTMLElement,
        });
      }
    });

    return issues;
  }

  /**
   * Checks if an element has proper ARIA attributes
   * @param element The element to check
   * @returns Array of issues found
   */
  static checkAriaAttributes(element: HTMLElement): Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    element: HTMLElement;
  }> {
    const issues: Array<{
      severity: 'error' | 'warning' | 'info';
      message: string;
      element: HTMLElement;
    }> = [];

    // Check for elements with ARIA roles
    const elementsWithRoles = element.querySelectorAll('[role]');
    elementsWithRoles.forEach((el) => {
      const role = el.getAttribute('role');

      // Check for common required attributes based on role
      if (role === 'checkbox' || role === 'switch') {
        if (!el.hasAttribute('aria-checked')) {
          issues.push({
            severity: 'error',
            message: `Element with role="${role}" is missing required aria-checked attribute`,
            element: el as HTMLElement,
          });
        }
      }

      if (role === 'combobox' || role === 'listbox') {
        if (!el.hasAttribute('aria-expanded')) {
          issues.push({
            severity: 'error',
            message: `Element with role="${role}" is missing required aria-expanded attribute`,
            element: el as HTMLElement,
          });
        }
      }
    });

    // Check for proper use of aria-label and aria-labelledby
    const elementsWithAriaLabel = element.querySelectorAll('[aria-label], [aria-labelledby]');
    elementsWithAriaLabel.forEach((el) => {
      const ariaLabelledby = el.getAttribute('aria-labelledby');
      if (ariaLabelledby) {
        const labelElement = document.getElementById(ariaLabelledby);
        if (!labelElement) {
          issues.push({
            severity: 'error',
            message: `aria-labelledby references non-existent ID: ${ariaLabelledby}`,
            element: el as HTMLElement,
          });
        }
      }
    });

    return issues;
  }

  /**
   * Checks keyboard navigation within an element
   * @param element The element to check
   * @returns Array of issues found
   */
  static checkKeyboardNavigation(element: HTMLElement): Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    element: HTMLElement;
  }> {
    const issues: Array<{
      severity: 'error' | 'warning' | 'info';
      message: string;
      element: HTMLElement;
    }> = [];

    // Check for elements with tabindex > 0
    const elementsWithPositiveTabindex = element.querySelectorAll('[tabindex]');
    elementsWithPositiveTabindex.forEach((el) => {
      const tabindex = parseInt(el.getAttribute('tabindex') || '0');
      if (tabindex > 0) {
        issues.push({
          severity: 'warning',
          message: `Element has tabindex=${tabindex}. Positive tabindex values should be avoided as they disrupt the natural tab order.`,
          element: el as HTMLElement,
        });
      }
    });

    // Check for visible focus styles
    const interactiveElements = element.querySelectorAll(
      'button, a, [role="button"], input, select, textarea'
    );
    interactiveElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.outlineStyle === 'none' && style.boxShadow === 'none') {
        issues.push({
          severity: 'warning',
          message: 'Interactive element may not have visible focus styles',
          element: el as HTMLElement,
        });
      }
    });

    return issues;
  }

  /**
   * Checks for cognitive accessibility issues
   * Particularly important for neurodivergent users
   * @param element The element to check
   * @returns Array of issues found
   */
  static checkCognitiveAccessibility(element: HTMLElement): Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    element: HTMLElement;
  }> {
    const issues: Array<{
      severity: 'error' | 'warning' | 'info';
      message: string;
      element: HTMLElement;
    }> = [];

    // Check for text complexity (simplified check)
    const paragraphs = element.querySelectorAll('p');
    paragraphs.forEach((p) => {
      const text = p.textContent || '';
      const words = text.split(/\s+/).filter((word) => word.length > 0);

      // Check for long sentences (more than 25 words)
      const sentences = text.split(/[.!?]\s+/);
      sentences.forEach((sentence) => {
        const sentenceWords = sentence.split(/\s+/).filter((word) => word.length > 0);
        if (sentenceWords.length > 25) {
          issues.push({
            severity: 'warning',
            message:
              'Sentence is too long (more than 25 words). Consider breaking it up for better readability.',
            element: p as HTMLElement,
          });
        }
      });

      // Check for complex words (more than 3 syllables, simplified check)
      const complexWords = words.filter((word) => {
        // Very simplified syllable count - count vowel groups
        const vowelGroups = word.toLowerCase().match(/[aeiouy]+/g);
        return vowelGroups && vowelGroups.length > 3;
      });

      if (complexWords.length > words.length * 0.1) {
        issues.push({
          severity: 'info',
          message:
            'Text contains many complex words. Consider simplifying language for better cognitive accessibility.',
          element: p as HTMLElement,
        });
      }
    });

    // Check for clear headings and structure
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0 && element.textContent && element.textContent.length > 200) {
      issues.push({
        severity: 'warning',
        message:
          'Long content without headings. Consider adding headings to improve structure and readability.',
        element,
      });
    }

    // Check for consistent navigation patterns
    const navElements = element.querySelectorAll('nav, [role="navigation"]');
    navElements.forEach((nav) => {
      const links = nav.querySelectorAll('a');
      if (links.length > 7) {
        issues.push({
          severity: 'info',
          message:
            'Navigation contains many items. Consider grouping or simplifying navigation for users with cognitive disabilities.',
          element: nav as HTMLElement,
        });
      }
    });

    // Check for clear instructions
    const forms = element.querySelectorAll('form');
    forms.forEach((form) => {
      const instructions = form.querySelectorAll('.ob-form-help, [aria-describedby]');
      if (
        instructions.length === 0 &&
        form.querySelectorAll('input, select, textarea').length > 0
      ) {
        issues.push({
          severity: 'info',
          message:
            'Form lacks clear instructions. Consider adding help text for users with cognitive disabilities.',
          element: form as HTMLElement,
        });
      }
    });

    return issues;
  }

  /**
   * Checks for sensory and perception accessibility issues
   * Important for users with sensory processing differences, autism, ADHD
   * @param element The element to check
   * @returns Array of issues found
   */
  static checkSensoryAccessibility(element: HTMLElement): Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    element: HTMLElement;
  }> {
    const issues: Array<{
      severity: 'error' | 'warning' | 'info';
      message: string;
      element: HTMLElement;
    }> = [];

    // Check for animations that might cause issues
    const animatedElements = element.querySelectorAll(
      '[class*="animate"], [class*="motion"], [class*="transition"]'
    );
    animatedElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.animation !== 'none' || style.transition !== 'none') {
        issues.push({
          severity: 'info',
          message:
            'Element has animations or transitions. Ensure users can disable animations for vestibular disorders.',
          element: el as HTMLElement,
        });
      }
    });

    // Check for potential visual overload
    const contentAreas = element.querySelectorAll(
      'section, article, div[class*="content"], div[class*="container"]'
    );
    contentAreas.forEach((area) => {
      // Check for too many different colors
      const colorElements = area.querySelectorAll('[style*="color"], [style*="background"]');
      const colors = new Set();
      colorElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        colors.add(style.color);
        colors.add(style.backgroundColor);
      });

      if (colors.size > 7) {
        // More than 7 different colors might be overwhelming
        issues.push({
          severity: 'info',
          message:
            'Content area uses many different colors. Consider simplifying the color palette for users with sensory sensitivities.',
          element: area as HTMLElement,
        });
      }

      // Check for dense content
      const childElements = area.children.length;
      const areaSize = area.getBoundingClientRect();
      const density = (childElements / (areaSize.width * areaSize.height)) * 10000;

      if (density > 1 && childElements > 10) {
        // Arbitrary threshold
        issues.push({
          severity: 'info',
          message:
            'Content area appears densely packed. Consider adding more white space for users with sensory processing issues.',
          element: area as HTMLElement,
        });
      }
    });

    // Check for flashing content (simplified check)
    const potentiallyFlashingElements = element.querySelectorAll(
      '[class*="flash"], [class*="blink"], [class*="pulse"]'
    );
    if (potentiallyFlashingElements.length > 0) {
      issues.push({
        severity: 'warning',
        message:
          "Potentially flashing or blinking content detected. Ensure content doesn't flash more than 3 times per second to avoid seizure risks.",
        element: potentiallyFlashingElements[0] as HTMLElement,
      });
    }

    return issues;
  }
}
