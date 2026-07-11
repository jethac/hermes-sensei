import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadLearner } from '../src/core/store.mjs';

function runWorker(script, root, prefix) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '--eval', script, root, prefix], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`worker ${prefix} exited ${code}: ${stderr}`)));
  });
}

test('serializes learner updates across web/MCP-style processes', async (t) => {
  const stateRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sensei-locks-'));
  t.after(() => fs.rm(stateRoot, { recursive: true, force: true }));
  const storeUrl = new URL('../src/core/store.mjs', import.meta.url).href;
  const worker = `
    import { updateLearner } from ${JSON.stringify(storeUrl)};
    const root = process.argv[1];
    const prefix = process.argv[2];
    for (let index = 0; index < 8; index += 1) {
      await updateLearner('concurrent', (state) => { state.planHistory.push(prefix + ':' + index); }, { root });
    }
  `;
  await Promise.all(['web-a', 'web-b', 'mcp-a', 'mcp-b'].map((prefix) => runWorker(worker, stateRoot, prefix)));
  const state = await loadLearner('concurrent', { root: stateRoot });
  assert.equal(state.planHistory.length, 32);
  assert.equal(new Set(state.planHistory).size, 32);
});

