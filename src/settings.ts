export interface Settings {
  duration: number;
  difficulty: "easy" | "normal" | "hard";
  powerups: boolean;
  hazards: boolean;
  music: number;
  sound: number;
  colors: string[];
  appearance: "bean" | "cat" | "robot";
}
export interface Stat {
  wins: number;
  losses: number;
  itTime: number;
}
const defaults: Settings = {
  duration: 60,
  difficulty: "normal",
  powerups: true,
  hazards: true,
  music: 0.22,
  sound: 0.55,
  colors: ["#ff8d78", "#82d9f3", "#ffdb79"],
  appearance: "bean",
};
function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? { ...fallback, ...JSON.parse(v) } : fallback;
  } catch {
    return fallback;
  }
}
export const settings = load<Settings>("tag-arena-settings", defaults);
export const stats = load<Record<string, Stat>>("tag-arena-stats", {});
export function saveSettings() {
  try {
    localStorage.setItem("tag-arena-settings", JSON.stringify(settings));
  } catch {}
}
export function saveStats() {
  try {
    localStorage.setItem("tag-arena-stats", JSON.stringify(stats));
  } catch {}
}
