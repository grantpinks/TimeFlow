ALTER TABLE "UserFlowCustomization"
  ADD COLUMN IF NOT EXISTS "selectedHat" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "selectedEyes" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "selectedAura" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "selectedBackground" TEXT NOT NULL DEFAULT 'none';

UPDATE "UserFlowCustomization"
SET "selectedHat" = "selectedAccessory"
WHERE "selectedAccessory" IN ('cap', 'crown', 'laurel', 'star_visor', 'moon_hood', 'trophy_circlet')
  AND "selectedHat" = 'none';

UPDATE "UserFlowCustomization"
SET "selectedEyes" = "selectedAccessory"
WHERE "selectedAccessory" IN ('bright_eyes', 'focus_eyes', 'future_gaze', 'kind_eyes', 'starry_eyes', 'laser_focus')
  AND "selectedEyes" = 'none';

UPDATE "UserFlowCustomization"
SET "selectedAura" = "selectedAccessory"
WHERE "selectedAccessory" IN ('spark', 'wings', 'halo', 'tide_ring', 'ember_orbit', 'constellation')
  AND "selectedAura" = 'none';

UPDATE "UserFlowCustomization"
SET "selectedBackground" = "selectedAccessory"
WHERE "selectedAccessory" IN ('sunrise', 'forest_glow', 'night_garden', 'aurora_sky')
  AND "selectedBackground" = 'none';
