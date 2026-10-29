"use client";

import React, { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Model3D } from "@/lib/types/models";
import { Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface DeleteModalProps {
  model: Model3D | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteSuccess: () => void;
}

export function DeleteModal({ model, open, onOpenChange, onDeleteSuccess }: DeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  if (!model) return null;

  const handleClose = () => {
    setIsDeleting(false);
    setErrorMessage(null);
    setIsDone(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (model.status === "updating" || model.is_locked) {
      setErrorMessage("No se puede eliminar un modelo mientras tiene una actualización en curso.");
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/models/${model.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fallo al eliminar el modelo.");
      }

      setIsDone(true);
      setTimeout(() => {
        onDeleteSuccess();
        handleClose();
      }, 1000);
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || "Error al eliminar el modelo.");
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-rose-400">
          <AlertTriangle className="w-5 h-5 text-rose-500" />
          ¿Eliminar modelo de Cheat Cook?
        </DialogTitle>
        <DialogDescription>
          Esta acción eliminará de forma irreversible el modelo <strong className="text-white font-semibold">{model.name}</strong>, incluyendo todas sus versiones históricas (.blend y .glb) de Supabase Storage.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-2">
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-xs space-y-1.5">
          <div className="font-semibold text-rose-300">Archivos que se eliminarán del almacenamiento:</div>
          <ul className="list-disc list-inside text-[#A7B3C6] font-mono space-y-0.5">
            <li>{model.source_path || "Archivo original .blend"}</li>
            {model.viewer_path && <li>{model.viewer_path}</li>}
          </ul>
        </div>

        {errorMessage && (
          <div className="p-3 text-xs text-rose-300 bg-rose-500/20 border border-rose-500/35 rounded-xl">
            {errorMessage}
          </div>
        )}

        {isDone && (
          <div className="flex items-center gap-2 p-3 text-xs text-emerald-300 bg-emerald-500/20 border border-emerald-500/35 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Modelo y almacenamiento eliminados exitosamente.</span>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={handleClose}
          disabled={isDeleting || isDone}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="destructive"
          isLoading={isDeleting}
          disabled={isDeleting || isDone}
          onClick={handleDelete}
          className="gap-2 font-semibold"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar definitivamente
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
