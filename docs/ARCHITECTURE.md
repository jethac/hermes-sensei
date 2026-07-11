# Sensei architecture

Sensei separates evidence and planning from conversation. The deterministic engine owns learner state; a browser or Hermes Agent supplies the interaction surface.

```text
os-taxonomy-japanese (read only)
        │
        ▼
taxonomy importer ── stable capabilities, topics, prerequisites, companion items
        │
        ├── adaptive probe selector
        ├── personal reading inventory ◄── reviewed scan highlights
        ├── append/update evidence ledger
        ├── mastery estimator
        └── prerequisite-aware remediation planner
             │                         │
             ▼                         ▼
       local HTTP API             stdio MCP server
             │                         │
             ▼                         ▼
       learner web UI              Hermes Agent
```

## Boundaries

- `os-taxonomy-japanese` is curriculum/reference input. Sensei never writes to it.
- `.sensei/learners/*.json` is private runtime state. It contains learner context, diagnostic sessions, structured evidence, scan metadata, review decisions, and personal items.
- `.sensei/scans/<learner>/` contains optional original scan images. Server-generated IDs—not uploaded filenames—determine storage paths. Originals can be deleted without erasing confirmed observations.
- `src/core` contains all product logic and is independent of HTTP, the browser, and MCP.
- `src/http.mjs` and `src/mcp/server.mjs` are thin adapters over the same service.
- The Hermes skill teaches orchestration and grading discipline; it is not the source of truth for mastery.

## Why MCP plus a skill

Hermes recommends MCP for structured external capabilities and supports local stdio servers with automatic tool discovery. The nine-tool Sensei surface is split into diagnostics and reading evidence:

1. `catalog`
2. `begin_diagnostic`
3. `next_probe`
4. `record_evidence`
5. `analyze_gaps`
6. `scan_inbox`
7. `inspect_scan`
8. `ingest_highlights`
9. `review_highlights`

The skill is progressively loaded only when Japanese diagnostics are requested. It explains the sequence, evidence semantics, and the rule that grading references must remain hidden until the learner answers.

## Persistence

Learner files are written atomically through a temporary file and rename. Learner IDs are restricted to a safe filename alphabet. Updates to one learner are serialized both within a process and through a short-lived lock file shared by the web and Hermes MCP processes; abandoned locks expire after 30 seconds.

The JSON format is versioned. See `schema/learner-state.schema.json`.

## Scan trust boundary

The browser stores image bytes locally. Hermes receives an inbox image through the standard MCP `ImageContent` result or sees a user-attached image directly. Visual interpretation produces pending findings only. A learner review decision is the trust boundary that creates recognition-gap evidence and, when necessary, a personal item outside the taxonomy seed.

This deliberately separates three claims: “the model saw highlighted pixels,” “the text was transcribed correctly,” and “the learner confirms they did not know it.” Only the third, after correction of the second, changes the map.

## Current scope

The engine imports the complete taxonomy capability/topic graph, but the companion inventories in the current taxonomy seed contain only 80 kanji and 475 unique vocabulary records. Sensei reports these counts and grows a separate learner-owned inventory from confirmed real-world reading gaps.
