-- Create refresh_tokens table
-- Note: user_id references users in the legacy database (data/users.sqlite),
-- so a cross-database FOREIGN KEY constraint cannot be enforced here.
CREATE TABLE refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    revoked_reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create oauth_login_exchanges table
-- code_hash stores a SHA-256 hash of the one-time exchange code (bearer secret)
CREATE TABLE oauth_login_exchanges (
    id TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    user_data TEXT NOT NULL,
    redirect_uri TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    consumed_at TEXT
);

-- Create indexes for better query performance
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_oauth_login_exchanges_code_hash ON oauth_login_exchanges(code_hash);
CREATE INDEX idx_oauth_login_exchanges_expires_at ON oauth_login_exchanges(expires_at);
