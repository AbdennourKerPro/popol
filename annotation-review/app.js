'use strict';
/* Relecture des annotations : vanilla JS, aucune dépendance. L'état de chaque mesure est enregistré
   sur le serveur local à chaque modification (reviews.json). */

const THEME_LABELS = {
  pouvoir_achat: 'Pouvoir d’achat', fiscalite: 'Impôts et richesse', travail_retraite: 'Travail et retraites', logement: 'Logement',
  sante: 'Santé et solidarités', education: 'École et recherche', ecologie: 'Écologie', energie_transports: 'Énergie et transports',
  services_publics: 'Services publics et territoires', democratie: 'Démocratie', justice_securite: 'Justice et sécurité',
  egalite: 'Égalité et droits', culture_sport: 'Culture et sport', numerique: 'Numérique et espace', international: 'Paix et international',
  agriculture: 'Agriculture et alimentation', migrations: 'Migrations et nationalité',
};
const PORTEES = [
  ['large', 'Large', 'Une grande partie de la population est concernée directement'],
  ['ciblee', 'Ciblée', 'Un groupe précis'],
  ['collective', 'Collective', 'Effet par les institutions, le pays, l’économie ou la planète'],
];
const VERDICTS = [['ok', 'Correct', '1'], ['corrige', 'Corrigé', '2'], ['doute', 'Douteux', '3']];
const FIELDS = ['publics', 'themes', 'portee', 'resume'];

const $ = (selector) => document.querySelector(selector);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (value !== false && value != null) node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) node.append(child instanceof Node ? child : document.createTextNode(child ?? ''));
  return node;
};

let D;                 // data from the server
const work = {};       // id -> working copy {verdict, publics, themes, portee, resume, comment}
let current = 0;       // index in D.sample
let moreOpen = false;  // « Ajouter un autre profil » stays open while the person adds several
let filter = 'all';
const timers = {};

const publicLabel = (id) => (D.taxonomie.publics[id] || id).split(/[(,]/)[0].trim();
const themeLabel = (id) => THEME_LABELS[id] || id;
const original = (id) => D.annotations[id];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const changedFields = (id) => FIELDS.filter((f) => !same(f === 'publics' ? [...work[id][f]].sort() : work[id][f] ?? null, f === 'publics' ? [...original(id)[f]].sort() : original(id)[f] ?? null)
  && !(f === 'resume' && !work[id].resume && !original(id).resume));
const status = (id) => work[id].verdict || 'todo';

async function load() {
  D = await (await fetch('/api/data')).json();
  for (const id of D.sample) {
    const saved = D.reviews[id];
    const base = original(id);
    work[id] = saved ? { verdict: saved.verdict, publics: [...saved.publics], themes: [...saved.themes], portee: saved.portee, resume: saved.resume ?? '', comment: saved.comment ?? '' }
      : { verdict: null, publics: [...base.publics], themes: [...base.themes], portee: base.portee, resume: base.resume ?? '', comment: '' };
  }
  const first = D.sample.findIndex((id) => !work[id].verdict);
  current = first < 0 ? 0 : first;
  render();
}

function persist(id, now = false) {
  clearTimeout(timers[id]);
  $('#saved') && ($('#saved').textContent = 'Enregistrement…');
  const send = async () => {
    const w = work[id];
    try {
      const response = await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, verdict: w.verdict, publics: w.publics, themes: w.themes, portee: w.portee, resume: w.resume || null, comment: w.comment || null }) });
      if (!response.ok) throw new Error((await response.json()).error);
      $('#saved') && ($('#saved').textContent = 'Enregistré ✓');
    } catch (error) {
      $('#saved') && ($('#saved').textContent = `Erreur : ${error.message}`);
    }
  };
  if (now) send(); else timers[id] = setTimeout(send, 300);
}

function touch(id, { auto = true } = {}) {
  // Editing a measure that was marked correct (or not yet reviewed) makes it « corrigée ».
  if (auto && changedFields(id).length && (!work[id].verdict || work[id].verdict === 'ok')) work[id].verdict = 'corrige';
  persist(id);
  renderList(); renderProgress(); renderMain({ keepScroll: true });
}

const effectText = (id) => {
  const w = work[id];
  const themes = w.themes.map(themeLabel).join(', ');
  if (w.publics.length) {
    return `Proposée seulement aux personnes qui sont : ${w.publics.map(publicLabel).join(' ou ')}. Elle monte dans leur classement, et davantage si l’un de ces thèmes les intéresse (${themes}).`;
  }
  return `Proposée à toute personne qui s’intéresse à l’un de ces thèmes : ${themes}. Elle n’est jamais proposée aux autres.`;
};

function resumeWarning(id) {
  const text = work[id].resume;
  if (!text) return '';
  const nums = (s) => new Set((s.match(/\d[\d\s  .,]*\d|\d/g) || []).map((n) => n.replace(/[\s  .,]/g, '')));
  const source = nums(D.mesures[id].texte + ' ' + (D.mesures[id].parent || ''));
  const extra = [...nums(text)].filter((n) => !source.has(n));
  return extra.length ? `Chiffre absent de la mesure : ${extra.join(', ')}.` : '';
}

/* ------------------------------------------------------------------ rendering */

function visibleIds() {
  return D.sample.filter((id) => filter === 'all' || status(id) === filter);
}

function render() { renderList(); renderProgress(); renderMain(); }

function renderProgress() {
  const done = D.sample.filter((id) => work[id].verdict).length;
  $('#progress-bar').style.width = `${(100 * done) / D.sample.length}%`;
  $('#progress-text').textContent = `${done} / ${D.sample.length} relues`;
}

function renderList() {
  const list = $('#list');
  const keep = list.scrollTop;
  list.replaceChildren(...visibleIds().map((id) => {
    const index = D.sample.indexOf(id);
    return el('button', { class: `item ${index === current ? 'current' : ''}`, onclick: () => go(index), 'data-id': id },
      el('span', { class: 'n' }, String(index + 1)), el('span', { class: 't' }, D.mesures[id].texte), el('span', { class: `dot ${status(id)}`, title: status(id) }));
  }));
  list.scrollTop = keep;
  list.querySelector('.current')?.scrollIntoView({ block: 'nearest' });
}

function chip(label, { on = false, ghost = false, title = '', onclick, remove, rank } = {}) {
  // The whole chip is the button; the cross is a second, separate one.
  return el('span', { class: `chip ${on ? 'on' : ''} ${ghost ? 'ghost-removed' : ''}`, title },
    el('button', { class: 'chip-main', type: 'button', onclick }, rank ? el('span', { class: 'rank' }, `${rank} · `) : '', label),
    remove ? el('button', { class: 'x', onclick: remove, 'aria-label': `Retirer ${label}`, type: 'button' }, '×') : '');
}

function renderMain({ keepScroll = false } = {}) {
  const main = $('#main');
  const scroll = main.scrollTop;
  const id = D.sample[current];
  const m = D.mesures[id], w = work[id], o = original(id);
  const changed = changedFields(id);
  const badge = (field) => (changed.includes(field) ? el('span', { class: 'changed' }, 'modifié') : '');

  // profiles
  const audit = D.audit[id];
  const removed = (audit?.avant || []).filter((p) => !w.publics.includes(p));
  const others = Object.keys(D.taxonomie.publics).filter((p) => !w.publics.includes(p) && !removed.includes(p));
  const toggle = (list, value, on) => { const i = list.indexOf(value); if (on && i < 0) list.push(value); if (!on && i >= 0) list.splice(i, 1); touch(id); };
  const publics = el('div', {},
    el('div', { class: 'chips' }, w.publics.length ? w.publics.map((p) => chip(publicLabel(p), { on: true, title: D.taxonomie.publics[p], onclick: () => toggle(w.publics, p, false), remove: () => toggle(w.publics, p, false) }))
      : el('span', { class: 'empty' }, 'Aucun profil : mesure pour tout le monde (ou sans bénéficiaire précis)')),
    removed.length ? el('p', { class: 'orig' }, 'Retirés à la 2e passe (cliquer pour les rétablir) :') : '',
    removed.length ? el('div', { class: 'chips' }, removed.map((p) => chip(`+ ${publicLabel(p)}`, { ghost: true, title: D.taxonomie.publics[p], onclick: () => toggle(w.publics, p, true) }))) : '',
    el('details', { class: 'more', open: moreOpen, ontoggle: (event) => { moreOpen = event.target.open; } }, el('summary', {}, `Ajouter un autre profil (${others.length})`),
      el('div', { class: 'chips' }, others.map((p) => chip(`+ ${publicLabel(p)}`, { title: D.taxonomie.publics[p], onclick: () => toggle(w.publics, p, true) })))));

  // themes: first = main theme; clicking a chosen one makes it the main theme
  const themeChips = Object.keys(D.taxonomie.themes).map((t) => {
    const rank = w.themes.indexOf(t) + 1;
    return chip(themeLabel(t), {
      on: rank > 0, rank: rank || undefined, title: `${D.taxonomie.themes[t]}${rank ? ' — cliquer : thème principal ; × : retirer' : ''}`,
      onclick: () => {
        if (rank > 1) w.themes = [t, ...w.themes.filter((x) => x !== t)];
        else if (!rank) { if (w.themes.length >= 3) return flash('3 thèmes au plus : retirez-en un d’abord.'); w.themes.push(t); }
        touch(id);
      },
      remove: rank && w.themes.length > 1 ? () => { w.themes = w.themes.filter((x) => x !== t); touch(id); } : undefined,
    });
  });

  const resumeNote = o.resume ? el('p', { class: 'orig' }, `Original : ${o.resume}`) : el('p', { class: 'orig' }, 'Aucun résumé fiable : l’appli affiche le texte exact de la mesure. Vous pouvez en écrire un.');
  const warning = resumeWarning(id);
  const area = el('textarea', { rows: '2', maxlength: '400', placeholder: 'Phrase simple, au conditionnel, sans chiffre ni nom absent de la mesure.' });
  area.value = w.resume;
  area.addEventListener('input', () => { w.resume = area.value; if (changedFields(id).length && (!w.verdict || w.verdict === 'ok')) w.verdict = 'corrige'; persist(id); renderList(); renderProgress(); $('#resume-warning').textContent = resumeWarning(id); });
  const note = el('textarea', { rows: '2', maxlength: '2000', placeholder: 'Commentaire (facultatif) : pourquoi douteux, ce qui manque au vocabulaire…' });
  note.value = w.comment;
  note.addEventListener('input', () => { w.comment = note.value; persist(id); });

  main.replaceChildren(
    el('div', { class: 'crumbs' }, `${m.partie.replace(/^Partie \d+ – /, '')} › ${m.chapitre.replace(/^Chapitre \d+ : /, '')} › ${m.sous_section}`,
      m.categorie === 'cle' ? ' · mesure clé' : m.categorie === 'sous_mesure' ? ' · sous-mesure' : '', ' · ', el('a', { href: m.url, target: '_blank', rel: 'noreferrer' }, 'voir sur melenchon2027.fr'), ` · ${id}`),
    el('section', { class: 'card' }, m.parent ? el('p', { class: 'parent' }, `Précise : ${m.parent}`) : '', el('p', { class: 'measure' }, m.texte), el('p', { class: 'effect' }, effectText(id))),
    el('section', { class: 'card' }, el('h2', {}, 'Phrase affichée', badge('resume')), area, el('p', { id: 'resume-warning', class: 'warn' }, warning), resumeNote),
    el('section', { class: 'card' }, el('h2', {}, 'Profils concernés', badge('publics')), publics),
    el('section', { class: 'card' }, el('h2', {}, 'Thèmes (le premier est le principal)', badge('themes')), el('div', { class: 'chips' }, themeChips)),
    el('section', { class: 'card' }, el('h2', {}, 'Portée', badge('portee')),
      el('div', { class: 'portee' }, PORTEES.map(([value, label, hint]) => el('button', { class: w.portee === value ? 'on' : '', type: 'button', onclick: () => { w.portee = value; touch(id); } }, label, el('small', {}, hint))))),
    el('section', { class: 'card' }, el('h2', {}, 'Commentaire'), note),
    bar(id));
  if (keepScroll) main.scrollTop = scroll; else { main.scrollTop = 0; }
}

function bar(id) {
  const w = work[id];
  return el('div', { class: 'bar' },
    el('button', { class: 'nav', onclick: () => go(current - 1), disabled: current === 0, title: 'Mesure précédente (←)' }, '← Précédente'),
    ...VERDICTS.map(([value, label, key]) => el('button', { class: `verdict ${value} ${w.verdict === value ? 'on' : ''}`, onclick: () => verdict(value), 'aria-pressed': String(w.verdict === value) }, el('kbd', {}, key), label)),
    el('button', { class: 'nav', onclick: () => verdict(null), title: 'Effacer le verdict' }, el('span', { class: 'kbd' }, '0'), ' Effacer'),
    el('span', { class: 'spacer' }), el('span', { id: 'saved' }, ''),
    el('span', { class: 'muted' }, `${current + 1} / ${D.sample.length}`),
    el('button', { class: 'nav', onclick: () => go(current + 1), disabled: current === D.sample.length - 1, title: 'Mesure suivante (→)' }, 'Suivante →'));
}

function verdict(value) {
  const id = D.sample[current];
  work[id].verdict = value;
  persist(id, true);
  // A correct or doubtful verdict moves on: that is the fast path of a review.
  if (value === 'ok' || value === 'doute') return next(true);
  renderList(); renderProgress(); renderMain({ keepScroll: true });
}

function next(skipDone = false) {
  const ids = D.sample;
  if (skipDone) {
    for (let step = 1; step <= ids.length; step++) {
      const index = (current + step) % ids.length;
      if (!work[ids[index]].verdict) return go(index);
    }
    return summary();
  }
  go(Math.min(current + 1, ids.length - 1));
}

function go(index) {
  if (index < 0 || index >= D.sample.length) return;
  current = index;
  moreOpen = false;
  render();
}

let flashTimer;
function flash(message) {
  const node = $('#saved');
  if (!node) return;
  node.textContent = message;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => (node.textContent = ''), 3000);
}

/* ------------------------------------------------------------------ dialogs */

function open(content) {
  const dialog = $('#dialog');
  dialog.replaceChildren(el('button', { class: 'ghost close', onclick: () => dialog.close() }, 'Fermer'), ...content);
  if (!dialog.open) dialog.showModal();
}

function help() {
  open([el('h2', {}, 'Raccourcis clavier'), el('table', {}, ...[
    ['1', 'Correct, passe à la suivante non relue'], ['2', 'Corrigé (se met aussi tout seul quand vous modifiez)'], ['3', 'Douteux, passe à la suivante non relue'],
    ['0', 'Effacer le verdict'], ['← / K', 'Mesure précédente'], ['→ / J', 'Mesure suivante'], ['?', 'Cette aide'], ['Échap', 'Fermer'],
  ].map(([key, text]) => el('tr', {}, el('td', {}, el('kbd', {}, key)), el('td', {}, text)))),
  el('p', { class: 'muted' }, 'Chaque modification est enregistrée aussitôt dans annotation-review/reviews.json. Rien n’est appliqué à l’app avant apply_reviews.py.')]);
}

function summary() {
  const reviewed = D.sample.filter((id) => work[id].verdict);
  const count = (v) => D.sample.filter((id) => work[id].verdict === v).length;
  const touched = D.sample.filter((id) => changedFields(id).length);
  const perField = Object.fromEntries(FIELDS.map((f) => [f, touched.filter((id) => changedFields(id).includes(f)).length]));
  const added = {}, removedP = {};
  for (const id of touched) {
    for (const p of work[id].publics) if (!original(id).publics.includes(p)) added[p] = (added[p] || 0) + 1;
    for (const p of original(id).publics) if (!work[id].publics.includes(p)) removedP[p] = (removedP[p] || 0) + 1;
  }
  const tally = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${publicLabel(p)} (${n})`).join(', ') || '—';
  const doubts = D.sample.filter((id) => work[id].verdict === 'doute');
  open([el('h2', {}, 'Bilan de la relecture'),
    el('p', {}, el('span', { class: 'stat' }, `${reviewed.length} / ${D.sample.length} relues`), el('span', { class: 'stat' }, `${count('ok')} correctes`),
      el('span', { class: 'stat' }, `${count('corrige')} corrigées`), el('span', { class: 'stat' }, `${count('doute')} douteuses`)),
    el('h3', {}, 'Ce qui a été modifié (par rapport à l’annotation automatique)'),
    el('table', {}, ...FIELDS.map((f) => el('tr', {}, el('td', {}, { publics: 'Profils', themes: 'Thèmes', portee: 'Portée', resume: 'Phrase' }[f]),
      el('td', {}, `${perField[f]} mesure${perField[f] > 1 ? 's' : ''}`), el('td', {}, reviewed.length ? `${Math.round((100 * perField[f]) / Math.max(1, reviewed.length))} % des relues` : '')))),
    el('p', {}, el('strong', {}, 'Profils ajoutés : '), tally(added)), el('p', {}, el('strong', {}, 'Profils retirés : '), tally(removedP)),
    doubts.length ? el('h3', {}, 'À discuter') : '',
    ...doubts.map((id) => el('div', { class: 'doubt-item' }, el('div', {}, D.mesures[id].texte), el('div', { class: 'muted' }, work[id].comment || 'Sans commentaire'))),
    el('p', { class: 'muted' }, 'Pour appliquer les corrections à l’app : python3 annotation-review/apply_reviews.py (essai à blanc), puis --write.')]);
}

/* ------------------------------------------------------------------ events */

document.addEventListener('keydown', (event) => {
  if (event.target.matches('textarea, input, select') || event.metaKey || event.ctrlKey || event.altKey || $('#dialog').open) {
    if (event.key === 'Escape' && event.target.matches('textarea')) event.target.blur();
    return;
  }
  const keys = { 1: () => verdict('ok'), 2: () => verdict('corrige'), 3: () => verdict('doute'), 0: () => verdict(null),
    ArrowRight: () => go(current + 1), j: () => go(current + 1), ArrowLeft: () => go(current - 1), k: () => go(current - 1), '?': help };
  if (keys[event.key]) { event.preventDefault(); keys[event.key](); }
});
$('#filter').addEventListener('change', (event) => { filter = event.target.value; renderList(); });
$('#open-summary').addEventListener('click', summary);
$('#open-help').addEventListener('click', help);

load().catch((error) => { $('#main').textContent = `Impossible de charger les données : ${error.message}`; });
