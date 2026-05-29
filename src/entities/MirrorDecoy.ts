import type { Game } from "../Game";
import type { Fighter } from "./Fighter";
import { TAU, Vec2, clamp, copyVec } from "../utils/math";

export class MirrorDecoy {
  owner: Fighter;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  remainingTime: number;
  maxTime: number;
  absorbHits: number;
  active = true;

  constructor(options: {
    owner: Fighter;
    position: Vec2;
    velocity: Vec2;
    radius: number;
    duration: number;
    absorbHits: number;
  }) {
    this.owner = options.owner;
    this.position = copyVec(options.position);
    this.velocity = copyVec(options.velocity);
    this.radius = options.radius;
    this.remainingTime = options.duration;
    this.maxTime = options.duration;
    this.absorbHits = options.absorbHits;
  }

  get targetWeight(): number {
    return this.active ? 1.2 : 0;
  }

  update(dt: number, game: Game): void {
    if (!this.active) {
      return;
    }

    this.remainingTime -= dt;
    if (this.remainingTime <= 0 || this.owner.defeated) {
      this.active = false;
      return;
    }

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.bounceInside(game.arenaInner);
  }

  absorbHit(game: Game, attacker?: Fighter, color = "#dff6ff"): void {
    if (!this.active) {
      return;
    }

    this.absorbHits -= 1;
    this.owner.stats.attacksAbsorbedByDecoys += 1;
    if (this.absorbHits <= 0) {
      this.shatter(game, color, attacker, true);
    } else {
      game.spawnMirrorSpark(this.position, color);
    }
  }

  shatter(game: Game, color = "#dff6ff", attacker?: Fighter, fireCounter = false): void {
    if (!this.active) {
      return;
    }

    this.active = false;
    this.owner.stats.decoysDestroyed += 1;
    game.spawnMirrorShatter(this.position, color);
    if (fireCounter && attacker && !attacker.defeated) {
      game.spawnAbilityText("SHATTER", this.owner.classDef.secondaryColor, this.position);
      game.spawnMirrorShatterShots(this.owner, attacker, this.position);
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    if (!this.active) {
      return;
    }

    const lifeRatio = clamp(this.remainingTime / Math.max(0.001, this.maxTime), 0, 1);
    const shimmer = 0.74 + Math.sin(time * 18 + this.position.x * 0.03) * 0.12;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.globalAlpha = Math.max(0.18, lifeRatio * 0.52) * shimmer;

    const gradient = ctx.createRadialGradient(-8, -10, 3, 0, 0, this.radius);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.38, this.owner.classDef.secondaryColor);
    gradient.addColorStop(1, this.owner.classDef.primaryColor);
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "rgba(223, 246, 255, 0.92)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.82)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 7 + Math.sin(time * 9) * 2, time * 1.6, time * 1.6 + TAU * 0.48);
    ctx.stroke();

    ctx.restore();
  }

  private bounceInside(arena: { x: number; y: number; w: number; h: number }): void {
    const left = arena.x + this.radius;
    const right = arena.x + arena.w - this.radius;
    const top = arena.y + this.radius;
    const bottom = arena.y + arena.h - this.radius;

    if (this.position.x < left) {
      this.position.x = left;
      this.velocity.x = Math.abs(this.velocity.x);
    } else if (this.position.x > right) {
      this.position.x = right;
      this.velocity.x = -Math.abs(this.velocity.x);
    }

    if (this.position.y < top) {
      this.position.y = top;
      this.velocity.y = Math.abs(this.velocity.y);
    } else if (this.position.y > bottom) {
      this.position.y = bottom;
      this.velocity.y = -Math.abs(this.velocity.y);
    }
  }
}
