-- migration_rls_jwt.sql
-- ⚠️  À exécuter dans Supabase SQL Editor
-- Migration pour activer RLS avec support JWT

-- ÉTAPE 1: Préparer les données
-- Vérifier que tous les user_id sont des UUIDs valides
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Compter les user_id non-UUID dans boards
    SELECT COUNT(*) INTO invalid_count
    FROM boards
    WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % invalid UUIDs in boards table. Please fix before migration.', invalid_count;
    END IF;

    -- Compter les user_id non-UUID dans check_ins
    SELECT COUNT(*) INTO invalid_count
    FROM check_ins
    WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % invalid UUIDs in check_ins table. Please fix before migration.', invalid_count;
    END IF;

    RAISE NOTICE 'Data validation passed. All user_id are valid UUIDs.';
END $$;

-- ÉTAPE 2: Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
-- Note: api_keys reste sans RLS pour la période de transition

-- ÉTAPE 3: Nettoyer les anciennes policies (si elles existent)
DROP POLICY IF EXISTS "Allow service role full access" ON users;
DROP POLICY IF EXISTS "Allow service role full access" ON boards;
DROP POLICY IF EXISTS "Allow service role full access" ON check_ins;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can manage own boards" ON boards;
DROP POLICY IF EXISTS "Users can manage own check-ins" ON check_ins;

-- ÉTAPE 4: Créer les nouvelles policies JWT-compatibles

-- Policies pour users
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (auth.uid()::text = id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid()::text = id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid()::text = id OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage users" ON users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policies pour boards
CREATE POLICY "Users can view own boards" ON boards
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can create own boards" ON boards
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own boards" ON boards
  FOR UPDATE
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can delete own boards" ON boards
  FOR DELETE
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Policies pour check_ins
CREATE POLICY "Users can view own check-ins" ON check_ins
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can create own check-ins" ON check_ins
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own check-ins" ON check_ins
  FOR UPDATE
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can delete own check-ins" ON check_ins
  FOR DELETE
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- ÉTAPE 5: Vérifier les policies créées
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'boards', 'check_ins')
ORDER BY tablename, policyname;

-- ÉTAPE 6: Test rapide des policies
-- (Ces requêtes doivent retourner 0 lignes car pas d'utilisateur authentifié)
SELECT COUNT(*) as should_be_zero_boards FROM boards;
SELECT COUNT(*) as should_be_zero_checkins FROM check_ins;

-- Message de succès
SELECT 'RLS migration completed successfully! 🎉' as status;