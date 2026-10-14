import { settings } from "./settings";
export class AudioSystem {
  ctx?: AudioContext;
  nextBeat = 0;
  beat = 0;
  muted = false;
  unlock() {
    try {
      this.ctx ??= new AudioContext();
      void this.ctx.resume();
    } catch {}
  }
  tone(
    freq: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
    end?: number,
  ) {
    const c = this.ctx;
    if (!c || this.muted) return;
    const o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (end)
      o.frequency.exponentialRampToValueAtTime(end, c.currentTime + duration);
    g.gain.setValueAtTime(Math.max(0.001, volume), c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + duration);
  }
  effect(name: string) {
    const v = settings.sound * 0.12;
    switch (name) {
      case "jump":
        this.tone(220, 0.12, v, "sine", 550);
        break;
      case "land":
        this.tone(110, 0.07, v * 0.4, "triangle", 65);
        break;
      case "tag":
        this.tone(660, 0.2, v, "square", 220);
        break;
      case "portal":
        this.tone(150, 0.35, v, "sine", 1200);
        break;
      case "bounce":
        this.tone(180, 0.25, v, "triangle", 880);
        break;
      case "pickup":
        this.tone(740, 0.15, v);
        setTimeout(() => this.tone(1100, 0.15, v), 90);
        break;
      case "dash":
        this.tone(800, 0.18, v, "sawtooth", 100);
        break;
      case "tick":
        this.tone(700, 0.07, v * 0.8, "triangle");
        break;
      case "defeat":
        [440, 330, 220].forEach((n, i) =>
          setTimeout(() => this.tone(n, 0.3, v, "triangle"), i * 130),
        );
        break;
      case "finish":
        [440, 550, 660, 880].forEach((n, i) =>
          setTimeout(() => this.tone(n, 0.35, v), i * 100),
        );
        break;
      default:
        this.tone(440, 0.045, v * 0.4, "sine", 550);
    }
  }
  update(now: number, playing: boolean) {
    if (!this.ctx || now < this.nextBeat) return;
    this.nextBeat = now + (playing ? 0.25 : 0.38);
    const notes = [
      261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23, 246.94, 293.66,
      392, 293.66, 261.63, 329.63, 523.25, 392,
    ];
    this.tone(
      notes[this.beat % 16] * (playing ? 1 : 0.5),
      0.25,
      settings.music * 0.04,
      "triangle",
    );
    if (this.beat % 4 === 0)
      this.tone(notes[this.beat % 16] / 2, 0.5, settings.music * 0.05);
    this.beat++;
  }
}
export const audio = new AudioSystem();
