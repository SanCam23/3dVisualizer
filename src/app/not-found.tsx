import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CheatCookLogo } from "@/components/ui/CheatCookLogo";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 rounded-3xl bg-secondary/80 border border-border mb-4 shadow-lg">
        <CheatCookLogo className="w-14 h-14 opacity-50" />
      </div>
      <h2 className="text-xl font-extrabold text-white">Modelo 3D no encontrado</h2>
      <p className="text-xs text-[#A7B3C6] max-w-sm mt-1 mb-6">
        El modelo que buscas no existe o ha sido eliminado del catálogo de Cheat Cook.
      </p>
      <Link href="/">
        <Button className="font-semibold">Volver a la biblioteca 3D</Button>
      </Link>
    </div>
  );
}
