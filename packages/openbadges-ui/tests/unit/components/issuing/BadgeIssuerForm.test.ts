import { describe, it, expect, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { OB2 } from '@/types';
import BadgeIssuerForm from '@/components/issuing/BadgeIssuerForm.vue';

// Helper to advance fake timers and flush
async function tick(ms = 0) {
  if (ms > 0) {
    vi.advanceTimersByTime(ms);
  }
  await flushPromises();
}

interface UpdatePayload { badge: Partial<OB2.BadgeClass> }

describe('BadgeIssuerForm @update event', () => {
  it('emits update with partial BadgeClass when name changes (debounced)', async () => {
    vi.useFakeTimers();

    const wrapper = mount(BadgeIssuerForm, {
      props: {
        updateDebounceMs: 300,
      },
    });

    const nameInput = wrapper.get('#badge-name');
    await nameInput.setValue('My Badge');

    // Before debounce window, nothing emitted
    expect(wrapper.emitted('update')).toBeFalsy();

    await tick(299);
    expect(wrapper.emitted('update')).toBeFalsy();

    await tick(1);
    const updates = wrapper.emitted('update');
    expect(updates).toBeTruthy();
    const lastPayload = updates?.[updates.length - 1]?.[0] as UpdatePayload;
    expect(lastPayload.badge.name).toBe('My Badge');

    vi.useRealTimers();
  });

  it('coalesces rapid changes into one emission', async () => {
    vi.useFakeTimers();

    const wrapper = mount(BadgeIssuerForm, {
      props: { updateDebounceMs: 200 },
    });

    const desc = wrapper.get('#badge-description');
    await desc.setValue('a');
    await tick(50);
    await desc.setValue('ab');
    await tick(50);
    await desc.setValue('abc');

    // Still within debounce window
    await tick(199);
    expect(wrapper.emitted('update')).toBeFalsy();

    // Now pass debounce
    await tick(1);
    const updates = wrapper.emitted('update') ?? [];
    expect(updates.length).toBe(1);
    const payload = updates[0]?.[0] as UpdatePayload;
    expect(payload.badge.description).toBe('abc');

    vi.useRealTimers();
  });

  it('emits update when tags, criteria, issuer, and image change', async () => {
    vi.useFakeTimers();

    const wrapper = mount(BadgeIssuerForm, { props: { updateDebounceMs: 50 } });

    await wrapper.get('#badge-tags').setValue('one, two, three');
    await wrapper.get('#badge-criteria').setValue('Some criteria');
    await wrapper.get('#issuer-name').setValue('Issuer Inc');
    await wrapper.get('#issuer-url').setValue('https://issuer.example');
    await wrapper.get('#badge-image').setValue('https://example.com/img.png');

    await tick(50);
    await tick(1);

    const updates = wrapper.emitted('update') ?? [];
    expect(updates.length).toBeGreaterThan(0);
    const payload = updates[updates.length - 1]?.[0] as UpdatePayload;

    expect(payload.badge.tags).toEqual(['one', 'two', 'three']);
    const c = payload.badge.criteria as unknown;
    if (
      c !== null &&
      typeof c === 'object' &&
      'narrative' in (c as Record<string, unknown>) &&
      typeof (c as { narrative?: unknown }).narrative === 'string'
    ) {
      expect((c as { narrative: string }).narrative).toBe('Some criteria');
    }
    if (typeof payload.badge.issuer === 'object') {
      expect(payload.badge.issuer?.name).toBe('Issuer Inc');
      expect((payload.badge.issuer as OB2.Profile).url).toBeDefined();
    }
    if (typeof payload.badge.image === 'object') {
      expect((payload.badge.image as OB2.Image).id).toBeDefined();
    }

    vi.useRealTimers();
  });
});

