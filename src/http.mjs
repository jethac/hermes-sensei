import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { URL } from 'node:url';
import { createSenseiService } from './core/service.mjs';
import { webRoot as defaultWebRoot } from './core/paths.mjs';
import { MAX_SCAN_BYTES } from './core/scans.mjs';

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function json(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(body);
}

async function readBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 1_000_000) throw new Error('Request body exceeds 1 MB');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function readBytes(request, limit = MAX_SCAN_BYTES) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > limit) throw new Error(`Request body exceeds ${Math.floor(limit / 1024 / 1024)} MB`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function decodeHeader(value, fallback) {
  if (!value) return fallback;
  try {
    return decodeURIComponent(value);
  } catch {
    return String(value);
  }
}

function learnerRoute(pathname) {
  const match = pathname.match(/^\/api\/learners\/([a-zA-Z0-9][a-zA-Z0-9_-]{0,63})(?:\/(context))?$/);
  return match ? { learnerId: match[1], action: match[2] ?? null } : null;
}

async function serveStatic(response, pathname, webRoot) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolved = path.resolve(webRoot, relative);
  if (!resolved.startsWith(path.resolve(webRoot) + path.sep) && resolved !== path.join(path.resolve(webRoot), 'index.html')) return false;
  try {
    const content = await fs.readFile(resolved);
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(resolved)] ?? 'application/octet-stream',
      'Content-Length': content.length,
      'Cache-Control': pathname === '/' ? 'no-cache' : 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
    });
    response.end(content);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') return false;
    throw error;
  }
}

export async function createSenseiHttpServer(options = {}) {
  const service = options.service ?? await createSenseiService(options);
  const webRoot = options.webRoot ?? defaultWebRoot();
  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
    try {
      if (requestUrl.pathname === '/api/health' && request.method === 'GET') {
        json(response, 200, { ok: true, name: 'sensei', version: '0.2.0', taxonomy: service.taxonomySummary() });
        return;
      }
      if (requestUrl.pathname === '/api/taxonomy' && request.method === 'GET') {
        json(response, 200, service.taxonomySummary());
        return;
      }
      if (requestUrl.pathname === '/api/catalog' && request.method === 'GET') {
        json(response, 200, {
          matches: service.catalog({
            query: requestUrl.searchParams.get('query') ?? '',
            lens: requestUrl.searchParams.get('lens') ?? 'none',
            limit: Number(requestUrl.searchParams.get('limit')) || 50
          })
        });
        return;
      }

      const learner = learnerRoute(requestUrl.pathname);
      if (learner && request.method === 'GET' && !learner.action) {
        json(response, 200, await service.learner(learner.learnerId, { lens: requestUrl.searchParams.get('lens') ?? 'none' }));
        return;
      }
      if (learner?.action === 'context' && ['POST', 'PATCH'].includes(request.method)) {
        json(response, 200, { learner: await service.setContext(learner.learnerId, await readBody(request)) });
        return;
      }

      const scansMatch = requestUrl.pathname.match(/^\/api\/learners\/([a-zA-Z0-9][a-zA-Z0-9_-]{0,63})\/scans$/);
      if (scansMatch && request.method === 'GET') {
        json(response, 200, await service.scanInbox(scansMatch[1], { includeReviewed: requestUrl.searchParams.get('includeReviewed') !== 'false' }));
        return;
      }
      if (scansMatch && request.method === 'POST') {
        if (!request.headers['x-sensei-filename']) throw new Error('Missing X-Sensei-Filename header');
        const data = await readBytes(request);
        const scan = await service.createScan(scansMatch[1], {
          data,
          filename: decodeHeader(request.headers['x-sensei-filename'], 'scan'),
          declaredMimeType: request.headers['content-type'] || ''
        });
        json(response, 201, { scan });
        return;
      }

      const scanImageMatch = requestUrl.pathname.match(/^\/api\/learners\/([a-zA-Z0-9][a-zA-Z0-9_-]{0,63})\/scans\/(scan_[0-9a-f-]{36})\/image$/i);
      if (scanImageMatch && request.method === 'GET') {
        const { scan, data } = await service.scanImage(scanImageMatch[1], scanImageMatch[2]);
        response.writeHead(200, {
          'Content-Type': scan.mimeType,
          'Content-Length': data.length,
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
        });
        response.end(data);
        return;
      }
      if (scanImageMatch && request.method === 'DELETE') {
        json(response, 200, { scan: await service.deleteScanOriginal(scanImageMatch[1], scanImageMatch[2]) });
        return;
      }

      const scanHighlightsMatch = requestUrl.pathname.match(/^\/api\/learners\/([a-zA-Z0-9][a-zA-Z0-9_-]{0,63})\/scans\/(scan_[0-9a-f-]{36})\/highlights$/i);
      if (scanHighlightsMatch && request.method === 'POST') {
        json(response, 201, await service.ingestHighlights(scanHighlightsMatch[1], {
          ...(await readBody(request)),
          scanId: scanHighlightsMatch[2]
        }));
        return;
      }

      const reviewHighlightsMatch = requestUrl.pathname.match(/^\/api\/learners\/([a-zA-Z0-9][a-zA-Z0-9_-]{0,63})\/highlights\/review$/);
      if (reviewHighlightsMatch && request.method === 'POST') {
        const body = await readBody(request);
        json(response, 200, await service.reviewHighlights(reviewHighlightsMatch[1], body.decisions ?? []));
        return;
      }

      if (requestUrl.pathname === '/api/diagnostics' && request.method === 'POST') {
        const input = await readBody(request);
        const session = await service.begin(input);
        const next = await service.next({ learnerId: input.learnerId, sessionId: session.id, includeGradingReference: false });
        json(response, 201, { session: { ...session, probes: [], responses: [] }, ...next });
        return;
      }
      const nextMatch = requestUrl.pathname.match(/^\/api\/diagnostics\/([^/]+)\/next$/);
      if (nextMatch && request.method === 'POST') {
        const input = await readBody(request);
        json(response, 200, await service.next({ learnerId: input.learnerId, sessionId: nextMatch[1], includeGradingReference: false }));
        return;
      }
      if (requestUrl.pathname === '/api/evidence' && request.method === 'POST') {
        json(response, 200, await service.record(await readBody(request)));
        return;
      }
      if (requestUrl.pathname === '/api/analysis' && request.method === 'GET') {
        const targetCapabilityIds = requestUrl.searchParams.getAll('targetCapabilityId');
        json(response, 200, await service.analyze({
          learnerId: requestUrl.searchParams.get('learnerId') || 'local',
          lens: requestUrl.searchParams.get('lens') || 'none',
          mode: requestUrl.searchParams.get('mode') || 'targeted',
          targetCapabilityIds,
          limit: Number(requestUrl.searchParams.get('limit')) || 8
        }));
        return;
      }

      if (request.method === 'GET' && await serveStatic(response, requestUrl.pathname, webRoot)) return;
      json(response, 404, { error: 'Not found' });
    } catch (error) {
      const status = /exceeds \d+ MB/i.test(error.message)
        ? 413
        : /Use a PNG|Unsupported scan MIME|do not match declared type/i.test(error.message)
          ? 415
          : error instanceof SyntaxError || /must be|not found|Missing|cannot load|Invalid|empty|At least|at most|already been reviewed|inbox limit/i.test(error.message)
            ? 400
            : 500;
      json(response, status, { error: error.message });
    }
  });
  return { server, service };
}
