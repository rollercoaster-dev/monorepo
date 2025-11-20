# Neurodiversity Considerations in OpenBadges UI

This document provides guidance on using the neurodiversity features in the OpenBadges UI component library to create more accessible and inclusive experiences for neurodivergent users.

## Introduction

Neurodiversity refers to the natural variation in human brain function and behavioral traits. Neurodivergent individuals may include those with:

- ADHD (Attention Deficit Hyperactivity Disorder)
- Autism Spectrum Conditions
- Dyslexia
- Dyscalculia
- Dyspraxia
- Tourette's Syndrome
- And other cognitive differences

The OpenBadges UI library includes features specifically designed to support neurodivergent users, making the interface more accessible and user-friendly for everyone.

## Features Overview

### 1. Specialized Themes

The library includes several themes designed for specific neurodivergent needs:

- **Dyslexia-friendly Theme**: Improves readability with adjusted typography, spacing, and colors
- **ADHD-friendly Theme**: Reduces distractions and provides clear visual hierarchy
- **Autism-friendly Theme**: Creates predictable layouts with reduced sensory stimulation

To apply these themes:

```typescript
import { AccessibilityService } from 'openbadges-ui';

// Apply a theme
AccessibilityService.applyTheme('dyslexia-friendly');
AccessibilityService.applyTheme('high-contrast');
AccessibilityService.applyTheme('autism-friendly');

// Reset to default theme
AccessibilityService.applyTheme('default');
```

### 2. Content Density Controls

Adjustable content density helps users with sensory processing differences and attention-related conditions:

```typescript
// Set content density
AccessibilityService.setContentDensity('compact');
AccessibilityService.setContentDensity('normal');
AccessibilityService.setContentDensity('spacious');
```

### 3. Focus Mode

Focus mode helps reduce distractions by dimming non-focused content, particularly helpful for users with ADHD:

```typescript
// Enable focus mode
AccessibilityService.setFocusMode(true);

// Disable focus mode
AccessibilityService.setFocusMode(false);
```

### 4. Animation Controls

Control animation and motion for users with vestibular disorders or sensory sensitivities:

```typescript
// Set animation level
AccessibilityService.setAnimationLevel('none');
AccessibilityService.setAnimationLevel('minimal');
AccessibilityService.setAnimationLevel('full');
```

### 5. Reading Modes

Special reading modes to assist users with dyslexia and visual processing differences:

```typescript
// Set reading mode
AccessibilityService.setReadingMode('bionic');
AccessibilityService.setReadingMode('ruler');
AccessibilityService.setReadingMode('paragraph-focus');
AccessibilityService.setReadingMode('default');
```

### 6. Text Simplification

Simplify text for better readability for users with cognitive disabilities:

```typescript
// Simplify text with different levels
const simplifiedText = AccessibilityService.simplifyText(complexText, 1); // Light simplification
const moreSimplifiedText = AccessibilityService.simplifyText(complexText, 2); // Medium simplification
const highlySimplifiedText = AccessibilityService.simplifyText(complexText, 3); // High simplification
```

### 7. Number Formatting for Dyscalculia

Format numbers to be more readable for users with dyscalculia:

```typescript
// Format numbers with visual aids
const formattedNumber = AccessibilityService.formatNumber(12345, {
  useGrouping: true,
  addVisualSeparators: true,
  highlightDigits: true
});
```

## Best Practices

### For ADHD Users

1. **Reduce Distractions**
   - Use focus mode for important content
   - Minimize animations and motion
   - Provide clear visual hierarchy

2. **Support Executive Function**
   - Break tasks into smaller steps
   - Provide clear instructions
   - Use progress indicators

3. **Manage Information Load**
   - Use progressive disclosure
   - Chunk information
   - Provide summaries

### For Autistic Users

1. **Create Predictable Experiences**
   - Maintain consistent layouts
   - Provide clear navigation
   - Avoid unexpected changes

2. **Reduce Sensory Overload**
   - Use the autism-friendly theme
   - Minimize animations
   - Avoid bright colors and high contrast (unless needed for other accessibility reasons)

3. **Be Literal and Clear**
   - Avoid idioms and metaphors
   - Provide explicit instructions
   - Use plain language

### For Users with Dyslexia

1. **Improve Readability**
   - Use the dyslexia-friendly theme
   - Enable bionic reading mode
   - Provide adequate spacing

2. **Support Text Comprehension**
   - Simplify complex text
   - Use clear headings and structure
   - Provide alternatives to text when possible

### For Users with Dyscalculia

1. **Make Numbers More Accessible**
   - Use the number formatting features
   - Provide visual representations of numerical data
   - Avoid complex calculations

## Accessibility Audit

The library includes an enhanced `AccessibilityAudit` service that can check for neurodiversity-related accessibility issues:

```typescript
import { AccessibilityAudit } from 'openbadges-ui';

// Check for cognitive accessibility issues
const cognitiveIssues = AccessibilityAudit.checkCognitiveAccessibility(element);

// Check for sensory accessibility issues
const sensoryIssues = AccessibilityAudit.checkSensoryAccessibility(element);
```

## Resources

- [WCAG Cognitive Accessibility Guidelines](https://www.w3.org/TR/coga-usable/)
- [UK Government Dos and Don'ts for Designing for Neurodiversity](https://accessibility.blog.gov.uk/2016/09/02/dos-and-donts-on-designing-for-accessibility/)
- [Neurodiversity Design System](https://www.neurodiversity.design/)
- [Cognitive UX Design Principles](https://www.linkedin.com/pulse/cognitive-ux-design-principles-from-neurodivergent-ford-williams)
- [Resources for Cognitive Accessibility](https://stephaniewalter.design/blog/neurodiversity-and-ux-essential-resources-for-cognitive-accessibility/)

## Feedback and Contributions

We welcome feedback and contributions to improve our neurodiversity features. Please submit issues or pull requests to our GitHub repository.
