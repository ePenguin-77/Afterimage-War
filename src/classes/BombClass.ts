import { Bomb, createThrownBomb, randomBombOffset } from "../entities/Bomb";
import { BALANCE } from "../tuning";
import type { FighterClass, FighterClassContext, WallBounceContext } from "./FighterClass";
import { TAU, angleTo, clamp } from "../utils/math";

const WALL_BOMB_COOLDOWN = "bombWallDropCooldown";

export const BombClass: FighterClass = {
  id: "bomb",
  displayName: "Bomb Ball",
  primaryColor: "#2b2b30",
  secondaryColor: "#ff8a31",
  outlineColor: "#111119",
  role: "burst",
  roleLabel: "Explosive Burst / Trap",
  shortDescription: "Plants timed bombs and triggers chain explosions for area burst damage.",
  baseHP: BALANCE.bomb.hp,
  baseMoveSpeed: BALANCE.bomb.targetMoveSpeed,
  targetMoveSpeed: BALANCE.bomb.targetMoveSpeed,
  mass: BALANCE.bomb.mass,
  restitution: BALANCE.bomb.restitution,
  minSpeed: BALANCE.bomb.minSpeed,
  maxSpeed: BALANCE.bomb.maxSpeed,
  baseDamage: BALANCE.bomb.explosionDamage,
  scalingStatName: "Bombs",
  abilityName: "CHAIN DETONATION",
  abilityDescription: "Plants volatile bombs that explode in sequence for area damage.",
  abilityChargeRate: BALANCE.bomb.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    return `${Number(fighter.customState.activeBombCount ?? 0)}`;
  },

  updatePassiveScaling({ game, self }: FighterClassContext): void {
    self.customState.activeBombCount = game.bombs.filter((bomb) => bomb.owner === self && !bomb.exploded).length;
    self.scalingValue = Number(self.customState.activeBombCount ?? 0);
  },

  onWallBounce({ game, self, collision }: WallBounceContext): void {
    const cooldown = Number(self.customState[WALL_BOMB_COOLDOWN] ?? 0);
    if (cooldown > 0 || Math.random() > BALANCE.bomb.wallBombChance + self.runModifiers.bombWallChanceBonus) {
      return;
    }

    game.bombs.push(
      new Bomb({
        owner: self,
        position: collision.point,
        type: "wall",
        radius: BALANCE.bomb.wallBombRadius + self.runModifiers.bombRadiusBonus,
        damage: BALANCE.bomb.wallBombDamage,
        fuseTime: getFuseTime(BALANCE.bomb.wallBombFuseTime, self.runModifiers.bombFuseTimeBonus)
      })
    );
    self.stats.bombsPlaced += 1;
    self.customState[WALL_BOMB_COOLDOWN] = BALANCE.bomb.wallBombCooldown;
    game.spawnFireSpark(collision.point, this.secondaryColor);
  },

  updateAI(context: FighterClassContext): void {
    const { self, enemy, dt, game } = context;
    self.customState[WALL_BOMB_COOLDOWN] = Math.max(0, Number(self.customState[WALL_BOMB_COOLDOWN] ?? 0) - dt);

    if (self.attackCooldown <= 0 && self.distanceTo(enemy) < 590) {
      this.basicAttack(context);
      self.attackCooldown = BALANCE.bomb.attackInterval * self.runModifiers.attackIntervalMultiplier;
    }

    if (Math.random() < dt * 3.2) {
      game.spawnFireSpark(self.position, this.secondaryColor);
    }
  },

  basicAttack({ game, self, enemy }: FighterClassContext): void {
    const leadTime = 0.28;
    const aimTarget = game.getTargetPointFor(self, enemy, leadTime);
    const target = {
      x: clamp(aimTarget.position.x, game.arenaInner.x + 24, game.arenaInner.x + game.arenaInner.w - 24),
      y: clamp(aimTarget.position.y, game.arenaInner.y + 24, game.arenaInner.y + game.arenaInner.h - 24)
    };
    const spawn = {
      x: self.position.x + Math.cos(angleTo(self.position, target)) * (self.radius + 14),
      y: self.position.y + Math.sin(angleTo(self.position, target)) * (self.radius + 14)
    };

    game.bombs.push(
      createThrownBomb(self, spawn, target, BALANCE.bomb.projectileSpeed, {
        radius: BALANCE.bomb.explosionRadius + self.runModifiers.bombRadiusBonus,
        damage: BALANCE.bomb.explosionDamage,
        fuseTime: getFuseTime(BALANCE.bomb.bombFuseTime, self.runModifiers.bombFuseTimeBonus),
        directHitDamage: BALANCE.bomb.directHitDamage
      })
    );
    self.stats.bombsPlaced += 1;
  },

  specialAbility({ game, self, enemy }: FighterClassContext): void {
    const activationId = `${self.id}-${Math.floor(game.time * 1000)}-${Math.random().toString(16).slice(2)}`;
    const aimTarget = game.getTargetPointFor(self, enemy, 0.22);
    const predicted = {
      x: clamp(aimTarget.position.x, game.arenaInner.x + 48, game.arenaInner.x + game.arenaInner.w - 48),
      y: clamp(aimTarget.position.y, game.arenaInner.y + 48, game.arenaInner.y + game.arenaInner.h - 48)
    };
    const baseAngle = angleTo(self.position, enemy.position);

    for (let i = 0; i < BALANCE.bomb.chainBombCount; i += 1) {
      const spread = i === 0 ? { x: 0, y: 0 } : randomBombOffset(64 + i * 16);
      const lineOffset = {
        x: Math.cos(baseAngle) * (i - 1) * 42,
        y: Math.sin(baseAngle) * (i - 1) * 42
      };
      const position = {
        x: clamp(predicted.x + spread.x + lineOffset.x, game.arenaInner.x + 28, game.arenaInner.x + game.arenaInner.w - 28),
        y: clamp(predicted.y + spread.y + lineOffset.y, game.arenaInner.y + 28, game.arenaInner.y + game.arenaInner.h - 28)
      };
      game.bombs.push(
        new Bomb({
          owner: self,
          position,
          type: "chain",
          radius: BALANCE.bomb.chainBombRadius + self.runModifiers.chainRadiusBonus + self.runModifiers.bombRadiusBonus,
          damage: BALANCE.bomb.chainBombDamage * self.runModifiers.chainDamageMultiplier,
          fuseTime: Math.max(0.18, i * BALANCE.bomb.chainDelay),
          chainActivationId: activationId,
          chainIndex: i
        })
      );
      self.stats.bombsPlaced += 1;
    }

    game.spawnAbilityText("CHAIN DETONATION", this.secondaryColor, self.position);
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * 2.4);
    ctx.strokeStyle = this.secondaryColor;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      const angle = i * (TAU / 3);
      const x = Math.cos(angle) * (fighter.radius + 16);
      const y = Math.sin(angle) * (fighter.radius + 16);
      ctx.fillStyle = "#2b2b30";
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffcf70";
      ctx.beginPath();
      ctx.arc(x + Math.cos(time * 8 + i) * 4, y - 6, 3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.shadowColor = this.secondaryColor;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "rgba(255, 138, 49, 0.48)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i += 1) {
      const angle = time * 1.8 + i * (TAU / 4);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * (fighter.radius * 0.45), Math.sin(angle) * (fighter.radius * 0.45));
      ctx.lineTo(Math.cos(angle) * (fighter.radius + 12), Math.sin(angle) * (fighter.radius + 12));
      ctx.stroke();
    }

    const speedAngle = angleTo({ x: 0, y: 0 }, fighter.velocity);
    ctx.rotate(speedAngle + Math.PI);
    const gradient = ctx.createLinearGradient(0, 0, 72, 0);
    gradient.addColorStop(0, "rgba(255, 138, 49, 0.34)");
    gradient.addColorStop(1, "rgba(255, 72, 31, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(fighter.radius * 0.72, 0, 68, 14, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
};

function getFuseTime(baseFuse: number, bonus: number): number {
  return Math.max(0.35, baseFuse + bonus);
}
