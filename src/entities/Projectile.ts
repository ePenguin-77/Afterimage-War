import type { Fighter } from "./Fighter";
import type { Game } from "../Game";
import type { DamageKind } from "../classes/FighterClass";
import {
  applyBurn,
  applyDeathMark,
  applyGravityStatus,
  applyPoison,
  type BurnOptions,
  type DeathMarkOptions,
  type GravityStatusOptions,
  type PoisonOptions
} from "../combat/statusEffects";
import { BALANCE, CHRONO } from "../tuning";
import { Rect, Vec2, angleTo, circleOverlap, clamp, copyVec } from "../utils/math";

type ProjectileAfterimage = {
  position: Vec2;
  rotation: number;
  alpha: number;
};

export class Projectile {
  owner: Fighter;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  damage: number;
  color: string;
  secondaryColor: string;
  life: number;
  rotation = 0;
  trail: ProjectileAfterimage[] = [];
  remove = false;
  kind:
    | "timeShard"
    | "ember"
    | "sparkBolt"
    | "venom"
    | "gravityPulse"
    | "bloodShard"
    | "refraction"
    | "shatterShot"
    | "metalShard"
    | "stormShard"
    | "bankShot"
    | "barrageBankShot"
    | "soulBlade"
    | "sniperShot"
    | "riftShot"
    | "prismShot";
  burn?: BurnOptions;
  poison?: PoisonOptions;
  gravity?: GravityStatusOptions;
  deathMark?: DeathMarkOptions;
  damageKind: DamageKind;
  bounceCount = 0;
  maxBounces = 0;
  damageBonusPerBounce = 0;
  bankAbilityBonus = 0;
  perfectBankAbilityBonus = 0;
  bouncedHitRadiusBonus = 0;
  perfectBankHitRadiusBonus = 0;
  perfectBankFlatDamage = 0;
  ricochetBonusGranted = false;
  knockback: number;

  constructor(options: {
    owner: Fighter;
    position: Vec2;
    velocity: Vec2;
    radius: number;
    damage: number;
    color: string;
    secondaryColor: string;
    life: number;
    kind?:
      | "timeShard"
      | "ember"
      | "sparkBolt"
      | "venom"
      | "gravityPulse"
      | "bloodShard"
      | "refraction"
      | "shatterShot"
      | "metalShard"
      | "stormShard"
      | "bankShot"
      | "barrageBankShot"
      | "soulBlade"
      | "sniperShot"
      | "riftShot"
      | "prismShot";
    burn?: BurnOptions;
    poison?: PoisonOptions;
    gravity?: GravityStatusOptions;
    deathMark?: DeathMarkOptions;
    damageKind?: DamageKind;
    maxBounces?: number;
    damageBonusPerBounce?: number;
    bankAbilityBonus?: number;
    perfectBankAbilityBonus?: number;
    bouncedHitRadiusBonus?: number;
    perfectBankHitRadiusBonus?: number;
    perfectBankFlatDamage?: number;
    knockback?: number;
  }) {
    this.owner = options.owner;
    this.position = copyVec(options.position);
    this.velocity = {
      x: options.velocity.x * options.owner.runModifiers.projectileSpeedMultiplier,
      y: options.velocity.y * options.owner.runModifiers.projectileSpeedMultiplier
    };
    this.radius = options.radius;
    this.damage = options.damage;
    this.color = options.color;
    this.secondaryColor = options.secondaryColor;
    this.life = options.life;
    this.kind = options.kind ?? "timeShard";
    this.burn = options.burn;
    this.poison = options.poison;
    this.gravity = options.gravity;
    this.deathMark = options.deathMark;
    this.damageKind = options.damageKind ?? "projectile";
    this.maxBounces = options.maxBounces ?? 0;
    this.damageBonusPerBounce = options.damageBonusPerBounce ?? 0;
    this.bankAbilityBonus = options.bankAbilityBonus ?? 0;
    this.perfectBankAbilityBonus = options.perfectBankAbilityBonus ?? 0;
    this.bouncedHitRadiusBonus = options.bouncedHitRadiusBonus ?? 0;
    this.perfectBankHitRadiusBonus = options.perfectBankHitRadiusBonus ?? 0;
    this.perfectBankFlatDamage = options.perfectBankFlatDamage ?? 0;
    this.knockback = options.knockback ?? CHRONO.projectileKnockback;
  }

  update(dt: number, game: Game): void {
    this.life -= dt;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.rotation = angleTo({ x: 0, y: 0 }, this.velocity);

    if (game.isFastSimulation) {
      this.trail = [];
    } else {
      this.trail.unshift({
        position: copyVec(this.position),
        rotation: this.rotation,
        alpha: 0.5
      });
      this.trail = this.trail.slice(0, this.kind === "timeShard" ? 13 : 9);
      for (const afterimage of this.trail) {
        afterimage.alpha *= Math.pow(0.02, dt);
      }
    }

    this.handleRicochetWallBounce(game);
    if (this.remove) {
      return;
    }

    if (game.tryMirrorDecoyProjectileHit(this)) {
      this.remove = true;
      return;
    }

    for (const enemy of game.getProjectileTargets(this.owner)) {
      if (!circleOverlap(this.position, this.hitRadius, enemy.position, enemy.radius)) {
        continue;
      }
      if (game.tryMagnetProjectileBlock(this, enemy)) {
        this.remove = true;
        return;
      }

      const hpBefore = enemy.hp;
      const hitDamage = this.getCurrentDamage();
      enemy.takeDamage(hitDamage, this.owner, game, {
        knockback: this.knockback,
        hitColor: this.secondaryColor,
        damageKind: this.damageKind
      });
      if (this.kind === "sniperShot" && hpBefore > enemy.hp) {
        const actualDamage = Math.max(0, hpBefore - enemy.hp);
        this.owner.stats.chargedShotsHit += 1;
        this.owner.stats.chargedShotDamage += actualDamage;
        if (hpBefore / Math.max(1, enemy.maxHP) <= BALANCE.sniper.weakpointThreshold) {
          this.owner.stats.weakpointHits += 1;
        }
      }
      if (this.kind === "riftShot" && hpBefore > enemy.hp) {
        const actualDamage = Math.max(0, hpBefore - enemy.hp);
        this.owner.stats.riftShotHits += 1;
        this.owner.stats.riftShotDamage += actualDamage;
        game.spawnGravitySpark(enemy.position, this.secondaryColor);
      }
      this.recordRicochetHit(game, hitDamage);
      if (this.kind === "timeShard" && CHRONO.projectileSlowDuration > 0 && CHRONO.projectileSlowPercent > 0) {
        enemy.applySlow(CHRONO.projectileSlowDuration * this.owner.runModifiers.statusDurationMultiplier, 1 - CHRONO.projectileSlowPercent);
      }
      if (this.burn) {
        applyBurn(enemy, this.owner, this.burn);
      }
      if (this.poison) {
        applyPoison(enemy, this.owner, this.poison);
      }
      if (this.gravity) {
        applyGravityStatus(enemy, this.owner, this.gravity);
      }
      if (this.deathMark && enemy.hp < hpBefore) {
        applyDeathMark(enemy, this.owner, this.deathMark);
        game.spawnReaperSpark(enemy.position, this.secondaryColor);
      }
      if (this.kind === "bloodShard") {
        game.spawnVampireSpark(enemy.position, this.secondaryColor);
      } else if (this.kind === "soulBlade") {
        game.spawnReaperSpark(enemy.position, this.secondaryColor);
      }
      this.remove = true;
      return;
    }

    if (!insideRect(this.position, game.arena, 40) || this.life <= 0) {
      this.remove = true;
    }
  }

  private get isRicochetProjectile(): boolean {
    return this.kind === "bankShot" || this.kind === "barrageBankShot";
  }

  private getCurrentDamage(): number {
    if (!this.isRicochetProjectile) {
      return this.damage;
    }

    return this.damage * (1 + this.bounceCount * this.damageBonusPerBounce) + (this.bounceCount >= 3 ? this.perfectBankFlatDamage : 0);
  }

  private get hitRadius(): number {
    if (!this.isRicochetProjectile || this.bounceCount <= 0) {
      return this.radius;
    }

    return this.radius + (this.bounceCount >= 3 ? this.perfectBankHitRadiusBonus : this.bouncedHitRadiusBonus);
  }

  private handleRicochetWallBounce(game: Game): void {
    if (!this.isRicochetProjectile) {
      return;
    }

    const bounds = game.arenaInner;
    let bounced = false;
    if (this.position.x - this.radius <= bounds.x) {
      this.position.x = bounds.x + this.radius;
      this.velocity.x = Math.abs(this.velocity.x);
      bounced = true;
    } else if (this.position.x + this.radius >= bounds.x + bounds.w) {
      this.position.x = bounds.x + bounds.w - this.radius;
      this.velocity.x = -Math.abs(this.velocity.x);
      bounced = true;
    }

    if (this.position.y - this.radius <= bounds.y) {
      this.position.y = bounds.y + this.radius;
      this.velocity.y = Math.abs(this.velocity.y);
      bounced = true;
    } else if (this.position.y + this.radius >= bounds.y + bounds.h) {
      this.position.y = bounds.y + bounds.h - this.radius;
      this.velocity.y = -Math.abs(this.velocity.y);
      bounced = true;
    }

    if (!bounced) {
      return;
    }

    this.bounceCount += 1;
    this.owner.stats.ricochetProjectileBounces += 1;
    game.spawnRicochetSpark(this.position, this.secondaryColor);
    if (this.bounceCount > this.maxBounces) {
      this.remove = true;
      return;
    }
    this.position.x = clamp(this.position.x, bounds.x + this.radius, bounds.x + bounds.w - this.radius);
    this.position.y = clamp(this.position.y, bounds.y + this.radius, bounds.y + bounds.h - this.radius);
  }

  private recordRicochetHit(game: Game, hitDamage: number): void {
    if (!this.isRicochetProjectile) {
      return;
    }

    this.owner.stats.bankShotHits += 1;
    this.owner.stats.ricochetBonusDamage += Math.max(0, hitDamage - this.damage);
    if (this.bounceCount <= 0) {
      return;
    }

    this.owner.stats.bankShotBouncedHits += 1;
    const perfect = this.bounceCount >= 3;
    if (perfect) {
      this.owner.stats.perfectBankHits += 1;
    }

    if (!this.ricochetBonusGranted && game.time >= Number(this.owner.customState.ricochetBankMeterReadyAt ?? 0)) {
      this.ricochetBonusGranted = true;
      const meterBonus = perfect ? this.perfectBankAbilityBonus + this.owner.runModifiers.ricochetPerfectBankBonus : this.bankAbilityBonus;
      this.owner.ability.fill(meterBonus);
      this.owner.customState.ricochetBankMeterReadyAt = game.time + BALANCE.ricochet.bankMeterCooldown;
      this.owner.stats.bankMeterGained += meterBonus;
      game.spawnAbilityText(perfect ? "PERFECT BANK!" : "BANK!", this.secondaryColor, this.position);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = this.trail.length - 1; i >= 0; i -= 1) {
      const afterimage = this.trail[i];
      const scale = 1 - i * (this.kind === "timeShard" ? 0.025 : 0.035);
      this.drawShard(ctx, afterimage.position, afterimage.rotation, afterimage.alpha * (this.kind === "timeShard" ? 0.58 : 0.45), scale);
    }

    this.drawShard(ctx, this.position, this.rotation, 1, 1);
  }

  private drawShard(ctx: CanvasRenderingContext2D, position: Vec2, rotation: number, alpha: number, scale: number): void {
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    const gradient = ctx.createLinearGradient(-18, 0, 20, 0);
    gradient.addColorStop(0, "rgba(255,255,255,0.2)");
    gradient.addColorStop(0.5, this.color);
    gradient.addColorStop(1, this.secondaryColor);
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "#1c2433";
    ctx.lineWidth = 2;

    if (this.kind === "ember") {
      ctx.shadowColor = this.secondaryColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(-18, -6);
      ctx.lineTo(-15, 0);
      ctx.lineTo(-18, 6);
      ctx.closePath();
      ctx.fill();
    } else if (this.kind === "sparkBolt") {
      ctx.shadowColor = this.secondaryColor;
      ctx.shadowBlur = 14;
      ctx.lineCap = "round";
      ctx.strokeStyle = this.secondaryColor;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(4, -6);
      ctx.lineTo(-3, 5);
      ctx.lineTo(-16, -2);
      ctx.stroke();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(6, -5);
      ctx.lineTo(-2, 5);
      ctx.lineTo(-18, -2);
      ctx.stroke();
    } else if (this.kind === "venom") {
      ctx.shadowColor = this.secondaryColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(158, 255, 88, 0.62)";
      ctx.beginPath();
      ctx.arc(4, -3, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.kind === "gravityPulse") {
      ctx.shadowColor = this.secondaryColor;
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#2a173f";
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = this.secondaryColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 1.45);
      ctx.stroke();
    } else if (this.kind === "bloodShard") {
      ctx.shadowColor = this.secondaryColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-6, -9);
      ctx.lineTo(-18, 0);
      ctx.lineTo(-6, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 230, 230, 0.42)";
      ctx.beginPath();
      ctx.arc(4, -2, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.kind === "refraction" || this.kind === "shatterShot" || this.kind === "prismShot") {
      ctx.shadowColor = this.secondaryColor;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(this.kind === "shatterShot" ? 14 : 18, 0);
      ctx.lineTo(3, this.kind === "shatterShot" ? -9 : -12);
      ctx.lineTo(this.kind === "shatterShot" ? -13 : -18, -3);
      ctx.lineTo(-6, this.kind === "shatterShot" ? 7 : 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = this.kind === "prismShot" ? "rgba(255, 221, 138, 0.82)" : "rgba(255,255,255,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, -5);
      ctx.lineTo(-6, 3);
      ctx.stroke();
    } else if (this.kind === "metalShard" || this.kind === "stormShard") {
      ctx.shadowColor = this.secondaryColor;
      ctx.shadowBlur = this.kind === "stormShard" ? 16 : 11;
      ctx.beginPath();
      ctx.moveTo(19, 0);
      ctx.lineTo(2, -8);
      ctx.lineTo(-17, -4);
      ctx.lineTo(-8, 5);
      ctx.lineTo(4, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = this.secondaryColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(9, -5);
      ctx.lineTo(-7, 4);
      ctx.stroke();
    } else if (this.kind === "bankShot" || this.kind === "barrageBankShot") {
      ctx.shadowColor = this.secondaryColor;
      ctx.shadowBlur = this.bounceCount > 0 ? 18 : 11;
      ctx.fillStyle = this.bounceCount > 0 ? "#fff7dc" : "#f8fdff";
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(4, -11);
      ctx.lineTo(-16, -7);
      ctx.lineTo(-9, 0);
      ctx.lineTo(-16, 7);
      ctx.lineTo(4, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = this.bounceCount > 0 ? "#ff9d36" : this.secondaryColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(10, -6);
      ctx.lineTo(-6, 5);
      ctx.stroke();
    } else if (this.kind === "soulBlade") {
      ctx.shadowColor = this.secondaryColor;
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#21142c";
      ctx.strokeStyle = this.secondaryColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 15, -1.05, 1.05);
      ctx.arc(-2, 0, 8, 0.85, -0.85, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(232,251,255,0.82)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, -6);
      ctx.lineTo(-10, 5);
      ctx.stroke();
    } else if (this.kind === "sniperShot") {
      ctx.shadowColor = this.secondaryColor;
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#fff1f1";
      ctx.strokeStyle = "#22070c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(3, -6);
      ctx.lineTo(-18, -3);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-18, 3);
      ctx.lineTo(3, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = this.secondaryColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-8, 0);
      ctx.stroke();
    } else if (this.kind === "riftShot") {
      ctx.shadowColor = this.secondaryColor;
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#dffbff";
      ctx.strokeStyle = "#071323";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(19, 0);
      ctx.lineTo(4, -10);
      ctx.lineTo(-16, -4);
      ctx.lineTo(-9, 0);
      ctx.lineTo(-16, 4);
      ctx.lineTo(4, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = this.secondaryColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 12, -0.7, 0.7);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-10, -7);
      ctx.lineTo(-18, 0);
      ctx.lineTo(-10, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

function insideRect(position: Vec2, rect: Rect, margin: number): boolean {
  return (
    position.x >= rect.x - margin &&
    position.x <= rect.x + rect.w + margin &&
    position.y >= rect.y - margin &&
    position.y <= rect.y + rect.h + margin
  );
}
