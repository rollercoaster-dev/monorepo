import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import CreateBadgePage from '../create.vue'

// Mock the composables
const mockCreateBadge = vi.fn()
const mockUser = {
  id: 'test-user',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
}

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: { value: mockUser },
  }),
}))

vi.mock('@/composables/useBadges', () => ({
  useBadges: () => ({
    createBadge: mockCreateBadge,
  }),
}))

// Mock openbadges-ui components
vi.mock('openbadges-ui', () => ({
  BadgeIssuerForm: {
    name: 'BadgeIssuerForm',
    template: `
      <div data-testid="badge-issuer-form">
        <button @click="$emit('submit', mockFormData)" data-testid="submit-btn">Submit</button>
        <button @click="$emit('cancel')" data-testid="cancel-btn">Cancel</button>
      </div>
    `,
    props: ['badge', 'issuers', 'loading', 'accessible'],
    emits: ['submit', 'cancel'],
    setup() {
      return {
        mockFormData: {
          name: 'Test Badge',
          description: 'Test Description',
          image: 'https://example.com/image.png',
          criteria: { narrative: 'Test criteria' },
          tags: ['test'],
          alignment: [],
        },
      }
    },
  },
  BadgeDisplay: {
    name: 'BadgeDisplay',
    template: '<div data-testid="badge-display">Badge Preview</div>',
    props: ['badge', 'theme', 'accessible', 'show-details'],
  },
}))

// Mock openbadges-types
vi.mock('openbadges-types', () => ({
  createIRI: (url: string) => url || 'https://example.com/default',
}))

describe('CreateBadgePage', () => {
  let router: any
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/badges', component: { template: '<div>Badges</div>' } },
        { path: '/badges/:id', component: { template: '<div>Badge Detail</div>' } },
      ],
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = () => {
    return mount(CreateBadgePage, {
      global: {
        plugins: [router],
      },
    })
  }

  it('renders the page with correct title', () => {
    wrapper = createWrapper()
    expect(wrapper.find('h1').text()).toBe('Create New Badge Class')
  })

  it('renders BadgeIssuerForm component', () => {
    wrapper = createWrapper()
    const form = wrapper.find('[data-testid="badge-issuer-form"]')
    expect(form.exists()).toBe(true)
  })

  it('renders BadgeDisplay component for preview', async () => {
    wrapper = createWrapper()
    await nextTick()

    // BadgeDisplay only shows when badge has name or description
    const vm = wrapper.vm as any
    vm.badgeData.name = 'Test Badge'
    await nextTick()

    const preview = wrapper.find('[data-testid="badge-display"]')
    expect(preview.exists()).toBe(true)
  })

  it('initializes with default issuer when user is available', async () => {
    wrapper = createWrapper()
    await nextTick()

    const form = wrapper.findComponent({ name: 'BadgeIssuerForm' })
    expect(form.props('issuers')).toHaveLength(1)
    expect(form.props('issuers')[0]).toMatchObject({
      type: 'Profile',
      name: 'Test User',
      email: 'test@example.com',
    })
  })

  it('handles form submission successfully', async () => {
    const mockNewBadge = { id: 'new-badge-123' }
    mockCreateBadge.mockResolvedValueOnce(mockNewBadge)

    wrapper = createWrapper()
    await nextTick()

    const submitBtn = wrapper.find('[data-testid="submit-btn"]')
    await submitBtn.trigger('click')
    await nextTick()

    expect(mockCreateBadge).toHaveBeenCalledWith(mockUser, {
      name: 'Test Badge',
      description: 'Test Description',
      image: 'https://example.com/image.png',
      criteria: { narrative: 'Test criteria' },
      tags: ['test'],
      alignment: [],
    })

    expect(wrapper.text()).toContain('Badge created successfully!')
  })

  it('handles form submission failure', async () => {
    mockCreateBadge.mockResolvedValueOnce(null)

    wrapper = createWrapper()
    await nextTick()

    const submitBtn = wrapper.find('[data-testid="submit-btn"]')
    await submitBtn.trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('Failed to create badge. Please try again.')
  })

  it('shows loading state during submission', async () => {
    mockCreateBadge.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)))

    wrapper = createWrapper()
    await nextTick()

    const submitBtn = wrapper.find('[data-testid="submit-btn"]')
    await submitBtn.trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('Creating badge...')
    expect(wrapper.findComponent({ name: 'BadgeIssuerForm' }).props('loading')).toBe(true)
  })

  it('handles cancel action', async () => {
    const pushSpy = vi.spyOn(router, 'push')

    wrapper = createWrapper()
    await nextTick()

    const cancelBtn = wrapper.find('[data-testid="cancel-btn"]')
    await cancelBtn.trigger('click')

    expect(pushSpy).toHaveBeenCalledWith('/badges')
  })

  it('handles error during badge creation', async () => {
    mockCreateBadge.mockRejectedValueOnce(new Error('Network error'))

    wrapper = createWrapper()
    await nextTick()

    const submitBtn = wrapper.find('[data-testid="submit-btn"]')
    await submitBtn.trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('Network error')
  })
})
