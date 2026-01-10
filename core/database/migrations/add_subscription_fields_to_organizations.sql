-- Add subscription fields to organizations table
-- Migration: add_subscription_fields_to_organizations
-- Date: 2026-01-10

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE;

-- Add index for subscription queries
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_active
ON organizations(subscription_active);

CREATE INDEX IF NOT EXISTS idx_organizations_subscription_expires_at
ON organizations(subscription_expires_at);

-- Add comments for documentation
COMMENT ON COLUMN organizations.subscription_active IS 'Indicates if the organization has an active subscription to access dashboard features';
COMMENT ON COLUMN organizations.subscription_expires_at IS 'Timestamp when the subscription expires (NULL for lifetime subscriptions)';
COMMENT ON COLUMN organizations.subscription_type IS 'Type of subscription: free, basic, premium, enterprise, lifetime';
COMMENT ON COLUMN organizations.subscription_started_at IS 'Timestamp when the current subscription started';
