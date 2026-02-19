import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function ThreeHeroBackground({ isDarkMode }) {
  const containerRef = useRef(null);
  const pointsRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const scene = new THREE.Scene();
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    for (let i = 0; i < 1400; i += 1) {
      vertices.push(
        THREE.MathUtils.randFloatSpread(2000),
        THREE.MathUtils.randFloatSpread(2000),
        THREE.MathUtils.randFloatSpread(2000)
      );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.PointsMaterial({ color: isDarkMode ? 0x9ec8ff : 0x2f7cff, size: 1.6 });
    const points = new THREE.Points(geometry, material);
    pointsRef.current = points;
    scene.add(points);

    camera.position.z = 1000;

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      points.rotation.x += 0.0005;
      points.rotation.y += 0.001;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const nextWidth = containerRef.current.clientWidth;
      const nextHeight = containerRef.current.clientHeight;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (pointsRef.current) {
      pointsRef.current.material.color.setHex(isDarkMode ? 0x9ec8ff : 0x2f7cff);
    }
  }, [isDarkMode]);

  return <div id="hero-canvas" ref={containerRef}></div>;
}

export default ThreeHeroBackground;
