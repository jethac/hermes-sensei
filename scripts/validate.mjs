import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { projectRoot } from '../src/core/paths.mjs';
import { inspectTaxonomy, loadTaxonomy } from '../src/core/taxonomy.mjs';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const schemaDirectory = path.join(projectRoot, 'schema');
for (const filename of fs.readdirSync(schemaDirectory).filter((name) => name.endsWith('.json'))) {
  try {
    JSON.parse(fs.readFileSync(path.join(schemaDirectory, filename), 'utf8'));
  } catch (error) {
    errors.push(`${filename}: invalid JSON (${error.message})`);
  }
}

const inspection = await inspectTaxonomy();
assert(inspection.ready, `taxonomy input incomplete at ${inspection.root}`);
const taxonomy = inspection.ready ? await loadTaxonomy({ fresh: true }) : null;
if (taxonomy) {
  assert(taxonomy.capabilities.length === 33, 'expected 33 shared capabilities');
  assert(taxonomy.capabilityIdByTopicId.size === taxonomy.nativeTopics.length + taxonomy.l2Topics.length, 'not every topic is cross-walked');
  assert(taxonomy.characterItems.filter((item) => item.type === 'kanji').length > 0, 'kanji inventory empty');
  assert(taxonomy.vocabularyItems.length > 0, 'vocabulary inventory empty');
  assert(taxonomy.grammarTopics.length > 0, 'grammar topic inventory empty');
}

const skill = fs.readFileSync(path.join(projectRoot, 'integrations', 'hermes', 'skills', 'sensei', 'SKILL.md'), 'utf8');
assert(skill.startsWith('---\n'), 'Hermes skill missing frontmatter');
for (const field of ['name: sensei', 'description:', 'version:', 'license:', 'metadata:', 'hermes:']) {
  assert(skill.includes(field), `Hermes skill missing ${field}`);
}
const hermesConfig = fs.readFileSync(path.join(projectRoot, 'integrations', 'hermes', 'config.example.yaml'), 'utf8');
for (const tool of ['catalog', 'begin_diagnostic', 'next_probe', 'record_evidence', 'analyze_gaps', 'scan_inbox', 'inspect_scan', 'ingest_highlights', 'review_highlights']) {
  assert(skill.includes(`\`${tool}\``), `Hermes skill missing ${tool} workflow guidance`);
  assert(hermesConfig.includes(`- ${tool}`), `Hermes config does not expose ${tool}`);
}

const sourceFiles = [
  ...walk(path.join(projectRoot, 'src')),
  ...walk(path.join(projectRoot, 'scripts'))
].filter((filename) => filename.endsWith('.js') || filename.endsWith('.mjs'));
for (const filename of sourceFiles) {
  const result = spawnSync(process.execPath, ['--check', filename], { encoding: 'utf8' });
  if (result.status !== 0) errors.push(`${path.relative(projectRoot, filename)}: ${result.stderr.trim()}`);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

if (errors.length) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(`Validation passed: ${sourceFiles.length} source files and ${taxonomy?.capabilities.length ?? 0} capabilities.\n`);
