-- ============================================
-- DROP SYSTEM DESIGNER FEATURE
-- ============================================
-- The System Designer (floor plan / camera placement canvas) has been
-- removed from the application. This migration removes its tables and
-- storage bucket. See supabase/migrations/add_system_designer.sql for
-- the original schema (kept for historical reference).
--
-- ⚠️ This is destructive: all floor plans and camera placements are
-- permanently deleted. Make sure this is really wanted before running.
-- ============================================

-- Storage: the 'floor-plans' bucket cannot be removed via plain SQL
-- (storage.protect_delete() blocks direct DELETEs on storage.objects/
-- storage.buckets). Empty + delete it via the Storage API instead, e.g.:
--   POST   /storage/v1/bucket/floor-plans/empty   (service_role key)
--   DELETE /storage/v1/bucket/floor-plans         (service_role key)

-- Tables (camera_placements first due to FK -> system_designs)
DROP TABLE IF EXISTS public.camera_placements CASCADE;
DROP TABLE IF EXISTS public.system_designs CASCADE;

-- Trigger functions that were only used by the tables above
DROP FUNCTION IF EXISTS update_system_designs_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_camera_placements_updated_at() CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✅ System Designer tables, storage bucket and triggers removed.';
END $$;
