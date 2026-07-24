import crypto from 'node:crypto';
import { buildMasterySnapshot, coverageRelation } from './mastery.mjs';
import { createId, loadLearner, setLearnerContext, updateLearner } from './store.mjs';

const diagnosticTypes = ['kanji', 'vocabulary', 'grammar', 'capability'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashUnit(value) {
  const buffer = crypto.createHash('sha256').update(value).digest();
  return buffer.readUInt32BE(0) / 0xffffffff;
}

function intersection(values, selected) {
  return !selected.size || values.some((value) => selected.has(value));
}

function scopeCapabilityIds(taxonomy, session, learner) {
  const explicit = session.targetCapabilityIds.length ? session.targetCapabilityIds : learner.targetCapabilityIds;
  if (explicit.length) return new Set(explicit.filter((id) => taxonomy.capabilityById.has(id)));
  if (session.lens === 'none') return new Set();
  return new Set(
    taxonomy.capabilities
      .filter((capability) => {
        const relation = coverageRelation(capability, session.lens);
        return session.mode === 'beyond-exam' ? relation === 'unmeasured' : relation === 'direct' || relation === 'supporting';
      })
      .map((capability) => capability.id)
  );
}

function masteryIndex(snapshot, type) {
  const list = type === 'capability' ? snapshot.capabilities : snapshot[type] ?? [];
  return new Map(list.map((item) => [item.id, item]));
}

function informationValue(mastery) {
  if (!mastery || mastery.status === 'untested') return 1;
  if (mastery.status === 'fragile') return 0.88;
  if (mastery.status === 'unknown') return 0.68;
  return 0.16 + (1 - mastery.confidence) * 0.35;
}

function capabilityImpact(taxonomy, capabilityIds) {
  return capabilityIds.reduce((sum, id) => {
    const outgoing = taxonomy.capabilityEdges.filter((edge) => edge.prerequisiteId === id);
    return sum + Math.log1p(outgoing.reduce((total, edge) => total + edge.count, 0));
  }, 0);
}

function candidatePools(taxonomy, snapshot, session, learner, state) {
  const scopedCapabilities = scopeCapabilityIds(taxonomy, session, learner);
  const seen = new Set(session.probes.map((probe) => probe.subjectId));
  const personal = state.personalItems ?? [];
  const pools = {
    kanji: taxonomy.characterItems
      .filter((item) => item.type === 'kanji' && intersection(item.capabilityIds, scopedCapabilities))
      .map((item) => ({
        type: 'kanji',
        subjectId: item.id,
        capabilityIds: item.capabilityIds,
        item
      })),
    vocabulary: taxonomy.vocabularyItems
      .filter((item) => intersection(item.capabilityIds, scopedCapabilities))
      .map((item) => ({
        type: 'vocabulary',
        subjectId: item.id,
        capabilityIds: item.capabilityIds,
        item
      })),
    grammar: taxonomy.grammarTopics
      .filter((topic) => intersection([taxonomy.capabilityIdByTopicId.get(topic.id)], scopedCapabilities))
      .map((topic) => ({
        type: 'grammar',
        subjectId: topic.id,
        topicId: topic.id,
        capabilityIds: [taxonomy.capabilityIdByTopicId.get(topic.id)],
        topic
      })),
    capability: taxonomy.capabilities
      .filter((capability) => !scopedCapabilities.size || scopedCapabilities.has(capability.id))
      .map((capability) => {
        const [assessment, level] = session.lens.includes(':') ? session.lens.split(':') : [null, null];
        const topic = [...capability.l2Topics, ...capability.nativeTopics]
          .filter((candidate) => !candidate.id.includes('SPIRAL'))
          .sort((a, b) => {
            const alignment = (candidate) => assessment === 'jlpt'
              ? (candidate.jlptLevels ?? []).includes(level)
              : assessment === 'bjt'
                ? (candidate.bjtLevels ?? []).includes(level)
                : false;
            return Number(alignment(b)) - Number(alignment(a))
              || Number(Boolean(b.assessmentPrompt)) - Number(Boolean(a.assessmentPrompt))
              || (b.evidence?.length ?? 0) - (a.evidence?.length ?? 0)
              || a.id.localeCompare(b.id);
          })[0]
          ?? capability.l2Topics[0]
          ?? capability.nativeTopics[0]
          ?? null;
        return {
          type: 'capability',
          subjectId: capability.id,
          topicId: topic?.id ?? null,
          capabilityIds: [capability.id],
          capability,
          topic
        };
      })
  };

  pools.kanji.push(...personal
    .filter((item) => item.type === 'kanji')
    .map((item) => ({
      type: 'kanji', subjectId: item.id, capabilityIds: item.capabilityIds ?? [], personal: true,
      item: { ...item, character: item.character ?? item.surface, setName: 'Personal reading inbox' }
    })));
  pools.vocabulary.push(...personal
    .filter((item) => item.type === 'vocabulary')
    .map((item) => ({
      type: 'vocabulary', subjectId: item.id, capabilityIds: item.capabilityIds ?? [], personal: true,
      item: { ...item, lemma: item.lemma ?? item.surface, reading: item.reading ?? '', gloss: item.gloss ?? '' }
    })));
  pools.grammar.push(...personal
    .filter((item) => item.type === 'grammar')
    .map((item) => ({
      type: 'grammar', subjectId: item.id, topicId: item.id, capabilityIds: item.capabilityIds ?? [], personal: true,
      topic: { ...item, name: item.name ?? item.surface, japaneseName: item.japaneseName ?? item.surface }
    })));

  if (session.focus === 'personal' || session.focus === 'reading-gaps') {
    const confirmedSubjectIds = new Set((state.scanFindings ?? [])
      .filter((finding) => finding.reviewStatus === 'confirmed' && finding.linkedSubjectId)
      .map((finding) => finding.linkedSubjectId));
    const inFocus = (candidate) => candidate.personal || (session.focus === 'reading-gaps' && confirmedSubjectIds.has(candidate.subjectId));
    pools.kanji = pools.kanji.filter(inFocus);
    pools.vocabulary = pools.vocabulary.filter(inFocus);
    pools.grammar = pools.grammar.filter(inFocus);
    pools.capability = [];
  }

  for (const type of diagnosticTypes) {
    const index = masteryIndex(snapshot, type);
    pools[type] = pools[type]
      .filter((candidate) => !seen.has(candidate.subjectId))
      .map((candidate) => {
        const mastery = index.get(candidate.subjectId);
        const impact = capabilityImpact(taxonomy, candidate.capabilityIds);
        const jitter = hashUnit(`${session.id}:${candidate.subjectId}`) * 0.08;
        return {
          ...candidate,
          selectionScore: informationValue(mastery) * 0.68 + Math.min(1, impact / 6) * 0.24 + jitter + (candidate.personal ? 0.22 : 0),
          mastery
        };
      })
      .sort((a, b) => b.selectionScore - a.selectionScore);
  }
  return pools;
}

function chooseCandidate(taxonomy, snapshot, session, learner, state) {
  const pools = candidatePools(taxonomy, snapshot, session, learner, state);
  const typeCounts = Object.fromEntries(diagnosticTypes.map((type) => [type, session.probes.filter((probe) => probe.subjectType === type).length]));
  const types = diagnosticTypes
    .filter((type) => pools[type].length)
    .sort((a, b) => typeCounts[a] - typeCounts[b] || (pools[b][0]?.selectionScore ?? 0) - (pools[a][0]?.selectionScore ?? 0));
  if (!types.length) return null;
  return pools[types[0]][0];
}

function vocabularyOptions(taxonomy, item, seed) {
  const distractors = taxonomy.vocabularyItems
    .filter((candidate) => candidate.id !== item.id && candidate.gloss && candidate.gloss !== item.gloss)
    .map((candidate) => ({ value: candidate.gloss, score: hashUnit(`${seed}:${candidate.id}`) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.value);
  const options = [item.gloss, ...distractors].sort((a, b) => hashUnit(`${seed}:${a}`) - hashUnit(`${seed}:${b}`));
  return options;
}

function createProbe(taxonomy, session, candidate) {
  const id = createId('probe');
  const masteryStatus = candidate.mastery?.status;
  const base = {
    id,
    subjectType: candidate.type,
    subjectId: candidate.subjectId,
    topicId: candidate.topicId ?? null,
    capabilityIds: candidate.capabilityIds,
    createdAt: new Date().toISOString(),
    selectionReason: masteryStatus === 'fragile'
      ? 'Fragile knowledge has high retest value.'
      : masteryStatus === 'unknown'
        ? 'A confirmed gap may be blocking downstream capabilities.'
        : 'Untested knowledge has high information value.',
    selectionReasonJa: masteryStatus === 'fragile'
      ? '不安定な知識は、再測定する価値が高い領域です。'
      : masteryStatus === 'unknown'
        ? '確認された弱点が、後続の能力を妨げている可能性があります。'
        : '未測定の知識は、多くの情報を得られる領域です。'
  };

  if (candidate.type === 'kanji') {
    return {
      ...base,
      modality: 'recall',
      title: `Kanji · ${candidate.item.character}`,
      titleJa: `漢字 · ${candidate.item.character}`,
      prompt: `Give one common word containing 「${candidate.item.character}」, then state its reading and meaning.`,
      promptJa: `「${candidate.item.character}」を含む一般的な語を一つ挙げ、その読みと意味を答えてください。`,
      gradingReference: {
        rubric: 'A successful answer supplies a real common word, an accurate reading, and an appropriate meaning.',
        set: candidate.item.setName,
        grade: candidate.item.grade
      }
    };
  }

  if (candidate.type === 'vocabulary') {
    if (!candidate.item.gloss) {
      const context = candidate.item.context ? ` Context: 「${candidate.item.context}」` : '';
      return {
        ...base,
        modality: 'recall',
        title: `Vocabulary · ${candidate.item.lemma}`,
        titleJa: `語彙 · ${candidate.item.lemma}`,
        prompt: `Give the reading and contextual meaning of 「${candidate.item.lemma}」.${context}`,
        promptJa: `「${candidate.item.lemma}」の読みと、この文脈での意味を答えてください。${candidate.item.context ? ` 文脈：「${candidate.item.context}」` : ''}`,
        gradingReference: {
          context: candidate.item.context ?? null,
          rubric: 'Full credit requires a plausible reading and the correct contextual sense. Verify uncertain lexical facts before grading.'
        }
      };
    }
    const options = vocabularyOptions(taxonomy, candidate.item, id);
    return {
      ...base,
      modality: 'recognition',
      title: `Vocabulary · ${candidate.item.lemma}`,
      titleJa: `語彙 · ${candidate.item.lemma}`,
      prompt: `Choose the closest meaning of 「${candidate.item.lemma}」${candidate.item.reading !== candidate.item.lemma ? `（${candidate.item.reading}）` : ''}.`,
      promptJa: `「${candidate.item.lemma}」${candidate.item.reading !== candidate.item.lemma ? `（${candidate.item.reading}）` : ''}に最も近い意味を選んでください。`,
      options,
      gradingReference: {
        answer: candidate.item.gloss,
        reading: candidate.item.reading,
        rubric: 'Full credit for the correct meaning; partial credit is appropriate when the learner identifies the semantic area but not the precise sense.'
      }
    };
  }

  const topic = candidate.topic;
  const capability = candidate.capability ?? taxonomy.capabilityById.get(candidate.capabilityIds[0]);
  const isCapability = candidate.type === 'capability';
  if (!isCapability && candidate.personal) {
    const label = topic.japaneseName ?? topic.name;
    return {
      ...base,
      modality: 'production',
      title: `Grammar · ${label}`,
      titleJa: `文法 · ${label}`,
      prompt: `Explain what 「${label}」 does in this context, then use it in one original Japanese sentence.${topic.context ? ` Context: 「${topic.context}」` : ''}`,
      promptJa: `この文脈で「${label}」がどのように働くか説明し、自分で作った日本語の文で一度使ってください。${topic.context ? ` 文脈：「${topic.context}」` : ''}`,
      gradingReference: {
        context: topic.context ?? null,
        proposedGloss: topic.gloss ?? null,
        rubric: 'Full credit requires the correct contextual function and an accurate, appropriate original use. Verify uncertain linguistic facts before grading.'
      }
    };
  }
  return {
    ...base,
    modality: isCapability ? 'transfer' : 'production',
    title: isCapability ? capability.name : `Grammar · ${topic.name}`,
    titleJa: isCapability ? capability.japaneseName : `文法 · ${topic.japaneseName}`,
    prompt: topic?.assessmentPrompt?.replaceAll('{{name}}', 'the learner') || `Demonstrate this capability in original Japanese: ${capability.summary}`,
    promptJa: topic?.assessmentPrompt
      ? taxonomy.localizeJa(topic.assessmentPrompt).replaceAll('{{name}}', '学習者')
      : isCapability
        ? `${capability.summaryJa} 自分で作った日本語で、この力を示してください。`
        : `${topic.japaneseName}を使い、自分で作った日本語で理解を示してください。`,
    gradingReference: {
      capability: capability.name,
      description: topic?.description ?? capability.summary,
      evidence: topic?.evidence ?? [],
      evidenceJa: (topic?.evidence ?? []).map(taxonomy.localizeJa),
      rubric: isCapability
        ? 'Score the observable capability, not surface polish unrelated to the prompt. Require an original transfer example for full credit.'
        : 'Full credit requires accurate form, intended meaning, and appropriate use in context.'
    }
  };
}

export function presentProbe(probe, { includeGradingReference = false } = {}) {
  if (!probe) return null;
  const { gradingReference, ...publicFields } = probe;
  return includeGradingReference ? { ...publicFields, gradingReference } : publicFields;
}

export async function beginDiagnostic(taxonomy, input, storeOptions = {}) {
  const learnerId = input.learnerId;
  if (input.displayName !== undefined || input.declaredJlpt !== undefined || input.declaredBjt !== undefined || input.goals || input.targetCapabilityIds) {
    await setLearnerContext(learnerId, {
      displayName: input.displayName,
      declaredJlpt: input.declaredJlpt,
      declaredBjt: input.declaredBjt,
      goals: input.goals,
      targetCapabilityIds: input.targetCapabilityIds
    }, storeOptions);
  }
  const validTargets = [...new Set(input.targetCapabilityIds ?? [])].filter((id) => taxonomy.capabilityById.has(id));
  const session = {
    id: createId('session'),
    status: 'active',
    mode: ['baseline', 'targeted', 'beyond-exam'].includes(input.mode) ? input.mode : 'baseline',
    focus: ['personal', 'reading-gaps'].includes(input.focus) ? input.focus : 'mixed',
    lens: input.lens || 'none',
    targetCapabilityIds: validTargets,
    maxProbes: clamp(Number(input.maxProbes) || 12, 4, 60),
    probes: [],
    responses: [],
    createdAt: new Date().toISOString(),
    completedAt: null
  };
  await updateLearner(learnerId, (state) => {
    for (const existing of state.sessions.filter((item) => item.status === 'active')) existing.status = 'superseded';
    state.sessions.push(session);
    if (state.sessions.length > 100) state.sessions = state.sessions.slice(-100);
  }, storeOptions);
  return session;
}

export async function nextProbe(taxonomy, { learnerId, sessionId, includeGradingReference = false }, storeOptions = {}) {
  return updateLearner(learnerId, (state) => {
    const session = state.sessions.find((item) => item.id === sessionId);
    if (!session) throw new Error(`Diagnostic session not found: ${sessionId}`);
    if (session.status === 'completed') {
      return { status: 'completed', sessionId, progress: { answered: session.responses.length, total: session.maxProbes }, probe: null };
    }
    const pending = session.probes.find((probe) => !session.responses.some((response) => response.probeId === probe.id));
    if (pending) {
      return {
        status: 'active',
        sessionId,
        progress: { answered: session.responses.length, total: session.maxProbes },
        probe: presentProbe(pending, { includeGradingReference })
      };
    }
    if (session.responses.length >= session.maxProbes) {
      session.status = 'completed';
      session.completedAt = new Date().toISOString();
      return { status: 'completed', sessionId, progress: { answered: session.responses.length, total: session.maxProbes }, probe: null };
    }
    const snapshot = buildMasterySnapshot(taxonomy, state, { lens: session.lens });
    const candidate = chooseCandidate(taxonomy, snapshot, session, state.learner, state);
    if (!candidate) {
      session.status = 'completed';
      session.completedAt = new Date().toISOString();
      return { status: 'completed', sessionId, progress: { answered: session.responses.length, total: session.responses.length }, probe: null };
    }
    const probe = createProbe(taxonomy, session, candidate);
    session.probes.push(probe);
    return {
      status: 'active',
      sessionId,
      progress: { answered: session.responses.length, total: session.maxProbes },
      probe: presentProbe(probe, { includeGradingReference })
    };
  }, storeOptions);
}

export async function recordProbeEvidence(taxonomy, input, storeOptions = {}) {
  let recordedEvidence = null;
  const result = await updateLearner(input.learnerId, (state) => {
    const session = state.sessions.find((item) => item.id === input.sessionId);
    if (!session) throw new Error(`Diagnostic session not found: ${input.sessionId}`);
    const probe = session.probes.find((item) => item.id === input.probeId);
    if (!probe) throw new Error(`Probe not found in session: ${input.probeId}`);
    const autoAnswer = probe.gradingReference?.answer;
    const autoScored = typeof input.selectedOption === 'string' && typeof autoAnswer === 'string';
    const rawScore = autoScored
      ? input.selectedOption.trim().toLowerCase() === autoAnswer.trim().toLowerCase() ? 1 : 0
      : Number(input.score);
    if (!Number.isFinite(rawScore)) throw new Error('score is required when the probe cannot be auto-scored');
    const score = clamp(rawScore, 0, 1);
    const confidence = clamp(Number(input.confidence ?? 0.7), 0, 1);
    let response = session.responses.find((item) => item.probeId === probe.id);
    const observedAt = new Date().toISOString();
    if (!response) {
      response = { probeId: probe.id, evidenceId: createId('evidence') };
      session.responses.push(response);
    }
    Object.assign(response, {
      score,
      confidence,
      evaluatedBy: autoScored ? 'auto' : input.evaluatedBy || 'learner',
      latencyMs: Number.isFinite(input.latencyMs) ? Math.max(0, input.latencyMs) : null,
      notes: input.notes ? String(input.notes).slice(0, 1000) : null,
      observedAt
    });
    let evidence = state.evidence.find((item) => item.id === response.evidenceId);
    if (!evidence) {
      evidence = { id: response.evidenceId };
      state.evidence.push(evidence);
    }
    Object.assign(evidence, {
      sourceType: 'diagnostic',
      sourceRef: null,
      sessionId: session.id,
      probeId: probe.id,
      subjectType: probe.subjectType,
      subjectId: probe.subjectId,
      topicId: probe.topicId,
      capabilityIds: probe.capabilityIds,
      modality: probe.modality,
      score,
      confidence,
      assertedGap: false,
      evaluatedBy: response.evaluatedBy,
      latencyMs: response.latencyMs,
      notes: response.notes,
      observedAt
    });
    if (session.responses.length >= session.maxProbes) {
      session.status = 'completed';
      session.completedAt = observedAt;
    }
    recordedEvidence = structuredClone(evidence);
    return {
      recorded: true,
      evidenceId: evidence.id,
      status: session.status,
      score,
      autoScored,
      progress: { answered: session.responses.length, total: session.maxProbes },
      feedback: probe.gradingReference
    };
  }, storeOptions);
  // Dual-write: after the canonical local write has been persisted, hand the
  // evidence to the optional mastery sync hook. The hook is fire-and-forget
  // and failure-tolerant; local recording never depends on it.
  if (recordedEvidence && typeof storeOptions.onEvidence === 'function') {
    try {
      storeOptions.onEvidence([recordedEvidence], { learnerId: input.learnerId });
    } catch {
      // Mastery sync must never break local evidence recording.
    }
  }
  return result;
}

export async function diagnosticStatus(learnerId, sessionId, storeOptions = {}) {
  const state = await loadLearner(learnerId, storeOptions);
  return state.sessions.find((session) => session.id === sessionId) ?? null;
}
