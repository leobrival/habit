#!/bin/bash
# Backup script for JWT migration
# This script creates comprehensive backups before starting the migration

echo "🔄 Creating migration backup..."
timestamp=$(date +%Y%m%d_%H%M%S)
backup_dir="./backups/migration_$timestamp"
mkdir -p "$backup_dir"

# Code backup
echo "📁 Backing up critical code files..."
cp -r lib/ "$backup_dir/lib_backup/"
cp -r app/api/ "$backup_dir/api_backup/"
cp package.json "$backup_dir/"
cp .env.local "$backup_dir/.env.local.backup"

# Database state capture
echo "📊 Capturing current API state..."
if command -v curl &> /dev/null; then
    echo "Testing API availability..."
    if curl -s -f http://localhost:3000/api/boards \
        -H "Authorization: Bearer bc529961369183feb7eff2c5e3699ba7" \
        > "$backup_dir/api_state_before.json" 2>/dev/null; then
        echo "✅ API state captured"
    else
        echo "⚠️  API not available or authentication failed"
    fi
else
    echo "⚠️  curl not available, skipping API state capture"
fi

# Git state
echo "📋 Saving git state..."
git log --oneline -10 > "$backup_dir/git_log.txt"
git status > "$backup_dir/git_status.txt"
git diff > "$backup_dir/git_diff.txt"

# Environment info
echo "🔧 Saving environment info..."
node --version > "$backup_dir/node_version.txt"
pnpm --version > "$backup_dir/pnpm_version.txt"
echo "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}" > "$backup_dir/env_check.txt"

echo "✅ Backup créé dans $backup_dir"
echo "📝 Backup includes: code, git state, API state, environment info"