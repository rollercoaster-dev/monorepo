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

// API response wrapper interface for paginated/wrapped responses
interface ApiListResponse<T> {
  items?: T[];
  data?: T[];
  [key: string]: unknown;
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

    // Add auth token if available (guard for SSR)
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('auth_token')
      : null;
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

      const data = (await response.json()) as Issuer[] | ApiListResponse<Issuer>;
      // Handle both array and object with items property
      if (Array.isArray(data)) {
        return data;
      }
      return data.items || data.data || [];
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

      const data = (await response.json()) as BadgeClass[] | ApiListResponse<BadgeClass>;
      // Handle both array and object with items property
      if (Array.isArray(data)) {
        return data;
      }
      return data.items || data.data || [];
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
   * Get badge classes by issuer ID using server-side filtering
   */
  async getBadgeClassesByIssuer(issuerId: string): Promise<BadgeClass[]> {
    try {
      const response = await fetch(
        `/api/bs/v2/badge-classes?issuer=${encodeURIComponent(issuerId)}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        await this.handleError(response);
      }

      const data = (await response.json()) as BadgeClass[] | ApiListResponse<BadgeClass>;
      // Handle both array and object with items property
      if (Array.isArray(data)) {
        return data;
      }
      return data.items || data.data || [];
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch badge classes for issuer');
    }
  },
};

export default badgeApi;
