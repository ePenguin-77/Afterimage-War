import { Projectile } from "../entities/Projectile";
import { BALANCE } from "../tuning";
import type { DamageContext, FighterClass, FighterClassContext } from "./FighterClass";
import { TAU, angleTo, fromAngle, randomRange } from "../utils/math";

const ORBIT_SHARDS = "magnetOrbitShards";
const SHARD_REGEN_TIMER = "magnetShardRegenTimer";
const STORM_TIMER = "magnetStormTimer";
const STORM_SHOT_TIMER = "magnetStormShotTimer";

export const MagnetClass: FighterClass = {
  id: "magnet",
  displayName: "Magnet Ball",
  primaryColor: "#6f7f88",
  secondaryColor: "#5ff6ff",
  outlineColor: "#1d2b31",
  role: "control",
  roleLabel: "Projectile Control / Orbit Defense",
  shortDescription: "Blocks projectiles with orbiting metal shards and fires a storm of metal fragments.",
  baseHP: BALANCE.magnet.hp,
  baseMoveSpeed: BALANCE.magnet.targetMoveSpeed,
  targetMoveSpeed: BALANCE.magnet.targetMoveSpeed,
  mass: BALANCE.magnet.mass,
  restitution: BALANCE.magnet.restitution,
  minSpeed: BALANCE.magnet.minSpeed,
  maxSpeed: BALANCE.magnet.maxSpeed,
  baseDamage: BALANCE.magnet.projectileDamage,
  scalingStatName: "Shards",
  abilityName: "MAGNETIC STORM",
  abilityDescription: "Creates orbiting metal shards that block projectiles and fire back in a storm.",
  abilityChargeRate: BALANCE.magnet.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    return `${getOrbitShards(fighter)}/${getMaxOrbitShards(fighter)}`;
  },

  updatePassiveScaling({ self, dt, game }: FighterClassContext): void {
    initializeOrbitShards(self);

    const stormTimer = Math.max(0, Number(self.customState[STORM_TIMER] ?? 0) - dt);
    self.customState[STORM_TIMER] = stormTimer;
    if (stormTimer <= 0 && getOrbitShards(self) > getMaxOrbitShards(self)) {
      self.customState[ORBIT_SHARDS] = getMaxOrbitShards(self);
    }

    const currentShards = getOrbitShards(self);
    if (currentShards < getMaxOrbitShards(self)) {
      const regenTimer = Math.max(0, Number(self.customState[SHARD_REGEN_TIMER] ?? getShardRegenInterval(self)) - dt);
      if (regenTimer <= 0) {
        self.customState[ORBIT_SHARDS] = currentShards + 1;
        self.customState[SHARD_REGEN_TIMER] = getShardRegenInterval(self);
        self.stats.orbitShardsRegenerated += 1;
        game.spawnMagnetSpark(self.position, this.secondaryColor);
      } else {
        self.customState[SHARD_REGEN_TIMER] = regenTimer;
      }
    } else {
      self.customState[SHARD_REGEN_TIMER] = getShardRegenInterval(self);
    }

    self.scalingValue = getOrbitShards(self);
  },

  updateAI(context: FighterClassContext): void {
    const { self, enemy, dt, game } = context;
    const stormTimer = Number(self.customState[STORM_TIMER] ?? 0);

    if (self.attackCooldown <= 0 && self.distanceTo(enemy) < 570) {
      this.basicAttack(context);
      self.attackCooldown = BALANCE.magnet.attackInterval * self.runModifiers.attackIntervalMultiplier;
    }

    if (stormTimer > 0) {
      const shotTimer = Number(self.customState[STORM_SHOT_TIMER] ?? 0) - dt;
      if (shotTimer <= 0) {
        fireMagnetShard(context, BALANCE.magnet.stormShotDamage, BALANCE.magnet.stormProjectileSpeed, "stormShard");
        self.customState[STORM_SHOT_TIMER] = BALANCE.magnet.stormShotInterval;
      } else {
        self.customState[STORM_SHOT_TIMER] = shotTimer;
      }
    }

    if (Math.random() < dt * (stormTimer > 0 ? 7 : 2.4)) {
      game.spawnMagnetSpark(self.position, this.secondaryColor);
    }
  },

  onDamageDealt({ self, amount, kind }: DamageContext): void {
    if (kind === "ability") {
      self.stats.stormShardHits += 1;
      self.stats.stormDamage += amount;
    }
  },

  basicAttack(context: FighterClassContext): void {
    fireMagnetShard(context, BALANCE.magnet.projectileDamage, BALANCE.magnet.projectileSpeed, "metalShard");
  },

  specialAbility({ game, self }: FighterClassContext): void {
    initializeOrbitShards(self);
    self.customState[STORM_TIMER] =
      (BALANCE.magnet.stormDuration + self.runModifiers.magnetStormDurationBonus) * self.runModifiers.abilityDurationMultiplier;
    self.customState[STORM_SHOT_TIMER] = 0;
    self.customState[ORBIT_SHARDS] = getMaxOrbitShards(self);
    self.stats.magneticStormUses += 1;
    game.spawnAbilityText("MAGNETIC STORM", this.secondaryColor, self.position);
    for (let i = 0; i < 12; i += 1) {
      game.spawnMagnetSpark(self.position, this.secondaryColor);
    }
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    initializeOrbitShards(fighter);
    const shards = getOrbitShards(fighter);
    const max = Math.max(1, getMaxOrbitShards(fighter));
    const storm = Number(fighter.customState[STORM_TIMER] ?? 0) > 0;

    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.strokeStyle = storm ? "rgba(95,246,255,0.9)" : "rgba(95,246,255,0.48)";
    ctx.lineWidth = storm ? 4 : 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, fighter.radius + 19, fighter.radius + 9, time * 0.9, 0, TAU);
    ctx.stroke();

    for (let i = 0; i < shards; i += 1) {
      const angle = time * (storm ? 5.4 : 2.6) + (i / max) * TAU;
      const r = fighter.radius + 18 + (storm ? 9 : 0);
      ctx.save();
      ctx.translate(Math.cos(angle) * r, Math.sin(angle) * r);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = i % 2 === 0 ? "#d7f9ff" : "#a8b4ba";
      ctx.strokeStyle = "#1d2b31";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(6, 4);
      ctx.lineTo(0, 9);
      ctx.lineTo(-6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const storm = Number(fighter.customState[STORM_TIMER] ?? 0) > 0;
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.shadowColor = this.secondaryColor;
    ctx.shadowBlur = storm ? 18 : 10;
    ctx.strokeStyle = storm ? "rgba(95,246,255,0.62)" : "rgba(95,246,255,0.34)";
    ctx.lineWidth = storm ? 4 : 3;
    for (let i = 0; i < (storm ? 3 : 2); i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 9 + i * 9, time * 1.4 + i, time * 1.4 + i + TAU * 0.52);
      ctx.stroke();
    }

    const speedAngle = angleTo({ x: 0, y: 0 }, fighter.velocity);
    ctx.rotate(speedAngle + Math.PI);
    const trail = ctx.createLinearGradient(0, 0, 78, 0);
    trail.addColorStop(0, storm ? "rgba(95,246,255,0.42)" : "rgba(95,246,255,0.26)");
    trail.addColorStop(1, "rgba(111,127,136,0)");
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.ellipse(fighter.radius * 0.72, 0, storm ? 82 : 64, storm ? 17 : 12, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
};

function fireMagnetShard(
  { game, self, enemy }: FighterClassContext,
  damage: number,
  speed: number,
  kind: "metalShard" | "stormShard"
): void {
  const target = game.getTargetPointFor(self, enemy, kind === "stormShard" ? 0.2 : 0.16);
  const angle = angleTo(self.position, target.position) + randomRange(-0.065, 0.065);
  const spawn = {
    x: self.position.x + Math.cos(angle) * (self.radius + 14),
    y: self.position.y + Math.sin(angle) * (self.radius + 14)
  };

  game.projectiles.push(
    new Projectile({
      owner: self,
      position: spawn,
      velocity: fromAngle(angle, speed),
      radius: kind === "stormShard" ? 11 : 12,
      damage,
      color: "#c5d2d8",
      secondaryColor: "#5ff6ff",
      life: 1.35,
      kind,
      damageKind: kind === "stormShard" ? "ability" : "projectile"
    })
  );
}

function initializeOrbitShards(fighter: { customState: Record<string, number | boolean | string> }): void {
  if (fighter.customState[ORBIT_SHARDS] === undefined) {
    fighter.customState[ORBIT_SHARDS] = BALANCE.magnet.startingOrbitShards;
  }
  if (fighter.customState[SHARD_REGEN_TIMER] === undefined) {
    fighter.customState[SHARD_REGEN_TIMER] = BALANCE.magnet.shardRegenInterval;
  }
}

export function getOrbitShards(fighter: { customState: Record<string, number | boolean | string> }): number {
  initializeOrbitShards(fighter);
  return Number(fighter.customState[ORBIT_SHARDS] ?? 0);
}

export function consumeOrbitShard(
  fighter: {
    customState: Record<string, number | boolean | string>;
    stats: { projectilesBlocked: number; orbitShardsConsumed: number };
    runModifiers: { magnetFirstBlockBarrier: boolean; magnetFirstBlockBarrierUsed: boolean };
  }
): boolean {
  const shards = getOrbitShards(fighter);
  if (shards <= 0) {
    return false;
  }

  fighter.customState[ORBIT_SHARDS] = shards - 1;
  fighter.stats.projectilesBlocked += 1;
  fighter.stats.orbitShardsConsumed += 1;
  if (fighter.runModifiers.magnetFirstBlockBarrier && !fighter.runModifiers.magnetFirstBlockBarrierUsed) {
    fighter.runModifiers.magnetFirstBlockBarrierUsed = true;
    fighter.customState.magnetBarrierReady = true;
  }
  return true;
}

function getMaxOrbitShards(
  fighter: { customState: Record<string, number | boolean | string>; runModifiers: { magnetMaxShardsBonus: number } }
): number {
  const stormBonus = Number(fighter.customState[STORM_TIMER] ?? 0) > 0 ? BALANCE.magnet.stormExtraShards : 0;
  return BALANCE.magnet.maxOrbitShards + fighter.runModifiers.magnetMaxShardsBonus + stormBonus;
}

function getShardRegenInterval(fighter: { runModifiers: { magnetShardRegenIntervalBonus: number } }): number {
  return Math.max(1.8, BALANCE.magnet.shardRegenInterval + fighter.runModifiers.magnetShardRegenIntervalBonus);
}
