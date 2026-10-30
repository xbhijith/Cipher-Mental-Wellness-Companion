/* Cipher brain: on-device emotion detection + evidence-informed technique library.
   Not therapy. It suggests well-known self-help skills (CBT, DBT, ACT, breathwork, PMR). */
const Brain = (() => {
  // Priority order: first match wins
  const RX = [
    ['crisis', /kill myself|suicid|end (it all|my life|it)\b|take my (own )?life|want(ed)? to (die|disappear)|(don'?t|do not|dont) want to (live|be here|be alive|exist|go on|wake up)|can(?:no|')?t go on|no (point|reason) (in )?(living|going on|to live)|not worth living|better off (dead|without me)|self[- ]?harm|(hurt|cut|harm) myself/i],
    ['panic', /panic|can(?:no|')?t breathe|heart (is )?rac|chest (is )?tight|going to die|losing control/i],
    ['breakup', /break ?up|broke up|dumped|heartbr|\bmy ex\b|divorce|(he|she|they) left me|miss (him|her|them)|cheated/i],
    ['grief', /passed away|\bdied\b|funeral|grie(f|ving)|lost (my|him|her)/i],
    ['sleep', /can(?:no|')?t sleep|(haven'?t|have not|barely) slept|slept (badly|poorly)|no sleep|insomnia|sleepless|awake all|tossing|up all night/i],
    ['anxiety', /anxi|worr|nervous|scared|afraid|fear|on edge|overthink|what if|dread|uneasy/i],
    ['stress', /stress|overwhelm|pressure|deadline|exam|viva|interview|placement|submission|backlog|too much|burn(ed|t)? ?out|swamped|assignment|workload|exhausted|drained/i],
    ['anger', /angry|furious|rage|pissed|hate|annoyed|irritat|frustrat|mad at/i],
    ['lonely', /lonely|alone|nobody|isolated|left out/i],
    ['low', /depress|hopeless|empty|numb|worthless|unmotivated|no (motivation|energy)|can(?:no|')?t get out of bed|\bsad\b|feel down|\bcry|tired of everything|hate myself|give up|what'?s the point|lost interest/i],
    ['joy', /happy|excited|proud|grateful|amazing|great day|good day|feeling good|so good/i]
  ];
  // Mood value logged automatically when an emotion is detected (1 = overwhelmed … 5 = great)
  const M = { panic: 1, stress: 1, anxiety: 2, low: 2, breakup: 2, grief: 2, anger: 2, lonely: 2, sleep: 3, joy: 5 };

  const br = (n, by, ph, cycles) => ({ n, by, kind: 'breath', ph, cycles });
  const st = (n, by, steps) => ({ n, by, kind: 'steps', steps });
  const T = {
    box: br('Box breathing', 'Paced breathing', [['Breathe in', 4, 1.6], ['Hold', 4, 1.6], ['Breathe out', 4, 1], ['Hold', 4, 1]], 4),
    sigh: br('Physiological sigh', 'Cyclic sighing breathwork', [['Breathe in', 2, 1.5], ['Top-up sip of air', 1, 1.7], ['Long slow exhale', 6, 1]], 5),
    b478: br('4-7-8 breathing', 'Relaxation breathing', [['Breathe in', 4, 1.6], ['Hold', 7, 1.6], ['Breathe out', 8, 1]], 3),
    g54321: st('5-4-3-2-1 grounding', 'Grounding (CBT / DBT)', [['Look around. Name 5 things you can see.', 15], ['Notice 4 things you can touch. Feel their texture.', 15], ['Listen. Name 3 things you can hear.', 12], ['Find 2 things you can smell.', 10], ['Name 1 thing you can taste.', 8]]),
    pmr: st('Muscle relaxation', 'Progressive muscle relaxation', [['Clench both fists tightly.', 5], ['Let go. Feel the heaviness.', 10], ['Raise your shoulders to your ears and hold.', 5], ['Drop them. Let them melt.', 10], ['Scrunch your face tight.', 5], ['Release. Soften your jaw.', 10], ['Tense your legs and feet.', 5], ['Let everything go loose.', 12]]),
    activate: st('One tiny action', 'Behavioural activation', [['Pick the smallest action you can: drink water, open a window, or stand up.', 20], ['Do it now. It counts, however small.', 30], ['Notice that you moved first. Motivation can follow.', 10]]),
    label: st('Name it to tame it', 'Affect labelling (ACT)', [['Name the feeling in one word: “I feel ___.”', 15], ['Rate it from 0 to 10.', 10], ['Where do you feel it in your body? Put a hand there.', 15], ['Tell yourself: “This is a feeling, not a fact. It will change.”', 10]]),
    reframe: st('Thought check', 'Cognitive restructuring (CBT)', [['What is the worrying thought? Say it exactly.', 20], ['What evidence supports it?', 20], ['What evidence does not?', 20], ['Say a kinder, more balanced version of it.', 25]]),
    compassion: st('Self-compassion break', 'Self-compassion (Neff)', [['Say to yourself: “This is a really hard moment.”', 12], ['“Pain like this is part of being human. I’m not alone in it.”', 15], ['Hand on your heart: “May I be kind to myself right now.”', 20]]),
    dump: st('Brain dump', 'Cognitive offloading', [['Write down everything on your mind. No order, no editing.', 60], ['Circle the ONE thing that matters most today.', 15], ['Shrink it to a 2-minute first step. Do only that.', 20]]),
    gratitude: st('Three good things', 'Positive psychology', [['Think of one thing that went well today.', 15], ['Why did it happen? What did you or someone else do?', 15], ['Let yourself feel it for a few breaths.', 15]])
  };
  const mins = id => {
    const t = T[id], s = t.kind === 'breath' ? t.cycles * t.ph.reduce((a, p) => a + p[1], 0) : t.steps.reduce((a, p) => a + p[1], 0);
    return s < 90 ? Math.round(s / 10) * 10 + ' sec' : Math.round(s / 60) + ' min';
  };

  const L = {
    panic: ['That sounds really scary, {n}, and I’m glad you told me. A panic wave feels huge, but it rises and passes, usually within minutes. You are safe right now.', 'Let’s calm your body first. Breathe out slowly with me.', ['sigh', 'g54321']],
    anxiety: ['That sounds exhausting, {n}. When the mind runs ahead, the body tenses up too.', 'Let’s slow things down together. Want to try one?', ['box', 'g54321', 'reframe']],
    stress: ['That’s a lot to carry, {n}. Feeling overwhelmed doesn’t mean you’re failing. It means your plate is full.', 'Let’s lower the pressure a notch first.', ['box', 'dump', 'pmr']],
    low: ['I’m really sorry it feels this heavy, {n}. Thank you for saying it out loud. Low moods make everything harder, and that’s not your fault.', 'We don’t need to fix everything. Let’s try something very small.', ['activate', 'label', 'compassion']],
    breakup: ['I’m so sorry, {n}. A breakup is a real loss, and it’s okay to grieve it. There’s no right timeline.', 'You don’t have to be okay right now. Let’s be gentle with you.', ['compassion', 'label', 'sigh']],
    grief: ['I’m so sorry for your loss, {n}. Grief comes in waves, and whatever you feel is allowed.', 'Let’s take a gentle moment for you.', ['compassion', 'label']],
    anger: ['That sounds really frustrating, {n}. Anger often shows up when something matters or a boundary got crossed.', 'Let’s let the heat settle in your body before deciding anything.', ['sigh', 'label']],
    lonely: ['Feeling alone is painful, {n}, and I’m glad you’re talking to me. You matter, even when it doesn’t feel like it.', 'Let’s try something kind and small.', ['compassion', 'activate']],
    sleep: ['Nights like that are rough, {n}. A busy mind at bedtime is very common.', 'Let’s help your body wind down. Phone down, lights low.', ['b478', 'pmr']],
    joy: ['That’s lovely to hear, {n}! I’m happy for you.', 'Let’s lock this moment in.', ['gratitude']]
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const fill = (s, n) => s.replace(/\{n\}/g, n);

  const LAB = { panic: 'panic', anxiety: 'worry', stress: 'stress', low: 'low mood', breakup: 'heartbreak', grief: 'grief', anger: 'anger', lonely: 'loneliness', sleep: 'trouble sleeping', joy: 'some good feelings' };
  const NEG = /\b(not|never|no longer|isn'?t|wasn'?t|don'?t|didn'?t)\b\s*(\w+\s+){0,2}$/i;
  const BOOST = /\b(so|really|very|extremely|completely|totally|constantly|always|literally)\b/i;
  const cut = s => s.length > 90 ? s.slice(0, 87).trim() + '…' : s;

  /* Scoring engine: reads the WHOLE message sentence by sentence.
     Each emotion collects points from its keywords. Negation ("not anxious") is ignored,
     intensifiers ("so overwhelmed") count 1.5x, later sentences count slightly more
     (people usually end with how they feel now). Top two emotions are kept. */
  function analyse(text) {
    text = text.replace(/[’‘]/g, "'");                         // phone keyboards type curly apostrophes
    if (RX[0][1].test(text)) return { top: 'crisis' };        // safety check always wins, never negated
    const sents = text.split(/[.!?\n;]+/).filter(s => s.trim()), sc = {}, snip = {}, best = {};
    sents.forEach((s, i) => {
      const boost = (BOOST.test(s) ? 1.5 : 1) * (1 + .3 * i / sents.length);
      RX.slice(1).forEach(([e, r]) => {
        const g = new RegExp(r.source, 'gi'); let m, hit = 0;
        while ((m = g.exec(s))) if (!NEG.test(s.slice(Math.max(0, m.index - 18), m.index))) hit++;
        if (!hit) return;
        const w = hit * boost * (e === 'panic' ? 2 : 1);
        sc[e] = (sc[e] || 0) + w; if (w > (best[e] || 0)) { best[e] = w; snip[e] = s.trim(); }
      });
    });
    const rank = Object.entries(sc).sort((a, b) => b[1] - a[1]);
    if (!rank.length) return {};
    const top = rank[0][0], secs = rank.slice(1, 3).filter(r => r[1] >= rank[0][1] * .25).map(r => r[0]);
    return { top, secs, snip: snip[top], scores: sc };
  }

  function reply(text, name) {
    text = text.replace(/[’‘]/g, "'");
    const a = analyse(text), e = a.top;
    if (e === 'crisis') return { e, crisis: true, text: fill('I’m really glad you told me, {n}. What you’re feeling sounds very painful, and you deserve support from a real person right now. Are you safe at this moment? Please reach out to someone who can be with you.', name) };
    if (e) {
      const [v, q, t1] = L[e];
      let out = fill(v, name);
      if (a.secs.length) out += ` I also hear ${a.secs.map(x => LAB[x]).join(' and ')} in what you shared.`;
      if (text.length > 140 && a.snip) out = fill(`Thank you for sharing all of that, {n}. What stood out to me: “${cut(a.snip)}”. `, name) + out;
      const techs = [...new Set([t1[0], ...a.secs.map(x => L[x][2][0]), ...t1.slice(1)])];
      return { e, text: out + ' ' + q, techs, read: [e, ...a.secs].map(x => LAB[x]).join(' + ') };
    }
    if (/^(hi|hello|hey|yo)\b/i.test(text.trim())) return { text: fill('Hi {n}! How are you feeling right now?', name) };
    if (/thank/i.test(text)) return { text: fill('Anytime, {n}. I’m right here.', name) };
    if (/(feel|feeling) (better|calmer|okay now)|helped/i.test(text)) return { text: fill('I’m really glad, {n}. That was you doing the work.', name) };
    return { text: fill(pick(['I’m listening, {n}. Tell me a bit more. Is it more worry, stress, sadness, or something else?', 'Thanks for sharing that, {n}. What feels heaviest right now?']), name) };
  }
  return { reply, analyse, T, M, mins };
})();