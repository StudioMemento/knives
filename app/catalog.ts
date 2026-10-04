export type KnifeId = "combat" | "folding" | "pocket" | "gerber";
type ChapterId = "blade" | "handle" | "section" | "configuration" | "return";

type KnifeStat = { label: string; value: number; code: string };
type Finish = { name: string; note: string; color: string; price: number };
export type Knife = {
  id: KnifeId;
  index: string;
  name: string;
  family: string;
  world: string;
  worldNote: string;
  model: string;
  folding?: boolean;
  accent: string;
  materialTitle: string;
  materialCopy: string;
  materials: Array<{ label: string; value: string; note: string }>;
  stats: KnifeStat[];
  finishes: Finish[];
};

export const CHAPTERS: Array<{ id: ChapterId; label: string }> = [
 {id:'blade',label:'Blade'},{id:'handle',label:'Handle'},{id:'configuration',label:'Configure'},{id:'return',label:'Collection'},
];

export const KNIVES: Knife[] = [
  {
    id: "combat",
    index: "01",
    name: "M9 Sentinel",
    family: "Combat system",
    world: "The Breach",
    worldNote: "Forged pressure / urban combat",
    model: "/models/combat-m9.gltf",
    accent: "#ff5b32",
    materialTitle: "Built to absorb impact.",
    materialCopy: "A full-tang field construction designed around hard contact, predictable balance and an immediate locked grip.",
    materials: [
      { label: "Blade", value: "D2 Tool Steel", note: "60–62 HRC" },
      { label: "Handle", value: "G10 Composite", note: "Cross-cut texture" },
      { label: "Coating", value: "DLC Ceramic", note: "Low reflection" },
    ],
    stats: [
      { label: "Resistance", value: 93, code: "MIL" },
      { label: "Penetration", value: 97, code: "9.7" },
      { label: "Grip", value: 91, code: "LOCK" },
      { label: "Control", value: 86, code: "OPS" },
      { label: "Safety", value: 82, code: "S3" },
    ],
    finishes: [
      { name: "Obsidian", note: "DLC black", color: "#202124", price: 249 },
      { name: "Ember", note: "Oxide red", color: "#b63d24", price: 269 },
      { name: "Field Sand", note: "Cerakote", color: "#a68c68", price: 279 },
    ],
  },
  {
    id: "folding",
    index: "02",
    name: "Folding Knife",
    family: "Folding collection",
    world: "Amber / Workshop",
    worldNote: "Articulated steel / warm light",
    model: "/models/folding/folding_knife.optimized.gltf",
    folding: true,
    accent: "#ffd64a",
    materialTitle: "Function, reduced to essentials.",
    materialCopy: "A compact everyday tool where every surface has a purpose: fast access, controlled cuts and replaceable working parts.",
    materials: [
      { label: "Blade", value: "Drop-point blade", note: "Bevelled edge · Folding construction" },
      { label: "Handle", value: "Contoured grip", note: "Textured scales · Pocket clip" },
      { label: "Mechanism", value: "Folding blade", note: "Open / close" },
    ],
    stats: [
      { label: "Resistance", value: 86, code: "IND" },
      { label: "Precision", value: 88, code: "0.4" },
      { label: "Grip", value: 92, code: "RIB" },
      { label: "Usability", value: 98, code: "MAX" },
      { label: "Safety", value: 95, code: "S5" },
    ],
    finishes: [
      { name: "Signal", note: "Anodized yellow", color: "#e2bb20", price: 89 },
      { name: "Graphite", note: "Hard anodized", color: "#45494b", price: 99 },
      { name: "Moss", note: "Field green", color: "#4c6248", price: 99 },
    ],
  },
  {
    id: "pocket",
    index: "03",
    name: "Pocket Knife",
    family: "Pocket collection",
    world: "Glacier / Studio",
    worldNote: "Compact form / cold reflections",
    model: "/models/pocket/pocket_knife.optimized.gltf",
    folding: true,
    accent: "#45e3cf",
    materialTitle: "Made for water, salt and time.",
    materialCopy: "A corrosion-conscious composition balancing a flexible marine edge with the warmth of a naturally tactile handle.",
    materials: [
      { label: "Blade", value: "Profiled blade", note: "Opening hole · Articulated pivot" },
      { label: "Handle", value: "Layered grip", note: "Textured inlays · Exposed hardware" },
      { label: "Mechanism", value: "Folding blade", note: "Open / close" },
    ],
    stats: [
      { label: "Resistance", value: 84, code: "H₂O" },
      { label: "Sharpness", value: 89, code: "8.9" },
      { label: "Wet Grip", value: 96, code: "WET" },
      { label: "Control", value: 92, code: "FIELD" },
      { label: "Safety", value: 87, code: "S3" },
    ],
    finishes: [
      { name: "Current", note: "Satin steel", color: "#b8c8c6", price: 179 },
      { name: "Deep Sea", note: "Blue PVD", color: "#183f52", price: 199 },
      { name: "Copper Tide", note: "Rose PVD", color: "#a66e55", price: 209 },
    ],
  },
  {
    id: "gerber",
    index: "04",
    name: "Gerber Pocket Knife",
    family: "Gerber collection",
    world: "Moss / Field",
    worldNote: "Utility form / mineral light",
    model: "/models/gerber/gerber_pocket_knife.optimized.gltf",
    folding: true,
    accent: "#b1e788",
    materialTitle: "An edge treated as jewellery.",
    materialCopy: "Fine steel, hand-finished timber and controlled reflections turn a functional object into a quiet ritual piece.",
    materials: [
      { label: "Blade", value: "Bevelled blade", note: "Thumb stud · Folding construction" },
      { label: "Handle", value: "Open-frame handle", note: "Skeleton frame · Pocket clip" },
      { label: "Mechanism", value: "Folding blade", note: "Open / close" },
    ],
    stats: [
      { label: "Resistance", value: 88, code: "A+" },
      { label: "Sharpness", value: 91, code: "9.1" },
      { label: "Balance", value: 94, code: "50/50" },
      { label: "Control", value: 86, code: "SILK" },
      { label: "Safety", value: 90, code: "S4" },
    ],
    finishes: [
      { name: "Nocturne", note: "Black nickel", color: "#272526", price: 329 },
      { name: "Champagne", note: "Warm satin", color: "#c8a978", price: 349 },
      { name: "Copper Veil", note: "Rose polish", color: "#aa6648", price: 369 },
    ],
  },
];
