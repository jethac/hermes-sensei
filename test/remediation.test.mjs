import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createSenseiService } from '../src/core/service.mjs';

test('starts with measurement and produces bounded prerequisite-aware actions', async (t) => {
  const stateRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sensei-plan-'));
  t.after(() => fs.rm(stateRoot, { recursive: true, force: true }));
  const service = await createSenseiService({ stateRoot });
  await service.setContext('planner', {
    declaredJlpt: 'N1',
    targetCapabilityIds: ['jc_critical_reading'],
    goals: ['Read and critique difficult Japanese arguments.']
  });
  const analysis = await service.analyze({
    learnerId: 'planner', lens: 'jlpt:N1', targetCapabilityIds: ['jc_critical_reading'], limit: 5
  });
  assert.ok(analysis.relevantCapabilityIds.includes('jc_critical_reading'));
  assert.ok(analysis.plan.length > 0 && analysis.plan.length <= 5);
  assert.ok(analysis.plan.every((item) => item.actionType === 'diagnose'));
  assert.ok(analysis.plan.every((item) => item.successEvidence && item.retest));
  assert.ok(analysis.plan.every((item) => item.titleJa && item.whyJa && item.successEvidenceJa && item.retestJa));
});
