import { test, expect } from "@playwright/test";
// Test mode exposes the actual live match for deterministic setup; input and menus
// are still exercised through the browser, and physics uses the production engine.
const api = () => (window as any).__arena;
test.beforeEach(async ({ page }) => {
  await page.goto("/?test");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForFunction(() => !!(window as any).__arena?.scene.gfx);
});
test("menus, every arena, settings and appearance persist without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(
    page.getByRole("heading", { name: /Catch a little/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(
    page.getByRole("heading", { name: "Run. Jump. Don’t be IT." }),
  ).toBeVisible();
  await page.locator('[data-action="close"]').first().click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("#duration").selectOption("30");
  await page.locator("#difficulty").selectOption("hard");
  await page.locator("#powerups").uncheck();
  await page.locator('[data-action="close"]').first().click();
  await page.getByRole("button", { name: "Customise characters" }).click();
  await page.locator("#appearance").selectOption("cat");
  await page.locator('[data-action="close"]').first().click();
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__arena?.scene.gfx);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator("#duration")).toHaveValue("30");
  await expect(page.locator("#difficulty")).toHaveValue("hard");
  await expect(page.locator("#powerups")).not.toBeChecked();
  await page.locator('[data-action="close"]').first().click();
  for (let i = 0; i < 6; i++) {
    await page.locator(`[data-action="map"][data-map="${i}"]`).click();
    await expect(page.locator(`[data-map="${i}"]`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.locator('[data-action="play"]').click();
    await expect(page.locator("#hud")).toContainText(
      [
        "Classic Forest",
        "Winter Wonderland",
        "Desert Ruins",
        "Volcano Escape",
        "Neon City",
        "Sky Islands",
      ][i],
    );
    await page.evaluate(() => {
      const s = (window as any).__arena.scene;
      s.match.countdown = 0;
      s.match.update(0.1, []);
    });
    await page.getByRole("button", { name: "TAG ARENA home" }).click();
  }
  expect(errors).toEqual([]);
});
test("three people move and jump simultaneously; pause freezes time", async ({
  page,
}) => {
  await page.locator('[data-mode="trio"]').click();
  await page.locator('[data-action="play"]').click();
  await page.waitForFunction(
    () => {
      const m = (window as any).__arena.scene.match;
      return m && m.countdown <= 0;
    },
    {},
    { timeout: 15000 },
  );
  const before = await page.evaluate(() =>
    (window as any).__arena.scene.match.players.map((p: any) => ({
      x: p.x,
      y: p.y,
    })),
  );
  await page.keyboard.down("d");
  await page.keyboard.down("ArrowLeft");
  await page.keyboard.down("l");
  await page.keyboard.down("w");
  await page.keyboard.down("ArrowUp");
  await page.keyboard.down("i");
  await page.waitForFunction((b) => {
    const ps = (window as any).__arena.scene.match.players;
    return (
      ps[0].x > b[0].x + 15 &&
      ps[1].x < b[1].x - 15 &&
      ps[2].x > b[2].x + 15 &&
      ps.every((p: any, i: number) => p.y < b[i].y - 30)
    );
  }, before);
  for (const key of ["d", "ArrowLeft", "l", "w", "ArrowUp", "i"])
    await page.keyboard.up(key);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Catch your breath." }),
  ).toBeVisible();
  const paused = await page.evaluate(
    () => (window as any).__arena.scene.match.time,
  );
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(() => (window as any).__arena.scene.match.time),
  ).toBe(paused);
  await page.locator('[data-action="resume"]').click();
  await expect(page.locator(".dialog")).toHaveCount(0);
});
test("tagging, expiration, statistics, rematch and change map use the complete match flow", async ({
  page,
}) => {
  await page.locator('[data-mode="duo"]').click();
  await page.locator('[data-action="play"]').click();
  await page.evaluate(() => {
    const m = (window as any).__arena.scene.match;
    m.countdown = 0;
    m.players.forEach((p: any) => {
      p.x = 600;
      p.y = 539;
      p.vx = 0;
    });
    m.update(0.01, []);
    m.paused = true;
  });
  await expect(page.locator("#hud")).toContainText("Player 2");
  expect(
    await page.evaluate(() => (window as any).__arena.scene.match.it),
  ).toBe(1);
  await page.evaluate(() => {
    const m = (window as any).__arena.scene.match;
    m.time = 0.001;
    m.paused = false;
  });
  await expect(
    page.getByRole("heading", { name: /Player 1.*wins the round/ }),
  ).toBeVisible();
  await page.locator('[data-action="rematch"]').click();
  await expect(page.locator("#hud")).toContainText("ROUND 02");
  await page.keyboard.press("Escape");
  await page.locator('[data-action="restart"]').click();
  await expect(page.locator("#hud")).toContainText("ROUND 02");
  await page.evaluate(() => {
    const m = (window as any).__arena.scene.match;
    m.countdown = 0;
    m.time = 0.001;
  });
  await expect(page.locator('[data-action="change-map"]')).toBeVisible();
  await page.locator('[data-action="change-map"]').click();
  await page.locator('[data-map="4"]').click();
  await page.locator('[data-action="next-map"]').click();
  await expect(page.locator("#hud")).toContainText("Neon City");
  await page.getByRole("button", { name: "TAG ARENA home" }).click();
  await page.getByRole("button", { name: "Your stats" }).click();
  await expect(page.locator(".stats-table")).toContainText("Player 1");
});
test("AI actually chases and escapes on every arena in the browser", async ({
  page,
}) => {
  for (let i = 0; i < 6; i++) {
    const result = await page.evaluate((map) => {
      const api = (window as any).__arena;
      api.settings.difficulty = "hard";
      api.settings.powerups = false;
      api.mode("solo");
      api.map(map);
      api.start();
      const m = api.scene.match;
      m.countdown = 0;
      m.it = 1;
      let caught = false;
      for (let n = 0; n < 4800; n++) {
        m.update(1 / 120, []);
        if (m.it === 0) {
          caught = true;
          break;
        }
      }
      m.it = 0;
      let moved = 0;
      const from = m.players[1].x;
      for (let n = 0; n < 1200; n++) m.update(1 / 120, []);
      moved = Math.abs(m.players[1].x - from);
      return {
        caught,
        moved,
        finite: m.players.every(
          (p: any) => Number.isFinite(p.x) && Number.isFinite(p.y),
        ),
      };
    }, i);
    expect(result.caught).toBeTruthy();
    expect(result.finite).toBeTruthy();
    expect(result.moved).toBeGreaterThan(10);
  }
});
test("desktop and narrow screen layouts fit and capture original visual output", async ({
  page,
}) => {
  await page.screenshot({ path: "test-results/home-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-action="play"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  await page.locator('[data-action="play"]').click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({ path: "test-results/game-mobile.png" });
});
