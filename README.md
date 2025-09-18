# 🎯 Habit Tracker API

API-first habit tracking system built with Next.js 14 and Supabase. Features magic link authentication, RESTful endpoints for habit boards and check-ins, visual progress grids, and external integration capabilities for Raycast, MCP, and mobile clients.

## 🚀 Quick Start

### Environment Setup

1. Copy the environment template:
```bash
cp .env.local.example .env.local
```

2. Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**⚠️ Security Warning**: Never commit `.env.local` to version control. The service role key provides admin access to your database.

### Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm run dev

# Run tests
pnpm run test

# Type checking
pnpm run typecheck

# Linting
pnpm run lint
```

## 📖 API Documentation

Visit `/docs` when running locally to explore the interactive Swagger UI documentation.

## 🔧 Architecture

- **Frontend**: Next.js 14 with App Router and Tailwind CSS
- **Backend**: Next.js API routes with TypeScript
- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Magic link via Supabase Auth + API key system
- **Deployment**: Vercel with edge functions

## 🔐 Authentication

- **Magic Link Flow**: Email-based authentication for users
- **API Keys**: For external integrations (Raycast, MCP, mobile apps)
- **JWT Tokens**: For session management
- **Row Level Security**: Database-level user isolation

## 🛡️ Security Features

- Comprehensive Row Level Security policies
- API key authentication for external clients
- Environment-based configuration
- Secure JWT token handling

## 📱 External Integrations

The API supports external clients through API key authentication:

- **Raycast Extensions**: Quick habit check-ins
- **Mobile Apps**: Native iOS/Android applications
- **MCP Servers**: Context protocol integrations
- **Automation Tools**: Zapier, IFTTT, etc.

## 🗄️ Database Schema

### Core Tables

- `users` - User accounts with email authentication
- `api_keys` - External integration authentication tokens
- `boards` - Habit tracking boards (habits)
- `check_ins` - Daily completion records

## 🚢 Deployment

Ready for Vercel deployment:

```bash
# Build for production
pnpm run build

# Start production server
pnpm run start
```

## 📄 License

MIT License - see LICENSE file for details.