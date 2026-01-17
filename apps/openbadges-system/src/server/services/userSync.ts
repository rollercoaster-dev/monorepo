import type { User } from './user'
import { logger } from '../utils/logger'

export interface BadgeServerUser {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  roles: string[]
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface UserSyncResult {
  success: boolean
  user?: BadgeServerUser
  created?: boolean
  updated?: boolean
  error?: string
}

export class UserSyncService {
  private badgeServerUrl: string
  private badgeServerApiKey: string

  constructor() {
    this.badgeServerUrl = process.env.BADGE_SERVER_URL || 'http://localhost:3000'
    this.badgeServerApiKey = process.env.BADGE_SERVER_API_KEY || ''
  }

  /**
   * Make authenticated request to badge server
   */
  private async badgeServerRequest(
    endpoint: string,
    options: {
      method?: string
      headers?: Record<string, string>
      body?: string
    } = {}
  ): Promise<Response> {
    const url = `${this.badgeServerUrl}${endpoint}`

    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.badgeServerApiKey}`,
        ...options.headers,
      },
    })
  }

  /**
   * Get user from badge server by username or email
   */
  async getBadgeServerUser(identifier: string): Promise<BadgeServerUser | null> {
    try {
      // Try by username first
      const usernameResponse = await this.badgeServerRequest(
        `/api/v1/users?username=${encodeURIComponent(identifier)}`
      )

      if (usernameResponse.ok) {
        const users = await usernameResponse.json()
        if (users.length > 0) {
          return users[0] as BadgeServerUser
        }
      }

      // Try by email
      const emailResponse = await this.badgeServerRequest(
        `/api/v1/users?email=${encodeURIComponent(identifier)}`
      )

      if (emailResponse.ok) {
        const users = await emailResponse.json()
        if (users.length > 0) {
          return users[0] as BadgeServerUser
        }
      }

      return null
    } catch (error) {
      logger.error('Error getting badge server user', { error })
      return null
    }
  }

  /**
   * Create user in badge server
   */
  async createBadgeServerUser(user: User): Promise<BadgeServerUser | null> {
    try {
      const userData = {
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        roles: user.roles,
        avatar: user.avatar,
      }

      const response = await this.badgeServerRequest('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      })

      if (response.ok) {
        return await response.json()
      } else {
        logger.error('Failed to create badge server user', {
          status: response.status,
          body: await response.text(),
        })
        return null
      }
    } catch (error) {
      logger.error('Error creating badge server user', { error })
      return null
    }
  }

  /**
   * Update user in badge server
   */
  async updateBadgeServerUser(
    badgeServerUserId: string,
    user: User
  ): Promise<BadgeServerUser | null> {
    try {
      const userData = {
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        roles: user.roles,
        avatar: user.avatar,
      }

      const response = await this.badgeServerRequest(`/api/v1/users/${badgeServerUserId}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      })

      if (response.ok) {
        return await response.json()
      } else {
        logger.error('Failed to update badge server user', {
          status: response.status,
          body: await response.text(),
        })
        return null
      }
    } catch (error) {
      logger.error('Error updating badge server user', { error })
      return null
    }
  }

  /**
   * Sync user data between OAuth system and badge server
   */
  async syncUser(user: User): Promise<UserSyncResult> {
    try {
      // Check if user exists in badge server
      let badgeServerUser = await this.getBadgeServerUser(user.username)

      if (!badgeServerUser) {
        // Try by email if username not found
        badgeServerUser = await this.getBadgeServerUser(user.email)
      }

      if (badgeServerUser) {
        // User exists, check if update is needed
        const needsUpdate =
          badgeServerUser.email !== user.email ||
          badgeServerUser.firstName !== user.firstName ||
          badgeServerUser.lastName !== user.lastName ||
          badgeServerUser.isActive !== user.isActive ||
          badgeServerUser.avatar !== user.avatar ||
          JSON.stringify(badgeServerUser.roles) !== JSON.stringify(user.roles)

        if (needsUpdate) {
          const updatedUser = await this.updateBadgeServerUser(badgeServerUser.id, user)
          if (updatedUser) {
            return {
              success: true,
              user: updatedUser,
              updated: true,
            }
          } else {
            return {
              success: false,
              error: 'Failed to update user in badge server',
            }
          }
        } else {
          // No update needed
          return {
            success: true,
            user: badgeServerUser,
            updated: false,
          }
        }
      } else {
        // User doesn't exist, create new user
        const createdUser = await this.createBadgeServerUser(user)
        if (createdUser) {
          return {
            success: true,
            user: createdUser,
            created: true,
          }
        } else {
          return {
            success: false,
            error: 'Failed to create user in badge server',
          }
        }
      }
    } catch (error) {
      logger.error('Error syncing user', { error })
      return {
        success: false,
        error: `User sync failed: ${(error as Error).message}`,
      }
    }
  }

  /**
   * Sync user permissions/roles between systems
   */
  async syncUserPermissions(user: User): Promise<boolean> {
    try {
      const syncResult = await this.syncUser(user)

      if (syncResult.success && syncResult.user) {
        // Additional permission mapping logic can be added here
        // For now, we just ensure roles are synchronized
        return true
      }

      return false
    } catch (error) {
      logger.error('Error syncing user permissions', { error })
      return false
    }
  }

  /**
   * Get user profile from badge server
   */
  async getBadgeServerUserProfile(userId: string): Promise<BadgeServerUser | null> {
    try {
      const response = await this.badgeServerRequest(`/api/v1/users/${userId}`)

      if (response.ok) {
        return await response.json()
      }

      return null
    } catch (error) {
      logger.error('Error getting badge server user profile', { error })
      return null
    }
  }
}

export const userSyncService = new UserSyncService()
