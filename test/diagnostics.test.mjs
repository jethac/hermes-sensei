import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createSenseiService } from '../src/core/service.mjs';

test('runs an idempotent bounded diagnostic and records evidence', async (t) => {
  const stateRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sensei-diagnostic-'));
  t.after(() => fs.rm(stateRoot, { recursive: true, force: true }));
  const service = await createSenseiService({ stateRoot });
  const session = await service.begin({
    learnerId: 'test', declaredJlpt: 'N1', mode: 'baseline', lens: 'none', maxProbes: 4
  });

  const first = await service.next({ learnerId: 'test', sessionId: session.id, includeGradingReference: true });
  const repeated = await service.next({ learnerId: 'test', sessionId: session.id, includeGradingReference: true });
  assert.equal(first.probe.id, repeated.probe.id);
  assert.ok(first.probe.gradingReference);

  const seenTypes = new Set();
  let current = first;
  for (let index = 0; index < 4; index += 1) {
    assert.ok(current.probe);
    seenTypes.add(current.probe.subjectType);
    await service.record({
      learnerId: 'test', sessionId: session.id, probeId: current.probe.id,
      score: index % 2 ? 1 : 0.5, confidence: 0.8, evaluatedBy: 'teacher'
    });
    current = await service.next({ learnerId: 'test', sessionId: session.id, includeGradingReference: true });
  }
  assert.equal(current.status, 'completed');
  assert.equal(seenTypes.size, 4);

  const learner = await service.learner('test');
  assert.equal(learner.mastery.summary.evidenceCount, 4);
  assert.equal(learner.sessions[0].status, 'completed');
});

test('returns grading references only when requested', async (t) => {
  const stateRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sensei-public-probe-'));
  t.after(() => fs.rm(stateRoot, { recursive: true, force: true }));
  const service = await createSenseiService({ stateRoot });
  const session = await service.begin({ learnerId: 'test', mode: 'baseline', lens: 'none', maxProbes: 4 });
  const publicResult = await service.next({ learnerId: 'test', sessionId: session.id, includeGradingReference: false });
  assert.equal('gradingReference' in publicResult.probe, false);
  const privateResult = await service.next({ learnerId: 'test', sessionId: session.id, includeGradingReference: true });
  assert.equal('gradingReference' in privateResult.probe, true);
});

test('auto-scores vocabulary options without exposing the answer to the web probe', async (t) => {
  const stateRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sensei-auto-score-'));
  t.after(() => fs.rm(stateRoot, { recursive: true, force: true }));
  const service = await createSenseiService({ stateRoot });
  const session = await service.begin({ learnerId: 'test', mode: 'baseline', lens: 'none', maxProbes: 8 });
  let privateProbe;
  while (true) {
    const next = await service.next({ learnerId: 'test', sessionId: session.id, includeGradingReference: true });
    privateProbe = next.probe;
    assert.ok(privateProbe);
    if (privateProbe.subjectType === 'vocabulary') break;
    await service.record({
      learnerId: 'test', sessionId: session.id, probeId: privateProbe.id,
      score: 0.5, confidence: 0.7, evaluatedBy: 'learner'
    });
  }
  const recorded = await service.record({
    learnerId: 'test', sessionId: session.id, probeId: privateProbe.id,
    selectedOption: privateProbe.gradingReference.answer, confidence: 0.9, evaluatedBy: 'learner'
  });
  assert.equal(recorded.autoScored, true);
  assert.equal(recorded.score, 1);
});
