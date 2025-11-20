import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ProfileViewer from '@/components/badges/ProfileViewer.vue';
import BadgeList from '@/components/badges/BadgeList.vue';
import type { Profile } from '@/types';
import type { OB2, OB3 } from '@/types';
import { typedAssertion } from '@/../tests/test-utils';

describe('ProfileViewer.vue', () => {
  // Mock profile data
  const mockProfile: Profile & { badges: (OB2.Assertion | OB3.VerifiableCredential)[] } = {
    id: 'profile123',
    name: 'Jane Doe',
    email: 'jane.doe@example.org',
    image: 'http://example.org/profile.jpg',
    description: 'Software developer and open badges enthusiast',
    url: 'http://example.org/jane',
    type: 'Recipient',
    badges: [
      typedAssertion({
        '@context': 'https://w3id.org/openbadges/v2',
        type: 'Assertion',
        id: 'http://example.org/badge1',
        recipient: {
          identity: 'jane.doe@example.org',
          type: 'email',
          hashed: false,
        },
        badge: {
          type: 'BadgeClass',
          id: 'http://example.org/badgeclass1',
          name: 'Test Badge 1',
          description: 'A test badge description',
          image: 'http://example.org/badge1.png',
          issuer: {
            type: 'Profile',
            id: 'http://example.org/issuer',
            name: 'Test Issuer',
          },
        },
        issuedOn: '2023-01-01T00:00:00Z',
        verification: {
          type: 'hosted',
        },
      }),
      typedAssertion({
        '@context': 'https://w3id.org/openbadges/v2',
        type: 'Assertion',
        id: 'http://example.org/badge2',
        recipient: {
          identity: 'jane.doe@example.org',
          type: 'email',
          hashed: false,
        },
        badge: {
          type: 'BadgeClass',
          id: 'http://example.org/badgeclass2',
          name: 'Test Badge 2',
          description: 'Another test badge description',
          image: 'http://example.org/badge2.png',
          issuer: {
            type: 'Profile',
            id: 'http://example.org/issuer',
            name: 'Test Issuer',
          },
        },
        issuedOn: '2023-02-01T00:00:00Z',
        verification: {
          type: 'hosted',
        },
      }),
    ],
  };

  it('renders profile information correctly', () => {
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: mockProfile,
        badges: mockProfile.badges,
      },
      global: {
        stubs: {
          BadgeList: true,
        },
      },
    });

    // Check if profile name is displayed
    expect(wrapper.find('.manus-profile-name').text()).toBe('Jane Doe');

    // Check if profile description is displayed
    expect(wrapper.find('.manus-profile-description').text()).toBe(
      'Software developer and open badges enthusiast'
    );

    // Check if profile name is displayed correctly
    expect(wrapper.find('.manus-profile-name').text()).toBe('Jane Doe');

    // Check if profile description is displayed
    expect(wrapper.find('.manus-profile-description').text()).toBe(
      'Software developer and open badges enthusiast'
    );
  });

  it('passes badges to BadgeList component', () => {
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: mockProfile,
        badges: mockProfile.badges,
      },
      global: {
        stubs: {
          BadgeList: false,
        },
      },
    });

    // Find the BadgeList component
    const badgeList = wrapper.findComponent(BadgeList);

    // Check if badges are passed correctly
    expect(badgeList.props('badges')).toEqual(mockProfile.badges);
  });

  it('displays profile description when available', async () => {
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: mockProfile,
        badges: mockProfile.badges,
      },
      global: {
        stubs: {
          BadgeList: true,
        },
      },
    });

    // Description should be displayed
    expect(wrapper.find('.manus-profile-description').exists()).toBe(true);
    expect(wrapper.find('.manus-profile-description').text()).toBe(
      'Software developer and open badges enthusiast'
    );
  });

  it('respects showUrl prop', async () => {
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: mockProfile,
        badges: mockProfile.badges,
        showUrl: false,
      },
      global: {
        stubs: {
          BadgeList: true,
        },
      },
    });

    // URL should not be displayed
    expect(wrapper.find('.manus-profile-url').exists()).toBe(false);
  });

  it('respects badgeLayout prop', () => {
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: mockProfile,
        badges: mockProfile.badges,
        badgesLayout: 'list',
      },
      global: {
        stubs: {
          BadgeList: false,
        },
      },
    });

    // Find the BadgeList component
    const badgeList = wrapper.findComponent(BadgeList);

    // Check if layout prop is passed correctly
    expect(badgeList.props('layout')).toBe('list');
  });

  it('emits badge-click event when a badge is clicked', async () => {
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: mockProfile,
        badges: mockProfile.badges,
      },
    });

    // Find the BadgeList component and emit a badge-click event
    const badgeList = wrapper.findComponent(BadgeList);
    await badgeList.vm.$emit('badge-click', mockProfile.badges[0]);

    // Check if badge-click event was emitted with the correct badge
    const badgeClickEvents = wrapper.emitted('badge-click');
    expect(badgeClickEvents).toBeTruthy();
    expect(badgeClickEvents && badgeClickEvents[0][0]).toEqual(mockProfile.badges[0]);
  });

  it('displays loading state when loading prop is true', () => {
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: mockProfile,
        badges: mockProfile.badges,
        loading: true,
      },
    });

    // Check if loading message is displayed
    expect(wrapper.find('.manus-profile-loading').exists()).toBe(true);
    expect(wrapper.find('.manus-profile-loading').text()).toContain('Loading badges');
  });

  it('displays empty badges message when no badges are provided', () => {
    const wrapper = mount(ProfileViewer, {
      props: {
        profile: { id: 'empty', name: 'Empty Profile', type: 'Recipient' },
        badges: [],
      },
    });

    // Check if badges list is empty
    const badgeList = wrapper.findComponent(BadgeList);
    expect(badgeList.exists()).toBe(true);
  });

  it('displays badges section title based on profile type', () => {
    // Test with Issuer profile
    const issuerProfile = { ...mockProfile, type: 'Issuer' as const };
    const wrapper1 = mount(ProfileViewer, {
      props: {
        profile: issuerProfile,
        badges: mockProfile.badges,
      },
      global: {
        stubs: {
          BadgeList: true,
        },
      },
    });

    // Check if issuer title is displayed
    expect(wrapper1.find('.manus-section-title').text()).toBe('Badges Offered');

    // Test with Recipient profile
    const recipientProfile = { ...mockProfile, type: 'Recipient' as const };
    const wrapper2 = mount(ProfileViewer, {
      props: {
        profile: recipientProfile,
        badges: mockProfile.badges,
      },
      global: {
        stubs: {
          BadgeList: true,
        },
      },
    });

    // Check if recipient title is displayed
    expect(wrapper2.find('.manus-section-title').text()).toBe('Badges Earned');
  });
});
