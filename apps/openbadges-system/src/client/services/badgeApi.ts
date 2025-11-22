/**
 * Badge API Service for Directory Pages
 *
 * This service provides methods for fetching badge classes and issuers
 * for the directory pages. It uses the badge server proxy at /api/bs/
 */

import type { OB2 } from 'openbadges-types';

// Type aliases for clarity
export type Issuer = OB2.Profile;
export type BadgeClass = OB2.BadgeClass;

// API response error interface
interface ApiError {
  error?: string;
  message?: string;
  status?: number;
}

/**
 * Badge API service for directory operations
 */
export const badgeApi = {
  /**
   * Get auth headers for badge server requests
   */
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  },

  /**
   * Handle API errors with user-friendly messages
   */
  async handleError(response: Response): Promise<never> {
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const data = (await response.json()) as ApiError;
      if (data.error || data.message) {
        errorMessage = data.error || data.message || errorMessage;
      }
    } catch {
      // If we can't parse JSON, use status text
      if (response.statusText) {
        errorMessage = `${response.status}: ${response.statusText}`;
      }
    }

    throw new Error(errorMessage);
  },

  /**
   * Get all issuers from the badge server
   */
  async getIssuers(): Promise<Issuer[]> {
    try {
      const response = await fetch('/api/bs/v2/issuers', {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data = await response.json();
      // Handle both array and object with items property
      return Array.isArray(data) ? data : (data.items || []);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch issuers');
    }
  },

  /**
   * Get a specific issuer by ID
   */
  async getIssuerById(id: string): Promise<Issuer | null> {
    try {
      const response = await fetch(`/api/bs/v2/issuers/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        await this.handleError(response);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch issuer');
    }
  },

  /**
   * Get all badge classes from the badge server
   */
  async getBadgeClasses(): Promise<BadgeClass[]> {
    try {
      const response = await fetch('/api/bs/v2/badge-classes', {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data = await response.json();
      // Handle both array and object with items property
      return Array.isArray(data) ? data : (data.items || []);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch badge classes');
    }
  },

  /**
   * Get a specific badge class by ID
   */
  async getBadgeClassById(id: string): Promise<BadgeClass | null> {
    try {
      const response = await fetch(`/api/bs/v2/badge-classes/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        await this.handleError(response);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch badge class');
    }
  },

  /**
   * Get badge classes by issuer ID
   */
  async getBadgeClassesByIssuer(issuerId: string): Promise<BadgeClass[]> {
    try {
      // First get all badge classes, then filter by issuer
      // This could be optimized with a server-side filter in the future
      const allBadgeClasses = await this.getBadgeClasses();

      return allBadgeClasses.filter((badgeClass) => {
        const issuer = badgeClass.issuer;
        if (typeof issuer === 'string') {
          return issuer === issuerId || issuer.includes(issuerId);
        }
        if (typeof issuer === 'object' && 'id' in issuer) {
          return issuer.id === issuerId || issuer.id?.includes(issuerId);
        }
        return false;
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch badge classes for issuer');
    }
  },
};

export default badgeApi;
