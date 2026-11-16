#!/usr/bin/env node
/**
 * AI DJ Studio — Administrative Operator Provisioning Utility
 * 
 * Usage:
 *   node scripts/provision-admin.mjs --email admin@example.com --password YourSecurePassword123! --name "Lead DJ Admin"
 *   OR
 *   INITIAL_ADMIN_EMAIL=admin@example.com INITIAL_ADMIN_PASSWORD=YourPassword node scripts/provision-admin.mjs
 */

import crypto from 'node:crypto';
import { provisionAdminUser } from '../src/server/auth.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      options.email = args[++i];
    } else if (args[i] === '--password' && args[i + 1]) {
      options.password = args[++i];
    } else if (args[i] === '--name' && args[i + 1]) {
      options.name = args[++i];
    }
  }
  return options;
}

const cliArgs = parseArgs();
const email = cliArgs.email || process.env.INITIAL_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
let password = cliArgs.password || process.env.INITIAL_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
const name = cliArgs.name || process.env.INITIAL_ADMIN_NAME || 'Platform Administrator';

if (!email) {
  console.error('[PROVISION ERROR] Administrator email is required.');
  console.error('Provide --email <email> or set INITIAL_ADMIN_EMAIL environment variable.');
  process.exit(1);
}

let generatedPassword = false;
if (!password) {
  // Generate a cryptographically secure 24-character random password
  password = crypto.randomBytes(18).toString('base64').replace(/[^a-zA-Z0-9]/g, 'X') + '!A9';
  generatedPassword = true;
}

try {
  const result = provisionAdminUser({ email, password, name });
  console.log('====================================================');
  console.log(`[PROVISION SUCCESS] Administrator account ${result.action}:`);
  console.log(`  ID:    ${result.user.id}`);
  console.log(`  Email: ${result.user.email}`);
  console.log(`  Name:  ${result.user.name}`);
  console.log(`  Role:  ${result.user.role}`);
  if (generatedPassword) {
    console.log(`  Generated Password: ${password}`);
    console.log('  IMPORTANT: Save this password immediately. It will not be shown again.');
  } else {
    console.log('  Password: [SECURELY CONFIGURED VIA INPUT]');
  }
  console.log('====================================================');
  process.exit(0);
} catch (err) {
  console.error('[PROVISION ERROR] Failed to provision administrator:', err.message);
  process.exit(1);
}
