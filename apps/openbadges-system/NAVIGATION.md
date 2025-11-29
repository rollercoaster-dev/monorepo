# Navigation System Documentation

## Overview

This document describes the comprehensive navigation system implemented for the OpenBadges application, following modern web development best practices with a focus on accessibility and user experience.

## Features

### 🎯 **Core Navigation Features**

- **Hierarchical Menu Structure** - Multi-level navigation with dropdown menus
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Accessibility First** - WCAG 2.1 AA compliant with proper ARIA attributes
- **Keyboard Navigation** - Full keyboard support with focus management
- **User Authentication States** - Dynamic menus based on login status
- **Breadcrumb Navigation** - Contextual navigation path indicators
- **Mobile-First Design** - Touch-friendly mobile navigation

### 🔧 **Technical Implementation**

- **Vue 3 Composition API** - Modern reactive state management
- **TypeScript Support** - Full type safety throughout
- **Heroicons Integration** - Consistent icon system
- **Tailwind CSS Styling** - Utility-first responsive design
- **Smooth Animations** - Vue transitions for enhanced UX

## Components

### 1. MainNavigation.vue

**Location:** `src/client/components/Navigation/MainNavigation.vue`

The primary navigation component featuring:

- Logo/brand with home link
- Hierarchical menu structure
- User authentication menu
- Mobile hamburger menu
- Dropdown menus with keyboard support
- Screen reader optimizations

**Key Features:**

- Automatic active state detection
- Role-based menu filtering
- Click-outside closing behavior
- Escape key handling
- Focus management

### 2. UserMenu.vue

**Location:** `src/client/components/Navigation/UserMenu.vue`

User-specific navigation component with:

- Authentication state management
- User profile dropdown
- Admin menu section (role-based)
- Notification indicators
- Sign in/out functionality

**Authentication States:**

- **Not Logged In:** Sign In/Sign Up buttons
- **Logged In:** User avatar, profile menu, notifications
- **Admin Users:** Additional admin panel access

### 3. Breadcrumb.vue

**Location:** `src/client/components/Navigation/Breadcrumb.vue`

Contextual navigation breadcrumbs featuring:

- Dynamic route-based generation
- Support for nested routes
- Truncation for long paths
- Accessible navigation trail

**Supported Routes:**

- Static routes (badges, issuers, admin)
- Dynamic routes (badge/:id, issuer/:id)
- Nested routes (badges/:id/edit, badges/:id/issue)

## Navigation Structure

### Primary Navigation

```
┌─ Dashboard (/)
├─ Badges
│  ├─ Browse Badges (/badges)
│  ├─ Create Badge (/badges/create)
│  └─ Issued Badges (/badges/issued)
├─ Issuers
│  ├─ Browse Issuers (/issuers)
│  ├─ Create Issuer (/issuers/create)
│  └─ Manage Issuers (/issuers/manage)
└─ My Backpack (/backpack)
```

### User Menu

```
┌─ Profile (/auth/profile)
├─ My Backpack (/backpack)
├─ Issued Badges (/badges/issued)
├─ Settings (/settings)
└─ [Admin Section] (if admin)
   ├─ Dashboard (/admin)
   ├─ Users (/admin/users)
   ├─ Badges (/admin/badges)
   └─ System (/admin/system)
```

## Accessibility Features

### ✅ **WCAG 2.1 AA Compliance**

- **Keyboard Navigation:** Full keyboard support with tab order
- **Screen Reader Support:** Proper ARIA labels and roles
- **Focus Management:** Visible focus indicators and logical flow
- **Color Contrast:** Meets minimum contrast ratios
- **Semantic HTML:** Proper use of nav, button, and link elements

### 🎹 **Keyboard Shortcuts**

- **Tab/Shift+Tab:** Navigate through menu items
- **Enter/Space:** Activate buttons and links
- **Escape:** Close open dropdowns and mobile menu
- **Arrow Keys:** Navigate within dropdown menus

### 📱 **Mobile Accessibility**

- **Touch-Friendly:** Minimum 44px touch targets
- **Gesture Support:** Swipe gestures for mobile navigation
- **Responsive Text:** Scalable font sizes
- **High Contrast Mode:** Support for system accessibility settings

## Responsive Design

### 📱 **Mobile (< 768px)**

- Hamburger menu with slide-out navigation
- Stacked menu items
- Touch-optimized spacing
- Simplified user menu

### 💻 **Desktop (≥ 768px)**

- Horizontal navigation bar
- Dropdown menus
- Hover states
- Full user menu with avatar

### 🎨 **Visual Design**

- **Modern Aesthetic:** Clean, minimalist design
- **Consistent Spacing:** 8px grid system
- **Smooth Transitions:** 200ms ease-out animations
- **Color Palette:** Blue primary, gray neutrals
- **Typography:** Inter font family for readability

## Performance Optimizations

### ⚡ **Loading Performance**

- **Code Splitting:** Route-based lazy loading
- **Tree Shaking:** Unused code elimination
- **Icon Optimization:** SVG sprites for icons
- **CSS Purging:** Unused styles removal

### 🔄 **Runtime Performance**

- **Memoization:** Cached computed properties
- **Event Delegation:** Efficient event handling
- **Debounced Search:** Optimized search interactions
- **Virtual Scrolling:** For large menu lists

## Security Considerations

### 🔒 **Authentication Security**

- **Role-Based Access:** Menu items filtered by user permissions
- **Route Guards:** Protected routes with authentication checks
- **Token Validation:** JWT token verification
- **Session Management:** Secure session handling

### 🛡️ **XSS Prevention**

- **Input Sanitization:** All user inputs sanitized
- **CSP Headers:** Content Security Policy implementation
- **Safe HTML:** Vue's built-in XSS protection
- **Trusted Sources:** Only trusted icon and asset sources

## Development Guidelines

### 📝 **Adding New Navigation Items**

1. **Update Navigation Config:**

```typescript
const navigationItems = [
  {
    id: 'new-item',
    label: 'New Feature',
    to: '/new-feature',
    icon: NewIcon,
    requiresAuth: true, // Optional
    requiresAdmin: false, // Optional
  },
]
```

2. **Add Breadcrumb Support:**

```typescript
const routeBreadcrumbs = {
  '/new-feature': [{ label: 'New Feature' }],
}
```

3. **Update Route Permissions:**

```typescript
const canAccessRoute = (item: NavigationItem) => {
  // Add permission logic
}
```

### 🧪 **Testing Navigation**

```typescript
// Test navigation accessibility
await page.keyboard.press('Tab')
await page.keyboard.press('Enter')
expect(page.url()).toContain('/badges')

// Test mobile navigation
await page.setViewportSize({ width: 375, height: 667 })
await page.click('[aria-label="Toggle navigation menu"]')
```

## Browser Support

### ✅ **Supported Browsers**

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 📱 **Mobile Support**

- iOS Safari 14+
- Android Chrome 90+
- Samsung Internet 14+

## Future Enhancements

### 🚀 **Planned Features**

- **Search Integration:** Global search in navigation
- **Favorites/Bookmarks:** User-customizable quick access
- **Notifications:** Real-time notification system
- **Themes:** Dark mode support
- **Internationalization:** Multi-language support
- **Advanced Analytics:** Navigation tracking and optimization

### 🔄 **Continuous Improvements**

- **Performance Monitoring:** Core Web Vitals tracking
- **A/B Testing:** Navigation layout experiments
- **User Feedback:** Accessibility and usability testing
- **Progressive Enhancement:** Advanced features for capable browsers

## Getting Started

1. **Install Dependencies** (from monorepo root):

```bash
bun install
```

2. **Run Development Server:**

```bash
bun dev
```

3. **Build for Production:**

```bash
bun run build
```

The navigation system is now fully integrated and ready for use!
