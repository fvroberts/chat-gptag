import { test } from "node:test";
import assert from "node:assert/strict";
import { Match, type Input, type Power } from "../src/engine";
import { arenas } from "../src/maps";
import { graphFor, route } from "../src/navigation";
import { settings, stats } from "../src/settings";
const idle: Input = { left: false, right: false, jump: false, dash: false };
function step(m: Match, seconds: number, inputs: Input[] = [idle, idle, idle]) {
  for (let i = 0; i < seconds * 120; i++) m.update(1 / 120, inputs);
}
function match(map = 0) {
  settings.hazards = true;
  settings.powerups = false;
  settings.duration = 180;
  const m = new Match("duo", map);
  m.countdown = 0;
  return m;
}
test("every arena has reachable navigation, balanced spawns, portals and bounce pads", () => {
  for (const a of arenas) {
    const graph = graphFor(a);
    assert.equal(a.portals.length, 2);
    assert.ok(a.pads.length >= 2);
    for (let i = 1; i < a.platforms.length; i++) {
      assert.ok(
        route(graph, 0, i).length > 0,
        `${a.id}: platform ${i} unreachable`,
      );
    }
    for (const s of a.spawns)
      assert.ok(
        a.platforms.some(
          (p) => s.x > p.x + 14 && s.x < p.x + p.w - 14 && s.y === p.y,
        ),
      );
  }
});
test("jump height, variable jump, gravity, simultaneous input and boundaries", () => {
  const m = match();
  const [a, b] = m.players;
  const x = a.x,
    y = a.y;
  step(m, 0.14, [
    { ...idle, right: true, jump: true },
    { ...idle, left: true, jump: true },
  ]);
  assert.ok(a.x > x);
  assert.ok(b.x < 1000);
  assert.ok(a.y < y - 40);
  const vy = a.vy;
  step(m, 0.01);
  assert.ok(a.vy > vy);
  step(m, 2);
  assert.ok(a.grounded);
  assert.ok(b.grounded);
  step(m, 6, [
    { ...idle, left: true },
    { ...idle, right: true },
  ]);
  assert.ok(a.x >= 15);
  assert.ok(b.x <= 1185);
});
test("tag transfer, immunity and shield honor round rules", () => {
  const m = match();
  const [a, b] = m.players;
  a.x = b.x = 600;
  a.y = b.y = 539;
  step(m, 0.01);
  assert.equal(m.it, 1);
  step(m, 0.4);
  assert.equal(m.it, 1);
  step(m, 1);
  assert.equal(m.it, 0);
  m.it = 0;
  a.x = b.x = 600;
  b.immune = 0;
  b.effects.shield = 3;
  step(m, 0.1);
  assert.equal(m.it, 0);
});
test("portals transport players with momentum and do not immediately loop", () => {
  for (let i = 0; i < 6; i++) {
    const m = match(i),
      p = m.players[0],
      [a, b] = m.arena.portals;
    p.x = a.x;
    p.y = a.y;
    p.vx = 160;
    p.vy = 0;
    step(m, 0.01);
    assert.ok(Math.abs(p.x - b.x) < 10);
    assert.ok(p.portalCD > 0);
    step(m, 0.1);
    assert.ok(Math.abs(p.x - b.x) < 60);
  }
});
test("bounce pads launch above normal jump height", () => {
  const m = match(),
    p = m.players[0],
    pad = m.arena.pads[0];
  p.x = pad.x;
  p.y = pad.y - 19;
  p.vy = 0;
  step(m, 0.01);
  assert.ok(p.vy < -850);
  step(m, 0.25);
  assert.ok(p.y < pad.y - 180);
});
test("all six power-ups apply, expire, and dash consumes its charge", () => {
  const m = match(),
    p = m.players[0],
    other = m.players[1];
  for (const kind of [
    "speed",
    "double",
    "shield",
    "super",
    "slow",
    "dash",
  ] as Power[])
    m.applyPower(p, kind);
  assert.equal(other.effects.slow, 3);
  assert.equal(p.effects.double, 8);
  step(m, 0.01, [{ ...idle, dash: true }, idle]);
  assert.ok(Math.abs(p.vx) > 700);
  assert.equal(p.effects.dash, undefined);
  step(m, 9);
  assert.deepEqual(p.effects, {});
  assert.deepEqual(other.effects, {});
});
test("double jump works once in midair; coyote and buffered jump work", () => {
  const m = match(),
    p = m.players[0];
  m.applyPower(p, "double");
  step(m, 0.1, [{ ...idle, jump: true }, idle]);
  step(m, 0.02);
  step(m, 0.01, [{ ...idle, jump: true }, idle]);
  assert.equal(p.jumps, 2);
  assert.ok(p.vy < -600);
  step(m, 0.02);
  step(m, 0.01, [{ ...idle, jump: true }, idle]);
  assert.equal(p.jumps, 2);
  const c = match(),
    q = c.players[0];
  q.grounded = false;
  q.platform = -1;
  q.coyote = 0.08;
  q.y = 500;
  step(c, 0.01, [{ ...idle, jump: true }, idle]);
  assert.ok(q.vy < -600);
  const buffered = match(),
    r = buffered.players[0];
  r.grounded = false;
  r.platform = -1;
  r.coyote = 0;
  r.y = 519;
  r.vy = 300;
  step(buffered, 0.1, [{ ...idle, jump: true }, idle]);
  assert.ok(r.vy < 0);
});
test("moving platforms carry players and crumbling ledges regenerate", () => {
  const m = match(1),
    p = m.players[0],
    i = m.platforms.findIndex((b) => b.type === "moving"),
    b = m.platforms[i];
  p.platform = i;
  p.grounded = true;
  p.x = b.x + b.w / 2;
  p.y = b.y - 19;
  const offset = p.x - b.x;
  step(m, 0.5);
  assert.ok(Math.abs(p.x - b.x - offset) < 2);
  const c = match(2),
    q = c.players[0],
    index = c.platforms.findIndex((p) => p.type === "crumble"),
    ledge = c.platforms[index];
  q.x = ledge.x + 50;
  q.y = ledge.y - 19;
  q.platform = index;
  step(c, 1);
  assert.ok(ledge.gone > 0);
  step(c, 4.2);
  assert.ok(ledge.gone <= 0);
});
test("pause freezes state and timer expiration records correct winners", () => {
  const m = match();
  m.time = 0.1;
  m.paused = true;
  step(m, 1);
  assert.equal(m.time, 0.1);
  m.paused = false;
  m.it = 1;
  step(m, 0.2);
  assert.ok(m.ended);
  assert.ok(stats["Player 1"].wins >= 1);
  assert.ok(stats["Player 2"].losses >= 1);
});
for (let i = 0; i < 6; i++)
  test(`AI pursues and tags across ${arenas[i].name}`, () => {
    settings.difficulty = "hard";
    settings.powerups = false;
    settings.duration = 180;
    const m = new Match("solo", i);
    m.countdown = 0;
    m.it = 1;
    let tagged = false;
    const visited = new Set<number>();
    for (let n = 0; n < 120 * 40; n++) {
      m.update(1 / 120, [idle, idle]);
      if (m.players[1].grounded) visited.add(m.players[1].platform);
      if (m.it === 0) {
        tagged = true;
        break;
      }
    }
    assert.ok(
      tagged,
      `${arenas[i].id}: AI did not catch a stationary target; ${JSON.stringify(m.players[1])}`,
    );
    assert.ok(visited.size >= 2, "AI should traverse platforms");
  });
for (let i = 0; i < 6; i++)
  test(`AI escapes and explores ${arenas[i].name}`, () => {
    settings.difficulty = "normal";
    settings.powerups = false;
    settings.duration = 180;
    const m = new Match("solo", i);
    m.countdown = 0;
    const p = m.players[1],
      visited = new Set<number>();
    let high = false;
    for (let n = 0; n < 120 * 20; n++) {
      m.update(1 / 120, [idle, idle]);
      if (p.grounded) visited.add(p.platform);
      if (p.y < 450) high = true;
    }
    assert.ok(
      visited.size >= 3,
      `${arenas[i].id}: escape stuck on ${[...visited]}`,
    );
    assert.ok(high, "AI should use elevated escape routes");
    assert.ok(p.x >= 15 && p.x <= 1185);
  });
for (let map = 0; map < 6; map++)
  test(`AI can reach opponents on every elevation in ${arenas[map].name}`, () => {
    settings.difficulty = "hard";
    settings.powerups = false;
    settings.hazards = false;
    settings.duration = 180;
    for (let i = 0; i < arenas[map].platforms.length; i++) {
      const m = new Match("solo", map);
      m.countdown = 0;
      m.it = 1;
      const platform = m.platforms[i],
        human = m.players[0];
      human.x = platform.x + platform.w / 2;
      human.y = platform.y - 19;
      human.platform = i;
      let caught = false;
      for (let n = 0; n < 120 * 40; n++) {
        m.update(1 / 120, [idle, idle]);
        if (m.it === 0) {
          caught = true;
          break;
        }
      }
      assert.ok(caught, `platform ${i} cannot be reached by the computer`);
    }
  });

test("speed, slowdown and super jump change actual movement; pickups spawn at valid points", () => {
  const base = match(),
    fast = match(),
    slow = match(),
    high = match();
  for (const m of [base, fast, slow, high]) {
    const p = m.players[0];
    p.x = 100;
    p.y = 661;
    p.grounded = true;
    p.platform = 0;
  }
  fast.applyPower(fast.players[0], "speed");
  slow.applyPower(slow.players[1], "slow");
  high.applyPower(high.players[0], "super");
  for (const m of [base, fast, slow])
    step(m, 0.3, [{ ...idle, right: true }, idle]);
  assert.ok(fast.players[0].vx > base.players[0].vx);
  assert.ok(slow.players[0].vx < base.players[0].vx);
  step(high, 0.01, [{ ...idle, jump: true }, idle]);
  assert.ok(high.players[0].vy < -800);
  settings.powerups = true;
  const pickups = new Match("duo", 0);
  pickups.countdown = 0;
  step(pickups, 18);
  assert.ok(pickups.pickups.length >= 1 && pickups.pickups.length <= 4);
  assert.ok(
    pickups.pickups.every((p) =>
      pickups.arena.pickups.some((s) => s.x === p.x && s.y === p.y),
    ),
  );
  settings.powerups = false;
});

test("ice preserves momentum; next-round settings do not mutate an active round", () => {
  const ice = match(1),
    stone = match(0);
  for (const m of [ice, stone]) m.players[0].vx = 300;
  step(ice, 0.1);
  step(stone, 0.1);
  assert.ok(ice.players[0].vx > stone.players[0].vx);
  const previous = stone.rules.duration;
  settings.duration = 30;
  assert.equal(stone.rules.duration, previous);
  assert.equal(new Match("duo", 0).rules.duration, 30);
});

test("solid obstacles stop side motion and upward head collisions while one-way ledges allow upward passage", () => {
  const m = match(),
    p = m.players[0];
  const block = m.platforms[2];
  block.solid = true;
  p.x = 600;
  p.y = 610;
  p.grounded = false;
  p.platform = -1;
  p.vy = -650;
  step(m, 0.1);
  assert.ok(p.y - 19 >= block.y + block.h);
  assert.ok(p.vy >= 0);
  p.x = block.x - 35;
  p.y = block.y + 9;
  p.vx = 300;
  p.vy = 0;
  step(m, 0.1, [{ ...idle, right: true }, idle]);
  assert.ok(p.x + 14 <= block.x);
  const oneWay = match(),
    q = oneWay.players[0];
  q.x = 600;
  q.y = 610;
  q.grounded = false;
  q.platform = -1;
  q.vy = -650;
  step(oneWay, 0.1);
  assert.ok(q.y - 19 < oneWay.platforms[2].y);
});
