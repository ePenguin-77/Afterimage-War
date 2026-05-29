import { applyBleed, getBleedStacks } from "../combat/statusEffects";
import { BALANCE } from "../tuning";
import type { ContactDamageContext, DamageContext, FighterClass, FighterClassContext } from "./FighterClass";
import { TAU, clamp, safeNormalize } from "../utils/math";

export const FangClass: FighterClass = {
  id: "fang",
  displayName: "Fang Ball",
  primaryColor: "#4a241b",
  secondaryColor: "#f5e4c8",
  outlineColor: "#170907",
  role: "melee",
  roleLabel: "Bleed / Hunter Melee",
  shortDescription: "Applies Bleed through contact hits and deals bonus damage to bleeding enemies.",
  baseHP: BALANCE.fang.hp,
  baseMoveSpeed: BALANCE.fang.targetMoveSpeed,
  targetMoveSpeed: BALANCE.fang.targetMoveSpeed,
  mass: BALANCE.fang.mass,
  restitution: BALANCE.fang.restitution,
  minSpeed: BALANCE.fang.minSpeed,
  maxSpeed: BALANCE.fang.maxSpeed,
  contactDamage: BALANCE.fang.contactDamage,
  contactDamageCooldown: BALANCE.fang.contactDamageCooldown,
  baseDamage: BALANCE.fang.contactDamage,
  scalingStatName: "Bleed",
  abilityName: "RENDING HUNT",
  abilityDescription: "Empowers Fang Ball's next contacts, applying stronger Bleed and dealing bonus damage to bleeding targets.",
  abilityChargeRate: BALANCE.fang.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    return isRendingHuntActive(fighter) ? "Hunt" : `${Math.floor(Number(fighter.customState.fangTrackedBleedStacks ?? 0))}x`;
  },

  updatePassiveScaling({ game, self, enemy, dt }: FighterClassContext): void {
    self.customState.rendingHuntTimer = Math.max(0, Number(self.customState.rendingHuntTimer ?? 0) - dt);
    const bleedingTarget = getBestBleedingTarget(game, self, enemy);
    const bleedStacks = bleedingTarget ? getBleedStacks(bleedingTarget, self) : 0;
    self.customState.fangTrackedBleedStacks = bleedStacks;
    self.scalingValue = bleedStacks;

    const wasSpeedActive = Boolean(self.customState.fangBloodScentSpeedActive);
    if (bleedStacks > 0) {
      self.customState.fangBloodScentSpeedActive = true;
      applyBloodScentSpeed(self);
    } else if (wasSpeedActive) {
      self.customState.fangBloodScentSpeedActive = false;
      self.normalizeToTargetSpeed("status-speed-only");
    }
  },

  updateAI({ game, self, enemy, dt }: FighterClassContext): void {
    const bleedingTarget = getBestBleedingTarget(game, self, enemy);
    if (bleedingTarget) {
      self.ability.fill(
        dt *
          BALANCE.fang.abilityMeterGainRate *
          (BALANCE.fang.bloodScentAbilityChargeMultiplier - 1 + self.runModifiers.fangBloodScentChargeBonus) *
          self.runModifiers.abilityChargeMultiplier
      );
    }

    if (!game.isFastSimulation && Math.random() < dt * (isRendingHuntActive(self) ? 7 : bleedingTarget ? 4 : 1.6)) {
      game.spawnBleedSpark(self.position, isRendingHuntActive(self) ? "#ff3d4f" : "#c91f37");
    }
  },

  getContactDamage({ self, enemy, baseDamage }: ContactDamageContext) {
    const bleedStacks = getBleedStacks(enemy, self);
    const active = isRendingHuntActive(self);
    const bleedMultiplier =
      bleedStacks >= BALANCE.fang.maxBleedStacks
        ? BALANCE.fang.bloodScentMaxStackContactMultiplier
        : bleedStacks > 0
          ? BALANCE.fang.bloodScentContactMultiplier + self.runModifiers.fangBleedBonusDamage
          : 1;
    const huntBonus = active ? baseDamage * (BALANCE.fang.rendingHuntContactMultiplier - 1) : 0;
    const bleedBonus = baseDamage * (bleedMultiplier - 1);
    const finisherBonus =
      bleedStacks > 0 && enemy.hp <= BALANCE.fang.lowHpBleedFinisherThreshold ? BALANCE.fang.lowHpBleedFinisherBonusDamage : 0;
    return {
      damage: baseDamage + bleedBonus + huntBonus + finisherBonus,
      bonusDamage: bleedBonus + huntBonus + finisherBonus,
      highImpact: active || bleedStacks >= BALANCE.fang.maxBleedStacks || finisherBonus > 0
    };
  },

  onDamageDealt({ game, self, enemy, amount, kind }: DamageContext): void {
    if (kind !== "contact" || amount <= 0) {
      return;
    }

    const active = isRendingHuntActive(self);
    const stacks = active ? BALANCE.fang.rendingHuntBleedStacksApplied : 1;
    applyBleed(enemy, self, {
      damagePerSecond: BALANCE.fang.bleedDamagePerSecond * (active ? BALANCE.fang.rendingHuntBleedDamageMultiplier : 1),
      duration: BALANCE.fang.bleedDuration + self.runModifiers.bleedDurationBonus,
      stacks,
      maxStacks: BALANCE.fang.maxBleedStacks
    });
    game.spawnBleedSpark(enemy.position, active ? "#ff3d4f" : "#c91f37");
  },

  basicAttack(): void {
    // Fang Ball hunts through fighter collisions instead of ranged shots.
  },

  specialAbility({ game, self }: FighterClassContext): void {
    const duration =
      (BALANCE.fang.rendingHuntDuration + self.runModifiers.fangRendingHuntDurationBonus) *
      self.runModifiers.abilityDurationMultiplier;
    self.customState.rendingHuntTimer = duration;
    self.stats.rendingHuntUses += 1;
    game.spawnAbilityText("RENDING HUNT", "#ff3d4f", self.position);
    for (let i = 0; i < 12; i += 1) {
      game.spawnBleedSpark(self.position, i % 2 === 0 ? "#ff3d4f" : this.secondaryColor);
    }
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    const active = isRendingHuntActive(fighter);
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * (active ? 2.4 : 1.2));
    const count = 8;
    for (let i = 0; i < count; i += 1) {
      const angle = i * (TAU / count);
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = i % 2 === 0 ? this.secondaryColor : "#c91f37";
      ctx.strokeStyle = this.outlineColor;
      ctx.lineWidth = 2;
      const length = active ? 18 : 12;
      ctx.beginPath();
      ctx.moveTo(fighter.radius - 5, -5);
      ctx.lineTo(fighter.radius + length, 0);
      ctx.lineTo(fighter.radius - 5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = "#c91f37";
    for (let i = 0; i < 2; i += 1) {
      ctx.beginPath();
      ctx.arc((i === 0 ? -1 : 1) * fighter.radius * 0.36, -fighter.radius * 0.28, active ? 5 : 4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const active = isRendingHuntActive(fighter);
    const bleedStacks = Number(fighter.customState.fangTrackedBleedStacks ?? 0);
    if (!active && bleedStacks <= 0) {
      return;
    }

    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    const pulse = Math.sin(time * 9) * 3;
    ctx.strokeStyle = active ? "rgba(255, 61, 79, 0.72)" : "rgba(201, 31, 55, 0.42)";
    ctx.lineWidth = active ? 5 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 11 + pulse, 0, TAU);
    ctx.stroke();
    if (bleedStacks > 0) {
      ctx.strokeStyle = "rgba(245, 228, 200, 0.58)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 20, time, time + TAU * clamp(bleedStacks / BALANCE.fang.maxBleedStacks, 0.25, 1));
      ctx.stroke();
    }
    ctx.restore();
  }
};

function isRendingHuntActive(fighter: { customState: Record<string, number | boolean | string> }): boolean {
  return Number(fighter.customState.rendingHuntTimer ?? 0) > 0;
}

function getBestBleedingTarget(game: FighterClassContext["game"], self: FighterClassContext["self"], fallback: FighterClassContext["enemy"]) {
  return game.getEnemies(self).find((enemy) => getBleedStacks(enemy, self) > 0) ?? (getBleedStacks(fallback, self) > 0 ? fallback : null);
}

function applyBloodScentSpeed(fighter: {
  velocity: { x: number; y: number };
  targetMoveSpeed: number;
  minSpeed: number;
  maxSpeed: number;
  setVelocity(velocity: { x: number; y: number }, reason: "status-speed-only"): void;
}): void {
  const direction = safeNormalize(fighter.velocity, { x: 1, y: 0 });
  const speed = clamp(fighter.targetMoveSpeed * BALANCE.fang.bloodScentMoveSpeedMultiplier, fighter.minSpeed, fighter.maxSpeed);
  fighter.setVelocity({ x: direction.x * speed, y: direction.y * speed }, "status-speed-only");
}
