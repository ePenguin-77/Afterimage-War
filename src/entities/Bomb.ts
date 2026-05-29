import type { Game } from "../Game";
import type { Fighter } from "./Fighter";
import { TAU, Vec2, angleTo, circleOverlap, copyVec, distance, fromAngle, randomRange } from "../utils/math";

export type BombType = "mini" | "wall" | "chain";

export class Bomb {
  owner: Fighter;
  position: Vec2;
  velocity: Vec2;
  type: BombType;
  radius: number;
  damage: number;
  fuseTime: number;
  timer: number;
  directHitDamage: number;
  flightTimer: number;
  planted = false;
  exploded = false;
  chainActivationId?: string;
  chainIndex = 0;

  constructor(options: {
    owner: Fighter;
    position: Vec2;
    velocity?: Vec2;
    type: BombType;
    radius: number;
    damage: number;
    fuseTime: number;
    directHitDamage?: number;
    flightTime?: number;
    chainActivationId?: string;
    chainIndex?: number;
  }) {
    this.owner = options.owner;
    this.position = copyVec(options.position);
    this.velocity = options.velocity ? copyVec(options.velocity) : { x: 0, y: 0 };
    this.type = options.type;
    this.radius = options.radius;
    this.damage = options.damage;
    this.fuseTime = options.fuseTime;
    this.timer = options.fuseTime;
    this.directHitDamage = options.directHitDamage ?? 0;
    this.flightTimer = options.flightTime ?? 0;
    this.planted = !options.velocity;
    this.chainActivationId = options.chainActivationId;
    this.chainIndex = options.chainIndex ?? 0;
  }

  update(dt: number, game: Game): void {
    if (this.exploded) {
      return;
    }

    if (!this.planted) {
      this.flightTimer -= dt;
      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;

      for (const decoy of game.mirrorDecoys) {
        if (decoy.owner !== this.owner && decoy.active && circleOverlap(this.position, 11, decoy.position, decoy.radius)) {
          decoy.absorbHit(game, this.owner, "#ff8a31");
          this.plant();
          return;
        }
      }

      const enemy = game.getProjectileTargets(this.owner).find((candidate) => circleOverlap(this.position, 11, candidate.position, candidate.radius));
      if (enemy) {
        enemy.takeDamage(this.directHitDamage, this.owner, game, {
          hitColor: "#ff8a31",
          damageKind: "projectile"
        });
        this.plant();
      }

      if (this.flightTimer <= 0 || !insideArenaWithMargin(this.position, game.arena, 34)) {
        this.plant();
      }
      return;
    }

    this.timer -= dt;
    if (this.timer <= 0) {
      this.explode(game);
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    if (this.exploded) {
      return;
    }

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    if (!this.planted) {
      ctx.rotate(angleTo({ x: 0, y: 0 }, this.velocity));
    }

    const fuseProgress = this.planted ? 1 - Math.max(0, this.timer / this.fuseTime) : 0;
    const blink = this.planted ? 0.35 + Math.sin(time * (9 + fuseProgress * 18)) * 0.25 + fuseProgress * 0.35 : 0.35;
    const bombSize = this.type === "chain" ? 15 : this.type === "wall" ? 12 : 11;

    ctx.shadowColor = "#ff8a31";
    ctx.shadowBlur = this.planted ? 8 + fuseProgress * 16 : 7;
    ctx.fillStyle = "#28262a";
    ctx.strokeStyle = `rgba(255, 138, 49, ${Math.min(1, blink)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, bombSize, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#ffcf70";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, bombSize + 5 + fuseProgress * 5, -Math.PI / 2, -Math.PI / 2 + TAU * fuseProgress);
    ctx.stroke();

    ctx.fillStyle = "#ffcf70";
    ctx.beginPath();
    ctx.arc(bombSize * 0.35, -bombSize * 0.45, 3 + fuseProgress * 2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private plant(): void {
    this.planted = true;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.timer = Math.min(this.timer, this.fuseTime);
  }

  private explode(game: Game): void {
    this.exploded = true;
    this.owner.stats.bombsExploded += 1;
    const targets = game.getEnemies(this.owner).filter((enemy) => distance(enemy.position, this.position) <= this.radius + enemy.radius);
    const hit = targets.length > 0;
    for (const decoy of game.mirrorDecoys) {
      if (decoy.owner !== this.owner && decoy.active && distance(decoy.position, this.position) <= this.radius + decoy.radius) {
        decoy.shatter(game, "#ff8a31");
      }
    }
    game.spawnBombExplosion(this.position, this.radius, hit);

    if (!hit) {
      return;
    }

    const falloff = this.type === "chain" ? getChainFalloff(this.chainIndex) : 1;
    for (const enemy of targets) {
      enemy.takeDamage(this.damage * falloff, this.owner, game, {
        hitColor: "#ff8a31",
        ignoreCooldown: true,
        damageKind: "explosion"
      });
    }
  }
}

function getChainFalloff(index: number): number {
  if (index <= 0) {
    return 1;
  }
  if (index === 1) {
    return 0.7;
  }
  return 0.5;
}

function insideArenaWithMargin(position: Vec2, rect: { x: number; y: number; w: number; h: number }, margin: number): boolean {
  return (
    position.x >= rect.x - margin &&
    position.x <= rect.x + rect.w + margin &&
    position.y >= rect.y - margin &&
    position.y <= rect.y + rect.h + margin
  );
}

export function createThrownBomb(owner: Fighter, from: Vec2, target: Vec2, speed: number, options: {
  radius: number;
  damage: number;
  fuseTime: number;
  directHitDamage: number;
}): Bomb {
  const travelDistance = Math.max(1, distance(from, target));
  const angle = angleTo(from, target);
  return new Bomb({
    owner,
    position: from,
    velocity: fromAngle(angle, speed),
    type: "mini",
    radius: options.radius,
    damage: options.damage,
    fuseTime: options.fuseTime,
    directHitDamage: options.directHitDamage,
    flightTime: travelDistance / speed
  });
}

export function randomBombOffset(radius: number): Vec2 {
  const angle = randomRange(0, TAU);
  const length = randomRange(radius * 0.25, radius);
  return { x: Math.cos(angle) * length, y: Math.sin(angle) * length };
}
