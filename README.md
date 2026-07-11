# Sensei

Sensei is a local-first Japanese gap-analysis and remediation system. It consumes [os-taxonomy-japanese](https://github.com/jethac/os-taxonomy-japanese) as read-only curriculum input, measures a learner through adaptive probes and confirmed highlights from real reading, renders known/fragile/unknown/untested heatmaps, and produces the smallest prerequisite-aware study queue supported by the evidence.

It is both:

- a standalone bilingual light/dark web application;
- a compact MCP server plus Agent Skills-compatible workflow for Hermes Agent.

Sensei does not write learner state back into the taxonomy.

## Product loop

1. Start with a weak prior from self-report and optional JLPT/BJT history.
2. Choose a broad baseline, a targeted capability set, or an exam’s blind spots.
3. Adaptively probe kanji, vocabulary, grammar, and broad communicative capabilities.
4. Record recognition, recall, production, and transfer evidence separately.
5. Render mastery, evaluator confidence, durability, and recency.
6. Trace weak or untested prerequisites that block the learner’s target.
7. Recommend a bounded queue containing the learning action, success evidence, and retest.
8. Accept highlighted page scans, have Hermes propose the marked spans, and add only learner-confirmed vocabulary, kanji, or grammar holes to a personal reading queue.

Passing JLPT N1 is treated as evidence about a receptive/test-aligned slice—not as proof of productive Japanese.

## Run locally

Requires Node.js 20 or newer and a sibling `os-taxonomy-japanese` checkout.

```powershell
git clone https://github.com/jethac/hermes-sensei.git
cd hermes-sensei
npm install
npm test
npm run validate
npm run serve
```

Open <http://127.0.0.1:4186/>.

For a populated demonstration:

```powershell
npm run seed:demo
npm run serve
```

Then open <http://127.0.0.1:4186/?learner=demo>.

To turn real reading into gap evidence, upload highlighted PNG, JPEG, or WebP pages in the web app, then tell Hermes: “Process my Sensei scan inbox.” Review the proposed spans in Hermes or the web app. You can also attach an image directly to a vision-capable Hermes conversation; the supplied skill records it as a virtual scan batch.

Override paths when the projects are not siblings:

```powershell
$env:SENSEI_TAXONOMY_PATH = "D:\data\os-taxonomy-japanese"
$env:SENSEI_STATE_PATH = "D:\private\sensei-state"
npm run serve
```

## Hermes Agent

Sensei follows Hermes’s narrow-waist guidance: domain capability lives in an external MCP server and an on-demand skill rather than modifying Hermes core.

```powershell
npm run hermes:config
```

Merge the emitted blocks into `~/.hermes/config.yaml`, then run:

```text
hermes mcp test sensei
```

Restart Hermes or use `/reload-mcp`. The skill is available as `/sensei` when the supplied skill directory is configured.

The MCP server exposes nine focused tools:

| Tool | Purpose |
| --- | --- |
| `catalog` | Resolve a natural-language goal to stable capability IDs. |
| `begin_diagnostic` | Create a bounded session and return the first probe. |
| `next_probe` | Return the pending or next high-information probe. |
| `record_evidence` | Persist a conservative evaluation. |
| `analyze_gaps` | Return gaps and a prerequisite-aware remediation queue. |
| `scan_inbox` | List local scan jobs and review status. |
| `inspect_scan` | Return one private scan as an MCP image result. |
| `ingest_highlights` | Store visual/OCR proposals without changing mastery. |
| `review_highlights` | Confirm corrected observations or reject false detections. |

The web app and Hermes use the same deterministic core and learner files. See [Hermes integration](docs/HERMES.md).

## Repository layout

```text
src/core/              Taxonomy import, evidence store, mastery, diagnostics, planning
src/mcp/               Hermes-compatible stdio MCP server
src/web/               Standalone learner UI
src/http.mjs           Local JSON/static HTTP adapter
integrations/hermes/   Skill package and config example
schema/                Versioned learner-state contract
scripts/               Validation, demo seeding, config output
test/                  Core, HTTP, and end-to-end MCP tests
docs/                  Architecture, model, integration, and security decisions
```

## Evidence semantics

- `known`: strong estimate, adequate confidence, and appropriate durability evidence;
- `fragile`: partial knowledge, low confidence, or no production/transfer proof;
- `unknown`: evidence supports a real gap;
- `untested`: measure before prescribing study.

Exam history changes only a prior. Recognition alone cannot establish a broad capability. Kanji/vocabulary evidence can inform a capability estimate without falsely marking the capability as directly tested.

Read [the mastery model](docs/MASTERY_MODEL.md) for the current weighting and status rules.

## Current seed limits

The taxonomy contributes 33 capabilities, 1,001 adult-L2 topics, 1,984 L2 prerequisite edges, 80 populated kanji records, 475 unique vocabulary records, and 105 non-spiral grammar topics. The companion inventories are deliberately incomplete seeds. Confirmed reading highlights extend them with a learner-owned vocabulary, kanji, and grammar inventory rather than pretending the seed is comprehensive.

The current estimator is transparent and tested, but not psychometrically calibrated against a learner population. Agent-evaluated production is only as reliable as its rubric application and should retain evaluator confidence.

## Privacy and deployment

Learner files and uploaded scans live under `.sensei/` by default and are excluded from source control. Scan bytes are signature-checked, size-limited, and addressable only through server-generated IDs; OCR proposals require learner confirmation. The HTTP server binds only to `127.0.0.1` and has no authentication; do not expose it publicly without adding a real security boundary. See [security and privacy](docs/SECURITY.md).

## License

Sensei’s original code and documentation are released under the [MIT License](LICENSE). The upstream taxonomy and its source metadata retain their own provenance and licensing boundaries.
