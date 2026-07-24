#!/usr/bin/env node
// Operational check for the mastery platform link. Verifies (without ever
// printing a secret): credential availability, guide-token exchange,
// a proficiency read through the guide token, and retry-queue depth.
//
//   node scripts/mastery-sync-check.mjs

import { createMasteryClientFromEnvironment } from '../src/core/masteryClient.mjs';

const client = await createMasteryClientFromEnvironment();
if (!client) {
  console.error('mastery sync is disabled (no credentials, SENSEI_MASTERY_SYNC=0, or test context)');
  process.exit(1);
}

console.log(`guide_id   ${client.guideId}`);
console.log(`learner_id ${client.learnerId}`);

try {
  const token = await client.getToken();
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  console.log(`token      ok (scopes: ${(claims.scopes ?? []).join(', ')}; expires in ${claims.exp - Math.floor(Date.now() / 1000)}s)`);
} catch (error) {
  console.error(`token      FAILED: ${error.message}`);
  process.exit(1);
}

try {
  const { status, rows } = await client.readProficiency({ select: 'item_id,state,retrievability,updated_at', limit: 5 });
  console.log(`read       HTTP ${status}, ${rows.length} proficiency row(s)${rows.length ? ` e.g. ${rows[0].item_id}` : ''}`);
} catch (error) {
  console.error(`read       FAILED: ${error.message}`);
  process.exit(1);
}

const queue = await client.queueStatus();
console.log(`queue      ${queue.pending} pending statement(s), ${queue.bytes} bytes`);
