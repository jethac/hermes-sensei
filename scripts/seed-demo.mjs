import fs from 'node:fs/promises';
import path from 'node:path';
import { createSenseiService } from '../src/core/service.mjs';
import { stateRoot } from '../src/core/paths.mjs';

await fs.rm(path.join(stateRoot(), 'learners', 'demo.json'), { force: true });

const service = await createSenseiService();
await service.setContext('demo', {
  displayName: 'N1 learner demo',
  declaredJlpt: 'N1',
  goals: ['Turn receptive N1 knowledge into durable reading, writing, and interaction.'],
  targetCapabilityIds: ['jc_critical_reading', 'jc_argument_writing', 'jc_pragmatics_register', 'jc_discussion_debate']
});

const session = await service.begin({
  learnerId: 'demo',
  declaredJlpt: 'N1',
  mode: 'baseline',
  lens: 'none',
  maxProbes: 30,
  targetCapabilityIds: []
});

const typeScores = {
  kanji: [1, 1, 0.5, 0],
  vocabulary: [1, 0.5, 1, 0],
  grammar: [0.5, 0, 1, 0.5],
  capability: [0, 0.5, 1, 0]
};
const counters = { kanji: 0, vocabulary: 0, grammar: 0, capability: 0 };

while (true) {
  const next = await service.next({ learnerId: 'demo', sessionId: session.id, includeGradingReference: true });
  if (!next.probe) break;
  const type = next.probe.subjectType;
  const score = typeScores[type][counters[type] % typeScores[type].length];
  counters[type] += 1;
  await service.record({
    learnerId: 'demo', sessionId: session.id, probeId: next.probe.id,
    score, confidence: 0.82, evaluatedBy: 'teacher', notes: 'Deterministic demonstration evidence.'
  });
}

for (let reinforcement = 0; reinforcement < 2; reinforcement += 1) {
  const focused = await service.begin({
    learnerId: 'demo', mode: 'targeted', lens: 'none', maxProbes: 4,
    targetCapabilityIds: ['jc_critical_reading']
  });
  while (true) {
    const next = await service.next({ learnerId: 'demo', sessionId: focused.id, includeGradingReference: true });
    if (!next.probe) break;
    await service.record({
      learnerId: 'demo', sessionId: focused.id, probeId: next.probe.id,
      score: next.probe.subjectType === 'capability' ? 1 : 0.75,
      confidence: 0.9, evaluatedBy: 'teacher', notes: 'Deterministic reinforcement evidence.'
    });
  }
}

const analysis = await service.analyze({ learnerId: 'demo', lens: 'jlpt:N1', mode: 'beyond-exam', limit: 8 });
process.stdout.write(
  `Seeded demo learner with ${analysis.summary.evidenceCount} evidence events.\n` +
  `Open http://127.0.0.1:4186/?learner=demo after running npm run serve.\n`
);
