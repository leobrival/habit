# Data Model: API-First Habit Tracking App

## Entity Relationships

```
User (1) ──── (many) API_Key
User (1) ──── (many) Board
Board (1) ──── (many) Check_In
```

## Database Schema

### users
Primary entity for user accounts and authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| email | text | UNIQUE, NOT NULL | Email for magic link authentication |
| created_at | timestamptz | DEFAULT now() | Account creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last profile update |

**Indexes**: email (unique)
**RLS Policy**: Users can only access their own records

### api_keys
Authentication tokens for external integrations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique key identifier |
| user_id | uuid | FOREIGN KEY users(id), NOT NULL | Owner of the API key |
| key_hash | text | UNIQUE, NOT NULL | SHA-256 hash of the API key |
| label | text | NOT NULL | User-defined label (e.g., "Raycast") |
| created_at | timestamptz | DEFAULT now() | Key creation timestamp |
| last_used_at | timestamptz | NULL | Last API usage timestamp |
| revoked_at | timestamptz | NULL | Key revocation timestamp |

**Indexes**: key_hash (unique), user_id, revoked_at
**RLS Policy**: Users can only manage their own API keys
**Note**: Actual API key is generated client-side and only hash is stored

### boards
Habit tracking boards representing individual behaviors.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique board identifier |
| user_id | uuid | FOREIGN KEY users(id), NOT NULL | Board owner |
| name | text | NOT NULL | Board name (e.g., "Morning Exercise") |
| description | text | NULL | Optional detailed description |
| color | text | DEFAULT '#22c55e' | Hex color for visual display |
| icon | text | NULL | Optional icon/emoji |
| created_at | timestamptz | DEFAULT now() | Board creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last board modification |
| archived_at | timestamptz | NULL | Soft deletion timestamp |

**Indexes**: user_id, archived_at
**RLS Policy**: Users can only access their own boards
**Validation**: name length 1-100 characters, color must be valid hex

### check_ins
Daily completion records for habit boards.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique check-in identifier |
| board_id | uuid | FOREIGN KEY boards(id), NOT NULL | Associated board |
| user_id | uuid | FOREIGN KEY users(id), NOT NULL | Check-in owner |
| date | date | NOT NULL | Check-in date (local timezone) |
| completed | boolean | NOT NULL | Completion status |
| notes | text | NULL | Optional notes/metadata |
| created_at | timestamptz | DEFAULT now() | Check-in creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last modification timestamp |

**Indexes**: UNIQUE(board_id, date), user_id, date
**RLS Policy**: Users can only access their own check-ins
**Constraints**: One check-in per board per date

## Data Validation Rules

### Board Validation
- **name**: Required, 1-100 characters, trimmed
- **description**: Optional, max 500 characters
- **color**: Valid hex color (e.g., #22c55e), defaults to green
- **icon**: Optional, single emoji or text icon

### Check-in Validation
- **date**: Cannot be more than 1 day in the future
- **completed**: Boolean true/false
- **notes**: Optional, max 1000 characters

### API Key Validation
- **label**: Required, 1-50 characters, unique per user
- **key**: 32-character random string (generated client-side)

## State Transitions

### Board Lifecycle
1. **Created** → Active board available for check-ins
2. **Updated** → Name, description, color changes
3. **Archived** → Soft deleted, hidden from UI but data preserved

### Check-in Lifecycle
1. **Created** → New check-in for date/board combination
2. **Updated** → Change completion status or add notes
3. **Deleted** → Hard deletion allowed (affects historical data)

### API Key Lifecycle
1. **Generated** → Active key for API access
2. **Used** → Updates last_used_at timestamp
3. **Revoked** → Soft deleted, authentication fails

## Data Access Patterns

### Read Operations
- **Dashboard View**: Recent check-ins across all boards for date range
- **Board Detail**: Single board with check-in history
- **Progress Grid**: Check-in aggregations by date ranges (week/month/year)
- **API Integration**: Board list and check-in data via API keys

### Write Operations
- **Quick Check-in**: Mark today's completion for multiple boards
- **Bulk Update**: Historical check-in modifications
- **Board Management**: CRUD operations on boards
- **API Key Management**: Generate, label, revoke keys

## Performance Considerations

### Database Optimization
- Composite index on (board_id, date) for check-in queries
- Partial index on archived_at IS NULL for active boards
- Periodic cleanup of revoked API keys older than 30 days

### Caching Strategy
- Board list cached per user (TTL: 5 minutes)
- Check-in grids cached by date range (TTL: 1 hour)
- API key validation cached (TTL: 15 minutes)