import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Generates an automatic 512x512 transparent PNG thumbnail from a .glb File in the browser using Three.js.
 * Operates off-screen and returns a Blob (or null if unsupported/failed).
 */
export async function generateGlbThumbnail(file: File): Promise<Blob | null> {
  if (typeof window === "undefined") return null;

  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(512, 512);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;

      const scene = new THREE.Scene();

      // Balanced Studio Lights
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x18233a, 1.4);
      scene.add(hemiLight);

      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
      dirLight.position.set(5, 10, 7);
      scene.add(dirLight);

      const fillLight = new THREE.DirectionalLight(0xffa07a, 0.7);
      fillLight.position.set(-6, 3, -5);
      scene.add(fillLight);

      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          // Center model on grid
          model.position.x = -center.x;
          model.position.y = -box.min.y;
          model.position.z = -center.z;
          scene.add(model);

          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = camera.fov * (Math.PI / 180);
          let dist = (maxDim / 2) / Math.tan(fov / 2);
          dist = Math.max(dist * 0.9, 1.2);

          const targetY = size.y * 0.4;
          camera.position.set(dist * 0.65, targetY + dist * 0.4, dist * 0.8);
          camera.lookAt(0, targetY, 0);

          renderer.render(scene, camera);

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              renderer.dispose();
              resolve(blob);
            },
            "image/png"
          );
        },
        undefined,
        (err) => {
          console.warn("Client thumbnail generation skipped on error:", err);
          URL.revokeObjectURL(url);
          renderer.dispose();
          resolve(null);
        }
      );
    } catch (e) {
      console.warn("Could not set up client thumbnail generator:", e);
      resolve(null);
    }
  });
}

