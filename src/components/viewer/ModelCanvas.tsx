"use client";

import React, { Suspense, useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface ModelCanvasHandle {
  resetCamera: () => void;
  centerModel: () => void;
}

interface ModelCanvasProps {
  modelUrl: string;
  wireframe?: boolean;
  showGrid?: boolean;
  backgroundColor?: string;
  onProgress?: (percent: number) => void;
  onError?: (err: string) => void;
  onLoaded?: (info: { meshCount: number; vertexCount: number; bounds: THREE.Vector3 }) => void;
}

export const ModelCanvas = forwardRef<ModelCanvasHandle, ModelCanvasProps>(
  (
    {
      modelUrl,
      wireframe = false,
      showGrid = true,
      backgroundColor = "#121316",
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
        const box = new THREE.Box3().setFromObject(currentModelRef.current);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
        cameraZ = Math.max(cameraZ, 2);

        cameraRef.current.position.set(center.x, center.y + maxDim * 0.3, center.z + cameraZ);
        controlsRef.current.target.copy(center);
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

      // 2. Camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(3, 2.5, 4);
      cameraRef.current = camera;

      // 3. Renderer
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;

      container.replaceChildren(renderer.domElement);

      // 4. OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = true;
      controls.minDistance = 0.5;
      controls.maxDistance = 200;
      controls.maxPolarAngle = Math.PI / 2 + 0.1; // allow slightly below horizon
      controlsRef.current = controls;

      // 5. Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambientLight);

      const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
      mainLight.position.set(5, 10, 7);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 2048;
      mainLight.shadow.mapSize.height = 2048;
      mainLight.shadow.bias = -0.0001;
      scene.add(mainLight);

      const fillLight = new THREE.DirectionalLight(0x90b0ff, 0.8);
      fillLight.position.set(-6, 3, -5);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0xffeedd, 0.5);
      rimLight.position.set(0, -5, -5);
      scene.add(rimLight);

      // 6. Floor Grid Helper (Cheat Cook Coral axis + dark slate lines)
      const grid = new THREE.GridHelper(20, 40, 0xff6433, 0x25324b);
      grid.position.y = 0;
      scene.add(grid);
      gridRef.current = grid;

      // 7. Animation Loop
      let animId: number;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
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
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(animId);
        controls.dispose();

        // Dispose scene geometries, materials, textures
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach((mat) => {
                mat.map?.dispose();
                mat.dispose();
              });
            } else if (obj.material) {
              obj.material.map?.dispose();
              obj.material.dispose();
            }
          }
        });

        renderer.dispose();
        if (renderer.domElement.parentElement) {
          renderer.domElement.parentElement.removeChild(renderer.domElement);
        }
      };
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

    // Load Model via GLTFLoader with progress
    useEffect(() => {
      if (!sceneRef.current || !cameraRef.current || !controlsRef.current || !modelUrl) {
        return;
      }

      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const controls = controlsRef.current;

      // Remove existing model if any
      if (currentModelRef.current) {
        scene.remove(currentModelRef.current);
        currentModelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
              else child.material.dispose();
            }
          }
        });
        currentModelRef.current = null;
      }

      const loader = new GLTFLoader();

      loader.load(
        modelUrl,
        (gltf: GLTF) => {
          const model = gltf.scene;
          currentModelRef.current = model;

          // Enable shadows and apply initial wireframe setting
          let meshCount = 0;
          let vertexCount = 0;

          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              meshCount++;
              if (child.geometry?.attributes?.position) {
                vertexCount += child.geometry.attributes.position.count;
              }
              child.castShadow = true;
              child.receiveShadow = true;

              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((m) => (m.wireframe = wireframe));
                } else {
                  child.material.wireframe = wireframe;
                }
              }
            }
          });

          // Auto-frame: calculate bounding box, center model at y=0
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          // Offset model so it sits cleanly on top of the grid (y=0) and centered in X/Z
          model.position.x = -center.x;
          model.position.y = -box.min.y;
          model.position.z = -center.z;

          scene.add(model);

          // Position camera so model fills view nicely regardless of model dimensions
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = camera.fov * (Math.PI / 180);
          let cameraDistance = (maxDim / 2) / Math.tan(fov / 2);
          cameraDistance = Math.max(cameraDistance * 1.6, 2.5);

          const targetY = size.y / 2;
          const newCamPos = new THREE.Vector3(
            cameraDistance * 0.7,
            targetY + cameraDistance * 0.4,
            cameraDistance
          );
          const newTarget = new THREE.Vector3(0, targetY, 0);

          camera.position.copy(newCamPos);
          controls.target.copy(newTarget);
          controls.update();

          // Store for reset button
          initialCamPosRef.current.copy(newCamPos);
          initialTargetRef.current.copy(newTarget);

          // Notify parent
          if (onLoaded) {
            onLoaded({ meshCount, vertexCount, bounds: size });
          }
          if (onProgress) {
            onProgress(100);
          }
        },
        (xhr) => {
          if (xhr.lengthComputable && onProgress) {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            onProgress(percent);
          }
        },
        (error) => {
          console.error("Three.js GLTFLoader error:", error);
          if (onError) {
            onError(
              "No se pudo cargar el modelo 3D (.glb). Compruebe que el archivo es accesible o reintente."
            );
          }
        }
      );
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

