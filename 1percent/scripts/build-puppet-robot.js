/* ============================================================
   Build the puppet robot → GLB + OBJ into frontend/models/
   Run:  NODE_PATH=/tmp/node_modules node scripts/build-puppet-robot.js
         (or `npm i three` first, then just: node scripts/build-puppet-robot.js)

   The robot is fully procedural (primitives + groups), so the
   exported GLB carries a real scene graph:

     Robot (root)
     ├─ hips            (pelvis)
     ├─ torso           (chest + glowing core)
     │   ├─ shoulderL → armL + handL
     │   ├─ shoulderR → armR + handR
     │   └─ head       (skull, face screen, eyeL, eyeR, antenna + tip)
     ├─ legL            (thigh + footL)
     └─ legR            (thigh + footR)

   Included animation clips (playable via THREE.AnimationMixer):
     • idle  (4.0s loop)  — gentle bob, sway, antenna wiggle
     • wave  (2.0s once)  — right arm raised + hand wave, greeting
     • blink (0.4s once)  — eyes squash shut and reopen
     • sit   (0.8s once)  — drops into a sitting pose (legs forward)

   The OBJ export is a static mesh bake (no animation — OBJ cannot
   store it, and three's OBJExporter writes geometry only).
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
  hips.position.set(0, 1.02, 0);
  const pelvis = named(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.42), shadeM), 'pelvis');
  hips.add(pelvis);
  robot.add(hips);

  /* torso (pivot at waist) */
  const torso = named(new THREE.Group(), 'torso');
  torso.position.set(0, 1.1, 0);
  const chest = named(new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.55, 6, 14), shell), 'chest');
  chest.position.y = 0.55;
  chest.scale.set(1.15, 1, 0.85);
  const core = named(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 20), brandM), 'core');
  core.rotation.x = Math.PI / 2;
  core.position.set(0, 0.62, 0.36);
  torso.add(chest, core);

  /* arms — pivot at shoulders, limb hangs down inside the pivot */
  const mkArm = (side) => { // side: -1 left, +1 right
    const shoulder = named(new THREE.Group(), side < 0 ? 'shoulderL' : 'shoulderR');
    shoulder.position.set(side * 0.5, 0.92, 0);
    const arm = named(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 4, 10), shell), side < 0 ? 'armL' : 'armR');
    arm.position.y = -0.31;
    const hand = named(new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), brandM), side < 0 ? 'handL' : 'handR');
    hand.position.y = -0.62;
    shoulder.add(arm, hand);
    return shoulder;
  };
  torso.add(mkArm(-1), mkArm(1));

  /* head */
  const head = named(new THREE.Group(), 'head');
  head.position.set(0, 1.3, 0);
  const skull = named(new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 18), shell), 'skull');
  skull.scale.set(1.12, 1, 0.95);
  const face = named(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 0.1), screenM), 'faceScreen');
  face.position.set(0, 0.02, 0.34);
  const eyeGeo = new THREE.CapsuleGeometry(0.055, 0.05, 3, 8);
  const eyeL = named(new THREE.Mesh(eyeGeo, eyeM), 'eyeL');
  const eyeR = named(new THREE.Mesh(eyeGeo, eyeM), 'eyeR');
  eyeL.position.set(-0.13, 0.05, 0.4);
  eyeR.position.set(0.13, 0.05, 0.4);
  const neck = named(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 10), shadeM), 'neck');
  neck.position.y = -0.38;
  const antenna = named(new THREE.Group(), 'antenna');
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 8), shadeM);
  rod.position.y = 0.52;
  const tip = named(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), tipM), 'antennaTip');
  tip.position.y = 0.7;
  antenna.add(rod, tip);
  head.add(skull, face, eyeL, eyeR, neck, antenna);
  torso.add(head);

  /* legs — pivot at hips, limb hangs down */
  const mkLeg = (side) => {
    const leg = named(new THREE.Group(), side < 0 ? 'legL' : 'legR');
    leg.position.set(side * 0.22, 1.0, 0);
    const thigh = named(new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.34, 4, 10), shell), side < 0 ? 'thighL' : 'thighR');
    thigh.position.y = -0.26;
    const foot = named(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.36), brandM), side < 0 ? 'footL' : 'footR');
    foot.position.set(0, -0.52, 0.05);
    leg.add(thigh, foot);
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
      new THREE.VectorKeyframeTrack('Robot.position', times,
        [0, 0, 0, 0, 0.03, 0, 0, 0, 0, 0, 0.03, 0, 0, 0, 0]),
      new THREE.QuaternionKeyframeTrack('torso.quaternion', times,
        [...q(0, 0, 0.04), ...q(0, 0.05, 0), ...q(0, 0, -0.04), ...q(0, -0.05, 0), ...q(0, 0, 0.04)]),
      new THREE.QuaternionKeyframeTrack('shoulderL.quaternion', times,
        [...q(0, 0, 0.10), ...q(0, 0, 0.16), ...q(0, 0, 0.10), ...q(0, 0, 0.16), ...q(0, 0, 0.10)]),
      new THREE.QuaternionKeyframeTrack('shoulderR.quaternion', times,
        [...q(0, 0, -0.16), ...q(0, 0, -0.10), ...q(0, 0, -0.16), ...q(0, 0, -0.10), ...q(0, 0, -0.16)]),
      new THREE.QuaternionKeyframeTrack('antenna.quaternion', times,
        [...q(0, 0, 0.25), ...q(0, 0, -0.25), ...q(0, 0, 0.25), ...q(0, 0, -0.25), ...q(0, 0, 0.25)])
    ];
    clips.push(new THREE.AnimationClip('idle', 4, tracks));
  }

  /* wave — 2s once: right arm up, forearm wiggle, small head tilt */
  {
    const t = [0, 0.25, 0.55, 0.85, 1.15, 1.45, 1.7, 2.0];
    const tracks = [
      new THREE.QuaternionKeyframeTrack('shoulderR.quaternion', t,
        [...q(0, 0, -0.16), ...q(0, 0, 2.6), ...q(0, 0, 2.35), ...q(0, 0, 2.85), ...q(0, 0, 2.35), ...q(0, 0, 2.85), ...q(0, 0, 2.6), ...q(0, 0, -0.16)]),
      new THREE.QuaternionKeyframeTrack('head.quaternion', t,
        [...q(0, 0, 0), ...q(0, 0, 0.14), ...q(0, 0, -0.12), ...q(0, 0, 0.14), ...q(0, 0, -0.12), ...q(0, 0, 0.14), ...q(0, 0, 0.08), ...q(0, 0, 0)]),
      new THREE.QuaternionKeyframeTrack('shoulderL.quaternion', t,
        [...q(0, 0, 0.10), ...q(0, 0, 0.28), ...q(0, 0, 0.28), ...q(0, 0, 0.28), ...q(0, 0, 0.28), ...q(0, 0, 0.28), ...q(0, 0, 0.28), ...q(0, 0, 0.10)])
    ];
    clips.push(new THREE.AnimationClip('wave', 2, tracks));
  }

  /* blink — 0.4s once: both eyes squash shut then reopen */
  {
    const t = [0, 0.08, 0.16, 0.32, 0.4];
    const scaleY = [1, 0.08, 0.08, 0.08, 1];
    const mk = (n) => new THREE.VectorKeyframeTrack(`${n}.scale`, t,
      scaleY.flatMap(s => [1, s, 1]));
    clips.push(new THREE.AnimationClip('blink', 0.4, [mk('eyeL'), mk('eyeR')]));
  }

  /* sit — 0.8s once: settle down, legs swing forward, slight lean back */
  {
    const t = [0, 0.35, 0.6, 0.8];
    const tracks = [
      new THREE.VectorKeyframeTrack('Robot.position', t,
        [0, 0, 0, 0, -0.06, 0, 0, -0.1, 0, 0, -0.1, 0]),
      new THREE.QuaternionKeyframeTrack('legL.quaternion', t,
        [...q(0, 0, 0), ...q(-1.1, 0, 0.06), ...q(-1.35, 0, 0.06), ...q(-1.35, 0, 0.06)]),
      new THREE.QuaternionKeyframeTrack('legR.quaternion', t,
        [...q(0, 0, 0), ...q(-1.1, 0, -0.06), ...q(-1.35, 0, -0.06), ...q(-1.35, 0, -0.06)]),
      new THREE.QuaternionKeyframeTrack('torso.quaternion', t,
        [...q(0, 0, 0), ...q(-0.1, 0, 0), ...q(-0.16, 0, 0), ...q(-0.16, 0, 0)]),
      new THREE.QuaternionKeyframeTrack('shoulderL.quaternion', t,
        [...q(0, 0, 0.1), ...q(0, 0, 0.5), ...q(0, 0, 0.55), ...q(0, 0, 0.55)]),
      new THREE.QuaternionKeyframeTrack('shoulderR.quaternion', t,
        [...q(0, 0, -0.1), ...q(0, 0, -0.5), ...q(0, 0, -0.55), ...q(0, 0, -0.55)])
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

  /* GLB — binary, includes scene graph + all 4 clips */
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
