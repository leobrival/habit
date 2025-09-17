/**
 * Infrastructure validation script for JWT migration
 * Validates UUIDs, connectivity, and environment before migration
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createServerSupabaseClient } from '../lib/supabase';

interface ValidationResult {
  success: boolean;
  message: string;
  details?: any;
}

async function validateUUIDs(): Promise<ValidationResult> {
  console.log('🔍 Validating UUID consistency in database...');

  try {
    const supabase = createServerSupabaseClient();

    // Check boards table
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select('user_id')
      .limit(100);

    if (boardsError) {
      return {
        success: false,
        message: 'Failed to query boards table',
        details: boardsError
      };
    }

    // Check check_ins table
    const { data: checkIns, error: checkInsError } = await supabase
      .from('check_ins')
      .select('user_id')
      .limit(100);

    if (checkInsError) {
      return {
        success: false,
        message: 'Failed to query check_ins table',
        details: checkInsError
      };
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const invalidBoards = boards?.filter(b => !uuidRegex.test(b.user_id)) || [];
    const invalidCheckIns = checkIns?.filter(c => !uuidRegex.test(c.user_id)) || [];

    if (invalidBoards.length > 0 || invalidCheckIns.length > 0) {
      return {
        success: false,
        message: 'Found invalid UUIDs in database',
        details: {
          invalidBoards: invalidBoards.length,
          invalidCheckIns: invalidCheckIns.length
        }
      };
    }

    return {
      success: true,
      message: `UUID validation passed. Checked ${boards?.length || 0} boards and ${checkIns?.length || 0} check-ins`,
      details: {
        boardsCount: boards?.length || 0,
        checkInsCount: checkIns?.length || 0
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'UUID validation failed with exception',
      details: error
    };
  }
}

async function validateSupabaseConnectivity(): Promise<ValidationResult> {
  console.log('🔗 Testing Supabase connectivity...');

  try {
    const supabase = createServerSupabaseClient();

    // Test basic connectivity
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      return {
        success: false,
        message: 'Supabase connectivity failed',
        details: error
      };
    }

    return {
      success: true,
      message: 'Supabase connectivity successful'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Supabase connectivity test failed with exception',
      details: error
    };
  }
}

function validateEnvironment(): ValidationResult {
  console.log('🔧 Validating environment variables...');

  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    return {
      success: false,
      message: 'Missing required environment variables',
      details: { missing }
    };
  }

  // Check if service role key is not placeholder
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey?.startsWith('placeholder') || !serviceKey?.startsWith('eyJ')) {
    return {
      success: false,
      message: 'Service role key appears to be placeholder or invalid',
      details: { serviceKey: serviceKey?.slice(0, 20) + '...' }
    };
  }

  return {
    success: true,
    message: 'All required environment variables are present',
    details: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  };
}

async function runValidation() {
  console.log('🚀 Starting infrastructure validation for JWT migration\n');

  const results: ValidationResult[] = [];

  // Run all validations
  results.push(validateEnvironment());
  results.push(await validateSupabaseConnectivity());
  results.push(await validateUUIDs());

  // Print results
  console.log('\n📋 Validation Results:');
  console.log('=' .repeat(50));

  let allPassed = true;
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.message}`);

    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }

    if (!result.success) {
      allPassed = false;
    }

    console.log();
  });

  if (allPassed) {
    console.log('🎉 All validations passed! Ready for JWT migration.');
    process.exit(0);
  } else {
    console.log('⚠️  Some validations failed. Please fix issues before proceeding.');
    process.exit(1);
  }
}

// Execute validation
runValidation().catch(error => {
  console.error('💥 Validation script failed:', error);
  process.exit(1);
});