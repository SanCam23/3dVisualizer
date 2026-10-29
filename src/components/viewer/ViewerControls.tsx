"use client";

import React from "react";
import {
  RotateCcw,
  Focus,
  Grid,
  Box,
  Maximize2,
  Minimize2,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export const BACKGROUND_PRESETS = [
  { name: "Estudio Oscuro", value: "#121316", border: "#27272a" },
  { name: "Gris Grafito", value: "#18181b", border: "#3f3f46" },
  { name: "Azul Medianoche", value: "#090d16", border: "#1e293b" },
  { name: "Blanco Minimal", value: "#f4f4f5", border: "#e4e4e7" },
];

interface ViewerControlsProps {
  onResetView: () => void;
  onCenterView: () => void;
  wireframe: boolean;
  onToggleWireframe: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  backgroundColor: string;
  onSelectBackground: (color: string) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function ViewerControls({
  onResetView,
  onCenterView,
  wireframe,
  onToggleWireframe,
  showGrid,
  onToggleGrid,
  backgroundColor,
  onSelectBackground,
  isFullscreen,
  onToggleFullscreen,
}: ViewerControlsProps) {
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-card/80 backdrop-blur-md border border-border shadow-2xl">
      {/* Reset Initial View */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onResetView}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="Restablecer vista inicial"
      >
        <RotateCcw className="w-4 h-4" />
      </Button>

      {/* Center Model */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onCenterView}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="Centrar y encuadrar modelo"
      >
        <Focus className="w-4 h-4" />
      </Button>

      <div className="h-4 w-[1px] bg-border mx-1" />

      {/* Wireframe Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleWireframe}
        className={`h-8 w-8 ${
          wireframe
            ? "bg-primary/20 text-primary border border-primary/30"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title={wireframe ? "Desactivar modo alambre" : "Activar modo alambre"}
      >
        <Box className="w-4 h-4" />
      </Button>

      {/* Grid Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleGrid}
        className={`h-8 w-8 ${
          showGrid
            ? "bg-primary/20 text-primary border border-primary/30"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title={showGrid ? "Ocultar cuadrícula de suelo" : "Mostrar cuadrícula de suelo"}
      >
        <Grid className="w-4 h-4" />
      </Button>

      <div className="h-4 w-[1px] bg-border mx-1" />

      {/* Background Palette */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Color de fondo del visor"
        >
          <Palette className="w-4 h-4" />
        </Button>

        {showColorPicker && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 p-2 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-xl flex items-center gap-2">
            {BACKGROUND_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  onSelectBackground(p.value);
                  setShowColorPicker(false);
                }}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  backgroundColor === p.value
                    ? "ring-2 ring-primary scale-110"
                    : "opacity-80"
                }`}
                style={{ backgroundColor: p.value, borderColor: p.border }}
                title={p.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleFullscreen}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
      >
        {isFullscreen ? (
          <Minimize2 className="w-4 h-4" />
        ) : (
          <Maximize2 className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}

