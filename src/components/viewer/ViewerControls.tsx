"use client";

import React, { useState } from "react";
import {
  RotateCcw,
  Focus,
  Grid,
  Box,
  Maximize2,
  Minimize2,
  Palette,
  Play,
  Pause,
  Film,
  ChevronUp,
  Sparkles,
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
  toonMode?: boolean;
  onToggleToonMode?: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  backgroundColor: string;
  onSelectBackground: (color: string) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  animations?: string[];
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  activeAnimationIndex?: number;
  onSelectAnimation?: (index: number) => void;
}

export function ViewerControls({
  onResetView,
  onCenterView,
  wireframe,
  onToggleWireframe,
  toonMode = true,
  onToggleToonMode,
  showGrid,
  onToggleGrid,
  backgroundColor,
  onSelectBackground,
  isFullscreen,
  onToggleFullscreen,
  animations = [],
  isPlaying = false,
  onTogglePlay,
  activeAnimationIndex = -1,
  onSelectAnimation,
}: ViewerControlsProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAnimationList, setShowAnimationList] = useState(false);

  const hasAnimations = animations && animations.length > 0;

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

      {/* Animation Play/Pause & Selector (Only when GLB contains animations) */}
      {hasAnimations && (
        <>
          <div className="h-4 w-[1px] bg-[#F0E4DD] mx-1" />

          {/* Play / Pause Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePlay}
            className={`h-8 px-3 rounded-full gap-1.5 text-xs font-semibold transition-all select-none ${
              isPlaying
                ? "bg-[#FF6433] text-white shadow-[0_2px_12px_rgba(255,100,51,0.35)] hover:bg-[#E84E1F] hover:text-white"
                : "bg-[#FFF1EA] text-[#FF6433] border border-[#FF6433]/30 hover:bg-[#FFE6DB] hover:text-[#FF6433]"
            }`}
            title={isPlaying ? "Pausar animación" : "Reproducir animación"}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Reproducir</span>
              </>
            )}
          </Button>

          {/* Multiple Animations Selector */}
          {animations.length > 1 && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAnimationList(!showAnimationList)}
                className="h-8 px-2.5 rounded-full text-xs font-mono font-medium text-[#475569] hover:bg-[#FFF1EA] hover:text-[#0F172A] gap-1"
                title="Seleccionar animación activa"
              >
                <Film className="w-3.5 h-3.5 text-[#FF6433]" />
                <span className="max-w-[85px] truncate">
                  {activeAnimationIndex === -1
                    ? "Todas"
                    : animations[activeAnimationIndex] || `Anim ${activeAnimationIndex + 1}`}
                </span>
                <ChevronUp
                  className={`w-3 h-3 text-[#94A3B8] transition-transform duration-200 ${
                    showAnimationList ? "" : "rotate-180"
                  }`}
                />
              </Button>

              {showAnimationList && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 p-1.5 bg-white/95 backdrop-blur-md border border-[#F0E4DD] rounded-2xl shadow-[0_12px_40px_rgba(60,24,8,0.16)] flex flex-col gap-1 min-w-[190px] max-h-48 overflow-y-auto z-30">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-[#94A3B8] uppercase px-3 py-1">
                    Pistas ({animations.length})
                  </span>
                  <button
                    onClick={() => {
                      onSelectAnimation?.(-1);
                      setShowAnimationList(false);
                    }}
                    className={`text-left text-xs px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center justify-between ${
                      activeAnimationIndex === -1
                        ? "bg-[#FFF1EA] text-[#FF6433] font-semibold"
                        : "text-[#475569] hover:bg-[#FFF8F4] hover:text-[#0F172A]"
                    }`}
                  >
                    <span className="truncate">Todas (Sincronizadas)</span>
                    {activeAnimationIndex === -1 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF6433] shrink-0 ml-2" />
                    )}
                  </button>
                  {animations.map((name, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onSelectAnimation?.(idx);
                        setShowAnimationList(false);
                      }}
                      className={`text-left text-xs px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center justify-between ${
                        activeAnimationIndex === idx
                          ? "bg-[#FFF1EA] text-[#FF6433] font-semibold"
                          : "text-[#475569] hover:bg-[#FFF8F4] hover:text-[#0F172A]"
                      }`}
                    >
                      <span className="truncate">{name}</span>
                      {activeAnimationIndex === idx && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6433] shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="h-4 w-[1px] bg-[#F0E4DD] mx-1" />

      {/* Cartoon / Toon Cel-Shading Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleToonMode}
        className={`h-8 w-8 rounded-full transition-all ${
          toonMode
            ? "bg-[#FF6433]/15 text-[#FF6433] border border-[#FF6433]/30 shadow-xs"
            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#FFF1EA]"
        }`}
        title={toonMode ? "Desactivar estilo Cartoon (volver a PBR estándar)" : "Activar estilo Cartoon (Toon / Cel-shading)"}
      >
        <Sparkles className="w-4 h-4" />
      </Button>

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
