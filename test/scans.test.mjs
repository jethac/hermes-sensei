import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createSenseiService } from '../src/core/service.mjs';
import { loadLearner } from '../src/core/store.mjs';

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

test('turns a reviewed scan highlight into a personal gap, quiz candidate, and reading queue item', async (t) => {
  const stateRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sensei-scans-'));
  t.after(() => fs.rm(stateRoot, { recursive: true, force: true }));
  const service = await createSenseiService({ stateRoot });

  const scan = await service.createScan('reader', {
    data: onePixelPng,
    filename: '../highlighted-page.png',
    declaredMimeType: 'image/png'
  });
  assert.equal(scan.filename, 'highlighted-page.png');
  assert.equal(scan.status, 'pending');
  assert.equal(scan.originalAvailable, true);

  const ingested = await service.ingestHighlights('reader', {
    scanId: scan.id,
    findings: [{
      kind: 'vocabulary', surface: '澆季混濁誤', reading: 'ぎょうきこんだくご',
      context: '澆季混濁語を読み飛ばした。', confidence: 0.91
    }]
  });
  assert.equal(ingested.added.length, 1);
  assert.equal(ingested.scan.status, 'extracted');

  let state = await loadLearner('reader', { root: stateRoot });
  assert.equal(state.personalItems.length, 0, 'OCR proposals are not evidence before review');
  assert.equal(state.evidence.length, 0);

  const reviewed = await service.reviewHighlights('reader', [{
    findingId: ingested.added[0].id,
    decision: 'confirm',
    surface: '澆季混濁語',
    gloss: 'a deliberately obscure test word'
  }]);
  assert.equal(reviewed.reviewed[0].status, 'confirmed');

  state = await loadLearner('reader', { root: stateRoot });
  assert.equal(state.personalItems.length, 1);
  assert.equal(state.evidence.length, 1);
  assert.equal(state.evidence[0].assertedGap, true);
  assert.equal(state.evidence[0].sessionId, null);

  const analysis = await service.analyze({ learnerId: 'reader', limit: 6 });
  const personal = analysis.heatmap.vocabulary.find((item) => item.origin === 'personal');
  assert.equal(personal.lemma, '澆季混濁語');
  assert.equal(personal.status, 'unknown');
  assert.equal(personal.flaggedCount, 1);
  assert.equal(analysis.readingQueue[0].subjectId, personal.id);

  const session = await service.begin({ learnerId: 'reader', focus: 'reading-gaps', maxProbes: 4 });
  const next = await service.next({ learnerId: 'reader', sessionId: session.id });
  assert.equal(next.probe.subjectId, personal.id);
  assert.equal(next.probe.subjectType, 'vocabulary');

  const deleted = await service.deleteScanOriginal('reader', scan.id);
  assert.equal(deleted.originalAvailable, false);
  const finalInbox = await service.scanInbox('reader');
  assert.equal(finalInbox.scans[0].status, 'reviewed');
  assert.equal(finalInbox.summary.confirmed, 1);

  const direct = await service.ingestHighlights('reader', {
    sourceLabel: 'Hermes clipboard attachment',
    findings: [{ kind: 'grammar', surface: 'にかこつけて', confidence: 0.7 }]
  });
  assert.equal(direct.scan.source, 'hermes-attachment');
  assert.equal(direct.scan.originalAvailable, false);
  const rejected = await service.reviewHighlights('reader', [{ findingId: direct.added[0].id, decision: 'reject' }]);
  assert.equal(rejected.reviewed[0].status, 'rejected');
});
