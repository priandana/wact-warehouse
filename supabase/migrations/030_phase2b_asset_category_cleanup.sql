-- 030_phase2b_asset_category_cleanup.sql
-- Phase 2B: Deactivate 6 legacy generic asset categories and ensure 12 official Phase 2B categories are active.
-- Safe, idempotent, non-destructive (no rows deleted, no schema changes).

-- 1. Deactivate the 6 legacy categories
UPDATE public.asset_categories
SET is_active = false
WHERE id IN (
  '1e9d0f83-b7d6-4f83-9644-18faf9e18f96', -- Equipment
  'e2651ab3-5dbe-44a2-a1b0-9cd2ff6adc93', -- Facility
  'c1d77f69-7abb-4b9a-9f5e-9255e3fe0370', -- Vehicle
  '807839ae-412c-48ff-a1db-93f3654aa417', -- IT Device
  'f1649b55-afb3-4410-8db0-6f1a1d4b6906', -- Safety
  'f836b989-b125-44e4-a037-691ad5a6b4d8'  -- Other
);

-- 2. Ensure all 12 official Phase 2B categories remain active
UPDATE public.asset_categories
SET is_active = true
WHERE id IN (
  '1e9d0f83-b7d6-4f83-9644-18faf9e18f01', -- Hand Pallet
  '1e9d0f83-b7d6-4f83-9644-18faf9e18f02', -- Forklift
  '1e9d0f83-b7d6-4f83-9644-18faf9e18f03', -- Reach Truck
  '1e9d0f83-b7d6-4f83-9644-18faf9e18f04', -- PTL
  '1e9d0f83-b7d6-4f83-9644-18faf9e18f05', -- Rack
  '1e9d0f83-b7d6-4f83-9644-18faf9e18f06', -- Scanner
  '1e9d0f83-b7d6-4f83-9644-18faf9e18f07', -- Printer
  '1e9d0f83-b7d6-4f83-9644-18faf9e18f08', -- Scale
  '1e9d0f83-b7d6-4f83-9644-18faf9e18f09', -- APAR
  '1e9d0f83-b7d6-4f83-9644-18faf9e18f10', -- Lamp / Lighting
  '1e9d0f83-b7d6-4f83-9644-18faf9e18f11', -- Chiller / Freezer Equipment
  '1e9d0f83-b7d6-4f83-9644-18faf9e18f12'  -- Other Equipment
);
