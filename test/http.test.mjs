import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createSenseiHttpServer } from '../src/http.mjs';

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

test('serves the app and executes the diagnostic API', async (t) => {
  const stateRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sensei-http-'));
  t.after(() => fs.rm(stateRoot, { recursive: true, force: true }));
  const { server } = await createSenseiHttpServer({ stateRoot });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Find the smallest thing worth fixing/);

  const health = await fetch(`${base}/api/health`).then((response) => response.json());
  assert.equal(health.ok, true);
  assert.equal(health.taxonomy.counts.capabilities, 33);

  const started = await fetch(`${base}/api/diagnostics`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ learnerId: 'web', mode: 'baseline', lens: 'none', maxProbes: 4 })
  }).then((response) => response.json());
  assert.ok(started.session.id);
  assert.ok(started.probe);
  assert.equal('gradingReference' in started.probe, false);

  const uploaded = await fetch(`${base}/api/learners/web/scans`, {
    method: 'POST',
    headers: { 'content-type': 'image/png', 'x-sensei-filename': encodeURIComponent('reading.png') },
    body: onePixelPng
  }).then((response) => response.json());
  assert.match(uploaded.scan.id, /^scan_/);
  const image = await fetch(`${base}/api/learners/web/scans/${uploaded.scan.id}/image`);
  assert.equal(image.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), onePixelPng);

  const extracted = await fetch(`${base}/api/learners/web/scans/${uploaded.scan.id}/highlights`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ findings: [{ kind: 'vocabulary', surface: '未登録語', confidence: 0.9 }] })
  }).then((response) => response.json());
  assert.equal(extracted.reviewRequired, 1);
  const reviewed = await fetch(`${base}/api/learners/web/highlights/review`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ decisions: [{ findingId: extracted.added[0].id, decision: 'confirm' }] })
  }).then((response) => response.json());
  assert.equal(reviewed.reviewed[0].status, 'confirmed');
  const analysis = await fetch(`${base}/api/analysis?learnerId=web`).then((response) => response.json());
  assert.equal(analysis.summary.confirmedHighlights, 1);
  assert.equal(analysis.readingQueue.length, 1);

  const rejectedUpload = await fetch(`${base}/api/learners/web/scans`, {
    method: 'POST',
    headers: { 'content-type': 'image/png', 'x-sensei-filename': 'not-an-image.png' },
    body: Buffer.from('not really an image')
  });
  assert.equal(rejectedUpload.status, 415);
});
