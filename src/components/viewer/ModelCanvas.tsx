"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { healBrokenMaterial } from "@/lib/utils/materialHealer";

export interface ModelCanvasHandle {
  resetCamera: () => void;
  centerModel: () => void;
}

interface ModelCanvasProps {
  modelUrl: string;
  wireframe?: boolean;
  toonMode?: boolean;
  showGrid?: boolean;
  backgroundColor?: string;
  isPlaying?: boolean;
  activeAnimationIndex?: number;
  onProgress?: (percent: number) => void;
  onError?: (err: string) => void;
  onLoaded?: (info: {
    meshCount: number;
    vertexCount: number;
    bounds: THREE.Vector3;
    animations: string[];
  }) => void;
}

// Helper to compute bounding box focusing on primary subject (ignoring massive backdrops/floors and boolean cutters)
function isBackdrop(name: string): boolean {
  const n = (name || "").toLowerCase();
  return (
    n.includes("backdrop") ||
    n.includes("studio") ||
    n.includes("floor") ||
    n.includes("ground") ||
    n.includes("suelo") ||
    n.includes("shadow")
  );
}

function isCutter(name: string): boolean {
  const n = (name || "").toLowerCase();
  return n.includes("cutter") || n.includes("boolean") || n.includes("bool_");
}

function getSubjectBox(root: THREE.Object3D): THREE.Box3 {
  const subjectBox = new THREE.Box3();
  let foundSubject = false;
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && !isBackdrop(child.name) && !isCutter(child.name)) {
      subjectBox.expandByObject(child);
      foundSubject = true;
    }
  });

  return foundSubject && !subjectBox.isEmpty()
    ? subjectBox
    : new THREE.Box3().setFromObject(root);
}

// 3-step discrete cel-shading rampa: shadow (0.3), mid-tone (0.7), lit highlight (1.0)
let cachedToonTexture: THREE.DataTexture | null = null;
function getToonGradientTexture(): THREE.DataTexture {
  if (!cachedToonTexture) {
    const colors = new Uint8Array([75, 175, 255]);
    cachedToonTexture = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
    cachedToonTexture.minFilter = THREE.NearestFilter;
    cachedToonTexture.magFilter = THREE.NearestFilter;
    cachedToonTexture.needsUpdate = true;
  }
  return cachedToonTexture;
}

export const ModelCanvas = forwardRef<ModelCanvasHandle, ModelCanvasProps>(
  (
    {
      modelUrl,
      wireframe = false,
      toonMode = true,
      showGrid = true,
      backgroundColor = "#FFF8F4",
      isPlaying = false,
      activeAnimationIndex = -1,
      onProgress,
      onError,
      onLoaded,
    },
    ref
  ) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const gridRef = useRef<THREE.GridHelper | null>(null);
    const currentModelRef = useRef<THREE.Group | null>(null);
    const dracoLoaderRef = useRef<DRACOLoader | null>(null);

    // Animation refs
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const actionsRef = useRef<THREE.AnimationAction[]>([]);
    const clockRef = useRef<THREE.Clock>(new THREE.Clock());

    // Synchronize latest callback and mode refs to satisfy exhaustive-deps without triggering model reload
    const wireframeRef = useRef(wireframe);
    wireframeRef.current = wireframe;
    const toonModeRef = useRef(toonMode);
    toonModeRef.current = toonMode;
    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;
    const activeAnimationIndexRef = useRef(activeAnimationIndex);
    activeAnimationIndexRef.current = activeAnimationIndex;
    const onProgressRef = useRef(onProgress);
    onProgressRef.current = onProgress;
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;
    const onLoadedRef = useRef(onLoaded);
    onLoadedRef.current = onLoaded;

    // Initial camera position cache for Reset
    const initialCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 2, 5));
    const initialTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

    // Expose reset and center functions
    useImperativeHandle(ref, () => ({
      resetCamera: () => {
        if (cameraRef.current && controlsRef.current) {
          cameraRef.current.position.copy(initialCamPosRef.current);
          controlsRef.current.target.copy(initialTargetRef.current);
          controlsRef.current.update();
        }
      },
      centerModel: () => {
        if (!currentModelRef.current || !cameraRef.current || !controlsRef.current) return;
        const box = getSubjectBox(currentModelRef.current);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 0.9;
        cameraDistance = Math.max(cameraDistance, 1.2);

        const targetY = size.y * 0.45;
        cameraRef.current.position.set(
          cameraDistance * 0.6,
          targetY + cameraDistance * 0.35,
          cameraDistance * 0.75
        );
        controlsRef.current.target.set(0, targetY, 0);
        controlsRef.current.update();
      },
    }));

    // Setup Three.js scene, renderer, camera and controls
    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;

      // 1. Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(backgroundColor);
      sceneRef.current = scene;

      // 2. Camera (Posicionada cerca del origen)
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(1.5, 1.2, 1.8);
      cameraRef.current = camera;

      // 3. Renderer (High-performance + optimized pixel ratio)
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.LinearToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;

      container.replaceChildren(renderer.domElement);

      // 4. OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = true;
      controls.minDistance = 0.15;
      controls.maxDistance = 200;
      controls.maxPolarAngle = Math.PI / 2 + 0.1;
      controlsRef.current = controls;

      // 5. Lights (Balanced Studio Lighting with Cartoon Pop)
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0xf0e4dd, 0.85);
      scene.add(hemiLight);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
      scene.add(ambientLight);

      // Main directional light for sharp cartoon shading
      const mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
      mainLight.position.set(5, 10, 7);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.set(1024, 1024);
      mainLight.shadow.bias = -0.0001;
      scene.add(mainLight);

      const fillLight = new THREE.DirectionalLight(0xffecd6, 0.5);
      fillLight.position.set(-6, 3, -5);
      scene.add(fillLight);

      // Stylized rim light for anime/cartoon edge sheen (like Blender's Layer Weight)
      const rimLight = new THREE.DirectionalLight(0xffffff, 0.85);
      rimLight.position.set(0, 4, -6);
      scene.add(rimLight);

      // 6. Floor Grid Helper (Warm subtle grid lines)
      const grid = new THREE.GridHelper(20, 40, 0xff6433, 0xe2d6cf);
      grid.position.y = 0;
      scene.add(grid);
      gridRef.current = grid;

      // 7. Animation Loop with Tab Visibility Awareness & Mixer Updates
      let animId: number;
      let isVisible = !document.hidden;

      const handleVisibilityChange = () => {
        isVisible = !document.hidden;
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);

      const clock = clockRef.current;
      clock.start();

      const animate = () => {
        animId = requestAnimationFrame(animate);
        if (isVisible) {
          const delta = clock.getDelta();
          controls.update();
          if (mixerRef.current) {
            mixerRef.current.update(delta);
          }
          renderer.render(scene, camera);
        }
      };
      animate();

      // 8. Resize Handler
      const handleResize = () => {
        if (!container || !renderer || !camera) return;
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      };
      window.addEventListener("resize", handleResize);

      // 9. Cleanup on Unmount
      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(animId);
        controls.dispose();

        // Dispose textures and geometries
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((mat) => {
              if (mat) {
                if (mat.map) mat.map.dispose();
                if (mat.normalMap) mat.normalMap.dispose();
                if (mat.roughnessMap) mat.roughnessMap.dispose();
                if (mat.metalnessMap) mat.metalnessMap.dispose();
                if (mat.emissiveMap) mat.emissiveMap.dispose();
                mat.dispose();
              }
            });
          }
        });

        renderer.dispose();
        if (renderer.domElement.parentElement) {
          renderer.domElement.parentElement.removeChild(renderer.domElement);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update background color dynamically
    useEffect(() => {
      if (sceneRef.current) {
        sceneRef.current.background = new THREE.Color(backgroundColor);
      }
    }, [backgroundColor]);

    // Update grid visibility
    useEffect(() => {
      if (gridRef.current) {
        gridRef.current.visible = showGrid;
      }
    }, [showGrid]);

    // Update wireframe mode
    useEffect(() => {
      if (!currentModelRef.current) return;
      currentModelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => (m.wireframe = wireframe));
          } else {
            child.material.wireframe = wireframe;
          }
        }
      });
    }, [wireframe]);

    // Update cartoon / toon shading mode dynamically
    useEffect(() => {
      if (!currentModelRef.current) return;
      currentModelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.pbrMaterial && child.userData.toonMaterial) {
          child.material = toonMode ? child.userData.toonMaterial : child.userData.pbrMaterial;
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => (m.wireframe = wireframeRef.current));
          } else {
            child.material.wireframe = wireframeRef.current;
          }
        }
      });
    }, [toonMode]);

    // Handle animation play / pause / switch dynamically
    useEffect(() => {
      if (!mixerRef.current || actionsRef.current.length === 0) return;

      if (isPlaying) {
        if (activeAnimationIndex === -1 || activeAnimationIndex === undefined) {
          // Play all synchronized animation tracks together (e.g. doors + hat + reaction)
          actionsRef.current.forEach((action) => {
            action.paused = false;
            action.play();
          });
        } else {
          const targetIdx = Math.max(0, Math.min(activeAnimationIndex, actionsRef.current.length - 1));
          actionsRef.current.forEach((action, idx) => {
            if (idx === targetIdx) {
              action.paused = false;
              action.play();
            } else {
              action.stop();
            }
          });
        }
      } else {
        actionsRef.current.forEach((action) => {
          action.paused = true;
        });
      }
    }, [isPlaying, activeAnimationIndex]);

    // Load Model via GLTFLoader with DRACOLoader & Meshopt acceleration
    useEffect(() => {
      if (!sceneRef.current || !cameraRef.current || !controlsRef.current || !modelUrl) {
        return;
      }

      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      const renderer = rendererRef.current;

      // Remove existing model and mixer if any
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      actionsRef.current = [];

      if (currentModelRef.current) {
        scene.remove(currentModelRef.current);
        currentModelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((m) => {
                if (m) {
                  if (m.map) m.map.dispose();
                  if (m.normalMap) m.normalMap.dispose();
                  if (m.roughnessMap) m.roughnessMap.dispose();
                  if (m.metalnessMap) m.metalnessMap.dispose();
                  m.dispose();
                }
              });
            }
          }
        });
        currentModelRef.current = null;
      }

      // Configure GLTFLoader with DRACO and Meshopt decoders for instant decompression
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
      loader.setDRACOLoader(dracoLoader);
      loader.setMeshoptDecoder(MeshoptDecoder);
      dracoLoaderRef.current = dracoLoader;

      loader.load(
        modelUrl,
        async (gltf: GLTF) => {
          const model = gltf.scene;
          currentModelRef.current = model;

          // Animations setup
          const clips = gltf.animations || [];
          const clipNames = clips.map((c, i) => c.name || `Animación ${i + 1}`);

          if (clips.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            mixerRef.current = mixer;
            actionsRef.current = clips.map((clip) => {
              const action = mixer.clipAction(clip);
              action.setLoop(THREE.LoopRepeat, Infinity);
              action.clampWhenFinished = false;
              return action;
            });

            if (isPlayingRef.current) {
              const targetIdx = activeAnimationIndexRef.current ?? -1;
              if (targetIdx === -1) {
                actionsRef.current.forEach((a) => a.play());
              } else {
                const actionToPlay = actionsRef.current[targetIdx] || actionsRef.current[0];
                actionToPlay?.play();
              }
            }
          }

          // Enable shadows, heal broken Blender emission exports, and apply initial wireframe setting
          let meshCount = 0;
          let vertexCount = 0;

          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // Hide boolean cutter objects exported by accident from Blender (e.g. Cabinet_Cutter)
              if (isCutter(child.name)) {
                child.visible = false;
                return;
              }

              meshCount++;
              if (child.geometry?.attributes?.position) {
                vertexCount += child.geometry.attributes.position.count;
              }
              child.castShadow = true;
              child.receiveShadow = true;

              if (child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((m) => {
                  m.wireframe = wireframeRef.current;

                  // Heal broken Blender export (black base color + pure white emissive, no map)
                  healBrokenMaterial(m, child.name);

                  // Stylized smooth cartoon plastic/vinyl finish (like the Nevera)
                  if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
                    m.roughness = 0.32;
                    m.metalness = 0.0;
                  }
                });

                // Generate discrete stepped cel-shading material for authentic anime/cartoon look
                const gradTex = getToonGradientTexture();
                const createToon = (orig: THREE.Material): THREE.Material => {
                  if (orig instanceof THREE.MeshStandardMaterial || orig instanceof THREE.MeshPhysicalMaterial) {
                    return new THREE.MeshToonMaterial({
                      color: orig.color.clone(),
                      map: orig.map,
                      gradientMap: gradTex,
                      wireframe: wireframeRef.current,
                    });
                  }
                  return orig;
                };

                if (Array.isArray(child.material)) {
                  child.userData.pbrMaterial = child.material;
                  child.userData.toonMaterial = child.material.map(createToon);
                  child.material = toonModeRef.current ? child.userData.toonMaterial : child.userData.pbrMaterial;
                } else {
                  child.userData.pbrMaterial = child.material;
                  child.userData.toonMaterial = createToon(child.material);
                  child.material = toonModeRef.current ? child.userData.toonMaterial : child.userData.pbrMaterial;
                }
              }
            }
          });

          // Auto-frame: calculate bounding box focusing on primary subject, center model at y=0
          const box = getSubjectBox(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          // Offset model so it sits cleanly on top of the grid (y=0) and centered in X/Z
          model.position.x = -center.x;
          model.position.y = -box.min.y;
          model.position.z = -center.z;

          scene.add(model);

          // Position camera closer to model and origin (vista cercana y detallada)
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = camera.fov * (Math.PI / 180);
          let cameraDistance = (maxDim / 2) / Math.tan(fov / 2);
          cameraDistance = Math.max(cameraDistance * 0.9, 1.2);

          const targetY = size.y * 0.45;
          const newCamPos = new THREE.Vector3(
            cameraDistance * 0.6,
            targetY + cameraDistance * 0.35,
            cameraDistance * 0.75
          );
          const newTarget = new THREE.Vector3(0, targetY, 0);

          camera.position.copy(newCamPos);
          controls.target.copy(newTarget);
          controls.update();

          // Store for reset button
          initialCamPosRef.current.copy(newCamPos);
          initialTargetRef.current.copy(newTarget);

          // Pre-compile WebGL shaders and upload textures asynchronously to prevent frame freeze
          if (renderer) {
            try {
              if (typeof renderer.compileAsync === "function") {
                await renderer.compileAsync(scene, camera);
              } else {
                renderer.compile(scene, camera);
              }
            } catch (compileErr) {
              console.warn("Async shader pre-compilation skipped:", compileErr);
            }
          }

          // Notify parent that model is fully ready and compiled
          if (onLoadedRef.current) {
            onLoadedRef.current({
              meshCount,
              vertexCount,
              bounds: size,
              animations: clipNames,
            });
          }
          if (onProgressRef.current) {
            onProgressRef.current(100);
          }
        },
        (xhr) => {
          if (xhr.lengthComputable && onProgressRef.current) {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            onProgressRef.current(percent);
          }
        },
        (error) => {
          console.error("Three.js GLTFLoader error:", error);
          if (onErrorRef.current) {
            onErrorRef.current(
              "No se pudo cargar el modelo 3D (.glb). Compruebe que el archivo es accesible o reintente."
            );
          }
        }
      );

      return () => {
        if (mixerRef.current) {
          mixerRef.current.stopAllAction();
          mixerRef.current = null;
        }
        actionsRef.current = [];
        if (dracoLoaderRef.current) {
          dracoLoaderRef.current.dispose();
          dracoLoaderRef.current = null;
        }
      };
    }, [modelUrl]);

    return (
      <div
        ref={mountRef}
        className="relative w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing outline-none"
      />
    );
  }
);

ModelCanvas.displayName = "ModelCanvas";
