import { beginDiagnostic, nextProbe, recordProbeEvidence } from './diagnostics.mjs';
import { buildMasterySnapshot } from './mastery.mjs';
import { analyzeLearner } from './remediation.mjs';
import {
  createScan,
  deleteScanOriginal,
  getScanImage,
  ingestHighlights,
  listScanInbox,
  reviewHighlights
} from './scans.mjs';
import { loadLearner, setLearnerContext } from './store.mjs';
import { loadTaxonomy, searchCapabilities } from './taxonomy.mjs';

export async function createSenseiService(options = {}) {
  const taxonomy = await loadTaxonomy({ root: options.taxonomyRoot, fresh: options.freshTaxonomy });
  const storeOptions = options.stateRoot ? { root: options.stateRoot } : {};

  return {
    taxonomy,

    taxonomySummary() {
      return {
        root: taxonomy.root,
        version: taxonomy.version,
        status: taxonomy.status,
        note: taxonomy.note,
        counts: taxonomy.summary,
        assessmentScopeNotes: taxonomy.assessmentScopeNotes
      };
    },

    catalog(input = {}) {
      return searchCapabilities(taxonomy, input);
    },

    async learner(learnerId, { lens = 'none' } = {}) {
      const state = await loadLearner(learnerId, storeOptions);
      return {
        learner: state.learner,
        sessions: state.sessions.map((session) => ({
          id: session.id,
          status: session.status,
          mode: session.mode,
          focus: session.focus ?? 'mixed',
          lens: session.lens,
          answered: session.responses.length,
          total: session.maxProbes,
          createdAt: session.createdAt,
          completedAt: session.completedAt
        })),
        mastery: buildMasterySnapshot(taxonomy, state, { lens })
      };
    },

    setContext(learnerId, context) {
      return setLearnerContext(learnerId, context, storeOptions);
    },

    begin(input) {
      return beginDiagnostic(taxonomy, input, storeOptions);
    },

    next(input) {
      return nextProbe(taxonomy, input, storeOptions);
    },

    record(input) {
      return recordProbeEvidence(taxonomy, input, storeOptions);
    },

    createScan(learnerId, input) {
      return createScan(learnerId, input, storeOptions);
    },

    scanInbox(learnerId, options = {}) {
      return listScanInbox(learnerId, { ...storeOptions, ...options });
    },

    scanImage(learnerId, scanId) {
      return getScanImage(learnerId, scanId, storeOptions);
    },

    deleteScanOriginal(learnerId, scanId) {
      return deleteScanOriginal(learnerId, scanId, storeOptions);
    },

    ingestHighlights(learnerId, input) {
      return ingestHighlights(taxonomy, learnerId, input, storeOptions);
    },

    reviewHighlights(learnerId, decisions) {
      return reviewHighlights(taxonomy, learnerId, decisions, storeOptions);
    },

    async analyze(input) {
      const state = await loadLearner(input.learnerId, storeOptions);
      return analyzeLearner(taxonomy, state, input);
    }
  };
}
