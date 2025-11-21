import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import IssueBadgePage from '../[id]/issue.vue'

// Mock composables
const mockIssueBadge = vi.fn()
const mockGetBadgeById = vi.fn()

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: { value: { id: 'test', email: 'test@example.com' } },
    token: { value: 'test-token' },
    isTokenValid: vi.fn(() => true),
  }),
}))

vi.mock('@/composables/useBadges', () => ({
  useBadges: () => ({ issueBadge: mockIssueBadge, getBadgeById: mockGetBadgeById }),
}))

vi.mock('@/services/openbadges', () => ({ openBadgesService: { getUserBackpack: vi.fn() } }))
vi.mock('openbadges-ui', () => ({ BadgeDisplay: { template: '<div/>' } }))

describe('Badge Issuance Validation', () => {
  let wrapper: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockGetBadgeById.mockResolvedValue({ id: 'test', name: 'Test Badge' })

    const router = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/badges/:id/issue', component: IssueBadgePage }],
    })
    router.currentRoute.value.params = { id: 'test' }

    wrapper = mount(IssueBadgePage, { global: { plugins: [router] } })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
  })

  it('should show validation error for invalid email with aria-describedby', async () => {
    const emailInput = wrapper.find('#recipient-email')
    await emailInput.setValue('invalid-email')
    await emailInput.trigger('blur')
    await nextTick()

    const errorElement = wrapper.find('#recipient-email-error')
    expect(errorElement.exists()).toBe(true)
    expect(errorElement.text()).toBe('Please enter a valid email address')
    expect(emailInput.attributes('aria-describedby')).toContain('recipient-email-error')
    expect(emailInput.classes()).toContain('border-red-300')
  })

  it('should show validation error for invalid URL', async () => {
    const evidenceInput = wrapper.find('#evidence-url')
    await evidenceInput.setValue('not-a-url')
    await evidenceInput.trigger('blur')
    await nextTick()

    const errorElement = wrapper.find('#evidence-url-error')
    expect(errorElement.exists()).toBe(true)
    expect(errorElement.text()).toBe('Please enter a valid URL')
  })

  it('should prevent submission with validation errors', async () => {
    await wrapper.find('#recipient-email').setValue('invalid')
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(mockIssueBadge).not.toHaveBeenCalled()
  })

  it('should handle server validation errors', async () => {
    mockIssueBadge.mockRejectedValueOnce(new Error('validation'))

    await wrapper.find('#recipient-email').setValue('test@example.com')
    await wrapper.find('form').trigger('submit')
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    const errorAlert = wrapper.find('[role="alert"]')
    expect(errorAlert.exists()).toBe(true)
    expect(errorAlert.text()).toContain('Please check your input and try again.')
  })
})
