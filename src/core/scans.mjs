import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { stateRoot as defaultStateRoot } from './paths.mjs';
import { assertLearnerId, createId, loadLearner, updateLearner } from './store.mjs';

export const MAX_SCAN_BYTES = 15 * 1024 * 1024;
export const highlightKinds = ['vocabulary', 'kanji', 'grammar'];

const imageFormats = [
  {
    mimeType: 'image/png', extension: '.png',
    matches: (data) => data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  },
  {
    mimeType: 'image/jpeg', extension: '.jpg',
    matches: (data) => data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
  },
  {
    mimeType: 'image/webp', extension: '.webp',
    matches: (data) => data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP'
  }
];

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function cleanText(value, maxLength, { required = false } = {}) {
  const clean = String(value ?? '').normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (required && !clean) throw new Error('highlight surface is required');
  return clean.slice(0, maxLength);
}

export function normalizeJapanese(value) {
  return String(value ?? '').normalize('NFKC').replace(/[\s\u3000]/g, '').toLocaleLowerCase('ja');
}

function safeOriginalName(filename) {
  const base = path.basename(String(filename || 'scan')).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (base || 'scan').slice(0, 180);
}

function assertScanId(scanId) {
  if (!/^scan_[0-9a-f-]{36}$/i.test(scanId ?? '')) throw new Error('Invalid scanId');
  return scanId;
}

function detectImageFormat(data) {
  if (!Buffer.isBuffer(data) || !data.length) throw new Error('Scan image is empty');
  if (data.length > MAX_SCAN_BYTES) throw new Error('Scan image exceeds 15 MB');
  const format = imageFormats.find((candidate) => candidate.matches(data));
  if (!format) throw new Error('Use a PNG, JPEG, or WebP image');
  return format;
}

function scanFilePath(root, learnerId, scanId, mimeType) {
  const extension = imageFormats.find((format) => format.mimeType === mimeType)?.extension;
  if (!extension) throw new Error(`Unsupported scan MIME type: ${mimeType}`);
  return path.join(path.resolve(root), 'scans', assertLearnerId(learnerId), `${assertScanId(scanId)}${extension}`);
}

function summarizeScan(scan, findings) {
  const related = findings.filter((finding) => finding.scanId === scan.id);
  return {
    ...scan,
    findingCounts: {
      total: related.length,
      pending: related.filter((finding) => finding.reviewStatus === 'pending').length,
      confirmed: related.filter((finding) => finding.reviewStatus === 'confirmed').length,
      rejected: related.filter((finding) => finding.reviewStatus === 'rejected').length
    }
  };
}

function updateScanStatus(state, scanId) {
  const scan = state.scans.find((item) => item.id === scanId);
  if (!scan) return;
  const findings = state.scanFindings.filter((finding) => finding.scanId === scanId);
  scan.status = !findings.length
    ? 'pending'
    : findings.some((finding) => finding.reviewStatus === 'pending')
      ? 'extracted'
      : 'reviewed';
  scan.updatedAt = new Date().toISOString();
}

export async function createScan(learnerId, { data, filename, declaredMimeType }, { root = defaultStateRoot() } = {}) {
  assertLearnerId(learnerId);
  const format = detectImageFormat(data);
  const declared = declaredMimeType.split(';', 1)[0].trim().toLowerCase().replace('image/jpg', 'image/jpeg');
  if (declared && declared !== 'application/octet-stream' && declared !== format.mimeType) {
    throw new Error(`Image bytes do not match declared type ${declaredMimeType}`);
  }
  const scanId = createId('scan');
  const now = new Date().toISOString();
  const scan = {
    id: scanId,
    filename: safeOriginalName(filename),
    mimeType: format.mimeType,
    bytes: data.length,
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
    originalAvailable: true,
    source: 'web-upload',
    status: 'pending',
    pageCount: 1,
    createdAt: now,
    updatedAt: now
  };
  const destination = scanFilePath(root, learnerId, scanId, format.mimeType);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, data, { flag: 'wx', mode: 0o600 });
  try {
    await updateLearner(learnerId, (state) => {
      state.scans.push(scan);
      if (state.scans.length > 500) throw new Error('Scan inbox limit reached; remove old originals before adding more');
      return scan;
    }, { root });
  } catch (error) {
    await fs.unlink(destination).catch(() => {});
    throw error;
  }
  return summarizeScan(scan, []);
}

export async function listScanInbox(learnerId, { root = defaultStateRoot(), includeReviewed = true } = {}) {
  const state = await loadLearner(learnerId, { root });
  const scans = state.scans
    .filter((scan) => includeReviewed || scan.status !== 'reviewed')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((scan) => summarizeScan(scan, state.scanFindings));
  const visibleIds = new Set(scans.map((scan) => scan.id));
  const findings = state.scanFindings
    .filter((finding) => visibleIds.has(finding.scanId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    learnerId,
    summary: {
      scans: scans.length,
      awaitingExtraction: scans.filter((scan) => scan.status === 'pending').length,
      awaitingReview: findings.filter((finding) => finding.reviewStatus === 'pending').length,
      confirmed: findings.filter((finding) => finding.reviewStatus === 'confirmed').length
    },
    scans,
    findings
  };
}

export async function getScanImage(learnerId, scanId, { root = defaultStateRoot() } = {}) {
  const state = await loadLearner(learnerId, { root, create: false });
  const scan = state.scans.find((item) => item.id === assertScanId(scanId));
  if (!scan) throw new Error(`Scan not found: ${scanId}`);
  if (!scan.originalAvailable || !scan.mimeType) throw new Error(`Original image is no longer available for scan ${scanId}`);
  const data = await fs.readFile(scanFilePath(root, learnerId, scanId, scan.mimeType));
  return { scan, data };
}

export async function deleteScanOriginal(learnerId, scanId, { root = defaultStateRoot() } = {}) {
  const { scan } = await getScanImage(learnerId, scanId, { root });
  await fs.unlink(scanFilePath(root, learnerId, scanId, scan.mimeType));
  return updateLearner(learnerId, (state) => {
    const stored = state.scans.find((item) => item.id === scanId);
    stored.originalAvailable = false;
    stored.updatedAt = new Date().toISOString();
    return summarizeScan(stored, state.scanFindings);
  }, { root });
}

function normalizeBox(box) {
  if (!box || typeof box !== 'object') return null;
  const normalized = {
    x: clamp(Number(box.x) || 0),
    y: clamp(Number(box.y) || 0),
    width: clamp(Number(box.width) || 0),
    height: clamp(Number(box.height) || 0)
  };
  return normalized.width > 0 && normalized.height > 0 ? normalized : null;
}

function normalizeFinding(input, scanId) {
  const kind = highlightKinds.includes(input.kind) ? input.kind : 'vocabulary';
  const surface = cleanText(input.surface, 160, { required: true });
  return {
    id: createId('finding'),
    scanId,
    page: Math.max(1, Math.min(999, Number(input.page) || 1)),
    kind,
    surface,
    normalized: normalizeJapanese(input.lemma || surface),
    lemma: cleanText(input.lemma || surface, 160),
    reading: cleanText(input.reading, 160),
    gloss: cleanText(input.gloss, 300),
    context: cleanText(input.context, 800),
    bbox: normalizeBox(input.bbox),
    visualConfidence: clamp(Number(input.confidence ?? input.visualConfidence ?? 0.65)),
    notes: cleanText(input.notes, 500),
    reviewStatus: 'pending',
    linkedSubjectId: null,
    createdAt: new Date().toISOString(),
    reviewedAt: null
  };
}

export async function ingestHighlights(taxonomy, learnerId, input, { root = defaultStateRoot() } = {}) {
  const rawFindings = input.findings ?? [];
  if (!Array.isArray(rawFindings) || !rawFindings.length) throw new Error('At least one highlighted finding is required');
  if (rawFindings.length > 200) throw new Error('A scan may contain at most 200 highlighted findings');
  const scanId = input.scanId ? assertScanId(input.scanId) : createId('scan');
  return updateLearner(learnerId, (state) => {
    let scan = state.scans.find((item) => item.id === scanId);
    if (!scan) {
      if (input.scanId) throw new Error(`Scan not found: ${scanId}`);
      const now = new Date().toISOString();
      scan = {
        id: scanId,
        filename: safeOriginalName(input.sourceLabel || 'Hermes attachment'),
        mimeType: null,
        bytes: 0,
        sha256: null,
        originalAvailable: false,
        source: 'hermes-attachment',
        status: 'pending',
        pageCount: Math.max(1, Math.min(999, Number(input.pageCount) || 1)),
        createdAt: now,
        updatedAt: now
      };
      state.scans.push(scan);
    }
    const existingKeys = new Set(state.scanFindings
      .filter((finding) => finding.scanId === scanId)
      .map((finding) => `${finding.page}:${finding.kind}:${finding.normalized}`));
    const added = [];
    for (const raw of rawFindings) {
      const finding = normalizeFinding(raw, scanId);
      const key = `${finding.page}:${finding.kind}:${finding.normalized}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      state.scanFindings.push(finding);
      added.push(finding);
    }
    updateScanStatus(state, scanId);
    return {
      scan: summarizeScan(scan, state.scanFindings),
      added,
      skippedDuplicates: rawFindings.length - added.length,
      reviewRequired: added.length
    };
  }, { root });
}

function taxonomySubject(taxonomy, finding) {
  if (finding.kind === 'kanji') {
    const item = taxonomy.characterItems.find((candidate) => candidate.type === 'kanji' && candidate.character === finding.surface);
    if (item) return { id: item.id, capabilityIds: item.capabilityIds ?? [], topicId: null };
  }
  if (finding.kind === 'vocabulary') {
    const normalized = normalizeJapanese(finding.lemma || finding.surface);
    const item = taxonomy.vocabularyItems.find((candidate) => {
      if (normalizeJapanese(candidate.lemma) !== normalized) return false;
      return !finding.reading || !candidate.reading || normalizeJapanese(candidate.reading) === normalizeJapanese(finding.reading);
    });
    if (item) return { id: item.id, capabilityIds: item.capabilityIds ?? [], topicId: null };
  }
  if (finding.kind === 'grammar') {
    const normalized = normalizeJapanese(finding.lemma || finding.surface);
    const topic = taxonomy.grammarTopics.find((candidate) => [candidate.name, candidate.japaneseName].some((name) => normalizeJapanese(name) === normalized));
    if (topic) {
      const capabilityId = taxonomy.capabilityIdByTopicId.get(topic.id);
      return { id: topic.id, capabilityIds: capabilityId ? [capabilityId] : [], topicId: topic.id };
    }
  }
  return null;
}

function personalItemId(finding) {
  const key = `${finding.kind}:${normalizeJapanese(finding.lemma || finding.surface)}:${normalizeJapanese(finding.reading)}`;
  return `personal_${finding.kind}_${crypto.createHash('sha256').update(key).digest('hex').slice(0, 20)}`;
}

function upsertPersonalItem(state, finding, reviewedAt) {
  const id = personalItemId(finding);
  let item = state.personalItems.find((candidate) => candidate.id === id);
  if (!item) {
    item = {
      id,
      type: finding.kind,
      surface: finding.surface,
      lemma: finding.kind === 'vocabulary' ? finding.lemma || finding.surface : null,
      character: finding.kind === 'kanji' ? finding.surface : null,
      name: finding.kind === 'grammar' ? finding.lemma || finding.surface : null,
      japaneseName: finding.kind === 'grammar' ? finding.lemma || finding.surface : null,
      reading: finding.reading || null,
      gloss: finding.gloss || null,
      context: finding.context || null,
      capabilityIds: [],
      sourceCount: 0,
      firstSeenAt: reviewedAt,
      lastSeenAt: reviewedAt,
      origin: 'personal'
    };
    state.personalItems.push(item);
  }
  item.surface = finding.surface;
  if (finding.lemma && finding.kind === 'vocabulary') item.lemma = finding.lemma;
  if (finding.reading) item.reading = finding.reading;
  if (finding.gloss) item.gloss = finding.gloss;
  if (finding.context) item.context = finding.context;
  item.sourceCount += 1;
  item.lastSeenAt = reviewedAt;
  return item;
}

function applyFindingEdits(finding, decision) {
  const lemmaFollowedSurface = normalizeJapanese(finding.lemma) === normalizeJapanese(finding.surface);
  if (decision.kind !== undefined) finding.kind = highlightKinds.includes(decision.kind) ? decision.kind : finding.kind;
  if (decision.surface !== undefined) finding.surface = cleanText(decision.surface, 160, { required: true });
  if (decision.lemma !== undefined) finding.lemma = cleanText(decision.lemma, 160);
  else if (lemmaFollowedSurface) finding.lemma = finding.surface;
  if (decision.reading !== undefined) finding.reading = cleanText(decision.reading, 160);
  if (decision.gloss !== undefined) finding.gloss = cleanText(decision.gloss, 300);
  if (decision.context !== undefined) finding.context = cleanText(decision.context, 800);
  finding.normalized = normalizeJapanese(finding.lemma || finding.surface);
}

export async function reviewHighlights(taxonomy, learnerId, decisions, { root = defaultStateRoot() } = {}) {
  if (!Array.isArray(decisions) || !decisions.length) throw new Error('At least one review decision is required');
  if (decisions.length > 200) throw new Error('At most 200 review decisions may be submitted at once');
  return updateLearner(learnerId, (state) => {
    const results = [];
    const touchedScans = new Set();
    for (const decision of decisions) {
      const finding = state.scanFindings.find((item) => item.id === decision.findingId);
      if (!finding) throw new Error(`Highlight finding not found: ${decision.findingId}`);
      touchedScans.add(finding.scanId);
      const wantedStatus = decision.decision === 'confirm' ? 'confirmed' : decision.decision === 'reject' ? 'rejected' : null;
      if (!wantedStatus) throw new Error('Review decision must be confirm or reject');
      if (finding.reviewStatus !== 'pending') {
        if (finding.reviewStatus === wantedStatus) {
          results.push({ findingId: finding.id, status: finding.reviewStatus, subjectId: finding.linkedSubjectId, idempotent: true });
          continue;
        }
        throw new Error(`Highlight finding ${finding.id} has already been reviewed`);
      }
      applyFindingEdits(finding, decision);
      const reviewedAt = new Date().toISOString();
      finding.reviewStatus = wantedStatus;
      finding.reviewedAt = reviewedAt;
      if (wantedStatus === 'confirmed') {
        const subject = taxonomySubject(taxonomy, finding);
        const personalItem = subject ? null : upsertPersonalItem(state, finding, reviewedAt);
        const subjectId = subject?.id ?? personalItem.id;
        finding.linkedSubjectId = subjectId;
        const existingEvidence = state.evidence.find((event) => event.sourceRef?.findingId === finding.id);
        if (!existingEvidence) {
          state.evidence.push({
            id: createId('evidence'),
            sourceType: 'scan-highlight',
            sourceRef: { scanId: finding.scanId, findingId: finding.id },
            sessionId: null,
            probeId: null,
            subjectType: finding.kind,
            subjectId,
            topicId: subject?.topicId ?? null,
            capabilityIds: subject?.capabilityIds ?? personalItem.capabilityIds,
            modality: 'recognition',
            score: 0,
            confidence: 0.95,
            assertedGap: true,
            evaluatedBy: 'learner',
            latencyMs: null,
            notes: 'Learner confirmed this highlighted item as unknown in context.',
            observedAt: reviewedAt
          });
        }
      }
      results.push({ findingId: finding.id, status: finding.reviewStatus, subjectId: finding.linkedSubjectId, idempotent: false });
    }
    for (const scanId of touchedScans) updateScanStatus(state, scanId);
    return {
      reviewed: results,
      scans: [...touchedScans].map((scanId) => summarizeScan(state.scans.find((scan) => scan.id === scanId), state.scanFindings)),
      personalItemCount: state.personalItems.length
    };
  }, { root });
}
