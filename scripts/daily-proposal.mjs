#!/usr/bin/env node
// Daily study-proposal heartbeat (the Sensei seat's one outbound artifact).
//
// Computes a real ~1h/day study proposal from the engine's gap analysis
// (analyzeLearner: prerequisite-aware plan + reading-flagged gaps) plus the
// mastery platform's proficiency projection, then files it as a REVIEW-GATED
// card on the EA's hermes-org kanban board. Draft-don't-post is expressed in
// the platform's own terms (see hermes-org/contractor.py + review.py):
//
//   create (running) -> draft comment -> sticky-block kind=needs_input
//
// We deliberately do NOT use status='review' (in this kanban that means
// "spawn an sdlc-review agent") and never leave the card in 'ready' (the org
// dispatcher would seat a contractor on it). The only exit from the sticky
// block is an operator decision via hermes-org/review.py — the EA greenlight.
//
// Runs standalone (node scripts/daily-proposal.mjs) and as the sensei
// profile's hermes cron job (07:45 JST, no_agent wrapper in
// ~/.hermes/profiles/sensei/scripts/daily_proposal.sh). Idempotent per day.

import { spawn } from 'node:child_process';
import { createSenseiService } from '../src/core/service.mjs';
import { createMasteryClientFromEnvironment } from '../src/core/masteryClient.mjs';

const LEARNER_ID = process.env.SENSEI_LEARNER_ID || 'jetha';
const BOARD = process.env.SENSEI_PROPOSAL_BOARD || 'ea';
const ORG_HOME = process.env.HERMES_ORG_HOME || '/Volumes/MacMiniOffload/home/hermes-org-home';
const ORG_PY = process.env.ORG_HERMES_PY
  || '/Volumes/MacMiniOffload/home/src/hermes-agent-25660/.venv-test/bin/python';
const ORG_HERMES_SRC = process.env.ORG_HERMES_SRC
  || '/Volumes/MacMiniOffload/home/src/hermes-agent-25660';

// Honest per-item time budget (minutes) by action type.
const MINUTES = { 'reading-gap': 6, diagnose: 7, remediate: 12 };
const TARGET_MINUTES = Number(process.env.SENSEI_PROPOSAL_MINUTES || 60);

function jstDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

function pct(n) {
  return `${Math.round(n * 100)}%`;
}

// ---- 1. Real signal: engine analysis + mastery ledger -----------------------

const mastery = await createMasteryClientFromEnvironment({
  logger: { error: (msg) => process.stderr.write(`${msg}\n`) }
});
const service = await createSenseiService();
const analysis = await service.analyze({ learnerId: LEARNER_ID, limit: 10 });

let ledger = null;
if (mastery) {
  try {
    const { rows } = await mastery.readProficiency({
      select: 'item_id,state,retrievability,updated_at',
      limit: 500
    });
    const weak = rows.filter((row) => typeof row.retrievability === 'number' && row.retrievability < 0.8);
    ledger = { rows: rows.length, weak: weak.length, states: rows.reduce((acc, row) => {
      acc[row.state] = (acc[row.state] ?? 0) + 1;
      return acc;
    }, {}) };
  } catch (error) {
    process.stderr.write(`[mastery] proficiency read failed (proposal proceeds on engine data): ${error.message}\n`);
  }
}

// ---- 2. Fill the ~60 minute budget: his reading flags first, then the plan --

const candidates = [
  ...analysis.readingQueue.map((item) => ({ ...item, kind: 'reading-gap' })),
  ...analysis.plan.map((item) => ({ ...item, kind: item.actionType === 'diagnose' ? 'diagnose' : 'remediate' }))
];
const selected = [];
let minutes = 0;
for (const item of candidates) {
  const cost = MINUTES[item.kind];
  if (minutes + cost > TARGET_MINUTES && selected.length) break;
  selected.push({ ...item, minutes: cost });
  minutes += cost;
}

const gapCounts = analysis.gaps.reduce((acc, gap) => {
  acc[gap.status] = (acc[gap.status] ?? 0) + 1;
  return acc;
}, {});
const readingCount = analysis.readingQueue.length;

const urgency = readingCount > 0 || (gapCounts.unknown ?? 0) > 0
  ? 'high'
  : (gapCounts.fragile ?? 0) > 0
    ? 'medium'
    : 'low'; // mostly untested: measurement mode, no observed fire

const evidenceParts = [
  `engine: ${analysis.gaps.length} open capability gaps (${['unknown', 'fragile', 'untested'].map((s) => `${gapCounts[s] ?? 0} ${s}`).join(', ')})`,
  readingCount ? `${readingCount} learner-flagged reading item(s)` : null,
  ledger ? `mastery ledger: ${ledger.rows} tracked item(s), ${ledger.weak} with retrievability < 0.8` : 'mastery ledger unreachable this run'
];
const oneLineEvidence = evidenceParts.filter(Boolean).join('; ');

const focusAreas = [...new Set(selected.map((item) => item.kind === 'reading-gap' ? 'reading gaps (learner-flagged)' : item.domain))];

const proposal = {
  date: jstDate(),
  learner: LEARNER_ID,
  duration_minutes: minutes,
  item_count: selected.length,
  urgency,
  one_line_evidence: oneLineEvidence,
  focus_areas: focusAreas
};

// ---- 3. Compose the card ----------------------------------------------------

const title = `Today's Japanese focus — ${proposal.date}`;
const lines = [
  `Sensei's daily study proposal for ${proposal.date} (draft — EA greenlights before it reaches Jetha).`,
  '',
  '```json',
  JSON.stringify(proposal, null, 2),
  '```',
  '',
  `## Proposed session (~${minutes} min, ${selected.length} items, urgency: ${urgency})`,
  ''
];
for (const item of selected) {
  const label = item.kind === 'reading-gap'
    ? `${item.title} (${item.titleJa})`
    : `${item.title} — ${item.titleJa}`;
  lines.push(`- **[${item.minutes} min · ${item.kind}]** ${label}`);
  lines.push(`  - why: ${item.why}`);
  lines.push(`  - done when: ${item.successEvidence}`);
}
lines.push('', `Evidence: ${oneLineEvidence}`);
if (analysis.coverage) {
  lines.push(`Coverage: ${Object.entries(analysis.coverage).map(([k, v]) => `${k}=${v}`).join(', ')}`);
}
const body = lines.join('\n');

// ---- 4. File the review-gated card via the org's own kanban API -------------

const py = `
import json, os, sys
sys.path.insert(0, ${JSON.stringify(ORG_HERMES_SRC)})
os.environ["HERMES_HOME"] = ${JSON.stringify(ORG_HOME)}
import hermes_cli.kanban_db as kb

payload = json.load(sys.stdin)
board = payload["board"]
conn = kb.connect(board=board)
try:
    existing = [t for t in kb.list_tasks(conn) if getattr(t, "idempotency_key", None) == payload["idem"]]
    if existing:
        t = existing[0]
        print(json.dumps({"task_id": t.id, "status": t.status, "board": board, "already_filed": True}))
    else:
        task_id = kb.create_task(
            conn,
            title=payload["title"],
            body=payload["body"],
            created_by="hermes-sensei",
            initial_status="running",
            idempotency_key=payload["idem"],
            board=board,
        )
        kb.add_comment(conn, task_id, "hermes-sensei", "[contractor hermes-sensei \\u00b7 draft-only]\\n\\n" + payload["body"])
        kb.block_task(conn, task_id, kind="needs_input",
                      reason="Awaiting EA review \\u2014 daily study proposal (draft-don't-post)")
        t = kb.get_task(conn, task_id)
        print(json.dumps({"task_id": task_id, "status": t.status, "board": board, "already_filed": False}))
finally:
    conn.close()
`;

const result = await new Promise((resolve, reject) => {
  const child = spawn(ORG_PY, ['-c', py], { stdio: ['pipe', 'pipe', 'inherit'] });
  const chunks = [];
  child.stdout.on('data', (chunk) => chunks.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => {
    if (code !== 0) return reject(new Error(`kanban filing exited with code ${code}`));
    try {
      resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    } catch (error) {
      reject(new Error(`kanban filing returned unparseable output: ${error.message}`));
    }
  });
  child.stdin.end(JSON.stringify({
    board: BOARD,
    title,
    body,
    idem: `sensei-daily-proposal-${proposal.date}`
  }));
});

// Cron (no_agent) delivers this stdout verbatim.
console.log(`${result.already_filed ? 'Already filed today' : 'Filed'}: "${title}" -> board '${result.board}' card ${result.task_id} (status: ${result.status})`);
console.log(`Proposal: ${minutes} min, ${selected.length} items, urgency ${urgency}, focus: ${focusAreas.join(' / ')}`);
console.log(`Evidence: ${oneLineEvidence}`);
