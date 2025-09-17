# Research: API-First Habit Tracking App

## Magic Link Authentication with Supabase

**Decision**: Use Supabase Auth with magic link authentication
**Rationale**:
- Reduces friction compared to password-based auth
- Supabase has built-in magic link support via `signInWithOtp()`
- Eliminates password management complexity
- Better security posture (no stored passwords)
**Alternatives considered**:
- OAuth providers (Google, GitHub) - rejected due to complexity and external dependencies
- Email/password - rejected due to password management overhead
- JWT tokens only - rejected due to lack of user management features

## API Key Management for External Integrations

**Decision**: Generate UUID-based API keys stored in database with user associations
**Rationale**:
- Allows multiple API keys per user for different integrations
- Custom labels help users manage keys (e.g., "Raycast Extension", "Mobile App")
- Revocation capability for security
- Supabase RLS policies can secure API key operations
**Alternatives considered**:
- JWT tokens for API access - rejected due to expiration complexity
- Single API key per user - rejected due to lack of granular control
- Third-party API key services - rejected to maintain simplicity


## Next.js 14 App Router API Implementation

**Decision**: Use Next.js App Router with route handlers in `/app/api/` directory
**Rationale**:
- Native TypeScript support with automatic type inference
- Built-in request/response handling with Web APIs
- Middleware support for authentication
- Automatic OpenAPI generation possible with tools like `next-swagger-doc`
**Alternatives considered**:
- Express.js separate backend - rejected due to deployment complexity
- tRPC - rejected due to learning curve and external client requirements
- GraphQL - rejected due to over-engineering for simple CRUD operations

## Database Schema with Supabase

**Decision**: PostgreSQL with Row Level Security (RLS) policies
**Rationale**:
- Supabase provides managed PostgreSQL with real-time subscriptions
- RLS policies ensure data isolation between users
- Built-in admin panel for database management
- TypeScript types auto-generated from schema
**Alternatives considered**:
- SQLite with local files - rejected due to multi-user requirements
- MongoDB - rejected due to relational data structure needs
- Prisma with external DB - rejected due to Supabase integration benefits

## Testing Strategy

**Decision**: Contract-first testing with Playwright for API testing
**Rationale**:
- Contract tests ensure API specification compliance
- Playwright provides robust HTTP client for API testing
- Jest for unit testing utility functions and data validation
- Test database isolation using Supabase test environments
**Alternatives considered**:
- Postman collections - rejected due to lack of CI/CD integration
- Supertest with Express - rejected due to Next.js route handler differences
- Manual testing only - rejected due to regression risk

## Deployment and Environment Configuration

**Decision**: Vercel deployment with environment-based configuration
**Rationale**:
- Optimized for Next.js applications
- Automatic preview deployments for pull requests
- Environment variables for Supabase keys and database URLs
- Edge Runtime support for faster API responses
**Alternatives considered**:
- Docker containers on cloud providers - rejected due to complexity
- Traditional VPS hosting - rejected due to scaling limitations
- Serverless Framework - rejected due to Vercel's Next.js optimizations

## External Integration Architecture

**Decision**: RESTful API with API key authentication in headers
**Rationale**:
- Standard `Authorization: Bearer <api-key>` header pattern
- Works with all HTTP clients (curl, fetch, Raycast, mobile apps)
- Stateless authentication suitable for external integrations
- JSON response format for universal compatibility
**Alternatives considered**:
- GraphQL endpoints - rejected due to client complexity
- Webhook-based integration - rejected due to bidirectional data needs
- SDK libraries - rejected due to maintenance overhead across platforms