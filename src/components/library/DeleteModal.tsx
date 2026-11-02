"use client";

import React, { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Model3D } from "@/lib/types/models";
import { Trash2, AlertTriangle, CheckCircle2, Lock } from "lucide-react";

interface DeleteModalProps {
  model: Model3D | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteSuccess: () => void;
}

export function DeleteModal({ model, open, onOpenChange, onDeleteSuccess }: DeleteModalProps) {
  const [passwordInput, setPasswordInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  if (!model) return null;

  const handleClose = () => {
    setIsDeleting(false);
    setErrorMessage(null);
    setIsDone(false);
    setPasswordInput("");
    onOpenChange(false);
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordInput) return;

    if (passwordInput !== "CheatCook2026") {
      setErrorMessage("Contraseña incorrecta. Solo usuarios autorizados pueden eliminar modelos.");
      return;
    }

    if (model.status === "updating" || model.is_locked) {
      setErrorMessage("No se puede eliminar un modelo mientras tiene una actualización en curso.");
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/models/${model.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fallo al eliminar el modelo.");
      }

      setIsDone(true);
      setTimeout(() => {
        onDeleteSuccess();
        handleClose();
      }, 900);
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || "Error al eliminar el modelo.");
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-rose-600">
          <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
            <Trash2 className="w-5 h-5" />
          </div>
          ¿Eliminar modelo de Cheat Cook?
        </DialogTitle>
        <DialogDescription>
          Esta acción eliminará de forma irreversible el modelo <strong className="text-[#0F172A] font-semibold">{model.name}</strong> y liberará su espacio del almacenamiento.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleDelete} className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#FF6433]" />
            Contraseña de autorización
          </label>
          <Input
            type="password"
            placeholder="Introduce la contraseña para confirmar..."
            value={passwordInput}
            onChange={(e) => {
              setPasswordInput(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            disabled={isDeleting || isDone}
            className="rounded-xl bg-[#FFF8F4] border-[#F0E4DD] text-[#0F172A] placeholder:text-[#94A3B8] focus-visible:ring-rose-500"
            autoFocus
          />
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isDone && (
          <div className="flex items-center gap-2 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Modelo eliminado exitosamente de Cheat Cook.</span>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isDeleting || isDone}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="destructive"
            isLoading={isDeleting}
            disabled={!passwordInput.trim() || isDeleting || isDone}
            className="gap-2 font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar definitivamente
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
