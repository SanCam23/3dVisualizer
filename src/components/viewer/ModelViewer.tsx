"use client";

import React, { useState, useRef } from "react";
import { Model3D } from "@/lib/types/models";
import { ModelCanvas, ModelCanvasHandle } from "@/components/viewer/ModelCanvas";
import { ViewerToolbar } from "@/components/viewer/ViewerToolbar";
import { ViewerControls, BACKGROUND_PRESETS } from "@/components/viewer/ViewerControls";
import { Button } from "@/components/ui/Button";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { CheatCookLogo } from "@/components/ui/CheatCookLogo";
import Link from "next/link";

interface ModelViewerProps {
  model: Model3D;
}

export function ModelViewer({ model }: ModelViewerProps) {
  const canvasRef = useRef<ModelCanvasHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [wireframe, setWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_PRESETS[0].value);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [loadPercent, setLoadPercent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [meshStats, setMeshStats] = useState<{ meshCount: number; vertexCount: number } | null>(null);

  const modelUrl = model.viewer_url || (model.viewer_path ? `/api/models/${model.id}/file` : null);

  const handleResetCamera = () => {
    canvasRef.current?.resetCamera();
  };

  const handleCenterModel = () => {
    canvasRef.current?.centerModel();
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-background select-none"
    >
      {/* Top Toolbar */}
      <ViewerToolbar model={model} meshStats={meshStats} />

      {/* Main 3D Canvas or Status Fallback */}
      {modelUrl ? (
        <ModelCanvas
          ref={canvasRef}
          modelUrl={modelUrl}
          wireframe={wireframe}
          showGrid={showGrid}
          backgroundColor={backgroundColor}
          onProgress={(percent) => {
            setLoadPercent(percent);
            if (percent >= 100) {
              setTimeout(() => setIsLoading(false), 300);
            }
          }}
          onLoaded={(info) => {
            setMeshStats({
              meshCount: info.meshCount,
              vertexCount: info.vertexCount,
            });
            setIsLoading(false);
          }}
          onError={(err) => {
            setErrorMessage(err);
            setIsLoading(false);
          }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <div className="p-4 rounded-3xl bg-secondary/80 border border-border mb-4 shadow-lg">
            <CheatCookLogo className="w-14 h-14 opacity-60 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-white">
            Archivo .glb no disponible todavía
          </h2>
          <p className="text-xs text-[#A7B3C6] max-w-md mt-1.5 mb-6 leading-relaxed">
            {model.status === "processing"
              ? "El archivo original .blend está en cola de procesamiento o convirtiéndose actualmente con Blender headless."
              : model.status === "updating"
              ? "Se está procesando una actualización para este modelo."
              : model.status === "error"
              ? `Ocurrió un error en la conversión: ${model.last_error || "Desconocido"}`
              : "El modelo no tiene un visor compilado asociado."}
          </p>
          <Link href="/">
            <Button variant="outline" className="font-medium">Volver a la biblioteca 3D</Button>
          </Link>
        </div>
      )}

      {/* Loading Progress Overlay */}
      {isLoading && modelUrl && !errorMessage && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none transition-opacity duration-300">
          <div className="flex flex-col items-center max-w-xs w-full px-6 text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Cargando modelo 3D...
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Descargando geometrías y texturas PBR ({loadPercent}%)
            </p>
            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-200 rounded-full"
                style={{ width: `${loadPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error State Overlay */}
      {errorMessage && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md p-6 text-center">
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">
            Error al renderizar el modelo
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mb-6">
            {errorMessage}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setErrorMessage(null);
                setIsLoading(true);
                setLoadPercent(0);
              }}
              className="gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reintentar
            </Button>
            <Link href="/">
              <Button size="sm">Volver a la biblioteca</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Floating Bottom View Controls */}
      {modelUrl && !errorMessage && (
        <ViewerControls
          onResetView={handleResetCamera}
          onCenterView={handleCenterModel}
          wireframe={wireframe}
          onToggleWireframe={() => setWireframe(!wireframe)}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(!showGrid)}
          backgroundColor={backgroundColor}
          onSelectBackground={setBackgroundColor}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}
    </div>
  );
}

