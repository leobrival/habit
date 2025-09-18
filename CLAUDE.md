# CLAUDE.md

This file provides guidance to Claude Code when working with this Habit Tracker API project.

## Project Overview

API-first habit tracking system built with Next.js 14 and Supabase. Features magic link authentication, RESTful endpoints for habit boards and check-ins, visual progress grids, and external integration capabilities for Raycast, MCP, and mobile clients.

## Architecture

- **Frontend**: Next.js 14 with App Router and Tailwind CSS
- **Backend**: Next.js API routes with TypeScript
- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Magic link via Supabase Auth + API key system
- **Deployment**: Vercel with edge functions

## Key Development Commands

```bash
# Development
pnpm run dev

# Testing
pnpm run test:api        # API contract tests
pnpm run test:unit       # Unit tests

# Database
pnpm run db:migrate      # Run Supabase migrations
pnpm run db:seed         # Seed test data

# Build & Deploy
pnpm run build
pnpm run start

# Type checking and linting
pnmp run typecheck      # Type check the code
pnpm run lint           # Lint the code

```

## Database Schema

### Core Tables

- `users` - User accounts with email authentication
- `api_keys` - External integration authentication tokens
- `boards` - Habit tracking boards (habits)
- `check_ins` - Daily completion records

### Key Relationships

- Users have many API keys and boards
- Boards have many check-ins
- All tables use Row Level Security (RLS)

## API Design

### Authentication

- Magic link flow for user registration/login
- API key generation for external integrations
- Bearer token authentication for API access

### Endpoints

- `/api/auth/*` - Authentication flow
- `/api/boards/*` - Habit board CRUD
- `/api/check-ins/*` - Daily check-in management
- `/api/progress` - Progress data for visualizations

## Development Principles

1. **API-First**: All functionality exposed via REST endpoints
2. **Test-First**: Contract tests written before implementation
3. **Type Safety**: Full TypeScript coverage with Supabase types
4. **Security**: RLS policies and API key authentication
5. **Performance**: Optimized for Vercel edge deployment

## File Structure

```text
app/
├── api/                 # API route handlers
│   ├── auth/
│   ├── boards/
│   └── progress/
├── components/          # React components
├── lib/                 # Utility functions
└── types/              # TypeScript definitions

specs/001-create-an-api/ # Feature documentation
├── spec.md             # Requirements specification
├── plan.md             # Implementation plan
├── research.md         # Technical research
├── data-model.md       # Database design
├── quickstart.md       # Setup guide
└── contracts/          # API specifications
```

## External Integrations

The API supports external clients through API key authentication:

- **Raycast Extensions**: Quick habit check-ins
- **Mobile Apps**: Native iOS/Android applications
- **MCP Servers**: Context protocol integrations
- **Automation Tools**: Zapier, IFTTT, etc.

## Current Feature Status

**Phase 1 Complete**: Design and contracts generated
**Next Phase**: Task generation and implementation

## Recent Changes

- Created OpenAPI specification for all endpoints
- Designed PostgreSQL schema with RLS policies
- Generated contract tests for API validation
- Documented quickstart guide for development setup

## Common Tasks

When implementing:

1. Start with contract tests (fail first)
2. Create Supabase types from schema
3. Implement API route handlers
4. Add validation middleware
5. Test with external clients

When debugging:

- Check Supabase logs for database issues
- Verify RLS policies for access problems
- Use Vercel logs for deployment issues
- Test API endpoints with curl/Postman

## Features

With each new feature, I want you to run `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, and `pnpm run build` to verify that the code is correct.

I want no errors in the code (no matter how minor), run the code verification commands in a loop.
