// @ts-nocheck
/**
 * Express Integration Example for Open Badges Types
 *
 * This file demonstrates how to use the Open Badges Types package with Express
 * to create a simple badge API.
 *
 * NOTE: This is a conceptual example only and won't compile without additional dependencies.
 * To run this example, you would need to:
 * 1. Install dependencies: npm install express body-parser
 * 2. Compile: npx tsc examples/express-integration.ts --esModuleInterop --target es2020 --module commonjs
 * 3. Run: node examples/express-integration.js
 */

import express from 'express';
import bodyParser from 'body-parser';
import { OB2, OB3, Shared, OpenBadgesVersion } from '../src';
import { convertOB2toOB3, convertOB3toOB2 } from './version-conversion';

// Create Express app
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// In-memory storage for badges (in a real app, you would use a database)
const badgeStore: {
  ob2: { [key: string]: OB2.Assertion },
  ob3: { [key: string]: OB3.VerifiableCredential }
} = {
  ob2: {},
  ob3: {}
};

// Helper function to create branded types
const createIRI = (value: string): Shared.IRI => value as Shared.IRI;
const createDateTime = (value: string): Shared.DateTime => value as Shared.DateTime;

/**
 * API Routes
 */

// Get all badges (with optional version filter)
app.get('/badges', (req, res) => {
  const version = req.query.version as string;

  if (version === '2.0') {
    return res.json(Object.values(badgeStore.ob2));
  } else if (version === '3.0') {
    return res.json(Object.values(badgeStore.ob3));
  } else {
    // Return all badges
    return res.json({
      ob2: Object.values(badgeStore.ob2),
      ob3: Object.values(badgeStore.ob3)
    });
  }
});

// Get a specific badge by ID (with optional version conversion)
app.get('/badges/:id', (req, res) => {
  const id = req.params.id;
  const targetVersion = req.query.version as string;

  // Try to find the badge in either store
  const ob2Badge = badgeStore.ob2[id];
  const ob3Badge = badgeStore.ob3[id];

  if (!ob2Badge && !ob3Badge) {
    return res.status(404).json({ error: 'Badge not found' });
  }

  // If no version specified, return the badge in its native format
  if (!targetVersion) {
    return res.json(ob2Badge || ob3Badge);
  }

  // Convert if needed
  if (targetVersion === '2.0') {
    if (ob2Badge) {
      return res.json(ob2Badge);
    } else {
      // Convert OB3 to OB2
      try {
        const converted = convertOB3toOB2(ob3Badge);
        return res.json(converted);
      } catch (error) {
        return res.status(500).json({ error: 'Conversion failed', details: error.message });
      }
    }
  } else if (targetVersion === '3.0') {
    if (ob3Badge) {
      return res.json(ob3Badge);
    } else {
      // Convert OB2 to OB3
      try {
        const converted = convertOB2toOB3(ob2Badge);
        return res.json(converted);
      } catch (error) {
        return res.status(500).json({ error: 'Conversion failed', details: error.message });
      }
    }
  } else {
    return res.status(400).json({ error: 'Invalid version specified' });
  }
});

// Create a new badge
app.post('/badges', (req, res) => {
  const badgeData = req.body;

  // Validate the badge data
  if (!Shared.isJsonLdObject(badgeData)) {
    return res.status(400).json({ error: 'Invalid badge data: Not a JSON-LD object' });
  }

  try {
    // Determine the badge version and store accordingly
    if (OB2.isAssertion(badgeData)) {
      // Store OB2 Assertion
      badgeStore.ob2[badgeData.id.toString()] = badgeData;

      // Also convert and store as OB3 for demonstration purposes
      const ob3Badge = convertOB2toOB3(badgeData);
      badgeStore.ob3[ob3Badge.id.toString()] = ob3Badge;

      return res.status(201).json({
        message: 'OB2 Assertion created successfully',
        id: badgeData.id,
        badge: badgeData
      });
    } else if (OB3.isVerifiableCredential(badgeData)) {
      // Store OB3 VerifiableCredential
      badgeStore.ob3[badgeData.id.toString()] = badgeData;

      // Also convert and store as OB2 for demonstration purposes
      const ob2Badge = convertOB3toOB2(badgeData);
      badgeStore.ob2[ob2Badge.id.toString()] = ob2Badge;

      return res.status(201).json({
        message: 'OB3 VerifiableCredential created successfully',
        id: badgeData.id,
        badge: badgeData
      });
    } else {
      return res.status(400).json({ error: 'Invalid badge data: Not a recognized badge format' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create badge', details: error.message });
  }
});

// Validate a badge
app.post('/validate', (req, res) => {
  const badgeData = req.body;

  // Basic validation
  if (!Shared.isJsonLdObject(badgeData)) {
    return res.status(400).json({
      valid: false,
      error: 'Not a JSON-LD object'
    });
  }

  // Check for specific badge types
  if (OB2.isAssertion(badgeData)) {
    return res.json({
      valid: true,
      version: '2.0',
      type: 'Assertion',
      id: badgeData.id
    });
  }

  if (OB3.isVerifiableCredential(badgeData)) {
    return res.json({
      valid: true,
      version: '3.0',
      type: 'VerifiableCredential',
      id: badgeData.id
    });
  }

  // If we get here, it's a JSON-LD object but not a recognized badge type
  return res.status(400).json({
    valid: false,
    error: 'Not a recognized badge format'
  });
});

/**
 * Sample Data Generation
 */

// Create a sample OB2 Assertion
function createSampleOB2Assertion(): OB2.Assertion {
  // Create a BadgeClass
  const badgeClass: OB2.BadgeClass = {
    '@context': 'https://w3id.org/openbadges/v2',
    id: createIRI('https://example.org/badges/5'),
    type: 'BadgeClass',
    name: 'Express API Badge',
    description: 'This badge is awarded for creating a RESTful API with Express.',
    image: createIRI('https://example.org/badges/5/image'),
    criteria: {
      narrative: 'Recipients must create a fully functional RESTful API using Express and Node.js.'
    },
    issuer: {
      id: createIRI('https://example.org/issuer'),
      type: 'Profile',
      name: 'API Academy',
      url: createIRI('https://example.org'),
      email: 'contact@example.org',
      verification: {
        type: 'hosted',
        allowedOrigins: 'example.org'
      }
    }
  };

  // Create an Assertion
  const assertion: OB2.Assertion = {
    '@context': 'https://w3id.org/openbadges/v2',
    id: createIRI('https://example.org/assertions/123'),
    type: 'Assertion',
    recipient: {
      type: 'email',
      identity: 'developer@example.org',
      hashed: false
    },
    issuedOn: createDateTime('2023-06-15T12:00:00Z'),
    verification: {
      type: 'hosted'
    },
    badge: badgeClass
  };

  return assertion;
}

// Create a sample OB3 VerifiableCredential
function createSampleOB3Credential(): OB3.VerifiableCredential {
  // Create an Achievement
  const achievement: OB3.Achievement = {
    type: ['Achievement'],
    name: 'GraphQL API Badge',
    description: 'This badge is awarded for creating a GraphQL API.',
    criteria: {
      narrative: 'Recipients must create a fully functional GraphQL API using Apollo Server.'
    },
    image: createIRI('https://example.org/badges/6/image')
  };

  // Create a Verifiable Credential
  const credential: OB3.VerifiableCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json'
    ],
    id: createIRI('https://example.org/credentials/456'),
    type: ['VerifiableCredential'],
    issuer: {
      id: createIRI('https://example.org/issuers/123'),
      type: ['Profile'],
      name: 'GraphQL Academy',
      url: createIRI('https://example.org'),
      email: 'contact@example.org'
    },
    issuanceDate: createDateTime('2023-06-15T12:00:00Z'),
    credentialSubject: {
      id: createIRI('did:example:ebfeb1f712ebc6f1c276e12ec21'),
      achievement: achievement
    },
    proof: {
      type: 'Ed25519Signature2020',
      created: createDateTime('2023-06-15T12:05:00Z'),
      verificationMethod: createIRI('https://example.org/issuers/123#keys-1'),
      proofPurpose: 'assertionMethod',
      proofValue: 'z58DAdFfa9SkqZMVPxAQpic6FPCsJWa6SpsfDqwmUbHEVnWxeh'
    }
  };

  return credential;
}

// Add sample data to the store
function initializeSampleData() {
  const ob2Badge = createSampleOB2Assertion();
  const ob3Badge = createSampleOB3Credential();

  badgeStore.ob2[ob2Badge.id.toString()] = ob2Badge;
  badgeStore.ob3[ob3Badge.id.toString()] = ob3Badge;

  console.log('Sample data initialized');
  console.log('OB2 Badge ID:', ob2Badge.id);
  console.log('OB3 Badge ID:', ob3Badge.id);
}

// Start the server
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    initializeSampleData();

    console.log('\nAvailable endpoints:');
    console.log('GET /badges - Get all badges');
    console.log('GET /badges?version=2.0 - Get all OB2 badges');
    console.log('GET /badges?version=3.0 - Get all OB3 badges');
    console.log('GET /badges/:id - Get a specific badge');
    console.log('GET /badges/:id?version=2.0 - Get a specific badge as OB2');
    console.log('GET /badges/:id?version=3.0 - Get a specific badge as OB3');
    console.log('POST /badges - Create a new badge');
    console.log('POST /validate - Validate a badge');
  });
}

// Export for testing
export { app, badgeStore, createSampleOB2Assertion, createSampleOB3Credential };
