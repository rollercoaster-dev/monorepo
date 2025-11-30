# Frontend Architecture

The openbadges-system frontend is built with Vue 3 using the Composition API, Vite for bundling, and TailwindCSS for styling.

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Vue 3 | ^3.5 | Reactive UI framework |
| Vite | ^6.0 | Build tool and dev server |
| TailwindCSS | ^4.0 | Utility-first CSS |
| unplugin-vue-router | ^0.10 | File-based routing |
| unplugin-auto-import | ^19.0 | Auto-import composables |

## Directory Structure

```
src/client/
├── components/          # Reusable UI components
│   ├── Auth/           # Authentication components
│   ├── Badge/          # Badge display components
│   ├── Navigation/     # Navigation components
│   └── User/           # User management components
├── composables/        # Composition API hooks
├── pages/              # File-based route pages
├── layouts/            # Page layouts
├── assets/             # Static assets
└── App.vue             # Root component
```

## Component Organization

### Component Hierarchy

Components are organized by domain for better discoverability:

```
components/
├── Auth/
│   ├── LoginForm.vue         # Login with WebAuthn/OAuth
│   ├── RegisterForm.vue      # User registration
│   └── OAuthProviderButton.vue  # OAuth provider buttons
├── Badge/
│   └── BadgeCard.vue         # Badge display card
├── Navigation/
│   ├── MainNavigation.vue    # Primary navigation
│   ├── UserMenu.vue          # User dropdown menu
│   └── Breadcrumb.vue        # Breadcrumb navigation
└── User/
    ├── UserCard.vue          # User profile card
    ├── UserForm.vue          # User edit form
    ├── UserList.vue          # User listing
    └── UserSearch.vue        # User search input
```

### Component Patterns

**Props and Events:**

```vue
<script setup lang="ts">
interface Props {
  user: User
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  editable: false
})

const emit = defineEmits<{
  update: [user: User]
  delete: [id: string]
}>()
</script>
```

**Composition API:**

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { user, isAuthenticated } = useAuth()

const greeting = computed(() =>
  isAuthenticated.value ? `Hello, ${user.value?.name}` : 'Welcome'
)
</script>
```

## State Management

### Composables Pattern

Instead of a centralized store, state is managed through composables that encapsulate related logic:

```
composables/
├── useAuth.ts           # Authentication state & methods
├── useBadges.ts         # Badge CRUD operations
├── useOAuth.ts          # OAuth flow handling
├── useUsers.ts          # User management
├── useFormValidation.ts # Form validation utilities
├── useImageUpload.ts    # Image upload handling
└── useNavigation.ts     # Navigation helpers
```

### useAuth Composable

The primary authentication composable manages user state:

```typescript
// composables/useAuth.ts
export function useAuth() {
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(credentials: LoginCredentials) {
    // WebAuthn or OAuth login
  }

  async function logout() {
    // Clear session
  }

  async function checkAuth() {
    // Verify current session
  }

  return {
    user,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    checkAuth
  }
}
```

### useBadges Composable

Badge operations with loading and error states:

```typescript
// composables/useBadges.ts
export function useBadges() {
  const badges = ref<Badge[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBadges() {
    loading.value = true
    try {
      const response = await fetch('/api/badges')
      badges.value = await response.json()
    } catch (e) {
      error.value = 'Failed to fetch badges'
    } finally {
      loading.value = false
    }
  }

  return { badges, loading, error, fetchBadges }
}
```

## Routing

### File-Based Routing

Routes are auto-generated from the `pages/` directory using `unplugin-vue-router`:

```
pages/
├── index.vue                    # /
├── admin/
│   ├── index.vue               # /admin
│   ├── users/
│   │   ├── index.vue           # /admin/users
│   │   └── [id].vue            # /admin/users/:id
│   ├── badges.vue              # /admin/badges
│   └── system.vue              # /admin/system
├── auth/
│   ├── login.vue               # /auth/login
│   ├── register.vue            # /auth/register
│   ├── profile.vue             # /auth/profile
│   └── callback.vue            # /auth/callback (OAuth)
├── badges/
│   ├── index.vue               # /badges
│   ├── create.vue              # /badges/create
│   ├── [id]/
│   │   ├── index.vue           # /badges/:id
│   │   ├── edit.vue            # /badges/:id/edit
│   │   └── issue.vue           # /badges/:id/issue
├── issuers/
│   ├── index.vue               # /issuers
│   └── [id].vue                # /issuers/:id
├── backpack/
│   └── index.vue               # /backpack
└── verify/
    └── [id].vue                # /verify/:id
```

### Route Guards

Authentication guards protect routes:

```typescript
// In page component
definePageMeta({
  middleware: ['auth']
})

// Or for admin routes
definePageMeta({
  middleware: ['auth', 'admin']
})
```

### Dynamic Routes

Dynamic segments use bracket notation:

```vue
<!-- pages/badges/[id]/index.vue -->
<script setup lang="ts">
const route = useRoute()
const badgeId = computed(() => route.params.id as string)

const { data: badge } = await useFetch(`/api/badges/${badgeId.value}`)
</script>
```

## Build System

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    vue(),
    VueRouter({
      routesFolder: 'src/client/pages',
      dts: 'src/client/typed-router.d.ts'
    }),
    AutoImport({
      imports: ['vue', 'vue-router'],
      dts: 'src/client/auto-imports.d.ts'
    }),
    Components({
      dirs: ['src/client/components'],
      dts: 'src/client/components.d.ts'
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/client'),
      '@server': resolve(__dirname, 'src/server')
    }
  },
  server: {
    port: 7777,
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true
      }
    }
  }
})
```

### Auto-Imports

Components and composables are auto-imported:

```vue
<!-- No imports needed! -->
<template>
  <UserCard :user="currentUser" />
</template>

<script setup lang="ts">
// `ref`, `computed`, `useAuth` are auto-imported
const { user: currentUser } = useAuth()
</script>
```

### Path Aliases

| Alias | Path | Usage |
|-------|------|-------|
| `@/` | `src/client/` | Frontend code |
| `@server/` | `src/server/` | Backend code (shared types) |

## Styling

### TailwindCSS

Utility-first CSS with custom configuration:

```vue
<template>
  <div class="flex items-center gap-4 p-6 bg-white rounded-lg shadow-md">
    <img :src="badge.image" class="w-16 h-16 rounded-full" />
    <div>
      <h3 class="text-lg font-semibold text-gray-900">{{ badge.name }}</h3>
      <p class="text-sm text-gray-600">{{ badge.description }}</p>
    </div>
  </div>
</template>
```

### Component Scoped Styles

For component-specific styles:

```vue
<style scoped>
.badge-card {
  @apply flex items-center gap-4 p-6;
  @apply bg-white rounded-lg shadow-md;
  @apply hover:shadow-lg transition-shadow;
}
</style>
```

## Development Workflow

### Hot Module Replacement

Vite provides instant HMR for Vue components:

```bash
# Start dev server
bun run dev
```

Changes to `.vue` files reflect immediately without full page reload.

### Type Checking

```bash
# Run Vue type checker
bun run type-check

# Or with watch mode
bun run type-check --watch
```

### Debugging

Vue DevTools integration for component inspection:

1. Install Vue DevTools browser extension
2. Open DevTools → Vue tab
3. Inspect component tree, state, and events

## Best Practices

### 1. Use Composables for Shared Logic

Extract reusable logic into composables:

```typescript
// Bad: Duplicated in multiple components
const loading = ref(false)
const error = ref(null)
async function fetchData() { ... }

// Good: Shared composable
const { loading, error, fetchData } = useAsyncData()
```

### 2. Type Props Explicitly

```typescript
// Good: Explicit typing
interface Props {
  badge: Badge
  showActions?: boolean
}
const props = defineProps<Props>()
```

### 3. Use Computed for Derived State

```typescript
// Good: Reactive derived state
const fullName = computed(() => `${user.firstName} ${user.lastName}`)

// Bad: Manual updates
let fullName = `${user.firstName} ${user.lastName}`
```

### 4. Clean Up Side Effects

```typescript
onMounted(() => {
  const interval = setInterval(checkAuth, 60000)

  onUnmounted(() => {
    clearInterval(interval)
  })
})
```

## Related Documentation

- [Architecture Overview](./overview.md)
- [Backend Architecture](./backend-architecture.md)
- [Integration Architecture](./integration-architecture.md)
