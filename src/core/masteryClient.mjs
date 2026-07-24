// Mastery platform client (guide auth layer).
//
// Sensei is a registered *guide* on the mastery platform (CLIENTS-AND-AUTH.md):
// it authenticates as itself with a client secret, exchanges it for a
// short-lived (15 min) learner-scoped JWT at the guide-token edge function, and
// uses that token to push xAPI-shaped evidence (record-evidence, HTTP 202) and
// read the proficiency projection (PostgREST). Provenance (guide_id,
// source_client) is stamped server-side from the verified token — never sent
// by this client.
//
// Failure tolerance is the load-bearing contract here: the local evidence
// ledger is canonical and every local write must succeed whether or not
// mastery is reachable. Failed pushes land in an on-disk JSONL retry queue
// that is replayed at the start of the next push.
//
// Credentials: the client secret is fetched from Bitwarden Secrets Manager
// (bws) at startup when available, falling back to a 0600 config file at
// ~/.config/sensei-mastery/credentials.json (the launchd web service has no
// BWS_ACCESS_TOKEN). Secret values are never logged.

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const BWS_SECRET_KEY = 'SENSEI_MASTERY_CLIENT_SECRET';
const TOKEN_REFRESH_MARGIN_MS = 60_000; // re-exchange ~1 min before expiry
const QUEUE_MAX_BYTES = 5_000_000;
const QUEUE_MAX_ATTEMPTS = 50;

export function masteryConfigDir() {
  return path.join(os.homedir(), '.config', 'sensei-mastery');
}

function credentialsPath() {
  return path.join(masteryConfigDir(), 'credentials.json');
}

function defaultQueuePath() {
  return path.join(masteryConfigDir(), 'outbox.jsonl');
}

// ---- Credential loading ------------------------------------------------------

async function readSecretFromBws(timeoutMs = 15_000) {
  return new Promise((resolve) => {
    // A login shell so the user's profile provides BWS_ACCESS_TOKEN. Output is
    // consumed in-process only; it is never echoed or logged.
    const child = spawn('zsh', ['-lc', 'bws secret list 2>/dev/null'], {
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const chunks = [];
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve(null);
    }, timeoutMs);
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return resolve(null);
      try {
        const secrets = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const entry = Array.isArray(secrets) ? secrets.find((item) => item?.key === BWS_SECRET_KEY) : null;
        resolve(typeof entry?.value === 'string' && entry.value.length ? entry.value : null);
      } catch {
        resolve(null);
      }
    });
  });
}

async function readCredentialsFile() {
  try {
    return JSON.parse(await fs.readFile(credentialsPath(), 'utf8'));
  } catch {
    return null;
  }
}

// Loads mastery credentials: non-secret configuration (URLs, ids, the
// public-by-design anon key) from the 0600 credentials file, with the client
// secret preferentially refreshed from bws when it is reachable. Returns null
// when no complete credential set can be assembled.
export async function loadMasteryCredentials({ bwsTimeoutMs = 15_000, skipBws = false } = {}) {
  const fromFile = (await readCredentialsFile()) ?? {};
  const credentials = {
    supabaseUrl: process.env.SENSEI_MASTERY_URL || fromFile.supabase_url || 'https://rqhsohafdkfddlzlwcov.supabase.co',
    guideId: process.env.SENSEI_MASTERY_GUIDE_ID || fromFile.guide_id || null,
    learnerId: process.env.SENSEI_MASTERY_LEARNER_ID || fromFile.learner_id || null,
    anonKey: fromFile.anon_key || null,
    clientSecret: fromFile.client_secret || null
  };
  if (!skipBws) {
    const fromBws = await readSecretFromBws(bwsTimeoutMs);
    if (fromBws) credentials.clientSecret = fromBws;
  }
  if (!credentials.guideId || !credentials.learnerId || !credentials.anonKey || !credentials.clientSecret) {
    return null;
  }
  return credentials;
}

// ---- Evidence mapping --------------------------------------------------------

function gradedByFor(evaluatedBy) {
  if (evaluatedBy === 'auto') return 'deterministic';
  if (evaluatedBy === 'hermes') return 'model@hermes';
  return 'human'; // learner / teacher self- or human-graded
}

// Maps one local sensei evidence record onto the minimal xAPI statement shape
// record-evidence accepts, given the mastery registry item id it resolved to.
// The mapping is honest: scores, confidence, and timestamps are carried
// through unchanged, and provenance names the local evidence id so a statement
// can always be traced back to its origin.
export function evidenceToStatement(evidence, itemId, { localLearnerId } = {}) {
  const provenanceParts = [
    `hermes-sensei evidence ${evidence.id}`,
    `source ${evidence.sourceType}`,
    localLearnerId ? `local learner ${localLearnerId}` : null,
    evidence.sessionId ? `session ${evidence.sessionId}` : null,
    evidence.sourceRef?.scanId ? `scan ${evidence.sourceRef.scanId}` : null
  ].filter(Boolean);
  return {
    actor: { account: { name: `hermes-sensei:${localLearnerId ?? evidence.id}` } },
    // Bare verbs match the existing ledger convention. assertedGap evidence is
    // a learner-confirmed unknown (not an attempted answer), named as such.
    verb: { id: evidence.assertedGap ? 'asserted-gap' : 'answered' },
    object: { id: itemId },
    result: {
      success: evidence.assertedGap ? false : evidence.score >= 0.5,
      score: { scaled: evidence.score },
      extensions: {
        confidence: evidence.confidence,
        graded_by: gradedByFor(evidence.evaluatedBy),
        provenance: provenanceParts.join('; '),
        observed_at: evidence.observedAt,
        modality: evidence.modality,
        capability_ids: evidence.capabilityIds ?? []
      }
    },
    timestamp: evidence.observedAt
  };
}

// ---- Client ------------------------------------------------------------------

export function createMasteryClient(credentials, {
  queuePath = defaultQueuePath(),
  fetchImpl = fetch,
  logger = console
} = {}) {
  if (!credentials) throw new Error('createMasteryClient requires credentials');
  const { supabaseUrl, guideId, learnerId, anonKey, clientSecret } = credentials;

  let cachedToken = null; // { token, expiresAtMs }
  let exchangeInFlight = null;
  let queueChain = Promise.resolve();

  async function exchangeToken() {
    const response = await fetchImpl(`${supabaseUrl}/functions/v1/guide-token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ guide_id: guideId, client_secret: clientSecret, learner_id: learnerId })
    });
    if (!response.ok) {
      throw new Error(`guide-token exchange failed with HTTP ${response.status}`);
    }
    const body = await response.json();
    if (typeof body.access_token !== 'string') throw new Error('guide-token exchange returned no access_token');
    const ttlMs = (Number(body.expires_in) || 900) * 1000;
    cachedToken = { token: body.access_token, expiresAtMs: Date.now() + ttlMs };
    return cachedToken.token;
  }

  async function getToken({ force = false } = {}) {
    if (!force && cachedToken && Date.now() < cachedToken.expiresAtMs - TOKEN_REFRESH_MARGIN_MS) {
      return cachedToken.token;
    }
    if (!exchangeInFlight) {
      exchangeInFlight = exchangeToken().finally(() => {
        exchangeInFlight = null;
      });
    }
    return exchangeInFlight;
  }

  // Performs an authenticated request; on a 401 (expired/revoked token) the
  // client secret is re-exchanged once and the request retried.
  async function authorizedFetch(url, init = {}) {
    let token = await getToken();
    const doFetch = () => fetchImpl(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}`, apikey: anonKey }
    });
    let response = await doFetch();
    if (response.status === 401) {
      cachedToken = null;
      token = await getToken({ force: true });
      response = await doFetch();
    }
    return response;
  }

  async function postStatement(statement) {
    const response = await authorizedFetch(`${supabaseUrl}/functions/v1/record-evidence`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(statement)
    });
    if (response.status !== 202) {
      const detail = await response.text().catch(() => '');
      throw new Error(`record-evidence returned HTTP ${response.status} ${detail.slice(0, 200)}`);
    }
    return true;
  }

  // ---- Registry item resolution ---------------------------------------------
  //
  // evidence.item_id on mastery is a FOREIGN KEY into the items registry, so
  // every statement must name a registry item that actually exists. Sensei's
  // taxonomy node ids (jt_*) and capability ids (jc_*) map 1:1 onto
  // "taxonomy:<id>" / "capability:<id>" registry items (verified exhaustively:
  // all 2252 exist). Vocabulary and kanji use sensei-local hashes, so they are
  // resolved by written form (+ reading) against the registry, requiring a
  // UNIQUE match — a fuzzy or ambiguous mapping would be dishonest provenance.
  // Returns a registry item_id, or null when the subject has no registry
  // counterpart (e.g. personal items); throws on network failure so the
  // caller queues the evidence for retry.

  const itemIdCache = new Map();

  async function queryRegistry(filter) {
    const response = await authorizedFetch(`${supabaseUrl}/rest/v1/items?select=item_id&${filter}&limit=3`, { method: 'GET' });
    if (!response.ok) throw new Error(`items lookup returned HTTP ${response.status}`);
    return response.json();
  }

  async function resolveItemId(evidence) {
    const subjectId = String(evidence.subjectId ?? '');
    if (subjectId.startsWith('jt_')) return `taxonomy:${subjectId}`;
    if (subjectId.startsWith('jc_')) return `capability:${subjectId}`;
    if (itemIdCache.has(subjectId)) return itemIdCache.get(subjectId);
    const detail = evidence.subjectDetail ?? {};
    let resolved = null;
    if (detail.character) {
      const rows = await queryRegistry(`type=in.(kanji,kana)&written=eq.${encodeURIComponent(detail.character)}`);
      if (rows.length === 1) resolved = rows[0].item_id;
    } else if (detail.lemma) {
      let rows = await queryRegistry(`type=eq.word&written=eq.${encodeURIComponent(detail.lemma)}`);
      if (rows.length > 1 && detail.reading) {
        rows = await queryRegistry(`type=eq.word&written=eq.${encodeURIComponent(detail.lemma)}&reading=eq.${encodeURIComponent(detail.reading)}`);
      }
      if (rows.length === 1) resolved = rows[0].item_id;
    }
    itemIdCache.set(subjectId, resolved);
    return resolved;
  }

  // Resolves and posts one evidence record. Returns 'pushed' or 'unmapped'
  // (no registry counterpart — a definitive answer, not an error); throws on
  // delivery/lookup failure so the caller can queue for retry.
  async function deliver(evidence, localLearnerId) {
    const itemId = await resolveItemId(evidence);
    if (!itemId) return 'unmapped';
    await postStatement(evidenceToStatement(evidence, itemId, { localLearnerId }));
    return 'pushed';
  }

  // ---- Retry queue (JSONL on disk) ------------------------------------------

  async function enqueue(entry) {
    try {
      await fs.mkdir(path.dirname(queuePath), { recursive: true, mode: 0o700 });
      const stat = await fs.stat(queuePath).catch(() => null);
      if (stat && stat.size > QUEUE_MAX_BYTES) {
        logger.error('[mastery] retry queue is full; dropping one evidence statement');
        return;
      }
      await fs.appendFile(queuePath, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
    } catch (error) {
      logger.error(`[mastery] failed to queue evidence statement: ${error.message}`);
    }
  }

  // Drains the on-disk queue: the queue file is atomically moved aside so
  // concurrent enqueues keep working, then each entry is retried; failures are
  // re-queued with an attempt count and eventually dropped.
  async function replayQueueOnce() {
    let raw;
    const claimed = `${queuePath}.${process.pid}.replaying`;
    try {
      await fs.rename(queuePath, claimed);
      raw = await fs.readFile(claimed, 'utf8');
    } catch {
      return { replayed: 0, requeued: 0 }; // no queue, or another process claimed it
    }
    let replayed = 0;
    let requeued = 0;
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue; // malformed line: drop
      }
      try {
        const outcome = await deliver(entry.evidence, entry.localLearnerId);
        if (outcome === 'unmapped') {
          logger.error(`[mastery] queued evidence ${entry.evidence?.id ?? '?'} has no registry counterpart; dropping`);
        }
        replayed += 1;
      } catch (error) {
        const attempts = (entry.attempts ?? 0) + 1;
        if (attempts >= QUEUE_MAX_ATTEMPTS) {
          logger.error(`[mastery] dropping queued statement after ${attempts} attempts: ${error.message}`);
        } else {
          await enqueue({ ...entry, attempts, lastError: String(error.message).slice(0, 200) });
          requeued += 1;
        }
      }
    }
    await fs.unlink(claimed).catch(() => {});
    return { replayed, requeued };
  }

  function replayQueue() {
    queueChain = queueChain.then(replayQueueOnce, replayQueueOnce);
    return queueChain;
  }

  // ---- Public surface --------------------------------------------------------

  return {
    guideId,
    learnerId,

    getToken,

    // Fire-and-forget-safe evidence push. NEVER throws: any evidence that
    // cannot be delivered right now is appended to the on-disk retry queue
    // (as the raw evidence record — resolution happens at delivery time) and
    // replayed at the start of the next push. Evidence with no registry
    // counterpart (personal items, unmatched words) stays local-only, logged.
    async pushEvidence(records, { learnerId: localLearnerId } = {}) {
      const list = (Array.isArray(records) ? records : [records]).filter(Boolean);
      if (!list.length) return { pushed: 0, queued: 0, unmapped: 0 };
      await replayQueue().catch(() => {});
      let pushed = 0;
      let queued = 0;
      let unmapped = 0;
      for (const evidence of list) {
        try {
          const outcome = await deliver(evidence, localLearnerId);
          if (outcome === 'unmapped') {
            logger.error(`[mastery] evidence ${evidence.id} (${evidence.subjectType} ${evidence.subjectId}) has no registry counterpart; kept local-only`);
            unmapped += 1;
          } else {
            pushed += 1;
          }
        } catch (error) {
          logger.error(`[mastery] evidence push failed (queued for retry): ${error.message}`);
          await enqueue({ evidence, localLearnerId, attempts: 1, queuedAt: new Date().toISOString(), lastError: String(error.message).slice(0, 200) });
          queued += 1;
        }
      }
      return { pushed, queued, unmapped };
    },

    // Reads the learner's proficiency projection through PostgREST with the
    // guide token as Bearer and the (public-by-design) anon key as apikey.
    async readProficiency({ select = '*', filter = '', limit = 100 } = {}) {
      const query = `select=${encodeURIComponent(select)}&limit=${Number(limit) || 100}${filter ? `&${filter}` : ''}`;
      const response = await authorizedFetch(`${supabaseUrl}/rest/v1/proficiency?${query}`, { method: 'GET' });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`proficiency read returned HTTP ${response.status} ${detail.slice(0, 200)}`);
      }
      return { status: response.status, rows: await response.json() };
    },

    async queueStatus() {
      const stat = await fs.stat(queuePath).catch(() => null);
      if (!stat) return { pending: 0, bytes: 0 };
      const raw = await fs.readFile(queuePath, 'utf8').catch(() => '');
      return { pending: raw.split('\n').filter((line) => line.trim()).length, bytes: stat.size };
    }
  };
}

// Environment-driven construction for the production entry points. Returns
// null (sync disabled, sensei stays purely local) when running under the test
// runner, when SENSEI_MASTERY_SYNC=0, or when no credentials are available.
export async function createMasteryClientFromEnvironment({ logger = console } = {}) {
  if (process.env.SENSEI_MASTERY_SYNC === '0') return null;
  if (process.env.NODE_TEST_CONTEXT) return null;
  try {
    const credentials = await loadMasteryCredentials();
    if (!credentials) {
      logger.error('[mastery] no credentials available (bws unreachable and no credentials file); sync disabled');
      return null;
    }
    return createMasteryClient(credentials, { logger });
  } catch (error) {
    logger.error(`[mastery] client initialization failed; sync disabled: ${error.message}`);
    return null;
  }
}
