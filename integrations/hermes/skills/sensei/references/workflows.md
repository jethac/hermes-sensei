# Sensei orchestration examples

## Highlighted page to personal study queue

1. Call `scan_inbox` and choose a `pending` scan.
2. Call `inspect_scan`; distinguish actual marker/underline/annotation from typography, furigana, emphasis printed by the publisher, and page decoration.
3. Call `ingest_highlights` with only the visibly marked spans. Keep the exact surface, sentence context, page number, and visual confidence. Omit lexical enrichment that would be a guess.
4. Present a compact numbered review list to the learner: surface, proposed reading/meaning, and uncertainty.
5. After explicit confirmation or correction, call `review_highlights` for each item.
6. Call `analyze_gaps`. Use `readingQueue` as the immediate remediation list.
7. After study, call `begin_diagnostic` with `focus: reading-gaps` and 4–12 probes. Do not re-show the source definition before recall.

A highlighted whole word is vocabulary evidence, not automatic proof that every constituent kanji is unknown. Record a kanji finding only when the learner marked that character specifically or confirms the character itself was the problem. A highlighted multi-token pattern may be grammar when the learner confirms the construction—not merely one unknown lexical item—caused the difficulty.

## Strong JLPT learner looking for blind spots

1. Call `begin_diagnostic` with `declaredJlpt: N1`, `mode: beyond-exam`, `lens: jlpt:N1`, and 12–20 probes.
2. Prioritise productive kanji control, composition, revision, interaction, discussion, presentation, culture, research, media literacy, and transfer.
3. Grade answers against the returned rubric. Do not grant credit merely because the learner can explain a rule in English.
4. Call `analyze_gaps` with the same lens and `mode: beyond-exam`.

## Targeted goal

For a goal such as “participate naturally in technical meetings”:

1. Search `catalog` for `technical meetings discussion register repair`.
2. Select only the relevant capability IDs.
3. Begin a `targeted` diagnostic with those IDs.
4. Let Sensei include prerequisite probes even when they do not look like the final goal.
5. Explain the resulting plan in dependency order.

## Retest after remediation

1. Begin a four- to eight-probe targeted session for the remediated capability.
2. Prefer recall, production, or transfer rather than repeating the original recognition item.
3. Record lower confidence if the prompt accidentally cues the answer.
4. Re-run gap analysis and compare status, probability, confidence, and durability.

## Scoring examples

- Correct vocabulary choice with no production demand: `score=1`, moderate confidence; this remains recognition evidence.
- Grammatically correct memorised sentence that does not fit the requested context: `score=0.5` or lower.
- Correct repair strategy used spontaneously after a deliberate misunderstanding: `score=1`, high confidence, transfer evidence.
- English explanation of a Japanese construction when Japanese production was requested: `score=0` for the requested evidence.
