import { BALANCE } from "../tuning";
import type { ContactDamageContext, DamageContext, FighterClass, FighterClassContext } from "./FighterClass";
import { TAU, clamp } from "../utils/math";

export const CrusherClass: FighterClass = {
  id: "crusher",
  displayName: "Crusher Ball",
  primaryColor: "#3f4650",
  secondaryColor: "#ff8a31",
  outlineColor: "#171a1f",
  role: "melee",
  roleLabel: "Heavy Impact / Bruiser",
  shortDescription: "A heavy melee ball that deals more damage on high-speed impacts.",
  baseHP: BALANCE.crusher.hp,
  baseMoveSpeed: BALANCE.crusher.targetMoveSpeed,
  targetMoveSpeed: BALANCE.crusher.targetMoveSpeed,
  mass: BALANCE.crusher.mass,
  restitution: BALANCE.crusher.restitution,
  minSpeed: BALANCE.crusher.minSpeed,
  maxSpeed: BALANCE.crusher.maxSpeed,
  contactDamage: BALANCE.crusher.contactDamage,
  contactDamageCooldown: BALANCE.crusher.contactDamageCooldown,
  baseDamage: BALANCE.crusher.contactDamage,
  scalingStatName: "Crush",
  abilityName: "CRUSHING FORCE",
  abilityDescription: "Temporarily increases impact damage and makes high-speed collisions more dangerous.",
  abilityChargeRate: BALANCE.crusher.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    return isCrushingForceActive(fighter) ? "Active" : "Heavy";
  },

  updatePassiveScaling({ self }: FighterClassContext): void {
    self.customState.crushingForceTimer = Math.max(0, Number(self.customState.crushingForceTimer ?? 0));
    self.scalingValue = isCrushingForceActive(self) ? 1 : 0;
  },

  updateAI({ game, self, dt }: FighterClassContext): void {
    self.customState.crushingForceTimer = Math.max(0, Number(self.customState.crushingForceTimer ?? 0) - dt);
    if (!game.isFastSimulation && Math.random() < dt * (isCrushingForceActive(self) ? 6 : 2)) {
      game.spawnCrusherSpark(self.position, isCrushingForceActive(self) ? "#ffb35f" : this.primaryColor);
    }
  },

  getContactDamage({ self, collision, baseDamage }: ContactDamageContext) {
    const active = isCrushingForceActive(self);
    const threshold = Math.max(140, BALANCE.crusher.impactBonusMinSpeed - self.runModifiers.crusherImpactThresholdReduction);
    const impactT = clamp(
      (collision.impactSpeed - threshold) / Math.max(1, BALANCE.crusher.impactBonusMaxSpeed - threshold),
      0,
      1
    );
    const impactBonus =
      collision.impactSpeed > threshold
        ? (1 + (BALANCE.crusher.maxImpactBonusDamage - 1) * impactT) *
          (active ? BALANCE.crusher.crushingForceImpactBonusMultiplier : 1) *
          self.runModifiers.crusherImpactBonusMultiplier
        : 0;
    const contactDamage = baseDamage * (active ? BALANCE.crusher.crushingForceContactMultiplier : 1);
    return {
      damage: contactDamage + impactBonus,
      bonusDamage: impactBonus,
      highImpact: impactBonus >= 3
    };
  },

  modifyIncomingDamage({ self, amount, kind }: DamageContext): number {
    if (kind !== "contact" && kind !== "collision" && kind !== "dash") {
      return amount;
    }

    const multiplier = isCrushingForceActive(self)
      ? BALANCE.crusher.crushingForceContactDamageTakenMultiplier
      : BALANCE.crusher.passiveContactDamageTakenMultiplier;
    const reduced = amount * multiplier;
    self.stats.collisionDamageReduced += amount - reduced;
    return reduced;
  },

  basicAttack(): void {
    // Crusher's basic pressure is fighter collision contact; it has no ranged basic attack.
  },

  specialAbility({ game, self }: FighterClassContext): void {
    const duration =
      (BALANCE.crusher.crushingForceDuration + self.runModifiers.crusherForceDurationBonus) * self.runModifiers.abilityDurationMultiplier;
    self.customState.crushingForceTimer = duration;
    self.stats.crushingForceUses += 1;
    game.spawnAbilityText("CRUSHING FORCE", this.secondaryColor, self.position);
    for (let i = 0; i < 12; i += 1) {
      game.spawnCrusherSpark(self.position, i % 2 === 0 ? "#ffb35f" : this.primaryColor);
    }
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * 0.55);
    ctx.strokeStyle = this.outlineColor;
    ctx.lineWidth = 3;
    for (let i = 0; i < 7; i += 1) {
      const angle = i * 0.92 + Math.sin(time * 0.8 + i) * 0.08;
      const r1 = fighter.radius * randomCrackRadius(i, 0.25);
      const r2 = fighter.radius * randomCrackRadius(i, 0.8);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
      ctx.lineTo(Math.cos(angle + 0.18) * r2, Math.sin(angle + 0.18) * r2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 138, 49, 0.82)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const angle = i * (TAU / 4) + 0.35;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 8, Math.sin(angle) * 8);
      ctx.lineTo(Math.cos(angle + 0.12) * (fighter.radius - 7), Math.sin(angle + 0.12) * (fighter.radius - 7));
      ctx.stroke();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const active = isCrushingForceActive(fighter);
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    if (active) {
      ctx.strokeStyle = "rgba(255, 138, 49, 0.6)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 9 + Math.sin(time * 7) * 3, 0, TAU);
      ctx.stroke();
    }
    ctx.strokeStyle = active ? "rgba(255, 179, 95, 0.42)" : "rgba(63, 70, 80, 0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 15, 0.2 + time * 0.25, 2.6 + time * 0.25);
    ctx.stroke();
    ctx.restore();
  }
};

function isCrushingForceActive(fighter: { customState: Record<string, number | boolean | string> }): boolean {
  return Number(fighter.customState.crushingForceTimer ?? 0) > 0;
}

function randomCrackRadius(seed: number, base: number): number {
  return base + ((seed * 37) % 11) * 0.035;
}
