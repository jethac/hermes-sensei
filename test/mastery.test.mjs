import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateMastery } from '../src/core/mastery.mjs';

const now = new Date().toISOString();

test('an exam-shaped prior never changes untested into known', () => {
  const result = estimateMastery([], {
    prior: { probability: 0.9, strength: 2, source: 'exam prior' },
    subjectType: 'capability'
  });
  assert.equal(result.status, 'untested');
  assert.equal(result.confidence, 0);
});

test('recognition alone stays fragile for a broad capability', () => {
  const result = estimateMastery([
    { score: 1, confidence: 1, modality: 'recognition', observedAt: now },
    { score: 1, confidence: 1, modality: 'recognition', observedAt: now },
    { score: 1, confidence: 1, modality: 'recognition', observedAt: now }
  ], { subjectType: 'capability' });
  assert.equal(result.status, 'fragile');
  assert.equal(result.durable, false);
});

test('repeated successful transfer can become durable', () => {
  const result = estimateMastery([
    { score: 1, confidence: 1, modality: 'transfer', observedAt: now },
    { score: 1, confidence: 1, modality: 'production', observedAt: now }
  ], { subjectType: 'capability' });
  assert.equal(result.status, 'known');
  assert.equal(result.durable, true);
  assert.ok(result.confidence >= 0.5);
});

test('item evidence can inform a capability prior without claiming it was tested', () => {
  const result = estimateMastery([
    { score: 0, confidence: 1, modality: 'recall', observedAt: now, indirect: true }
  ], { subjectType: 'capability' });
  assert.equal(result.status, 'untested');
  assert.equal(result.evidenceCount, 0);
  assert.equal(result.supportingEvidenceCount, 1);
});

test('a learner-confirmed highlighted miss is immediately an unknown recognition gap', () => {
  const result = estimateMastery([
    { score: 0, confidence: 0.95, modality: 'recognition', observedAt: now, assertedGap: true }
  ], { subjectType: 'vocabulary' });
  assert.equal(result.status, 'unknown');
  assert.equal(result.confirmedGap, true);
});
