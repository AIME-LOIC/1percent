import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const stages = [
  { p: 0.0, cam: [0, 1.8, 4.6], look: [0, 0.9, 0] },
  { p: 0.12, cam: [0.2, 1.7, 3.5], look: [0, 0.75, 0] },
  { p: 0.28, cam: [0.7, 1.5, 2.5], look: [0, 0.75, 0] },
  { p: 0.45, cam: [-0.8, 1.8, 2.3], look: [0.15, 0.65, 0] },
  { p: 0.65, cam: [0.9, 2.3, 3.7], look: [0, 0.95, 0] },
  { p: 0.85, cam: [0.2, 2.1, 4.0], look: [0, 1.0, 0] },
  { p: 1.0, cam: [0, 1.8, 4.6], look: [0, 0.9, 0] }
];

function lerpStages(progress) {
  for (let i = 0; i < stages.length - 1; i += 1) {
    const a = stages[i];
    const b = stages[i + 1];
    if (progress >= a.p && progress <= b.p) {
      const t = (progress - a.p) / (b.p - a.p || 1);
      return {
        cam: a.cam.map((value, index) => THREE.MathUtils.lerp(value, b.cam[index], t)),
        look: new THREE.Vector3().lerpVectors(new THREE.Vector3(...a.look), new THREE.Vector3(...b.look), t)
      };
    }
  }

  const last = stages[stages.length - 1];
  return { cam: last.cam, look: new THREE.Vector3(...last.look) };
}

function LandingScene() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 150);
    camera.position.set(...stages[0].cam);
    camera.lookAt(new THREE.Vector3(...stages[0].look));

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xffffff, 0x000000, 0.55);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xa3cc12, 1.2);
    keyLight.position.set(5, 6, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.24);
    fillLight.position.set(-4, 2, -5);
    scene.add(fillLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 22),
      new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 1, metalness: 0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.2;
    scene.add(floor);

    const grid = new THREE.GridHelper(20, 20, 0x2f3a17, 0x13170f);
    grid.material.opacity = 0.12;
    grid.material.transparent = true;
    scene.add(grid);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const fallbackMaterial = new THREE.MeshStandardMaterial({
      color: 0xa3cc12,
      emissive: 0x2a4200,
      roughness: 0.18,
      metalness: 0.7
    });
    const fallbackMesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.7, 0.18, 128, 24), fallbackMaterial);
    fallbackMesh.position.y = 0.6;
    fallbackMesh.rotation.x = Math.PI * 0.1;

    const gltfLoader = new GLTFLoader();
    const objLoader = new OBJLoader();
    const glbPath = '/assets/models/1percent_logo.glb';
    const objPath = '/assets/models/1percent_logo.obj';

    const applyModel = (object) => {
      object.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xa3cc12,
              emissive: 0x1f3d00,
              roughness: 0.22,
              metalness: 0.8
            });
          }
        }
      });
      object.scale.setScalar(1.35);
      object.position.y = 0.18;
      modelGroup.add(object);
    };

    const loadFallback = () => {
      modelGroup.add(fallbackMesh);
    };

    gltfLoader.load(
      glbPath,
      (gltf) => {
        const object = gltf.scene || gltf.scenes[0];
        if (object) {
          object.rotation.x = -Math.PI / 2;
          applyModel(object);
        }
      },
      undefined,
      () => {
        objLoader.load(
          objPath,
          (obj) => {
            obj.scale.setScalar(0.012);
            obj.position.y = 0;
            applyModel(obj);
          },
          undefined,
          () => {
            loadFallback();
          }
        );
      }
    );

    let targetProgress = 0;
    let smoothProgress = 0;

    const updateProgress = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      targetProgress = max > 0 ? THREE.MathUtils.clamp(window.scrollY / max, 0, 1) : 0;
    };

    updateProgress();

    const onResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      updateProgress();
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      smoothProgress += (targetProgress - smoothProgress) * Math.min(1, dt * 3.2);
      const { cam, look } = lerpStages(smoothProgress);
      const camTarget = new THREE.Vector3(...cam);
      const lookTarget = look.clone();

      camera.position.lerp(camTarget, Math.min(1, dt * 3));
      camera.userData.look = camera.userData.look || new THREE.Vector3(...stages[0].look);
      camera.userData.look.lerp(lookTarget, Math.min(1, dt * 3));
      camera.lookAt(camera.userData.look);

      modelGroup.rotation.y += 0.004 + smoothProgress * 0.002;
      if (modelGroup.children.length > 0) {
        modelGroup.children.forEach((child) => {
          if (child.isMesh || child.isGroup) {
            child.rotation.z = Math.sin(performance.now() * 0.0005) * 0.02;
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', onResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div className="landing-scene-container" ref={containerRef} />;
}

export default LandingScene;
