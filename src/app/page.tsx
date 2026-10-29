"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Model3D } from "@/lib/types/models";
import { ModelCard } from "@/components/library/ModelCard";
import { ModelSearchFilter } from "@/components/library/ModelSearchFilter";
import { UploadModal } from "@/components/library/UploadModal";
import { UpdateModal } from "@/components/library/UpdateModal";
import { DeleteModal } from "@/components/library/DeleteModal";
import { SystemStatusBanner } from "@/components/library/SystemStatusBanner";
import { Button } from "@/components/ui/Button";
import { Box, Layers, RefreshCw, AlertCircle, Plus } from "lucide-react";

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-7 h-7 text-primary" />
            Biblioteca de Modelos 3D
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Repositorio centralizado de activos 3D en formato original <span className="font-mono text-primary font-medium">.blend</span> convertidos automáticamente a <span className="font-mono text-primary font-medium">.glb</span> para su visualización interactiva con Three.js.
          </p>
        </div>

        {/* Quick Stats Counter */}
        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-card border border-border">
            <span className="text-muted-foreground block text-[10px] uppercase font-mono">Disponibles</span>
            <span className="font-semibold text-emerald-400 text-sm">{availableCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-card border border-border">
            <span className="text-muted-foreground block text-[10px] uppercase font-mono">En proceso</span>
            <span className="font-semibold text-amber-400 text-sm">{processingCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-card border border-border">
            <span className="text-muted-foreground block text-[10px] uppercase font-mono">Total Activos</span>
            <span className="font-semibold text-foreground text-sm">{totalModels}</span>
          </div>
        </div>
      </div>

      {/* System Status Banner */}
      <SystemStatusBanner />

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
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{errorMessage}</span>
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
            <div key={i} className="h-72 rounded-xl border border-border bg-card/40" />
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
        <div className="text-center py-16 px-4 rounded-xl border border-dashed border-border bg-card/20 flex flex-col items-center">
          <div className="p-4 rounded-full bg-secondary mb-3">
            <Box className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground text-base">
            No se encontraron modelos
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
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

      {/* Empty State when library is empty */}
      {!isLoading && !errorMessage && models.length === 0 && !searchQuery && (
        <div className="text-center py-20 px-4 rounded-xl border border-dashed border-border bg-card/20 flex flex-col items-center">
          <div className="p-4 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Box className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground text-lg">
            La biblioteca está vacía
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
            Comienza subiendo tu primer archivo <span className="font-mono text-primary font-medium">.blend</span> de Blender. El sistema se encargará de su conversión automática a <span className="font-mono text-primary font-medium">.glb</span> para su visualización interactiva.
          </p>
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="gap-2 shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
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

