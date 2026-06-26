ALTER TABLE "UserFlowCustomization"
  ADD COLUMN IF NOT EXISTS "selectedAccessory" TEXT NOT NULL DEFAULT 'none';
