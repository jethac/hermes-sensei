# Mastery and gap model

Sensei models evidence, not identity. An estimate answers “what does the available evidence support now?” rather than “is this learner good at Japanese?”

## Evidence dimensions

Every observation records:

- subject: kanji, vocabulary, grammar topic, or capability;
- modality: recognition, recall, production, or transfer;
- score from 0 to 1;
- evaluator confidence from 0 to 1;
- evaluator type and timestamp;
- capability and taxonomy-topic links.

Raw responses are not stored by default.

A scan OCR/vision result is not evidence. It becomes evidence only after the learner confirms that the detected span was their own “I did not know this” mark. That confirmation is a high-confidence recognition failure in the observed context, while still saying nothing by itself about recall, production, or transfer.

## Posterior estimate

The current seed uses a transparent weighted estimate:

```text
posterior = (prior probability × prior strength + Σ score × evidence weight)
            / (prior strength + Σ evidence weight)

evidence weight = modality weight × evaluator-confidence weight × recency decay
```

Evidence decays with a 120-day half-life. Transfer is weighted most strongly, followed by production, recall, and recognition.

JLPT history supplies only a weak prior. Directly tested capability families receive a somewhat higher receptive prior; supporting and unmeasured families receive less. A prior never changes `untested` into `known`.

## Status rules

- `untested`: no direct evidence for the subject;
- `unknown`: evidence supports a probability below 0.58;
- `fragile`: partial knowledge, low confidence, or high performance without the required modality;
- `known`: probability at least 0.8, confidence at least 0.5, and suitable durability evidence.

A most-recent learner-confirmed highlighted miss is immediately `unknown` for that item. A later successful recall/production retest can supersede it; the old event remains in the audit trail.

For grammar and broad capabilities, durability requires successful production or transfer. For kanji and vocabulary, recall, production, or transfer can qualify. Recognition alone cannot make a broad capability durable.

Kanji/vocabulary observations can adjust a capability probability as supporting evidence, but they do not mark the broad capability as tested.

## Remediation priority

The planner combines:

- estimated need;
- uncertainty and value of another measurement;
- whether the capability is a direct target;
- how many selected targets sit downstream in the prerequisite graph.

Untested areas produce a diagnostic action. Confirmed gaps produce a learning action, observable success evidence, and a retest. The queue is deliberately bounded.

The separate reading queue ranks confirmed highlighted items by observed weakness, repeat occurrences, and confidence. It can contain learner-defined vocabulary, kanji, or grammar beyond the taxonomy's companion seed.

## Interpretation cautions

- Counts of mapped taxonomy topics indicate modelling emphasis, not instructional hours or mastery.
- Exam coverage is distinct from route alignment.
- This seed model is auditable and testable, but it is not yet psychometrically calibrated against a learner population.
