/* ==========================================================================
   Tanmay Khanna — portfolio
   Vanilla JavaScript, no dependencies. Modules are plain init functions.

   Contents
     0  Config + helpers
     1  Navigation, scroll progress, section rail
     2  Terminal typing
     3  Tabs
     4  Technology cross-highlighting
     5  Flow diagrams (RAG, SAGA)
     6  Agent engine walkthrough
     7  Evaluation notebook
     8  Caravan map, JerrIt scaffold
     9  Hero network (canvas)
    10  Data pipeline (canvas)
    11  Boot
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- 0. Config + helpers ---------- */

  // Set `resume` to a path or URL (for example "assets/resume.pdf") to show the Resume buttons.
  const PROFILE = { resume: '' };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const reduced = () => !!reduceMQ.matches;

  function onVisible(el, opts) {
    if (!el) return null;
    if (!('IntersectionObserver' in window)) {
      if (opts.enter) opts.enter();
      return null;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          if (opts.enter) opts.enter();
          if (opts.once) io.unobserve(el);
        } else if (opts.leave) {
          opts.leave();
        }
      });
    }, { threshold: opts.threshold == null ? 0.2 : opts.threshold });
    io.observe(el);
    return io;
  }

  function initConfig() {
    if (!PROFILE.resume) return;
    $$('[data-config="resume"]').forEach((a) => {
      a.href = PROFILE.resume;
      a.hidden = false;
    });
  }

  /* ---------- 1. Navigation, scroll progress, section rail ---------- */

  function initNav() {
    const nav = $('[data-nav]');
    const toggle = $('[data-nav-toggle]');
    const menu = $('[data-nav-menu]');
    if (!nav || !toggle || !menu) return;

    const mobile = window.matchMedia ? window.matchMedia('(max-width: 899.98px)') : { matches: false, addEventListener() {} };
    let open = false;

    function sync() {
      if (mobile.matches) {
        menu.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.firstElementChild.textContent = open ? 'Close menu' : 'Menu';
      } else {
        open = false;
        menu.hidden = false;
        toggle.setAttribute('aria-expanded', 'false');
      }
    }
    toggle.addEventListener('click', () => { open = !open; sync(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) { open = false; sync(); toggle.focus(); }
    });
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a') && mobile.matches) { open = false; sync(); }
    });
    if (mobile.addEventListener) mobile.addEventListener('change', sync);
    sync();

    // Section rail + active link
    const sheets = $$('[data-sheet]');
    const rail = $('[data-rail]');
    const links = $$('[data-nav-link]');
    if (rail) {
      sheets.forEach((s) => {
        const a = document.createElement('a');
        a.href = '#' + s.id;
        a.tabIndex = -1;
        a.dataset.rail = s.dataset.sheet;
        const label = document.createElement('span');
        label.textContent = s.dataset.railLabel || s.dataset.sheet;
        a.appendChild(label);
        rail.appendChild(a);
      });
    }
    const railLinks = rail ? $$('a', rail) : [];

    function setActive(section) {
      const key = section ? (section.dataset.navTarget || section.dataset.sheet) : null;
      links.forEach((l) => {
        if (key && l.dataset.navLink === key) l.setAttribute('aria-current', 'location');
        else l.removeAttribute('aria-current');
      });
      railLinks.forEach((l) => l.classList.toggle('is-active', !!section && l.dataset.rail === section.dataset.sheet));
    }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id === 'top' ? null : e.target); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sheets.forEach((s) => io.observe(s));
      const hero = $('#top');
      if (hero) io.observe(hero);
    }

    // Scroll progress + per-section progress line (rAF-throttled)
    let ticking = false;
    function update() {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      nav.style.setProperty('--scroll', max > 0 ? (window.scrollY / max).toFixed(4) : '0');
      sheets.forEach((s) => {
        const r = s.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        s.style.setProperty('--p', clamp((window.innerHeight * 0.55 - r.top) / Math.max(r.height, 1), 0, 1).toFixed(3));
      });
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- 2. Terminal typing ---------- */

  function initTyper() {
    const term = $('[data-typer]');
    if (!term) return;
    const items = $$('[data-type]', term);
    const texts = items.map((el) => el.dataset.type);

    if (reduced()) {
      items.forEach((el, i) => { el.textContent = texts[i]; });
      return;
    }
    items.forEach((el) => { el.textContent = ''; });

    async function typeInto(el, text, delay) {
      for (let i = 1; i <= text.length; i++) {
        el.textContent = text.slice(0, i);
        await wait(delay);
      }
    }
    async function run() {
      for (let i = 0; i < items.length; i++) {
        const fast = items[i].hasAttribute('data-fast');
        await typeInto(items[i], texts[i], fast ? 14 : 55);
        await wait(fast ? 160 : 300);
      }
    }
    onVisible(term, { once: true, threshold: 0.35, enter: run });
  }

  /* ---------- 3. Tabs ---------- */

  function initTabs() {
    $$('[data-tabs]').forEach((root) => {
      const tabs = $$('[role="tab"]', root);
      const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));

      function select(i, focus) {
        tabs.forEach((t, j) => {
          const on = j === i;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          if (panels[j]) panels[j].hidden = !on;
        });
        if (focus) tabs[i].focus();
      }
      tabs.forEach((t, i) => {
        t.addEventListener('click', () => select(i, false));
        t.addEventListener('keydown', (e) => {
          let n = null;
          if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
          else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
          else if (e.key === 'Home') n = 0;
          else if (e.key === 'End') n = tabs.length - 1;
          if (n !== null) { e.preventDefault(); select(n, true); }
        });
      });
    });
  }

  /* ---------- 4. Technology cross-highlighting ---------- */

  function initTechLinks() {
    let hover = null;
    let pinned = null;
    const buttons = $$('button.tag[data-tag]');
    buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));

    function render() {
      const id = hover || pinned;
      $$('.is-related').forEach((el) => el.classList.remove('is-related'));
      buttons.forEach((b) => {
        b.classList.toggle('is-on', !!id && b.dataset.tag === id);
        b.setAttribute('aria-pressed', String(!!pinned && b.dataset.tag === pinned));
      });
      if (!id) return;
      $$('[data-tech]').forEach((el) => {
        if (el.dataset.tech.split(' ').indexOf(id) !== -1) el.classList.add('is-related');
      });
      $$('li[data-tag], .tag--static[data-tag]').forEach((el) => {
        if (el.dataset.tag === id) el.classList.add('is-related');
      });
    }

    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest ? e.target.closest('[data-tag]') : null;
      if (t) { hover = t.dataset.tag; render(); }
    });
    document.addEventListener('mouseout', (e) => {
      const t = e.target.closest ? e.target.closest('[data-tag]') : null;
      if (t) { hover = null; render(); }
    });
    document.addEventListener('focusin', (e) => {
      const t = e.target.closest ? e.target.closest('button.tag[data-tag]') : null;
      if (t) { hover = t.dataset.tag; render(); }
    });
    document.addEventListener('focusout', (e) => {
      const t = e.target.closest ? e.target.closest('button.tag[data-tag]') : null;
      if (t) { hover = null; render(); }
    });
    buttons.forEach((b) => b.addEventListener('click', () => {
      pinned = pinned === b.dataset.tag ? null : b.dataset.tag;
      render();
    }));
  }

  /* ---------- 5. Flow diagrams ---------- */

  function createFlow(root, opts = {}) {
    const stages = $$('.flow__stage', root);
    const nodes = $$('.node', root);
    const readout = $('.flow__readout', root);
    const btn = opts.button || null;
    const btnLabel = btn ? btn.textContent : '';
    let timer = null;
    let playing = false;
    let lastText = '';

    function show(text) { if (readout) readout.textContent = text || 'Select a stage for details.'; }

    nodes.forEach((n) => {
      ['mouseenter', 'focus'].forEach((ev) => n.addEventListener(ev, () => show(n.dataset.desc)));
      ['mouseleave', 'blur'].forEach((ev) => n.addEventListener(ev, () => show(lastText)));
      n.addEventListener('click', () => show(n.dataset.desc));
    });

    function setStep(i) {
      stages.forEach((s, j) => {
        s.classList.toggle('is-active', j === i);
        s.classList.toggle('is-done', j < i);
      });
      lastText = i >= 0 ? $$('.node', stages[i]).map((n) => n.dataset.desc).join(' ') : '';
      show(lastText);
      if (opts.onStep && i >= 0) opts.onStep(i);
    }
    function stop() {
      clearTimeout(timer);
      timer = null;
      playing = false;
      if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
    }
    function reset() {
      stop();
      stages.forEach((s) => s.classList.remove('is-active', 'is-done'));
      lastText = '';
      show('');
    }
    function play(interval = 1100) {
      reset();
      playing = true;
      if (btn) { btn.disabled = true; btn.textContent = 'Running'; }
      if (opts.onStart) opts.onStart();
      let i = 0;
      const tick = () => {
        setStep(i);
        i += 1;
        if (i < stages.length) {
          timer = setTimeout(tick, interval);
        } else {
          timer = setTimeout(() => {
            stages.forEach((s) => { s.classList.remove('is-active'); s.classList.add('is-done'); });
            stop();
            if (opts.onDone) opts.onDone();
          }, interval);
        }
      };
      tick();
    }
    if (btn) btn.addEventListener('click', () => play());
    return { play, reset, isPlaying: () => playing };
  }

  function initFlows() {
    // RAG trace
    const ragRoot = $('[data-flow="rag"]');
    if (ragRoot) {
      const log = $('#rag-trace');
      const TRACE = [
        [['user', 'query received: "What changed in the deployment policy last quarter?"']],
        [['planner', 'split the question, choose retrieval tools over MCP']],
        [['bm25', 'match the exact terms in the query'], ['semantic', 'embed the query, find nearest neighbours in Qdrant']],
        [['reranking', 'merge both candidate lists, reorder against the full question']],
        [['reasoning', 'draft the answer from the top passages']],
        [['response', 'return the answer with its sources, save the turn to memory']]
      ];
      function addLine(who, text) {
        const li = document.createElement('li');
        const w = document.createElement('span');
        w.className = 'trace__who';
        w.textContent = who;
        li.appendChild(w);
        li.appendChild(document.createTextNode(text));
        log.appendChild(li);
        log.scrollTop = log.scrollHeight;
      }
      createFlow(ragRoot, {
        button: $('[data-play="rag"]'),
        onStart: () => { log.textContent = ''; },
        onStep: (i) => TRACE[i].forEach((l) => addLine(l[0], l[1])),
        onDone: () => addLine('done', 'illustrative trace finished')
      });
    }

    // SAGA pipeline
    const sagaRoot = $('[data-flow="saga"]');
    if (sagaRoot) {
      const saga = createFlow(sagaRoot, { button: $('[data-play="saga"]') });
      if (!reduced()) onVisible(sagaRoot, { once: true, threshold: 0.5, enter: () => saga.play(1300) });
    }
  }

  /* ---------- 6. Agent engine walkthrough ---------- */

  function initEngine() {
    const root = $('#agentflow');
    if (!root) return;
    const nodes = {};
    $$('.an', root).forEach((n) => { nodes[n.dataset.id] = n; });
    const actors = $$('.actor', root);
    const log = $('#agent-log', root);
    const runBtn = $('[data-agent-run]', root);
    const segBtns = $$('[data-scenario-btn]', root);

    const PATHS = {
      known: ['job', 'ingest', 'detect', 'cache', 'act', 'validate', 'approve', 'track'],
      unknown: ['job', 'ingest', 'detect', 'cache', 'llm', 'dom', 'reason', 'act', 'validate', 'approve', 'track']
    };
    const LOGS = {
      job: ['queue', 'a job posting arrives'],
      ingest: ['ingest', 'normalise the posting into a structured record'],
      detect: ['detect', 'identify the application system from the URL'],
      cache: { known: ['cache', 'hit: replay the stored workflow, no model call'], unknown: ['cache', 'miss: no stored workflow for this form, escalate'] },
      llm: ['llm agent', 'take over the unfamiliar form'],
      dom: ['observe', 'capture the DOM and accessibility tree'],
      reason: ['reasoning agent', 'choose the next action from the accessibility tree'],
      act: { known: ['browser', 'run the scripted steps'], unknown: ['browser', 'perform the action the agent chose'] },
      validate: ['validate', 'check every field against the schema before submit'],
      approve: ['human', 'pause: a person approves or rejects the application'],
      track: ['tracker', 'record the outcome']
    };

    let scenario = 'known';
    let timer = null;
    let running = false;

    function clearStates() {
      Object.keys(nodes).forEach((k) => nodes[k].classList.remove('is-active', 'is-done'));
      actors.forEach((a) => a.classList.remove('is-active'));
    }
    function addLine(who, text) {
      const li = document.createElement('li');
      const w = document.createElement('span');
      w.className = 'trace__who';
      w.textContent = who;
      li.appendChild(w);
      li.appendChild(document.createTextNode(text));
      log.appendChild(li);
      log.scrollTop = log.scrollHeight;
    }
    function stop() {
      clearTimeout(timer);
      running = false;
      runBtn.disabled = false;
      runBtn.textContent = 'Run walkthrough';
    }
    function reset() {
      stop();
      clearStates();
      log.textContent = '';
      const li = document.createElement('li');
      li.className = 'trace__idle';
      li.textContent = 'Pick a scenario and run the walkthrough.';
      log.appendChild(li);
    }
    function setScenario(name) {
      scenario = name;
      root.dataset.scenario = name;
      segBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scenarioBtn === name)));
      reset();
    }
    function run() {
      reset();
      running = true;
      runBtn.disabled = true;
      runBtn.textContent = 'Running';
      log.textContent = '';
      const path = PATHS[scenario];
      let i = 0;
      const tick = () => {
        const id = path[i];
        clearStates();
        path.slice(0, i).forEach((p) => nodes[p].classList.add('is-done'));
        nodes[id].classList.add('is-active');
        actors.forEach((a) => a.classList.toggle('is-active', a.dataset.actor === nodes[id].dataset.actor));
        const entry = LOGS[id].known ? LOGS[id][scenario] : LOGS[id];
        addLine(entry[0], entry[1]);
        i += 1;
        if (i < path.length) {
          timer = setTimeout(tick, 950);
        } else {
          timer = setTimeout(() => {
            path.forEach((p) => { nodes[p].classList.remove('is-active'); nodes[p].classList.add('is-done'); });
            actors.forEach((a) => a.classList.remove('is-active'));
            addLine('done', 'walkthrough finished. illustrative only');
            stop();
          }, 950);
        }
      };
      tick();
    }

    segBtns.forEach((b) => b.addEventListener('click', () => setScenario(b.dataset.scenarioBtn)));
    runBtn.addEventListener('click', run);
    if (!reduced()) onVisible(root, { once: true, threshold: 0.4, enter: () => { if (!running) run(); } });
  }

  /* ---------- 7. Evaluation notebook ---------- */

  function initNotebook() {
    const root = $('#notebook');
    if (!root) return;
    const STEPS = [
      ['model', 'Start with something specific: a model, a version, and a written description of what it is supposed to do.', 'e.g. detector v1 labels a clip as real or AI-generated.'],
      ['evaluation', 'Run it on data held out from training, and include the hard cases, not only the easy majority.', 'e.g. real footage with heavy compression, CGI-heavy clips, mixed content.'],
      ['failure', 'Collect the cases it gets wrong. Read them one by one before looking at any aggregate.', 'e.g. a compressed real clip flagged as AI.'],
      ['analysis', 'Group the failures and look for what they share.', 'e.g. most false positives are low-bitrate uploads.'],
      ['hypothesis', 'Write a claim that a test could prove wrong.', 'e.g. the detector reacts to compression artifacts, not generation artifacts.'],
      ['experiment', 'Design the smallest change that would test the claim.', 'e.g. re-encode the same clips at several bitrates and re-run.'],
      ['measurement', 'Measure against a baseline, and track failure cases separately from the average.', 'e.g. false-positive rate per bitrate, with the baseline alongside.'],
      ['iteration', 'Change the model, the data, or the hypothesis, then go around again. Keep the notes.', 'e.g. add compression-varied real clips to the data and re-evaluate.']
    ];
    const buttons = $$('[data-nb]', root);
    const page = $('.notebook__page', root);
    const stepEl = $('[data-nb-step]', root);
    const textEl = $('[data-nb-text]', root);
    const egEl = $('[data-nb-eg]', root);
    const runBtn = $('[data-nb-run]', root);
    let timer = null;

    function select(i) {
      buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
      stepEl.textContent = STEPS[i][0];
      textEl.textContent = STEPS[i][1];
      egEl.textContent = STEPS[i][2];
      page.classList.remove('is-turning');
      void page.offsetWidth; // restart the page-turn animation
      page.classList.add('is-turning');
    }
    function stop() {
      clearTimeout(timer);
      timer = null;
      runBtn.textContent = 'Run the loop';
    }
    function run() {
      if (timer) { stop(); return; }
      runBtn.textContent = 'Stop';
      let i = 0;
      const tick = () => {
        select(i);
        i += 1;
        if (i < STEPS.length) timer = setTimeout(tick, 2600);
        else timer = setTimeout(stop, 2600);
      };
      tick();
    }
    buttons.forEach((b, i) => b.addEventListener('click', () => { stop(); select(i); }));
    runBtn.addEventListener('click', run);
    select(0);
  }

  /* ---------- 8. Caravan map, JerrIt scaffold ---------- */

  function initCaravanMap() {
    const root = $('#caravan-map');
    if (!root) return;
    const rootBtn = $('.cmap__root', root);
    const list = $('.cmap__list', root);
    rootBtn.addEventListener('click', () => {
      const open = rootBtn.getAttribute('aria-expanded') === 'true';
      rootBtn.setAttribute('aria-expanded', String(!open));
      list.hidden = open;
    });
    $$('.cmap__mod', root).forEach((mod) => {
      const detail = mod.parentElement.querySelector('p');
      mod.addEventListener('click', () => {
        const open = mod.getAttribute('aria-expanded') === 'true';
        mod.setAttribute('aria-expanded', String(!open));
        detail.hidden = open;
      });
    });
  }

  function initScaffold() {
    const root = $('#jerrit-scaffold');
    if (!root) return;
    const tree = $('[data-scaffold-tree]', root);
    const note = $('[data-scaffold-note]', root);
    const val = (name) => root.querySelector('input[name="' + name + '"]:checked').value;

    function render() {
      const db = val('jdb');
      const lang = val('jlang');
      const ai = val('jai');
      const dbFile = lang === 'ts' ? 'db.ts' : 'db.js';
      // [prefix, name, highlighted]
      const L = [];
      L.push(['', 'my-app/', false]);
      L.push(['├── ', 'src/', false]);
      L.push(['│   ├── ', 'config/', false]);
      L.push(['│   │   ├── ', dbFile, true]);
      L.push(['│   │   └── ', 'index.js', false]);
      L.push(['│   ├── ', 'modules/', false]);
      L.push([ai === 'yes' ? '│   │   ├── ' : '│   │   └── ', 'user/', false]);
      if (ai === 'yes') L.push(['│   │   └── ', 'ai/', true]);
      L.push(['│   ├── ', 'routes/', false]);
      L.push(['│   │   └── ', 'index.js', false]);
      L.push(['│   ├── ', 'middlewares/', false]);
      L.push(['│   │   └── ', 'error.middleware.js', false]);
      L.push(['│   ├── ', 'utils/', false]);
      L.push(['│   │   └── ', 'asyncHandler.js', false]);
      L.push(['│   ├── ', 'app.js', false]);
      L.push(['│   └── ', 'server.js', false]);
      L.push(['├── ', '.env', false]);
      L.push([lang === 'ts' ? '├── ' : '└── ', 'package.json', false]);
      if (lang === 'ts') L.push(['└── ', 'tsconfig.json', true]);

      tree.textContent = '';
      L.forEach((row, i) => {
        const dim = document.createElement('span');
        dim.className = 'dim';
        dim.textContent = row[0];
        tree.appendChild(dim);
        const name = document.createElement('span');
        if (row[2]) name.className = 'hl';
        name.textContent = row[1];
        tree.appendChild(name);
        if (i < L.length - 1) tree.appendChild(document.createTextNode('\n'));
      });

      let text = db === 'mongo'
        ? 'MongoDB: Mongoose, a predefined User model with CRUD, and automatic connection setup.'
        : 'MySQL: a mysql2 connection pool and a ready-to-use CRUD layer with prebuilt queries.';
      if (ai === 'yes') text += ' AI module: an /ai/chat endpoint with the OpenAI SDK, in controller, service, and provider layers.';
      note.textContent = text;
    }
    $$('input', root).forEach((i) => i.addEventListener('change', render));
    render();
  }

  /* ---------- 9. Hero network (canvas) ---------- */

  function initNetwork() {
    const canvas = $('#net-canvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const nameEl = $('#viz-name');
    const textEl = $('#viz-text');
    const chips = $$('.chain__btn');

    const cs = getComputedStyle(document.documentElement);
    const cv = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    const C = {
      ink: cv('--ink', '#131922'), ink2: cv('--ink-2', '#47525F'), ink3: cv('--ink-3', '#6B7684'),
      cobalt: cv('--cobalt', '#2B44E6'), film: cv('--film', '#E6EAEE'), film2: cv('--film-2', '#F2F4F7'),
      amber: cv('--amber', '#E0930B')
    };
    const MONO = '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace';

    const HUBS = [
      { label: 'data', text: 'Raw audio, images, video, and medical files, filtered, checked, and deduplicated until a dataset can be trusted.', sats: ['audio', 'video', 'images', 'DICOM', 'metadata'] },
      { label: 'software', text: 'Python and Node.js services, pipelines, and tooling that move and shape that data.', sats: ['Python', 'Node.js', 'FastAPI', 'Docker'] },
      { label: 'AI', text: 'RAG, embeddings, reranking, and LLM applications built on top of the data.', sats: ['RAG', 'embeddings', 'reranking', 'LLMs'] },
      { label: 'agents', text: "LangGraph workflows, MCP tools, and browser automation, for when a fixed script isn't enough.", sats: ['LangGraph', 'MCP', 'Playwright', 'human-in-loop'] },
      { label: 'systems', text: 'The pieces wired into something that runs: pipelines, remote environments, containers, and storage.', sats: ['NAS', 'remote envs', 'automation', 'CI/CD'] },
      { label: 'evaluation', text: 'Measuring what the system does, analysing where it fails, and feeding that back into the data.', sats: ['failure analysis', 'benchmarks', 'robustness'] }
    ];

    const hubs = HUBS.map((h) => ({ label: h.label, text: h.text, bx: 0, by: 0, x: 0, y: 0, energy: 0, act: 0 }));
    const sats = [];
    HUBS.forEach((h, i) => {
      h.sats.forEach((label, k) => {
        sats.push({ hub: i, k, n: h.sats.length, label, a: 0, x: 0, y: 0, vx: 0, vy: 0, ph: Math.random() * 6.28 });
      });
    });

    let w = 1, h = 1, dpr = 1, portrait = false, R = 50;
    let cumF = [0, 0.2, 0.4, 0.6, 0.8, 1];
    let fbC = [0, 0, 0, 0];
    const mouse = { x: 0, y: 0, in: false, px: 0, py: 0 };
    const pulses = [0, 0.34, 0.67];
    let fb = 0;
    let forced = null;
    let activeIdx = -1;
    let running = false, visible = true, raf = 0, last = 0, staticQueued = false;

    function layout() {
      portrait = w < 460 || h > w * 1.12;
      const P = portrait
        ? [[0.3, 0.09], [0.7, 0.26], [0.3, 0.43], [0.7, 0.6], [0.3, 0.77], [0.7, 0.94]]
        : [[0.2, 0.26], [0.5, 0.26], [0.8, 0.26], [0.8, 0.74], [0.5, 0.74], [0.2, 0.74]];
      R = portrait ? Math.max(20, Math.min(w * 0.11, h * 0.08, 46)) : Math.max(24, Math.min(w * 0.13, h * 0.17, 72));
      hubs.forEach((hb, i) => { hb.bx = P[i][0] * w; hb.by = P[i][1] * h; hb.x = hb.bx; hb.y = hb.by; });
      let total = 0;
      const seg = [];
      for (let i = 0; i < 5; i++) { const d = Math.hypot(hubs[i + 1].bx - hubs[i].bx, hubs[i + 1].by - hubs[i].by); seg.push(d); total += d; }
      cumF = [0];
      let acc = 0;
      seg.forEach((d) => { acc += d; cumF.push(acc / total); });
      // feedback curve control points (evaluation back to data)
      if (portrait) fbC = [w * 0.985, hubs[5].by, w * 0.985, hubs[0].by];
      else { const xl = Math.max(10, hubs[5].bx - R - 34); fbC = [xl, hubs[5].by, xl, hubs[0].by]; }
      sats.forEach((s) => {
        const gap = 0.5;
        s.a = Math.PI / 2 + gap + (s.n > 1 ? s.k / (s.n - 1) : 0.5) * (Math.PI * 2 - gap * 2);
        s.x = hubs[s.hub].x + Math.cos(s.a) * R;
        s.y = hubs[s.hub].y + Math.sin(s.a) * R;
        s.vx = 0; s.vy = 0;
      });
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
      if (!running) queueStatic();
    }

    function bez(t) {
      const p0 = hubs[5], p3 = hubs[0];
      const u = 1 - t;
      return {
        x: u * u * u * p0.x + 3 * u * u * t * fbC[0] + 3 * u * t * t * fbC[2] + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * fbC[1] + 3 * u * t * t * fbC[3] + t * t * t * p3.y
      };
    }
    function pulsePos(u) {
      let i = 0;
      while (i < 4 && u >= cumF[i + 1]) i++;
      const f = clamp((u - cumF[i]) / Math.max(cumF[i + 1] - cumF[i], 0.0001), 0, 1);
      return { x: lerp(hubs[i].x, hubs[i + 1].x, f), y: lerp(hubs[i].y, hubs[i + 1].y, f) };
    }

    function setActive(i) {
      if (i === activeIdx) return;
      activeIdx = i;
      if (nameEl) nameEl.textContent = hubs[i].label;
      if (textEl) textEl.textContent = hubs[i].text;
      chips.forEach((c) => c.classList.toggle('is-active', +c.dataset.stage === i));
    }
    function autoIndex() {
      let best = 0, bd = 9;
      for (let i = 0; i < 6; i++) {
        const d = Math.abs(pulses[0] - cumF[i]);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }
    function setForced(i, until, src) { forced = { i, until, src }; if (!running) queueStatic(); }
    function clearForced(src) { if (forced && forced.src === src) { forced = null; if (!running) queueStatic(); } }

    function update(dt, t) {
      const now = performance.now();
      if (forced && forced.until < now) forced = null;
      const tx = mouse.in ? (mouse.x / w - 0.5) * 2 : 0;
      const ty = mouse.in ? (mouse.y / h - 0.5) * 2 : 0;
      mouse.px += (tx - mouse.px) * 0.06;
      mouse.py += (ty - mouse.py) * 0.06;

      hubs.forEach((hb, i) => {
        hb.x = hb.bx + Math.sin(t * 0.0005 + i * 1.3) * 3 + mouse.px * 6;
        hb.y = hb.by + Math.cos(t * 0.00042 + i) * 3 + mouse.py * 6;
        hb.energy = Math.max(0, hb.energy - dt * 1.3);
      });
      for (let p = 0; p < pulses.length; p++) {
        const prev = pulses[p];
        let u = prev + dt * 0.075;
        if (u >= 1) { u -= 1; hubs[0].energy = 1; }
        for (let i = 1; i < 6; i++) if (prev < cumF[i] && u >= cumF[i]) hubs[i].energy = 1;
        pulses[p] = u;
      }
      fb = (fb + dt * 0.14) % 1;

      sats.forEach((s) => {
        const hb = hubs[s.hub];
        const wob = 4;
        const tx2 = hb.x + Math.cos(s.a + Math.sin(t * 0.0004 + s.ph) * 0.18) * (R + Math.sin(t * 0.0006 + s.ph) * wob);
        const ty2 = hb.y + Math.sin(s.a + Math.sin(t * 0.0004 + s.ph) * 0.18) * (R + Math.sin(t * 0.0006 + s.ph) * wob);
        s.vx += (tx2 - s.x) * 0.06;
        s.vy += (ty2 - s.y) * 0.06;
        if (mouse.in) {
          const dx = s.x - mouse.x, dy = s.y - mouse.y, d = Math.hypot(dx, dy);
          if (d < 90 && d > 0.1) { const f = (1 - d / 90) * 1.7; s.vx += (dx / d) * f; s.vy += (dy / d) * f; }
        }
        s.vx *= 0.8; s.vy *= 0.8;
        s.x += s.vx; s.y += s.vy;
      });

      const act = forced ? forced.i : autoIndex();
      setActive(act);
      hubs.forEach((hb, i) => { hb.act += ((i === act ? 1 : 0) - hb.act) * 0.14; });
    }

    function staticState() {
      const now = performance.now();
      if (forced && forced.until < now) forced = null;
      const act = forced ? forced.i : 0;
      setActive(act);
      hubs.forEach((hb, i) => { hb.act = i === act ? 1 : 0; hb.energy = 0; hb.x = hb.bx; hb.y = hb.by; });
      sats.forEach((s) => {
        s.x = hubs[s.hub].bx + Math.cos(s.a) * R;
        s.y = hubs[s.hub].by + Math.sin(s.a) * R;
      });
    }

    function satLabel(s, alpha, color) {
      ctx.font = '400 10.5px ' + MONO;
      const tw = ctx.measureText(s.label).width;
      let x = s.x >= hubs[s.hub].x ? s.x + 7 : s.x - 7 - tw;
      if (x + tw > w - 4) x = s.x - 7 - tw;
      if (x < 4) x = s.x + 7;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.label, x, s.y);
      ctx.globalAlpha = 1;
    }

    function draw(animated) {
      ctx.clearRect(0, 0, w, h);
      const act = activeIdx < 0 ? 0 : activeIdx;

      // feedback edge: evaluation feeds back into data
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = C.ink3;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hubs[5].x, hubs[5].y);
      ctx.bezierCurveTo(fbC[0], fbC[1], fbC[2], fbC[3], hubs[0].x, hubs[0].y);
      ctx.stroke();
      ctx.restore();
      if (animated) {
        const p = bez(fb);
        ctx.fillStyle = C.amber;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 6.283); ctx.fill();
      }

      // chain edges, lit up to the active stage
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const lit = i < act;
        ctx.strokeStyle = lit ? C.cobalt : C.ink;
        ctx.globalAlpha = lit ? 0.9 : 0.35;
        ctx.beginPath();
        ctx.moveTo(hubs[i].x, hubs[i].y);
        ctx.lineTo(hubs[i + 1].x, hubs[i + 1].y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // hub to satellite lines
      ctx.lineWidth = 1;
      sats.forEach((s) => {
        const hb = hubs[s.hub];
        ctx.strokeStyle = C.cobalt;
        ctx.globalAlpha = 0.14 + hb.act * 0.42;
        if (hb.act < 0.3) ctx.strokeStyle = C.ink;
        ctx.beginPath(); ctx.moveTo(hb.x, hb.y); ctx.lineTo(s.x, s.y); ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // pulses
      if (animated) {
        pulses.forEach((u) => {
          const p = pulsePos(u);
          ctx.fillStyle = C.cobalt;
          ctx.globalAlpha = 0.18;
          ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, 6.283); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, 6.283); ctx.fill();
        });
      }

      // satellites
      sats.forEach((s) => {
        const hb = hubs[s.hub];
        const near = mouse.in ? Math.hypot(s.x - mouse.x, s.y - mouse.y) < 46 : false;
        const on = hb.act > 0.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, near ? 4.2 : 3, 0, 6.283);
        ctx.fillStyle = near || on ? C.cobalt : C.film2;
        ctx.fill();
        ctx.strokeStyle = near || on ? C.cobalt : C.ink2;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        const a = Math.max(hb.act, near ? 1 : 0);
        if (a > 0.03) satLabel(s, a, on || near ? C.cobalt : C.ink2);
      });

      // hubs
      hubs.forEach((hb, i) => {
        const on = i === act;
        if (hb.energy > 0.02) {
          const g = 1 + (1 - hb.energy) * 1.3;
          ctx.globalAlpha = hb.energy * 0.45;
          ctx.strokeStyle = C.cobalt;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(hb.x - 8 * g, hb.y - 8 * g, 16 * g, 16 * g);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = on ? C.cobalt : C.film2;
        ctx.strokeStyle = on ? C.cobalt : C.ink;
        ctx.lineWidth = 1.6;
        ctx.fillRect(hb.x - 8, hb.y - 8, 16, 16);
        ctx.strokeRect(hb.x - 8, hb.y - 8, 16, 16);
        if (on) { ctx.fillStyle = C.film2; ctx.fillRect(hb.x - 2.5, hb.y - 2.5, 5, 5); }
        ctx.font = (on ? '600' : '500') + ' 13px ' + MONO;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = on ? C.cobalt : C.ink;
        ctx.fillText(hb.label, hb.x, hb.y + 27);
      });

      // cursor: crosshair and links to nearby nodes
      if (mouse.in) {
        const pts = [];
        hubs.forEach((hb) => pts.push({ x: hb.x, y: hb.y }));
        sats.forEach((s) => pts.push({ x: s.x, y: s.y }));
        const near = pts
          .map((p) => ({ p, d: Math.hypot(p.x - mouse.x, p.y - mouse.y) }))
          .filter((o) => o.d < 130)
          .sort((a, b) => a.d - b.d)
          .slice(0, 4);
        ctx.strokeStyle = C.cobalt;
        ctx.lineWidth = 1;
        near.forEach((o) => {
          ctx.globalAlpha = (1 - o.d / 130) * 0.55;
          ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(o.p.x, o.p.y); ctx.stroke();
        });
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(mouse.x - 7, mouse.y); ctx.lineTo(mouse.x + 7, mouse.y);
        ctx.moveTo(mouse.x, mouse.y - 7); ctx.lineTo(mouse.x, mouse.y + 7);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    function queueStatic() {
      if (staticQueued) return;
      staticQueued = true;
      requestAnimationFrame(() => { staticQueued = false; if (!running) { staticState(); draw(false); } });
    }

    function frame(t) {
      raf = 0;
      if (!running) return;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      update(dt, t);
      draw(true);
      raf = requestAnimationFrame(frame);
    }
    function evaluate() {
      const should = visible && !document.hidden && !reduced();
      if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!should && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; queueStatic(); }
    }

    function hubAt(x, y) {
      for (let i = 0; i < hubs.length; i++) if (Math.hypot(hubs[i].x - x, hubs[i].y - y) < 26) return i;
      return -1;
    }
    function pointer(e) {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.in = true;
    }
    canvas.addEventListener('pointermove', (e) => {
      pointer(e);
      const hit = hubAt(mouse.x, mouse.y);
      if (hit >= 0) { if (!forced || forced.i !== hit || forced.src !== 'canvas') setForced(hit, Infinity, 'canvas'); }
      else clearForced('canvas');
      if (!running) queueStatic();
    });
    canvas.addEventListener('pointerdown', (e) => {
      pointer(e);
      const hit = hubAt(mouse.x, mouse.y);
      if (hit >= 0) setForced(hit, performance.now() + 6000, 'canvas-tap');
      if (!running) queueStatic();
    });
    canvas.addEventListener('pointerleave', () => {
      mouse.in = false;
      clearForced('canvas');
      if (!running) queueStatic();
    });

    chips.forEach((c) => {
      const i = +c.dataset.stage;
      ['mouseenter', 'focus'].forEach((ev) => c.addEventListener(ev, () => setForced(i, Infinity, 'chip')));
      ['mouseleave', 'blur'].forEach((ev) => c.addEventListener(ev, () => clearForced('chip')));
      c.addEventListener('click', () => setForced(i, performance.now() + 6000, 'chip-tap'));
    });

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);
    onVisible(canvas, { threshold: 0, enter: () => { visible = true; evaluate(); }, leave: () => { visible = false; evaluate(); } });
    document.addEventListener('visibilitychange', evaluate);
    if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', evaluate);

    resize();
    setActive(0);
    evaluate();
    if (!running) queueStatic();
  }

  /* ---------- 10. Data pipeline (canvas) ---------- */

  function initPipeline() {
    const canvas = $('#data-canvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const figure = canvas.closest('.pipe');
    const readout = $('#data-readout');
    const buttons = $$('[data-dstage]');

    const cs = getComputedStyle(document.documentElement);
    const cv = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    const C = { ink: cv('--ink', '#131922'), ink2: cv('--ink-2', '#47525F'), cobalt: cv('--cobalt', '#2B44E6'), amber: cv('--amber', '#E0930B') };
    const MONO = '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace';

    const STAGES = [
      { name: 'source', lines: ['source'], text: 'Raw material in whatever shape it arrives: audio, images, video, medical files, and mixed archives.' },
      { name: 'procurement', lines: ['procurement'], text: 'Getting data from where it lives to where it can be processed, across multiple remote environments.' },
      { name: 'filtering', lines: ['filtering'], text: "Dropping what doesn't belong: the wrong format, language, modality, or content, such as filtering DICOM files." },
      { name: 'quality control', lines: ['quality', 'control'], text: 'Checks on structure, metadata, and integrity, so nothing downstream has to trust broken data.' },
      { name: 'deduplication', lines: ['deduplication'], text: 'Finding near-duplicates in bulk, for example with cosine similarity on audio, instead of only exact matches.' },
      { name: 'transformation', lines: ['transformation'], text: 'Structuring and normalising: consistent formats, cleaned metadata, and PII removal.' },
      { name: 'processing', lines: ['processing'], text: 'Sampling, scripting, and automation that make TB-scale workflows repeatable.' },
      { name: 'archival', lines: ['archival'], text: 'NAS archival and data movement, so datasets stay organised and recoverable.' },
      { name: 'AI dataset', lines: ['AI', 'dataset'], text: 'The output: a dataset a model can be trained or evaluated on, and one you can explain.' }
    ];
    const N = STAGES.length;
    const REDUCE = { 2: 0.16, 3: 0.08, 4: 0.14 }; // how much the stream narrows after each filtering stage
    const S = (i) => i / (N - 1);
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    const widthAt = (s) => {
      let wd = 1;
      Object.keys(REDUCE).forEach((k) => { wd -= REDUCE[k] * smooth(S(+k) - 0.035, S(+k) + 0.035, s); });
      return wd;
    };

    let w = 1, h = 1, dpr = 1, vertical = false, lane = 44, a0 = 46, a1 = 700, mid = 170, cx = 110;
    let parts = [];
    let acc = 0, glow = 0;
    let forced = null;
    let running = false, visible = true, raf = 0, last = 0, staticQueued = false;
    let lastHover = -1;

    function P(s, l) {
      const off = l * lane * widthAt(s);
      return vertical ? { x: cx + off, y: a0 + s * (a1 - a0) } : { x: a0 + s * (a1 - a0), y: mid + off };
    }
    const perp = () => (vertical ? { x: -1, y: 0 } : { x: 0, y: 1 });

    function makePart(s) {
      const r = Math.random();
      return {
        s, l: (Math.random() * 2 - 1) * 0.9, spd: 0.085 * (0.85 + Math.random() * 0.3),
        fate: r < 0.2 ? 2 : r < 0.3 ? 3 : r < 0.44 ? 4 : 99, state: 'flow', out: 0, ph: Math.random() * 6.28
      };
    }
    function seedStatic() {
      parts = [];
      for (let i = 0; i < 70; i++) {
        const p = makePart(Math.random());
        if (p.fate < 99 && p.s >= S(p.fate)) { p.state = 'out'; p.out = Math.random() * 0.9; }
        parts.push(p);
      }
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      vertical = w < 820;
      const H = vertical ? 640 : 290;
      if (figure) figure.style.setProperty('--pipe-h', H + 'px');
      h = H;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (vertical) { lane = 34; cx = Math.min(120, w * 0.3); a0 = 34; a1 = h - 40; }
      else { lane = 44; a0 = 50; a1 = w - 60; mid = 170; }
      if (!running) { seedStatic(); queueStatic(); }
    }

    function select(i, sticky) {
      forced = { i, until: performance.now() + (sticky ? 6000 : 4500) };
      if (readout) readout.textContent = STAGES[i].name + '. ' + STAGES[i].text;
      buttons.forEach((b) => b.classList.toggle('is-active', +b.dataset.dstage === i));
      if (!running) queueStatic();
    }

    function update(dt) {
      acc += dt;
      if (acc > 0.09 && parts.length < 80) { acc = 0; parts.push(makePart(0)); }
      glow = Math.max(0, glow - dt * 0.4);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.s += p.spd * dt * (p.state === 'out' ? 0.3 : 1);
        if (p.state === 'flow') {
          if (p.fate < 99 && p.s >= S(p.fate)) { p.state = 'out'; p.out = 0; }
          else if (p.s >= 1) { glow = Math.min(1, glow + 0.08); parts.splice(i, 1); }
        } else {
          p.out += dt;
          if (p.out > 1.1) parts.splice(i, 1);
        }
      }
    }

    function draw(t, animated) {
      ctx.clearRect(0, 0, w, h);
      const now = performance.now();
      if (forced && forced.until < now) forced = null;
      const active = forced ? forced.i : (animated ? Math.floor(t / 2600) % N : -1);

      // pipe outline
      const top = [], bot = [];
      for (let k = 0; k <= 60; k++) { const s = k / 60; top.push(P(s, -1)); bot.push(P(s, 1)); }
      ctx.beginPath();
      top.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      for (let k = bot.length - 1; k >= 0; k--) ctx.lineTo(bot[k].x, bot[k].y);
      ctx.closePath();
      ctx.globalAlpha = 0.06; ctx.fillStyle = C.cobalt; ctx.fill();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.25;
      ctx.beginPath(); top.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      ctx.beginPath(); bot.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      ctx.globalAlpha = 1;

      // stations
      for (let i = 0; i < N; i++) {
        const s = S(i);
        const a = P(s, -1), b = P(s, 1);
        const on = i === active;
        const gate = REDUCE[i] != null;
        const ext = vertical ? { x: 8, y: 0 } : { x: 0, y: 8 };
        if (on) {
          ctx.globalAlpha = 0.1; ctx.fillStyle = C.cobalt;
          if (vertical) ctx.fillRect(a.x - 12, a.y - 14, b.x - a.x + 24, 28);
          else ctx.fillRect(a.x - 14, a.y - 12, 28, b.y - a.y + 24);
          ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = on ? C.cobalt : C.ink;
        ctx.globalAlpha = on ? 1 : (gate ? 0.75 : 0.4);
        ctx.lineWidth = on ? 2.5 : (gate ? 2 : 1);
        ctx.beginPath();
        ctx.moveTo(a.x - ext.x, a.y - ext.y);
        ctx.lineTo(b.x + ext.x, b.y + ext.y);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.fillStyle = on ? C.cobalt : C.ink;
        ctx.textBaseline = 'middle';
        if (vertical) {
          ctx.font = (on ? '500' : '400') + ' 11.5px ' + MONO;
          ctx.textAlign = 'left';
          ctx.fillText(STAGES[i].name, cx + lane + 24, a.y);
        } else {
          ctx.font = (on ? '500' : '400') + ' 10px ' + MONO;
          ctx.textAlign = 'center';
          const ls = STAGES[i].lines;
          const baseY = mid - lane - 22 - (ls.length - 1) * 12;
          ls.forEach((ln, k) => ctx.fillText(ln, a.x, baseY + k * 12));
        }
      }

      // particles
      parts.forEach((p) => {
        const base = P(p.s, p.l + (p.state === 'flow' ? Math.sin(t * 0.002 + p.ph) * 0.05 : 0));
        let x = base.x, y = base.y, alpha = 1, color = p.s > S(5) ? C.cobalt : C.ink2;
        if (p.state === 'out') {
          const d = perp();
          x += d.x * p.out * 70; y += d.y * p.out * 70;
          alpha = Math.max(0, 1 - p.out / 1.1);
          color = C.amber;
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x - 2.2, y - 2.2, 4.4, 4.4);
      });
      ctx.globalAlpha = 1;

      // collector at the end of the pipe
      const e = P(1, 0);
      ctx.globalAlpha = 0.25 + 0.75 * (running ? glow : 0.6);
      ctx.fillStyle = C.cobalt;
      ctx.fillRect(e.x - 6, e.y - 6, 12, 12);
      ctx.globalAlpha = 1;
    }

    function queueStatic() {
      if (staticQueued) return;
      staticQueued = true;
      requestAnimationFrame(() => { staticQueued = false; if (!running) draw(0, false); });
    }
    function frame(t) {
      raf = 0;
      if (!running) return;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      update(dt);
      draw(t, true);
      raf = requestAnimationFrame(frame);
    }
    function evaluate() {
      const should = visible && !document.hidden && !reduced();
      if (should && !running) { running = true; parts = []; last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!should && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; seedStatic(); queueStatic(); }
    }

    buttons.forEach((b) => {
      const i = +b.dataset.dstage;
      ['mouseenter', 'focus'].forEach((ev) => b.addEventListener(ev, () => select(i, false)));
      b.addEventListener('click', () => select(i, true));
    });
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const along = vertical ? y : x;
      const across = vertical ? x : y;
      const centre = vertical ? cx : mid;
      const idx = Math.round(((along - a0) / (a1 - a0)) * (N - 1));
      if (idx < 0 || idx >= N) return;
      const spacing = (a1 - a0) / (N - 1);
      const near = Math.abs(along - (a0 + idx * spacing)) < spacing * 0.5;
      const inBand = across > centre - lane - 60 && across < centre + lane + 40;
      if (near && inBand && idx !== lastHover) { lastHover = idx; select(idx, false); }
    });
    canvas.addEventListener('pointerleave', () => { lastHover = -1; });

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);
    onVisible(canvas, { threshold: 0.05, enter: () => { visible = true; evaluate(); }, leave: () => { visible = false; evaluate(); } });
    document.addEventListener('visibilitychange', evaluate);
    if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', evaluate);

    resize();
    evaluate();
    if (!running) { seedStatic(); queueStatic(); }
  }

  /* ---------- 11. Boot ---------- */

  function boot() {
    [initConfig, initNav, initTyper, initTabs, initTechLinks, initFlows, initEngine, initNotebook,
      initCaravanMap, initScaffold, initNetwork, initPipeline].forEach((fn) => {
      try { fn(); } catch (err) { console.error('[portfolio] ' + fn.name + ' failed', err); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
