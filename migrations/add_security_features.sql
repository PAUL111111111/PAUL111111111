-- SQL Migration Script for Security Features
-- Add any specific security-related migrations here

-- Example: Adding SSL settings
ALTER TABLE users ADD COLUMN ssl_active BOOLEAN DEFAULT FALSE;
