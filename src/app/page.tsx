"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Model3D } from "@/lib/types/models";
import { ModelCard } from "@/components/library/ModelCard";
import { ModelSearchFilter } from "@/components/library/ModelSearchFilter";
import { UploadModal } from "@/components/library/UploadModal";
import { UpdateModal } from "@/components/library/UpdateModal";
import { DeleteModal } from "@/components/library/DeleteModal";
import { CheatCookLogo } from "@/components/ui/CheatCookLogo";
import { Button } from "@/components/ui/Button";
import { Layers, RefreshCw, AlertCircle, Plus, Sparkles } from "lucide-react";

export default function LibraryPage() {
  const [models, setModels] = useState<Model3D[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedForUpdate, setSelectedForUpdate] = useState<Model3D | null>(null);
  const [selectedForDelete, setSelectedForDelete] = useState<Model3D | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/models?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudieron obtener los modelos.");
      }

      setModels(data.models || []);
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || "Fallo de conexión al cargar la biblioteca.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Statistics calculation
  const totalModels = models.length;
  const availableCount = models.filter((m) => m.status === "available").length;
  const processingCount = models.filter(
    (m) => m.status === "processing" || m.status === "updating"
  ).length;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
      {/* Top Title & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-[#FF6433]" />
            Biblioteca de Modelos 3D
          </h1>
          <p className="text-sm text-[#A7B3C6] mt-1.5 max-w-2xl leading-relaxed">
            Sube tus archivos originales de Blender <span className="font-mono text-[#FF7A50] font-semibold bg-[#FF6433]/10 px-1.5 py-0.5 rounded-md">.blend</span>. El sistema los procesa en segundo plano a <span className="font-mono text-[#FF7A50] font-semibold bg-[#FF6433]/10 px-1.5 py-0.5 rounded-md">.glb</span> para su visualización 3D interactiva en el visor de Cheat Cook.
          </p>
        </div>

        {/* Quick Stats Counters */}
        <div className="flex items-center gap-2.5 text-xs">
          <div className="px-3.5 py-2 rounded-2xl bg-card border border-border shadow-sm">
            <span className="text-[#8391A9] block text-[10px] uppercase font-mono tracking-wider font-semibold">
              Disponibles
            </span>
            <span className="font-extrabold text-emerald-400 text-base">{availableCount}</span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-card border border-border shadow-sm">
            <span className="text-[#8391A9] block text-[10px] uppercase font-mono tracking-wider font-semibold">
              En proceso
            </span>
            <span className="font-extrabold text-amber-400 text-base">{processingCount}</span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-card border border-border shadow-sm">
            <span className="text-[#8391A9] block text-[10px] uppercase font-mono tracking-wider font-semibold">
              Total Activos
            </span>
            <span className="font-extrabold text-white text-base">{totalModels}</span>
          </div>
        </div>
      </div>

      {/* Search and Action Toolbar */}
      <ModelSearchFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onOpenUpload={() => setIsUploadOpen(true)}
        totalModels={totalModels}
      />

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchModels()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Reintentar
          </Button>
        </div>
      )}

      {/* Loading state skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 rounded-2xl border border-border bg-card/40" />
          ))}
        </div>
      )}

      {/* Models Grid */}
      {!isLoading && !errorMessage && models.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onUpdate={(m) => setSelectedForUpdate(m)}
              onDelete={(m) => setSelectedForDelete(m)}
            />
          ))}
        </div>
      )}

      {/* Empty State when no models match search */}
      {!isLoading && !errorMessage && models.length === 0 && searchQuery && (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border bg-card/30 flex flex-col items-center">
          <div className="p-4 rounded-2xl bg-secondary mb-3">
            <CheatCookLogo className="w-10 h-10 opacity-40" />
          </div>
          <h3 className="font-bold text-white text-base">
            No se encontraron modelos
          </h3>
          <p className="text-xs text-[#8391A9] max-w-sm mt-1 mb-5">
            No hay ningún modelo que coincida con el término &ldquo;{searchQuery}&rdquo;.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      )}

      {/* Empty State when library is empty (Brand Cheat Cook) */}
      {!isLoading && !errorMessage && models.length === 0 && !searchQuery && (
        <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-[#FF6433]/30 bg-gradient-to-b from-[#121B2D]/90 to-[#0B1220]/90 backdrop-blur-sm flex flex-col items-center shadow-lg">
          <div className="relative mb-5 p-4 rounded-3xl bg-gradient-to-br from-[#FF6433]/20 via-[#FF6433]/10 to-transparent border border-[#FF6433]/30 shadow-[0_0_30px_rgba(255,100,51,0.2)]">
            <CheatCookLogo className="w-16 h-16 drop-shadow-md" />
          </div>
          <h3 className="font-extrabold text-white text-xl tracking-tight">
            La biblioteca 3D de Cheat Cook está vacía
          </h3>
          <p className="text-sm text-[#A7B3C6] max-w-md mt-2 mb-7 leading-relaxed">
            Comienza subiendo tu primer archivo <span className="font-mono text-[#FF7A50] font-semibold bg-[#FF6433]/10 px-1.5 py-0.5 rounded">.blend</span> de Blender. El worker se encargará de su conversión automática a <span className="font-mono text-[#FF7A50] font-semibold bg-[#FF6433]/10 px-1.5 py-0.5 rounded">.glb</span> para visualizarlo interactivamente.
          </p>
          <Button
            onClick={() => setIsUploadOpen(true)}
            size="lg"
            className="gap-2.5 shadow-lg shadow-[#FF6433]/25"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            Subir mi primer modelo .blend
          </Button>
        </div>
      )}

      {/* Modals */}
      <UploadModal
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUploadSuccess={() => fetchModels()}
      />

      <UpdateModal
        model={selectedForUpdate}
        open={Boolean(selectedForUpdate)}
        onOpenChange={(open) => !open && setSelectedForUpdate(null)}
        onUpdateSuccess={() => fetchModels()}
      />

      <DeleteModal
        model={selectedForDelete}
        open={Boolean(selectedForDelete)}
        onOpenChange={(open) => !open && setSelectedForDelete(null)}
        onDeleteSuccess={() => fetchModels()}
      />
    </div>
  );
}
