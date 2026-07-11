const copy = {
  en: {
    brandTag: 'Japanese learning diagnostics', learnerContext: 'Learner context', calibrate: 'Calibrate the prior',
    priorExplanation: 'Exam history starts the estimate. It never counts as demonstrated mastery.', name: 'Name',
    declaredJlpt: 'Highest JLPT passed', goal: 'What should become real?', diagnosticMode: 'Diagnostic mode', probes: 'Probes',
    baseline: 'Broad baseline', targeted: 'Targeted', beyondExam: 'Beyond exam', startDiagnostic: 'Start adaptive diagnostic',
    targetCapabilities: 'Target capabilities', clear: 'Clear', localFirst: 'Local-first',
    privacy: 'Learner evidence stays in this Sensei installation.', targetedJapanese: 'Targeted Japanese learning',
    heroTitle: 'Find the smallest thing worth fixing.',
    heroSummary: 'Measure what is real, locate the prerequisite that is actually blocking you, and learn only what changes the outcome.',
    coverageLens: 'Coverage lens', knowledgeMap: 'Knowledge map', capabilities: 'Capabilities', kanji: 'Kanji',
    vocabulary: 'Vocabulary', grammar: 'Grammar', known: 'Known', fragile: 'Fragile', unknown: 'Unknown', untested: 'Untested',
    remediationQueue: 'Remediation queue', nextActions: 'The next actions that change the map', adaptiveProbe: 'Adaptive probe',
    confidence: 'Confidence', evidence: 'Evidence', capability: 'capability', capabilitiesLower: 'capabilities',
    filterPlaceholder: 'Filter this map…', capabilityPlaceholder: 'Search capability…', optional: 'Optional',
    goalPlaceholder: 'e.g. read literary criticism without hiding behind the dictionary', noJlpt: 'Not provided',
    wholeMap: 'Whole capability map', mext: 'MEXT native curriculum', taxonomyReady: 'taxonomy ready',
    planBasisEmpty: 'The queue begins with measurement because no gap should be invented from an exam certificate.',
    planBasisEvidence: 'Prioritised from {count} evidence events and prerequisite impact.',
    noMapMatches: 'Nothing in this layer matches the current filter.', noTargets: 'No explicit targets — Sensei will sample the selected scope.',
    selected: 'selected', add: 'Add', inspect: 'Inspect', mastery: 'mastery',
    probeKnown: 'I could do this', probeFragile: 'Partly / shaky', probeMissed: 'I could not do this', submitAnswer: 'Submit answer',
    nextProbe: 'Next probe', answer: 'Answer', rubric: 'Rubric', completeTitle: 'Calibration complete',
    completeBody: 'The heatmap and remediation queue now reflect the new evidence.', closeAndReview: 'Close and review the map',
    diagnosticStarted: 'Diagnostic started.', evidenceRecorded: 'Evidence recorded.', contextSaved: 'Learner context saved.',
    error: 'Something went wrong', direct: 'direct', supporting: 'supporting', unmeasured: 'unmeasured', none: 'whole map',
    diagnose: 'diagnose', remediate: 'remediate', demonstrates: 'Evidence', noPlan: 'No remediation step is supported yet.',
    readingEvidence: 'Evidence from your reading', scanTitle: 'Turn your highlights into a personal gap map',
    scanSummary: 'Upload pages where you marked unfamiliar language. Hermes proposes the highlighted words and constructions; nothing affects mastery until you confirm it.',
    quizReadingGaps: 'Quiz my confirmed gaps', dropScans: 'Drop highlighted pages here',
    scanFormats: 'PNG, JPEG, or WebP · up to 15 MB each · stored only on this machine', chooseScans: 'Choose images',
    scanInbox: 'Scan inbox', scanInboxEmpty: 'Upload a highlighted page, then ask Hermes to process your Sensei scan inbox.',
    scanInboxPending: 'Ask Hermes: “Process my Sensei scan inbox.”', awaitingHermes: 'Awaiting Hermes', reviewReady: 'Review ready',
    reviewed: 'Reviewed', highlightedItems: '{count} proposed highlights', surface: 'Printed form', reading: 'Reading', contextLabel: 'Sentence context',
    meaning: 'Meaning', kind: 'Kind', confirmGap: 'Yes, I did not know this', ignoreFinding: 'Not my highlight',
    confidenceShort: '{value}% visual confidence', deleteOriginal: 'Delete original image', originalDeleted: 'Original image deleted',
    noOriginal: 'Original removed', scansUploaded: '{count} scan images added.', highlightConfirmed: 'Added to your personal gap map.',
    highlightRejected: 'OCR proposal ignored.', readingQuizStarted: 'Personal gap quiz started.', personal: 'from your reading',
    resolveFirst: 'Review extracted highlights before quizzing them.', grammarConstruction: 'Grammar construction',
    scanUploadError: 'Could not add scan'
  },
  ja: {
    brandTag: '日本語学習診断', learnerContext: '学習者情報', calibrate: '事前推定を調整',
    priorExplanation: '試験歴は推定の出発点です。実証された習得とは見なしません。', name: '名前',
    declaredJlpt: '合格した最高JLPT', goal: '何を実力にしたいですか', diagnosticMode: '診断モード', probes: '問題数',
    baseline: '広範な基準診断', targeted: '目標を絞る', beyondExam: '試験範囲外', startDiagnostic: '適応型診断を始める',
    targetCapabilities: '目標とする能力', clear: 'クリア', localFirst: 'ローカル優先',
    privacy: '学習者の証拠は、このSensei環境内に保存されます。', targetedJapanese: '狙いを定めた日本語学習',
    heroTitle: '直す価値のある、最小の一点を見つける。',
    heroSummary: '実際にできることを測り、本当に妨げている前提を見つけ、結果を変えることだけを学びます。',
    coverageLens: 'カバレッジ表示', knowledgeMap: '知識マップ', capabilities: '能力領域', kanji: '漢字',
    vocabulary: '語彙', grammar: '文法', known: '定着', fragile: '不安定', unknown: '未習得', untested: '未測定',
    remediationQueue: '改善キュー', nextActions: '地図を変える次の行動', adaptiveProbe: '適応型の確認課題',
    confidence: '確信度', evidence: '証拠', capability: '能力領域', capabilitiesLower: '能力領域',
    filterPlaceholder: 'この地図を絞り込む…', capabilityPlaceholder: '能力領域を検索…', optional: '任意',
    goalPlaceholder: '例：辞書に隠れず文芸批評を読む', noJlpt: '未入力', wholeMap: '能力マップ全体', mext: '文科省・母語話者教育課程',
    taxonomyReady: '分類体系を読込済み', planBasisEmpty: '証拠のない弱点を試験資格から作らないため、まず測定から始めます。',
    planBasisEvidence: '{count}件の証拠と前提関係の影響から優先順位を付けています。',
    noMapMatches: '現在の条件に合う項目はありません。', noTargets: '明示的な目標はありません。選択範囲から標本を取ります。',
    selected: '選択中', add: '追加', inspect: '確認', mastery: '習得度',
    probeKnown: 'できた', probeFragile: '一部できた・不安', probeMissed: 'できなかった', submitAnswer: '回答を送る',
    nextProbe: '次の課題', answer: '正答', rubric: '評価基準', completeTitle: '測定が完了しました',
    completeBody: '新しい証拠を反映して、ヒートマップと改善キューを更新しました。', closeAndReview: '閉じて地図を確認',
    diagnosticStarted: '診断を開始しました。', evidenceRecorded: '証拠を記録しました。', contextSaved: '学習者情報を保存しました。',
    error: 'エラーが発生しました', direct: '直接対象', supporting: '補助的', unmeasured: '未測定', none: '全体',
    diagnose: '診断', remediate: '改善', demonstrates: '成功の証拠', noPlan: '現時点で根拠のある改善項目はありません。',
    readingEvidence: '読書から得た証拠', scanTitle: 'ハイライトを自分専用の弱点マップに変える',
    scanSummary: '知らない表現に印を付けたページを追加してください。Hermesが語や文法表現を候補として抽出し、確認するまでは習得度に反映しません。',
    quizReadingGaps: '確認済みの弱点をテスト', dropScans: 'ハイライトしたページをここにドロップ',
    scanFormats: 'PNG・JPEG・WebP、1枚15MBまで。この端末内だけに保存します', chooseScans: '画像を選ぶ',
    scanInbox: 'スキャン受信箱', scanInboxEmpty: 'ページを追加してから、HermesにSenseiのスキャン受信箱を処理するよう頼んでください。',
    scanInboxPending: 'Hermesに「Senseiのスキャン受信箱を処理して」と頼んでください。', awaitingHermes: 'Hermes待ち', reviewReady: '確認待ち',
    reviewed: '確認済み', highlightedItems: '抽出候補：{count}件', surface: '紙面の表記', reading: '読み', contextLabel: '文脈',
    meaning: '意味', kind: '種類', confirmGap: 'はい、これは知らなかった', ignoreFinding: '自分の印ではない',
    confidenceShort: '画像判定の確信度 {value}%', deleteOriginal: '元画像を削除', originalDeleted: '元画像を削除しました',
    noOriginal: '元画像は削除済み', scansUploaded: 'スキャン画像を{count}枚追加しました。', highlightConfirmed: '個人の弱点マップに追加しました。',
    highlightRejected: 'OCR候補を除外しました。', readingQuizStarted: '個人の弱点テストを開始しました。', personal: '読書で発見',
    resolveFirst: '抽出候補を確認してからテストできます。', grammarConstruction: '文法表現',
    scanUploadError: 'スキャンを追加できませんでした'
  }
};

const state = {
  learnerId: new URLSearchParams(location.search).get('learner') || localStorage.getItem('sensei-learner-id') || 'local',
  locale: localStorage.getItem('sensei-locale') || 'en',
  theme: localStorage.getItem('sensei-theme') || 'light',
  lens: localStorage.getItem('sensei-lens') || 'none',
  layer: 'capabilities',
  taxonomy: null,
  learner: null,
  catalog: [],
  targets: new Set(),
  analysis: null,
  scanInbox: { scans: [], findings: [], summary: {} },
  uploadingScans: false,
  sessionId: null,
  probe: null,
  progress: null,
  selectedOption: null,
  mapSearch: ''
};

const els = Object.fromEntries([
  'taxonomyStatus', 'themeToggle', 'learnerForm', 'displayName', 'declaredJlpt', 'goalInput', 'modeSelect', 'probeCount',
  'startDiagnostic', 'capabilitySearch', 'selectedTargets', 'capabilityResults', 'clearTargets', 'lensSelect', 'statusStrip',
  'heatmapTitle', 'mapSearch', 'heatmap', 'planBasis', 'remediationPlan', 'drawerScrim', 'diagnosticDrawer', 'probeProgress',
  'probeContent', 'closeDiagnostic', 'toast', 'scanInput', 'scanDropzone', 'scanInboxCount', 'scanInboxHint', 'scanList',
  'practiceReadingGaps'
].map((id) => [id, document.querySelector(`#${id}`)]));

function t(key, replacements = {}) {
  let value = copy[state.locale]?.[key] ?? copy.en[key] ?? key;
  for (const [name, replacement] of Object.entries(replacements)) value = value.replaceAll(`{${name}}`, replacement);
  return value;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function displayName(item) {
  if (state.locale === 'ja') return item.japaneseName || item.japaneseCapability || item.name || item.capability || item.label;
  return item.name || item.capability || item.label || item.japaneseName;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `${response.status} ${response.statusText}`);
  return payload;
}

async function uploadScan(file) {
  const response = await fetch(`/api/learners/${encodeURIComponent(state.learnerId)}/scans`, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-Sensei-Filename': encodeURIComponent(file.name || 'scan')
    },
    body: file
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `${response.status} ${response.statusText}`);
  return payload;
}

function applyPreferences() {
  document.documentElement.lang = state.locale;
  document.documentElement.dataset.theme = state.theme;
  document.querySelector('meta[name="theme-color"]').content = state.theme === 'dark' ? '#101411' : '#f2efe6';
  document.querySelectorAll('[data-copy]').forEach((element) => {
    const key = element.dataset.copy;
    if (copy[state.locale]?.[key]) element.textContent = t(key);
  });
  document.querySelectorAll('[data-locale]').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.locale === state.locale ? 'true' : 'false');
  });
  els.themeToggle.textContent = state.theme === 'dark' ? '☀' : '☾';
  els.themeToggle.setAttribute('aria-label', state.theme === 'dark' ? 'Use light theme' : 'Use dark theme');
  els.mapSearch.placeholder = t('filterPlaceholder');
  els.capabilitySearch.placeholder = t('capabilityPlaceholder');
  els.displayName.placeholder = t('optional');
  els.goalInput.placeholder = t('goalPlaceholder');
  els.declaredJlpt.options[0].textContent = t('noJlpt');
  els.lensSelect.options[0].textContent = t('wholeMap');
  els.lensSelect.options[els.lensSelect.options.length - 1].textContent = t('mext');
  if (state.taxonomy) els.taxonomyStatus.querySelector('span').textContent = `${state.taxonomy.counts.capabilities} ${t('capabilitiesLower')} · ${t('taxonomyReady')}`;
  localStorage.setItem('sensei-locale', state.locale);
  localStorage.setItem('sensei-theme', state.theme);
  renderAll();
}

function statusClass(status) {
  return `is-${status || 'untested'}`;
}

function formatPercent(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function renderStatus() {
  const summary = state.analysis?.summary;
  if (!summary) return;
  const counts = summary.capabilities;
  const items = [
    ['known', counts.known], ['fragile', counts.fragile], ['unknown', counts.unknown], ['untested', counts.untested],
    ['confidence', formatPercent(summary.capabilityConfidence)]
  ];
  els.statusStrip.innerHTML = items.map(([status, value]) => `
    <div class="statusCard ${status}">
      <span>${escapeHtml(t(status))}</span>
      <strong>${escapeHtml(value)}</strong>
      <i></i>
    </div>
  `).join('');
}

function localizedDomain(domain) {
  const ja = {
    'Script & Orthography': '文字・表記', 'Sound & Listening': '音声・聴解', 'Vocabulary & Meaning': '語彙・意味',
    'Grammar & Structure': '文法・構造', 'Reading & Literature': '読解・文学', 'Writing & Expression': '作文・表現',
    'Speaking & Interaction': '発話・やり取り', 'Pragmatics & Culture': '語用論・文化',
    'Information & Research': '情報・探究', 'Learning & Reflection': '学習・振り返り', 'Workplace & Intercultural': '職場・異文化'
  };
  return state.locale === 'ja' ? ja[domain] ?? domain : domain;
}

function matchesSearch(item) {
  if (!state.mapSearch) return true;
  const haystack = Object.values(item).flat().filter((value) => typeof value === 'string').join(' ').toLowerCase();
  return haystack.includes(state.mapSearch);
}

function renderCapabilityMap(items) {
  const domains = [...new Set(items.map((item) => item.domain))];
  return domains.map((domain) => {
    const domainItems = items.filter((item) => item.domain === domain && matchesSearch(item));
    if (!domainItems.length) return '';
    return `
      <section class="domainGroup">
        <div class="domainGroupHeader"><strong>${escapeHtml(localizedDomain(domain))}</strong><span>${domainItems.length}</span></div>
        <div class="capabilityGrid">
          ${domainItems.map((item) => `
            <button type="button" class="capabilityCell ${statusClass(item.status)}" data-capability-id="${escapeHtml(item.id)}"
              title="${escapeHtml(`${displayName(item)} · ${t(item.status)} · ${formatPercent(item.probability)}`)}">
              <i class="coverageDot ${escapeHtml(item.relation)}"></i>
              <strong>${escapeHtml(displayName(item))}</strong>
              <small>${escapeHtml(state.locale === 'ja' ? item.name : item.japaneseName)}</small>
              <span class="cellMeta">${escapeHtml(formatPercent(item.probability))} · ${escapeHtml(t(item.relation))}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }).join('');
}

function renderKanjiMap(items) {
  const filtered = items.filter(matchesSearch);
  return `<div class="kanjiGrid">${filtered.map((item) => `
    <button type="button" class="kanjiCell ${statusClass(item.status)}" title="${escapeHtml(`${item.character} · ${t(item.status)} · ${formatPercent(item.probability)}${item.flaggedCount ? ` · ${t('personal')}` : ''}`)}">${escapeHtml(item.character)}${item.flaggedCount ? '<i class="personalDot"></i>' : ''}</button>
  `).join('')}</div>`;
}

function renderVocabularyMap(items) {
  const filtered = items.filter(matchesSearch);
  return `<div class="vocabularyGrid">${filtered.map((item) => `
    <button type="button" class="vocabularyCell ${statusClass(item.status)}" title="${escapeHtml(`${item.gloss || item.context || item.lemma} · ${t(item.status)}`)}">
      <strong>${escapeHtml(item.lemma)}</strong><span>${escapeHtml([item.reading, item.gloss].filter(Boolean).join(' · ') || item.context || '')}</span>
      ${item.flaggedCount ? `<span class="sourceBadge">${escapeHtml(t('personal'))} · ${item.flaggedCount}</span>` : ''}
    </button>
  `).join('')}</div>`;
}

function renderGrammarMap(items) {
  const filtered = items.filter(matchesSearch);
  return `<div class="grammarGrid">${filtered.map((item) => `
    <button type="button" class="grammarCell ${statusClass(item.status)}" title="${escapeHtml(`${item.name} · ${t(item.status)}`)}">
      <strong>${escapeHtml(state.locale === 'ja' ? item.japaneseName : item.name)}</strong>
      <span>${escapeHtml(state.locale === 'ja' ? item.name : item.japaneseName)} · ${escapeHtml(item.levelRangeStart || '')}</span>
      ${item.flaggedCount ? `<span class="sourceBadge">${escapeHtml(t('personal'))} · ${item.flaggedCount}</span>` : ''}
    </button>
  `).join('')}</div>`;
}

function renderHeatmap() {
  if (!state.analysis) return;
  const map = state.analysis.heatmap;
  const titles = { capabilities: t('capabilities'), kanji: t('kanji'), vocabulary: t('vocabulary'), grammar: t('grammar') };
  els.heatmapTitle.textContent = titles[state.layer];
  document.querySelectorAll('[data-layer]').forEach((button) => button.setAttribute('aria-selected', button.dataset.layer === state.layer ? 'true' : 'false'));
  const renderers = { capabilities: renderCapabilityMap, kanji: renderKanjiMap, vocabulary: renderVocabularyMap, grammar: renderGrammarMap };
  const markup = renderers[state.layer](map[state.layer]);
  els.heatmap.innerHTML = markup || `<div class="mapEmpty">${escapeHtml(t('noMapMatches'))}</div>`;
}

function renderPlan() {
  if (!state.analysis) return;
  const evidenceCount = state.analysis.summary.evidenceCount;
  els.planBasis.textContent = evidenceCount
    ? t('planBasisEvidence', { count: String(evidenceCount) })
    : t('planBasisEmpty');
  const queue = [
    ...(state.analysis.readingQueue ?? []).map((item) => ({ ...item, displayRank: `R${item.rank}` })),
    ...state.analysis.plan.map((item) => ({ ...item, displayRank: item.rank }))
  ];
  if (!queue.length) {
    els.remediationPlan.innerHTML = `<div class="planEmpty">${escapeHtml(t('noPlan'))}</div>`;
    return;
  }
  els.remediationPlan.innerHTML = queue.map((item) => `
    <article class="planCard ${statusClass(item.status)} ${item.queueType === 'reading-gap' ? 'readingPlanCard' : ''}">
      <div class="planRank">${escapeHtml(item.displayRank)}</div>
      <div class="planMain">
        <strong>${escapeHtml(state.locale === 'ja' ? item.titleJa : item.title)}</strong>
        <span>${escapeHtml(state.locale === 'ja' ? item.whyJa : item.why)}</span>
      </div>
      <div class="planEvidence"><b>${escapeHtml(t('demonstrates'))}:</b> ${escapeHtml(state.locale === 'ja' ? item.successEvidenceJa : item.successEvidence)}</div>
      <div class="planState">
        <span>${escapeHtml(t(item.actionType))}</span>
        <small>${escapeHtml(formatPercent(item.mastery))} ${escapeHtml(t('mastery'))}</small>
      </div>
    </article>
  `).join('');
}

function renderSelectedTargets() {
  const selected = state.catalog.filter((item) => state.targets.has(item.id));
  els.selectedTargets.innerHTML = selected.length
    ? selected.map((item) => `<span class="targetChip">${escapeHtml(displayName(item))}<button type="button" data-remove-target="${escapeHtml(item.id)}">×</button></span>`).join('')
    : `<span class="targetChip">${escapeHtml(t('noTargets'))}</span>`;
}

function renderCapabilityResults() {
  const query = els.capabilitySearch.value.trim().toLowerCase();
  const items = state.catalog.filter((item) => {
    if (state.targets.has(item.id)) return false;
    if (!query) return true;
    return [item.name, item.japaneseName, item.summary, item.summaryJa, item.domain].join(' ').toLowerCase().includes(query);
  }).slice(0, 10);
  els.capabilityResults.innerHTML = items.map((item) => `
    <button type="button" class="capabilityResult" data-add-target="${escapeHtml(item.id)}">
      <strong>${escapeHtml(displayName(item))}</strong><small>${escapeHtml(localizedDomain(item.domain))}</small><b>＋</b>
    </button>
  `).join('');
}

function renderLearner() {
  if (!state.learner) return;
  els.displayName.value = state.learner.displayName || '';
  els.declaredJlpt.value = state.learner.declaredJlpt || '';
  els.goalInput.value = state.learner.goals?.[0] || '';
}

function scanStatusLabel(status) {
  return { pending: t('awaitingHermes'), extracted: t('reviewReady'), reviewed: t('reviewed') }[status] ?? status;
}

function findingKindLabel(kind) {
  return { vocabulary: t('vocabulary'), kanji: t('kanji'), grammar: t('grammarConstruction') }[kind] ?? kind;
}

function renderFinding(finding) {
  const pending = finding.reviewStatus === 'pending';
  const kindOptions = ['vocabulary', 'kanji', 'grammar'].map((kind) => `<option value="${kind}" ${kind === finding.kind ? 'selected' : ''}>${escapeHtml(findingKindLabel(kind))}</option>`).join('');
  return `
    <article class="findingReview is-${escapeHtml(finding.reviewStatus)}" data-finding-id="${escapeHtml(finding.id)}">
      <div class="findingFields">
        <label><span>${escapeHtml(t('kind'))}</span><select data-finding-field="kind" ${pending ? '' : 'disabled'}>${kindOptions}</select></label>
        <label><span>${escapeHtml(t('surface'))}</span><input data-finding-field="surface" value="${escapeHtml(finding.surface)}" ${pending ? '' : 'disabled'}></label>
        <label><span>${escapeHtml(t('reading'))}</span><input data-finding-field="reading" value="${escapeHtml(finding.reading || '')}" ${pending ? '' : 'disabled'}></label>
        <label><span>${escapeHtml(t('meaning'))}</span><input data-finding-field="gloss" value="${escapeHtml(finding.gloss || '')}" ${pending ? '' : 'disabled'}></label>
        <label class="findingContextField"><span>${escapeHtml(t('contextLabel'))}</span><textarea data-finding-field="context" ${pending ? '' : 'disabled'} lang="ja">${escapeHtml(finding.context || '')}</textarea></label>
      </div>
      <div class="findingReviewFooter">
        <span class="findingConfidence">${escapeHtml(t('confidenceShort', { value: String(Math.round((finding.visualConfidence || 0) * 100)) }))}</span>
        ${pending ? `
          <div class="findingActions">
            <button type="button" data-review-decision="reject">${escapeHtml(t('ignoreFinding'))}</button>
            <button type="button" class="confirmFinding" data-review-decision="confirm">${escapeHtml(t('confirmGap'))}</button>
          </div>
        ` : `<span class="findingReviewedLabel">${escapeHtml(finding.reviewStatus === 'confirmed' ? t('highlightConfirmed') : t('highlightRejected'))}</span>`}
      </div>
    </article>`;
}

function renderScanInbox() {
  const inbox = state.scanInbox ?? { scans: [], findings: [], summary: {} };
  els.scanInboxCount.textContent = String(inbox.scans.length || 0);
  const pendingExtraction = inbox.summary?.awaitingExtraction || 0;
  const pendingReview = inbox.summary?.awaitingReview || 0;
  els.scanInboxHint.textContent = pendingReview
    ? t('highlightedItems', { count: String(pendingReview) })
    : pendingExtraction
      ? t('scanInboxPending')
      : t('scanInboxEmpty');
  els.practiceReadingGaps.disabled = !(state.analysis?.summary?.confirmedHighlights > 0);
  els.practiceReadingGaps.title = els.practiceReadingGaps.disabled ? t('resolveFirst') : '';
  els.scanList.innerHTML = inbox.scans.map((scan) => {
    const findings = inbox.findings.filter((finding) => finding.scanId === scan.id);
    const preview = scan.originalAvailable
      ? `<div class="scanPreview"><img loading="lazy" src="/api/learners/${encodeURIComponent(state.learnerId)}/scans/${encodeURIComponent(scan.id)}/image" alt=""><span>${escapeHtml(Math.round(scan.bytes / 1024))} KB</span></div>`
      : `<div class="scanPreview isMissing"><span>${escapeHtml(t('noOriginal'))}</span></div>`;
    return `
      <article class="scanCard" data-scan-id="${escapeHtml(scan.id)}">
        ${preview}
        <div class="scanBody">
          <div class="scanMeta">
            <div><strong>${escapeHtml(scan.filename)}</strong><small>${escapeHtml(new Date(scan.createdAt).toLocaleString(state.locale === 'ja' ? 'ja-JP' : 'en-GB'))} · ${escapeHtml(t('highlightedItems', { count: String(scan.findingCounts.total) }))}</small></div>
            <span class="scanStatus ${escapeHtml(scan.status)}">${escapeHtml(scanStatusLabel(scan.status))}</span>
          </div>
          ${findings.length ? `<div class="findingList">${findings.map(renderFinding).join('')}</div>` : `<p class="scanWaiting">${escapeHtml(t('scanInboxPending'))}</p>`}
          ${scan.originalAvailable ? `<button class="scanPrivacyAction" type="button" data-delete-scan-original="${escapeHtml(scan.id)}">${escapeHtml(t('deleteOriginal'))}</button>` : ''}
        </div>
      </article>`;
  }).join('');
}

function renderAll() {
  renderStatus();
  renderHeatmap();
  renderPlan();
  renderSelectedTargets();
  renderCapabilityResults();
  renderScanInbox();
}

async function refreshAnalysis() {
  const params = new URLSearchParams({ learnerId: state.learnerId, lens: state.lens, mode: els.modeSelect.value, limit: '8' });
  for (const id of state.targets) params.append('targetCapabilityId', id);
  state.analysis = await api(`/api/analysis?${params}`);
  state.learner = state.analysis.learner;
  renderAll();
}

async function refreshScanInbox() {
  state.scanInbox = await api(`/api/learners/${encodeURIComponent(state.learnerId)}/scans`);
  renderScanInbox();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('isVisible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove('isVisible'), 2600);
}

function openDiagnostic() {
  els.diagnosticDrawer.classList.add('isOpen');
  els.diagnosticDrawer.setAttribute('aria-hidden', 'false');
  els.drawerScrim.hidden = false;
}

function closeDiagnostic() {
  els.diagnosticDrawer.classList.remove('isOpen');
  els.diagnosticDrawer.setAttribute('aria-hidden', 'true');
  els.drawerScrim.hidden = true;
}

function probeLabel(type) {
  return { kanji: t('kanji'), vocabulary: t('vocabulary'), grammar: t('grammar'), capability: t('capabilities') }[type] ?? type;
}

function modalityLabel(modality) {
  if (state.locale !== 'ja') return modality;
  return { recognition: '認識', recall: '想起', production: '産出', transfer: '転移' }[modality] ?? modality;
}

function renderProbe() {
  if (!state.probe) {
    els.probeContent.innerHTML = `
      <div class="diagnosticComplete">
        <i>✓</i><h2>${escapeHtml(t('completeTitle'))}</h2><p>${escapeHtml(t('completeBody'))}</p>
        <button id="reviewMap" type="button" class="primaryButton"><span>${escapeHtml(t('closeAndReview'))}</span><b>→</b></button>
      </div>`;
    document.querySelector('#reviewMap').addEventListener('click', closeDiagnostic);
    return;
  }
  const probe = state.probe;
  const options = probe.options?.length ? `
    <div class="probeOptions">${probe.options.map((option) => `<button type="button" class="probeOption" data-probe-option="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join('')}</div>
    <button id="submitOption" type="button" class="primaryButton nextProbeButton" disabled><span>${escapeHtml(t('submitAnswer'))}</span><b>→</b></button>
  ` : `
    <div class="selfRating">
      <button class="ratingButton" type="button" data-score="1">${escapeHtml(t('probeKnown'))}</button>
      <button class="ratingButton" type="button" data-score="0.5">${escapeHtml(t('probeFragile'))}</button>
      <button class="ratingButton" type="button" data-score="0">${escapeHtml(t('probeMissed'))}</button>
    </div>`;
  els.probeProgress.textContent = `${state.progress?.answered ?? 0} / ${state.progress?.total ?? '?'}`;
  els.probeContent.innerHTML = `
    <div>
      <span class="probeType">${escapeHtml(probeLabel(probe.subjectType))} · ${escapeHtml(modalityLabel(probe.modality))}</span>
      <h2>${escapeHtml(state.locale === 'ja' ? probe.titleJa || probe.title : probe.title)}</h2>
      <p class="probePrompt">${escapeHtml(state.locale === 'ja' ? probe.promptJa || probe.prompt : probe.prompt)}</p>
      <p class="probeReason">${escapeHtml(state.locale === 'ja' ? probe.selectionReasonJa || probe.selectionReason : probe.selectionReason)}</p>
      ${options}
    </div>`;
  document.querySelectorAll('[data-score]').forEach((button) => button.addEventListener('click', () => submitEvidence(Number(button.dataset.score))));
  document.querySelectorAll('[data-probe-option]').forEach((button) => button.addEventListener('click', () => {
    state.selectedOption = button.dataset.probeOption;
    document.querySelectorAll('[data-probe-option]').forEach((item) => item.classList.toggle('isSelected', item === button));
    document.querySelector('#submitOption').disabled = false;
  }));
  document.querySelector('#submitOption')?.addEventListener('click', () => submitEvidence(null, state.selectedOption));
}

function renderFeedback(recorded) {
  const feedback = recorded.feedback || {};
  const answer = feedback.answer
    ? `${t('answer')}: ${feedback.answer}${feedback.reading ? `（${feedback.reading}）` : ''}`
    : state.locale === 'ja' ? t('evidenceRecorded') : feedback.rubric;
  els.probeContent.insertAdjacentHTML('beforeend', `
    <div class="probeFeedback">
      <strong>${escapeHtml(recorded.score >= 0.75 ? t('known') : recorded.score >= 0.4 ? t('fragile') : t('unknown'))}</strong>
      <p>${escapeHtml(answer || '')}</p>
      <button id="continueProbe" type="button" class="primaryButton nextProbeButton"><span>${escapeHtml(t('nextProbe'))}</span><b>→</b></button>
    </div>`);
  els.probeContent.querySelectorAll('button:not(#continueProbe)').forEach((button) => { button.disabled = true; });
  document.querySelector('#continueProbe').addEventListener('click', loadNextProbe);
}

async function submitEvidence(score, selectedOption = null) {
  try {
    const recorded = await api('/api/evidence', {
      method: 'POST',
      body: JSON.stringify({
        learnerId: state.learnerId,
        sessionId: state.sessionId,
        probeId: state.probe.id,
        ...(selectedOption ? { selectedOption } : { score }),
        confidence: 0.75,
        evaluatedBy: selectedOption ? 'auto' : 'learner'
      })
    });
    state.progress = recorded.progress;
    renderFeedback(recorded);
    await refreshAnalysis();
    showToast(t('evidenceRecorded'));
  } catch (error) {
    showToast(`${t('error')}: ${error.message}`);
  }
}

async function loadNextProbe() {
  try {
    const next = await api(`/api/diagnostics/${encodeURIComponent(state.sessionId)}/next`, {
      method: 'POST', body: JSON.stringify({ learnerId: state.learnerId })
    });
    state.probe = next.probe;
    state.progress = next.progress;
    state.selectedOption = null;
    renderProbe();
    if (next.status === 'completed') await refreshAnalysis();
  } catch (error) {
    showToast(`${t('error')}: ${error.message}`);
  }
}

async function startDiagnostic(event) {
  event.preventDefault();
  els.startDiagnostic.disabled = true;
  try {
    if (els.modeSelect.value === 'beyond-exam' && state.lens === 'none' && els.declaredJlpt.value) {
      state.lens = `jlpt:${els.declaredJlpt.value}`;
      els.lensSelect.value = state.lens;
      localStorage.setItem('sensei-lens', state.lens);
    }
    const input = {
      learnerId: state.learnerId,
      displayName: els.displayName.value.trim(),
      declaredJlpt: els.declaredJlpt.value || null,
      goals: els.goalInput.value.trim() ? [els.goalInput.value.trim()] : [],
      mode: els.modeSelect.value,
      lens: state.lens,
      targetCapabilityIds: [...state.targets],
      maxProbes: Number(els.probeCount.value)
    };
    const started = await api('/api/diagnostics', { method: 'POST', body: JSON.stringify(input) });
    state.sessionId = started.session.id;
    state.probe = started.probe;
    state.progress = started.progress;
    state.learner = { ...state.learner, displayName: input.displayName, declaredJlpt: input.declaredJlpt, goals: input.goals };
    renderProbe();
    openDiagnostic();
    await refreshAnalysis();
    showToast(t('diagnosticStarted'));
  } catch (error) {
    showToast(`${t('error')}: ${error.message}`);
  } finally {
    els.startDiagnostic.disabled = false;
  }
}

async function handleScanFiles(files) {
  const selected = [...files].filter((file) => file.size > 0);
  if (!selected.length || state.uploadingScans) return;
  state.uploadingScans = true;
  els.scanDropzone.classList.add('isUploading');
  try {
    for (const file of selected) await uploadScan(file);
    await refreshScanInbox();
    showToast(t('scansUploaded', { count: String(selected.length) }));
  } catch (error) {
    showToast(`${t('scanUploadError')}: ${error.message}`);
  } finally {
    state.uploadingScans = false;
    els.scanDropzone.classList.remove('isUploading');
    els.scanInput.value = '';
  }
}

async function reviewFinding(card, decision) {
  const findingId = card.dataset.findingId;
  const values = Object.fromEntries([...card.querySelectorAll('[data-finding-field]')].map((input) => [input.dataset.findingField, input.value.trim()]));
  card.querySelectorAll('button, input, select').forEach((element) => { element.disabled = true; });
  try {
    await api(`/api/learners/${encodeURIComponent(state.learnerId)}/highlights/review`, {
      method: 'POST',
      body: JSON.stringify({ decisions: [{ findingId, decision, ...values }] })
    });
    await Promise.all([refreshScanInbox(), refreshAnalysis()]);
    showToast(decision === 'confirm' ? t('highlightConfirmed') : t('highlightRejected'));
  } catch (error) {
    card.querySelectorAll('button, input, select').forEach((element) => { element.disabled = false; });
    showToast(`${t('error')}: ${error.message}`);
  }
}

async function deleteOriginal(scanId) {
  try {
    await api(`/api/learners/${encodeURIComponent(state.learnerId)}/scans/${encodeURIComponent(scanId)}/image`, { method: 'DELETE' });
    await refreshScanInbox();
    showToast(t('originalDeleted'));
  } catch (error) {
    showToast(`${t('error')}: ${error.message}`);
  }
}

async function startReadingGapQuiz() {
  els.practiceReadingGaps.disabled = true;
  try {
    const started = await api('/api/diagnostics', {
      method: 'POST',
      body: JSON.stringify({
        learnerId: state.learnerId,
        mode: 'baseline',
        focus: 'reading-gaps',
        lens: 'none',
        targetCapabilityIds: [],
        maxProbes: Math.max(4, Math.min(12, state.analysis?.summary?.confirmedHighlights || 4))
      })
    });
    state.sessionId = started.session.id;
    state.probe = started.probe;
    state.progress = started.progress;
    renderProbe();
    openDiagnostic();
    showToast(t('readingQuizStarted'));
  } catch (error) {
    showToast(`${t('error')}: ${error.message}`);
  } finally {
    renderScanInbox();
  }
}

async function initialize() {
  localStorage.setItem('sensei-learner-id', state.learnerId);
  document.documentElement.dataset.theme = state.theme;
  els.lensSelect.value = state.lens;
  try {
    const [taxonomy, catalog, learner, scanInbox] = await Promise.all([
      api('/api/taxonomy'), api('/api/catalog?limit=50'), api(`/api/learners/${state.learnerId}?lens=${encodeURIComponent(state.lens)}`),
      api(`/api/learners/${encodeURIComponent(state.learnerId)}/scans`)
    ]);
    state.taxonomy = taxonomy;
    state.catalog = catalog.matches;
    state.learner = learner.learner;
    state.scanInbox = scanInbox;
    state.targets = new Set(state.learner.targetCapabilityIds ?? []);
    els.taxonomyStatus.classList.add('isReady');
    els.taxonomyStatus.querySelector('span').textContent = `${taxonomy.counts.capabilities} ${t('capabilitiesLower')} · ${t('taxonomyReady')}`;
    renderLearner();
    await refreshAnalysis();
    applyPreferences();
  } catch (error) {
    els.heatmap.innerHTML = `<div class="mapEmpty">${escapeHtml(error.message)}</div>`;
    showToast(`${t('error')}: ${error.message}`);
  }
}

document.querySelectorAll('[data-locale]').forEach((button) => button.addEventListener('click', () => {
  state.locale = button.dataset.locale;
  applyPreferences();
}));
els.themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyPreferences();
});
document.querySelectorAll('[data-layer]').forEach((button) => button.addEventListener('click', () => {
  state.layer = button.dataset.layer;
  renderHeatmap();
}));
els.lensSelect.addEventListener('change', async () => {
  state.lens = els.lensSelect.value;
  localStorage.setItem('sensei-lens', state.lens);
  await refreshAnalysis();
});
els.mapSearch.addEventListener('input', () => {
  state.mapSearch = els.mapSearch.value.trim().toLowerCase();
  renderHeatmap();
});
els.capabilitySearch.addEventListener('input', renderCapabilityResults);
els.capabilityResults.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add-target]');
  if (!button) return;
  state.targets.add(button.dataset.addTarget);
  renderSelectedTargets();
  renderCapabilityResults();
  void refreshAnalysis().catch((error) => showToast(`${t('error')}: ${error.message}`));
});
els.selectedTargets.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-target]');
  if (!button) return;
  state.targets.delete(button.dataset.removeTarget);
  renderSelectedTargets();
  renderCapabilityResults();
  void refreshAnalysis().catch((error) => showToast(`${t('error')}: ${error.message}`));
});
els.clearTargets.addEventListener('click', () => {
  state.targets.clear();
  renderSelectedTargets();
  renderCapabilityResults();
  void refreshAnalysis().catch((error) => showToast(`${t('error')}: ${error.message}`));
});
els.heatmap.addEventListener('click', (event) => {
  const button = event.target.closest('[data-capability-id]');
  if (!button) return;
  state.targets.add(button.dataset.capabilityId);
  renderSelectedTargets();
  renderCapabilityResults();
  showToast(`${displayName(state.catalog.find((item) => item.id === button.dataset.capabilityId))} · ${t('selected')}`);
  void refreshAnalysis().catch((error) => showToast(`${t('error')}: ${error.message}`));
});
els.learnerForm.addEventListener('submit', startDiagnostic);
els.closeDiagnostic.addEventListener('click', closeDiagnostic);
els.drawerScrim.addEventListener('click', closeDiagnostic);
els.scanInput.addEventListener('change', () => void handleScanFiles(els.scanInput.files));
for (const eventName of ['dragenter', 'dragover']) {
  els.scanDropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.scanDropzone.classList.add('isDragging');
  });
}
for (const eventName of ['dragleave', 'drop']) {
  els.scanDropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.scanDropzone.classList.remove('isDragging');
  });
}
els.scanDropzone.addEventListener('drop', (event) => void handleScanFiles(event.dataTransfer.files));
els.scanList.addEventListener('click', (event) => {
  const reviewButton = event.target.closest('[data-review-decision]');
  if (reviewButton) {
    const finding = reviewButton.closest('[data-finding-id]');
    void reviewFinding(finding, reviewButton.dataset.reviewDecision);
    return;
  }
  const deleteButton = event.target.closest('[data-delete-scan-original]');
  if (deleteButton) void deleteOriginal(deleteButton.dataset.deleteScanOriginal);
});
els.practiceReadingGaps.addEventListener('click', () => void startReadingGapQuiz());
window.addEventListener('focus', () => {
  if ((state.scanInbox?.summary?.awaitingExtraction || state.scanInbox?.summary?.awaitingReview) > 0) {
    void refreshScanInbox().catch(() => {});
  }
});

initialize();
