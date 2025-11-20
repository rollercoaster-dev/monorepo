import { createApp } from 'vue';
import { OpenBadgesUIPlugin } from '../../dist/openbadges-ui.es.js';
import '../../dist/style.css';

// Sample profile data with OB2 badges
const profileData = {
  id: 'profile123',
  name: 'Jane Doe',
  email: 'jane.doe@example.org',
  image: 'https://via.placeholder.com/150?text=Jane+Doe',
  description: 'Software developer and open badges enthusiast with expertise in web technologies and a passion for digital credentials.',
  url: 'https://example.org/jane',
  badges: [
    // OB2 Badge 1
    {
      "@context": "https://w3id.org/openbadges/v2",
      "type": "Assertion",
      "id": "http://example.org/assertions/123",
      "recipient": {
        "identity": "jane.doe@example.org",
        "type": "email",
        "hashed": false
      },
      "badge": {
        "type": "BadgeClass",
        "id": "http://example.org/badges/coding-skills",
        "name": "Coding Skills",
        "description": "This badge recognizes exceptional coding skills and problem-solving abilities.",
        "image": "https://via.placeholder.com/150?text=Coding+Skills",
        "criteria": {
          "narrative": "The recipient demonstrated proficiency in JavaScript, TypeScript, and Vue.js."
        },
        "issuer": {
          "type": "Profile",
          "id": "http://example.org/issuers/tech-academy",
          "name": "Tech Academy",
          "url": "http://example.org/tech-academy"
        }
      },
      "issuedOn": "2023-05-15T12:00:00Z",
      "expires": "2025-05-15T12:00:00Z",
      "verification": {
        "type": "hosted"
      }
    },
    // OB2 Badge 2
    {
      "@context": "https://w3id.org/openbadges/v2",
      "type": "Assertion",
      "id": "http://example.org/assertions/456",
      "recipient": {
        "identity": "jane.doe@example.org",
        "type": "email",
        "hashed": false
      },
      "badge": {
        "type": "BadgeClass",
        "id": "http://example.org/badges/design-thinking",
        "name": "Design Thinking",
        "description": "This badge certifies proficiency in design thinking methodologies and user-centered design.",
        "image": "https://via.placeholder.com/150?text=Design+Thinking",
        "criteria": {
          "narrative": "The recipient demonstrated expertise in user research, prototyping, and iterative design."
        },
        "issuer": {
          "type": "Profile",
          "id": "http://example.org/issuers/design-institute",
          "name": "Design Institute",
          "url": "http://example.org/design-institute"
        }
      },
      "issuedOn": "2023-07-20T12:00:00Z",
      "verification": {
        "type": "hosted"
      }
    },
    // OB3 Badge
    {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://purl.imsglobal.org/spec/ob/v3p0/context.json"
      ],
      "id": "http://example.org/credentials/3732",
      "type": ["VerifiableCredential", "OpenBadgeCredential"],
      "issuer": {
        "id": "http://example.org/issuers/tech-university",
        "type": "Profile",
        "name": "Tech University",
        "url": "http://example.org/tech-university",
        "image": "https://via.placeholder.com/50?text=TU"
      },
      "issuanceDate": "2023-08-10T12:00:00Z",
      "expirationDate": "2026-08-10T12:00:00Z",
      "credentialSubject": {
        "id": "did:example:jane.doe",
        "type": ["AchievementSubject"],
        "achievement": {
          "id": "http://example.org/achievements/advanced-web-dev",
          "type": ["Achievement"],
          "name": "Advanced Web Development",
          "description": "This credential certifies advanced knowledge and skills in modern web development technologies.",
          "image": "https://via.placeholder.com/150?text=Web+Dev",
          "criteria": {
            "narrative": "The recipient demonstrated expertise in HTML5, CSS3, JavaScript, and modern frameworks."
          }
        }
      }
    }
  ]
};

// Available themes
const themes = [
  { id: 'default', name: 'Default Theme' },
  { id: 'dark', name: 'Dark Theme' },
  { id: 'high-contrast', name: 'High Contrast Theme' },
  { id: 'large-text', name: 'Large Text Theme' },
  { id: 'dyslexia', name: 'Dyslexia-Friendly Theme' },
  { id: 'adhd', name: 'ADHD-Friendly Theme' },
  { id: 'autism', name: 'Autism-Friendly Theme' }
];

// Create the Vue app
const app = createApp({
  data() {
    return {
      profile: profileData,
      themes,
      selectedTheme: 'default',
      badgeLayout: 'grid',
      showDescription: true,
      showUrl: true,
      interactiveBadges: true,
      selectedBadge: null
    };
  },
  computed: {
    codeExample() {
      return `<template>
  <profile-viewer 
    :profile="profile" 
    :badge-layout="${this.badgeLayout}"
    :show-description="${this.showDescription}"
    :show-url="${this.showUrl}"
    :interactive-badges="${this.interactiveBadges}"
    title="User Profile"
    @badge-click="handleBadgeClick"
  />
</template>

<script>
import { ProfileViewer } from 'openbadges-ui';

export default {
  components: {
    ProfileViewer
  },
  methods: {
    handleBadgeClick(badge) {
      console.log('Badge clicked:', badge);
      // Handle badge click event
    }
  }
}
</script>`;
    }
  },
  methods: {
    applyTheme() {
      // Apply the selected theme
      document.body.className = '';
      if (this.selectedTheme !== 'default') {
        document.body.classList.add(`ob-${this.selectedTheme}-theme`);
      }
    },
    handleBadgeClick(badge) {
      console.log('Badge clicked:', badge);
      this.selectedBadge = badge;
    }
  },
  template: `
    <div>
      <section class="theme-selector">
        <h3>Theme Selection</h3>
        <p>Select a theme to see how the components adapt to different accessibility needs:</p>
        <select v-model="selectedTheme" @change="applyTheme">
          <option v-for="theme in themes" :key="theme.id" :value="theme.id">{{ theme.name }}</option>
        </select>
      </section>

      <section>
        <h2>Profile Viewer</h2>
        <div class="controls">
          <div class="control-group">
            <label for="badge-layout">Badge Layout:</label>
            <select id="badge-layout" v-model="badgeLayout">
              <option value="grid">Grid</option>
              <option value="list">List</option>
            </select>
          </div>
          <div class="control-group">
            <input type="checkbox" id="show-description" v-model="showDescription">
            <label for="show-description">Show Description</label>
          </div>
          <div class="control-group">
            <input type="checkbox" id="show-url" v-model="showUrl">
            <label for="show-url">Show URL</label>
          </div>
          <div class="control-group">
            <input type="checkbox" id="interactive-badges" v-model="interactiveBadges">
            <label for="interactive-badges">Interactive Badges</label>
          </div>
        </div>
        
        <div class="profile-container">
          <profile-viewer 
            :profile="profile" 
            :badge-layout="badgeLayout"
            :show-description="showDescription"
            :show-url="showUrl"
            :interactive-badges="interactiveBadges"
            title="User Profile"
            @badge-click="handleBadgeClick"
          />
        </div>
      </section>

      <section v-if="selectedBadge">
        <h2>Selected Badge</h2>
        <p>You clicked on the following badge:</p>
        <div class="badge-container">
          <badge-display 
            :badge="selectedBadge" 
            :show-description="true"
            :show-issued-date="true"
            :show-expiry-date="true"
          />
        </div>
      </section>

      <section>
        <h2>Code Example</h2>
        <div class="code-example">
          <pre><code>{{ codeExample }}</code></pre>
        </div>
      </section>
    </div>
  `
});

// Use the OpenBadges UI plugin
app.use(OpenBadgesUIPlugin);

// Mount the app
app.mount('#app');
