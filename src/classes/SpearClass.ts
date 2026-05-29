import { BALANCE } from "../tuning";
import type { Fighter } from "../entities/Fighter";
import type { DamageContext, FighterClass, FighterClassContext, WallBounceContext } from "./FighterClass";
import { TAU, clamp, distance, dot, safeNormalize, type Vec2 } from "../utils/math";

export const SpearClass: FighterClass = {
  id: "spear",
  displayName: "Spear Ball",
  primaryColor: "#c8d6df",
  secondaryColor: "#36d7ff",
  outlineColor: "#071323",
  role: "melee",
  roleLabel: "Mid-range Pierce",
  shortDescription: "Strikes enemies at mid-range with piercing thrusts.",
  baseHP: BALANCE.spear.hp,
  baseMoveSpeed: BALANCE.spear.targetMoveSpeed,
  targetMoveSpeed: BALANCE.spear.targetMoveSpeed,
  mass: BALANCE.spear.mass,
  restitution: BALANCE.spear.restitution,
  minSpeed: BALANCE.spear.minSpeed,
  maxSpeed: BALANCE.spear.maxSpeed,
  baseDamage: BALANCE.spear.thrustDamage,
  scalingStatName: "Reach",
  abilityName: "SPEAR RUSH",
  abilityDescription: "Extends a piercing spear forward, striking enemies in a narrow mid-range line.",
  abilityChargeRate: BALANCE.spear.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    if (isSpearRushActive(fighter)) {
      return "Rush";
    }
    if (Number(fighter.customState.spearLanceReadyTimer ?? 0) > 0) {
      return "Lance";
    }
    return `${Math.round(getSpearRange(fighter, false))}`;
  },

  updatePassiveScaling({ self, dt }: FighterClassContext): void {
    tickSpearTimers(self, dt);
    if (isGuardedStanceActive(self)) {
      self.stats.guardedStanceUptime += dt;
      self.ability.fill(
        dt *
          BALANCE.spear.abilityMeterGainRate *
          BALANCE.spear.guardedStanceAbilityChargeBonus *
          self.runModifiers.abilityChargeMultiplier
      );
    }
    self.scalingValue = isSpearRushActive(self) ? 1 : 0;
  },

  updateAI(context: FighterClassContext): void {
    const { game, self, dt } = context;
    if (self.attackCooldown <= 0) {
      const used = performSpearThrust(context);
      if (used) {
        self.attackCooldown = getSpearCooldown(self);
      }
    }

    if (!game.isFastSimulation && Math.random() < dt * (isSpearRushActive(self) ? 5.5 : 1.5)) {
      game.spawnCrusherSpark(self.position, isSpearRushActive(self) ? this.secondaryColor : "#e9f4ff");
    }
  },

  modifyIncomingDamage({ self, amount, kind }: DamageContext): number {
    if (kind === "projectile" && isGuardedStanceActive(self)) {
      return amount * (1 - BALANCE.spear.guardedStanceProjectileReduction);
    }
    return amount;
  },

  onDamageTaken({ self, amount, kind }: DamageContext): void {
    if (amount > 0 && (kind === "contact" || kind === "dash" || kind === "collision")) {
      self.customState.spearGuardBreakTimer = BALANCE.spear.guardedStanceBreakDuration;
    }
  },

  onWallBounce({ self, game }: WallBounceContext): void {
    self.customState.spearLanceReadyTimer = BALANCE.spear.lanceReadyDuration;
    self.stats.lanceReadyTriggers += 1;
    if (!game.isFastSimulation) {
      game.spawnAbilityText("LANCE READY", this.secondaryColor, self.position);
    }
  },

  basicAttack(context: FighterClassContext): void {
    performSpearThrust(context);
  },

  specialAbility({ game, self }: FighterClassContext): void {
    const duration =
      (BALANCE.spear.spearRushDuration + self.runModifiers.spearRushDurationBonus) *
      self.runModifiers.abilityDurationMultiplier;
    self.customState.spearRushTimer = duration;
    self.attackCooldown = 0;
    self.stats.spearRushUses += 1;
    game.spawnAbilityText("SPEAR RUSH", this.secondaryColor, self.position);
    if (!game.isFastSimulation) {
      for (let i = 0; i < 10; i += 1) {
        game.spawnCrusherSpark(self.position, i % 2 === 0 ? this.secondaryColor : "#f2c96d");
      }
    }
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    const active = isSpearRushActive(fighter);
    const lanceReady = Number(fighter.customState.spearLanceReadyTimer ?? 0) > 0;
    const thrustTimer = Number(fighter.customState.spearThrustVisualTimer ?? 0);
    const facing = safeNormalize(fighter.velocity, { x: 1, y: 0 });
    if (thrustTimer > 0) {
      const dir = {
        x: Number(fighter.customState.spearThrustDirX ?? 1),
        y: Number(fighter.customState.spearThrustDirY ?? 0)
      };
      const range = Number(fighter.customState.spearThrustVisualRange ?? BALANCE.spear.thrustRange);
      const duration = Number(fighter.customState.spearThrustVisualDuration ?? 0.28);
      const hit = Boolean(fighter.customState.spearThrustVisualHit);
      const visualRush = Boolean(fighter.customState.spearThrustVisualRush);
      drawSpearThrust(ctx, fighter.position, dir, range, thrustTimer, duration, visualRush, hit, fighter.radius, this.outlineColor);
      return;
    }

    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(Math.atan2(facing.y, facing.x));

    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(7, 19, 35, 0.9)";
    ctx.fillStyle = active ? "#36d7ff" : lanceReady ? "#f2c96d" : "#e8f4fa";
    ctx.lineWidth = 2.5;
    const start = fighter.radius - 4;
    const shaftEnd = fighter.radius + (active ? 27 : 21);
    const tipEnd = fighter.radius + (active ? 43 : 34);
    ctx.beginPath();
    ctx.roundRect(start, -2.5, shaftEnd - start, 5, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = active ? "#f6fbff" : "#d9e7ef";
    ctx.beginPath();
    ctx.moveTo(tipEnd, 0);
    ctx.lineTo(shaftEnd - 2, -8);
    ctx.lineTo(shaftEnd - 2, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = lanceReady ? "#f2c96d" : "#36d7ff";
    ctx.beginPath();
    ctx.moveTo(shaftEnd - 6, -2);
    ctx.lineTo(shaftEnd - 18, -10);
    ctx.lineTo(shaftEnd - 12, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(shaftEnd - 6, 2);
    ctx.lineTo(shaftEnd - 18, 10);
    ctx.lineTo(shaftEnd - 12, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.strokeStyle = "rgba(54, 215, 255, 0.42)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 12, time, time + TAU * 0.42);
    ctx.stroke();
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const active = isSpearRushActive(fighter);
    const lanceReady = Number(fighter.customState.spearLanceReadyTimer ?? 0) > 0;

    if (!active && !lanceReady) {
      return;
    }
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.strokeStyle = active ? "rgba(54, 215, 255, 0.64)" : "rgba(242, 201, 109, 0.46)";
    ctx.lineWidth = active ? 5 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 13 + Math.sin(time * 8) * 2, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
};

function tickSpearTimers(fighter: Fighter, dt: number): void {
  fighter.customState.spearRushTimer = Math.max(0, Number(fighter.customState.spearRushTimer ?? 0) - dt);
  fighter.customState.spearLanceReadyTimer = Math.max(0, Number(fighter.customState.spearLanceReadyTimer ?? 0) - dt);
  fighter.customState.spearThrustVisualTimer = Math.max(0, Number(fighter.customState.spearThrustVisualTimer ?? 0) - dt);
  fighter.customState.spearGuardBreakTimer = Math.max(0, Number(fighter.customState.spearGuardBreakTimer ?? 0) - dt);
}

function performSpearThrust({ game, self, enemy }: FighterClassContext): boolean {
  const target = game.getNearestEnemy(self) ?? enemy;
  if (!target || target.defeated) {
    return false;
  }

  const active = isSpearRushActive(self);
  const range = getSpearRange(self, active);
  const lanceReady = Number(self.customState.spearLanceReadyTimer ?? 0) > 0;
  const targetPoint = game.getTargetPointFor(self, target, 0.12 + self.runModifiers.predictiveLeadBonus);
  const direction = safeNormalize(
    { x: targetPoint.position.x - self.position.x, y: targetPoint.position.y - self.position.y },
    self.velocity
  );
  const candidateTargets = active ? game.getEnemies(self) : [target];
  const targets = candidateTargets.filter((candidate) => lineHitsCircle(self.position, direction, range, getSpearWidth(active) / 2, candidate));

  self.stats.spearThrustUses += 1;
  const visualDuration = active ? 0.68 : 0.56;
  self.customState.spearThrustVisualTimer = visualDuration;
  self.customState.spearThrustVisualDuration = visualDuration;
  self.customState.spearThrustDirX = direction.x;
  self.customState.spearThrustDirY = direction.y;
  self.customState.spearThrustVisualRange = range;
  self.customState.spearThrustVisualHit = targets.length > 0;
  self.customState.spearThrustVisualRush = active;
  if (lanceReady) {
    self.customState.spearLanceReadyTimer = 0;
  }

  if (targets.length === 0) {
    return true;
  }

  for (const hitTarget of targets) {
    const idealRange = isIdealSpearRange(self, hitTarget, range);
    let damage = active ? BALANCE.spear.spearRushDamage : BALANCE.spear.thrustDamage;
    damage *= self.runModifiers.spearThrustDamageMultiplier;
    if (idealRange) {
      damage *= 1 + (BALANCE.spear.idealRangeDamageMultiplier - 1 + self.runModifiers.spearIdealRangeBonus);
      self.stats.idealRangeHits += 1;
    }
    const sweetSpot = isSpearSweetSpot(self, hitTarget, range);
    if (sweetSpot) {
      damage *= BALANCE.spear.sweetSpotDamageMultiplier;
      self.stats.sweetSpotHits += 1;
    }
    if (lanceReady) {
      damage *= BALANCE.spear.lanceReadyDamageMultiplier;
    }

    const beforeHp = hitTarget.hp;
    hitTarget.takeDamage(damage, self, game, {
      knockback: 0,
      hitColor: active ? "#36d7ff" : "#f2c96d",
      ignoreCooldown: true,
      damageKind: active ? "ability" : "contact"
    });
    const dealt = Math.max(0, beforeHp - hitTarget.hp);
    if (dealt > 0) {
      self.stats.spearThrustHits += 1;
      self.stats.spearThrustDamage += dealt;
      if (active) {
        self.stats.spearRushHits += 1;
      }
      if (!game.isFastSimulation) {
        game.spawnCrusherSpark(hitTarget.position, active ? "#36d7ff" : "#f2c96d");
        if (active || idealRange) {
          game.spawnAbilityText(active ? "PIERCE" : "THRUST", active ? "#36d7ff" : "#f2c96d", hitTarget.position);
        }
      }
    }
  }

  return true;
}

function getSpearRange(fighter: Fighter, active: boolean): number {
  const baseRange = active ? BALANCE.spear.spearRushRange : BALANCE.spear.thrustRange;
  const lanceBonus =
    Number(fighter.customState.spearLanceReadyTimer ?? 0) > 0
      ? BALANCE.spear.lanceReadyRangeBonus + fighter.runModifiers.spearLanceReadyRangeBonus
      : 0;
  return baseRange + lanceBonus + fighter.runModifiers.spearThrustRangeBonus;
}

function getSpearCooldown(fighter: Fighter): number {
  const baseCooldown = isSpearRushActive(fighter) ? BALANCE.spear.spearRushCooldown : BALANCE.spear.thrustCooldown;
  return Math.max(0.35, (baseCooldown - fighter.runModifiers.spearThrustCooldownReduction) * fighter.runModifiers.attackIntervalMultiplier);
}

function getSpearWidth(active: boolean): number {
  return active ? BALANCE.spear.spearRushWidth : BALANCE.spear.thrustWidth;
}

function isIdealSpearRange(self: Fighter, target: Fighter, range: number): boolean {
  const bodyContactDistance = self.radius + target.radius;
  const targetDistance = distance(self.position, target.position);
  return targetDistance > bodyContactDistance + 8 && targetDistance <= range + target.radius;
}

function isSpearSweetSpot(self: Fighter, target: Fighter, range: number): boolean {
  const targetDistance = distance(self.position, target.position);
  return targetDistance >= range * BALANCE.spear.sweetSpotStartRatio && targetDistance <= range + target.radius;
}

function lineHitsCircle(origin: Vec2, direction: Vec2, range: number, halfWidth: number, target: Fighter): boolean {
  const toTarget = { x: target.position.x - origin.x, y: target.position.y - origin.y };
  const along = dot(toTarget, direction);
  if (along < 0 || along > range + target.radius) {
    return false;
  }
  const closest = {
    x: origin.x + direction.x * clamp(along, 0, range),
    y: origin.y + direction.y * clamp(along, 0, range)
  };
  return distance(closest, target.position) <= target.radius + halfWidth;
}

function isGuardedStanceActive(fighter: Fighter): boolean {
  return Number(fighter.customState.spearGuardBreakTimer ?? 0) <= 0;
}

function drawSpearThrust(
  ctx: CanvasRenderingContext2D,
  origin: Vec2,
  direction: Vec2,
  range: number,
  timer: number,
  duration: number,
  active: boolean,
  hit: boolean,
  fighterRadius: number,
  outlineColor: string
): void {
  const age = clamp(duration - timer, 0, duration);
  const t = clamp(age / Math.max(0.001, duration), 0, 1);
  const extend =
    t < 0.22
      ? 0.38 + easeOutCubic(t / 0.22) * 0.1
      : t < 0.62
        ? 0.48 + easeOutCubic((t - 0.22) / 0.4) * 0.52
        : 1;
  const fade = t < 0.68 ? 1 : clamp(1 - (t - 0.68) / 0.32, 0, 1);
  const alpha = clamp((0.38 + t * 1.4) * fade, 0, 1);
  const angle = Math.atan2(direction.y, direction.x);
  const length = Math.max(fighterRadius + 36, range * extend);
  const tipLength = active ? 31 : 23;
  const shaftHalf = active ? 5.6 : 4.2;
  const tipHalf = active ? 17 : 12;
  const startX = Math.max(8, fighterRadius * 0.35);
  const tipBase = Math.max(startX + 24, length - tipLength);
  const primary = active ? "#36d7ff" : "#f2c96d";
  const metal = active ? "#f4fbff" : "#dfeaf1";
  const bronze = active ? "#bdefff" : "#c88f3e";

  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;

  const glow = ctx.createLinearGradient(startX, 0, length, 0);
  glow.addColorStop(0, active ? "rgba(54, 215, 255, 0)" : "rgba(242, 201, 109, 0)");
  glow.addColorStop(0.52, active ? "rgba(54, 215, 255, 0.28)" : "rgba(242, 201, 109, 0.22)");
  glow.addColorStop(1, active ? "rgba(255, 255, 255, 0.48)" : "rgba(255, 248, 221, 0.38)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  const glowHalf = active ? BALANCE.spear.spearRushWidth * 0.45 : BALANCE.spear.thrustWidth * 0.45;
  ctx.moveTo(startX, -glowHalf);
  ctx.lineTo(tipBase + 8, -glowHalf * 1.18);
  ctx.lineTo(length + 6, 0);
  ctx.lineTo(tipBase + 8, glowHalf * 1.18);
  ctx.lineTo(startX, glowHalf);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = active ? 4 : 3;
  ctx.lineJoin = "round";
  ctx.fillStyle = bronze;
  ctx.beginPath();
  ctx.moveTo(startX, -shaftHalf);
  ctx.lineTo(tipBase + 2, -shaftHalf * 1.15);
  ctx.lineTo(tipBase + 2, shaftHalf * 1.15);
  ctx.lineTo(startX, shaftHalf);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.74)";
  ctx.beginPath();
  ctx.moveTo(startX + 7, -1.2);
  ctx.lineTo(tipBase - 5, -1.2);
  ctx.lineTo(tipBase - 5, 1.2);
  ctx.lineTo(startX + 7, 1.2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.moveTo(tipBase + 3, -3);
  ctx.lineTo(tipBase - (active ? 20 : 15), -(active ? 13 : 10));
  ctx.lineTo(tipBase - (active ? 12 : 9), -1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tipBase + 3, 3);
  ctx.lineTo(tipBase - (active ? 20 : 15), active ? 13 : 10);
  ctx.lineTo(tipBase - (active ? 12 : 9), 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.moveTo(length, 0);
  ctx.lineTo(tipBase, -tipHalf);
  ctx.lineTo(tipBase - (active ? 6 : 4), -4);
  ctx.lineTo(tipBase - (active ? 6 : 4), 4);
  ctx.lineTo(tipBase, tipHalf);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = active ? "rgba(54, 215, 255, 0.78)" : "rgba(255, 248, 220, 0.72)";
  ctx.lineWidth = active ? 2.4 : 1.8;
  ctx.beginPath();
  ctx.moveTo(tipBase + 4, 0);
  ctx.lineTo(length - 7, 0);
  ctx.stroke();

  if (active) {
    ctx.globalAlpha = alpha * 0.42;
    for (let i = 1; i <= 2; i += 1) {
      ctx.strokeStyle = i === 1 ? "rgba(54, 215, 255, 0.42)" : "rgba(242, 201, 109, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX - i * 16, -10 * i);
      ctx.lineTo(length - i * 24, -6 * i);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(startX - i * 16, 10 * i);
      ctx.lineTo(length - i * 24, 6 * i);
      ctx.stroke();
    }
  }

  if (hit && t < 0.74) {
    ctx.globalAlpha = alpha * clamp(1 - t / 0.74, 0, 1);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      const angleOffset = -0.95 + i * 0.38;
      const sparkLength = active ? 20 : 14;
      ctx.beginPath();
      ctx.moveTo(length - 3, 0);
      ctx.lineTo(length - 3 + Math.cos(angleOffset) * sparkLength, Math.sin(angleOffset) * sparkLength);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function easeOutCubic(value: number): number {
  const t = clamp(value, 0, 1);
  return 1 - (1 - t) ** 3;
}

function isSpearRushActive(fighter: { customState: Record<string, number | boolean | string> }): boolean {
  return Number(fighter.customState.spearRushTimer ?? 0) > 0;
}
