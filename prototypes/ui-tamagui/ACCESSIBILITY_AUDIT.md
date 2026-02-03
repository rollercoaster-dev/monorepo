# Tamagui Prototype Accessibility Audit

## VoiceOver Testing (iOS)

### BadgeCard Component
- [ ] Card reads title on focus
- [ ] Card announces "button" role
- [ ] Evidence count is announced
- [ ] Date is announced
- [ ] Focus ring is visible

### ThemeSwitcher Component
- [ ] Each theme option reads label and description
- [ ] Selected state is announced
- [ ] Focus moves logically through options
- [ ] Activating theme announces change

## TalkBack Testing (Android)

### BadgeCard Component
- [ ] Card reads title on focus
- [ ] Card announces "button" role
- [ ] Evidence count is announced
- [ ] Date is announced

### ThemeSwitcher Component
- [ ] Each theme option reads label and description
- [ ] Selected state is announced
- [ ] Focus moves logically through options

## Theme-Specific Tests

### High Contrast
- [ ] All text meets 7:1 contrast ratio (AAA)
- [ ] Focus ring is clearly visible
- [ ] No information lost without shadows

### Large Text
- [ ] Text is visibly larger than default
- [ ] Layout doesn't break with larger text
- [ ] Still readable at 200% OS text scale

### Dyslexia-Friendly
- [ ] Background is cream colored
- [ ] Letter spacing is increased
- [ ] Line height is increased
- [ ] (When fonts added) OpenDyslexic is applied

### Low Vision
- [ ] High contrast colors applied
- [ ] Touch targets are 56dp minimum
- [ ] Focus ring is 3dp and visible

### Autism-Friendly
- [ ] Colors are visibly muted/desaturated
- [ ] No shadows visible
- [ ] Animations are disabled (when added)
- [ ] Border radius is reduced (more geometric)

## Keyboard Navigation (if keyboard attached)
- [ ] Tab moves through interactive elements
- [ ] Enter/Space activates buttons
- [ ] Focus order is logical

## Notes

_Document any issues found during testing here:_

---

**Audit Date:** ___________
**Auditor:** ___________
**Device(s) Tested:** ___________
