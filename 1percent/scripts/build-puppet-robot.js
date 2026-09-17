/* ============================================================
   Build the puppet robot → GLB + OBJ into frontend/models/
   Run:  node scripts/build-puppet-robot.js   (needs `three` installed)

   The robot is fully procedural (primitives + groups) with a real
   articulated rig — elbows and knees included:

     Robot (root)
     ├─ hips            (pelvis)
     ├─ torso           (chest + glowing core)
     │   ├─ shoulderL → upperArmL → elbowL → forearmL + handL
     │   ├─ shoulderR → upperArmR → elbowR → forearmR + handR
     │   └─ head       (neck, skull, face screen, eyeL, eyeR, antenna + tip)
     ├─ legL            (thighL → kneeL → shinL + footL)
     └─ legR            (thighR → kneeR → shinR + footR)

   Included animation clips (playable via THREE.AnimationMixer):
     • idle  (4.0s loop)  — gentle bob, sway, antenna wiggle
     • walk  (0.8s loop)  — real walk cycle: alternating legs, swinging
                            arms, bending elbows/knees, body bob + sway
     • wave  (2.0s once)  — right arm raised, elbow pumps the wave
     • cheer (1.6s once)  — both arms up, double hop (milestones)
     • blink (0.4s once)  — eyes squash shut and reopen
     • sit   (0.8s once)  — sits down: legs forward, knees bent, lean back

   All one-shot clips END at the rest pose so stopping them never snaps.
   The OBJ export is a static mesh bake (OBJ cannot store animation).
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

/* Resolve three — project node_modules first, sandbox fallback second */
let THREE;
try { THREE = require('three'); }
catch { THREE = require('/tmp/node_modules/three'); }

/* GLTFExporter needs FileReader in Node — minimal polyfill.
   The writer feeds it real Blobs (Node 18+ has Blob) for the binary
   chunk and the final GLB; readAsArrayBuffer must return their bytes. */
if (typeof FileReader === 'undefined') {
  global.FileReader = class {
    _finish(buf) {
      setTimeout(() => {
        this.result = buf;
        this.onloadend && this.onloadend({ target: this });
        this.onload && this.onload({ target: this });
      }, 0);
    }
    readAsDataURL(src) {
      // Used for texture images only — none in this model.
      this._finish('data:application/octet-stream;base64,');
    }
    async readAsArrayBuffer(src) {
      let bytes = new ArrayBuffer(0);
      if (src instanceof Blob) {
        bytes = await src.arrayBuffer();
      } else if (src && src.data && src.data.buffer) {
        const v = src.data;
        bytes = v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength);
      }
      this._finish(bytes);
    }
  };
}

async function loadExporters() {
  const candidates = [
    '/tmp/node_modules/three/examples/jsm/exporters/GLTFExporter.js',
    'three/examples/jsm/exporters/GLTFExporter.js'
  ];
  let gltfMod = null;
  for (const c of candidates) {
    try { gltfMod = await import(c); break; } catch (e) { /* next */ }
  }
  if (!gltfMod) throw new Error('Could not load GLTFExporter');
  let objMod = null;
  for (const c of candidates.map(s => s.replace('GLTFExporter', 'OBJExporter'))) {
    try { objMod = await import(c); break; } catch (e) { /* next */ }
  }
  if (!objMod) throw new Error('Could not load OBJExporter');

  /* Wrap FileReader so the polyfill can see the buffer being read.
     GLTFExporter calls: const reader = new FileReader(); reader.readAsArrayBuffer(view) */
  const RealFR = global.FileReader;
  const PatchedFR = class extends RealFR {
    readAsArrayBuffer(src) { this._src = src; return super.readAsArrayBuffer(src); }
  };
  global.FileReader = PatchedFR;

  return { GLTFExporter: gltfMod.GLTFExporter, OBJExporter: objMod.OBJExporter };
}

/* ---------- tiny helpers ---------- */
const q = (x, y, z) => {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  return [quat.x, quat.y, quat.z, quat.w];
};
/* keyframe-track builders: pass one euler [x,y,z] per keyframe */
const qtr = (name, times, eulers) =>
  new THREE.QuaternionKeyframeTrack(name, times, eulers.flatMap(e => q(e[0], e[1], e[2])));
const vtr = (name, times, vec3s) =>
  new THREE.VectorKeyframeTrack(name, times, vec3s.flat());

const named = (obj, name) => { obj.name = name; return obj; };

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.55,
    metalness: opts.metalness ?? 0.05,
    ...(opts.emissive ? { emissive: new THREE.Color(opts.emissive), emissiveIntensity: opts.emissiveIntensity ?? 1 } : {})
  });
}

/* ---------- palette ---------- */
const C = {
  body: 0xf4f6f8,   // ivory shell
  shade: 0xdde3e8,  // joints / pelvis
  brand: 0x059669,  // 1percent green — core, hands, feet
  screen: 0x111827, // face screen
  eye: 0x67e8f9,    // glowing cyan eyes
  amber: 0xf59e0b   // antenna tip
};

/* ---------- build the rig ---------- */
function buildRobot() {
  const robot = named(new THREE.Group(), 'Robot');

  const shell = mat(C.body);
  const shadeM = mat(C.shade);
  const brandM = mat(C.brand, { roughness: 0.4 });
  const screenM = mat(C.screen, { roughness: 0.25, metalness: 0.2 });
  const eyeM = mat(C.eye, { emissive: C.eye, emissiveIntensity: 1.4, roughness: 0.2 });
  const tipM = mat(C.amber, { emissive: C.amber, emissiveIntensity: 1.6 });

  /* hips */
  const hips = named(new THREE.Group(), 'hips');
  hips.position.set(0, 0.95, 0);
  const pelvis = named(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.4), shadeM), 'pelvis');
  hips.add(pelvis);
  robot.add(hips);

  /* torso (pivot at waist) */
  const torso = named(new THREE.Group(), 'torso');
  torso.position.set(0, 1.06, 0);
  const chest = named(new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.48, 6, 14), shell), 'chest');
  chest.position.y = 0.42;
  chest.scale.set(1.15, 1, 0.85);
  const core = named(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 20), brandM), 'core');
  core.rotation.x = Math.PI / 2;
  core.position.set(0, 0.5, 0.34);
  torso.add(chest, core);

  /* arms — shoulder → upper arm → ELBOW → forearm + hand */
  const mkArm = (side) => { // side: -1 left, +1 right
    const S = side < 0 ? 'L' : 'R';
    const shoulder = named(new THREE.Group(), `shoulder${S}`);
    shoulder.position.set(side * 0.5, 0.78, 0);

    const upperArm = named(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.36, 4, 10), shell), `upperArm${S}`);
    upperArm.position.y = -0.19;

    const elbow = named(new THREE.Group(), `elbow${S}`);
    elbow.position.y = -0.4;
    const forearm = named(new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.3, 4, 10), shell), `forearm${S}`);
    forearm.position.y = -0.16;
    const hand = named(new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), brandM), `hand${S}`);
    hand.position.y = -0.36;
    elbow.add(forearm, hand);

    shoulder.add(upperArm, elbow);
    return shoulder;
  };
  torso.add(mkArm(-1), mkArm(1));

  /* head — neck pivot, skull, face screen, eyes, antenna */
  const head = named(new THREE.Group(), 'head');
  head.position.set(0, 0.98, 0);
  const neck = named(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.14, 10), shadeM), 'neck');
  neck.position.y = -0.06;
  const skull = named(new THREE.Mesh(new THREE.SphereGeometry(0.36, 22, 18), shell), 'skull');
  skull.position.y = 0.3;
  skull.scale.set(1.12, 1, 0.95);
  const face = named(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.3, 0.09), screenM), 'faceScreen');
  face.position.set(0, 0.32, 0.31);
  const eyeGeo = new THREE.CapsuleGeometry(0.05, 0.04, 3, 8);
  const eyeL = named(new THREE.Mesh(eyeGeo, eyeM), 'eyeL');
  const eyeR = named(new THREE.Mesh(eyeGeo, eyeM), 'eyeR');
  eyeL.position.set(-0.12, 0.35, 0.37);
  eyeR.position.set(0.12, 0.35, 0.37);
  const antenna = named(new THREE.Group(), 'antenna');
  antenna.position.y = 0.64;
  const rod = named(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.26, 8), shadeM), 'antennaRod');
  rod.position.y = 0.13;
  const tip = named(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), tipM), 'antennaTip');
  tip.position.y = 0.3;
  antenna.add(rod, tip);
  head.add(neck, skull, face, eyeL, eyeR, antenna);
  torso.add(head);

  /* legs — hip → thigh → KNEE → shin + foot */
  const mkLeg = (side) => {
    const S = side < 0 ? 'L' : 'R';
    const leg = named(new THREE.Group(), `leg${S}`);
    leg.position.set(side * 0.2, 0.95, 0);

    const thigh = named(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.32, 4, 10), shell), `thigh${S}`);
    thigh.position.y = -0.24;

    const knee = named(new THREE.Group(), `knee${S}`);
    knee.position.y = -0.46;
    const shin = named(new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.28, 4, 10), shell), `shin${S}`);
    shin.position.y = -0.17;
    const foot = named(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.34), brandM), `foot${S}`);
    foot.position.set(0, -0.4, 0.05);
    knee.add(shin, foot);

    leg.add(thigh, knee);
    return leg;
  };
  robot.add(mkLeg(-1), mkLeg(1));
  robot.add(torso);

  return { robot, clips: buildClips() };
}

/* ---------- animation clips ---------- */
function buildClips() {
  const clips = [];

  /* idle — 4s loop: bob, waist sway, antenna wiggle, arm drift */
  {
    const times = [0, 1, 2, 3, 4];
    const tracks = [
      vtr('Robot.position', times, [[0, 0, 0], [0, 0.03, 0], [0, 0, 0], [0, 0.03, 0], [0, 0, 0]]),
      qtr('torso.quaternion', times, [[0, 0.05, 0.03], [0.02, 0, -0.02], [0, -0.05, -0.03], [-0.02, 0, 0.02], [0, 0.05, 0.03]]),
      qtr('head.quaternion', times, [[0, 0, 0.05], [0, 0.06, 0], [0, 0, -0.05], [0, -0.06, 0], [0, 0, 0.05]]),
      qtr('shoulderL.quaternion', times, [[0, 0, 0.12], [0, 0, 0.2], [0, 0, 0.12], [0, 0, 0.2], [0, 0, 0.12]]),
      qtr('shoulderR.quaternion', times, [[0, 0, -0.2], [0, 0, -0.12], [0, 0, -0.2], [0, 0, -0.12], [0, 0, -0.2]]),
      qtr('elbowL.quaternion', times, [[-0.18, 0, 0], [-0.3, 0, 0], [-0.18, 0, 0], [-0.3, 0, 0], [-0.18, 0, 0]]),
      qtr('elbowR.quaternion', times, [[-0.3, 0, 0], [-0.18, 0, 0], [-0.3, 0, 0], [-0.18, 0, 0], [-0.3, 0, 0]]),
      qtr('antenna.quaternion', times, [[0, 0, 0.25], [0, 0, -0.25], [0, 0, 0.25], [0, 0, -0.25], [0, 0, 0.25]])
    ];
    clips.push(new THREE.AnimationClip('idle', 4, tracks));
  }

  /* walk — 0.8s loop: real gait. Legs alternate, knees bend on the
     swing, arms counter-swing, elbows pump, body bobs twice a cycle. */
  {
    const t = [0, 0.2, 0.4, 0.6, 0.8];
    const tracks = [
      vtr('Robot.position', t, [[0, 0, 0], [0, 0.05, 0], [0, 0, 0], [0, 0.05, 0], [0, 0, 0]]),
      /* legs: negative x = forward swing, positive = back */
      qtr('legL.quaternion', t, [[0, 0, 0.02], [-0.8, 0, 0.02], [0, 0, 0.02], [0.55, 0, 0.02], [0, 0, 0.02]]),
      qtr('legR.quaternion', t, [[0, 0, -0.02], [0.55, 0, -0.02], [0, 0, -0.02], [-0.8, 0, -0.02], [0, 0, -0.02]]),
      /* knees bend while the foot lifts / swings through */
      qtr('kneeL.quaternion', t, [[0.1, 0, 0], [0.9, 0, 0], [0.25, 0, 0], [0.1, 0, 0], [0.1, 0, 0]]),
      qtr('kneeR.quaternion', t, [[0.1, 0, 0], [0.1, 0, 0], [0.25, 0, 0], [0.9, 0, 0], [0.1, 0, 0]]),
      /* arms counter-swing opposite to their same-side leg */
      qtr('shoulderL.quaternion', t, [[0, 0, 0.1], [0.6, 0, 0.1], [0, 0, 0.1], [-0.6, 0, 0.1], [0, 0, 0.1]]),
      qtr('shoulderR.quaternion', t, [[0, 0, -0.1], [-0.6, 0, -0.1], [0, 0, -0.1], [0.6, 0, -0.1], [0, 0, -0.1]]),
      qtr('elbowL.quaternion', t, [[-0.25, 0, 0], [-0.5, 0, 0], [-0.25, 0, 0], [-0.45, 0, 0], [-0.25, 0, 0]]),
      qtr('elbowR.quaternion', t, [[-0.25, 0, 0], [-0.45, 0, 0], [-0.25, 0, 0], [-0.5, 0, 0], [-0.25, 0, 0]]),
      /* torso lean + sway */
      qtr('torso.quaternion', t, [[-0.08, 0.06, 0], [-0.08, 0, 0.02], [-0.08, -0.06, 0], [-0.08, 0, -0.02], [-0.08, 0.06, 0]])
    ];
    clips.push(new THREE.AnimationClip('walk', 0.8, tracks));
  }

  /* wave — 2s once: right arm up, ELBOW pumps the wave, head tilts.
     Starts and ends at the rest pose. */
  {
    const t = [0, 0.25, 0.55, 0.85, 1.15, 1.45, 1.7, 2.0];
    const tracks = [
      qtr('shoulderR.quaternion', t,
        [[0, 0, -0.16], [0, 0, 2.65], [0, 0, 2.4], [0, 0, 2.85], [0, 0, 2.4], [0, 0, 2.85], [0, 0, 2.5], [0, 0, -0.16]]),
      qtr('elbowR.quaternion', t,
        [[-0.2, 0, 0], [-0.8, 0, 0], [-0.45, 0, 0], [-0.85, 0, 0], [-0.45, 0, 0], [-0.85, 0, 0], [-0.5, 0, 0], [-0.2, 0, 0]]),
      qtr('head.quaternion', t,
        [[0, 0, 0], [0, 0, 0.14], [0, 0, -0.12], [0, 0, 0.14], [0, 0, -0.12], [0, 0, 0.14], [0, 0, 0.08], [0, 0, 0]]),
      qtr('shoulderL.quaternion', t,
        [[0, 0, 0.1], [0, 0, 0.28], [0, 0, 0.28], [0, 0, 0.28], [0, 0, 0.28], [0, 0, 0.28], [0, 0, 0.28], [0, 0, 0.1]])
    ];
    clips.push(new THREE.AnimationClip('wave', 2, tracks));
  }

  /* cheer — 1.6s once: both arms up, two hops (milestone celebrate).
     Ends back at rest. */
  {
    const t = [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6];
    const tracks = [
      vtr('Robot.position', t,
        [[0, 0, 0], [0, 0.16, 0], [0, 0, 0], [0, 0, 0], [0, 0.16, 0], [0, 0, 0], [0, 0, 0], [0, 0.08, 0], [0, 0, 0]]),
      qtr('shoulderL.quaternion', t,
        [[0, 0, 0.15], [0, 0, 2.5], [0, 0, 2.65], [0, 0, 2.5], [0, 0, 2.65], [0, 0, 2.5], [0, 0, 2.65], [0, 0, 1.2], [0, 0, 0.15]]),
      qtr('shoulderR.quaternion', t,
        [[0, 0, -0.15], [0, 0, -2.5], [0, 0, -2.65], [0, 0, -2.5], [0, 0, -2.65], [0, 0, -2.5], [0, 0, -2.65], [0, 0, -1.2], [0, 0, -0.15]]),
      qtr('elbowL.quaternion', t,
        [[-0.2, 0, 0], [-0.7, 0, 0], [-0.6, 0, 0], [-0.7, 0, 0], [-0.6, 0, 0], [-0.7, 0, 0], [-0.6, 0, 0], [-0.4, 0, 0], [-0.2, 0, 0]]),
      qtr('elbowR.quaternion', t,
        [[-0.2, 0, 0], [-0.7, 0, 0], [-0.6, 0, 0], [-0.7, 0, 0], [-0.6, 0, 0], [-0.7, 0, 0], [-0.6, 0, 0], [-0.4, 0, 0], [-0.2, 0, 0]]),
      qtr('kneeL.quaternion', t,
        [[0, 0, 0], [0.35, 0, 0], [0, 0, 0], [0, 0, 0], [0.35, 0, 0], [0, 0, 0], [0, 0, 0], [0.2, 0, 0], [0, 0, 0]]),
      qtr('kneeR.quaternion', t,
        [[0, 0, 0], [0.35, 0, 0], [0, 0, 0], [0, 0, 0], [0.35, 0, 0], [0, 0, 0], [0, 0, 0], [0.2, 0, 0], [0, 0, 0]]),
      qtr('head.quaternion', t,
        [[0, 0, 0], [0, 0, 0.1], [0, 0, -0.1], [0, 0, 0.1], [0, 0, -0.1], [0, 0, 0.1], [0, 0, -0.1], [0, 0, 0.05], [0, 0, 0]])
    ];
    clips.push(new THREE.AnimationClip('cheer', 1.6, tracks));
  }

  /* blink — 0.4s once: both eyes squash shut then reopen */
  {
    const t = [0, 0.08, 0.16, 0.32, 0.4];
    const scaleY = [1, 0.08, 0.08, 0.08, 1];
    const mk = (n) => vtr(`${n}.scale`, t, scaleY.map(s => [1, s, 1]));
    clips.push(new THREE.AnimationClip('blink', 0.4, [mk('eyeL'), mk('eyeR')]));
  }

  /* sit — 0.8s once: settle down, legs swing forward with knees
     bending, slight lean back. Intentionally ends IN the sit pose —
     the mixer clamps and holds it until the puppet stands up. */
  {
    const t = [0, 0.35, 0.6, 0.8];
    const tracks = [
      vtr('Robot.position', t, [[0, 0, 0], [0, -0.06, 0], [0, -0.1, 0], [0, -0.1, 0]]),
      qtr('legL.quaternion', t, [[0, 0, 0.02], [-1.0, 0, 0.04], [-1.3, 0, 0.04], [-1.3, 0, 0.04]]),
      qtr('legR.quaternion', t, [[0, 0, -0.02], [-1.0, 0, -0.04], [-1.3, 0, -0.04], [-1.3, 0, -0.04]]),
      qtr('kneeL.quaternion', t, [[0, 0, 0], [0.7, 0, 0], [1.15, 0, 0], [1.15, 0, 0]]),
      qtr('kneeR.quaternion', t, [[0, 0, 0], [0.7, 0, 0], [1.15, 0, 0], [1.15, 0, 0]]),
      qtr('torso.quaternion', t, [[0, 0, 0], [-0.08, 0, 0], [-0.14, 0, 0], [-0.14, 0, 0]]),
      qtr('shoulderL.quaternion', t, [[0, 0, 0.1], [0, 0, 0.4], [0, 0, 0.5], [0, 0, 0.5]]),
      qtr('shoulderR.quaternion', t, [[0, 0, -0.1], [0, 0, -0.4], [0, 0, -0.5], [0, 0, -0.5]]),
      qtr('elbowL.quaternion', t, [[-0.2, 0, 0], [-0.35, 0, 0], [-0.45, 0, 0], [-0.45, 0, 0]]),
      qtr('elbowR.quaternion', t, [[-0.2, 0, 0], [-0.35, 0, 0], [-0.45, 0, 0], [-0.45, 0, 0]])
    ];
    clips.push(new THREE.AnimationClip('sit', 0.8, tracks));
  }

  return clips;
}

/* ---------- export ---------- */
(async () => {
  const { robot, clips } = buildRobot();
  const outDir = path.join(__dirname, '..', 'frontend', 'models');
  fs.mkdirSync(outDir, { recursive: true });

  const { GLTFExporter, OBJExporter } = await loadExporters();

  /* GLB — binary, includes scene graph + all clips */
  const glb = await new Promise((resolve, reject) => {
    new GLTFExporter().parse(robot, resolve, reject, { binary: true, animations: clips });
  });
  const glbPath = path.join(outDir, 'puppet-robot.glb');
  fs.writeFileSync(glbPath, Buffer.from(glb));
  console.log(`GLB  → ${glbPath}  (${(glb.byteLength / 1024).toFixed(1)} KB, ${clips.length} clips)`);

  /* OBJ — static geometry bake */
  const obj = new OBJExporter().parse(robot);
  const objPath = path.join(outDir, 'puppet-robot.obj');
  fs.writeFileSync(objPath, obj);
  console.log(`OBJ  → ${objPath}  (${(obj.length / 1024).toFixed(1)} KB, static mesh)`);

  console.log('clips:', clips.map(c => `${c.name}(${c.duration}s)`).join(', '));
})().catch(e => { console.error('BUILD FAILED:', e); process.exit(1); });
