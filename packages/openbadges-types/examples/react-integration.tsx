// @ts-nocheck
/**
 * React Integration Example for Open Badges Types
 *
 * This file demonstrates how to use the Open Badges Types package with React
 * to create a simple badge viewer component.
 *
 * NOTE: This is a conceptual example only and won't compile without additional dependencies.
 * This is a standalone example and would need to be integrated into a React project
 * with appropriate dependencies to run.
 */

import React, { useState, useEffect } from 'react';
import { OB2, OB3, Shared } from '../src';

// Type for badge data that could be either OB2 or OB3
type BadgeData = OB2.Assertion | OB3.VerifiableCredential;

/**
 * Component to display badge information
 */
interface BadgeViewerProps {
  badge: BadgeData;
}

const BadgeViewer: React.FC<BadgeViewerProps> = ({ badge }) => {
  // Determine badge version
  const isOB2 = OB2.isAssertion(badge);
  const isOB3 = OB3.isVerifiableCredential(badge);

  if (!isOB2 && !isOB3) {
    return <div className="error">Invalid badge format</div>;
  }

  // Extract common information based on badge version
  let badgeInfo: {
    id: string;
    name: string;
    description: string;
    image?: string;
    issuerName: string;
    issuedOn: string;
    expires?: string;
    recipientId: string;
  };

  if (isOB2) {
    const ob2Badge = badge as OB2.Assertion;
    const badgeClass = typeof ob2Badge.badge === 'string'
      ? { name: 'Unknown', description: 'Badge details not available', issuer: { name: 'Unknown Issuer' } }
      : ob2Badge.badge;

    badgeInfo = {
      id: ob2Badge.id.toString(),
      name: badgeClass.name,
      description: badgeClass.description,
      image: typeof badgeClass === 'object' && 'image' in badgeClass ?
        (typeof badgeClass.image === 'string' ? badgeClass.image :
          badgeClass.image && typeof badgeClass.image === 'object' && 'id' in badgeClass.image ?
            badgeClass.image.id.toString() : undefined) : undefined,
      issuerName: typeof badgeClass.issuer === 'string'
        ? 'Unknown Issuer'
        : badgeClass.issuer.name,
      issuedOn: ob2Badge.issuedOn.toString(),
      expires: ob2Badge.expires?.toString(),
      recipientId: ob2Badge.recipient.identity
    };
  } else {
    const ob3Badge = badge as OB3.VerifiableCredential;
    const achievement = Array.isArray(ob3Badge.credentialSubject.achievement)
      ? ob3Badge.credentialSubject.achievement[0]
      : ob3Badge.credentialSubject.achievement;

    badgeInfo = {
      id: ob3Badge.id.toString(),
      name: typeof achievement.name === 'string'
        ? achievement.name
        : Object.values(achievement.name)[0], // Get first language value
      description: typeof achievement.description === 'string'
        ? achievement.description
        : achievement.description
          ? Object.values(achievement.description)[0] // Get first language value
          : 'No description provided',
      image: achievement.image ?
        (typeof achievement.image === 'string' ?
          achievement.image :
          'id' in achievement.image ? achievement.image.id.toString() : undefined) :
        undefined,
      issuerName: typeof ob3Badge.issuer === 'string'
        ? 'Unknown Issuer'
        : ob3Badge.issuer.name?.toString() || 'Unknown Issuer',
      issuedOn: ob3Badge.issuanceDate.toString(),
      expires: ob3Badge.expirationDate?.toString(),
      recipientId: ob3Badge.credentialSubject.id || 'Unknown Recipient'
    };
  }

  return (
    <div className="badge-viewer">
      <div className="badge-header">
        <h2>{badgeInfo.name}</h2>
        <span className="badge-version">
          {isOB2 ? 'Open Badges 2.0' : 'Open Badges 3.0'}
        </span>
      </div>

      {badgeInfo.image && (
        <div className="badge-image">
          <img src={badgeInfo.image} alt={badgeInfo.name} />
        </div>
      )}

      <div className="badge-details">
        <p className="badge-description">{badgeInfo.description}</p>

        <div className="badge-metadata">
          <div className="metadata-item">
            <strong>Issuer:</strong> {badgeInfo.issuerName}
          </div>
          <div className="metadata-item">
            <strong>Issued On:</strong> {new Date(badgeInfo.issuedOn).toLocaleDateString()}
          </div>
          {badgeInfo.expires && (
            <div className="metadata-item">
              <strong>Expires:</strong> {new Date(badgeInfo.expires).toLocaleDateString()}
            </div>
          )}
          <div className="metadata-item">
            <strong>Recipient:</strong> {badgeInfo.recipientId}
          </div>
          <div className="metadata-item">
            <strong>Badge ID:</strong> {badgeInfo.id}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Component to fetch and display badges
 */
interface BadgeListProps {
  apiUrl: string;
}

const BadgeList: React.FC<BadgeListProps> = ({ apiUrl }) => {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>('all');

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        setLoading(true);

        // Fetch badges from API
        const response = await fetch(`${apiUrl}/badges${selectedVersion !== 'all' ? `?version=${selectedVersion}` : ''}`);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Process the data based on the selected version
        let badgeList: BadgeData[] = [];

        if (selectedVersion === 'all') {
          // If 'all' is selected, we need to handle the combined response
          badgeList = [...data.ob2, ...data.ob3];
        } else {
          // Otherwise, the response is already filtered
          badgeList = data;
        }

        setBadges(badgeList);
        setError(null);
      } catch (err) {
        setError(err.message);
        setBadges([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [apiUrl, selectedVersion]);

  const handleVersionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVersion(event.target.value);
  };

  return (
    <div className="badge-list-container">
      <div className="badge-controls">
        <h1>Open Badges Viewer</h1>

        <div className="version-selector">
          <label htmlFor="version-select">Badge Version:</label>
          <select
            id="version-select"
            value={selectedVersion}
            onChange={handleVersionChange}
          >
            <option value="all">All Versions</option>
            <option value="2.0">Open Badges 2.0</option>
            <option value="3.0">Open Badges 3.0</option>
          </select>
        </div>
      </div>

      {loading && <div className="loading">Loading badges...</div>}

      {error && <div className="error">Error: {error}</div>}

      {!loading && !error && badges.length === 0 && (
        <div className="no-badges">No badges found</div>
      )}

      <div className="badge-list">
        {badges.map((badge) => (
          <BadgeViewer
            key={badge.id.toString()}
            badge={badge}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Component to validate and display a badge
 */
interface BadgeValidatorProps {
  apiUrl: string;
}

const BadgeValidator: React.FC<BadgeValidatorProps> = ({ apiUrl }) => {
  const [badgeJson, setBadgeJson] = useState<string>('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [badge, setBadge] = useState<BadgeData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleValidate = async () => {
    try {
      setLoading(true);

      // Parse the JSON
      let badgeData: any;
      try {
        badgeData = JSON.parse(badgeJson);
      } catch (err) {
        setValidationResult({
          valid: false,
          error: 'Invalid JSON format'
        });
        setBadge(null);
        return;
      }

      // Send to API for validation
      const response = await fetch(`${apiUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: badgeJson
      });

      const result = await response.json();
      setValidationResult(result);

      // If valid, set the badge for display
      if (result.valid) {
        setBadge(badgeData);
      } else {
        setBadge(null);
      }
    } catch (err) {
      setValidationResult({
        valid: false,
        error: err.message
      });
      setBadge(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="badge-validator">
      <h1>Badge Validator</h1>

      <div className="validator-input">
        <textarea
          value={badgeJson}
          onChange={(e) => setBadgeJson(e.target.value)}
          placeholder="Paste badge JSON here..."
          rows={10}
        />

        <button
          onClick={handleValidate}
          disabled={loading}
        >
          {loading ? 'Validating...' : 'Validate Badge'}
        </button>
      </div>

      {validationResult && (
        <div className={`validation-result ${validationResult.valid ? 'valid' : 'invalid'}`}>
          <h3>Validation Result:</h3>
          {validationResult.valid ? (
            <div className="valid-badge">
              <p>✅ Valid {validationResult.version} {validationResult.type}</p>
              <p>ID: {validationResult.id}</p>
            </div>
          ) : (
            <div className="invalid-badge">
              <p>❌ Invalid Badge</p>
              <p>Error: {validationResult.error}</p>
            </div>
          )}
        </div>
      )}

      {badge && (
        <div className="validated-badge">
          <h3>Badge Preview:</h3>
          <BadgeViewer badge={badge} />
        </div>
      )}
    </div>
  );
};

/**
 * Main App Component
 */
const App: React.FC = () => {
  const apiUrl = 'http://localhost:3000'; // URL to the Express API

  return (
    <div className="app">
      <nav className="app-nav">
        <ul>
          <li><a href="#badge-list">Badge List</a></li>
          <li><a href="#badge-validator">Badge Validator</a></li>
        </ul>
      </nav>

      <section id="badge-list" className="app-section">
        <BadgeList apiUrl={apiUrl} />
      </section>

      <section id="badge-validator" className="app-section">
        <BadgeValidator apiUrl={apiUrl} />
      </section>
    </div>
  );
};

export default App;

// Export components for testing
export { BadgeViewer, BadgeList, BadgeValidator };
