import { arenas, H, W, type Arena, type Platform } from "./maps";
import { graphFor, route, type Edge } from "./navigation";
import { settings, stats, saveStats } from "./settings";
export type Mode = "solo" | "duo" | "trio";
export type Power = "speed" | "double" | "shield" | "super" | "slow" | "dash";
export const powerNames: Record<Power, string> = {
  speed: "SPEED",
  double: "DOUBLE JUMP",
  shield: "SHIELD",
  super: "SUPER JUMP",
  slow: "SLOWDOWN",
  dash: "DASH",
};
export const powerIcons: Record<Power, string> = {
  speed: "»",
  double: "↑↑",
  shield: "◇",
  super: "↑",
  slow: "⌛",
  dash: "↠",
};
export interface Input {
  left: boolean;
  right: boolean;
  jump: boolean;
  dash: boolean;
}
export interface Player {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  platform: number;
  grounded: boolean;
  coyote: number;
  buffer: number;
  held: boolean;
  dashHeld: boolean;
  jumps: number;
  portalCD: number;
  padCD: number;
  immune: number;
  effects: Partial<Record<Power, number>>;
  color: string;
  ai: boolean;
  itTime: number;
  facing: number;
  landed: number;
  aiClock: number;
  aiTarget: number;
  aiEdge?: Edge;
  aiFrom?: number;
  lastX: number;
  stuck: number;
}
export interface LivePlatform extends Platform {
  baseX: number;
  baseY: number;
  oldX: number;
  oldY: number;
  collapse: number;
  gone: number;
}
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}
export interface Pickup {
  x: number;
  y: number;
  kind: Power;
  age: number;
}
const neutral = (): Input => ({
  left: false,
  right: false,
  jump: false,
  dash: false,
});
export class Match {
  rules = { ...settings, colors: [...settings.colors] };
  arena: Arena;
  players: Player[];
  platforms: LivePlatform[];
  graph: Edge[][];
  particles: Particle[] = [];
  pickups: Pickup[] = [];
  time: number;
  elapsed = 0;
  it = 0;
  paused = false;
  ended = false;
  countdown = 2.5;
  spawnClock = 1;
  warning = 11;
  tickClock = 0;
  round: number;
  events: { name: string; x: number; y: number; color: string }[] = [];
  flash = 0;
  lastTagged = -1;
  constructor(
    public mode: Mode,
    map: number,
    round = 1,
  ) {
    this.arena = arenas[map];
    this.round = round;
    this.time = this.rules.duration;
    this.graph = graphFor(this.arena);
    this.platforms = this.arena.platforms.map((p) => ({
      ...p,
      baseX: p.x,
      baseY: p.y,
      oldX: p.x,
      oldY: p.y,
      collapse: 0,
      gone: 0,
    }));
    this.players = this.arena.spawns
      .slice(0, mode === "trio" ? 3 : 2)
      .map((p, id) => ({
        id,
        x: p.x,
        y: p.y - 19,
        vx: 0,
        vy: 0,
        platform: this.platforms.findIndex(
          (b) => Math.abs(b.y - p.y) < 2 && p.x >= b.x && p.x <= b.x + b.w,
        ),
        grounded: true,
        coyote: 0.1,
        buffer: 0,
        held: false,
        dashHeld: false,
        jumps: 0,
        portalCD: 0,
        padCD: 0,
        immune: 0,
        effects: {},
        color: mode === "solo" && id === 1 ? "#c7f36a" : this.rules.colors[id],
        ai: mode === "solo" && id === 1,
        itTime: 0,
        facing: 1,
        landed: 0,
        aiClock: 0,
        aiTarget: 0,
        lastX: p.x,
        stuck: 0,
      }));
    this.it = (round - 1) % this.players.length;
  }
  event(name: string, x: number, y: number, color = "#ffffff") {
    this.events.push({ name, x, y, color });
    for (let i = 0; i < 14; i++)
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 260,
        vy: (Math.random() - 0.7) * 240,
        life: 0.6,
        max: 0.6,
        color,
        size: 2 + Math.random() * 4,
      });
  }
  currentPlatform(p: Player) {
    if (p.grounded) return p.platform;
    let result = -1,
      best = Infinity;
    this.platforms.forEach((b, i) => {
      if (b.gone > 0) return;
      const d =
        Math.abs(p.x - Math.max(b.x, Math.min(b.x + b.w, p.x))) +
        Math.abs(p.y + 19 - b.y) * 1.3;
      if (d < best) {
        best = d;
        result = i;
      }
    });
    return result;
  }
  aiInput(p: Player, dt: number): Input {
    const input = neutral(),
      chaser = this.players[this.it],
      opponents = this.players.filter((o) => o.id !== p.id);
    let target = opponents.reduce((a, b) =>
      Math.hypot(a.x - p.x, a.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y)
        ? a
        : b,
    );
    p.aiClock -= dt;
    const current = this.currentPlatform(p);
    if (p.grounded && (p.aiClock <= 0 || p.aiFrom !== current)) {
      p.aiFrom = current;
      p.aiClock =
        this.rules.difficulty === "hard"
          ? 0.1
          : this.rules.difficulty === "normal"
            ? 0.22
            : 0.45;
      if (this.it === p.id) {
        p.aiTarget = this.currentPlatform(target);
      } else {
        let best = -Infinity;
        this.platforms.forEach((b, i) => {
          if (
            b.gone > 0 ||
            (i !== current && route(this.graph, current, i).length === 0)
          )
            return;
          const x = b.x + b.w / 2;
          const score =
            Math.hypot(x - chaser.x, b.y - chaser.y) * 1.2 -
            Math.hypot(x - p.x, b.y - p.y) * 0.25 +
            (680 - b.y) * 0.45 +
            (i === current ? -110 : 0);
          if (score > best) {
            best = score;
            p.aiTarget = i;
          }
        });
      }
      p.aiEdge = route(this.graph, current, p.aiTarget)[0];
    }
    const pickup = this.pickups
      .filter(
        (q) =>
          !p.effects[q.kind] &&
          Math.hypot(q.x - p.x, q.y - p.y) < 200 &&
          (this.it === p.id ||
            Math.hypot(chaser.x - p.x, chaser.y - p.y) > 170),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
      )[0];
    let aim = p.x;
    const edge = p.aiEdge;
    if (edge && (!p.grounded || edge.to !== current)) {
      const b = this.platforms[edge.to];
      if (!p.grounded && edge.kind === "portal") aim = p.x;
      else if (edge.kind === "portal") aim = edge.takeoff;
      else if (!p.grounded) {
        aim = b.x + b.w / 2;
        const source = this.platforms[p.aiFrom ?? -1];
        if (edge.kind === "drop" && source && p.y + 19 < source.y + 8) {
          const center = b.x + b.w / 2;
          aim =
            Math.abs(source.x - center) < Math.abs(source.x + source.w - center)
              ? source.x - 35
              : source.x + source.w + 35;
        }
      } else {
        aim = edge.takeoff;
        if (edge.kind === "bounce") {
          const pad = this.arena.pads
            .filter(
              (q) => Math.abs(q.y - (this.platforms[current]?.y ?? 0)) < 5,
            )
            .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
          if (pad) aim = pad.x;
        } else if (edge.kind === "drop") {
          const a = this.platforms[current];
          const center = b.x + b.w / 2;
          aim =
            Math.abs(a.x - center) < Math.abs(a.x + a.w - center)
              ? a.x - 25
              : a.x + a.w + 25;
        } else if (Math.abs(p.x - edge.takeoff) < 12) {
          aim = b.x + b.w / 2;
          input.jump = true;
        }
      }
    } else if (this.it === p.id) {
      aim =
        target.x + (this.rules.difficulty === "hard" ? target.vx * 0.22 : 0);
      if (target.y < p.y - 45 && p.grounded) input.jump = true;
    } else {
      aim = p.x + (p.x > chaser.x ? 180 : -180);
      if (p.x < 45 || p.x > W - 45) input.jump = true;
    }
    p.stuck =
      Math.abs(p.x - p.lastX) < 0.3 ? p.stuck + dt : Math.max(0, p.stuck - dt);
    p.lastX = p.x;
    if (p.stuck > 1.0) {
      input.jump = true;
      p.aiClock = 0;
      p.stuck = 0;
    }
    if (Math.abs(aim - p.x) > 9) {
      input.left = aim < p.x;
      input.right = aim > p.x;
    }
    if (!p.grounded && p.vy < 0) input.jump = true;
    if (pickup && Math.abs(pickup.y - p.y) < 40) aim = pickup.x;
    if (Math.abs(aim - p.x) > 9) {
      input.left = aim < p.x;
      input.right = aim > p.x;
    }
    input.dash = !!p.effects.dash && Math.abs(aim - p.x) > 150;
    if (
      this.rules.difficulty === "easy" &&
      Math.sin(this.elapsed * 2.3) > 0.92
    ) {
      input.left = false;
      input.right = false;
    }
    return input;
  }
  update(dt: number, inputs: Input[]) {
    if (this.paused || this.ended) return;
    this.particles = this.particles.filter((q) => {
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += 300 * dt;
      return q.life > 0;
    });
    this.flash = Math.max(0, this.flash - dt);
    if (this.countdown > 0) {
      this.countdown -= dt;
      return;
    }
    this.elapsed += dt;
    this.time = Math.max(0, this.time - dt);
    this.tickClock -= dt;
    if (this.time <= 10 && this.tickClock <= 0) {
      this.tickClock = this.time > 6 ? 0.9 : this.time > 3 ? 0.5 : 0.25;
      this.events.push({ name: "tick", x: 600, y: 80, color: "#fff" });
    }
    this.platforms.forEach((b, i) => {
      b.oldX = b.x;
      b.oldY = b.y;
      if (this.rules.hazards && b.type === "moving") {
        const delta = Math.sin(this.elapsed * 0.8 + i) * (b.range ?? 40);
        if (b.axis === "y") b.y = b.baseY + delta;
        else b.x = b.baseX + delta;
      }
      if (b.gone > 0) {
        b.gone -= dt;
        if (b.gone <= 0) b.collapse = 0;
      } else if (b.collapse > 0) {
        b.collapse += dt;
        if (b.collapse > 0.8) {
          b.gone = 4;
          b.collapse = 0;
        }
      }
    });
    for (const p of this.players) {
      p.itTime += this.it === p.id ? dt : 0;
      this.move(
        p,
        p.ai ? this.aiInput(p, dt) : (inputs[p.id] ?? neutral()),
        dt,
      );
    }
    const tagger = this.players[this.it];
    for (const p of this.players) {
      if (p.id === this.it || p.immune > 0 || p.effects.shield) continue;
      if (Math.abs(p.x - tagger.x) < 29 && Math.abs(p.y - tagger.y) < 35) {
        const old = this.it;
        this.it = p.id;
        this.lastTagged = old;
        this.players[old].immune = 1.25;
        p.immune = 0.35;
        this.flash = 0.18;
        this.event("tag", p.x, p.y, p.color);
        break;
      }
    }
    if (this.rules.powerups) {
      this.spawnClock -= dt;
      if (this.spawnClock <= 0) {
        this.spawnClock = 5;
        const available = this.arena.pickups.filter(
          (s) =>
            !this.pickups.some((p) => Math.hypot(p.x - s.x, p.y - s.y) < 45),
        );
        if (this.pickups.length < 4 && available.length) {
          const spot = available[Math.floor(Math.random() * available.length)],
            kind = (
              ["speed", "double", "shield", "super", "slow", "dash"] as Power[]
            )[Math.floor(Math.random() * 6)];
          this.pickups.push({ ...spot, kind, age: 0 });
        }
      }
    }
    this.pickups = this.pickups.filter((q) => {
      q.age += dt;
      const p = this.players.find(
        (p) => Math.abs(p.x - q.x) < 29 && Math.abs(p.y - q.y) < 35,
      );
      if (p) {
        this.applyPower(p, q.kind);
        return false;
      }
      return q.age < 20;
    });
    if (this.time === 0) {
      this.ended = true;
      this.event("finish", 600, 300);
      for (const p of this.players) {
        const key = p.ai ? "Computer" : `Player ${p.id + 1}`;
        stats[key] ??= { wins: 0, losses: 0, itTime: 0 };
        stats[key][p.id === this.it ? "losses" : "wins"]++;
        stats[key].itTime += p.itTime;
      }
      saveStats();
    }
  }
  applyPower(p: Player, kind: Power) {
    if (kind === "slow")
      this.players
        .filter((o) => o.id !== p.id)
        .forEach((o) => (o.effects.slow = 3));
    else {
      p.effects[kind] =
        kind === "shield"
          ? 3
          : kind === "double"
            ? 8
            : kind === "dash"
              ? 10
              : 5;
    }
    this.event("pickup", p.x, p.y, p.color);
  }
  move(p: Player, input: Input, dt: number) {
    p.immune = Math.max(0, p.immune - dt);
    p.portalCD = Math.max(0, p.portalCD - dt);
    p.padCD = Math.max(0, p.padCD - dt);
    p.landed = Math.max(0, p.landed - dt);
    for (const key of Object.keys(p.effects) as Power[]) {
      p.effects[key]! -= dt;
      if (p.effects[key]! <= 0) delete p.effects[key];
    }
    if (p.grounded && p.platform >= 0) {
      const b = this.platforms[p.platform];
      if (b.gone > 0) {
        p.grounded = false;
        p.platform = -1;
      } else {
        p.x += b.x - b.oldX;
        p.y += b.y - b.oldY;
      }
    }
    p.coyote = p.grounded ? 0.11 : Math.max(0, p.coyote - dt);
    p.buffer = Math.max(0, p.buffer - dt);
    if (input.jump && !p.held) p.buffer = 0.13;
    const dir = Number(input.right) - Number(input.left);
    if (dir) p.facing = dir;
    const inZone = this.arena.zones.some(
      (z) =>
        p.x >= z.x && p.x <= z.x + z.w && p.y + 19 >= z.y && p.y <= z.y + z.h,
    );
    const speed =
      300 *
      (p.effects.speed ? 1.45 : 1) *
      (p.effects.slow ? 0.55 : 1) *
      (inZone ? 1.35 : 1);
    const icy = p.grounded && this.platforms[p.platform]?.type === "ice";
    const accel = p.grounded ? (icy ? 550 : 2300) : 1500;
    const target = dir * speed;
    p.vx += Math.max(-accel * dt, Math.min(accel * dt, target - p.vx));
    if (p.buffer > 0 && (p.coyote > 0 || (!!p.effects.double && p.jumps < 2))) {
      p.vy = p.effects.super ? -850 : -650;
      p.grounded = false;
      p.platform = -1;
      p.jumps++;
      p.coyote = 0;
      p.buffer = 0;
      this.event("jump", p.x, p.y + 16, p.color);
    }
    if (!input.jump && p.held && p.vy < -240) p.vy = -240;
    p.held = input.jump;
    if (input.dash && !p.dashHeld && p.effects.dash) {
      p.vx = p.facing * 800;
      p.effects.shield = Math.max(p.effects.shield ?? 0, 0.12);
      delete p.effects.dash;
      this.event("dash", p.x, p.y, p.color);
    }
    p.dashHeld = input.dash;
    // Axis-separated collisions: solid obstacles block sides and undersides;
    // elevated one-way ledges only block a descending player from above.
    const oldX = p.x;
    p.x = Math.max(15, Math.min(W - 15, p.x + p.vx * dt));
    for (const b of this.platforms) {
      if (
        !b.solid ||
        b.gone > 0 ||
        p.y + 19 <= b.y + 0.1 ||
        p.y - 19 >= b.y + b.h
      )
        continue;
      if (oldX + 14 <= b.x && p.x + 14 > b.x) {
        p.x = b.x - 14;
        p.vx = 0;
      } else if (oldX - 14 >= b.x + b.w && p.x - 14 < b.x + b.w) {
        p.x = b.x + b.w + 14;
        p.vx = 0;
      }
    }
    const oldBottom = p.y + 19;
    const oldTop = p.y - 19;
    p.vy = Math.min(1000, p.vy + 1600 * dt);
    p.y += p.vy * dt;
    if (p.vy < 0)
      for (const b of this.platforms) {
        if (
          b.solid &&
          b.gone <= 0 &&
          p.x + 12 > b.x &&
          p.x - 12 < b.x + b.w &&
          oldTop >= b.oldY + b.h &&
          p.y - 19 <= b.y + b.h
        ) {
          p.y = b.y + b.h + 19;
          p.vy = 0;
        }
      }
    p.grounded = false;
    p.platform = -1;
    let landing = -1,
      top = Infinity;
    if (p.vy >= 0)
      this.platforms.forEach((b, i) => {
        if (b.gone > 0) return;
        if (
          p.x + 12 > b.x &&
          p.x - 12 < b.x + b.w &&
          oldBottom <= Math.max(b.oldY, b.y) + 3 &&
          p.y + 19 >= b.y &&
          b.y < top
        ) {
          landing = i;
          top = b.y;
        }
      });
    if (landing >= 0) {
      p.y = top - 19;
      if (p.vy > 200) {
        p.landed = 0.18;
        this.events.push({ name: "land", x: p.x, y: top, color: p.color });
      }
      p.vy = 0;
      p.grounded = true;
      p.platform = landing;
      p.jumps = 0;
      if (
        this.rules.hazards &&
        this.platforms[landing].type === "crumble" &&
        this.platforms[landing].collapse === 0
      )
        this.platforms[landing].collapse = dt;
    }
    for (const pad of this.arena.pads)
      if (
        p.padCD === 0 &&
        p.vy >= 0 &&
        Math.abs(p.x - pad.x) < 29 &&
        Math.abs(p.y + 19 - pad.y) < 12
      ) {
        p.vy = -950;
        p.grounded = false;
        p.platform = -1;
        p.padCD = 0.4;
        this.event("bounce", p.x, p.y, p.color);
      }
    if (p.portalCD === 0)
      for (let i = 0; i < this.arena.portals.length; i++) {
        const portal = this.arena.portals[i];
        if (Math.abs(p.x - portal.x) < 25 && Math.abs(p.y - portal.y) < 35) {
          const exit = this.arena.portals[1 - i];
          p.x = exit.x;
          p.y = exit.y - 4;
          p.portalCD = 1;
          p.grounded = false;
          p.platform = -1;
          this.event("portal", exit.x, exit.y, p.color);
          break;
        }
      }
    if (
      this.rules.hazards &&
      this.arena.hazards.some(
        (h) => p.x > h.x && p.x < h.x + h.w && p.y + 19 >= h.y,
      )
    ) {
      p.vy = -720;
      p.grounded = false;
      p.immune = 0.6;
      this.event("hazard", p.x, p.y, "#ff9576");
    }
    if (p.y > H + 40) {
      const s = this.arena.spawns[p.id];
      p.x = s.x;
      p.y = s.y - 19;
      p.vx = 0;
      p.vy = 0;
      p.immune = 1;
    }
  }
}
