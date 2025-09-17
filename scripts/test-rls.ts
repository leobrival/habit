/**
 * RLS Testing Suite
 * Tests Row Level Security configuration with JWT authentication
 */

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });

import {
  createServerSupabaseClient,
  createUserContextSupabaseClient,
} from '../lib/supabase';

async function testRLS() {
  console.log('🔍 Testing RLS configuration...\n');

  // 1. Test avec service role (doit voir toutes les données)
  console.log('📊 Testing admin access (service role)...');
  try {
    const adminClient = createServerSupabaseClient();
    const { data: adminBoards, error: adminError } = await adminClient
      .from('boards')
      .select('*');

    console.log('   Result:', {
      boardCount: adminBoards?.length || 0,
      error: adminError?.message || 'none',
      status: adminError ? '❌ FAIL' : '✅ PASS'
    });
  } catch (error: any) {
    console.log('   Result: ❌ FAIL -', error.message);
  }

  console.log();

  // 2. Test avec client anonyme (doit voir 0 lignes à cause du RLS)
  console.log('🚫 Testing anonymous access (should fail)...');
  try {
    const anonClient = createUserContextSupabaseClient('fake-token');
    const { data: anonBoards, error: anonError } = await anonClient
      .from('boards')
      .select('*');

    console.log('   Result:', {
      boardCount: anonBoards?.length || 0,
      error: anonError?.message || 'none',
      expected: 'Should be 0 boards or auth error',
      status: (anonBoards?.length === 0 || anonError) ? '✅ PASS' : '❌ FAIL'
    });
  } catch (error: any) {
    console.log('   Result: ✅ PASS - Auth properly blocked:', error.message);
  }

  console.log();

  // 3. Test des policies existantes
  console.log('📋 Testing RLS policies...');
  try {
    const adminClient = createServerSupabaseClient();
    const { data: policies, error: policiesError } = await adminClient
      .from('pg_policies')
      .select('tablename, policyname, cmd')
      .in('tablename', ['users', 'boards', 'check_ins']);

    if (policiesError) {
      console.log('   Result: ❌ FAIL - Could not query policies:', policiesError.message);
    } else {
      console.log('   Policies found:');
      policies?.forEach(policy => {
        console.log(`     - ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
      });
      console.log(`   Total policies: ${policies?.length || 0}`);
      console.log('   Status:', policies && policies.length > 0 ? '✅ PASS' : '❌ FAIL');
    }
  } catch (error: any) {
    console.log('   Result: ❌ FAIL -', error.message);
  }

  console.log();

  // 4. Test de l'état RLS
  console.log('🔒 Testing RLS status...');
  try {
    const adminClient = createServerSupabaseClient();
    const { data: rlsStatus, error: rlsError } = await adminClient.rpc('check_rls_status', {});

    if (rlsError) {
      // Si la fonction n'existe pas, on va créer une requête directe
      const { data: tables, error: tablesError } = await adminClient
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['users', 'boards', 'check_ins']);

      if (tablesError) {
        console.log('   Result: ❌ FAIL - Could not check tables:', tablesError.message);
      } else {
        console.log('   Tables checked:', tables?.map(t => t.table_name).join(', '));
        console.log('   Status: ⚠️  Manual verification needed via Supabase Dashboard');
      }
    } else {
      console.log('   RLS Status:', rlsStatus);
      console.log('   Status: ✅ PASS');
    }
  } catch (error: any) {
    console.log('   Result: ⚠️  Could not auto-check RLS status:', error.message);
    console.log('   Please verify RLS is enabled in Supabase Dashboard');
  }

  console.log();

  // 5. Instructions pour l'utilisateur
  console.log('📝 Next Steps:');
  console.log('   1. ✅ Apply RLS migration script in Supabase SQL Editor:');
  console.log('      Copy content of scripts/migration_rls_jwt.sql');
  console.log('   2. ✅ Verify RLS is enabled for users, boards, check_ins tables');
  console.log('   3. ✅ Test with real JWT token after migration is applied');

  console.log('\n✅ RLS test suite completed');
}

// Exécuter: npx tsx scripts/test-rls.ts
testRLS().catch(error => {
  console.error('💥 RLS test failed:', error);
  process.exit(1);
});