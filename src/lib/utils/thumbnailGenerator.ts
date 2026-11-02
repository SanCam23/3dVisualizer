import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { healBrokenMaterial } from "./materialHealer";

/**
 * Generates an automatic 384x384 transparent PNG thumbnail from a .glb File in the browser using Three.js.
 * Optimized with DRACOLoader support, fast off-screen rendering, and immediate WebGL garbage collection.
 */
export async function generateGlbThumbnail(file: File): Promise<Blob | null> {
  if (typeof window === "undefined") return null;

  return new Promise((resolve) => {
    let url = "";
    try {
      url = URL.createObjectURL(file);
      const canvas = document.createElement("canvas");
      canvas.width = 384;
      canvas.height = 384;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(384, 384);
      renderer.setPixelRatio(1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.LinearToneMapping;
      renderer.toneMappingExposure = 1.0;

      const scene = new THREE.Scene();

      // Balanced Studio Lights with Cartoon Pop
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0xf0e4dd, 0.5);
      scene.add(hemiLight);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.35);
      dirLight.position.set(5, 10, 7);
      scene.add(dirLight);

      const fillLight = new THREE.DirectionalLight(0xffecd6, 0.35);
      fillLight.position.set(-6, 3, -5);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
      rimLight.position.set(0, 4, -6);
      scene.add(rimLight);

      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
      loader.setDRACOLoader(dracoLoader);

      const cleanup = () => {
        if (url) URL.revokeObjectURL(url);
        dracoLoader.dispose();
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => {
              if (m) {
                if (m.map) m.map.dispose();
                m.dispose();
              }
            });
          }
        });
        renderer.dispose();
      };

      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;

          // Helper to detect studio backdrops, floor planes or shadows that should not dominate the framing
          const isBackdrop = (name: string) => {
            const n = (name || "").toLowerCase();
            return (
              n.includes("backdrop") ||
              n.includes("studio") ||
              n.includes("floor") ||
              n.includes("ground") ||
              n.includes("suelo") ||
              n.includes("fondo") ||
              n.includes("shadow")
            );
          };

          const isCutter = (name: string) => {
            const n = (name || "").toLowerCase();
            return n.includes("cutter") || n.includes("boolean") || n.includes("bool_");
          };

          const subjectBox = new THREE.Box3();
          let foundSubjectMesh = false;

          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (isBackdrop(child.name) || isCutter(child.name)) {
                // Hide backdrop and boolean cutter objects in thumbnail
                child.visible = false;
              } else {
                subjectBox.expandByObject(child);
                foundSubjectMesh = true;

                // Convert to cel-shading cartoon material with discrete stepped shadow cuts
                if (child.material) {
                  const colors = new Uint8Array([75, 175, 255]);
                  const grad = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
                  grad.minFilter = THREE.NearestFilter;
                  grad.magFilter = THREE.NearestFilter;
                  grad.needsUpdate = true;

                  const convertToToon = (m: THREE.Material): THREE.Material => {
                    healBrokenMaterial(m, child.name);
                    if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
                      return new THREE.MeshToonMaterial({
                        color: m.color.clone(),
                        map: m.map,
                        gradientMap: grad,
                      });
                    }
                    return m;
                  };

                  child.material = Array.isArray(child.material)
                    ? child.material.map(convertToToon)
                    : convertToToon(child.material);
                }
              }
            }
          });

          if (!foundSubjectMesh || subjectBox.isEmpty()) {
            subjectBox.setFromObject(model);
          }

          const center = subjectBox.getCenter(new THREE.Vector3());
          const size = subjectBox.getSize(new THREE.Vector3());

          // Center model on grid based on the actual subject
          model.position.x = -center.x;
          model.position.y = -subjectBox.min.y;
          model.position.z = -center.z;
          scene.add(model);

          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = camera.fov * (Math.PI / 180);
          let dist = (maxDim / 2) / Math.tan(fov / 2);
          // Framing factor so the subject comfortably fills ~80% of preview
          dist = Math.max(dist * 1.15, 1.2);

          const targetY = size.y * 0.48;
          // Clean 3/4 isometric perspective
          camera.position.set(dist * 0.82, targetY + dist * 0.42, dist * 0.95);
          camera.lookAt(0, targetY, 0);

          renderer.render(scene, camera);

          canvas.toBlob(
            (blob) => {
              cleanup();
              resolve(blob);
            },
            "image/png"
          );
        },
        undefined,
        (err) => {
          console.warn("Client thumbnail generation skipped on error:", err);
          cleanup();
          resolve(null);
        }
      );
    } catch (e) {
      console.warn("Could not set up client thumbnail generator:", e);
      if (url) URL.revokeObjectURL(url);
      resolve(null);
    }
  });
}
