import * as THREE from "three";

/**
 * Resolves a sensible fallback color based on material and mesh name heuristics
 * when Blender exports an untextured model with black base color and white emissive.
 */
export function resolveHeuristicColor(matName: string = "", meshName: string = ""): string {
  const s = `${matName} ${meshName}`.toLowerCase();

  // Watermelon parts
  if (s.includes("sandia_flesh") || s.includes("sandiaflesh")) return "#E11D48";
  if (s.includes("sandia_whiterind") || s.includes("whiterind")) return "#ECFDF5";
  if (s.includes("sandia_stripe") || s.includes("sandiastripe")) return "#4ADE80";
  if (s.includes("sandia_seed") || s.includes("sandiaseed")) return "#18181B";
  if (
    s.includes("sandia_base") ||
    s.includes("sandiabase") ||
    s.includes("sandia") ||
    s.includes("watermelon")
  ) {
    return "#14532D";
  }

  // Strawberry parts
  if (s.includes("fresa_seed") || s.includes("fresaseed")) return "#FEF08A";
  if (s.includes("fresa") || s.includes("strawberry")) return "#EF4444";

  // Banana parts
  if (s.includes("platano_stem") || s.includes("bananastem")) return "#854D0E";
  if (s.includes("platano_tip") || s.includes("bananatip")) return "#451A03";
  if (s.includes("platano") || s.includes("banana")) return "#FACC15";

  // Melon parts
  if (s.includes("melon_cavity")) return "#FEF08A";
  if (s.includes("melon_flesh")) return "#FDE047";
  if (s.includes("melon") || s.includes("cantaloupe")) return "#65A30D";

  // Cherries, apples, pomegranate
  if (s.includes("cereza") || s.includes("cherry")) return "#991B1B";
  if (s.includes("granada") || s.includes("pomegranate")) return "#BE123C";
  if (s.includes("manzana") || s.includes("apple")) return "#DC2626";

  // Grapes, plum, fig
  if (s.includes("uva") || s.includes("grape")) return "#7E22CE";
  if (s.includes("ciruela") || s.includes("plum")) return "#6B21A8";
  if (s.includes("higo") || s.includes("fig")) return "#4C1D95";

  // Peach, apricot, persimmon, loquat, mandarin, orange, pear
  if (s.includes("albaricoque") || s.includes("apricot")) return "#FB923C";
  if (s.includes("caqui") || s.includes("persimmon")) return "#EA580C";
  if (s.includes("mandarina") || s.includes("mandarin")) return "#F97316";
  if (s.includes("naranja") || s.includes("orange")) return "#EA580C";
  if (s.includes("melocoton") || s.includes("peach")) return "#FB7185";
  if (s.includes("nispero") || s.includes("loquat")) return "#F59E0B";
  if (s.includes("pera") || s.includes("pear")) return "#84CC16";

  // Stems, wood, leaves, seeds
  if (
    s.includes("wood") ||
    s.includes("stem") ||
    s.includes("brown") ||
    s.includes("marron") ||
    s.includes("tronco") ||
    s.includes("rama")
  ) {
    return "#78350F";
  }
  if (s.includes("dark_green") || s.includes("darkgreen")) return "#166534";
  if (
    s.includes("green_leaf") ||
    s.includes("leaf") ||
    s.includes("green") ||
    s.includes("verde") ||
    s.includes("hoja")
  ) {
    return "#22C55E";
  }
  if (s.includes("seed") || s.includes("semilla")) return "#18181B";

  // Cheat Cook Fridge / Kitchen model branding
  if (
    s.includes("cabinet") ||
    s.includes("door") ||
    s.includes("foot") ||
    s.includes("fridge") ||
    s.includes("nevera") ||
    s.includes("cuerpo")
  ) {
    return "#FF6433";
  }
  if (
    s.includes("cream") ||
    s.includes("hat") ||
    s.includes("gorro") ||
    s.includes("handle") ||
    s.includes("tirador") ||
    s.includes("divider") ||
    s.includes("balda") ||
    s.includes("liner") ||
    s.includes("shelf")
  ) {
    return "#FFF8F4";
  }

  // Generic color keywords
  if (s.includes("red") || s.includes("rojo")) return "#DC2626";
  if (s.includes("blue") || s.includes("azul")) return "#2563EB";
  if (s.includes("yellow") || s.includes("amarillo")) return "#EAB308";
  if (s.includes("purple") || s.includes("morado") || s.includes("violeta")) return "#9333EA";
  if (s.includes("pink") || s.includes("rosa")) return "#EC4899";
  if (s.includes("white") || s.includes("blanco")) return "#F8FAFC";
  if (s.includes("black") || s.includes("negro")) return "#1E293B";
  if (s.includes("grey") || s.includes("gray") || s.includes("gris")) return "#64748B";

  // Neutral clean fallback (never force brand orange for arbitrary objects)
  return "#CBD5E1";
}

/**
 * Heals broken Blender export materials where baseColorFactor is black (0,0,0)
 * and emissiveFactor is pure white (1,1,1) with no texture map.
 */
export function healBrokenMaterial(material: THREE.Material, meshName: string = ""): void {
  if (
    material instanceof THREE.MeshStandardMaterial &&
    material.color?.getHex() === 0x000000 &&
    material.emissive?.getHex() === 0xffffff &&
    !material.map
  ) {
    material.emissive.set(0x000000);
    material.metalness = 0;
    material.roughness = 0.35;
    const colorHex = resolveHeuristicColor(material.name || "", meshName);
    material.color.set(colorHex);
    material.needsUpdate = true;
  }
}

