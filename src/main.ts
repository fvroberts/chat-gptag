import Phaser from "phaser";
import { ArenaScene } from "./scene";
import { arenas } from "./maps";
import { powerNames, type Mode, type Match } from "./engine";
import { settings, saveSettings, stats } from "./settings";
import { audio } from "./audio";
import "./style.css";
const ui = document.querySelector<HTMLDivElement>("#ui")!;
const scene = new ArenaScene();
new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game",
  width: 1200,
  height: 720,
  backgroundColor: "#193e36",
  scene: [scene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true },
  input: { keyboard: true },
});
let mode: Mode = "solo",
  map = 0,
  round = 1,
  modal = "",
  lastHud = "",
  lastPaused = false,
  screen = "home";
const name = (id: number) =>
  mode === "solo" && id === 1 ? "Computer" : `Player ${id + 1}`;
const arrowSvg =
  '<svg class="arrow-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19L19 5M5 5h14v14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const gearSvg =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.4"/></svg>';
const icon = (kind: string) =>
  ({
    sound: "♫",
    settings: gearSvg,
    close: "×",
    play: "▶",
    pause: "Ⅱ",
    back: "←",
  })[kind] ?? kind;
function button(label: string, action: string, cls = "", extra = "") {
  return `<button class="${cls}" data-action="${action}" ${extra}>${label.replaceAll("↗", arrowSvg).replaceAll("Ⅱ", '<span class="pause-symbol" aria-hidden="true">❚❚</span>')}</button>`;
}
function header() {
  return `<header class="header"><button data-action="home" class="brand" aria-label="TAG ARENA home"><span class="brand-mark">t<span>•</span></span><span>TAG<span class="brand-light">ARENA</span></span></button><nav>${button("How to play", "help", "nav-link")}${button("Your stats", "stats", "nav-link")}${button(icon("settings"), "settings", "icon-button", 'aria-label="Settings"')}${button(audio.muted ? "♪ OFF" : "♫ ON", "mute", "sound-button", 'aria-label="Toggle audio"')}</nav></header>`;
}
function footer() {
  return `<footer><span><i class="live-dot"></i> LOCAL MULTIPLAYER. LIMITLESS MISCHIEF.</span><span>Made for friendly rivalries <span class="footer-star">✳</span></span></footer>`;
}
function preview(index: number) {
  const a = arenas[index];
  return `<svg viewBox="0 0 240 120" aria-hidden="true"><rect width="240" height="120" fill="${a.sky}"/><circle cx="198" cy="27" r="16" fill="${a.accent}" opacity=".2"/>${a.platforms.map((p) => `<rect x="${p.x / 5}" y="${p.y / 6.4 - 1}" width="${p.w / 5}" height="4" rx="1" fill="${a.ground}"/><rect x="${p.x / 5}" y="${p.y / 6.4 - 1}" width="${p.w / 5}" height="1" fill="${a.accent}"/>`).join("")}${a.portals.map((p) => `<ellipse cx="${p.x / 5}" cy="${p.y / 6.4}" rx="4" ry="6" fill="none" stroke="#bfe9ef"/>`).join("")}<rect x="${a.spawns[0].x / 5}" y="${a.spawns[0].y / 6.4 - 8}" width="6" height="7" rx="2" fill="#ff8d78"/><rect x="${a.spawns[1].x / 5}" y="${a.spawns[1].y / 6.4 - 8}" width="6" height="7" rx="2" fill="#82d9f3"/></svg>`;
}
function mapCards(full = false) {
  return arenas
    .map(
      (a, i) =>
        `<button data-action="map" data-map="${i}" class="map-card ${map === i ? "selected" : ""}" aria-pressed="${map === i}">${preview(i)}<span class="map-card-label"><span>${a.name}</span><span class="map-index">${map === i ? "✓" : `0${i + 1}`}</span></span>${full ? `<small>${a.subtitle}</small>` : ""}</button>`,
    )
    .join("");
}
function home() {
  screen = "home";
  modal = "";
  scene.showMenu(map);
  document.body.classList.remove("playing");
  ui.innerHTML = `${header()}<div class="home-shade"></div><main class="home"><div class="eyebrow"><span class="mini-pill">YOU'RE IT.</span> THE CHASE IS ON</div><h1>Catch a little<br><em>chaos.</em><span class="spark">✳</span></h1><p class="intro">Good friends. Fast feet. One very bad time<br>to be <strong>IT.</strong> Welcome to your new favourite rivalry.</p><div class="mode-switch" role="group" aria-label="Player mode">${button("vs Computer", "mode", mode === "solo" ? "active" : "", 'data-mode="solo"')}${button("2 Players", "mode", mode === "duo" ? "active" : "", 'data-mode="duo"')}${button("3 Players", "mode", mode === "trio" ? "active" : "", 'data-mode="trio"')}</div><div class="play-row">${button("LET’S PLAY <span>↗</span>", "play", "play-button")}${button("✎", "customise", "customise-button", 'aria-label="Customise characters"')}</div><div class="keyboard-note"><span class="keycap">W</span><span class="keycap">A</span><span class="keycap">D</span><span>One keyboard. All the action.</span></div></main><aside class="arena-sticker"><span class="sticker-star">✦</span><span>Small beans.<br><strong>Big energy.</strong></span></aside><div class="map-strip"><div class="strip-heading"><span>CHOOSE YOUR PLAYGROUND <span class="muted">/ 06 ARENAS</span></span>${button("Surprise me ↗", "random", "text-button")}</div><div class="map-grid">${mapCards()}</div></div>${footer()}`;
}
function start(nextRound = 1) {
  round = nextRound;
  modal = "";
  screen = "game";
  lastHud = "";
  lastPaused = false;
  document.body.classList.add("playing");
  scene.startMatch(mode, map, round);
  ui.innerHTML = `${header()}<div id="hud"></div><div id="overlay"></div><div class="game-controls"><span><b>P1</b> W A D <small>Q dash</small></span><span><b>${mode === "solo" ? "CPU" : "P2"}</b> ${mode === "solo" ? settings.difficulty.toUpperCase() : "↑ ← → <small>R Shift dash</small>"}</span>${mode === "trio" ? "<span><b>P3</b> I J L <small>U dash</small></span>" : ""}${button("Ⅱ Pause", "pause", "text-button")}<span class="controls-hint">ESC TO PAUSE</span></div>${footer()}`;
}
function frame(m?: Match) {
  if (!m || screen !== "game") return;
  const hud = document.querySelector("#hud");
  if (!hud) return;
  const sec = Math.ceil(m.time);
  const value = `${sec}-${m.it}-${Math.ceil(m.countdown)}-${m.players
    .map((p) =>
      Object.entries(p.effects)
        .map(([k, v]) => `${k}${Math.ceil(v!)}`)
        .join(""),
    )
    .join("-")}`;
  if (value !== lastHud) {
    lastHud = value;
    hud.innerHTML = `<div class="round-pill">${arenas[map].name}<small>ROUND ${round.toString().padStart(2, "0")}</small></div><div class="timer ${sec <= 10 ? "urgent" : ""}">${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}<small>${m.countdown > 0 ? "GET READY" : "DON’T BE IT"}</small></div><div class="player-hud">${m.players
      .map(
        (p) =>
          `<div class="player-chip ${m.it === p.id ? "is-it" : ""}" style="--player:${p.color}"><span class="player-dot"></span><b>${name(p.id)}</b>${m.it === p.id ? '<span class="it-pill">IT</span>' : ""}<small>${Object.entries(
            p.effects,
          )
            .map(
              ([k, v]) =>
                `${powerNames[k as keyof typeof powerNames]} ${Math.ceil(v!)}s`,
            )
            .join(" · ")}</small></div>`,
      )
      .join("")}</div>`;
  }
  if (m.paused !== lastPaused && !m.ended) {
    lastPaused = m.paused;
    if (m.paused) showPause();
    else closeOverlay();
  }
}
scene.onFrame = frame;
scene.onEnd = () => results();
function overlay(content: string, wide = false) {
  let target = document.querySelector("#overlay");
  if (!target) {
    target = document.createElement("div");
    target.id = "overlay";
    ui.append(target);
  }
  target.innerHTML = `<div class="modal-backdrop"><section class="dialog ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${modal || "Round result"}">${content}</section></div>`;
  target.querySelector<HTMLElement>("button,input,select")?.focus();
}
function title(eyebrow: string, heading: string) {
  return `<div class="dialog-top"><span class="eyebrow">${eyebrow}</span>${button("×", "close", "close-button", 'aria-label="Close dialog"')}</div><h2>${heading}</h2>`;
}
function closeOverlay() {
  const o = document.querySelector("#overlay");
  if (o) o.innerHTML = "";
  modal = "";
}
function showPause() {
  modal = "pause";
  overlay(
    `${title("TAKE A BREATHER", "Catch your breath.")}<p>The chase can wait a moment.</p><div class="dialog-actions vertical">${button("Back to the chase →", "resume", "primary")}${button("Restart round", "restart", "secondary")}${button("Settings", "settings", "secondary")}${button("Main menu", "home", "text-button")}</div>`,
  );
}
function results() {
  modal = "results";
  const m = scene.match!;
  const winners = m.players.filter((p) => p.id !== m.it);
  overlay(
    `<div class="result-icon">✳</div><div class="eyebrow">CAUGHT AT THE BUZZER</div><h2>${winners.map((p) => name(p.id)).join(" & ")}<br><em>${winners.length > 1 ? "win" : "wins"} the round!</em></h2><p><strong style="color:${m.players[m.it].color}">${name(m.it)}</strong> was left holding the tag.</p><div class="round-stats">${m.players.map((p) => `<div><span style="color:${p.color}">${name(p.id)}</span><b>${p.id === m.it ? "CAUGHT" : "ESCAPED"}</b><small>${p.itTime.toFixed(1)}s as IT</small></div>`).join("")}</div><div class="dialog-actions">${button("Rematch ↗", "rematch", "primary")}${button("Change map", "change-map", "secondary")}</div>${button("Back to main menu", "home", "text-button")}`,
  );
}
function help() {
  modal = "help";
  overlay(
    `${title("THE RULES ARE SIMPLE", "Run. Jump. Don’t be IT.")}<p>Chase when you’re IT. Escape when you’re not. Touch another player to pass the tag. Whoever is IT when the timer ends loses. A white arrow marks the chaser; a brief glow protects against immediate tag-backs.</p><div class="help-controls"><div><span class="player-dot" style="background:${settings.colors[0]}"></span><b>Player 1</b><span>W jump · A / D move · Q dash</span></div><div><span class="player-dot" style="background:${settings.colors[1]}"></span><b>Player 2</b><span>↑ jump · ← / → move · Right Shift dash</span></div><div><span class="player-dot" style="background:${settings.colors[2]}"></span><b>Player 3</b><span>I jump · J / L move · U dash</span></div></div><div class="tips-grid"><div><b>◎ Portals</b><p>Step into a glowing ring to take a shortcut. A cooldown keeps you from bouncing back.</p></div><div><b>↑ Bounce pads</b><p>Yellow pads launch you higher. Hold jump for a full leap; release for a short hop.</p></div><div><b>✦ Power-ups</b><p>Speed, double jump, shield, super jump, slowdown and dash. Collect a dash, then use your ability key.</p></div><div><b>≋ Special terrain</b><p>Ice slides. Moving platforms carry you. Crumbling ledges return. Lava bounces you away. Green zones boost speed.</p></div></div><p class="small-note">ESC pauses · All platforms can be jumped through from below · Desktop keyboard recommended. Three-player input may depend on your keyboard’s key rollover.</p>${button("Got it. Let’s go →", "close", "primary")}`,
    true,
  );
}
function settingsDialog() {
  modal = "settings";
  overlay(
    `${title("YOUR GAME, YOUR WAY", "Set the pace.")}<div class="settings-grid"><label>Round duration<select id="duration"><option value="30">30 seconds · quick match</option><option value="60">60 seconds</option><option value="120">120 seconds</option><option value="180">180 seconds</option></select></label><label>Computer difficulty<select id="difficulty"><option value="easy">Easy · warming up</option><option value="normal">Normal · a fair chase</option><option value="hard">Hard · no time to relax</option></select></label><label class="toggle-row">Power-ups<input id="powerups" type="checkbox" ${settings.powerups ? "checked" : ""}></label><label class="toggle-row">Special map hazards<input id="hazards" type="checkbox" ${settings.hazards ? "checked" : ""}></label><label>Music <span id="music-value">${Math.round(settings.music * 100)}%</span><input id="music" type="range" min="0" max="1" step=".01" value="${settings.music}"></label><label>Sound effects <span id="sound-value">${Math.round(settings.sound * 100)}%</span><input id="sound" type="range" min="0" max="1" step=".01" value="${settings.sound}"></label></div><p class="small-note">Duration, difficulty and toggles apply to your next round. Volume changes are instant. Settings save automatically.</p><div class="dialog-actions">${button("All set →", "close", "primary")}${button(document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen", "fullscreen", "secondary")}</div>`,
  );
  (document.querySelector("#duration") as HTMLSelectElement).value = String(
    settings.duration,
  );
  (document.querySelector("#difficulty") as HTMLSelectElement).value =
    settings.difficulty;
}
function customise() {
  modal = "customise";
  overlay(
    `${title("MAKE YOUR MARK", "Meet your little troublemakers.")}<div class="custom-players">${settings.colors.map((color, i) => `<label><span class="bean" style="--bean:${color}"><i></i><i></i></span><b>Player ${i + 1}</b><input type="color" id="color-${i}" value="${color}" aria-label="Player ${i + 1} colour"></label>`).join("")}</div><label class="appearance-label">Character style<select id="appearance"><option value="bean">Classic bean</option><option value="cat">Curious cat</option><option value="robot">Tiny robot</option></select></label><p class="small-note">The computer wears green. Your colours and character style are saved for next time.</p>${button("Looking good →", "close", "primary")}`,
  );
  (document.querySelector("#appearance") as HTMLSelectElement).value =
    settings.appearance;
}
function statistics() {
  modal = "stats";
  overlay(
    `${title("THE FRIENDLY RIVALRY", "Your track record.")}<p>A little bragging is allowed. Statistics are saved on this browser.</p><div class="stats-table"><div class="stats-row head"><span>PLAYER</span><span>WINS</span><span>LOSSES</span><span>TIME AS IT</span></div>${[
      "Player 1",
      "Player 2",
      "Player 3",
      "Computer",
    ]
      .map((key) => {
        const s = stats[key] ?? { wins: 0, losses: 0, itTime: 0 };
        return `<div class="stats-row"><b>${key}</b><span>${s.wins}</span><span>${s.losses}</span><span>${Math.round(s.itTime)}s</span></div>`;
      })
      .join("")}</div>${button("Back to the fun →", "close", "primary")}`,
    true,
  );
}
function changeMap() {
  modal = "maps";
  overlay(
    `${title("A CHANGE OF SCENERY", "Pick your next playground.")}<div class="modal-maps">${mapCards(true)}</div><div class="dialog-actions">${button("Play this arena ↗", "next-map", "primary")}${button("Surprise me", "random-modal", "secondary")}</div>`,
    true,
  );
}
function pauseForDialog() {
  if (scene.match && !scene.match.ended) {
    scene.match.paused = true;
    lastPaused = true;
  }
}
ui.addEventListener("click", async (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!b) return;
  audio.unlock();
  audio.effect("click");
  const a = b.dataset.action;
  if (a === "mode") {
    mode = b.dataset.mode as Mode;
    home();
  }
  if (a === "map") {
    map = Number(b.dataset.map);
    if (screen === "home") {
      home();
    } else changeMap();
  }
  if (a === "play") {
    start();
  }
  if (a === "home") {
    home();
  }
  if (a === "help") {
    pauseForDialog();
    help();
  }
  if (a === "settings") {
    pauseForDialog();
    settingsDialog();
  }
  if (a === "customise") {
    customise();
  }
  if (a === "stats") {
    pauseForDialog();
    statistics();
  }
  if (a === "mute") {
    audio.muted = !audio.muted;
    b.textContent = audio.muted ? "♪ OFF" : "♫ ON";
  }
  if (a === "random") {
    map = Math.floor(Math.random() * arenas.length);
    home();
  }
  if (a === "random-modal") {
    map = Math.floor(Math.random() * arenas.length);
    changeMap();
  }
  if (a === "pause") {
    if (scene.match) {
      scene.match.paused = true;
      lastPaused = true;
      showPause();
    }
  }
  if (a === "resume") {
    if (scene.match) scene.match.paused = false;
    lastPaused = false;
    closeOverlay();
  }
  if (a === "close") {
    if (screen === "game") {
      if (scene.match?.ended) results();
      else showPause();
    } else closeOverlay();
  }
  if (a === "restart") start(round);
  if (a === "rematch") start(round + 1);
  if (a === "change-map") changeMap();
  if (a === "next-map") start(round + 1);
  if (a === "fullscreen") {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      b.textContent = document.fullscreenElement
        ? "Exit fullscreen"
        : "Enter fullscreen";
    } catch {
      b.textContent = "Fullscreen unavailable";
    }
  }
});
ui.addEventListener("input", (e) => {
  const el = e.target as HTMLInputElement,
    key = el.id;
  if (key === "duration") settings.duration = Number(el.value);
  if (key === "difficulty")
    settings.difficulty = el.value as typeof settings.difficulty;
  if (key === "powerups" || key === "hazards") settings[key] = el.checked;
  if (key === "music" || key === "sound") {
    settings[key] = Number(el.value);
    document.querySelector(`#${key}-value`)!.textContent =
      `${Math.round(Number(el.value) * 100)}%`;
  }
  if (key.startsWith("color-")) {
    const id = Number(key.slice(6));
    settings.colors[id] = el.value;
    const bean = el.parentElement?.querySelector<HTMLElement>(".bean");
    bean?.style.setProperty("--bean", el.value);
  }
  if (key === "appearance")
    settings.appearance = el.value as typeof settings.appearance;
  saveSettings();
});
document.addEventListener("keydown", (e) => {
  if (e.code === "Escape") {
    if (screen === "game" && scene.match && !scene.match.ended) {
      scene.match.paused = !scene.match.paused;
      lastPaused = scene.match.paused;
      if (lastPaused) showPause();
      else closeOverlay();
    } else if (modal) closeOverlay();
  }
  if (e.code === "Tab" && modal) {
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".dialog button,.dialog input,.dialog select",
      ),
    );
    const first = controls[0],
      last = controls.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
});
// Explicitly opt-in inspection used by the browser suite; absent in normal sessions.
if (new URLSearchParams(location.search).has("test"))
  (window as unknown as { __arena: unknown }).__arena = {
    scene,
    settings,
    stats,
    start,
    map: (n: number) => {
      map = n;
    },
    mode: (m: Mode) => {
      mode = m;
    },
  };
home();

ui.addEventListener("pointerover", (e) => {
  const button = (e.target as HTMLElement).closest("button");
  const previous = (e as PointerEvent).relatedTarget;
  if (button && !(previous instanceof Node && button.contains(previous)))
    audio.effect("hover");
});
