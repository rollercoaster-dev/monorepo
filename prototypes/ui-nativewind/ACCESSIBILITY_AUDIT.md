# Accessibility Audit Checklist

This checklist tracks accessibility compliance for the NativeWind prototype across all 7 themes.

## Screen Reader Support

### VoiceOver (iOS)

| Feature | Status | Notes |
|---------|--------|-------|
| BadgeCard announces title | ⬜ | |
| BadgeCard announces description | ⬜ | |
| BadgeCard announces date earned | ⬜ | |
| BadgeCard announces evidence count | ⬜ | |
| BadgeCard announces category | ⬜ | |
| ThemeSwitcher announces theme name | ⬜ | |
| ThemeSwitcher announces description | ⬜ | |
| ThemeSwitcher announces selected state | ⬜ | |
| Headers identified correctly | ⬜ | |
| Navigation order is logical | ⬜ | |

### TalkBack (Android)

| Feature | Status | Notes |
|---------|--------|-------|
| BadgeCard announces title | ⬜ | |
| BadgeCard announces description | ⬜ | |
| BadgeCard announces date earned | ⬜ | |
| BadgeCard announces evidence count | ⬜ | |
| BadgeCard announces category | ⬜ | |
| ThemeSwitcher announces theme name | ⬜ | |
| ThemeSwitcher announces description | ⬜ | |
| ThemeSwitcher announces selected state | ⬜ | |
| Headers identified correctly | ⬜ | |
| Navigation order is logical | ⬜ | |

## Color Contrast (WCAG AA 4.5:1)

### Light Theme

| Element | Foreground | Background | Ratio | Pass |
|---------|------------|------------|-------|------|
| Primary text | #1a1a1a | #ffffff | | ⬜ |
| Secondary text | #4a4a4a | #f5f5f5 | | ⬜ |
| Muted text | #8a8a8a | #e5e5e5 | | ⬜ |

### Dark Theme

| Element | Foreground | Background | Ratio | Pass |
|---------|------------|------------|-------|------|
| Primary text | #fafafa | #1a1a1a | | ⬜ |
| Secondary text | #d4d4d4 | #2a2a2a | | ⬜ |
| Muted text | #8a8a8a | #3a3a3a | | ⬜ |

### High Contrast Theme

| Element | Foreground | Background | Ratio | Pass |
|---------|------------|------------|-------|------|
| Primary text | #ffffff | #000000 | 21:1 | ⬜ |
| Border visibility | #ffffff | #000000 | 21:1 | ⬜ |

### Dyslexia Theme

| Element | Foreground | Background | Ratio | Pass |
|---------|------------|------------|-------|------|
| Primary text | #3d3d3d | #f8f5e4 | | ⬜ |
| Secondary text | #5a5a5a | #f0edd6 | | ⬜ |

## Touch Target Size (WCAG 2.5.5)

| Theme | Minimum Target | Required | Pass |
|-------|----------------|----------|------|
| Light | 44px | 44px | ⬜ |
| Dark | 44px | 44px | ⬜ |
| High Contrast | 44px | 44px | ⬜ |
| Large Text | 52px | 44px | ⬜ |
| Dyslexia | 44px | 44px | ⬜ |
| Low Vision | 56px | 44px | ⬜ |
| Autism Friendly | 44px | 44px | ⬜ |

## Font Scaling

| Theme | Base Size | 200% Scale Tested | Pass |
|-------|-----------|-------------------|------|
| Light | 16px | ⬜ | ⬜ |
| Dark | 16px | ⬜ | ⬜ |
| Large Text | 20px | ⬜ | ⬜ |
| Low Vision | 24px | ⬜ | ⬜ |

## Reduced Motion

| Feature | Status | Notes |
|---------|--------|-------|
| Respects system reduced motion | ⬜ | |
| No essential animations | ⬜ | |
| Press states don't flash | ⬜ | |

## Theme-Specific Requirements

### High Contrast

| Requirement | Status | Notes |
|-------------|--------|-------|
| 2px minimum border width | ⬜ | |
| Pure black (#000000) background | ⬜ | |
| Pure white (#ffffff) text | ⬜ | |
| No gradients or subtle colors | ⬜ | |

### Low Vision

| Requirement | Status | Notes |
|-------------|--------|-------|
| 24px minimum body text | ⬜ | |
| 56px minimum touch targets | ⬜ | |
| 3px border width | ⬜ | |
| Larger border radius | ⬜ | |

### Autism Friendly

| Requirement | Status | Notes |
|-------------|--------|-------|
| No shadows | ⬜ | |
| Muted accent colors | ⬜ | |
| Minimal visual complexity | ⬜ | |
| Consistent spacing | ⬜ | |
| Small border radius (4px) | ⬜ | |

### Dyslexia Friendly

| Requirement | Status | Notes |
|-------------|--------|-------|
| Cream background (#f8f5e4) | ⬜ | |
| Increased letter spacing | ⬜ | |
| OpenDyslexic font available | ⬜ | |
| Larger base font size (18px) | ⬜ | |

## Keyboard Navigation (Web)

| Feature | Status | Notes |
|---------|--------|-------|
| Tab order logical | ⬜ | |
| Focus indicators visible | ⬜ | |
| Enter activates buttons | ⬜ | |
| Escape closes modals | ⬜ | |

## Testing Tools

- [ ] axe DevTools (Web)
- [ ] Accessibility Inspector (iOS)
- [ ] Accessibility Scanner (Android)
- [ ] Color contrast analyzer
- [ ] Screen reader testing

## Sign-off

| Tester | Date | Platform | Notes |
|--------|------|----------|-------|
| | | | |

---

**Legend:**
- ⬜ Not tested
- ✅ Pass
- ❌ Fail
- 🔄 In progress
