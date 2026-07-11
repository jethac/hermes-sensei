import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

export function taxonomyRoot() {
  return path.resolve(process.env.SENSEI_TAXONOMY_PATH || path.join(projectRoot, '..', 'os-taxonomy-japanese'));
}

export function stateRoot() {
  return path.resolve(process.env.SENSEI_STATE_PATH || path.join(projectRoot, '.sensei'));
}

export function webRoot() {
  return path.join(projectRoot, 'src', 'web');
}
