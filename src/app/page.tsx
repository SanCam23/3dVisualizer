"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Model3D } from "@/lib/types/models";
import { ModelCard } from "@/components/library/ModelCard";
import { ModelSearchFilter } from "@/components/library/ModelSearchFilter";
import { UploadModal } from "@/components/library/UploadModal";
import { UpdateModal } from "@/components/library/UpdateModal";
import { DeleteModal } from "@/components/library/DeleteModal";
import { CheatCookLogo } from "@/components/ui/CheatCookLogo";
import { Button } from "@/components/ui/Button";
import { Layers, RefreshCw, AlertCircle, Plus } from "lucide-react";

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
      const res = await fetch("/api/models");
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
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Client-side instant filtering (0ms network latency, no flickering)
  const filteredModels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return models.filter((m) => {
      const matchesSearch = !q || m.name.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [models, searchQuery, statusFilter]);

  // Statistics calculation (based on complete library)
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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-[#FF6433]" />
            Biblioteca de Modelos 3D
          </h1>
          <p className="text-sm text-[#475569] mt-1.5 max-w-2xl leading-relaxed">
            Sube tus modelos en formato 3D nativo <span className="font-mono text-[#C2410C] font-semibold bg-[#FF6433]/10 px-1.5 py-0.5 rounded-md">.glb</span> con materiales y texturas integradas. Visualización interactiva inmediata en el visor 3D de Cheat Cook.
          </p>
        </div>

        {/* Quick Stats Counters */}
        <div className="flex items-center gap-2.5 text-xs">
          <div className="px-3.5 py-2 rounded-2xl bg-white border border-border shadow-sm">
            <span className="text-[#64748B] block text-[10px] uppercase font-mono tracking-wider font-semibold">
              Disponibles
            </span>
            <span className="font-extrabold text-emerald-600 text-base">{availableCount}</span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-white border border-border shadow-sm">
            <span className="text-[#64748B] block text-[10px] uppercase font-mono tracking-wider font-semibold">
              En proceso
            </span>
            <span className="font-extrabold text-amber-600 text-base">{processingCount}</span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-white border border-border shadow-sm">
            <span className="text-[#64748B] block text-[10px] uppercase font-mono tracking-wider font-semibold">
              Total Activos
            </span>
            <span className="font-extrabold text-[#0F172A] text-base">{totalModels}</span>
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
      {!isLoading && !errorMessage && filteredModels.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onUpdate={(m) => setSelectedForUpdate(m)}
              onDelete={(m) => setSelectedForDelete(m)}
              onStatusChange={(id, newStatus) => {
                setModels((prev) =>
                  prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
                );
              }}
            />
          ))}
        </div>
      )}

      {/* Empty State when no models match search */}
      {!isLoading && !errorMessage && filteredModels.length === 0 && (searchQuery || statusFilter !== "all") && (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border bg-white shadow-sm flex flex-col items-center">
          <div className="p-4 rounded-2xl bg-[#FFF1EA] mb-3">
            <CheatCookLogo className="w-10 h-10 opacity-70" />
          </div>
          <h3 className="font-bold text-[#0F172A] text-base">
            No se encontraron modelos
          </h3>
          <p className="text-xs text-[#64748B] max-w-sm mt-1 mb-5">
            {searchQuery
              ? `No hay ningún modelo que coincida con el término "${searchQuery}".`
              : "No hay ningún modelo con el filtro de estado seleccionado."}
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
      {!isLoading && !errorMessage && models.length === 0 && !searchQuery && statusFilter === "all" && (
        <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-[#FF6433]/30 bg-gradient-to-b from-[#FFF1EA]/80 to-[#FFF8F4] flex flex-col items-center shadow-sm">
          <div className="relative mb-5 p-4 rounded-3xl bg-[#FFF1EA] border border-[#FF6433]/30 shadow-[0_4px_20px_rgba(255,100,51,0.15)]">
            <CheatCookLogo className="w-16 h-16 drop-shadow-sm" />
          </div>
          <h3 className="font-extrabold text-[#0F172A] text-xl tracking-tight">
            La biblioteca 3D de Cheat Cook está vacía
          </h3>
          <p className="text-sm text-[#475569] max-w-md mt-2 mb-7 leading-relaxed">
            Comienza subiendo tu primer archivo <span className="font-mono text-[#C2410C] font-semibold bg-[#FF6433]/10 px-1.5 py-0.5 rounded">.glb</span> compilado. Estará disponible de inmediato con su miniatura para visualizarlo interactivamente.
          </p>
          <Button
            onClick={() => setIsUploadOpen(true)}
            size="lg"
            className="gap-2.5 shadow-lg shadow-[#FF6433]/25"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            Subir mi primer modelo .glb
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
