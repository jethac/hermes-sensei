import path from 'node:path';
import { projectRoot } from '../src/core/paths.mjs';

const server = path.join(projectRoot, 'src', 'mcp', 'server.mjs').replaceAll('\\', '/');
const skills = path.join(projectRoot, 'integrations', 'hermes', 'skills').replaceAll('\\', '/');

process.stdout.write(`
# Merge these keys into ~/.hermes/config.yaml.
mcp_servers:
  sensei:
    command: "node"
    args: ["${server}"]
    tools:
      include: [catalog, begin_diagnostic, next_probe, record_evidence, analyze_gaps, scan_inbox, inspect_scan, ingest_highlights, review_highlights]
      prompts: false
      resources: false
    supports_parallel_tool_calls: false

skills:
  external_dirs:
    - "${skills}"

# Then run:
#   hermes mcp test sensei
#   hermes chat --toolsets mcp-sensei,skills
# Or restart Hermes and invoke /sensei.
`);
