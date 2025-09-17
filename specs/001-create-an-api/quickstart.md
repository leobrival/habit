# Quickstart Guide: Habit Tracker API

## Prerequisites

- Node.js 18+ installed
- Supabase account with a new project
- Vercel account for deployment

## Local Development Setup

### 1. Environment Configuration

Create `.env.local` with Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Setup

Run SQL migrations to create tables:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create api_keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

-- Create boards table
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#22c55e',
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Create check_ins table
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(board_id, date)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own API keys" ON api_keys
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own boards" ON boards
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own check-ins" ON check_ins
  FOR ALL USING (user_id = auth.uid());
```

### 3. Install Dependencies

```bash
pnpm install
```

## API Usage Examples

### Authentication Flow

#### 1. Request Magic Link

```bash
curl -X POST http://localhost:3000/api/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

#### 2. Verify Token (from email link)

```bash
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "magic_link_token_here"}'
```

Response includes your API key:

```json
{
  "user": { "id": "...", "email": "user@example.com" },
  "api_key": "your_api_key_here"
}
```

### Board Management

#### Create a Habit Board

```bash
curl -X POST http://localhost:3000/api/boards \
  -H "Authorization: Bearer your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Morning Exercise",
    "description": "Daily workout routine",
    "color": "#22c55e"
  }'
```

#### List Your Boards

```bash
curl -X GET http://localhost:3000/api/boards \
  -H "Authorization: Bearer your_api_key_here"
```

### Check-in Management

#### Mark Today as Completed

```bash
curl -X POST http://localhost:3000/api/boards/{board_id}/check-ins \
  -H "Authorization: Bearer your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-09-17",
    "completed": true,
    "notes": "30 minute run"
  }'
```

## External Integration

The API is designed to be consumed by external clients using standard HTTP requests with API key authentication. Examples of supported integrations:

- **Raycast Extensions**: Quick habit check-ins via command palette
- **Mobile Applications**: Native iOS/Android habit tracking apps
- **MCP Servers**: Context protocol integrations for AI assistants
- **Automation Tools**: Zapier, IFTTT, custom scripts

## Testing the API

### Run Contract Tests

```bash
# Install test dependencies
pnpm install --save-dev @playwright/test

# Run API contract tests
pnpm run test:api
```

### Manual Testing Checklist

- [ ] Magic link authentication works
- [ ] API key generation and authentication
- [ ] Board CRUD operations
- [ ] Check-in creation and updates
- [ ] External API access with keys

## Deployment to Vercel

### 1. Connect Repository

- Push code to GitHub
- Connect repository in Vercel dashboard
- Add environment variables from `.env.local`

### 2. Automatic Deployment

```bash
git push origin main
# Vercel automatically deploys on push
```

### 3. Update API Base URL

Update your external integrations to use:

```
https://your-app.vercel.app/api
```

## Troubleshooting

### Common Issues

**Magic link not working**: Check Supabase email configuration and SMTP settings

**API authentication failing**: Verify API key format and Authorization header

**CORS errors**: Ensure proper Next.js API route configuration

**Database connection issues**: Check Supabase connection string and RLS policies

### Debug Commands

```bash
# Check database connection
pnpm run db:status

# View API logs
vercel logs your-app

# Test individual endpoints
pnpm run test:single -- auth.test.js
```

## Next Steps

1. **Real-time Updates**: Add Supabase real-time subscriptions for API data sync
2. **Rate Limiting**: Implement API rate limiting for external clients
3. **API Versioning**: Add versioning strategy for API evolution
4. **Monitoring**: Add API performance and usage monitoring
5. **Documentation**: Generate interactive API documentation
