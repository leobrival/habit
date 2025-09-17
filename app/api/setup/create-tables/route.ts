import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Execute our SQL migrations
    const createTablesSQL = `
      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Create users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      -- Create api_keys table
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) NOT NULL,
        key_hash TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        last_used_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ
      );

      -- Create boards table
      CREATE TABLE IF NOT EXISTS boards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) NOT NULL,
        name TEXT NOT NULL CHECK (length(trim(name)) >= 1 AND length(trim(name)) <= 100),
        description TEXT CHECK (length(description) <= 500),
        color TEXT DEFAULT '#22c55e' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
        icon TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        archived_at TIMESTAMPTZ
      );

      -- Create check_ins table
      CREATE TABLE IF NOT EXISTS check_ins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        board_id UUID REFERENCES boards(id) NOT NULL,
        user_id UUID REFERENCES users(id) NOT NULL,
        date DATE NOT NULL CHECK (date <= CURRENT_DATE + INTERVAL '1 day'),
        completed BOOLEAN NOT NULL,
        notes TEXT CHECK (length(notes) <= 1000),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(board_id, date)
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_api_keys_revoked ON api_keys(revoked_at);

      CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
      CREATE INDEX IF NOT EXISTS idx_boards_archived ON boards(archived_at);

      CREATE INDEX IF NOT EXISTS idx_check_ins_board_date ON check_ins(board_id, date);
      CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);
      CREATE INDEX IF NOT EXISTS idx_check_ins_date ON check_ins(date);
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql: createTablesSQL })

    if (error) {
      return NextResponse.json({
        status: 'ERROR',
        error: error.message,
        code: error.code,
        details: error.details
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Tables created successfully!',
      result: data
    })

  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      error: (error as Error).message
    }, { status: 500 })
  }
}