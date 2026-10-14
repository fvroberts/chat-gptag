import Phaser from "phaser";
import { arenas, W, H, type Arena } from "./maps";
import {
  Match,
  powerIcons,
  type Input,
  type Mode,
  type Player,
} from "./engine";
import { settings } from "./settings";
import { audio } from "./audio";
export class ArenaScene extends Phaser.Scene {
  gfx!: Phaser.GameObjects.Graphics;
  labels: Phaser.GameObjects.Text[] = [];
  keys = new Set<string>();
  match?: Match;
  menuMap = 0;
  clock = 0;
  accumulator = 0;
  onFrame: (match?: Match) => void = () => {};
  onEnd: () => void = () => {};
  menu = true;
  labelCursor = 0;
  lastFrame = 0;
  constructor() {
    super("arena");
  }
  create() {
    this.gfx = this.add.graphics();
    this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
      if (
        ["ArrowUp", "ArrowLeft", "ArrowRight", "Space"].includes(e.code) &&
        !(e.target as HTMLElement)?.matches("input,select,button")
      )
        e.preventDefault();
      this.keys.add(e.code);
    });
    this.input.keyboard?.on("keyup", (e: KeyboardEvent) =>
      this.keys.delete(e.code),
    );
    window.addEventListener("blur", () => {
      this.keys.clear();
      if (this.match && !this.match.ended) {
        this.match.paused = true;
        this.onFrame(this.match);
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.keys.clear();
        if (this.match && !this.match.ended) {
          this.match.paused = true;
          this.onFrame(this.match);
        }
      }
    });
  }
  startMatch(mode: Mode, map: number, round = 1) {
    this.match = new Match(mode, map, round);
    this.menu = false;
    this.keys.clear();
    this.accumulator = 0;
  }
  showMenu(map = 0) {
    this.match = undefined;
    this.menu = true;
    this.labelCursor = 0;
    this.menuMap = map;
  }
  inputFor(id: number): Input {
    const controls = [
      ["KeyA", "KeyD", "KeyW", "KeyQ"],
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ShiftRight"],
      ["KeyJ", "KeyL", "KeyI", "KeyU"],
    ][id];
    return {
      left: this.keys.has(controls[0]),
      right: this.keys.has(controls[1]),
      jump: this.keys.has(controls[2]),
      dash: this.keys.has(controls[3]),
    };
  }
  update(_time: number, delta: number) {
    const now = performance.now();
    delta = this.lastFrame ? Math.min(100, now - this.lastFrame) : 1000 / 60;
    this.lastFrame = now;
    this.clock += Math.min(delta, 50) / 1000;
    const m = this.match;
    audio.update(this.clock, !!m && !m.paused && !m.ended);
    if (m) {
      this.accumulator += Math.min(delta, 100) / 1000;
      const wasEnded = m.ended;
      while (this.accumulator >= 1 / 120) {
        m.update(
          1 / 120,
          m.players.map((_, i) => this.inputFor(i)),
        );
        this.accumulator -= 1 / 120;
      }
      for (const e of m.events) {
        audio.effect(e.name === "finish" && m.it === 0 ? "defeat" : e.name);
        if (
          e.name === "tag" &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          this.cameras.main.shake(100, 0.002);
      }
      m.events = [];
      if (!wasEnded && m.ended) this.onEnd();
      this.onFrame(m);
    }
    this.renderWorld(m?.arena ?? arenas[this.menuMap]);
  }
  text(
    x: number,
    y: number,
    value: string,
    size: number,
    color = "#ffffff",
    bold = true,
  ) {
    let label = this.labels[this.labelCursor++];
    if (!label) {
      label = this.add
        .text(x, y, value, {
          fontFamily: '"Trebuchet MS",sans-serif',
          fontSize: `${size}px`,
          color,
          fontStyle: bold ? "bold" : "normal",
        })
        .setOrigin(0.5);
      this.labels.push(label);
    }
    label.setPosition(x, y).setText(value).setVisible(true);
    if (label.style.fontSize !== `${size}px`) label.setFontSize(size);
    if (label.style.color !== color) label.setColor(color);
    return label;
  }
  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    alpha = 1,
    r = 0,
  ) {
    this.gfx.fillStyle(color, alpha);
    if (r) this.gfx.fillRoundedRect(x, y, w, h, r);
    else this.gfx.fillRect(x, y, w, h);
  }
  circle(x: number, y: number, r: number, color: number, alpha = 1) {
    this.gfx.fillStyle(color, alpha);
    this.gfx.fillCircle(x, y, r);
  }
  background(a: Arena) {
    const g = this.gfx,
      t = this.clock;
    g.fillStyle(Phaser.Display.Color.HexStringToColor(a.sky).color);
    g.fillRect(0, 0, W, H);
    // Tiny drifting specks give each arena depth without obscuring the playfield.
    for (let i = 0; i < 55; i++) {
      const x = (i * 193 + Math.sin(t * 0.1 + i) * 20) % W,
        y = (i * 83 + t * (a.theme === "winter" ? 18 : 2)) % H;
      this.circle(x, y, a.theme === "winter" ? 2 : 1, 0xffffff, 0.12);
    }
    this.circle(970, 125, 62, a.theme === "desert" ? 0xffca86 : 0xe4e7bc, 0.18);
    this.circle(970, 125, 47, 0xffffff, 0.04);
    if (a.theme === "forest") {
      for (let layer = 0; layer < 3; layer++) {
        const color = [0x204b40, 0x285646, 0x30604c][layer];
        for (let i = 0; i < 9; i++) {
          const x = i * 170 + layer * 45 + Math.sin(t * 0.15 + layer) * 3,
            y = 330 + layer * 100 + (i % 3) * 20;
          this.rect(x - 12, y, 24, H - y, 0x213f36, 0.7);
          for (let j = 0; j < 3; j++) {
            g.fillStyle(color, 0.65);
            g.fillTriangle(
              x - 100 + j * 20,
              y + 85 - j * 65,
              x + 100 - j * 20,
              y + 85 - j * 65,
              x,
              y - 95 - j * 50,
            );
          }
        }
      }
    } else if (a.theme === "winter") {
      for (let i = 0; i < 8; i++) {
        const x = i * 190 - 80;
        g.fillStyle(i % 2 ? 0x355674 : 0x2c4d6d);
        g.fillTriangle(x, 590, x + 140, 180 + (i % 3) * 60, x + 300, 590);
        g.fillStyle(0xa5d2e6, 0.35);
        g.fillTriangle(
          x + 105,
          270 + (i % 3) * 60,
          x + 140,
          180 + (i % 3) * 60,
          x + 190,
          285 + (i % 3) * 60,
        );
      }
    } else if (a.theme === "desert") {
      for (let i = 0; i < 5; i++) {
        const x = i * 290 - 100;
        g.fillStyle(i % 2 ? 0x7a4c50 : 0x69414d);
        g.fillTriangle(x, 640, x + 200, 300 + (i % 2) * 100, x + 400, 640);
        g.fillStyle(0xb47863, 0.35);
        g.fillTriangle(
          x + 200,
          300 + (i % 2) * 100,
          x + 250,
          640,
          x + 400,
          640,
        );
      }
      for (let i = 0; i < 8; i++)
        this.rect(i * 177, 450 + (i % 3) * 30, 36, 240, 0xa77864, 0.13);
    } else if (a.theme === "volcano") {
      for (let i = 0; i < 4; i++) {
        const x = i * 390 - 130;
        g.fillStyle(0x483347);
        g.fillTriangle(x, 650, x + 210, 230 + (i % 2) * 80, x + 440, 650);
        g.lineStyle(4, 0xff886a, 0.22);
        g.beginPath();
        g.moveTo(x + 210, 240 + (i % 2) * 80);
        g.lineTo(x + 235, 400);
        g.lineTo(x + 200, 460);
        g.lineTo(x + 260, 640);
        g.strokePath();
      }
      for (let i = 0; i < 20; i++)
        this.circle(
          (i * 127) % W,
          700 - ((t * 22 + i * 33) % 650),
          2,
          0xffb570,
          0.3,
        );
    } else if (a.theme === "neon") {
      for (let i = 0; i < 16; i++) {
        const x = i * 85,
          y = 220 + ((i * 71) % 260);
        this.rect(x, y, 65, H - y, 0x3b3458);
        this.rect(x, y, 65, 3, 0x9f86df, 0.25);
        for (let j = 0; j < 6; j++)
          for (let k = 0; k < 3; k++)
            this.rect(x + 10 + k * 18, y + 15 + j * 30, 6, 10, 0xbcabed, 0.15);
      }
    } else {
      for (let i = 0; i < 9; i++) {
        const x = ((i * 180 + t * 3) % 1350) - 70,
          y = 160 + ((i * 67) % 420);
        this.circle(x, y, 32, 0xc6dce9, 0.13);
        this.circle(x + 35, y + 8, 40, 0xc6dce9, 0.13);
        this.circle(x + 70, y + 15, 28, 0xc6dce9, 0.13);
      }
    }
  }
  renderWorld(a: Arena) {
    this.labels.forEach((l) => l.setVisible(false));
    this.labelCursor = 0;
    this.gfx.clear();
    this.background(a);
    const m = this.match,
      g = this.gfx;
    const platforms = m?.platforms ?? a.platforms;
    platforms.forEach((b, i) => {
      if ("gone" in b && Number(b.gone) > 0) {
        g.lineStyle(1, 0xffffff, 0.1);
        g.strokeRoundedRect(b.x, b.y, b.w, b.h, 4);
        return;
      }
      const shake =
        "collapse" in b && Number(b.collapse) > 0
          ? Math.sin(this.clock * 70) * 2
          : 0;
      const x = b.x + shake,
        color = Phaser.Display.Color.HexStringToColor(a.ground).color;
      this.rect(x, b.y + 7, b.w, b.h + 5, 0x102623, 0.55, 5);
      this.rect(x, b.y, b.w, b.h, color, 1, 5);
      this.rect(
        x + 2,
        b.y,
        b.w - 4,
        5,
        Phaser.Display.Color.HexStringToColor(a.accent).color,
        0.9,
        3,
      );
      if (b.type === "ice")
        this.rect(x + 10, b.y + 8, b.w - 20, 2, 0xffffff, 0.35);
      if (b.type === "moving") {
        for (let q = 0; q < 4; q++)
          this.rect(x + 20 + q * 30, b.y + 9, 12, 2, 0xffffff, 0.35);
      }
      if (b.type === "crumble") {
        g.lineStyle(1, 0x312a36, 0.6);
        for (let q = 0; q < 4; q++) {
          g.beginPath();
          g.moveTo(x + 40 + q * 50, b.y + 5);
          g.lineTo(x + 48 + q * 50, b.y + 10);
          g.lineTo(x + 42 + q * 50, b.y + 17);
          g.strokePath();
        }
      }
      if (a.theme === "forest" && i !== 0) {
        for (let j = 0; j < Math.floor(b.w / 35); j++) {
          g.lineStyle(1, 0xe0f4ae, 0.4);
          g.lineBetween(x + 15 + j * 35, b.y, x + 12 + j * 35, b.y - 4);
        }
      }
    });
    for (const z of a.zones) {
      this.rect(z.x, z.y, z.w, z.h, 0xc7f36a, 0.06);
      for (let i = 0; i < 5; i++)
        this.text(z.x + 20 + i * 45, z.y + 17, "»", 20, "#c7f36a");
    }
    for (const h of a.hazards) {
      this.rect(h.x, h.y, h.w, h.h, 0xff795c, 0.8);
      for (let i = 0; i < 12; i++)
        this.circle(
          h.x + i * 20,
          h.y + Math.sin(this.clock * 3 + i) * 3,
          7,
          0xffb869,
          0.6,
        );
    }
    a.pads.forEach((p, i) => {
      const squish = m?.players.some(
        (q) => Math.abs(q.x - p.x) < 35 && q.padCD > 0.3,
      )
        ? 4
        : 0;
      this.rect(p.x - 27, p.y - 8 + squish, 54, 8, 0x123831, 1, 3);
      this.rect(p.x - 27, p.y - 12 + squish, 54, 6, 0xf1d889, 1, 3);
      this.text(p.x, p.y - 24, "↑", 18, "#f1d889");
      if (!m) this.text(p.x, p.y + 20, "BOUNCE", 10, "#93b89c");
    });
    a.portals.forEach((p, i) => {
      const c = i ? 0xf5c1ed : 0x9de2e3;
      this.circle(p.x, p.y, 35, c, 0.06);
      g.lineStyle(3, c, 0.8);
      g.strokeEllipse(p.x, p.y, 36 + Math.sin(this.clock * 3) * 3, 58);
      g.lineStyle(1, c, 0.4);
      g.strokeEllipse(p.x, p.y, 50, 70);
      for (let j = 0; j < 6; j++) {
        const angle = this.clock * 1.5 + (j * Math.PI) / 3;
        this.circle(
          p.x + Math.cos(angle) * 25,
          p.y + Math.sin(angle) * 35,
          2,
          c,
          0.8,
        );
      }
      this.circle(p.x, p.y, 12, c, 0.13);
    });
    m?.pickups.forEach((q) => {
      const y = q.y + Math.sin(this.clock * 3 + q.x) * 5;
      this.circle(q.x, y, 22, 0xffdf87, 0.1);
      this.rect(q.x - 15, y - 15, 30, 30, 0xffdf87, 0.9, 9);
      this.text(q.x, y, powerIcons[q.kind], 18, "#354133");
    });
    if (m) {
      for (const p of m.players) this.character(p, m.it === p.id);
      for (const q of m.particles)
        this.circle(
          q.x,
          q.y,
          q.size,
          Phaser.Display.Color.HexStringToColor(q.color).color,
          q.life / q.max,
        );
      if (m.countdown > 0) {
        this.text(
          600,
          330,
          m.countdown > 0.5 ? `${Math.ceil(m.countdown - 0.5)}` : "GO!",
          90,
          "#f3f4d8",
        );
      }
      if (m.flash > 0) this.rect(0, 0, W, H, 0xffffff, m.flash * 0.6);
    } else {
      for (let i = 0; i < 3; i++) {
        const x = 640 + ((this.clock * (i === 0 ? 85 : 70) + i * 155) % 460),
          base = i === 2 ? 438 : 558;
        const fake = {
          id: i,
          x,
          y: base - 19 - Math.max(0, Math.sin(this.clock * 2 + i)) * 70,
          vx: 150,
          vy: Math.cos(this.clock * 2 + i) * -100,
          grounded: Math.sin(this.clock * 2 + i) < 0,
          immune: 0,
          effects: {},
          color: settings.colors[i],
          facing: 1,
          landed: 0,
        } as Player;
        this.character(fake, i === 0);
      }
      this.text(1000, 86, "A GOOD DAY FOR A CHASE", 12, "#b9d0b0");
    }
  }
  character(p: Player, it: boolean) {
    const g = this.gfx,
      t = this.clock,
      c = Phaser.Display.Color.HexStringToColor(p.color).color;
    const speed = Math.abs(p.vx),
      phase = t * (speed > 100 ? 18 : 5) + p.id,
      squash = p.landed > 0 ? 1.2 : !p.grounded ? 0.9 : 1;
    const w = 29 * squash,
      h = 34 / squash,
      y = p.y + 2;
    this.circle(p.x, p.y + 21, 17, 0x10251f, 0.3);
    if (p.effects.speed)
      for (let i = 1; i < 5; i++)
        this.circle(p.x - p.facing * i * 10, y, 8, c, (0.12 * (5 - i)) / 5);
    if (it) {
      this.circle(p.x, y, 26 + Math.sin(t * 5) * 2, c, 0.1);
      g.lineStyle(2, 0xf7f8de, 0.8);
      g.strokeRoundedRect(p.x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, 12);
      const arrowY = p.y - 43 + Math.sin(t * 4) * 3;
      g.fillStyle(0xffffff);
      g.fillTriangle(p.x - 8, arrowY - 5, p.x + 8, arrowY - 5, p.x, arrowY + 5);
      this.text(p.x, arrowY - 17, "IT", 11, "#fff");
    }
    if (p.immune > 0) this.circle(p.x, y, 24, 0xffffff, 0.12);
    if (p.effects.shield) {
      g.lineStyle(2, 0x9ee9ff, 0.7);
      g.strokeCircle(p.x, y, 28);
      this.circle(p.x, y, 28, 0x9ee9ff, 0.08);
    }
    const stride = p.grounded ? Math.sin(phase) * Math.min(6, speed / 40) : 4;
    this.rect(p.x - 10 + stride, y + 12, 8, 10, c, 1, 3);
    this.rect(p.x + 2 - stride, y + 12, 8, 10, c, 1, 3);
    this.rect(p.x - w / 2, y - h / 2, w, h, c, 1, 11);
    this.rect(p.x - w / 2 + 4, y - h / 2 + 3, w - 8, 6, 0xffffff, 0.14, 3);
    if (settings.appearance === "cat") {
      g.fillStyle(c);
      g.fillTriangle(p.x - 14, y - 12, p.x - 12, y - 26, p.x - 2, y - 13);
      g.fillTriangle(p.x + 14, y - 12, p.x + 12, y - 26, p.x + 2, y - 13);
    } else if (settings.appearance === "robot") {
      this.rect(p.x - 11, y - 9, 22, 12, 0x263a36, 1, 3);
      g.lineStyle(2, c);
      g.lineBetween(p.x, y - 17, p.x, y - 26);
      this.circle(p.x, y - 27, 3, 0xffe4a1);
    }
    this.circle(p.x - 5 + p.facing * 2, y - 3, 3, 0x233c33);
    this.circle(p.x + 5 + p.facing * 2, y - 3, 3, 0x233c33);
    this.circle(p.x - 4 + p.facing * 2, y - 4, 1, 0xffffff);
    this.circle(p.x + 6 + p.facing * 2, y - 4, 1, 0xffffff);
    g.lineStyle(1.5, 0x233c33, 0.65);
    g.lineBetween(p.x + 1, y + 5, p.x + 5, y + 5);
    if (this.match)
      this.text(p.x, p.y + 40, p.ai ? "CPU" : `P${p.id + 1}`, 10, p.color);
  }
}
