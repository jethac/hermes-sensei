const modalityWeights = {
  recognition: 0.62,
  recall: 0.82,
  production: 0.95,
  transfer: 1
};

const jlptRank = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function coverageRelation(capability, lens = 'none') {
  if (!lens || lens === 'none') return 'none';
  if (lens === 'mext') return capability.assessmentCoverage.mext.covered ? 'direct' : 'unmeasured';
  const [assessment, level] = lens.split(':');
  const coverage = capability.assessmentCoverage?.[assessment];
  if (coverage?.directLevels?.includes(level)) return 'direct';
  if (coverage?.supportingLevels?.includes(level)) return 'supporting';
  return 'unmeasured';
}

export function priorForCapability(capability, learner) {
  const declared = learner.declaredJlpt;
  if (!declared || !jlptRank[declared]) return { probability: 0.5, strength: 0.2, source: 'neutral' };
  const direct = capability.assessmentCoverage.jlpt.directLevels.some((level) => jlptRank[level] <= jlptRank[declared]);
  const supporting = capability.assessmentCoverage.jlpt.supportingLevels.some((level) => jlptRank[level] <= jlptRank[declared]);
  if (direct) return { probability: 0.68, strength: 0.7, source: `${declared} direct-scope prior` };
  if (supporting) return { probability: 0.57, strength: 0.42, source: `${declared} supporting-scope prior` };
  if (capability.coverage.jlptLevels.some((level) => jlptRank[level] <= jlptRank[declared])) {
    return { probability: 0.53, strength: 0.25, source: `${declared} route-alignment prior` };
  }
  return { probability: 0.46, strength: 0.18, source: `${declared} out-of-scope prior` };
}

function recencyWeight(observedAt, now = Date.now()) {
  const ageMs = Math.max(0, now - Date.parse(observedAt || 0));
  const halfLifeMs = 120 * 24 * 60 * 60 * 1000;
  return 0.5 ** (ageMs / halfLifeMs);
}

function isDurabilityEvidence(evidence, subjectType) {
  const accepted = subjectType === 'capability' || subjectType === 'grammar'
    ? new Set(['production', 'transfer'])
    : new Set(['recall', 'production', 'transfer']);
  return accepted.has(evidence.modality) && evidence.score >= 0.75;
}

export function estimateMastery(events, { prior = { probability: 0.5, strength: 0.2 }, subjectType = 'capability' } = {}) {
  const validEvents = events.filter((event) => Number.isFinite(event.score));
  const directEvents = validEvents.filter((event) => !event.indirect);
  let weightedSuccess = prior.probability * prior.strength;
  let totalWeight = prior.strength;
  let observedWeight = 0;
  let directObservedWeight = 0;

  for (const event of validEvents) {
    const modalityWeight = modalityWeights[event.modality] ?? 0.7;
    const confidenceWeight = 0.55 + clamp(event.confidence ?? 0.5) * 0.45;
    const indirectWeight = event.indirect ? 0.12 : 1;
    const weight = modalityWeight * confidenceWeight * recencyWeight(event.observedAt) * indirectWeight;
    weightedSuccess += clamp(event.score) * weight;
    totalWeight += weight;
    observedWeight += weight;
    if (!event.indirect) directObservedWeight += weight;
  }

  const probability = totalWeight ? weightedSuccess / totalWeight : prior.probability;
  const confidence = directEvents.length ? 1 - Math.exp(-directObservedWeight / 1.9) : 0;
  const durable = directEvents.some((event) => isDurabilityEvidence(event, subjectType));
  const latestAssertedGap = directEvents
    .filter((event) => event.assertedGap && event.score <= 0.15 && (event.confidence ?? 0) >= 0.75)
    .map((event) => event.observedAt ?? '')
    .sort()
    .at(-1);
  const latestSuccessfulRetest = directEvents
    .filter((event) => event.score >= 0.75 && isDurabilityEvidence(event, subjectType))
    .map((event) => event.observedAt ?? '')
    .sort()
    .at(-1);
  const confirmedGap = Boolean(latestAssertedGap && (!latestSuccessfulRetest || latestAssertedGap > latestSuccessfulRetest));
  let status = 'untested';
  if (directEvents.length) {
    if (probability >= 0.8 && confidence >= 0.5 && durable) status = 'known';
    else if (confirmedGap) status = 'unknown';
    else if (probability >= 0.58 || confidence < 0.34) status = 'fragile';
    else status = 'unknown';
  }

  const modalities = [...new Set(validEvents.map((event) => event.modality))];
  const latest = validEvents.map((event) => event.observedAt).filter(Boolean).sort().at(-1) ?? null;
  return {
    probability: round(probability),
    confidence: round(confidence),
    status,
    durable,
    confirmedGap,
    evidenceCount: directEvents.length,
    supportingEvidenceCount: validEvents.length - directEvents.length,
    modalities,
    latest,
    prior: { probability: round(prior.probability), strength: round(prior.strength), source: prior.source ?? 'neutral' }
  };
}

function eventsForSubject(state, subjectId) {
  return state.evidence.filter((event) => event.subjectId === subjectId);
}

function capabilityEvents(state, capabilityId) {
  return state.evidence
    .filter((event) => (event.capabilityIds ?? []).includes(capabilityId))
    .map((event) => {
      const indirect = event.subjectType === 'kanji' || event.subjectType === 'vocabulary' || event.subjectType === 'script';
      if (!indirect) return event;
      return { ...event, confidence: (event.confidence ?? 0.5) * 0.38, indirect: true };
    });
}

export function buildMasterySnapshot(taxonomy, state, { lens = 'none' } = {}) {
  const confirmedSourceCounts = new Map();
  for (const finding of state.scanFindings ?? []) {
    if (finding.reviewStatus !== 'confirmed' || !finding.linkedSubjectId) continue;
    confirmedSourceCounts.set(finding.linkedSubjectId, (confirmedSourceCounts.get(finding.linkedSubjectId) ?? 0) + 1);
  }
  const capabilities = taxonomy.capabilities.map((capability) => {
    const mastery = estimateMastery(capabilityEvents(state, capability.id), {
      prior: priorForCapability(capability, state.learner),
      subjectType: 'capability'
    });
    return {
      id: capability.id,
      name: capability.name,
      japaneseName: capability.japaneseName,
      domain: capability.domain,
      stage: capability.stage,
      routeStatus: capability.routeStatus,
      origin: 'taxonomy',
      relation: coverageRelation(capability, lens),
      l2TopicCount: capability.l2TopicIds.length,
      nativeTopicCount: capability.l1TopicIds.length,
      ...mastery
    };
  });

  const kanji = taxonomy.characterItems
    .filter((item) => item.type === 'kanji')
    .map((item) => ({
      id: item.id,
      type: item.type,
      character: item.character,
      setName: item.setName,
      japaneseSetName: item.japaneseSetName,
      grade: item.grade,
      origin: 'taxonomy',
      flaggedCount: confirmedSourceCounts.get(item.id) ?? 0,
      ...estimateMastery(eventsForSubject(state, item.id), { subjectType: 'kanji' })
    }));

  const personalKanji = (state.personalItems ?? [])
    .filter((item) => item.type === 'kanji')
    .map((item) => ({
      id: item.id,
      type: 'kanji',
      character: item.character ?? item.surface,
      setName: 'Personal reading inbox',
      japaneseSetName: '個人読書インボックス',
      grade: null,
      origin: 'personal',
      context: item.context,
      sourceCount: item.sourceCount,
      flaggedCount: confirmedSourceCounts.get(item.id) ?? item.sourceCount ?? 0,
      ...estimateMastery(eventsForSubject(state, item.id), { subjectType: 'kanji' })
    }));

  const vocabulary = taxonomy.vocabularyItems.map((item) => ({
    id: item.id,
    type: item.type,
    lemma: item.lemma,
    reading: item.reading,
    gloss: item.gloss,
    origin: 'taxonomy',
    flaggedCount: confirmedSourceCounts.get(item.id) ?? 0,
    ...estimateMastery(eventsForSubject(state, item.id), { subjectType: 'vocabulary' })
  }));

  const personalVocabulary = (state.personalItems ?? [])
    .filter((item) => item.type === 'vocabulary')
    .map((item) => ({
      id: item.id,
      type: 'vocabulary',
      lemma: item.lemma ?? item.surface,
      reading: item.reading ?? '',
      gloss: item.gloss ?? '',
      context: item.context,
      origin: 'personal',
      sourceCount: item.sourceCount,
      flaggedCount: confirmedSourceCounts.get(item.id) ?? item.sourceCount ?? 0,
      ...estimateMastery(eventsForSubject(state, item.id), { subjectType: 'vocabulary' })
    }));

  const grammar = taxonomy.grammarTopics.map((topic) => {
    const capabilityId = taxonomy.capabilityIdByTopicId.get(topic.id);
    return {
      id: topic.id,
      name: topic.name,
      japaneseName: topic.japaneseName,
      capabilityId,
      levelRangeStart: topic.levelRangeStart,
      levelRangeEnd: topic.levelRangeEnd,
      jlptLevels: topic.jlptLevels,
      origin: 'taxonomy',
      flaggedCount: confirmedSourceCounts.get(topic.id) ?? 0,
      ...estimateMastery(eventsForSubject(state, topic.id), {
        prior: priorForCapability(taxonomy.capabilityById.get(capabilityId), state.learner),
        subjectType: 'grammar'
      })
    };
  });

  const personalGrammar = (state.personalItems ?? [])
    .filter((item) => item.type === 'grammar')
    .map((item) => ({
      id: item.id,
      type: 'grammar',
      name: item.name ?? item.surface,
      japaneseName: item.japaneseName ?? item.surface,
      capabilityId: item.capabilityIds?.[0] ?? null,
      levelRangeStart: null,
      levelRangeEnd: null,
      jlptLevels: [],
      context: item.context,
      gloss: item.gloss,
      origin: 'personal',
      sourceCount: item.sourceCount,
      flaggedCount: confirmedSourceCounts.get(item.id) ?? item.sourceCount ?? 0,
      ...estimateMastery(eventsForSubject(state, item.id), { subjectType: 'grammar' })
    }));

  kanji.push(...personalKanji);
  vocabulary.push(...personalVocabulary);
  grammar.push(...personalGrammar);

  const statusCounts = (items) => Object.fromEntries(
    ['known', 'fragile', 'unknown', 'untested'].map((status) => [status, items.filter((item) => item.status === status).length])
  );
  const confidenceAverage = capabilities.length
    ? capabilities.reduce((sum, item) => sum + item.confidence, 0) / capabilities.length
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    lens,
    learner: state.learner,
    summary: {
      capabilities: statusCounts(capabilities),
      kanji: statusCounts(kanji),
      vocabulary: statusCounts(vocabulary),
      grammar: statusCounts(grammar),
      capabilityConfidence: round(confidenceAverage),
      evidenceCount: state.evidence.length,
      durableCapabilities: capabilities.filter((item) => item.status === 'known' && item.durable).length,
      capabilitiesWithDurabilityEvidence: capabilities.filter((item) => item.durable).length,
      personalItems: (state.personalItems ?? []).length,
      confirmedHighlights: (state.scanFindings ?? []).filter((item) => item.reviewStatus === 'confirmed').length
    },
    capabilities,
    kanji,
    vocabulary,
    grammar
  };
}
