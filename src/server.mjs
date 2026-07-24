#!/usr/bin/env node
import { createSenseiHttpServer } from './http.mjs';
import { createMasteryClientFromEnvironment } from './core/masteryClient.mjs';

const host = process.env.SENSEI_HOST || '127.0.0.1';
const port = Number(process.env.SENSEI_PORT) || 4186;
const mastery = await createMasteryClientFromEnvironment();
const { server, service } = await createSenseiHttpServer({ mastery });

server.listen(port, host, () => {
  const counts = service.taxonomySummary().counts;
  process.stdout.write(
    `Sensei is listening on http://${host}:${port}\n` +
    `Taxonomy: ${counts.capabilities} capabilities, ${counts.kanji} kanji, ${counts.vocabulary} vocabulary items\n`
  );
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
