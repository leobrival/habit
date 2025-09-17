# Tasks: Create Habit Tracker API

**Feature**: API-first habit tracking system with Next.js 14 and Supabase

## Task Dependencies

- **Setup tasks** → **Test tasks** → **Core tasks** → **Integration tasks** → **Polish tasks**
- Tasks marked with **[P]** can be run in parallel when dependencies are met
- Sequential tasks work on shared files and must run one after another

## Implementation Tasks

### T001: Project Setup and Configuration [P]

- **Path**: `/` (root)
- **Description**: Initialize project dependencies, environment configuration, and build tools
- **Dependencies**: None
- **Deliverables**:
  - Install Next.js 14, TypeScript, Supabase dependencies
  - Create `.env.local` template with required Supabase variables
  - Configure `package.json` scripts (dev, build, test, typecheck, lint)
  - Setup ESLint and Prettier configuration

### T002: Database Schema Setup [P]

- **Path**: `/supabase/migrations/`
- **Description**: Create PostgreSQL tables and RLS policies in Supabase
- **Dependencies**: None
- **Deliverables**:
  - Create migration files for `users`, `api_keys`, `boards`, `check_ins` tables
  - Implement Row Level Security policies for all tables
  - Add database indexes for performance optimization
  - Create Supabase types generation script

### T003: Authentication Contract Tests [P]

- **Path**: `/tests/api/auth.test.ts`
- **Description**: Contract tests for magic link authentication endpoints
- **Dependencies**: T001 (testing setup)
- **API Endpoints**: `/api/auth/magic-link`, `/api/auth/verify`
- **Test Scenarios**:
  - Magic link request with valid email
  - Magic link verification with valid token
  - Error handling for invalid inputs
  - API key generation on successful auth

### T004: API Keys Contract Tests [P]

- **Path**: `/tests/api/api-keys.test.ts`
- **Description**: Contract tests for API key management endpoints
- **Dependencies**: T001 (testing setup)
- **API Endpoints**: `/api/api-keys`, `/api/api-keys/{key_id}`
- **Test Scenarios**:
  - List user's API keys
  - Generate new API key with custom label
  - Revoke existing API key
  - Authentication with API key headers

### T005: Boards Contract Tests [P]

- **Path**: `/tests/api/boards.test.ts`
- **Description**: Contract tests for habit board CRUD operations
- **Dependencies**: T001 (testing setup)
- **API Endpoints**: `/api/boards`, `/api/boards/{board_id}`
- **Test Scenarios**:
  - Create board with name, description, color
  - List user's boards (active and archived)
  - Get individual board details
  - Update board properties
  - Archive board (soft delete)

### T006: Check-ins Contract Tests [P]

- **Path**: `/tests/api/check-ins.test.ts`
- **Description**: Contract tests for daily check-in management
- **Dependencies**: T001 (testing setup)
- **API Endpoints**: `/api/boards/{board_id}/check-ins`, `/api/check-ins/{check_in_id}`
- **Test Scenarios**:
  - Create check-in for specific date and board
  - Update check-in completion status and notes
  - Delete check-in record
  - Prevent duplicate check-ins for same board/date

### T007: Supabase Client Setup

- **Path**: `/lib/supabase.ts`
- **Description**: Configure Supabase client for authentication and database operations
- **Dependencies**: T001, T002
- **Deliverables**:
  - Create server-side Supabase client
  - Configure authentication helpers
  - Export typed database client
  - Setup Supabase types generation

### T008: API Authentication Middleware

- **Path**: `/lib/auth-middleware.ts`
- **Description**: Middleware for API key validation and user authentication
- **Dependencies**: T007
- **Deliverables**:
  - Create API key validation function
  - Implement user context extraction
  - Add request authentication decorator
  - Handle authentication errors consistently

### T009: Data Validation Schemas

- **Path**: `/lib/validation.ts`
- **Description**: Zod schemas for request/response validation
- **Dependencies**: T001
- **Deliverables**:
  - Board creation/update validation schemas
  - Check-in validation schemas
  - API key validation schemas
  - User input sanitization helpers

### T010: Authentication API Routes

- **Path**: `/app/api/auth/`
- **Description**: Implement magic link authentication endpoints
- **Dependencies**: T003, T007, T008, T009
- **Routes**:
  - `POST /api/auth/magic-link` - Send magic link email
  - `POST /api/auth/verify` - Verify token and return API key
- **Must pass**: T003 contract tests

### T011: API Keys Management Routes

- **Path**: `/app/api/api-keys/`
- **Description**: Implement API key CRUD operations
- **Dependencies**: T004, T007, T008, T009
- **Routes**:
  - `GET /api/api-keys` - List user's keys
  - `POST /api/api-keys` - Generate new key
  - `DELETE /api/api-keys/[key_id]` - Revoke key
- **Must pass**: T004 contract tests

### T012: Boards API Routes

- **Path**: `/app/api/boards/`
- **Description**: Implement habit board CRUD operations
- **Dependencies**: T005, T007, T008, T009
- **Routes**:
  - `GET /api/boards` - List user's boards
  - `POST /api/boards` - Create new board
  - `GET /api/boards/[board_id]` - Get board details
  - `PUT /api/boards/[board_id]` - Update board
  - `DELETE /api/boards/[board_id]` - Archive board
- **Must pass**: T005 contract tests

### T013: Check-ins API Routes

- **Path**: `/app/api/boards/[board_id]/check-ins/` and `/app/api/check-ins/[check_in_id]/`
- **Description**: Implement daily check-in management
- **Dependencies**: T006, T007, T008, T009
- **Routes**:
  - `POST /api/boards/[board_id]/check-ins` - Create check-in
  - `PUT /api/check-ins/[check_in_id]` - Update check-in
  - `DELETE /api/check-ins/[check_in_id]` - Delete check-in
- **Must pass**: T006 contract tests

### T014: Database Service Layer [P]

- **Path**: `/lib/services/`
- **Description**: Database operation services for each entity
- **Dependencies**: T007, T009
- **Deliverables**:
  - `UserService` - User account operations
  - `ApiKeyService` - API key management with hashing
  - `BoardService` - Board CRUD with user filtering
  - `CheckInService` - Check-in operations with date validation

### T015: Integration Test Suite [P]

- **Path**: `/tests/integration/`
- **Description**: End-to-end API workflow tests
- **Dependencies**: T010, T011, T012, T013
- **Test Scenarios**:
  - Complete authentication flow → board creation → check-ins
  - API key generation and authentication validation
  - Data isolation between different users
  - Error handling across all endpoints

### T016: API Documentation Generation [P]

- **Path**: `/docs/`
- **Description**: Generate interactive API documentation
- **Dependencies**: T010, T011, T012, T013
- **Deliverables**:
  - Generate OpenAPI specification from routes
  - Create API documentation endpoint
  - Generate example requests for each endpoint
  - Document authentication flow

### T017: Performance Optimization [P]

- **Path**: `/lib/cache.ts`, API routes
- **Description**: Database query optimization and caching
- **Dependencies**: T014
- **Deliverables**:
  - Add database indexes for common queries
  - Implement request-level caching for board lists
  - Optimize check-in queries with date ranges
  - Add API response time monitoring

## Parallel Execution Examples

**Run setup tasks in parallel:**

```bash
# Terminal 1
claude-code task --description "Project setup" --prompt "Complete T001: Project Setup and Configuration"

# Terminal 2
claude-code task --description "Database setup" --prompt "Complete T002: Database Schema Setup"
```

**Run contract tests in parallel after setup:**

```bash
# All contract tests can run simultaneously
claude-code task --description "Auth tests" --prompt "Complete T003: Authentication Contract Tests"
claude-code task --description "API key tests" --prompt "Complete T004: API Keys Contract Tests"
claude-code task --description "Boards tests" --prompt "Complete T005: Boards Contract Tests"
claude-code task --description "Check-in tests" --prompt "Complete T006: Check-ins Contract Tests"
```

**Run service and documentation tasks in parallel:**

```bash
claude-code task --description "Database services" --prompt "Complete T014: Database Service Layer"
claude-code task --description "API docs" --prompt "Complete T016: API Documentation Generation"
claude-code task --description "Performance optimization" --prompt "Complete T017: Performance Optimization"
```

## Success Criteria

- ✅ All contract tests pass (`pnpm run test:api`)
- ✅ TypeScript compilation succeeds (`pnpm run typecheck`)
- ✅ Linting passes (`pnpm run lint`)
- ✅ Production build succeeds (`pnpm run build`)
- ✅ Manual API testing via curl/Postman works
- ✅ API key authentication works for external clients
- ✅ Database RLS policies prevent unauthorized access
- ✅ All API endpoints return proper error responses
