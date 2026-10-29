import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Box } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 rounded-full bg-secondary mb-4">
        <Box className="w-12 h-12 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Modelo no encontrado</h2>
      <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
        El modelo que buscas no existe o ha sido eliminado del catálogo.
      </p>
      <Link href="/">
        <Button>Volver a la biblioteca</Button>
      </Link>
    </div>
  );
}

