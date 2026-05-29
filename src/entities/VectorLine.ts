import type { Game } from "../Game";
import type { Fighter } from "./Fighter";
import { Vec2, clamp, distance, dot } from "../utils/math";

export class VectorLine {
  owner: Fighter;
  start: Vec2;
  end: Vec2;
  damage: number;
  width: number;
  duration: number;
  life: number;
  hitCooldown: number;
  webEnhanced: boolean;
  hitCooldowns = new Map<string, number>();

  constructor(options: {
    owner: Fighter;
    start: Vec2;
    end: Vec2;
    damage: number;
    width: number;
    duration: number;
    hitCooldown: number;
    webEnhanced: boolean;
  }) {
    this.owner = options.owner;
    this.start = { ...options.start };
    this.end = { ...options.end };
    this.damage = options.damage;
    this.width = options.width;
    this.duration = options.duration;
    this.life = options.duration;
    this.hitCooldown = options.hitCooldown;
    this.webEnhanced = options.webEnhanced;
  }

  update(dt: number, game: Game): void {
    this.life -= dt;
    for (const [targetId, cooldown] of this.hitCooldowns.entries()) {
      const nextCooldown = cooldown - dt;
      if (nextCooldown <= 0) {
        this.hitCooldowns.delete(targetId);
      } else {
        this.hitCooldowns.set(targetId, nextCooldown);
      }
    }

    if (this.life <= 0 || this.owner.defeated) {
      return;
    }

    const halfWidth = this.width / 2;
    for (const target of game.getEnemies(this.owner)) {
      if (this.hitCooldowns.has(target.id)) {
        continue;
      }
      const closest = closestPointOnSegment(target.position, this.start, this.end);
      if (distance(closest, target.position) > target.radius + halfWidth) {
        continue;
      }

      const beforeHp = target.hp;
      const hit = target.takeDamage(this.damage, this.owner, game, {
        knockback: 0,
        hitColor: this.webEnhanced ? "#ff4dff" : "#2dfcff",
        ignoreCooldown: true,
        damageKind: "ability"
      });
      this.hitCooldowns.set(target.id, this.hitCooldown);
      const dealt = Math.max(0, beforeHp - target.hp);
      if (!hit || dealt <= 0) {
        continue;
      }

      this.owner.stats.vectorLineHits += 1;
      this.owner.stats.vectorLineDamage += dealt;
      if (this.webEnhanced) {
        this.owner.stats.vectorWebLineHits += 1;
      }
      if (!game.isFastSimulation) {
        game.spawnCrusherSpark(closest, this.webEnhanced ? "#ff4dff" : "#2dfcff");
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const alpha = clamp(this.life / Math.max(0.001, this.duration), 0, 1);
    const pulse = 0.64 + Math.sin(time * (this.webEnhanced ? 12 : 9)) * 0.12;
    const angle = Math.atan2(this.end.y - this.start.y, this.end.x - this.start.x);
    const length = distance(this.start, this.end);

    ctx.save();
    ctx.translate(this.start.x, this.start.y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha * (0.55 + alpha * 0.45);
    ctx.lineCap = "round";

    const glow = this.webEnhanced ? "rgba(255, 77, 255, 0.24)" : "rgba(45, 252, 255, 0.2)";
    ctx.strokeStyle = glow;
    ctx.lineWidth = this.width * 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(length, 0);
    ctx.stroke();

    ctx.strokeStyle = this.webEnhanced ? "rgba(45, 252, 255, 0.48)" : "rgba(255, 255, 255, 0.42)";
    ctx.lineWidth = Math.max(2, this.width * 0.32);
    ctx.setLineDash([18, 10]);
    ctx.lineDashOffset = -time * (this.webEnhanced ? 120 : 82);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(length, 0);
    ctx.stroke();

    ctx.setLineDash([]);
    const gradient = ctx.createLinearGradient(0, 0, length, 0);
    gradient.addColorStop(0, this.webEnhanced ? "#ff4dff" : "#2dfcff");
    gradient.addColorStop(0.5, "#ffffff");
    gradient.addColorStop(1, this.webEnhanced ? "#2dfcff" : "#ff4dff");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(1.5, this.width * 0.16 + pulse);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(length, 0);
    ctx.stroke();

    drawNode(ctx, 0, 0, this.webEnhanced, pulse);
    drawNode(ctx, length, 0, this.webEnhanced, pulse);
    ctx.restore();
  }

  get active(): boolean {
    return this.life > 0 && !this.owner.defeated;
  }
}

export function closestPointOnSegment(point: Vec2, start: Vec2, end: Vec2): Vec2 {
  const segment = { x: end.x - start.x, y: end.y - start.y };
  const lengthSq = Math.max(0.0001, dot(segment, segment));
  const t = clamp(dot({ x: point.x - start.x, y: point.y - start.y }, segment) / lengthSq, 0, 1);
  return {
    x: start.x + segment.x * t,
    y: start.y + segment.y * t
  };
}

function drawNode(ctx: CanvasRenderingContext2D, x: number, y: number, webEnhanced: boolean, pulse: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = webEnhanced ? "rgba(255, 77, 255, 0.86)" : "rgba(45, 252, 255, 0.86)";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 4.8 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
