-- Track cumulative Google OAuth scopes per user (supports incremental Gmail auth).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleGrantedScopes" TEXT;
