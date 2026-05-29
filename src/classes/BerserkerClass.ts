import { BALANCE } from "../tuning";
import type { ContactDamageContext, DamageContext, FighterClass, FighterClassContext } from "./FighterClass";
import { TAU, clamp, safeNormalize } from "../utils/math";

export const BerserkerClass: FighterClass = {
  id: "berserker",
  displayName: "Berserker Ball",
  primaryColor: "#b62822",
  secondaryColor: "#ff7a1f",
  outlineColor: "#180809",
  role: "melee",
  roleLabel: "Low HP Rage / Melee Bruiser",
  shortDescription: "Gains damage and ability charge as HP gets lower.",
  baseHP: BALANCE.berserker.hp,
  baseMoveSpeed: BALANCE.berserker.targetMoveSpeed,
  targetMoveSpeed: BALANCE.berserker.targetMoveSpeed,
  mass: BALANCE.berserker.mass,
  restitution: BALANCE.berserker.restitution,
  minSpeed: BALANCE.berserker.minSpeed,
  maxSpeed: BALANCE.berserker.maxSpeed,
  contactDamage: BALANCE.berserker.contactDamage,
  contactDamageCooldown: BALANCE.berserker.contactDamageCooldown,
  baseDamage: BALANCE.berserker.contactDamage,
  scalingStatName: "Rage",
  abilityName: "RAGE BREAK",
  abilityDescription: "Enters a rage state that increases contact damage and ability charge based on missing HP.",
  abilityChargeRate: BALANCE.berserker.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    return `${Math.round(getRagePercent(fighter) * 100)}%`;
  },

  updatePassiveScaling({ self }: FighterClassContext): void {
    self.customState.rageBreakTimer = Math.max(0, Number(self.customState.rageBreakTimer ?? 0));
    self.scalingValue = getRagePercent(self);
    updateRageStats(self);
    applyRageSpeed(self);
  },

  updateAI({ game, self, dt }: FighterClassContext): void {
    self.customState.rageBreakTimer = Math.max(0, Number(self.customState.rageBreakTimer ?? 0) - dt);
    const rage = getRagePercent(self);
    const bonusCharge = getRageAbilityChargeBonus(self, rage);
    if (!game.physicsTestMode && bonusCharge > 0) {
      self.ability.fill(
        dt *
          BALANCE.berserker.abilityMeterGainRate *
          bonusCharge *
          self.runModifiers.abilityChargeMultiplier *
          game.intensityMultiplier
      );
    }

    if (!game.isFastSimulation && Math.random() < dt * (2 + rage * 7 + (isRageBreakActive(self) ? 5 : 0))) {
      game.spawnSpikeSpark(self.position, rage > 0.5 || isRageBreakActive(self) ? this.secondaryColor : this.primaryColor);
    }
  },

  getContactDamage({ self, baseDamage }: ContactDamageContext) {
    const rage = getRagePercent(self);
    const rageBonus = getRageContactBonus(self, rage);
    const lastStandBonus = self.hp <= BALANCE.berserker.lastStandThreshold ? BALANCE.berserker.lastStandContactBonus : 0;
    const lowHpMultiplier = self.hp <= 50 ? self.runModifiers.berserkerLowHpContactMultiplier : 1;
    const multiplier =
      (1 + rageBonus + lastStandBonus) * lowHpMultiplier * (isRageBreakActive(self) ? BALANCE.berserker.rageBreakContactMultiplier : 1);
    const damage = baseDamage * multiplier;
    return {
      damage,
      bonusDamage: Math.max(0, damage - baseDamage),
      highImpact: rage >= 0.5 || isRageBreakActive(self)
    };
  },

  getContactCooldown({ self }: FighterClassContext): number {
    const baseCooldown = BALANCE.berserker.contactDamageCooldown * self.runModifiers.berserkerContactCooldownMultiplier;
    return isRageBreakActive(self) ? baseCooldown * BALANCE.berserker.rageBreakContactCooldownMultiplier : baseCooldown;
  },

  modifyIncomingDamage({ self, amount, kind }: DamageContext): number {
    let nextAmount = amount;
    if (kind === "projectile") {
      if (self.hp <= BALANCE.berserker.lastStandThreshold) {
        nextAmount *= 1 - BALANCE.berserker.lastStandProjectileReduction;
      } else if (self.hp <= BALANCE.berserker.lowHpGuardThreshold) {
        nextAmount *= 1 - BALANCE.berserker.lowHpProjectileReduction;
      }
    }
    if (isRageBreakActive(self)) {
      nextAmount *= BALANCE.berserker.rageBreakDamageTakenMultiplier;
    }
    return nextAmount;
  },

  onDamageTaken({ game, self, amount }: DamageContext): void {
    if (amount <= 0 || self.customState.bloodRushUsed) {
      return;
    }
    const hpBefore = self.hp + amount;
    if (hpBefore > BALANCE.berserker.bloodRushThreshold && self.hp <= BALANCE.berserker.bloodRushThreshold && !self.defeated) {
      self.customState.bloodRushUsed = true;
      self.ability.fill(BALANCE.berserker.bloodRushMeterGain + self.runModifiers.berserkerBloodRushMeterBonus);
      self.stats.bloodRushTriggers += 1;
      game.spawnAbilityText("BLOOD RUSH", this.secondaryColor, self.position);
    }
  },

  basicAttack(): void {
    // Berserker Ball fights through fighter collisions instead of ranged shots.
  },

  specialAbility({ game, self }: FighterClassContext): void {
    const duration =
      (BALANCE.berserker.rageBreakDuration + self.runModifiers.berserkerRageBreakDurationBonus) *
      self.runModifiers.abilityDurationMultiplier;
    self.customState.rageBreakTimer = duration;
    self.stats.rageBreakUses += 1;
    game.spawnAbilityText("RAGE BREAK", this.secondaryColor, self.position);
    for (let i = 0; i < 12; i += 1) {
      game.spawnSpikeSpark(self.position, i % 2 === 0 ? this.secondaryColor : "#1c0d10");
    }
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    const rage = getRagePercent(fighter);
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * (1.1 + rage));
    ctx.strokeStyle = this.outlineColor;
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i += 1) {
      const angle = i * (TAU / 6) + 0.18;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 8, Math.sin(angle) * 8);
      ctx.lineTo(Math.cos(angle + 0.22) * (fighter.radius - 5), Math.sin(angle + 0.22) * (fighter.radius - 5));
      ctx.stroke();
    }
    ctx.strokeStyle = rage > 0.45 ? "#ffb35f" : this.secondaryColor;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const angle = i * (TAU / 3) + time * 0.4;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * 9, Math.sin(angle) * 9, fighter.radius * (0.25 + rage * 0.08), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const rage = getRagePercent(fighter);
    const active = isRageBreakActive(fighter);
    if (rage <= 0.05 && !active) {
      return;
    }

    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    const pulse = Math.sin(time * (7 + rage * 5)) * (2 + rage * 4);
    ctx.strokeStyle = active ? "rgba(255, 122, 31, 0.82)" : `rgba(182, 40, 34, ${0.24 + rage * 0.42})`;
    ctx.lineWidth = active ? 5 : 3 + rage * 2;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 8 + rage * 12 + pulse, 0, TAU);
    ctx.stroke();

    if (rage >= 0.4 || active) {
      ctx.strokeStyle = "rgba(255, 179, 95, 0.48)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i += 1) {
        const angle = time * (1.4 + i * 0.2) + i * (TAU / 3);
        ctx.beginPath();
        ctx.arc(0, 0, fighter.radius + 18 + i * 5, angle, angle + 0.55 + rage * 0.4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
};

function getRagePercent(fighter: { hp: number; maxHP: number }): number {
  return clamp((fighter.maxHP - fighter.hp) / Math.max(1, fighter.maxHP), 0, 1);
}

function getRageContactBonus(
  fighter: { runModifiers: { berserkerMaxRageContactBonus: number } },
  rage = 0
): number {
  return rage * (BALANCE.berserker.maxRageContactBonus + fighter.runModifiers.berserkerMaxRageContactBonus);
}

function getRageAbilityChargeBonus(
  fighter: { runModifiers: { berserkerRageAbilityChargeBonus: number } },
  rage = 0
): number {
  return rage * (BALANCE.berserker.maxRageAbilityChargeBonus + fighter.runModifiers.berserkerRageAbilityChargeBonus);
}

function getRageMoveSpeedBonus(rage: number): number {
  return rage * BALANCE.berserker.maxRageMoveSpeedBonus;
}

function isRageBreakActive(fighter: { customState: Record<string, number | boolean | string> }): boolean {
  return Number(fighter.customState.rageBreakTimer ?? 0) > 0;
}

function updateRageStats(fighter: {
  customState: Record<string, number | boolean | string>;
  stats: { rageAveragePercent: number; maxRageReached: number };
  hp: number;
  maxHP: number;
}): void {
  const rage = getRagePercent(fighter);
  const samples = Number(fighter.customState.rageSamples ?? 0) + 1;
  fighter.customState.rageSamples = samples;
  fighter.stats.rageAveragePercent += (rage - fighter.stats.rageAveragePercent) / samples;
  fighter.stats.maxRageReached = Math.max(fighter.stats.maxRageReached, rage);
}

function applyRageSpeed(fighter: {
  velocity: { x: number; y: number };
  targetMoveSpeed: number;
  minSpeed: number;
  maxSpeed: number;
  hp: number;
  maxHP: number;
  setVelocity(velocity: { x: number; y: number }, reason: "status-speed-only"): void;
}): void {
  const rage = getRagePercent(fighter);
  const targetSpeed = clamp(fighter.targetMoveSpeed * (1 + getRageMoveSpeedBonus(rage)), fighter.minSpeed, fighter.maxSpeed);
  const currentSpeed = Math.hypot(fighter.velocity.x, fighter.velocity.y);
  if (Math.abs(currentSpeed - targetSpeed) < 1.5) {
    return;
  }
  const direction = safeNormalize(fighter.velocity, { x: 1, y: 0 });
  fighter.setVelocity({ x: direction.x * targetSpeed, y: direction.y * targetSpeed }, "status-speed-only");
}
