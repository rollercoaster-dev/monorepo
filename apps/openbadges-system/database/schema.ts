import type { Kysely } from 'kysely'

export interface Users {
  id: string
  email: string
  username: string
  password_hash: string
  first_name: string | null
  last_name: string | null
  is_active: number
  created_at: string
  updated_at: string
}

export interface Posts {
  id: string
  user_id: string
  title: string
  content: string
  status: string
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface Comments {
  id: string
  post_id: string
  user_id: string
  content: string
  is_approved: number
  created_at: string
  updated_at: string
}

export interface Tags {
  id: string
  name: string
  slug: string
  color: string | null
  created_at: string
  updated_at: string
}

export interface PostTags {
  post_id: string
  tag_id: string
}

export interface UserSessions {
  id: string
  user_id: string
  session_token: string
  expires_at: string
  created_at: string
}

export interface OAuthProviders {
  id: string
  user_id: string
  provider: string
  provider_user_id: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  profile_data: string | null
  created_at: string
  updated_at: string
}

export interface OAuthSessions {
  id: string
  state: string
  code_verifier: string | null
  redirect_uri: string | null
  provider: string
  created_at: string
  expires_at: string
}

export interface DatabaseSchema {
  users: Users
  posts: Posts
  comments: Comments
  tags: Tags
  post_tags: PostTags
  user_sessions: UserSessions
  oauth_providers: OAuthProviders
  oauth_sessions: OAuthSessions
}

// Use this interface to define the Kysely instance
export type DB = Kysely<DatabaseSchema>
