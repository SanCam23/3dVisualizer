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
  { name: "Crema Cálido (Cheat Cook)", value: "#FFF8F4", border: "#F0E4DD" },
  { name: "Blanco Puro", value: "#FFFFFF", border: "#E2E8F0" },
  { name: "Noche Cheat Cook", value: "#0B1220", border: "#25324B" },
  { name: "Gris Grafito", value: "#1E293B", border: "#334155" },
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
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-2 rounded-full bg-white/90 backdrop-blur-md border border-[#F0E4DD] shadow-[0_8px_32px_rgba(60,24,8,0.12)]">
      {/* Reset Initial View */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onResetView}
        className="h-8 w-8 text-[#64748B] hover:text-[#0F172A] hover:bg-[#FFF1EA] rounded-full"
        title="Restablecer vista inicial"
      >
        <RotateCcw className="w-4 h-4" />
      </Button>

      {/* Center Model */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onCenterView}
        className="h-8 w-8 text-[#64748B] hover:text-[#0F172A] hover:bg-[#FFF1EA] rounded-full"
        title="Centrar y encuadrar modelo"
      >
        <Focus className="w-4 h-4" />
      </Button>

      <div className="h-4 w-[1px] bg-[#F0E4DD] mx-1" />

      {/* Wireframe Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleWireframe}
        className={`h-8 w-8 rounded-full transition-all ${
          wireframe
            ? "bg-[#FF6433]/15 text-[#C2410C] border border-[#FF6433]/30 shadow-xs"
            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#FFF1EA]"
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
        className={`h-8 w-8 rounded-full transition-all ${
          showGrid
            ? "bg-[#FF6433]/15 text-[#C2410C] border border-[#FF6433]/30 shadow-xs"
            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#FFF1EA]"
        }`}
        title={showGrid ? "Ocultar cuadrícula de suelo" : "Mostrar cuadrícula de suelo"}
      >
        <Grid className="w-4 h-4" />
      </Button>

      <div className="h-4 w-[1px] bg-[#F0E4DD] mx-1" />

      {/* Background Palette */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="h-8 w-8 text-[#64748B] hover:text-[#0F172A] hover:bg-[#FFF1EA] rounded-full"
          title="Color de fondo del visor"
        >
          <Palette className="w-4 h-4" />
        </Button>

        {showColorPicker && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 p-2.5 bg-white/95 backdrop-blur-md border border-[#F0E4DD] rounded-2xl shadow-[0_12px_40px_rgba(60,24,8,0.16)] flex items-center gap-2">
            {BACKGROUND_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  onSelectBackground(p.value);
                  setShowColorPicker(false);
                }}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  backgroundColor === p.value
                    ? "ring-2 ring-[#FF6433] scale-110"
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
        className="h-8 w-8 text-[#64748B] hover:text-[#0F172A] hover:bg-[#FFF1EA] rounded-full"
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
