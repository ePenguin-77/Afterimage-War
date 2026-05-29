import { BALANCE } from "../tuning";
import type { ContactDamageContext, DamageContext, FighterClass, FighterClassContext, WallBounceContext } from "./FighterClass";
import { TAU } from "../utils/math";

export const SpikeClass: FighterClass = {
  id: "spike",
  displayName: "Spike Ball",
  primaryColor: "#3b1f26",
  secondaryColor: "#ff6b2f",
  outlineColor: "#13090c",
  role: "melee",
  roleLabel: "Contact / Thorn Bruiser",
  shortDescription: "Deals contact damage and reflects part of enemy collision damage with sharp spikes.",
  baseHP: BALANCE.spike.hp,
  baseMoveSpeed: BALANCE.spike.targetMoveSpeed,
  targetMoveSpeed: BALANCE.spike.targetMoveSpeed,
  mass: BALANCE.spike.mass,
  restitution: BALANCE.spike.restitution,
  minSpeed: BALANCE.spike.minSpeed,
  maxSpeed: BALANCE.spike.maxSpeed,
  contactDamage: BALANCE.spike.contactDamage,
  contactDamageCooldown: BALANCE.spike.contactDamageCooldown,
  baseDamage: BALANCE.spike.contactDamage,
  scalingStatName: "Thorns",
  abilityName: "SPIKE ARMOR",
  abilityDescription: "Extends spikes for a short time, increasing contact damage and reflecting part of incoming contact damage.",
  abilityChargeRate: BALANCE.spike.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    return isSpikeArmorActive(fighter) ? "Active" : `${Math.round(getReflectPercent(fighter) * 100)}%`;
  },

  updatePassiveScaling({ self }: FighterClassContext): void {
    self.customState.spikeArmorTimer = Math.max(0, Number(self.customState.spikeArmorTimer ?? 0));
    if (Number(self.customState.spikeChargeTimer ?? 0) <= 0) {
      self.customState.spikeCharges = 0;
    }
    self.scalingValue = getReflectPercent(self);
  },

  updateAI({ game, self, dt }: FighterClassContext): void {
    self.customState.spikeArmorTimer = Math.max(0, Number(self.customState.spikeArmorTimer ?? 0) - dt);
    self.customState.spikeChargeTimer = Math.max(0, Number(self.customState.spikeChargeTimer ?? 0) - dt);
    self.customState.spikeReflectCooldown = Math.max(0, Number(self.customState.spikeReflectCooldown ?? 0) - dt);
    if (Number(self.customState.spikeChargeTimer ?? 0) <= 0) {
      self.customState.spikeCharges = 0;
    }
    if (isSpikeArmorActive(self)) {
      self.stats.spikeArmorUptime += dt;
    }

    if (!game.isFastSimulation && Math.random() < dt * (isSpikeArmorActive(self) ? 6 : 2.6)) {
      game.spawnSpikeSpark(self.position, isSpikeArmorActive(self) ? "#ff9a52" : this.secondaryColor);
    }
  },

  getContactDamage({ self, baseDamage }: ContactDamageContext) {
    const active = isSpikeArmorActive(self);
    const armorBonus = active ? baseDamage * (BALANCE.spike.spikeArmorContactMultiplier - 1) : 0;
    const charges = getSpikeCharges(self);
    const chargeBonus =
      charges > 0
        ? (active ? BALANCE.spike.spikeArmorWallChargeBonusDamage : BALANCE.spike.wallChargeBonusDamage) + self.runModifiers.spikeWallChargeBonus
        : 0;
    if (chargeBonus > 0) {
      self.customState.spikeCharges = Math.max(0, charges - 1);
      if (getSpikeCharges(self) <= 0) {
        self.customState.spikeChargeTimer = 0;
      }
      self.stats.wallSpikeChargesConsumed += 1;
      self.stats.wallSpikeBonusDamage += chargeBonus;
    }
    return {
      damage: baseDamage + armorBonus + chargeBonus,
      bonusDamage: armorBonus + chargeBonus,
      highImpact: chargeBonus > 0
    };
  },

  modifyIncomingDamage({ self, amount, kind }: DamageContext): number {
    let reduction = 0;
    if (isSpikeArmorActive(self)) {
      if (kind === "projectile") {
        reduction = BALANCE.spike.spikeArmorProjectileReduction;
      } else if (kind === "burn" || kind === "poison") {
        reduction = BALANCE.spike.spikeArmorBurnPoisonReduction;
      } else if (kind === "ability" || kind === "field" || kind === "explosion") {
        reduction = BALANCE.spike.spikeArmorAbilityReduction;
      }
    } else if (kind === "projectile" && getSpikeCharges(self) > 0) {
      reduction = BALANCE.spike.bristleGuardProjectileReduction;
    }

    if (reduction <= 0 && !isSpikeArmorActive(self)) {
      return amount;
    }

    const damageMultiplier = isSpikeArmorActive(self) ? self.runModifiers.spikeArmorDamageTakenMultiplier : 1;
    const nextAmount = amount * (1 - reduction) * damageMultiplier;
    self.stats.bristleGuardDamagePrevented += Math.max(0, amount - nextAmount);
    return nextAmount;
  },

  onDamageTaken({ game, self, source, amount, kind }: DamageContext): void {
    if (amount <= 0 || source === self || (kind !== "contact" && kind !== "dash" && kind !== "collision")) {
      return;
    }
    if (Number(self.customState.spikeReflectCooldown ?? 0) > 0) {
      return;
    }

    const reflected = amount * getReflectPercent(self);
    if (reflected <= 0) {
      return;
    }

    const hpBefore = source.hp;
    const hit = source.takeDamage(reflected, self, game, {
      knockback: 0,
      hitColor: this.secondaryColor,
      ignoreCooldown: true,
      damageKind: "counter"
    });
    const dealt = hit ? Math.max(0, hpBefore - source.hp) : 0;
    if (dealt > 0) {
      self.stats.thornDamageDealt += dealt;
      self.stats.reflectedDamage += dealt;
      game.spawnAbilityText("THORNS", this.secondaryColor, self.position);
      game.spawnSpikeSpark(source.position, this.secondaryColor);
    }
    self.customState.spikeReflectCooldown = BALANCE.spike.reflectCooldown;
  },

  onWallBounce({ self, game }: WallBounceContext): void {
    const nextCharges = Math.min(BALANCE.spike.maxWallCharges, getSpikeCharges(self) + 1);
    if (nextCharges > getSpikeCharges(self)) {
      self.stats.wallSpikeChargesGained += 1;
    }
    self.customState.spikeCharges = nextCharges;
    self.customState.spikeChargeTimer = BALANCE.spike.wallChargeDuration;
    if (!game.isFastSimulation && Math.random() < 0.6) {
      game.spawnSpikeSpark(self.position, this.secondaryColor);
    }
  },

  basicAttack(): void {
    // Spike Ball fights through fighter collisions instead of ranged shots.
  },

  specialAbility({ game, self }: FighterClassContext): void {
    const duration = (BALANCE.spike.spikeArmorDuration + self.runModifiers.spikeArmorDurationBonus) * self.runModifiers.abilityDurationMultiplier;
    self.customState.spikeArmorTimer = duration;
    self.stats.spikeArmorUses += 1;
    game.spawnAbilityText("SPIKE ARMOR", this.secondaryColor, self.position);
    for (let i = 0; i < 10; i += 1) {
      game.spawnSpikeSpark(self.position, i % 2 === 0 ? "#ff9a52" : "#1c0d10");
    }
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    const active = isSpikeArmorActive(fighter);
    const spikeLength = active ? 24 : 14;
    const spikeWidth = active ? 10 : 7;
    const count = 12;
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * 0.9);
    for (let i = 0; i < count; i += 1) {
      const angle = i * (TAU / count);
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = active && i % 2 === 0 ? this.secondaryColor : "#1c1f24";
      ctx.strokeStyle = this.outlineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fighter.radius - 4, -spikeWidth * 0.5);
      ctx.lineTo(fighter.radius + spikeLength, 0);
      ctx.lineTo(fighter.radius - 4, spikeWidth * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const active = isSpikeArmorActive(fighter);
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    if (active) {
      ctx.strokeStyle = "rgba(255, 107, 47, 0.68)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 17 + Math.sin(time * 8) * 3, 0, TAU);
      ctx.stroke();
    }
    if (Number(fighter.customState.spikeChargeTimer ?? 0) > 0) {
      ctx.strokeStyle = "rgba(255, 154, 82, 0.55)";
      ctx.lineWidth = 3;
      const charges = getSpikeCharges(fighter);
      for (let i = 0; i < Math.max(1, charges); i += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, fighter.radius + 21 + i * 5, -0.6 + time + i * 0.5, 0.9 + time + i * 0.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
};

function isSpikeArmorActive(fighter: { customState: Record<string, number | boolean | string> }): boolean {
  return Number(fighter.customState.spikeArmorTimer ?? 0) > 0;
}

function getSpikeCharges(fighter: { customState: Record<string, number | boolean | string> }): number {
  return Number(fighter.customState.spikeChargeTimer ?? 0) > 0
    ? Math.max(0, Math.floor(Number(fighter.customState.spikeCharges ?? 0)))
    : 0;
}

function getReflectPercent(fighter: {
  customState: Record<string, number | boolean | string>;
  runModifiers: { spikeReflectBonus: number };
}): number {
  return (isSpikeArmorActive(fighter) ? BALANCE.spike.spikeArmorReflectPercent : BALANCE.spike.reflectedContactDamagePercent) + fighter.runModifiers.spikeReflectBonus;
}
