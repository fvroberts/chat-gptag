export const W = 1200,
  H = 720;
export type Surface = "stone" | "ice" | "moving" | "crumble";
export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  type: Surface;
  solid?: boolean;
  axis?: "x" | "y";
  range?: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface Arena {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  sky: string;
  ground: string;
  accent: string;
  theme: string;
  platforms: Platform[];
  portals: Point[];
  pads: Point[];
  spawns: Point[];
  pickups: Point[];
  zones: { x: number; y: number; w: number; h: number }[];
  hazards: { x: number; y: number; w: number; h: number }[];
}
const p = (
  x: number,
  y: number,
  w: number,
  type: Surface = "stone",
  axis?: "x" | "y",
  range?: number,
): Platform => ({ x, y, w, h: 18, type, axis, range });
const floor: Platform = { ...p(0, 680, 1200), solid: true };
export const arenas: Arena[] = [
  {
    id: "forest",
    name: "Classic Forest",
    subtitle: "A little wild. A lot of shortcuts.",
    color: "#c7f36a",
    sky: "#193e36",
    ground: "#51805a",
    accent: "#c7f36a",
    theme: "forest",
    platforms: [
      floor,
      p(70, 558, 240),
      p(445, 558, 310),
      p(890, 558, 240),
      p(210, 438, 260),
      p(660, 438, 280),
      p(40, 318, 250),
      p(450, 318, 300),
      p(930, 318, 220),
      p(280, 198, 230),
      p(720, 198, 220),
    ],
    portals: [
      { x: 130, y: 532 },
      { x: 1020, y: 292 },
    ],
    pads: [
      { x: 365, y: 680 },
      { x: 825, y: 680 },
    ],
    spawns: [
      { x: 180, y: 558 },
      { x: 1000, y: 558 },
      { x: 600, y: 558 },
    ],
    pickups: [
      { x: 350, y: 398 },
      { x: 820, y: 398 },
      { x: 600, y: 278 },
      { x: 400, y: 158 },
    ],
    zones: [],
    hazards: [],
  },
  {
    id: "winter",
    name: "Winter Wonderland",
    subtitle: "Keep your cool. Find your footing.",
    color: "#b5eafc",
    sky: "#233f62",
    ground: "#78b9d2",
    accent: "#d5f6ff",
    theme: "winter",
    platforms: [
      floor,
      p(20, 560, 290, "ice"),
      p(450, 560, 300, "ice"),
      p(880, 560, 300, "ice"),
      p(220, 440, 280, "ice"),
      p(690, 440, 280, "ice"),
      p(45, 320, 270),
      p(460, 320, 280, "moving", "x", 50),
      p(885, 320, 270),
      p(245, 200, 260, "ice"),
      p(700, 200, 260, "ice"),
    ],
    portals: [
      { x: 75, y: 534 },
      { x: 1080, y: 294 },
    ],
    pads: [
      { x: 380, y: 680 },
      { x: 810, y: 680 },
    ],
    spawns: [
      { x: 145, y: 560 },
      { x: 1020, y: 560 },
      { x: 600, y: 560 },
    ],
    pickups: [
      { x: 350, y: 400 },
      { x: 840, y: 400 },
      { x: 600, y: 280 },
      { x: 375, y: 160 },
    ],
    zones: [],
    hazards: [],
  },
  {
    id: "desert",
    name: "Desert Ruins",
    subtitle: "Ancient routes. Brand-new rivals.",
    color: "#ffd48c",
    sky: "#583749",
    ground: "#c38b64",
    accent: "#ffd48c",
    theme: "desert",
    platforms: [
      floor,
      p(40, 560, 260),
      p(430, 560, 330),
      p(910, 560, 250),
      p(180, 440, 290),
      p(730, 440, 290),
      p(25, 320, 220),
      p(430, 320, 330, "crumble"),
      p(975, 320, 200),
      p(220, 200, 270),
      p(750, 200, 260),
    ],
    portals: [
      { x: 540, y: 534 },
      { x: 340, y: 174 },
    ],
    pads: [
      { x: 355, y: 680 },
      { x: 840, y: 680 },
    ],
    spawns: [
      { x: 150, y: 560 },
      { x: 1040, y: 560 },
      { x: 610, y: 560 },
    ],
    pickups: [
      { x: 330, y: 400 },
      { x: 870, y: 400 },
      { x: 600, y: 280 },
      { x: 880, y: 160 },
    ],
    zones: [{ x: 490, y: 642, w: 220, h: 38 }],
    hazards: [],
  },
  {
    id: "volcano",
    name: "Volcano Escape",
    subtitle: "The floor is lava. Almost.",
    color: "#ff9576",
    sky: "#382638",
    ground: "#735068",
    accent: "#ff9576",
    theme: "volcano",
    platforms: [
      floor,
      p(0, 555, 300),
      p(435, 555, 320, "moving", "x", 35),
      p(900, 555, 300),
      p(170, 435, 270),
      p(750, 435, 260),
      p(20, 315, 240),
      p(450, 315, 300),
      p(960, 315, 230),
      p(260, 195, 230, "crumble"),
      p(745, 195, 240),
    ],
    portals: [
      { x: 115, y: 529 },
      { x: 1070, y: 289 },
    ],
    pads: [
      { x: 335, y: 680 },
      { x: 850, y: 680 },
    ],
    spawns: [
      { x: 155, y: 555 },
      { x: 1040, y: 555 },
      { x: 600, y: 555 },
    ],
    pickups: [
      { x: 310, y: 395 },
      { x: 860, y: 395 },
      { x: 600, y: 275 },
      { x: 370, y: 155 },
    ],
    zones: [],
    hazards: [{ x: 480, y: 669, w: 240, h: 11 }],
  },
  {
    id: "neon",
    name: "Neon City",
    subtitle: "Take the high road. At high speed.",
    color: "#c0a6ff",
    sky: "#27243e",
    ground: "#66569a",
    accent: "#bda1ff",
    theme: "neon",
    platforms: [
      floor,
      p(20, 558, 300),
      p(440, 558, 300),
      p(880, 558, 300),
      p(180, 438, 280),
      p(720, 438, 280),
      p(25, 318, 260),
      p(455, 318, 290, "moving", "x", 45),
      p(930, 318, 250),
      p(245, 198, 250),
      p(720, 198, 250),
    ],
    portals: [
      { x: 600, y: 532 },
      { x: 380, y: 172 },
    ],
    pads: [
      { x: 375, y: 680 },
      { x: 825, y: 680 },
    ],
    spawns: [
      { x: 160, y: 558 },
      { x: 1030, y: 558 },
      { x: 600, y: 558 },
    ],
    pickups: [
      { x: 320, y: 398 },
      { x: 860, y: 398 },
      { x: 600, y: 278 },
      { x: 850, y: 158 },
    ],
    zones: [
      { x: 80, y: 642, w: 240, h: 38 },
      { x: 880, y: 642, w: 240, h: 38 },
    ],
    hazards: [],
  },
  {
    id: "sky",
    name: "Sky Islands",
    subtitle: "Big air. Bigger escapes.",
    color: "#ffd3ec",
    sky: "#476381",
    ground: "#aabbd0",
    accent: "#ffd3ec",
    theme: "sky",
    platforms: [
      floor,
      p(30, 558, 260),
      p(445, 558, 310),
      p(920, 558, 250),
      p(190, 438, 260, "crumble"),
      p(735, 438, 270),
      p(15, 318, 245),
      p(450, 318, 300, "moving", "y", 24),
      p(955, 318, 230),
      p(255, 198, 240),
      p(725, 198, 240),
    ],
    portals: [
      { x: 120, y: 532 },
      { x: 1070, y: 292 },
    ],
    pads: [
      { x: 350, y: 680 },
      { x: 850, y: 680 },
    ],
    spawns: [
      { x: 145, y: 558 },
      { x: 1040, y: 558 },
      { x: 600, y: 558 },
    ],
    pickups: [
      { x: 320, y: 398 },
      { x: 870, y: 398 },
      { x: 600, y: 278 },
      { x: 850, y: 158 },
    ],
    zones: [],
    hazards: [],
  },
];
