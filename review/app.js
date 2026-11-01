'use strict';

const $ = (id) => document.getElementById(id);
const DIMENSIONS = { accuracy: 'Exactitude et couverture', sources: 'Sources et citations', limits: 'Incertitude et limites', clarity: 'Clarté et utilité' };
const CATEGORIES = { precise: 'Question précise', semantic: 'Reformulation', transversal: 'Synthèse', conversation: 'Suivi de conversation', insufficient: 'Information insuffisante', adversarial: 'Demande de fabrication' };
const KINDS = { fact: 'Fait', interpretation: 'Interprétation', structure: 'Structure', resolution: 'Résolution du contexte', limitation: 'Limite', clarification: 'Clarification', refusal: 'Refus' };
const BLOCKS = { answer: '', explanation: 'Comprendre', comparison: 'Comparer', benefits: 'Avantages attendus', limits: 'Limites', quote: 'Extrait exact' };
const state = { session: null, selected: 'CH2-038', run: 'initial', drafts: {}, compare: false, sources: 'cited', sourceHost: null, sourceDisclosure: null };
let toastTimer;

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}
function append(parent, ...children) { children.filter(Boolean).forEach(child => parent.append(child)); return parent; }
function button(text, cls, handler) {
  const node = el('button', cls, text); node.type = 'button'; node.addEventListener('click', handler); return node;
}
function disclosure(title, cls = '') {
  const details = el('details', `disclosure ${cls}`.trim()); details.append(el('summary', '', title)); return details;
}
function link(text, href) {
  const node = el('a', '', text);
  try {
    const url = new URL(href, location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return el('span', '', text);
    node.href = url.href; node.target = '_blank'; node.rel = 'noreferrer';
  } catch { return el('span', '', text); }
  return node;
}
function error(message) { $('error').textContent = message; $('error').hidden = !message; }
function toast(message) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5000);
}
function key(caseId = state.selected, run = state.run) { return `${caseId}:${run}`; }
function current() { return state.session.cases.find(c => c.id === state.selected); }
function storageKey() { return `chati-human-review:${state.session.session_id}`; }
function blankReview(c, run) {
  let reviewer = ''; try { reviewer = localStorage.getItem('chati-reviewer-name') || ''; } catch {}
  return { session_id: state.session.session_id, case_id: c.id, run, state: 'draft', reviewer,
    scores: Object.fromEntries(Object.keys(DIMENSIONS).map(d => [d, null])),
    dimension_reasons: Object.fromEntries(Object.keys(DIMENSIONS).map(d => [d, ''])),
    criteria: Object.fromEntries(c.reference.criteria.map(criterion => [criterion.id, { coverage: null, reason: '', excerpt: '' }])),
    conditions: Object.fromEntries(c.reference.conditional_expectations.map(condition => [condition.when, { active: '', coverage: null, reason: '', excerpt: '' }])),
    critical_error: '', false_absence: '', verdict: '', notes: '', override_reason: '', touched: false };
}
function draft(c = current(), run = state.run) {
  const id = key(c.id, run);
  if (!state.drafts[id]) state.drafts[id] = blankReview(c, run);
  return state.drafts[id];
}
function persist() {
  try { localStorage.setItem(storageKey(), JSON.stringify(state.drafts)); }
  catch { error('L’enregistrement navigateur est indisponible. Utilisez « Enregistrer le brouillon » ou exportez vos notes.'); }
}
function changed(review) {
  review.state = 'draft'; review.touched = true; review.client_updated_at = new Date().toISOString();
  persist(); updateProgress(); updateScore();
  const label = $('save-status'); if (label) label.textContent = 'Brouillon conservé dans ce navigateur. Pensez à l’enregistrer sur le serveur ou à l’exporter.';
}
function updateProgress() {
  const initial = Object.values(state.drafts).filter(r => r.run === 'initial' && r.state === 'final');
  const drafts = Object.values(state.drafts).filter(r => r.state === 'draft' && (r.touched || r.updated_at));
  $('progress-label').textContent = `${initial.length} / ${state.session.cases.length} relus`;
  $('draft-count').textContent = drafts.length ? `${drafts.length} brouillon${drafts.length > 1 ? 's' : ''}` : '';
  $('progress').max = state.session.cases.length; $('progress').value = initial.length;
  document.querySelectorAll('[data-case-indicator]').forEach(node => {
    const item = state.drafts[key(node.dataset.caseIndicator, 'initial')];
    node.className = `case-indicator ${item?.state === 'final' ? 'final' : item?.touched || item?.updated_at ? 'draft' : ''}`;
  });
}
function normalized(text) { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase(); }

function renderNavigation() {
  const nav = $('case-list'); nav.replaceChildren();
  const query = normalized($('case-search').value.trim());
  for (const group of ['focus', 'sample']) {
    const cases = state.session.cases.filter(c => c.group === group && normalized(c.id + ' ' + c.question + ' ' + CATEGORIES[c.category]).includes(query));
    if (!cases.length) continue;
    append(nav, el('div', 'nav-heading', `${group === 'focus' ? 'CAS À CONFIRMER' : 'ÉCHANTILLON DE CONTRÔLE'} · ${cases.length}`));
    for (const c of cases) {
      const indicator = el('span', 'case-indicator'); indicator.dataset.caseIndicator = c.id; indicator.setAttribute('aria-hidden', 'true');
      const body = append(el('span'), el('strong', '', c.id), el('small', '', c.question.slice(0, 90) + (c.question.length > 90 ? '…' : '')));
      const node = button('', `case-button ${state.selected === c.id ? 'active' : ''}`, () => selectCase(c.id));
      node.setAttribute('aria-current', state.selected === c.id ? 'true' : 'false'); append(node, indicator, body); nav.append(node);
    }
  }
  updateProgress();
}
function selectCase(id) {
  state.selected = id; state.sources = 'cited'; renderNavigation(); renderCase();
  if (innerWidth < 651) $('reading').scrollIntoView({ block: 'start' });
}

function sourceCard(source, prefix = 'source') {
  const card = el('article', 'source-card'); card.id = `${prefix}-${source.id}-${state.run}`;
  append(card, el('h4', '', `${source.id} · ${source.subsection}`),
    el('div', 'source-meta', `${source.type === 'mesure' ? 'MESURE' : 'ANNEXE'} · ${source.section} · PDF p. ${source.pages.join(', ')}`),
    el('blockquote', '', source.text), append(el('div', 'source-links'), link('Ouvrir le PDF à cette page ↗', source.pdf_url), link('Texte publié ↗', source.source_url)));
  return card;
}
function showSource(identifier, run = state.run) {
  if (run !== state.run) { state.run = run; renderCase(); }
  if (!state.sourceHost) return;
  const answer = current().responses[state.run].answer;
  state.sources = answer.sources.some(s => s.id === identifier) ? 'cited' : 'context';
  state.sourceDisclosure.open = true; renderSources();
  const target = document.getElementById(`source-${identifier}-${state.run}`);
  if (target) {
    target.classList.add('highlight'); target.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    setTimeout(() => target.classList.remove('highlight'), 2500);
  }
}
function answerContent(answer, small = false, run = state.run) {
  const content = el('div');
  for (const block of answer.blocks) {
    const node = el('section', `answer-block block-${block.kind}`);
    if (BLOCKS[block.kind]) node.append(el('h4', '', BLOCKS[block.kind]));
    node.append(el('p', 'answer-text', block.text));
    const citations = el('div', 'citations');
    for (const id of block.source_ids) {
      const cite = button(`${answer.sources.findIndex(s => s.id === id) + 1} · ${id}`, 'citation', () => showSource(id, run));
      cite.setAttribute('aria-label', `Lire la source ${id}`); citations.append(cite);
    }
    node.append(citations); content.append(node);
  }
  if (answer.measures.length) {
    const details = disclosure(`Les fiches font aussi partie de la réponse · ${answer.measures.length}`);
    details.open = !small;
    for (const measure of answer.measures) {
      const article = el('article', 'measure-card');
      append(article, el('h4', '', measure.id), el('p', 'measure-text', measure.explanation));
      if (measure.expected_benefit) append(article, el('p', 'measure-text', measure.expected_benefit), el('p', 'basis', `Origine affichée : ${measure.benefit_basis === 'analysis' ? 'interprétation' : measure.benefit_basis === 'explicit_text' ? 'texte explicite' : measure.benefit_basis}`));
      details.append(article);
    }
    content.append(details);
  }
  if (answer.not_found?.length) {
    const missing = disclosure('Informations signalées comme non retrouvées');
    for (const text of answer.not_found) missing.append(el('p', 'small', text));
    content.append(missing);
  }
  return content;
}

function renderSources() {
  const host = state.sourceHost; if (!host) return;
  host.replaceChildren();
  const c = current(); const answer = c.responses[state.run].answer;
  const filters = el('div', 'source-filter');
  const modes = { cited: 'Sources citées', expected: 'Preuves du corrigé', context: 'Tout le contexte retrouvé' };
  for (const [name, label] of Object.entries(modes)) {
    const node = button(label, '', () => { state.sources = name; renderSources(); });
    node.setAttribute('aria-pressed', String(state.sources === name)); filters.append(node);
  }
  host.append(filters);
  if (state.sources === 'expected') host.append(el('p', 'small', 'Le corrigé est un guide de notation. Les sources facultatives ne sont pas toutes obligatoires ; une autre preuve véritablement équivalente peut être recevable.'));
  const sources = state.sources === 'cited' ? answer.sources : state.sources === 'context' ? c.responses[state.run].context_sources
    : c.reference.evidence.map(e => state.session.corpus_sources.find(s => s.id === e.id));
  host.append(el('p', 'small', `${sources.length} passage${sources.length > 1 ? 's' : ''} · ${state.sources === 'context' ? 'Ce sont les passages réellement fournis à ce run.' : 'Texte source exact, sans réécriture des alias.'}`));
  for (const source of sources) if (source) {
    const card = sourceCard(source);
    if (state.sources === 'expected' && c.reference.optional_ids.includes(source.id)) card.prepend(el('p', 'basis', 'Complément facultatif, branche conditionnelle ou contexte d’historique'));
    host.append(card);
  }
}

function referencePanel(c) {
  const details = disclosure('Afficher le corrigé, ses conditions et ses pièges');
  details.append(el('p', 'small', 'Lisez la réponse avant de l’ouvrir, si possible. Les formulations équivalentes sont acceptées ; le corrigé n’est pas une phrase à reproduire mot pour mot.'));
  append(details, el('p', 'reference-answer', c.reference.reference_answer));
  const list = el('ol', 'criterion-list');
  for (const criterion of c.reference.criteria) list.append(el('li', '', `${criterion.id} · ${KINDS[criterion.kind]} : ${criterion.text}`));
  details.append(list);
  if (c.reference.conditional_expectations.length) {
    details.append(el('h4', '', 'Seulement si la branche est développée'));
    for (const condition of c.reference.conditional_expectations) details.append(el('p', 'small', condition.expectations.join(' ')));
  }
  details.append(el('h4', '', 'Erreurs à éviter'));
  const traps = el('ul', 'criterion-list'); c.reference.must_not_claim.forEach(text => traps.append(el('li', '', text))); details.append(traps);
  if (c.reference.review_notes) details.append(el('p', 'warning-note', c.reference.review_notes));
  if (c.reference.absence_check) details.append(el('p', 'small', `Contrôle d’absence : ${c.reference.absence_check.finding}`));
  return details;
}
function machinePanel(c) {
  const details = disclosure('Révéler l’analyse machine et l’arbitrage', 'machine');
  details.append(el('p', 'small', 'À consulter idéalement après votre propre appréciation. Ce ne sont pas des annotations humaines. Les deux runs ont été notés sur les 40 cas, par des juges différents.'));
  for (const run of state.session.run_order) {
    const assessment = c.machine_assessments[run];
    details.append(el('h4', '', state.session.runs[run].label));
    if (!assessment) { details.append(el('p', '', 'Aucune nouvelle note sémantique calculée pour cette réponse du second passage.')); continue; }
    details.append(el('p', '', `${Object.entries(DIMENSIONS).map(([key, label], i) => `${label} : ${assessment.scores[i] === null ? 'N/A' : assessment.scores[i]}/2`).join(' · ')}`));
    details.append(el('p', '', assessment.notes));
    const list = el('ul', 'criterion-list');
    for (const point of assessment.criteria_evidence || []) list.append(el('li', '', `${point.id} : ${point.coverage} — « ${point.answer_excerpt} »${point.reason ? ' · ' + point.reason : ''}`));
    details.append(list);
  }
  if (c.arbitration) {
    details.append(el('h4', '', 'Arbitrage Codex de CH2-038 — premier passage'));
    details.append(el('p', '', `Décision : validé mais incomplet, ${c.arbitration.score}/100, sans erreur critique certaine.`));
    details.append(el('p', '', c.arbitration.reason));
    details.append(el('p', '', `Ce qui changerait le verdict : ${c.arbitration.what_would_be_critical}`));
    details.append(el('p', 'warning-note', 'Vous pouvez contester cet arbitrage dans vos notes. Votre jugement ne sera pas remplacé par cette analyse.'));
  }
  return details;
}

function fieldLabel(text, node) {
  const label = el('label', '', text); label.htmlFor = node.id; return label;
}
function textarea(id, value, onInput, placeholder = '') {
  const input = el('textarea'); input.id = id; input.value = value; input.placeholder = placeholder; input.maxLength = 12000;
  input.addEventListener('input', () => onInput(input.value)); return input;
}
function choices(values, selected, onChange, label) {
  const row = el('div', 'score-row'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', label);
  for (const [value, text] of values) {
    const node = button(text, 'score-choice', () => {
      [...row.children].forEach(child => child.setAttribute('aria-pressed', 'false'));
      node.setAttribute('aria-pressed', 'true'); onChange(value);
    });
    node.setAttribute('aria-pressed', String(selected === value)); row.append(node);
  }
  return row;
}
function select(id, options, value, onChange) {
  const input = el('select'); input.id = id;
  for (const [key, label] of options) { const option = el('option', '', label); option.value = key; input.append(option); }
  input.value = value; input.addEventListener('change', () => onChange(input.value)); return input;
}
function updateScore() {
  const host = $('score-preview'); if (!host || !state.session) return;
  const review = draft();
  const values = Object.values(review.scores).filter(value => value !== 'na');
  if (!values.length || values.some(value => value === null)) { host.textContent = 'Aucune note préremplie. Le calcul apparaîtra quand les dimensions seront renseignées.'; return; }
  const score = 100 * values.reduce((sum, value) => sum + value, 0) / (2 * values.length);
  const known = ['critical_error', 'false_absence'].every(flag => ['yes', 'no'].includes(review[flag]));
  const passed = score >= 75 && review.scores.accuracy >= 1 && (review.scores.sources === 'na' || review.scores.sources >= 1) && review.critical_error === 'no' && review.false_absence === 'no';
  host.textContent = `Calcul de la grille : ${score.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}/100. ${known ? passed ? 'Seuil technique atteint.' : 'Une condition de validation n’est pas remplie.' : 'Examinez aussi les erreurs critiques et les absences injustifiées.'} Votre verdict et vos justifications restent nécessaires.`;
}

function annotationForm(c) {
  const review = draft(c); const panel = el('aside', 'annotation');
  append(panel, el('h3', '', 'Votre relecture'), el('p', 'annotation-intro', `${state.session.runs[state.run].label} · ${c.id}. Commencez librement ; enregistrez un brouillon, puis finalisez lorsque votre jugement est étayé.`));
  const form = el('form'); form.addEventListener('submit', event => { event.preventDefault(); saveReview(c, review, 'draft'); });
  const reviewer = el('input'); reviewer.id = 'reviewer'; reviewer.value = review.reviewer; reviewer.maxLength = 12000; reviewer.placeholder = 'Prénom ou initiales, facultatif';
  reviewer.addEventListener('input', () => { review.reviewer = reviewer.value; try { localStorage.setItem('chati-reviewer-name', reviewer.value); } catch {} changed(review); });
  append(form, fieldLabel('Relecteur ou relectrice', reviewer), reviewer);
  for (const [dimension, label] of Object.entries(DIMENSIONS)) {
    const fieldset = el('fieldset'); fieldset.append(el('legend', '', label));
    const values = [[0, '0'], [1, '1'], [2, '2']]; if (dimension === 'sources') values.push(['na', 'N/A']);
    fieldset.append(choices(values, review.scores[dimension], value => { review.scores[dimension] = value; changed(review); }, `Note : ${label}`));
    const reason = textarea(`reason-${dimension}`, review.dimension_reasons[dimension], value => { review.dimension_reasons[dimension] = value; changed(review); }, 'Ce qui justifie cette note, précisément…');
    append(fieldset, fieldLabel(`Justification — ${label}`, reason), reason); form.append(fieldset);
  }
  const criteria = el('details', 'judgment-details'); criteria.append(el('summary', '', `Examiner les ${c.reference.criteria.length} critères du corrigé`));
  criteria.append(el('p', 'small', 'Cette section révèle les attentes. Pour finaliser, chaque critère demande une couverture, un extrait continu de la réponse et une raison. 0 : absent/incorrect ; 0,5 : partiel ; 1 : complet.'));
  for (const criterion of c.reference.criteria) {
    const judgment = review.criteria[criterion.id]; const item = el('section', 'criterion-form');
    append(item, el('span', 'criterion-type', KINDS[criterion.kind]), el('h4', '', `${criterion.id} · ${criterion.text}`),
      choices([[0, '0'], [0.5, '0,5'], [1, '1']], judgment.coverage, value => { judgment.coverage = value; changed(review); }, `Couverture de ${criterion.id}`));
    const excerpt = textarea(`${criterion.id}-excerpt`, judgment.excerpt, value => { judgment.excerpt = value; changed(review); }, 'Copier un extrait de la réponse, fiches comprises…');
    const reason = textarea(`${criterion.id}-reason`, judgment.reason, value => { judgment.reason = value; changed(review); }, 'Pourquoi cet extrait satisfait ou manque le critère…');
    append(item, fieldLabel('Extrait de la réponse', excerpt), excerpt, fieldLabel('Justification du critère', reason), reason); criteria.append(item);
  }
  for (const condition of c.reference.conditional_expectations) {
    const judgment = review.conditions[condition.when]; const item = el('section', 'criterion-form');
    append(item, el('span', 'criterion-type', 'Branche conditionnelle'), el('h4', '', condition.expectations.join(' ')));
    const active = select(`${condition.when}-active`, [['', 'Branche non examinée'], ['yes', 'La réponse développe cette branche'], ['no', 'La réponse ne développe pas cette branche'], ['unsure', 'Je ne sais pas']], judgment.active, value => { judgment.active = value; changed(review); });
    append(item, fieldLabel('Cette attente s’applique-t-elle ?', active), active,
      choices([[0, '0'], [0.5, '0,5'], [1, '1']], judgment.coverage, value => { judgment.coverage = value; changed(review); }, `Couverture de ${condition.when}`));
    const excerpt = textarea(`${condition.when}-excerpt`, judgment.excerpt, value => { judgment.excerpt = value; changed(review); });
    const reason = textarea(`${condition.when}-reason`, judgment.reason, value => { judgment.reason = value; changed(review); });
    append(item, fieldLabel('Extrait, si la branche est développée', excerpt), excerpt, fieldLabel('Justification de votre choix', reason), reason); criteria.append(item);
  }
  form.append(criteria);
  for (const [flag, label] of [['critical_error', 'Erreur critique ?'], ['false_absence', 'Absence ou abstention injustifiée ?']]) {
    const control = select(flag, [['', 'À examiner'], ['no', 'Non'], ['yes', 'Oui'], ['unsure', 'Incertain']], review[flag], value => { review[flag] = value; changed(review); });
    append(form, fieldLabel(label, control), control);
  }
  form.append(el('p', 'small', 'Critique : preuve/chiffre fabriqués, inversion certaine, droit inventé ou effet garanti. Absence injustifiée : la réponse ne trouve pas un volet demandé alors que le corpus le contient.'));
  const verdict = select('verdict', [['', 'Choisir votre verdict'], ['valid', 'Conforme à la grille'], ['invalid', 'À corriger / non conforme'], ['uncertain', 'Je ne peux pas trancher']], review.verdict, value => { review.verdict = value; changed(review); });
  append(form, fieldLabel('Votre verdict', verdict), verdict);
  const notes = textarea('review-notes', review.notes, value => { review.notes = value; changed(review); }, 'Le passage précis, le problème ou la réserve que vous retenez…');
  append(form, fieldLabel('Justification et remarques', notes), notes);
  const override = textarea('override-reason', review.override_reason, value => { review.override_reason = value; changed(review); }, 'Facultatif, sauf si votre verdict diffère du calcul de la grille.');
  append(form, fieldLabel('Arbitrage différent de la grille', override), override);
  const preview = el('p', 'score-preview'); preview.id = 'score-preview'; form.append(preview);
  const localError = el('p', 'warning-note'); localError.id = 'form-error'; localError.hidden = true; localError.setAttribute('role', 'alert'); form.append(localError);
  const actions = el('div', 'form-actions');
  const save = el('button', 'button subtle', 'Enregistrer le brouillon'); save.type = 'submit';
  append(actions, save, button('Finaliser ma relecture', 'button', () => saveReview(c, review, 'final'))); form.append(actions);
  const status = el('p', 'save-status'); status.id = 'save-status';
  status.textContent = review.state === 'final' ? 'Relecture finalisée et conservée. Toute nouvelle modification redevient un brouillon.' : review.updated_at ? 'Brouillon enregistré sur le serveur local.' : 'Aucune note humaine enregistrée pour cette réponse.';
  form.append(status); panel.append(form); return panel;
}

async function saveReview(c, review, mode) {
  const localError = $('form-error'); localError.hidden = true;
  const payload = { ...review, state: mode }; const capturedTime = review.client_updated_at;
  const buttons = document.querySelectorAll('.form-actions button'); buttons.forEach(node => { node.disabled = true; });
  try {
    const response = await fetch('/api/annotations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
    if (state.drafts[key(c.id, review.run)]?.client_updated_at === capturedTime) {
      state.drafts[key(c.id, review.run)] = { ...data.review, touched: true, client_updated_at: data.review.updated_at };
      persist();
      if (c.id === state.selected && review.run === state.run) renderCase();
    }
    updateProgress(); toast(mode === 'final' ? 'Votre relecture est finalisée et enregistrée.' : 'Brouillon enregistré sur le serveur local.');
  } catch (exception) {
    localError.textContent = exception.message; localError.hidden = false; toast('Vos notes restent dans le navigateur ; vous pouvez les exporter.');
  } finally { buttons.forEach(node => { node.disabled = false; }); }
}

function renderCase() {
  const c = current(); const host = $('case-view'); host.replaceChildren();
  const header = el('div', 'case-header');
  append(header, append(el('div'), el('span', 'eyebrow', c.group === 'focus' ? 'CAS À CONFIRMER' : 'ÉCHANTILLON DE CONTRÔLE'), el('h2', 'case-title', c.id), el('p', 'category', CATEGORIES[c.category])));
  const order = state.session.cases.map(item => item.id); const index = order.indexOf(c.id); const controls = el('div', 'case-nav-buttons');
  const previous = button('←', 'icon-button', () => selectCase(order[index - 1])); previous.disabled = index === 0; previous.setAttribute('aria-label', 'Cas précédent');
  const next = button('→', 'icon-button', () => selectCase(order[index + 1])); next.disabled = index === order.length - 1; next.setAttribute('aria-label', 'Cas suivant'); append(controls, previous, next); append(header, controls); host.append(header);
  const question = append(el('section', 'question-card'), el('h3', '', 'LA QUESTION POSÉE À CHATI'), el('p', 'question-text', c.question));
  if (c.messages.length > 1) {
    const history = el('details', 'history'); history.open = true; history.append(el('summary', '', 'Historique fourni avant cette question'));
    for (const message of c.messages.slice(0, -1)) history.append(append(el('div', 'history-message'), el('b', '', message.role === 'user' ? 'Utilisateur : ' : 'Assistant : '), el('span', '', message.content)));
    question.append(history);
  }
  host.append(question);
  const toolbar = el('div', 'run-toolbar'); const tabs = el('div', 'run-tabs');
  for (const run of state.session.run_order) {
    const node = button(state.session.runs[run].label, 'run-tab', () => { state.run = run; state.sources = 'cited'; renderCase(); });
    node.setAttribute('aria-pressed', String(state.run === run)); tabs.append(node);
  }
  const compareLabel = el('label', 'checkbox-label'); const compare = el('input'); compare.type = 'checkbox'; compare.checked = state.compare;
  compare.addEventListener('change', () => { state.compare = compare.checked; renderCase(); }); append(compareLabel, compare, el('span', '', 'Comparer les deux réponses')); append(toolbar, tabs, compareLabel); host.append(toolbar);
  const grid = el('div', 'review-grid'); const reader = el('section', 'response-panel');
  if (state.compare) {
    const comparison = el('div', 'compare-grid');
    for (const run of state.session.run_order) {
      const column = el('section'); append(column, el('h3', 'response-heading', state.session.runs[run].label), answerContent(c.responses[run].answer, true, run)); comparison.append(column);
    }
    reader.append(comparison); reader.append(el('p', 'small', 'Les citations ci-dessous et le formulaire concernent le passage sélectionné. Sélectionnez l’autre passage pour noter sa réponse et lire son contexte propre.'));
  } else {
    append(reader, append(el('h3', 'response-heading'), el('span', 'mini-logo', 'C.'), el('span', '', 'Chati'), el('small', '', state.session.runs[state.run].label)), answerContent(c.responses[state.run].answer));
  }
  state.sourceDisclosure = disclosure('Lire les sources et le contexte réellement retrouvé');
  state.sourceHost = el('div'); state.sourceDisclosure.append(state.sourceHost); reader.append(state.sourceDisclosure); renderSources();
  append(reader, referencePanel(c), machinePanel(c));
  const provenance = disclosure('Configuration et traçabilité');
  const runMeta = state.session.runs[state.run];
  provenance.append(el('p', 'small', `${runMeta.id} · ${runMeta.configuration.model} · recherche ${runMeta.configuration.retrieval_mode} · contexte ${runMeta.configuration.context_mode} · ${runMeta.configuration.retrieval_count} passages demandés · web désactivé pour ce run.`));
  provenance.append(el('p', 'small', `Empreinte des réponses brutes : ${runMeta.responses_sha256}`));
  state.session.comparability.limitations.forEach(text => provenance.append(el('p', 'small', text))); reader.append(provenance);
  reader.append(el('p', 'end-note', 'Atelier local séparé du chat. Aucun message n’est envoyé à un modèle. Les verdicts humains sont enregistrés dans un fichier distinct des réponses et des audits automatiques.'));
  append(grid, reader, annotationForm(c)); host.append(grid); updateScore();
}

function corpusResults() {
  const query = normalized($('corpus-search').value.trim()); const host = $('corpus-results'); host.replaceChildren();
  if (query.length < 2) { $('corpus-count').textContent = 'Saisissez au moins deux caractères. Les textes restent sur ce serveur local.'; return; }
  const results = state.session.corpus_sources.filter(s => normalized(s.id + ' ' + s.section + ' ' + s.subsection + ' ' + s.text).includes(query));
  $('corpus-count').textContent = `${results.length} résultat${results.length > 1 ? 's' : ''} dans ${state.session.corpus_sources.length} passages. ${results.length > 30 ? 'Les 30 premiers sont affichés ; précisez votre recherche.' : ''}`;
  results.slice(0, 30).forEach(source => host.append(sourceCard(source, 'global')));
}
function exportNotes() {
  const reviews = Object.values(state.drafts).filter(review => review.touched || review.updated_at);
  const output = { schema_version: 1, session_id: state.session.session_id, exported_at: new Date().toISOString(),
    run_provenance: state.session.runs, selection: state.session.selection, corpus: state.session.corpus_metadata,
    warning: 'Drafts are not finalized human judgments. No machine scores have been used to prefill these reviews.',
    reviews: reviews.map(review => ({ ...review, response_sha256: state.session.cases.find(c => c.id === review.case_id).responses[review.run].raw_response_sha256 })) };
  const blob = new Blob([JSON.stringify(output, null, 2) + '\n'], { type: 'application/json' }); const url = URL.createObjectURL(blob);
  const download = el('a'); download.href = url; download.download = `chati-relectures-${state.session.session_id.slice(0, 8)}.json`; download.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`${reviews.length} note${reviews.length > 1 ? 's' : ''} exportée${reviews.length > 1 ? 's' : ''}, avec leur statut brouillon/final.`);
}

async function boot() {
  const response = await fetch('/api/session'); if (!response.ok) throw new Error('Le dossier de relecture ne peut pas être chargé.');
  state.session = await response.json();
  try {
    const local = JSON.parse(localStorage.getItem(storageKey()) || '{}');
    for (const [id, review] of Object.entries(local)) if (review.session_id === state.session.session_id && state.session.cases.some(c => c.id === review.case_id) && state.session.run_order.includes(review.run)) state.drafts[id] = review;
  } catch { error('Les brouillons du navigateur ne sont pas accessibles. Les notes enregistrées sur le serveur restent disponibles.'); }
  try {
    const savedResponse = await fetch('/api/annotations'); const saved = await savedResponse.json(); if (!savedResponse.ok) throw new Error(saved.error);
    for (const review of saved.reviews) {
      const id = key(review.case_id, review.run); const local = state.drafts[id];
      if (!local || (local.client_updated_at || local.updated_at || '') <= review.updated_at) state.drafts[id] = review;
    }
  } catch (exception) { error(`Chargement des notes serveur : ${exception.message}. Les réponses restent consultables et vos notes sont exportables.`); }
  $('selection-method').textContent = 'Huit réponses notées 100/100 et complètes au premier run, sélectionnées par tirage déterministe stratifié : deux précises, une reformulation, deux synthèses, un suivi, une limite et un refus. Quatre cas incomplets sont ajoutés pour comparaison. Le second run n’influence pas cette sélection.';
  state.session.guidance.forEach(text => $('guidance').append(el('li', '', text)));
  $('case-search').addEventListener('input', renderNavigation);
  $('export').addEventListener('click', exportNotes);
  $('corpus-open').addEventListener('click', () => { $('corpus-dialog').showModal(); $('corpus-search').focus(); corpusResults(); });
  $('corpus-close').addEventListener('click', () => $('corpus-dialog').close());
  $('corpus-search').addEventListener('input', corpusResults);
  $('corpus-dialog').addEventListener('click', event => { if (event.target === $('corpus-dialog')) { const rect = $('corpus-dialog').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('corpus-dialog').close(); } });
  renderNavigation(); renderCase();
}
boot().catch(exception => { error(exception.message); $('case-view').textContent = 'Vérifiez le lancement du serveur de relecture et le chemin de session.json.'; });
