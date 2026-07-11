import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { taxonomyRoot as defaultTaxonomyRoot } from './paths.mjs';

const requiredFiles = [
  'data/shared/capabilities.json',
  'data/shared/characters.json',
  'data/shared/lexemes.json',
  'data/native-child/topics.json',
  'data/l2-adult/topics.json',
  'data/l2-adult/dependencies.json',
  'data/locales/ja.json'
];

let cachedTaxonomy = null;
let cachedRoot = null;

async function readJson(root, relativePath) {
  const filePath = path.join(root, relativePath);
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function stableId(prefix, value) {
  return `${prefix}_${crypto.createHash('sha256').update(value).digest('hex').slice(0, 16)}`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function levelRank(level) {
  return { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 }[level] ?? 0;
}

export async function inspectTaxonomy(root = defaultTaxonomyRoot()) {
  const checks = await Promise.all(
    requiredFiles.map(async (relativePath) => {
      try {
        const stat = await fs.stat(path.join(root, relativePath));
        return { path: relativePath, present: stat.isFile(), bytes: stat.size };
      } catch {
        return { path: relativePath, present: false, bytes: 0 };
      }
    })
  );
  return { root, ready: checks.every((item) => item.present), files: checks };
}

export async function loadTaxonomy({ root = defaultTaxonomyRoot(), fresh = false } = {}) {
  const resolvedRoot = path.resolve(root);
  if (!fresh && cachedTaxonomy && cachedRoot === resolvedRoot) return cachedTaxonomy;

  const inspection = await inspectTaxonomy(resolvedRoot);
  if (!inspection.ready) {
    const missing = inspection.files.filter((item) => !item.present).map((item) => item.path).join(', ');
    throw new Error(`Sensei cannot load the Japanese taxonomy at ${resolvedRoot}. Missing: ${missing}`);
  }

  const [crosswalk, characters, lexemes, native, l2, l2Dependencies, localization] = await Promise.all([
    readJson(resolvedRoot, requiredFiles[0]),
    readJson(resolvedRoot, requiredFiles[1]),
    readJson(resolvedRoot, requiredFiles[2]),
    readJson(resolvedRoot, requiredFiles[3]),
    readJson(resolvedRoot, requiredFiles[4]),
    readJson(resolvedRoot, requiredFiles[5]),
    readJson(resolvedRoot, requiredFiles[6])
  ]);
  const jaTextBySource = new Map(localization.entries.map((entry) => [entry.source, entry.ja]));
  const localizeJa = (value) => typeof value === 'string' ? jaTextBySource.get(value.trim()) ?? value : value;

  const nativeById = new Map(native.topics.map((topic) => [topic.id, topic]));
  const l2ById = new Map(l2.topics.map((topic) => [topic.id, topic]));
  const topicById = new Map([...nativeById, ...l2ById]);
  const capabilityById = new Map();
  const capabilityIdByTopicId = new Map();

  const capabilities = crosswalk.capabilities.map((capability) => {
    const nativeTopics = capability.l1TopicIds.map((id) => nativeById.get(id)).filter(Boolean);
    const l2Topics = capability.l2TopicIds.map((id) => l2ById.get(id)).filter(Boolean);
    const record = { ...capability, nativeTopics, l2Topics };
    capabilityById.set(record.id, record);
    for (const topic of [...nativeTopics, ...l2Topics]) capabilityIdByTopicId.set(topic.id, record.id);
    return record;
  });

  const topicsByCharacterSet = new Map();
  const topicsByLexemeSet = new Map();
  for (const topic of [...native.topics, ...l2.topics]) {
    for (const setId of topic.linkedCharacters ?? []) {
      if (!topicsByCharacterSet.has(setId)) topicsByCharacterSet.set(setId, []);
      topicsByCharacterSet.get(setId).push(topic);
    }
    for (const setId of topic.linkedLexemes ?? []) {
      if (!topicsByLexemeSet.has(setId)) topicsByLexemeSet.set(setId, []);
      topicsByLexemeSet.get(setId).push(topic);
    }
  }

  const characterItems = characters.characterSets.flatMap((set) =>
    set.characters.map((character) => {
      const linkedTopics = topicsByCharacterSet.get(set.id) ?? [];
      return {
        id: stableId('character', `${set.id}:${character}`),
        type: set.kind === 'kanji' ? 'kanji' : 'script',
        character,
        setId: set.id,
        setName: set.name,
        japaneseSetName: set.japaneseName,
        grade: set.grade,
        capabilityIds: unique(linkedTopics.map((topic) => capabilityIdByTopicId.get(topic.id))),
        topicIds: unique(linkedTopics.map((topic) => topic.id)),
        sourceTags: set.sourceTags ?? []
      };
    })
  );

  const lexemeByKey = new Map();
  for (const set of lexemes.lexemeSets) {
    const linkedTopics = topicsByLexemeSet.get(set.id) ?? [];
    for (const item of set.items) {
      const key = `${item.lemma}|${item.reading}`;
      if (!lexemeByKey.has(key)) {
        lexemeByKey.set(key, {
          id: stableId('vocabulary', key),
          type: 'vocabulary',
          lemma: item.lemma,
          reading: item.reading,
          gloss: item.gloss,
          setIds: [],
          setNames: [],
          capabilityIds: [],
          topicIds: [],
          sourceTags: []
        });
      }
      const record = lexemeByKey.get(key);
      record.setIds.push(set.id);
      record.setNames.push(set.name);
      record.capabilityIds.push(...linkedTopics.map((topic) => capabilityIdByTopicId.get(topic.id)));
      record.topicIds.push(...linkedTopics.map((topic) => topic.id));
      record.sourceTags.push(...(set.sourceTags ?? []));
    }
  }
  const vocabularyItems = [...lexemeByKey.values()].map((item) => ({
    ...item,
    setIds: unique(item.setIds),
    setNames: unique(item.setNames),
    capabilityIds: unique(item.capabilityIds),
    topicIds: unique(item.topicIds),
    sourceTags: unique(item.sourceTags)
  }));

  const grammarTopics = l2.topics.filter((topic) => {
    const capability = capabilityById.get(capabilityIdByTopicId.get(topic.id));
    return capability?.domain === 'Grammar & Structure' && !topic.id.includes('SPIRAL');
  });
  const capabilityTopics = l2.topics.filter((topic) => !grammarTopics.includes(topic));

  const prerequisitesByTopic = new Map();
  const unlocksByTopic = new Map();
  for (const edge of l2Dependencies.dependencies) {
    if (!prerequisitesByTopic.has(edge.topicId)) prerequisitesByTopic.set(edge.topicId, []);
    if (!unlocksByTopic.has(edge.prerequisiteId)) unlocksByTopic.set(edge.prerequisiteId, []);
    prerequisitesByTopic.get(edge.topicId).push({ ...edge, topic: l2ById.get(edge.prerequisiteId) });
    unlocksByTopic.get(edge.prerequisiteId).push({ ...edge, topic: l2ById.get(edge.topicId) });
  }

  const capabilityEdges = new Map();
  for (const edge of l2Dependencies.dependencies) {
    const from = capabilityIdByTopicId.get(edge.prerequisiteId);
    const to = capabilityIdByTopicId.get(edge.topicId);
    if (!from || !to || from === to) continue;
    const key = `${from}>${to}`;
    if (!capabilityEdges.has(key)) {
      capabilityEdges.set(key, { prerequisiteId: from, capabilityId: to, count: 0, hardCount: 0 });
    }
    const aggregate = capabilityEdges.get(key);
    aggregate.count += 1;
    if (edge.strength === 'hard') aggregate.hardCount += 1;
  }

  const taxonomy = {
    root: resolvedRoot,
    version: crosswalk.version,
    status: crosswalk.status,
    note: crosswalk.note,
    assessmentScopeNotes: crosswalk.assessmentScopeNotes,
    capabilities,
    capabilityById,
    capabilityIdByTopicId,
    nativeTopics: native.topics,
    l2Topics: l2.topics,
    topicById,
    nativeById,
    l2ById,
    characterItems,
    characterById: new Map(characterItems.map((item) => [item.id, item])),
    vocabularyItems,
    vocabularyById: new Map(vocabularyItems.map((item) => [item.id, item])),
    grammarTopics,
    capabilityTopics,
    prerequisitesByTopic,
    unlocksByTopic,
    capabilityEdges: [...capabilityEdges.values()],
    localizeJa,
    summary: {
      capabilities: capabilities.length,
      nativeTopics: native.topics.length,
      l2Topics: l2.topics.length,
      kanji: characterItems.filter((item) => item.type === 'kanji').length,
      scriptItems: characterItems.filter((item) => item.type === 'script').length,
      vocabulary: vocabularyItems.length,
      grammarTopics: grammarTopics.length,
      l2Dependencies: l2Dependencies.dependencies.length
    }
  };

  cachedTaxonomy = taxonomy;
  cachedRoot = resolvedRoot;
  return taxonomy;
}

export function searchCapabilities(taxonomy, { query = '', lens = 'none', limit = 12 } = {}) {
  const normalizedQuery = query.trim().toLowerCase();
  return taxonomy.capabilities
    .map((capability) => {
      const primaryHaystack = [
        capability.name,
        capability.japaneseName,
        capability.summary,
        capability.summaryJa,
        capability.domain
      ].join(' ').toLowerCase();
      const secondaryHaystack = capability.l2Topics
        .flatMap((topic) => [topic.name, topic.japaneseName, topic.description])
        .join(' ')
        .toLowerCase();
      const terms = normalizedQuery.split(/\s+/).filter(Boolean);
      const queryScore = !normalizedQuery
        ? 1
        : (primaryHaystack.includes(normalizedQuery) ? 10 : 0)
          + terms.filter((term) => primaryHaystack.includes(term)).length * 3
          + (secondaryHaystack.includes(normalizedQuery) ? 2 : 0)
          + terms.filter((term) => secondaryHaystack.includes(term)).length * 0.5;
      const [assessment, level] = lens.includes(':') ? lens.split(':') : [lens, null];
      const coverage = capability.assessmentCoverage?.[assessment];
      const relation = lens === 'mext'
        ? capability.assessmentCoverage.mext.covered ? 'direct' : 'unmeasured'
        : coverage?.directLevels?.includes(level)
          ? 'direct'
          : coverage?.supportingLevels?.includes(level)
            ? 'supporting'
            : 'unmeasured';
      const lensScore = lens === 'none' ? 0 : relation === 'direct' ? 2 : relation === 'supporting' ? 1 : 0;
      return { capability, score: queryScore + lensScore, relation, queryMatch: !normalizedQuery || queryScore > 0 };
    })
    .filter((item) => item.queryMatch)
    .sort((a, b) => b.score - a.score || a.capability.stage - b.capability.stage || a.capability.name.localeCompare(b.capability.name))
    .slice(0, Math.max(1, Math.min(50, limit)))
    .map(({ capability, relation }) => ({
      id: capability.id,
      name: capability.name,
      japaneseName: capability.japaneseName,
      domain: capability.domain,
      stage: capability.stage,
      summary: capability.summary,
      summaryJa: capability.summaryJa,
      routeStatus: capability.routeStatus,
      relation,
      l2TopicCount: capability.l2TopicIds.length,
      nativeTopicCount: capability.l1TopicIds.length,
      jlptLevels: [...capability.coverage.jlptLevels].sort((a, b) => levelRank(a) - levelRank(b)),
      bjtLevels: capability.coverage.bjtLevels
    }));
}
