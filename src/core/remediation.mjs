import { buildMasterySnapshot, coverageRelation } from './mastery.mjs';

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function levelValue(level) {
  const match = String(level ?? 'C2.9').match(/^([ABC])([12])(?:\.(\d))?/);
  if (!match) return 99;
  return ({ A: 0, B: 10, C: 20 }[match[1]] ?? 30) + Number(match[2]) * 2 + Number(match[3] ?? 0) / 10;
}

function targetSet(taxonomy, state, { targetCapabilityIds = [], lens = 'none', mode = 'targeted' } = {}) {
  const explicit = [...new Set(targetCapabilityIds.length ? targetCapabilityIds : state.learner.targetCapabilityIds)]
    .filter((id) => taxonomy.capabilityById.has(id));
  if (explicit.length) return new Set(explicit);
  if (lens !== 'none') {
    return new Set(
      taxonomy.capabilities
        .filter((capability) => {
          const relation = coverageRelation(capability, lens);
          return mode === 'beyond-exam' ? relation === 'unmeasured' : relation === 'direct' || relation === 'supporting';
        })
        .map((capability) => capability.id)
    );
  }
  return new Set(taxonomy.capabilities.map((capability) => capability.id));
}

function prerequisiteClosure(taxonomy, targets) {
  const incoming = new Map();
  for (const edge of taxonomy.capabilityEdges) {
    if (!incoming.has(edge.capabilityId)) incoming.set(edge.capabilityId, []);
    incoming.get(edge.capabilityId).push(edge.prerequisiteId);
  }
  const closure = new Set(targets);
  const pending = [...targets];
  while (pending.length) {
    const id = pending.pop();
    for (const prerequisiteId of incoming.get(id) ?? []) {
      if (closure.has(prerequisiteId)) continue;
      closure.add(prerequisiteId);
      pending.push(prerequisiteId);
    }
  }
  return closure;
}

function descendantTargets(taxonomy, capabilityId, targets) {
  const outgoing = new Map();
  for (const edge of taxonomy.capabilityEdges) {
    if (!outgoing.has(edge.prerequisiteId)) outgoing.set(edge.prerequisiteId, []);
    outgoing.get(edge.prerequisiteId).push(edge.capabilityId);
  }
  const reached = new Set();
  const pending = [capabilityId];
  while (pending.length) {
    const id = pending.pop();
    if (reached.has(id)) continue;
    reached.add(id);
    pending.push(...(outgoing.get(id) ?? []));
  }
  reached.delete(capabilityId);
  return [...reached].filter((id) => targets.has(id));
}

function representativeTopic(taxonomy, capability, lens) {
  const [assessment, level] = lens.includes(':') ? lens.split(':') : [null, null];
  const candidates = [...capability.l2Topics]
    .filter((topic) => !topic.id.includes('SPIRAL'))
    .sort((a, b) => {
      const aAligned = assessment === 'jlpt'
        ? (a.jlptLevels ?? []).includes(level)
        : assessment === 'bjt'
          ? (a.bjtLevels ?? []).includes(level)
          : false;
      const bAligned = assessment === 'jlpt'
        ? (b.jlptLevels ?? []).includes(level)
        : assessment === 'bjt'
          ? (b.bjtLevels ?? []).includes(level)
          : false;
      return Number(bAligned) - Number(aAligned)
        || levelValue(a.levelRangeStart) - levelValue(b.levelRangeStart)
        || (taxonomy.unlocksByTopic.get(b.id)?.length ?? 0) - (taxonomy.unlocksByTopic.get(a.id)?.length ?? 0);
    });
  return candidates[0] ?? capability.l2Topics[0] ?? capability.nativeTopics.find((topic) => !topic.id.includes('SPIRAL')) ?? capability.nativeTopics[0] ?? null;
}

function gapNeed(item) {
  if (item.status === 'unknown') return 1;
  if (item.status === 'fragile') return 0.76;
  if (item.status === 'untested') return 0.58;
  return item.durable ? 0.04 : 0.28;
}

function planVerb(status) {
  if (status === 'untested') return 'Measure';
  if (status === 'unknown') return 'Repair';
  if (status === 'fragile') return 'Stabilise';
  return 'Transfer';
}

function planVerbJa(status) {
  if (status === 'untested') return '測定する';
  if (status === 'unknown') return '修復する';
  if (status === 'fragile') return '安定させる';
  return '転移させる';
}

function buildPlanItem(taxonomy, gap, targets, lens) {
  const capability = taxonomy.capabilityById.get(gap.id);
  const topic = representativeTopic(taxonomy, capability, lens);
  const unlockedTargetIds = descendantTargets(taxonomy, capability.id, targets);
  const unlockedTargets = unlockedTargetIds.slice(0, 5).map((id) => taxonomy.capabilityById.get(id)?.name).filter(Boolean);
  const evidence = topic?.evidence?.[0] ?? `Demonstrate ${capability.name.toLowerCase()} in an original example.`;
  const evidenceJa = topic?.evidence?.[0]
    ? taxonomy.localizeJa(topic.evidence[0])
    : `自分で作った例で「${capability.japaneseName}」を示します。`;
  const assessmentPrompt = topic?.assessmentPrompt?.replaceAll('{{name}}', 'the learner')
    ?? `Produce an original Japanese example that demonstrates ${capability.name.toLowerCase()}.`;
  const assessmentPromptJa = topic?.assessmentPrompt
    ? taxonomy.localizeJa(topic.assessmentPrompt).replaceAll('{{name}}', '学習者')
    : `自分で作った日本語で「${capability.japaneseName}」を示してください。`;
  const why = gap.status === 'untested'
    ? 'This area has not been measured, so studying it before a quick probe risks wasting time.'
    : unlockedTargets.length
      ? `This is weak and sits upstream of ${unlockedTargets.length} selected target ${unlockedTargets.length === 1 ? 'capability' : 'capabilities'}.`
      : 'This is a high-confidence gap inside the selected target scope.';
  const whyJa = gap.status === 'untested'
    ? 'まだ測定されていません。短い確認をせずに学習を始めると、時間を無駄にする可能性があります。'
    : unlockedTargets.length
      ? `この弱点は、選択した目標能力${unlockedTargets.length}件の前提に位置しています。`
      : '選択した目標範囲内で、確度の高い弱点です。';
  return {
    capabilityId: capability.id,
    capability: capability.name,
    japaneseCapability: capability.japaneseName,
    domain: capability.domain,
    status: gap.status,
    mastery: gap.probability,
    confidence: gap.confidence,
    actionType: gap.status === 'untested' ? 'diagnose' : 'remediate',
    title: `${planVerb(gap.status)} ${capability.name.toLowerCase()}`,
    titleJa: `${capability.japaneseName}を${planVerbJa(gap.status)}`,
    why,
    whyJa,
    topic: topic ? {
      id: topic.id,
      name: topic.name,
      japaneseName: topic.japaneseName,
      description: topic.description,
      descriptionJa: taxonomy.localizeJa(topic.description),
      levelRange: [topic.levelRangeStart, topic.levelRangeEnd].filter(Boolean).join('–') || null,
      jlptLevels: topic.jlptLevels ?? [],
      bjtLevels: topic.bjtLevels ?? []
    } : null,
    learningAction: gap.status === 'untested'
      ? assessmentPrompt
      : topic?.description ?? capability.summary,
    learningActionJa: gap.status === 'untested'
      ? assessmentPromptJa
      : topic?.description
        ? taxonomy.localizeJa(topic.description)
        : capability.summaryJa,
    successEvidence: evidence,
    successEvidenceJa: evidenceJa,
    retest: assessmentPrompt,
    retestJa: assessmentPromptJa,
    unlockedTargets
  };
}

function weakestItems(snapshot, limit = 12) {
  const score = (item) => gapNeed(item) * 0.72 + (1 - item.confidence) * 0.28;
  return [...snapshot.kanji, ...snapshot.vocabulary, ...snapshot.grammar]
    .filter((item) => item.status !== 'known')
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      type: item.type ?? (item.lemma ? 'vocabulary' : item.character ? 'kanji' : 'grammar'),
      label: item.character ?? item.lemma ?? item.name,
      reading: item.reading ?? null,
      gloss: item.gloss ?? null,
      context: item.context ?? null,
      origin: item.origin ?? 'taxonomy',
      flaggedCount: item.flaggedCount ?? 0,
      status: item.status,
      mastery: item.probability,
      confidence: item.confidence
    }));
}

function itemLabel(item) {
  return item.character ?? item.lemma ?? item.japaneseName ?? item.name;
}

function buildReadingQueue(snapshot, limit = 8) {
  const items = [...snapshot.kanji, ...snapshot.vocabulary, ...snapshot.grammar]
    .filter((item) => item.status !== 'known' && (item.flaggedCount > 0 || item.origin === 'personal'))
    .map((item) => {
      const type = item.type ?? (item.character ? 'kanji' : item.lemma ? 'vocabulary' : 'grammar');
      const priority = gapNeed(item) * 0.68
        + Math.min(1, (item.flaggedCount ?? 0) / 3) * 0.22
        + (item.origin === 'personal' ? 0.1 : 0.04);
      return { ...item, type, priority: Math.round(clamp(priority) * 1000) / 1000 };
    })
    .sort((a, b) => b.priority - a.priority || (b.flaggedCount ?? 0) - (a.flaggedCount ?? 0))
    .slice(0, limit);

  return items.map((item, index) => {
    const label = itemLabel(item);
    const sourceCount = item.flaggedCount || item.sourceCount || 1;
    const typeName = { vocabulary: 'word', kanji: 'kanji', grammar: 'construction' }[item.type];
    const typeNameJa = { vocabulary: '語彙', kanji: '漢字', grammar: '文法表現' }[item.type];
    const successEvidence = item.type === 'vocabulary'
      ? `Give the reading and meaning of 「${label}」 in its original context, then use it in a different sentence without looking it up.`
      : item.type === 'kanji'
        ? `Read 「${label}」 correctly in the flagged word, explain that word, and recall one other common word containing it.`
        : `Explain the function of 「${label}」 in the flagged context and use it appropriately in a new sentence.`;
    const successEvidenceJa = item.type === 'vocabulary'
      ? `元の文脈で「${label}」の読みと意味を答え、調べずに別の文で使います。`
      : item.type === 'kanji'
        ? `印を付けた語の中で「${label}」を正しく読み、その語を説明し、この字を含む別の一般的な語を一つ想起します。`
        : `印を付けた文脈で「${label}」の働きを説明し、新しい文で適切に使います。`;
    return {
      rank: index + 1,
      priority: item.priority,
      queueType: 'reading-gap',
      subjectId: item.id,
      subjectType: item.type,
      label,
      reading: item.reading ?? null,
      gloss: item.gloss ?? null,
      context: item.context ?? null,
      sourceCount,
      status: item.status,
      mastery: item.probability,
      confidence: item.confidence,
      actionType: 'remediate',
      title: `${planVerb(item.status)} ${typeName} · ${label}`,
      titleJa: `${typeNameJa}「${label}」を${planVerbJa(item.status)}`,
      why: `You explicitly flagged this ${typeName} while reading${sourceCount > 1 ? ` ${sourceCount} times` : ''}; it is an observed hole, not a syllabus guess.`,
      whyJa: `読書中にこの${typeNameJa}を${sourceCount > 1 ? `${sourceCount}回` : ''}明示的に印付けしました。シラバス上の推測ではなく、観測された穴です。`,
      learningAction: [item.reading && `reading: ${item.reading}`, item.gloss && `sense: ${item.gloss}`, item.context && `context: ${item.context}`].filter(Boolean).join(' · ') || `Resolve the form, reading, and contextual meaning of ${label}.`,
      learningActionJa: [item.reading && `読み：${item.reading}`, item.gloss && `意味：${item.gloss}`, item.context && `文脈：${item.context}`].filter(Boolean).join('・') || `「${label}」の形・読み・文脈上の意味を確認します。`,
      successEvidence,
      successEvidenceJa,
      retest: successEvidence,
      retestJa: successEvidenceJa
    };
  });
}

export function analyzeLearner(taxonomy, state, options = {}) {
  const lens = options.lens || 'none';
  const targets = targetSet(taxonomy, state, { ...options, lens });
  const relevant = prerequisiteClosure(taxonomy, targets);
  const snapshot = buildMasterySnapshot(taxonomy, state, { lens });
  const capabilityById = new Map(snapshot.capabilities.map((item) => [item.id, item]));

  const ranked = [...relevant]
    .map((id) => {
      const item = capabilityById.get(id);
      const unlocked = descendantTargets(taxonomy, id, targets).length;
      const isTarget = targets.has(id);
      const priority = gapNeed(item) * 0.55
        + (1 - item.confidence) * 0.17
        + Math.min(1, Math.log1p(unlocked) / 2.4) * 0.18
        + (isTarget ? 0.1 : 0.04);
      return { ...item, priority: Math.round(clamp(priority) * 1000) / 1000, unlockedTargetCount: unlocked, isTarget };
    })
    .filter((item) => item.status !== 'known' || !item.durable)
    .sort((a, b) => {
      const statusOrder = { unknown: 0, fragile: 1, untested: 2, known: 3 };
      return b.priority - a.priority || statusOrder[a.status] - statusOrder[b.status] || a.stage - b.stage;
    });

  const limit = Math.max(1, Math.min(20, Number(options.limit) || 8));
  const plan = ranked.slice(0, limit).map((gap, index) => ({
    rank: index + 1,
    priority: gap.priority,
    ...buildPlanItem(taxonomy, gap, targets, lens)
  }));
  const readingQueue = buildReadingQueue(snapshot, Math.min(12, limit));
  const coverage = Object.fromEntries(
    ['direct', 'supporting', 'unmeasured', 'none'].map((relation) => [
      relation,
      snapshot.capabilities.filter((item) => item.relation === relation).length
    ])
  );

  return {
    generatedAt: new Date().toISOString(),
    learner: state.learner,
    lens,
    targetCapabilityIds: [...targets],
    relevantCapabilityIds: [...relevant],
    coverage,
    summary: snapshot.summary,
    gaps: ranked.map((item) => ({
      id: item.id,
      name: item.name,
      japaneseName: item.japaneseName,
      domain: item.domain,
      stage: item.stage,
      status: item.status,
      mastery: item.probability,
      confidence: item.confidence,
      durable: item.durable,
      relation: item.relation,
      priority: item.priority,
      unlockedTargetCount: item.unlockedTargetCount,
      isTarget: item.isTarget
    })),
    plan,
    readingQueue,
    weakestItems: weakestItems(snapshot),
    heatmap: snapshot
  };
}
