import { createApp } from "vue";
import { OpenBadgesUIPlugin } from "../../dist/openbadges-ui.es.js";
import "../../dist/style.css";

// Sample OB2 badge
const ob2Badge = {
  "@context": "https://w3id.org/openbadges/v2",
  type: "Assertion",
  id: "http://example.org/assertions/123",
  recipient: {
    identity: "jane.doe@example.org",
    type: "email",
    hashed: false,
  },
  badge: {
    type: "BadgeClass",
    id: "http://example.org/badges/coding-skills",
    name: "Coding Skills",
    description:
      "This badge recognizes exceptional coding skills and problem-solving abilities.",
    image: "https://via.placeholder.com/150?text=Coding+Skills",
    criteria: {
      narrative:
        "The recipient demonstrated proficiency in JavaScript, TypeScript, and Vue.js.",
    },
    issuer: {
      type: "Profile",
      id: "http://example.org/issuers/tech-academy",
      name: "Tech Academy",
      url: "http://example.org/tech-academy",
    },
  },
  issuedOn: "2023-05-15T12:00:00Z",
  expires: "2025-05-15T12:00:00Z",
  verification: {
    type: "hosted",
  },
};

// Sample OB3 badge
const ob3Badge = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
  ],
  id: "http://example.org/credentials/3732",
  type: ["VerifiableCredential", "OpenBadgeCredential"],
  issuer: {
    id: "http://example.org/issuers/tech-university",
    type: "Profile",
    name: "Tech University",
    url: "http://example.org/tech-university",
    image: "https://via.placeholder.com/50?text=TU",
  },
  issuanceDate: "2023-08-10T12:00:00Z",
  expirationDate: "2026-08-10T12:00:00Z",
  credentialSubject: {
    id: "did:example:john.smith",
    type: ["AchievementSubject"],
    achievement: {
      id: "http://example.org/achievements/advanced-web-dev",
      type: ["Achievement"],
      name: "Advanced Web Development",
      description:
        "This credential certifies advanced knowledge and skills in modern web development technologies.",
      image: "https://via.placeholder.com/150?text=Web+Dev",
      criteria: {
        narrative:
          "The recipient demonstrated expertise in HTML5, CSS3, JavaScript, and modern frameworks.",
      },
    },
  },
};

// Create a list of badges
const badgeList = [ob2Badge, ob3Badge];

// Create the Vue app
const app = createApp({
  data() {
    return {
      ob2Badge,
      ob3Badge,
      badgeList,
    };
  },
  methods: {
    handleBadgeClick(badge) {
      console.log("Badge clicked:", badge);
      alert(
        `Badge clicked: ${badge.type === "Assertion" ? badge.badge.name : badge.credentialSubject.achievement.name}`,
      );
    },
  },
  template: `
    <div>
      <section>
        <h2>Individual Badge Display (OB2)</h2>
        <div class="badge-container">
          <badge-display 
            :badge="ob2Badge" 
            :show-description="true"
            :show-issued-date="true"
            :show-expiry-date="true"
          />
        </div>
      </section>

      <section>
        <h2>Individual Badge Display (OB3)</h2>
        <div class="badge-container">
          <badge-display 
            :badge="ob3Badge" 
            :show-description="true"
            :show-issued-date="true"
            :show-expiry-date="true"
          />
        </div>
      </section>

      <section>
        <h2>Badge List</h2>
        <div class="badge-list-container">
          <badge-list 
            :badges="badgeList" 
            layout="grid"
            :interactive="true"
            @badge-click="handleBadgeClick"
          />
        </div>
      </section>
    </div>
  `,
});

// Use the OpenBadges UI plugin
app.use(OpenBadgesUIPlugin);

// Mount the app
app.mount("#app");
