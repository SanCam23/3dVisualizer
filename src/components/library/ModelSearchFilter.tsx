"use client";

import React from "react";
import { Search, Plus, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ModelSearchFilterProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onOpenUpload: () => void;
  totalModels: number;
}

export function ModelSearchFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenUpload,
  totalModels,
}: ModelSearchFilterProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-card/40 p-4 rounded-xl border border-border">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Buscar modelos por nombre..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-8 bg-background/50 border-border text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter and Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-background/50 border border-border rounded-lg px-2.5 py-1">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-card text-foreground">Todos los estados</option>
            <option value="available" className="bg-card text-foreground">Disponibles</option>
            <option value="processing" className="bg-card text-foreground">En procesamiento</option>
            <option value="updating" className="bg-card text-foreground">Actualizando</option>
            <option value="error" className="bg-card text-foreground">Con error</option>
          </select>
        </div>

        {/* Counter badge */}
        <span className="hidden sm:inline-block text-xs font-mono text-muted-foreground border-l border-border pl-3">
          {totalModels} {totalModels === 1 ? "modelo" : "modelos"}
        </span>

        {/* Subir Modelo Button */}
        <Button
          onClick={onOpenUpload}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-md shadow-primary/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Subir modelo
        </Button>
      </div>
    </div>
  );
}

