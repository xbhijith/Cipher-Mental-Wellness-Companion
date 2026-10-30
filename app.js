/* ============ CIPHER: all data lives in localStorage, nothing leaves the device ============ */
const KEY = 'cipher_v1';
const $ = s => document.querySelector(s);
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const MOODS = [
  { v: 1, e: '😖', n: 'Overwhelmed' }, { v: 2, e: '😕', n: 'Low' }, { v: 3, e: '😐', n: 'Okay' },
  { v: 4, e: '🙂', n: 'Good' }, { v: 5, e: '🤩', n: 'Great' }
];
const TAGS = ['sleep', 'college', 'work', 'relationships', 'health', 'social'];
const SUGGEST = ['Drink water', 'Walk 10 minutes', 'Sleep on time', 'Call someone'];
const GROUND = [
  '5-4-3-2-1: name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.',
  'Press both feet into the floor. Notice the pressure for 30 seconds.',
  'Breathe in for 4, out for 6. Repeat five times.',
  'Drop your shoulders, unclench your jaw, and look at the farthest thing you can see.',
  'Name three things in the room that are blue.'
];

/* S.moods = [{t, v, tags}] · S.habits = [{id, t}] · S.log = { 'YYYY-MM-DD': { habitId: true } } */
let S = { moods: [], habits: [], log: {} };
try { S = JSON.parse(localStorage.getItem(KEY)) || S; } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

let picked = new Set(), forceHabits = false, token = 0;

/* ---------- helpers ---------- */
const day = d => (d || new Date()).toLocaleDateString('en-CA');
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const moodsOn = k => S.moods.filter(m => day(new Date(m.t)) === k);
const dayMood = k => { const m = moodsOn(k); return m.length ? avg(m.map(x => x.v)) : null; };
const lastMood = () => moodsOn(day()).slice(-1)[0];
const doneOn = k => S.habits.filter(h => (S.log[k] || {})[h.id]).length;

/* Empathy-first streak: a day counts if you did at least half your habits.
   A low-mood day (<= 2) is "protected": it never breaks the streak. */
function streak() {
  let n = 0, frozen = 0, d = new Date();
  const need = Math.max(1, Math.ceil(S.habits.length / 2));
  for (let i = 0; i < 90; i++) {
    const k = day(d);
    if (S.habits.length && doneOn(k) >= need) n++;
    else if (moodsOn(k).some(m => m.v <= 2)) frozen++;
    else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }
  return { n, frozen };
}

/* Explainable, rule-based recommender */
function recommend() {
  const m = lastMood();
  if (!m) return { t: 'Check in to get a suggestion', d: 'Tap how you feel above.', why: 'We pick activities based on your mood and what’s on your mind.', act: null };
  const name = MOODS[m.v - 1].n;
  if (m.v === 1) return { t: 'Guided breathing', d: '2 min · box breathing', why: `You said ${name}. Slow breathing is the fastest reset.`, act: 'breath' };
  if (m.tags.includes('sleep') && m.v <= 3) return { t: 'Wind-down routine', d: '5–10 min · slow breathing, low light', why: `You logged ${name} with sleep on your mind.`, act: 'breath' };
  if (m.v === 2) return { t: 'Grounding exercise', d: '3 min · no screen needed', why: `You said ${name}. Grounding is a gentle first step.`, act: 'ground' };
  if (m.v === 3) return { t: 'Two-minute reset', d: '2 min · breathing pacer', why: 'Okay days respond well to a short pause.', act: 'breath' };
  return { t: 'Gratitude reflection', d: '2 min · name one thing that went well', why: `You’re feeling ${name}. Lock it in.`, act: 'ground' };
}

/* ---------- render ---------- */
function render() {
  const m = lastMood(), v = m ? m.v : null, k = day();
  // Chameleon UI
  document.body.toggleAttribute('data-calm', v !== null && v <= 2);
  document.body.toggleAttribute('data-hide', v === 1 && !forceHabits);
  if (window.Aurora) Aurora.set(v !== null && v <= 2);

  const h = new Date().getHours();
  $('#hi').textContent = (h < 12 ? 'Good morning.' : h < 18 ? 'Good afternoon.' : 'Good evening.');
  $('#date').textContent = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });

  $('#moods').innerHTML = MOODS.map(o =>
    `<button data-v="${o.v}" class="${m && m.v === o.v ? 'on' : ''}" aria-label="${o.n}"><b>${o.e}</b>${o.n}</button>`).join('');
  $('#tags').innerHTML = TAGS.map(t => `<button class="chip ${picked.has(t) ? 'on' : ''}" data-t="${t}">${t}</button>`).join('');

  const r = recommend();
  $('#rec').innerHTML = `<h2>${r.t}</h2><p class="why">${r.why}</p><p class="sub">${r.d}</p>` +
    `<div class="row">${r.act ? `<button class="btn" data-act="${r.act}">Start now</button>` : ''}<button class="btn ghost" data-act="ground">Quick reset</button></div>`;

  const L = S.log[k] || {}, n = S.habits.length, c = doneOn(k), st = streak();
  $('#hlist').innerHTML = n
    ? S.habits.map(x => `<div class="h"><label><input type="checkbox" data-h="${x.id}" ${L[x.id] ? 'checked' : ''}><span>${esc(x.t)}</span></label><button class="x" data-del="${x.id}" aria-label="Remove ${esc(x.t)}">×</button></div>`).join('')
    : `<p class="sub">Nothing here yet. Add something that matters to you, or tap a suggestion.</p><div class="chips">${SUGGEST.map(s => `<button class="chip" data-sug="${s}">+ ${s}</button>`).join('')}</div>`;
  $('#prg').style.strokeDashoffset = 213.6 * (1 - (n ? c / n : 0));
  $('#streak').textContent = `${st.n}-day streak` + (st.f ? ` · ${st.f} protected` : '') + (n ? ` · ${c}/${n} today` : '');
  const wk = [];
  for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); const a = dayMood(day(d)); if (a) wk.push(a); }
  $('#stats').innerHTML = [[st.n, 'day streak'], [n ? c + '/' + n : '–', 'habits today'], [wk.length ? avg(wk).toFixed(1) : '–', 'avg mood this week']]
    .map(x => `<div class="stat"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
  insights();
  if (window.Companion) Companion.paint();
}

function insights() {
  const cols = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const a = dayMood(day(d));
    cols.push(`<div><i style="height:${a ? a * 24 : 6}px;opacity:${a ? 1 : .25}"></i>${d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)}</div>`);
  }
  $('#week').innerHTML = cols.join('');

  // Habit-to-mood correlation engine
  const days = [...new Set(S.moods.map(m => day(new Date(m.t))))];
  const out = [];
  S.habits.forEach(h => {
    const yes = days.filter(k => (S.log[k] || {})[h.id]).map(dayMood);
    const no = days.filter(k => !(S.log[k] || {})[h.id]).map(dayMood);
    if (yes.length >= 2 && no.length >= 2) {
      const p = Math.round((avg(yes) / avg(no) - 1) * 100);
      if (p >= 8) out.push({ p, h: `On days you do <b>${esc(h.t.toLowerCase())}</b>, your mood is <b>${p}% higher</b>.` });
    }
  });
  out.sort((a, b) => b.p - a.p);

  const cnt = {};
  S.moods.filter(m => m.v <= 2).forEach(m => m.tags.forEach(t => cnt[t] = (cnt[t] || 0) + 1));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 2) out.push({ h: `<b>${top[0]}</b> appears in ${top[1]} of your low moments. Worth a closer look.` });

  $('#ins').innerHTML = out.length ? out.map(o => `<div class="ins">${o.h}</div>`).join('')
    : '<p class="sub">Log moods and habits for a few days to unlock insights, or load demo data below.</p>';
}

/* ---------- breathing: handled by companion.js (live second counter) ---------- */
const breathe = id => Companion.guide(typeof id === 'string' ? id : 'box');

function ground() {
  const g = GROUND[Math.floor(Math.random() * GROUND.length)];
  $('#rec').innerHTML = `<h2>Try this</h2><p class="why">About a minute. No phone needed.</p><p style="margin:8px 0 16px">${g}</p>` +
    `<div class="row"><button class="btn" data-act="ground">Another one</button><button class="btn ghost" data-act="breath">Breathing pacer</button></div>`;
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (d.v) {
    S.moods.push({ t: Date.now(), v: +d.v, tags: [...picked] });
    picked.clear(); forceHabits = false; save(); render();
    if (+d.v === 1) breathe();
  }
  else if (d.t) { picked.has(d.t) ? picked.delete(d.t) : picked.add(d.t); render(); }
  else if (d.act === 'breath') breathe();
  else if (d.act === 'ground') ground();
  else if (d.sug) addHabit(d.sug);
  else if (d.del) { S.habits = S.habits.filter(h => h.id !== d.del); save(); render(); }
  else if (d.tab) {
    document.querySelectorAll('.bar button').forEach(x => x.setAttribute('aria-selected', x === b));
    $('#today').hidden = d.tab !== 'today'; $('#insights').hidden = d.tab !== 'insights'; $('#talk').hidden = d.tab !== 'talk';
    window.scrollTo(0, 0);
  }
});

document.addEventListener('change', e => {
  const id = e.target.dataset.h; if (!id) return;
  const k = day(); S.log[k] = S.log[k] || {}; S.log[k][id] = e.target.checked; save(); render();
});

function addHabit(t) {
  t = (t || '').trim(); if (!t) return;
  S.habits.push({ id: 'h' + Date.now(), t }); save(); render();
}
$('#hf').addEventListener('submit', e => { e.preventDefault(); addHabit($('#hin').value); $('#hin').value = ''; });

$('#showh').onclick = () => { forceHabits = true; render(); };
$('#clr').onclick = () => { if (confirm('Erase all moods and habits from this device?')) { S = { moods: [], habits: [], log: {} }; save(); render(); } };
$('#exp').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
  a.download = 'cipher-data.json'; a.click();
};

/* Demo data: 14 days, mood really does track habits so the correlation engine has something to find */
$('#demo').onclick = () => {
  S = { ...S, moods: [], log: {}, habits: [{ id: 'dw', t: 'Drink 4L water' }, { id: 'dm', t: 'Morning workout' }, { id: 'ds', t: 'Sleep by 11 PM' }] };
  for (let i = 14; i >= 1; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(20);
    const w = Math.random() < .5, m = Math.random() < .5, s = Math.random() < .5;
    S.log[day(d)] = { dw: w, dm: m, ds: s };
    let v = 2.5 + (w ? 1.1 : 0) + (m ? .5 : 0) + (s ? .7 : 0) + Math.random() * .4 - .2;
    v = Math.max(1, Math.min(5, Math.round(v)));
    S.moods.push({ t: d.getTime(), v, tags: v <= 2 ? ['college', 'sleep'] : [] });
  }
  save(); render();
};

render();