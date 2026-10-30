/* Cipher companion: profile, pet, chat, voice and the guided-exercise player.
   Relies on globals from app.js (S, save, render, day, lastMood, doneOn, esc, $). */
const Companion = (() => {
  const PETS = { fox: ['🦊', 'Fox', 'Ember'], cat: ['🐱', 'Cat', 'Miso'], panda: ['🐼', 'Panda', 'Bao'], owl: ['🦉', 'Owl', 'Luna'], sprout: ['🌱', 'Sprout', 'Fern'], none: ['✦', 'No pet', 'Cipher'] };
  const QUICK = ['I feel anxious', 'I’m stressed about exams', 'I’m going through a breakup', 'I can’t sleep', 'I feel low', 'I’m so angry'];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let sel = 'fox', typing = false, tok = 0, skip = false;

  const P = () => S.profile || { name: 'friend', pet: 'none', petName: 'Cipher' };
  const N = () => P().name, PN = () => P().petName || 'Cipher', EM = () => PETS[P().pet || 'none'][0];
  const chat = () => S.chat || (S.chat = []);
  const xp = n => { S.xp = (S.xp || 0) + n; save(); paint(); };

  /* ---------- onboarding ---------- */
  function chips() {
    $('#obp').innerHTML = Object.entries(PETS).map(([k, [e, l]]) => `<button type="button" class="chip ${k === sel ? 'on' : ''}" data-pet="${k}">${e} ${l}</button>`).join('');
  }
  function openOb() {
    if (!$('#ob').hidden) return;
    $('#ob').hidden = false; sel = (S.profile && S.profile.pet) || 'fox'; chips();
    if (S.profile) { $('#obn').value = S.profile.name; $('#obpn').value = S.profile.petName; }
  }
  $('#obf').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#obn').value.trim(); if (!name) return;
    S.profile = { name, pet: sel, petName: $('#obpn').value.trim() || PETS[sel][2] };
    if (!chat().length) chat().push({ r: 'b', text: `Hi ${name}, I’m ${S.profile.petName}. I’m here to listen. You can tell me anything, in your own words. How are you feeling today?` });
    save(); $('#ob').hidden = true; render();
  });

  /* ---------- pet + hero ---------- */
  function say() {
    const m = lastMood(), c = doneOn(day());
    if (!m) return `Hi ${N()}! Tap how you feel, or come talk to me.`;
    if (m.v <= 2) return `I’m right here, ${N()}. No pressure today. Want to talk, or try a short exercise?`;
    if (c > 0) return `${c} habit${c > 1 ? 's' : ''} done today. I’m proud of you, ${N()}!`;
    return m.v >= 4 ? `You seem to be in a good place, ${N()}. Let’s keep it going!` : `Thanks for checking in, ${N()}. One tiny habit?`;
  }
  function paint() {
    if (!S.profile) { openOb(); return; }
    const x = S.xp || 0;
    $('#hi').textContent = $('#hi').textContent.replace('.', ', ' + N() + '.');
    $('#pAv').textContent = EM(); $('#pN').textContent = PN(); $('#pL').textContent = 'Level ' + (Math.floor(x / 50) + 1);
    $('#xpf').style.width = (x % 50) * 2 + '%'; $('#pSay').textContent = say(); $('#tn').textContent = PN();
    $('#qs').innerHTML = chat().length < 3 ? QUICK.map(q => `<button class="chip" data-q="${q}">${q}</button>`).join('') : '';
    renderChat();
  }

  /* ---------- chat ---------- */
  const CRISIS = '<div class="tc crisis"><b>Please reach out now</b><span>If you are in immediate danger, call your local emergency number.<br>India: Tele-MANAS 14416 · US: call or text 988<br>Elsewhere: findahelpline.com</span></div>';
  function card(m, k) {
    const id = m.techs[m.i || 0], t = Brain.T[id];
    return `<div class="tc"><b>${t.n}</b><span>${t.by} · about ${Brain.mins(id)}</span><div class="row"><button class="btn" data-tech="${id}">Start</button>${m.techs.length > 1 ? `<button class="btn ghost" data-next="${k}">Another</button>` : ''}</div></div>`;
  }
  function renderChat() {
    const el = $('#msgs'), av = `<span class="av">${EM()}</span>`;
    el.innerHTML = chat().map((m, k) => m.r === 'u' ? `<div class="m u">${esc(m.text)}</div>`
      : `<div class="m">${av}<div class="bub">${esc(m.text)}${m.read ? `<div class="det">Understood: ${m.read}</div>` : ''}${m.techs ? card(m, k) : ''}${m.crisis ? CRISIS : ''}</div></div>`).join('')
      + (typing ? `<div class="m">${av}<div class="bub dots"><i></i><i></i><i></i></div></div>` : '');
    el.scrollTop = el.scrollHeight;
  }
  async function send(text) {
    text = (text || '').trim(); if (!text) return;
    chat().push({ r: 'u', text }); $('#cin').value = ''; typing = true; renderChat();
    const r = Brain.reply(text, N());
    let out = r.text; await wait(750);
    if (window.CIPHER_API && !r.crisis) {       // optional LLM backend (see server.js)
      try {
        const msgs = chat().slice(-10).map(m => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.text }));
        while (msgs[0] && msgs[0].role !== 'user') msgs.shift();
        const j = await (await fetch(window.CIPHER_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: N(), pet: PN(), messages: msgs }) })).json();
        if (j.reply) out = j.reply;
      } catch (e) {}
    }
    typing = false;
    if (r.e) S.moods.push({ t: Date.now(), v: Brain.M[r.e], tags: [r.e] });   // auto check-in drives the chameleon UI
    chat().push({ r: 'b', text: out, techs: r.techs, i: 0, crisis: r.crisis, read: r.read });
    S.chat = chat().slice(-40); S.xp = (S.xp || 0) + 3; save(); render();
    if ($('#spk').checked) speak(out);
  }
  function speak(t) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.rate = .95; speechSynthesis.speak(u);
  }
  $('#cf').addEventListener('submit', e => { e.preventDefault(); send($('#cin').value); });

  /* ---------- guided exercise player: counts every second so the user can count along ---------- */
  async function count(s, my) {
    for (let i = 1; i <= s; i++) {
      $('#num').textContent = i;
      for (let k = 0; k < 4; k++) { await wait(250); if (my !== tok) return false; if (skip) { skip = false; return true; } }
    }
    return true;
  }
  async function guide(id) {
    const T = Brain.T[id], my = ++tok, orb = $('#orb'); skip = false;
    $('#pacer').classList.add('show');
    orb.style.display = T.kind === 'breath' ? '' : 'none'; $('#pnext').style.display = T.kind === 'steps' ? '' : 'none';
    $('#ph').className = T.kind === 'steps' ? 'long' : '';
    $('#pr').textContent = T.n + ' · ' + T.by; $('#ph').textContent = 'Get comfortable'; $('#pt').textContent = 'Sit back. Shoulders soft.'; $('#num').textContent = '';
    orb.style.transitionDuration = '1s'; orb.style.transform = 'scale(1)';
    await wait(2200); if (my !== tok) return;
    if (T.kind === 'breath') {
      for (let c = 1; c <= T.cycles; c++) for (const [l, s, sc] of T.ph) {
        $('#ph').textContent = l; $('#pt').textContent = `Round ${c} of ${T.cycles}`;
        orb.style.transitionDuration = s + 's'; orb.style.transform = `scale(${sc})`;
        if (!await count(s, my)) return;
      }
    } else {
      for (let k = 0; k < T.steps.length; k++) {
        $('#ph').textContent = T.steps[k][0]; $('#pt').textContent = `Step ${k + 1} of ${T.steps.length}`;
        if (!await count(T.steps[k][1], my)) return;
      }
    }
    $('#ph').className = ''; $('#ph').textContent = `Well done, ${N()}.`; $('#num').textContent = '';
    $('#pt').textContent = 'Notice how your body feels now.'; $('#pnext').style.display = 'none'; xp(10);
  }
  $('#pnext').onclick = () => { skip = true; };
  $('#pclose').onclick = () => {
    tok++; $('#pacer').classList.remove('show');
    chat().push({ r: 'b', text: `How are you feeling now, ${N()}? Better, the same, or worse? I’m here either way.` });
    save(); paint();
  };

  /* ---------- delegated events ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.pet) { sel = d.pet; chips(); if (!$('#obpn').value) $('#obpn').placeholder = PETS[sel][2]; }
    else if (d.q) send(d.q);
    else if (d.tech) guide(d.tech);
    else if (d.next) { const m = chat()[+d.next]; m.i = ((m.i || 0) + 1) % m.techs.length; save(); renderChat(); }
    else if (d.v) setTimeout(() => xp(10));
    else if (d.tab === 'talk') setTimeout(renderChat);
  });
  document.addEventListener('change', e => { if (e.target.dataset.h && e.target.checked) setTimeout(() => xp(5)); });
  $('#editp').onclick = openOb;

  return { paint, guide };
})();
render();