/* ============================================================
   Puppet Robot — animated 3D companion for the dashboard
   ============================================================
   Loads /models/puppet-robot.glb (built by scripts/build-puppet-robot.js)
   and renders it as a small interactive companion that:

     • waves when it first appears / when clicked
     • blinks at random intervals (and closes eyes while dragged)
     • wanders slowly between course + challenge cards and sits on them
     • can be picked up and dragged anywhere (eyes close while held)
     • tumbles + falls with a bounce when dropped

   Uses the SAME three module build as the GLB (r160 UMD) — loaded
   lazily only after the dashboard data has rendered.
   ============================================================ */

(function () {
  'use strict';

  const STATE = { idle: 'idle', wander: 'wander', held: 'held', falling: 'falling', sitting: 'sitting' };
  const CFG = {
    scale: 1,             // model is authored ~2.2 units tall
    baseY: 0,             // ground level in scene units
    wanderDelay: [14, 26],// seconds between strolls
    speed: 1.1,           // walk speed (units/sec)
    fallGravity: 9.8,
    fallBounce: 0.35
  };

  let three = null;      // three module cache
  let ctx = null;        // { renderer, scene, camera, mixer, actions, parts }

  /* ---------- lazy three.js loader (ES modules from jsdelivr) ----------
     three r148+ dropped the UMD examples/js builds, so we dynamically
     import the module build + GLTFLoader addon and stash them on `three`. */
  async function loadThree() {
    if (three) return three;
    const mod = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    const { GLTFLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');
    mod.GLTFLoader = GLTFLoader;
    three = mod;
    return three;
  }

  /* ---------- card targets: where the robot may sit ---------- */
  function collectTargets() {
    const cards = [
      ...document.querySelectorAll('.dash-course-card'),
      ...document.querySelectorAll('.dash-challenge-card')
    ];
    return cards.slice(0, 12);
  }

  /* ============================================================ */
  async function init() {
    try {
      const T = await loadThree();

      const gltf = await new Promise((resolve, reject) => {
        new T.GLTFLoader().load('/models/puppet-robot.glb', resolve, undefined, reject);
      });

      buildStage(gltf, T);
      bindPointer();
      startLoop();
      greet();
    } catch (e) {
      console.warn('[PUPPET]', e.message);
    }
  }

  /* ---------- renderer + scene on a floating overlay ---------- */
  function buildStage(gltf, T) {
    const W = 190, H = 230;
    const wrap = document.createElement('div');
    wrap.id = 'puppet-stage';
    wrap.style.cssText = 'position:fixed;z-index:900;width:' + W + 'px;height:' + H + 'px;left:40px;top:40vh;pointer-events:none;';
    const canvas = document.createElement('canvas');
    canvas.width = W * 2; canvas.height = H * 2;      // 2x for crispness
    canvas.style.cssText = 'width:100%;height:100%;pointer-events:auto;cursor:grab;';
    wrap.appendChild(canvas);
    document.body.appendChild(wrap);

    const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(2);
    renderer.setSize(W, H, false);
    renderer.outputEncoding = T.sRGBEncoding;

    const scene = new T.Scene();
    scene.add(new T.HemisphereLight(0xffffff, 0x8899aa, 1.05));
    const key = new T.DirectionalLight(0xffffff, 0.9);
    key.position.set(2, 4, 3);
    scene.add(key);

    const camera = new T.PerspectiveCamera(35, W / H, 0.1, 50);
    camera.position.set(0, 1.6, 4.4);
    camera.lookAt(0, 1.05, 0);

    const model = gltf.scene;
    model.scale.setScalar(CFG.scale);
    scene.add(model);

    const mixer = new T.AnimationMixer(model);
    const actions = {};
    (gltf.animations || []).forEach(clip => {
      actions[clip.name] = mixer.clipAction(clip);
      actions[clip.name].clampWhenFinished = true;
      actions[clip.name].loop = T.LoopOnce; // overridden per-play below
    });

    ctx = {
      renderer, scene, camera, mixer, actions,
      model, wrap, canvas, W, H,
      state: STATE.idle,
      stateT: 0,
      velocity: new T.Vector3(),
      spin: new T.Vector3(),              // tumble rates while falling
      drag: null,                          // {x,y} pointer drag state
      heldPos: new T.Vector3(),
      target: null,                        // current wander destination {x, el}
      blinkTimer: 2 + Math.random() * 3,
      wanderTimer: 6 + Math.random() * CFG.wanderDelay[0],
      waveCooldown: 0
    };

    // idle loops forever; the others play once
    if (actions.idle) actions.idle.setLoop(T.LoopRepeat).play();

    // soft contact shadow (fake blob under the robot)
    const shadowTex = makeShadowTexture(T);
    const shadow = new T.Mesh(
      new T.PlaneGeometry(1.4, 1.4),
      new T.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.35, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    scene.add(shadow);
    ctx.shadow = shadow;
  }

  function makeShadowTexture(T) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 62);
    grad.addColorStop(0, 'rgba(17,24,39,0.5)');
    grad.addColorStop(1, 'rgba(17,24,39,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new T.CanvasTexture(c);
    return tex;
  }

  /* ---------- animation control ---------- */
  function playOnce(name, then) {
    const { actions } = ctx;
    const a = actions[name];
    if (!a) { then && then(); return; }
    a.reset();
    a.setLoop(T.LoopOnce);
    a.clampWhenFinished = true;
    a.play();
    const dur = a.getClip().duration;
    ctx.pending = { until: performance.now() / 1000 + dur, then };
  }

  function setState(next) {
    if (!ctx) return;
    if (ctx.state !== STATE.idle && ctx.state !== STATE.sitting) {
      // leaving a one-shot: nothing special needed
    }
    ctx.state = next;
    ctx.stateT = 0;
  }

  /* ---------- greeting ---------- */
  function greet() {
    // wave shortly after appearing
    setTimeout(() => { if (ctx && ctx.state === STATE.idle) { playOnce('wave'); ctx.waveCooldown = 8; } }, 900);
  }

  /* ---------- pointer interaction (pick up / drag / drop) ---------- */
  function bindPointer() {
    const { canvas, wrap } = ctx;
    let dragging = false;
    let lastX = 0, lastY = 0;

    const pointerPos = (e) => {
      const p = e.touches ? e.touches[0] : e;
      return { x: p.clientX, y: p.clientY };
    };

    const start = (e) => {
      const p = pointerPos(e);
      dragging = true;
      lastX = p.x; lastY = p.y;
      canvas.style.cursor = 'grabbing';
      setState(STATE.held);
      // eyes closed while held
      playOnce('blink', () => {}); // quick close at pickup
      e.preventDefault();
    };

    const move = (e) => {
      if (!dragging) return;
      const p = pointerPos(e);
      const dx = p.x - lastX, dy = p.y - lastY;
      lastX = p.x; lastY = p.y;

      // move the overlay itself — the robot hangs at its center-bottom
      const r = wrap.getBoundingClientRect();
      let nx = r.left + dx, ny = r.top + dy;
      nx = Math.max(4, Math.min(window.innerWidth - ctx.W - 4, nx));
      ny = Math.max(4, Math.min(window.innerHeight - 60, ny));
      wrap.style.left = nx + 'px';
      wrap.style.top = ny + 'px';

      // slight tilt while moving — feels carried
      ctx.model.rotation.z = Math.max(-0.4, Math.min(0.4, -dx * 0.04));

      e.preventDefault();
    };

    const end = () => {
      if (!dragging) return;
      dragging = false;
      canvas.style.cursor = 'grab';
      drop();
    };

    canvas.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);

    // click (no drag) → wave hello
    let downAt = 0, downXY = [0, 0];
    canvas.addEventListener('mousedown', () => { downAt = Date.now(); downXY = [event.clientX, event.clientY]; });
    canvas.addEventListener('mouseup', () => {
      const moved = Math.hypot((event.clientX || 0) - downXY[0], (event.clientY || 0) - downXY[1]);
      if (Date.now() - downAt < 250 && moved < 6 && ctx.waveCooldown <= 0) {
        playOnce('wave');
        ctx.waveCooldown = 6;
      }
    });
  }

  /* ---------- drop physics: tumble + bounce to rest ---------- */
  function drop() {
    const r = ctx.wrap.getBoundingClientRect();
    // anchor back into scene coordinates
    ctx.wrap.style.transition = 'none';

    setState(STATE.falling);
    ctx.velocity.set((Math.random() - 0.5) * 1.2, 0, 0);
    ctx.spin.set(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 4
    );
    ctx.fallFromY = 2.2;                 // approximate height above ground
    ctx.model.rotation.z = 0;            // hand tilt released
    ctx.wrap.style.left = Math.max(4, Math.min(window.innerWidth - ctx.W - 4, r.left)) + 'px';
  }

  /* ---------- wander: stroll to a card and sit on it ---------- */
  function pickTarget() {
    const cards = collectTargets();
    if (!cards.length) return null;
    const el = cards[Math.floor(Math.random() * cards.length)];
    const r = el.getBoundingClientRect();
    return {
      el,
      // scene-x roughly proportional to screen-x: map card center into [-2.2, 2.2]
      x: ((r.left + r.width / 2) / window.innerWidth) * 4.4 - 2.2,
      y: r.top
    };
  }

  function startWander() {
    const t = pickTarget();
    if (!t) { ctx.wanderTimer = 8; return; }
    ctx.target = t;
    setState(STATE.wander);
  }

  /* ============================================================
     Main loop
     ============================================================ */
  let lastT = performance.now() / 1000;
  function startLoop() {
    const tick = () => {
      const now = performance.now() / 1000;
      const dt = Math.min(0.05, now - lastT);
      lastT = now;
      if (ctx) update(dt, now);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function update(dt, now) {
    const { model, mixer } = ctx;
    mixer.update(dt);
    ctx.waveCooldown = Math.max(0, ctx.waveCooldown - dt);

    switch (ctx.state) {

      case STATE.idle: {
        // blink schedule
        ctx.blinkTimer -= dt;
        if (ctx.blinkTimer <= 0) {
          playOnce('blink');
          ctx.blinkTimer = 2.5 + Math.random() * 4;
        }
        // wander schedule
        ctx.wanderTimer -= dt;
        if (ctx.wanderTimer <= 0) startWander();
        break;
      }

      case STATE.wander: {
        if (!ctx.target) { setState(STATE.idle); break; }
        const destX = ctx.target.x;
        const curX = model.position.x;
        const step = CFG.speed * dt * Math.sign(destX - curX || 1);
        model.position.x += Math.abs(destX - curX) < Math.abs(step) ? (destX - curX) : step;
        // face travel direction + little walk waddle
        model.rotation.y = Math.sign(destX - curX || 1) * 0.35;
        model.position.z = Math.sin(now * 10) * 0.02;
        if (Math.abs(destX - curX) < 0.02) {
          model.position.x = destX;
          model.rotation.y = 0;
          setState(STATE.sitting);
          playOnce('sit');
          // sit for a while, then stand back up
          ctx.sitUntil = now + 6 + Math.random() * 6;
        }
        break;
      }

      case STATE.sitting: {
        if (now > (ctx.sitUntil || 0)) {
          setState(STATE.idle);
          ctx.wanderTimer = CFG.wanderDelay[0] + Math.random() * (CFG.wanderDelay[1] - CFG.wanderDelay[0]);
          ctx.wanderTimer = Math.max(10, ctx.wanderTimer);
        }
        break;
      }

      case STATE.held: {
        // gentle dangle sway while carried
        model.rotation.z += (Math.sin(now * 3) * 0.12 - model.rotation.z) * 0.1;
        ctx.blinkTimer = 0.01; // keep eyes closed while held
        if (ctx.blinkTimer <= 0) { playOnce('blink'); ctx.blinkTimer = 0.8; }
        break;
      }

      case STATE.falling: {
        ctx.velocity.y -= CFG.fallGravity * dt;
        model.position.y += ctx.velocity.y * dt;
        model.rotation.x += ctx.spin.x * dt;
        model.rotation.z += ctx.spin.z * dt;
        model.rotation.y += ctx.spin.y * dt;

        if (model.position.y <= CFG.baseY) {
          // land
          model.position.y = CFG.baseY;
          const impact = Math.abs(ctx.velocity.y);
          ctx.velocity.y = impact * CFG.fallBounce;   // bounce
          ctx.spin.multiplyScalar(0.5);               // damp tumble
          if (impact < 1.6) {
            // settled
            ctx.velocity.set(0, 0, 0);
            ctx.spin.set(0, 0, 0);
            model.rotation.x = 0;
            // ease z-rotation back upright
            const settle = () => {
              model.rotation.z *= 0.8;
              if (Math.abs(model.rotation.z) > 0.01) requestAnimationFrame(settle);
              else model.rotation.z = 0;
            };
            settle();
            setState(STATE.idle);
            ctx.blinkTimer = 1.5;
            ctx.wanderTimer = 8 + Math.random() * 10;
            // a little "oops" wave sometimes
            if (Math.random() < 0.4) playOnce('wave');
          } else {
            ctx.velocity.y *= 0.6; // second bounce smaller
          }
        }
        break;
      }
    }

    // shadow follows x, shrinks with height
    if (ctx.shadow) {
      const h = Math.max(0, model.position.y - CFG.baseY);
      ctx.shadow.position.x = model.position.x;
      const s = Math.max(0.55, 1 - h * 0.18);
      ctx.shadow.scale.setScalar(s);
      ctx.shadow.material.opacity = Math.max(0.12, 0.35 - h * 0.06);
    }

    // pending one-shot completion
    if (ctx.pending && now >= ctx.pending.until) {
      const p = ctx.pending;
      ctx.pending = null;
      p.then && p.then();
    }

    ctx.renderer.render(ctx.scene, ctx.camera);
  }

  /* ---------- page lifecycle ---------- */
  function teardown() {
    if (!ctx) return;
    ctx.renderer.dispose();
    ctx.wrap.remove();
    ctx = null;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1500));
  } else {
    setTimeout(init, 1500);
  }

  window.PuppetRobot = { init, teardown };
})();
