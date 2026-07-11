# Hermes Agent integration

Sensei integrates through two official Hermes extension surfaces:

- a local stdio MCP server for structured tools;
- an Agent Skills-compatible Sensei skill for the coaching workflow.

Hermes documents local MCP configuration and external skill directories in its official [MCP guide](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp) and [Skills guide](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills). Its [vision guide](https://hermes-agent.nousresearch.com/docs/user-guide/features/vision) describes direct image attachments and model-dependent multimodal routing. Sensei also returns inbox scans as standard MCP image content.

## Configure

Install dependencies first:

```powershell
cd /path/to/hermes-sensei
npm install
npm run hermes:config
```

Merge the emitted `mcp_servers.sensei` and `skills.external_dirs` keys into `~/.hermes/config.yaml`. An equivalent static example is in `integrations/hermes/config.example.yaml`.

Then verify:

```text
hermes mcp test sensei
```

Restart Hermes or run `/reload-mcp`, then invoke `/sensei` or start a natural request such as:

> I passed N1, but I want to find what I cannot actually do. Run a beyond-exam diagnostic and give me only the first three remediation actions.

## Tool lifecycle

```text
catalog (when a goal needs capability IDs)
  → begin_diagnostic
  → [present learner prompt → record_evidence → next_probe] × N
  → analyze_gaps
```

Highlighted-reading evidence uses a separate review-gated lifecycle:

```text
scan_inbox → inspect_scan → ingest_highlights
  → learner reviews/corrects proposals → review_highlights
  → analyze_gaps → begin_diagnostic(focus: reading-gaps)
```

For a direct Hermes image attachment, omit `scan_inbox` and `inspect_scan`; call `ingest_highlights` without a scan ID after visually identifying the marked spans. In either path, ingestion alone must never change mastery.

The MCP server does not expose resources or prompts, preventing Hermes from registering unnecessary utility wrappers. Mutating calls are not configured for parallel execution because they share a learner evidence file. `inspect_scan` returns text plus an MCP `ImageContent` block; recent Hermes versions cache such image results into its normal media pipeline.

## Verification

The automated suite exercises the stdio server with an MCP client, including binary image results. Once Hermes is installed and configured, `hermes mcp test sensei` exercises Hermes’s own discovery path.
