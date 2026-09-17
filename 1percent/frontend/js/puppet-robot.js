/* ============================================================
   Puppet Robot — animated 3D companion that lives on the page
   ============================================================
   Loads /models/puppet-robot.glb (built by scripts/build-puppet-robot.js).

   Behaviour (all movement is SCREEN-space — it walks the real page):
     • enters from the RIGHT edge, walking in, then waves hello
     • wanders the floor, picks a course/challenge card, walks to it,
       CLIMBS up onto its top edge and sits there (follows on scroll)
     • climbs back down when it's done sitting
     • blinks at random; eyes stay shut while you drag it
     • draggable anywhere — tumble + bounce fall on release,
       landing on the floor OR on top of a card beneath it
     • speech bubbles, milestone celebrate() hook
   ============================================================ */

(function () {
  'use strict';

  const STATE = {
    enter: 'enter', idle: 'idle', walk: 'walk',
    climb: 'climb', sit: 'sit', climbdown: 'climbdown',
    fall: 'fall', held: 'held'
  };
  const CFG = {
    speed: 130,          // px/sec walking
    climbSpeed: 240,     // px/sec climbing
    gravity: 1500,       // px/sec² falling
    bounce: 0.32,
    rest: 6              // px tolerance for "arrived"
  };

  let three = null;
  let ctx = null;

  /* ---------- lazy three.js loader (uses the page importmap) ---------- */
  async function loadThree() {
    if (three) return three;
    if (!document.querySelector('script[type="importmap"]')) {
      const im = document.createElement('script');
      im.type = 'importmap';
      im.innerHTML = JSON.stringify({
        imports: {
          three: 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
          'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/'
        }
      });
      document.head.appendChild(im);
    }
    const mod = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    // Module namespace objects are sealed — copy exports into a plain object
    // so we can bundle GLTFLoader (an addon) alongside them.
    three = { ...mod, GLTFLoader };
    return three;
  }

  /* ---------- cards the puppet may climb ---------- */
  function collectTargets() {
    return [
      ...document.querySelectorAll('.dash-course-card'),
      ...document.querySelectorAll('.dash-challenge-card')
    ].slice(0, 14);
  }
  const floorY = () => window.innerHeight - 8;   // puppet feet line

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
    } catch (e) {
      console.warn('[PUPPET]', e.message);
    }
  }

  function buildStage(gltf, T) {
    const W = 170, H = 210;
    const wrap = document.createElement('div');
    wrap.id = 'puppet-stage';
    wrap.style.cssText = `position:fixed;z-index:900;width:${W}px;height:${H}px;left:0;top:0;pointer-events:none;will-change:transform;`;
    const canvas = document.createElement('canvas');
    canvas.width = W * 2; canvas.height = H * 2;
    canvas.style.cssText = 'width:100%;height:100%;pointer-events:auto;cursor:grab;';
    wrap.appendChild(canvas);
    document.body.appendChild(wrap);

    const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(2);
    renderer.setSize(W, H, false);
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = T.SRGBColorSpace;

    const scene = new T.Scene();
    scene.add(new T.HemisphereLight(0xffffff, 0x8899aa, 1.05));
    const key = new T.DirectionalLight(0xffffff, 0.9);
    key.position.set(2, 4, 3);
    scene.add(key);

    const camera = new T.PerspectiveCamera(35, W / H, 0.1, 50);
    camera.position.set(0, 1.6, 4.4);
    camera.lookAt(0, 1.05, 0);

    const model = gltf.scene;
    scene.add(model);

    const mixer = new T.AnimationMixer(model);
    const actions = {};
    (gltf.animations || []).forEach(clip => {
      const a = mixer.clipAction(clip);
      a.clampWhenFinished = true;
      actions[clip.name] = a;
    });
    if (actions.idle) actions.idle.setLoop(T.LoopRepeat).play();

    const shadowTex = makeShadowTexture(T);
    const shadow = new T.Mesh(
      new T.PlaneGeometry(1.4, 1.4),
      new T.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.35, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    scene.add(shadow);

    ctx = {
      T, renderer, scene, camera, mixer, actions, model, shadow,
      wrap, canvas, W, H,
      px: window.innerWidth + 60,      // start off-screen RIGHT
      py: floorY() - H,                // standing on the floor
      facing: -1,                      // walking in from the right → face left
      state: STATE.enter,
      velocityY: 0, spinX: 0, spinZ: 0,
      target: null,                    // { el, x, y } screen coords, re-read live
      sitUntil: 0,
      blinkTimer: 2 + Math.random() * 3,
      wanderTimer: 5 + Math.random() * 4,
      chatTimer: 22,
      waveCooldown: 0,
      pending: null,
      bubbleTimer: 0
    };
    place();
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
    return new T.CanvasTexture(c);
  }

  /* position the overlay so the FEET sit at (px, py+H) */
  function place() {
    ctx.wrap.style.transform = `translate(${Math.round(ctx.px)}px, ${Math.round(ctx.py)}px)`;
  }
  const feetY = () => ctx.py + ctx.H;

  /* ---------- clip control ---------- */
  function playOnce(name) {
    const a = ctx.actions[name];
    if (!a) return;
    a.reset();
    a.setLoop(ctx.T.LoopOnce);
    a.clampWhenFinished = true;
    a.play();
    ctx.pending = { until: performance.now() / 1000 + a.getClip().duration };
  }

  function setState(next) {
    ctx.state = next;
  }

  /* ---------- speech bubbles ---------- */
  const SIT_LINES = ['This one looks fun! 📚', 'Shall we start here?', 'I\'ll wait right here 👀', 'You\'ve got this! 💪', 'Psst… try a challenge too!', 'Learning time! ☕'];
  const IDLE_LINES = ['Need a hand? 👋', 'Keep that streak alive! 🔥', 'One lesson a day! ✨', '*hums robot tune* 🎵'];
  const DROP_LINES = ['Wheee! 😵', 'I\'m okay!', 'Nice catch!', '*dizzy* 🌟'];
  const CLIMB_LINES = ['Let me get up there…', 'Up I go! 🧗', 'Coming through!'];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function say(text, ms = 2600) {
    if (!ctx) return;
    let b = ctx.wrap.querySelector('.puppet-bubble');
    if (!b) {
      b = document.createElement('div');
      b.className = 'puppet-bubble';
      b.style.cssText = 'position:absolute;left:62%;top:-4px;transform:translateX(-50%);max-width:190px;'
        + 'background:#fff;border:1.5px solid #0d6e3f;border-radius:12px;padding:7px 11px;font:600 11.5px Inter,sans-serif;'
        + 'color:#111827;box-shadow:0 4px 14px rgba(13,110,63,.18);pointer-events:none;white-space:nowrap;z-index:2;'
        + 'transition:opacity .25s, transform .25s;opacity:0;';
      const tail = document.createElement('span');
      tail.style.cssText = 'position:absolute;left:18%;bottom:-6px;width:10px;height:10px;background:#fff;'
        + 'border-left:1.5px solid #0d6e3f;border-bottom:1.5px solid #0d6e3f;transform:rotate(-45deg);';
      b.appendChild(tail);
      const span = document.createElement('span');
      span.className = 'puppet-bubble-text';
      b.appendChild(span);
      ctx.wrap.appendChild(b);
    }
    b.querySelector('.puppet-bubble-text').textContent = text;
    requestAnimationFrame(() => {
      b.style.opacity = '1';
      b.style.transform = 'translateX(-50%) translateY(-4px)';
    });
    clearTimeout(ctx.bubbleTimer);
    ctx.bubbleTimer = setTimeout(() => {
      b.style.opacity = '0';
      b.style.transform = 'translateX(-50%) translateY(0)';
    }, ms);
  }

  /* ---------- pointer interaction ---------- */
  function bindPointer() {
    const { canvas } = ctx;
    let dragging = false, lastX = 0, lastY = 0, downAt = 0, downXY = [0, 0];

    const pos = (e) => { const p = e.touches ? e.touches[0] : e; return { x: p.clientX, y: p.clientY }; };

    const start = (e) => {
      const p = pos(e);
      dragging = true; lastX = p.x; lastY = p.y;
      downAt = Date.now(); downXY = [p.x, p.y];
      canvas.style.cursor = 'grabbing';
      setState(STATE.held);
      say(pick(['Up we go! ✋', 'Careful…', '*eyes squeezed shut*']), 1800);
      e.preventDefault();
    };

    const move = (e) => {
      if (!dragging) return;
      const p = pos(e);
      ctx.px = Math.max(4, Math.min(window.innerWidth - ctx.W - 4, ctx.px + (p.x - lastX)));
      ctx.py = Math.max(4, Math.min(window.innerHeight - 60, ctx.py + (p.y - lastY)));
      lastX = p.x; lastY = p.y;
      place();
      // carried tilt
      ctx.model.rotation.z = Math.max(-0.4, Math.min(0.4, -(p.x - downXY[0]) * 0.004));
      e.preventDefault();
    };

    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      canvas.style.cursor = 'grab';
      if (ctx.actions.blink) ctx.actions.blink.stop(); // eyes may reopen
      const p = e.changedTouches ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY } : { x: event.clientX, y: event.clientY };
      const moved = Math.hypot(p.x - downXY[0], p.y - downXY[1]);
      if (Date.now() - downAt < 250 && moved < 6) {
        // a tap, not a drag → wave hello
        setState(STATE.idle);
        ctx.py = floorY() - ctx.H;
        place();
        if (ctx.waveCooldown <= 0) { playOnce('wave'); ctx.waveCooldown = 6; }
        return;
      }
      drop();
    };

    canvas.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
  }

  /* ---------- fall: land on floor or on a card below ---------- */
  function landingYFor(centerX, fromY) {
    // highest surface strictly below the robot's feet
    let best = floorY();
    for (const el of collectTargets()) {
      const r = el.getBoundingClientRect();
      if (centerX >= r.left && centerX <= r.right) {
        const top = r.top;
        if (top >= fromY - 4 && top < best) best = top;
      }
    }
    return best;
  }

  function drop() {
    setState(STATE.fall);
    say(pick(DROP_LINES), 1800);
    ctx.model.rotation.z = 0;
    ctx.velocityY = 0;
    ctx.spinX = (Math.random() - 0.5) * 6;
    ctx.spinZ = (Math.random() - 0.5) * 6;
    ctx.landY = landingYFor(ctx.px + ctx.W / 2, feetY());
  }

  /* ---------- wander ---------- */
  function pickTarget() {
    const cards = collectTargets();
    if (!cards.length) return null;
    return { el: cards[Math.floor(Math.random() * cards.length)] };
  }

  function startWander() {
    const t = pickTarget();
    if (!t) { ctx.wanderTimer = 8; return; }
    ctx.target = t;
    setState(STATE.walk);
  }

  /* ============================================================
     Main loop — screen-space brain, scene-space animation
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
    const { model, mixer, actions } = ctx;
    mixer.update(dt);
    ctx.waveCooldown = Math.max(0, ctx.waveCooldown - dt);

    const walkWaddle = () => { model.rotation.z = Math.sin(now * 13) * 0.07; };

    switch (ctx.state) {

      case STATE.enter: {
        // walk in from the right edge
        ctx.px -= CFG.speed * 1.4 * dt;
        ctx.py = floorY() - ctx.H;
        ctx.facing = -1;
        walkWaddle();
        place();
        if (ctx.px <= window.innerWidth * 0.68) {
          setState(STATE.idle);
          model.rotation.z = 0;
          playOnce('wave');
          ctx.waveCooldown = 8;
          say('Hello! I\'m Bit 🤖', 3000);
          ctx.wanderTimer = 7;
        }
        break;
      }

      case STATE.idle: {
        // face last direction, breathe
        model.rotation.z *= 0.9;
        model.rotation.y += (ctx.facing * 0.3 - model.rotation.y) * 0.08;

        ctx.blinkTimer -= dt;
        if (ctx.blinkTimer <= 0) { playOnce('blink'); ctx.blinkTimer = 2.5 + Math.random() * 4; }

        ctx.chatTimer -= dt;
        if (ctx.chatTimer <= 0) { say(pick(IDLE_LINES)); ctx.chatTimer = 25 + Math.random() * 20; }

        ctx.wanderTimer -= dt;
        if (ctx.wanderTimer <= 0) startWander();
        break;
      }

      case STATE.walk: {
        const el = ctx.target?.el;
        if (!el || !document.contains(el)) { ctx.target = null; setState(STATE.idle); ctx.wanderTimer = 5; break; }
        const r = el.getBoundingClientRect();
        const destX = r.left + r.width / 2 - ctx.W / 2;
        const dx = destX - ctx.px;
        if (Math.abs(dx) > CFG.rest) {
          ctx.facing = Math.sign(dx);
          ctx.px += Math.sign(dx) * Math.min(Math.abs(dx), CFG.speed * dt);
          walkWaddle();
        } else {
          // arrived at the card's x → climb to its top edge
          model.rotation.z = 0;
          const destY = r.top - ctx.H + 14;   // sit slightly overlapping the top edge
          if (Math.abs(destY - ctx.py) > CFG.rest) {
            setState(STATE.climb);
            say(pick(CLIMB_LINES), 1800);
          } else {
            arriveSit(now);
          }
        }
        place();
        break;
      }

      case STATE.climb: {
        const el = ctx.target?.el;
        if (!el || !document.contains(el)) { setState(STATE.fall); ctx.landY = floorY(); break; }
        const r = el.getBoundingClientRect();
        const destY = r.top - ctx.H + 14;
        const dy = destY - ctx.py;
        // little scramble up with a hop arc
        ctx.py += Math.sign(dy) * Math.min(Math.abs(dy), CFG.climbSpeed * dt);
        model.rotation.z = Math.sin(now * 18) * 0.12;
        place();
        if (Math.abs(destY - ctx.py) <= CFG.rest) arriveSit(now);
        break;
      }

      case STATE.sit: {
        const el = ctx.target?.el;
        if (!el || !document.contains(el)) { // card vanished (filter change) → fall
          ctx.target = null; setState(STATE.fall); ctx.landY = floorY(); break;
        }
        // follow the card while sitting (scroll / reflow safe)
        const r = el.getBoundingClientRect();
        ctx.px = r.left + r.width / 2 - ctx.W / 2;
        ctx.py = r.top - ctx.H + 14;
        place();
        if (now > ctx.sitUntil) {
          setState(STATE.climbdown);
        }
        break;
      }

      case STATE.climbdown: {
        const destY = floorY() - ctx.H;
        const dy = destY - ctx.py;
        if (Math.abs(dy) > CFG.rest) {
          ctx.py += Math.sign(dy) * Math.min(Math.abs(dy), CFG.climbSpeed * dt);
          model.rotation.z = Math.sin(now * 18) * 0.1;
          place();
        } else {
          ctx.py = destY;
          model.rotation.z = 0;
          setState(STATE.idle);
          ctx.wanderTimer = 10 + Math.random() * 12;
        }
        break;
      }

      case STATE.held: {
        // eyes parked shut while carried
        if (actions.blink) {
          actions.blink.setLoop(ctx.T.LoopOnce);
          actions.blink.clampWhenFinished = true;
          if (!actions.blink.isRunning()) actions.blink.play();
          if (actions.blink.time >= 0.16) actions.blink.time = 0.08;
        }
        // gentle dangle
        model.rotation.z += (Math.sin(now * 3) * 0.12 - model.rotation.z) * 0.1;
        break;
      }

      case STATE.fall: {
        ctx.velocityY += CFG.gravity * dt;
        ctx.py += ctx.velocityY * dt;
        model.rotation.x += ctx.spinX * dt;
        model.rotation.z += ctx.spinZ * dt;

        const landY = ctx.landY ?? floorY();
        if (feetY() >= landY) {
          ctx.py = landY - ctx.H;
          const impact = ctx.velocityY;
          ctx.velocityY = impact * CFG.bounce;
          ctx.spinX *= 0.5; ctx.spinZ *= 0.5;
          if (impact < 320) {
            // settled
            ctx.velocityY = 0; ctx.spinX = 0; ctx.spinZ = 0;
            model.rotation.x = 0;
            const settle = () => {
              model.rotation.z *= 0.8;
              if (Math.abs(model.rotation.z) > 0.01) requestAnimationFrame(settle);
              else model.rotation.z = 0;
            };
            settle();
            place();
            // did we land on top of a card? then just sit there a while
            const onCard = collectTargets().find(el => {
              const r = el.getBoundingClientRect();
              return Math.abs(r.top - landY) < 4 && ctx.px + ctx.W / 2 >= r.left && ctx.px + ctx.W / 2 <= r.right;
            });
            if (onCard) {
              ctx.target = { el: onCard };
              arriveSit(now, 4000);
            } else {
              setState(STATE.idle);
              ctx.blinkTimer = 1.2;
              ctx.wanderTimer = 8 + Math.random() * 8;
              if (Math.random() < 0.4) playOnce('wave');
            }
          }
          place();
        }
        break;
      }
    }

    /* ---------- shared cosmetics ---------- */
    // shadow under the feet
    if (ctx.shadow) {
      const h = Math.max(0, (floorY() - feetY()));
      const s = Math.max(0.55, 1 - h * 0.0012);
      ctx.shadow.scale.setScalar(s);
      ctx.shadow.material.opacity = Math.max(0.1, 0.35 - h * 0.0009);
    }

    // pending one-shot clip finished
    if (ctx.pending && now >= ctx.pending.until) ctx.pending = null;
  }

  function arriveSit(now, dur) {
    const el = ctx.target?.el;
    setState(STATE.sit);
    playOnce('sit');
    ctx.sitUntil = now + (dur || 6 + Math.random() * 6);
    if (el) {
      const title = el.querySelector('h4')?.textContent
        || el.querySelector('.ch-title')?.textContent
        || el.querySelector('strong')?.textContent || '';
      say(title ? `"${title.slice(0, 34)}" — nice pick!` : pick(SIT_LINES));
    } else {
      say(pick(SIT_LINES));
    }
  }

  /* ---------- page lifecycle ---------- */
  function teardown() {
    if (!ctx) return;
    ctx.renderer.dispose();
    ctx.wrap.remove();
    ctx = null;
  }

  /* Milestone celebration — called by dashboard._celebrate() */
  function celebrate() {
    if (!ctx || ctx.state === STATE.held || ctx.state === STATE.fall) return;
    playOnce('wave');
    ctx.waveCooldown = 6;
    say(pick(['You did it! 🎉', 'Amazing work! 🌟', 'Level up! 🚀', 'So proud of you! 💚', 'On a roll! 🔥']), 3200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1200));
  } else {
    setTimeout(init, 1200);
  }

  window.PuppetRobot = { init, teardown, celebrate, say: (t, m) => say(t, m) };
})();
