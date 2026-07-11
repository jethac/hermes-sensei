import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createSenseiService } from '../src/core/service.mjs';

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

test('Hermes-compatible stdio MCP server lists and calls its compact tool surface', async (t) => {
  const stateRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sensei-mcp-'));
  t.after(() => fs.rm(stateRoot, { recursive: true, force: true }));
  const service = await createSenseiService({ stateRoot });
  const scan = await service.createScan('vision', { data: onePixelPng, filename: 'page.png', declaredMimeType: 'image/png' });
  const serverPath = fileURLToPath(new URL('../src/mcp/server.mjs', import.meta.url));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: { ...process.env, SENSEI_STATE_PATH: stateRoot }
  });
  const client = new Client({ name: 'sensei-test', version: '0.2.0' });
  t.after(async () => {
    await client.close().catch(() => {});
  });
  await client.connect(transport);
  const listed = await client.listTools();
  assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), [
    'analyze_gaps', 'begin_diagnostic', 'catalog', 'ingest_highlights', 'inspect_scan',
    'next_probe', 'record_evidence', 'review_highlights', 'scan_inbox'
  ]);
  const called = await client.callTool({ name: 'catalog', arguments: { query: 'literary reading', lens: 'jlpt:N1', limit: 3 } });
  assert.equal(called.isError, undefined);
  assert.match(called.content[0].text, /jc_literary_reading/);
  const inspected = await client.callTool({ name: 'inspect_scan', arguments: { learnerId: 'vision', scanId: scan.id } });
  assert.equal(inspected.isError, undefined);
  assert.deepEqual(inspected.content.map((block) => block.type), ['text', 'image']);
  assert.equal(inspected.content[1].mimeType, 'image/png');
});
