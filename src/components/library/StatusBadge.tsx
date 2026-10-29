import React from "react";
import { Badge } from "@/components/ui/Badge";
import { ModelStatus } from "@/lib/types/models";
import { CheckCircle2, AlertCircle, Loader2, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StatusBadgeProps {
  status: ModelStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status) {
    case "available":
      return (
        <Badge variant="success" className={cn("gap-1.5 font-semibold", className)}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Disponible</span>
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="warning" className={cn("gap-1.5 font-semibold animate-pulse", className)}>
          <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
          <span>Procesando</span>
        </Badge>
      );
    case "updating":
      return (
        <Badge variant="default" className={cn("gap-1.5 font-semibold animate-pulse", className)}>
          <RefreshCw className="w-3 h-3 text-[#FF7A50] animate-spin" />
          <span>Actualizando</span>
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive" className={cn("gap-1.5 font-semibold", className)}>
          <AlertCircle className="w-3 h-3 text-rose-400" />
          <span>Error de procesamiento</span>
        </Badge>
      );
    case "pending_upload":
    default:
      return (
        <Badge variant="secondary" className={cn("gap-1.5 font-semibold", className)}>
          <Clock className="w-3 h-3 text-[#8391A9]" />
          <span>Pendiente de subida</span>
        </Badge>
      );
  }
}
