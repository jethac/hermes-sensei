import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { stateRoot as defaultStateRoot } from './paths.mjs';

const locks = new Map();

export function assertLearnerId(learnerId) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(learnerId ?? '')) {
    throw new Error('learnerId must be 1-64 letters, numbers, underscores, or hyphens');
  }
  return learnerId;
}

function learnerPath(root, learnerId) {
  return path.join(root, 'learners', `${assertLearnerId(learnerId)}.json`);
}

export function newLearnerState(learnerId) {
  const now = new Date().toISOString();
  return {
    schemaVersion: '0.2.0',
    learner: {
      id: assertLearnerId(learnerId),
      displayName: '',
      declaredJlpt: null,
      declaredBjt: null,
      goals: [],
      targetCapabilityIds: [],
      createdAt: now,
      updatedAt: now
    },
    evidence: [],
    sessions: [],
    planHistory: [],
    personalItems: [],
    scans: [],
    scanFindings: []
  };
}

function migrateLearnerState(state) {
  // Runtime migration keeps existing private learner files usable without a
  // separate migration command. The upgraded shape is persisted on the next
  // mutating operation.
  state.schemaVersion = '0.2.0';
  state.evidence ??= [];
  state.sessions ??= [];
  state.planHistory ??= [];
  state.personalItems ??= [];
  state.scans ??= [];
  state.scanFindings ??= [];
  return state;
}

async function ensureRoot(root) {
  await fs.mkdir(path.join(root, 'learners'), { recursive: true });
  await fs.mkdir(path.join(root, 'locks'), { recursive: true });
}

async function acquireFileLock(root, learnerId) {
  await ensureRoot(root);
  const lockPath = path.join(root, 'locks', `${assertLearnerId(learnerId)}.lock`);
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const handle = await fs.open(lockPath, 'wx', 0o600);
      await handle.writeFile(`${process.pid} ${new Date().toISOString()}\n`);
      return async () => {
        await handle.close().catch(() => {});
        await fs.unlink(lockPath).catch((error) => {
          if (error.code !== 'ENOENT') throw error;
        });
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const stat = await fs.stat(lockPath).catch(() => null);
      if (stat && Date.now() - stat.mtimeMs > 30_000) {
        await fs.unlink(lockPath).catch(() => {});
        continue;
      }
      await new Promise((resolve) => setTimeout(resolve, 20 + Math.floor(Math.random() * 35)));
    }
  }
  throw new Error(`Timed out waiting for learner state lock: ${learnerId}`);
}

export async function loadLearner(learnerId, { root = defaultStateRoot(), create = true } = {}) {
  const resolvedRoot = path.resolve(root);
  const filePath = learnerPath(resolvedRoot, learnerId);
  try {
    return migrateLearnerState(JSON.parse(await fs.readFile(filePath, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT' || !create) throw error;
    // New state remains in memory until a mutating operation saves it under
    // the cross-process learner lock. A read-only request must never race an
    // MCP write by creating or replacing the learner file.
    return newLearnerState(learnerId);
  }
}

export async function saveLearner(state, { root = defaultStateRoot() } = {}) {
  const resolvedRoot = path.resolve(root);
  await ensureRoot(resolvedRoot);
  state.learner.updatedAt = new Date().toISOString();
  const destination = learnerPath(resolvedRoot, state.learner.id);
  const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await fs.rename(temporary, destination);
  return state;
}

export async function updateLearner(learnerId, updater, { root = defaultStateRoot() } = {}) {
  const key = `${path.resolve(root)}:${assertLearnerId(learnerId)}`;
  const previous = locks.get(key) ?? Promise.resolve();
  const current = previous.then(async () => {
    const resolvedRoot = path.resolve(root);
    const release = await acquireFileLock(resolvedRoot, learnerId);
    try {
      const state = await loadLearner(learnerId, { root: resolvedRoot });
      const result = await updater(state);
      await saveLearner(state, { root: resolvedRoot });
      return result ?? state;
    } finally {
      await release();
    }
  });
  const settled = current.catch(() => {});
  locks.set(key, settled);
  try {
    return await current;
  } finally {
    if (locks.get(key) === settled) locks.delete(key);
  }
}

export async function setLearnerContext(learnerId, context, options = {}) {
  return updateLearner(learnerId, (state) => {
    if (context.displayName !== undefined) state.learner.displayName = String(context.displayName).slice(0, 120);
    if (context.declaredJlpt !== undefined) state.learner.declaredJlpt = context.declaredJlpt || null;
    if (context.declaredBjt !== undefined) state.learner.declaredBjt = context.declaredBjt || null;
    if (context.goals !== undefined) state.learner.goals = [...new Set(context.goals.map(String))].slice(0, 12);
    if (context.targetCapabilityIds !== undefined) {
      state.learner.targetCapabilityIds = [...new Set(context.targetCapabilityIds.map(String))].slice(0, 33);
    }
    return state.learner;
  }, options);
}

export function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}
