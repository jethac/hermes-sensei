import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTaxonomy, searchCapabilities } from '../src/core/taxonomy.mjs';

test('imports the shared capability layer and all adult topics', async () => {
  const taxonomy = await loadTaxonomy({ fresh: true });
  assert.equal(taxonomy.capabilities.length, 33);
  assert.equal(taxonomy.l2Topics.length, 1001);
  assert.equal(taxonomy.capabilityIdByTopicId.size, 2219);
  assert.equal(taxonomy.characterItems.filter((item) => item.type === 'kanji').length, 80);
  assert.equal(taxonomy.vocabularyItems.length, 475);
  assert.equal(taxonomy.grammarTopics.length, 105);
  for (const topic of taxonomy.l2Topics) assert.ok(taxonomy.capabilityIdByTopicId.has(topic.id), topic.id);
});

test('catalog search does not let lens relevance swamp the query', async () => {
  const taxonomy = await loadTaxonomy();
  const results = searchCapabilities(taxonomy, { query: 'literary interpretation', lens: 'jlpt:N1', limit: 10 });
  assert.ok(results.length >= 1);
  assert.equal(results[0].id, 'jc_literary_reading');
});
