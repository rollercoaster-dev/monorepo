// tests/integration/components/ProfileViewerIntegration.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ProfileViewer from '@/components/badges/ProfileViewer.vue';
import BadgeList from '@/components/badges/BadgeList.vue';
import BadgeDisplay from '@/components/badges/BadgeDisplay.vue';
import { createMockOB2Badge } from '../utils';
import { createIRI } from 'openbadges-types';
import type { Profile } from '@/types';

describe('ProfileViewer Integration with BadgeList and BadgeDisplay', () => {
  // Create mock profile and badges
  const mockBadges = [
    createMockOB2Badge({ id: createIRI('http://example.org/badge1') }),
    createMockOB2Badge({
      id: createIRI('http://example.org/badge2'),
      badge: {
        type: 'BadgeClass',
        id: createIRI('http://example.org/badgeclass2'),
        name: 'Test Badge 2',
        description: 'Another test badge description',
        image: createIRI('http://example.org/badge2.png'),
        criteria: {
          id: createIRI('http://example.org/criteria'),
          narrative: 'Test criteria narrative',
        },
        issuer: {
          type: 'Profile',
          id: createIRI('http://example.org/issuer'),
          name: 'Test Issuer',
        },
      },
    }),
  ];

  const mockRecipientProfile: Profile = {
    id: 'profile123',
    name: 'Jane Doe',
    email: 'jane.doe@example.org',
    image: 'http://example.org/profile.jpg',
    description: 'Software developer and open badges enthusiast',
    url: 'http://example.org/jane',
    type: 'Recipient' as const,
  };

  const mockIssuerProfile: Profile = {
    id: 'issuer123',
    name: 'Test Organization',
    email: 'info@example.org',
    image: 'http://example.org/org.jpg',
    description: 'An organization that issues badges',
    url: 'http://example.org/org',
    type: 'Issuer' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render profile information and badges correctly', () => {
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: mockRecipientProfile,
        badges: mockBadges,
      },
    });

    // Check profile information
    expect(wrapper.find('.manus-profile-name').text()).toBe('Jane Doe');
    expect(wrapper.find('.manus-profile-description').text()).toBe(
      'Software developer and open badges enthusiast'
    );

    // Check that BadgeList is rendered
    const badgeList = wrapper.findComponent(BadgeList);
    expect(badgeList.exists()).toBe(true);

    // Check that badges are passed to BadgeList
    expect(badgeList.props('badges')).toEqual(mockBadges);

    // Check that BadgeDisplay components are rendered within BadgeList
    const badgeDisplays = wrapper.findAllComponents(BadgeDisplay);
    expect(badgeDisplays.length).toBe(2);
  });

  it('should display different section titles based on profile type', () => {
    // Test with Recipient profile
    const recipientWrapper = mount(ProfileViewer, {
      props: {
        profile: mockRecipientProfile,
        badges: mockBadges,
      },
    });
    expect(recipientWrapper.find('.manus-section-title').text()).toBe('Badges Earned');

    // Test with Issuer profile
    const issuerWrapper = mount(ProfileViewer, {
      props: {
        profile: mockIssuerProfile,
        badges: mockBadges,
      },
    });
    expect(issuerWrapper.find('.manus-section-title').text()).toBe('Badges Offered');
  });

  it('should pass layout prop from ProfileViewer to BadgeList', () => {
    // Test with grid layout
    const gridWrapper = mount(ProfileViewer, {
      props: {
        profile: mockRecipientProfile,
        badges: mockBadges,
        badgesLayout: 'grid',
      },
    });
    expect(gridWrapper.findComponent(BadgeList).props('layout')).toBe('grid');

    // Test with list layout
    const listWrapper = mount(ProfileViewer, {
      props: {
        profile: mockRecipientProfile,
        badges: mockBadges,
        badgesLayout: 'list',
      },
    });
    expect(listWrapper.findComponent(BadgeList).props('layout')).toBe('list');
  });

  it('should pass interactive prop from ProfileViewer to BadgeList', () => {
    // Test with interactive badges
    const interactiveWrapper = mount(ProfileViewer, {
      props: {
        profile: mockRecipientProfile,
        badges: mockBadges,
        badgesInteractive: true,
      },
    });
    expect(interactiveWrapper.findComponent(BadgeList).props('interactive')).toBe(true);

    // Test with non-interactive badges
    const nonInteractiveWrapper = mount(ProfileViewer, {
      props: {
        profile: mockRecipientProfile,
        badges: mockBadges,
        badgesInteractive: false,
      },
    });
    expect(nonInteractiveWrapper.findComponent(BadgeList).props('interactive')).toBe(false);
  });

  it('should propagate badge-click events from BadgeList to ProfileViewer', async () => {
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: mockRecipientProfile,
        badges: mockBadges,
        badgesInteractive: true,
      },
    });

    // Get the BadgeList component
    const badgeList = wrapper.findComponent(BadgeList);

    // Emit a badge-click event from BadgeList
    await badgeList.vm.$emit('badge-click', mockBadges[0]);

    // Check that ProfileViewer propagated the event
    const badgeClickEvents = wrapper.emitted('badge-click');
    expect(badgeClickEvents).toBeTruthy();
    expect(badgeClickEvents && badgeClickEvents[0][0]).toEqual(mockBadges[0]);
  });

  it('should handle badge click through the entire component chain', async () => {
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: mockRecipientProfile,
        badges: mockBadges,
        badgesInteractive: true,
      },
    });

    // Get the first BadgeDisplay component
    const badgeDisplay = wrapper.findAllComponents(BadgeDisplay)[0];

    // Trigger a click on the BadgeDisplay
    await badgeDisplay.trigger('click');

    // Check that the click event propagated through BadgeList to ProfileViewer
    const badgeClickEvents2 = wrapper.emitted('badge-click');
    expect(badgeClickEvents2).toBeTruthy();
    expect(badgeClickEvents2 && badgeClickEvents2[0][0]).toEqual(mockBadges[0]);
  });

  it('should handle pagination correctly', async () => {
    // Create an array of 5 badges
    const manyBadges = Array(5)
      .fill(null)
      .map((_, index) =>
        createMockOB2Badge({ id: createIRI(`http://example.org/badge${index + 1}`) })
      );

    const wrapper = mount(ProfileViewer, {
      props: {
        profile: mockRecipientProfile,
        badges: manyBadges,
        pageSize: 2,
        showPagination: true,
      },
    });

    // Get the BadgeList component
    const badgeList = wrapper.findComponent(BadgeList);

    // Check that pagination props are passed correctly
    expect(badgeList.props('pageSize')).toBe(2);
    expect(badgeList.props('showPagination')).toBe(true);

    // Initially, only the first 2 badges should be displayed
    const badgeDisplays = wrapper.findAllComponents(BadgeDisplay);
    expect(badgeDisplays.length).toBe(2);

    // Click the next page button
    await wrapper.find('.manus-pagination-button:last-child').trigger('click');

    // Check that the page-change event was emitted from BadgeList
    expect(badgeList.emitted('page-change')).toBeTruthy();
  });

  it('should handle loading state correctly', () => {
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: mockRecipientProfile,
        badges: mockBadges,
        loading: true,
      },
    });

    // Check that loading message is displayed
    expect(wrapper.find('.manus-profile-loading').exists()).toBe(true);
    expect(wrapper.find('.manus-profile-loading').text()).toContain('Loading badges');

    // BadgeList should not be rendered when loading
    expect(wrapper.findComponent(BadgeList).exists()).toBe(false);
  });

  it('should display profile image when available', () => {
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: mockRecipientProfile,
        badges: mockBadges,
      },
    });

    // Check that profile image is displayed
    const profileImage = wrapper.find('.manus-profile-image');
    expect(profileImage.exists()).toBe(true);
    expect(profileImage.attributes('src')).toBe('http://example.org/profile.jpg');
    expect(profileImage.attributes('alt')).toBe("Jane Doe's avatar");
  });

  it('should display initials when profile image is not available', () => {
    const profileWithoutImage = { ...mockRecipientProfile, image: '' };
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: profileWithoutImage,
        badges: mockBadges,
      },
    });

    // Check that initials placeholder is displayed
    const initialsPlaceholder = wrapper.find('.manus-profile-image-placeholder');
    expect(initialsPlaceholder.exists()).toBe(true);
    expect(initialsPlaceholder.text()).toBe('JD'); // Jane Doe's initials
  });

  it('should format URL correctly for display', () => {
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: mockRecipientProfile,
        badges: mockBadges,
      },
    });

    // Check that URL is formatted correctly (protocol removed)
    const urlElement = wrapper.find('.manus-profile-detail-value[href="http://example.org/jane"]');
    expect(urlElement.exists()).toBe(true);
    expect(urlElement.text()).toContain('example.org/jane');
  });

  it('should use the badges-list slot when provided', () => {
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: mockRecipientProfile,
        badges: mockBadges,
      },
      slots: {
        'badges-list': `
          <template #badges-list="{ badges }">
            <div class="custom-badges-list">
              <p>Custom badges list with {{ badges.length }} badges</p>
            </div>
          </template>
        `,
      },
    });

    // Check that custom slot content is rendered
    expect(wrapper.find('.custom-badges-list').exists()).toBe(true);
    expect(wrapper.find('.custom-badges-list p').text()).toBe('Custom badges list with 2 badges');

    // BadgeList should not be rendered when using a custom slot
    expect(wrapper.findComponent(BadgeList).exists()).toBe(false);
  });
});
