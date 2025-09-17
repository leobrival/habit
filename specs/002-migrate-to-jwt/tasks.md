# Tasks: Migration API Keys → JWT + Supabase Auth + RLS

**Feature**: Migration du système d'authentification API keys vers JWT avec Row Level Security

## Task Dependencies

- **Préparation** → **Implémentation JWT** → **Configuration RLS** → **Migration Endpoints** → **Tests** → **Déploiement** → **Migration Clients** → **Nettoyage**
- Tasks marquées avec **[P]** peuvent être exécutées en parallèle quand les dépendances sont satisfaites
- Les tâches séquentielles travaillent sur des fichiers partagés et doivent s'exécuter l'une après l'autre

## Phase 1: Préparation

### T001: Backup et Validation [P]

- **Path**: `/backups/`, `/scripts/`
- **Description**: Créer les backups complets et valider l'état actuel
- **Dependencies**: None
- **Deliverables**:
  - Script de backup automatique (`backup.sh`)
  - Validation des données UUIDs existantes
  - Documentation de l'état de l'API actuelle
  - Backup des tables critiques via SQL

### T002: Validation Infrastructure [P]

- **Path**: `/tests/migration/`
- **Description**: Vérifier la cohérence des données et l'infrastructure
- **Dependencies**: None
- **Deliverables**:
  - Script de validation des UUIDs dans toutes les tables
  - Test de connectivité Supabase
  - Vérification des variables d'environnement
  - Analyse des dépendances de production

## Phase 2: Implémentation JWT

### T003: JWT Authentication Middleware

- **Path**: `/lib/jwt-auth-middleware.ts`
- **Description**: Nouveau middleware d'authentification JWT
- **Dependencies**: T001
- **Deliverables**:
  - Interface `JWTAuthContext` avec user, session, supabase
  - Fonction `validateJWT()` pour validation des tokens
  - Higher-order function `withJWTAuth()` pour protection des routes
  - Gestion d'erreurs `AuthError` spécialisée

### T004: Session Management Endpoints

- **Path**: `/app/api/auth/session/`, `/app/api/auth/refresh/`
- **Description**: Nouveaux endpoints pour gestion des sessions JWT
- **Dependencies**: T003
- **Routes**:
  - `POST /api/auth/session` - Validation de token JWT
  - `GET /api/auth/session` - Vérification via header Authorization
  - `POST /api/auth/refresh` - Renouvellement des tokens

### T005: Supabase Client Updates

- **Path**: `/lib/supabase.ts`
- **Description**: Mise à jour du client Supabase pour support JWT
- **Dependencies**: T003
- **Deliverables**:
  - Fonction `createUserContextSupabaseClient()` avec contexte utilisateur
  - Modification de `createServerSupabaseClient()` pour compatibilité
  - Configuration des headers Authorization pour RLS
  - Gestion des cookies pour SSR

## Phase 3: Configuration RLS

### T006: RLS Migration Script [P]

- **Path**: `/supabase/migrations/`, `/scripts/migration_rls_jwt.sql`
- **Description**: Script SQL pour activation du Row Level Security
- **Dependencies**: T002
- **Deliverables**:
  - Validation des données avant migration
  - Activation RLS sur toutes les tables
  - Création des policies JWT-compatibles
  - Script de vérification post-migration

### T007: RLS Testing Suite [P]

- **Path**: `/scripts/test-rls.ts`
- **Description**: Tests de validation du RLS avec JWT
- **Dependencies**: T006
- **Test Scenarios**:
  - Test avec service role (accès admin)
  - Test avec client anonyme (échec attendu)
  - Test avec token JWT valide (succès)
  - Vérification de l'isolation des données

## Phase 4: Migration des Endpoints

### T008: Dual Authentication Middleware

- **Path**: `/lib/auth-transition.ts`
- **Description**: Middleware de transition supportant API keys et JWT
- **Dependencies**: T003
- **Deliverables**:
  - Fonction `withDualAuth()` pour support des deux systèmes
  - Détection automatique du type d'authentification
  - Logging des méthodes d'auth utilisées
  - Transition progressive sans casser l'existant

### T009: Boards API Migration

- **Path**: `/app/api/boards/route.ts`
- **Description**: Migration des endpoints boards vers JWT + RLS
- **Dependencies**: T008, T006
- **Changes**:
  - Remplacement `withAuth` par `withJWTAuth`
  - Suppression des filtres manuels `user_id` (RLS automatique)
  - Utilisation du contexte `supabase` du middleware
  - Simplification des requêtes database

### T010: Check-ins API Migration

- **Path**: `/app/api/check-ins/route.ts`
- **Description**: Migration des endpoints check-ins vers JWT + RLS
- **Dependencies**: T008, T006
- **Changes**:
  - Migration vers `withJWTAuth`
  - Suppression des filtres manuels utilisateur
  - Utilisation du client Supabase avec contexte RLS
  - Maintien de la logique métier existante

## Phase 5: Tests

### T011: JWT Integration Tests [P]

- **Path**: `/tests/jwt-migration.test.ts`
- **Description**: Suite de tests d'intégration complète JWT
- **Dependencies**: T009, T010
- **Test Suites**:
  - Validation JWT (tokens valides/invalides)
  - Intégration RLS (isolation des données)
  - Tests des endpoints API avec JWT
  - Gestion des sessions (validation/refresh)

### T012: Manual Testing Script [P]

- **Path**: `/scripts/test-migration.sh`
- **Description**: Script de test manuel pour validation end-to-end
- **Dependencies**: T009, T010
- **Test Flow**:
  - Demande de magic link
  - Authentification JWT
  - Test des endpoints avec nouveau système
  - Validation de la sécurité (accès non autorisé)

### T013: Performance Testing [P]

- **Path**: `/tests/performance/`
- **Description**: Tests de performance et monitoring
- **Dependencies**: T011
- **Deliverables**:
  - Benchmarks RLS vs filtrage manuel
  - Tests de charge sur authentification JWT
  - Monitoring des temps de réponse
  - Métriques d'utilisation des deux systèmes d'auth

## Phase 6: Déploiement

### T014: Deployment Strategy

- **Path**: `/scripts/deployment-checklist.sh`
- **Description**: Stratégie et checklist de déploiement
- **Dependencies**: T012, T013
- **Deliverables**:
  - Checklist pré-déploiement complet
  - Script de déploiement progressif
  - Commandes de monitoring post-déploiement
  - Plan de rollback automatisé

### T015: Production Configuration [P]

- **Path**: `/`, `/lib/monitoring.ts`
- **Description**: Configuration production et monitoring
- **Dependencies**: T014
- **Deliverables**:
  - Variables d'environnement production
  - Système de métriques d'authentification
  - Alertes sur échecs d'authentification
  - Logs structurés pour debugging

### T016: Rollback Automation [P]

- **Path**: `/scripts/rollback.sh`
- **Description**: Plan et scripts de rollback d'urgence
- **Dependencies**: T001
- **Deliverables**:
  - Script de rollback automatique < 5 minutes
  - Checklist de rollback d'urgence
  - Restauration des fichiers de code legacy
  - Procédures de communication d'incident

## Phase 7: Migration des Clients

### T017: Raycast Extension Guide

- **Path**: `/docs/migration/raycast.md`
- **Description**: Guide de migration pour les extensions Raycast
- **Dependencies**: T015
- **Deliverables**:
  - Documentation du nouveau flow d'authentification
  - Code d'exemple pour `makeAuthenticatedRequest()`
  - Gestion automatique du refresh token
  - Migration des commandes existantes

### T018: MCP Server Guide [P]

- **Path**: `/docs/migration/mcp.md`
- **Description**: Guide de migration pour les serveurs MCP
- **Dependencies**: T015
- **Deliverables**:
  - Nouveau `JWTAuthClient` pour MCP
  - Configuration des variables d'environnement
  - Système de stockage des tokens sécurisé
  - Intégration dans les handlers MCP existants

### T019: Client Testing Support [P]

- **Path**: `/scripts/client-testing/`
- **Description**: Outils pour tester la migration des clients
- **Dependencies**: T017, T018
- **Deliverables**:
  - Scripts de test pour chaque type de client
  - Environnement de test isolé
  - Documentation de debugging pour clients
  - Support pour validation des implementations

## Phase 8: Nettoyage

### T020: Legacy Code Cleanup

- **Path**: `/lib/`, `/app/api/`
- **Description**: Suppression progressive du code legacy
- **Dependencies**: T019
- **Deliverables**:
  - Script de nettoyage des fichiers API keys
  - Suppression de `auth-middleware.ts`
  - Nettoyage des routes `/api/auth/verify`
  - Mise à jour des types et interfaces

### T021: Database Cleanup [P]

- **Path**: `/supabase/migrations/cleanup_api_keys.sql`
- **Description**: Suppression de la table api_keys et nettoyage
- **Dependencies**: T020
- **Deliverables**:
  - Backup final de la table `api_keys`
  - Script de suppression de table sécurisé
  - Nettoyage des policies RLS obsolètes
  - Optimisation post-nettoyage (VACUUM)

### T022: Documentation Finale [P]

- **Path**: `/docs/migration/`
- **Description**: Documentation complète de la migration
- **Dependencies**: T021
- **Deliverables**:
  - Guide post-migration pour maintenance
  - Documentation des nouveaux endpoints
  - Troubleshooting guide pour problèmes courants
  - Métriques de succès de la migration

## Parallel Execution Examples

**Phase de préparation en parallèle:**

```bash
# Terminal 1 - Backup
claude-code task --description "Backup création" --prompt "Complete T001: Backup et Validation"

# Terminal 2 - Validation infrastructure
claude-code task --description "Infrastructure check" --prompt "Complete T002: Validation Infrastructure"
```

**Implémentation JWT en parallèle après T001:**

```bash
# Après T001, ces tâches peuvent démarrer en parallèle
claude-code task --description "JWT middleware" --prompt "Complete T003: JWT Authentication Middleware"
claude-code task --description "RLS script" --prompt "Complete T006: RLS Migration Script"
```

**Tests en parallèle après migration endpoints:**

```bash
# Toutes les suites de tests peuvent s'exécuter simultanément
claude-code task --description "Integration tests" --prompt "Complete T011: JWT Integration Tests"
claude-code task --description "Manual testing" --prompt "Complete T012: Manual Testing Script"
claude-code task --description "Performance tests" --prompt "Complete T013: Performance Testing"
```

**Guides clients en parallèle:**

```bash
claude-code task --description "Raycast guide" --prompt "Complete T017: Raycast Extension Guide"
claude-code task --description "MCP guide" --prompt "Complete T018: MCP Server Guide"
claude-code task --description "Client testing" --prompt "Complete T019: Client Testing Support"
```

## Success Criteria

- ✅ Tous les tests JWT passent (`pnpm run test:migration`)
- ✅ Les deux systèmes d'auth coexistent pendant la transition
- ✅ RLS fonctionne correctement avec isolation des données
- ✅ Tous les endpoints API fonctionnent avec JWT
- ✅ Performance équivalente ou meilleure qu'avec API keys
- ✅ Clients externes (Raycast, MCP) migrés avec succès
- ✅ Plan de rollback testé et fonctionnel
- ✅ Monitoring et alertes opérationnels
- ✅ Documentation de migration complète
- ✅ Table `api_keys` supprimée après validation complète

## Rollback Triggers

- **Immediate rollback si**:
  - Erreur rate > 5% sur authentification
  - Performance dégradée > 50%
  - RLS bloque des accès légitimes
  - Clients critiques non fonctionnels

- **Rollback en < 5 minutes**:
  - Désactivation RLS automatique
  - Restauration code legacy
  - Redéploiement version précédente
  - Validation fonctionnement API

## Migration Timeline

- **Phase 1-2**: 2-3 jours (préparation + implémentation)
- **Phase 3-4**: 3-4 jours (RLS + migration endpoints)
- **Phase 5-6**: 2-3 jours (tests + déploiement)
- **Phase 7**: 1-2 semaines (migration clients externe)
- **Phase 8**: 1-2 jours (nettoyage final)

**Total estimé**: 2-3 semaines avec période de coexistence des deux systèmes