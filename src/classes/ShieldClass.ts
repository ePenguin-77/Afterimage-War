import type { FighterClass, FighterClassContext, DamageContext } from "./FighterClass";
import { BALANCE } from "../tuning";
import { TAU, clamp, randomRange } from "../utils/math";

const SHIELD_TIMER = "shieldGuardTimer";
const COUNTER_COOLDOWN = "shieldCounterCooldown";
const ABILITY_COUNTER_LOCK = "shieldAbilityCounterLock";
const SHIELD_FLASH = "shieldFlash";
const ARMOR_CHARGES = "shieldArmorCharges";
const ARMOR_REGEN_TIMER = "shieldArmorRegenTimer";
const ARMOR_CONSUME_COOLDOWN = "shieldArmorConsumeCooldown";
const ARMOR_ABILITY_LOCK = "shieldArmorAbilityLock";

export const ShieldClass: FighterClass = {
  id: "shield",
  displayName: "Shield Ball",
  primaryColor: "#e0a928",
  secondaryColor: "#dff4ff",
  outlineColor: "#2f2611",
  role: "tank",
  roleLabel: "Tank / Counter",
  shortDescription: "Uses armor charges to reduce burst damage and restores them with Guard Counter.",
  baseHP: BALANCE.shield.hp,
  baseMoveSpeed: BALANCE.shield.targetMoveSpeed,
  targetMoveSpeed: BALANCE.shield.targetMoveSpeed,
  mass: BALANCE.shield.mass,
  restitution: BALANCE.shield.restitution,
  minSpeed: BALANCE.shield.minSpeed,
  maxSpeed: BALANCE.shield.maxSpeed,
  contactDamage: BALANCE.shield.contactDamage,
  contactDamageCooldown: BALANCE.shield.contactDamageCooldown,
  baseDamage: BALANCE.shield.contactDamage,
  scalingStatName: "Armor",
  abilityName: "GUARD COUNTER",
  abilityDescription: "Restores armor charges, guards briefly, and counters physical hits.",
  abilityChargeRate: BALANCE.shield.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    return `${getArmorCharges(fighter)}/${getMaxArmorCharges(fighter)}`;
  },

  updatePassiveScaling({ self }: FighterClassContext): void {
    ensureArmorInitialized(self);
    self.scalingValue = getArmorCharges(self);
  },

  updateAI({ self, enemy, dt, game }: FighterClassContext): void {
    const guardTimer = Math.max(0, Number(self.customState[SHIELD_TIMER] ?? 0) - dt);
    const counterCooldown = Math.max(0, Number(self.customState[COUNTER_COOLDOWN] ?? 0) - dt);
    const abilityCounterLock = Math.max(0, Number(self.customState[ABILITY_COUNTER_LOCK] ?? 0) - dt);
    const flash = Math.max(0, Number(self.customState[SHIELD_FLASH] ?? 0) - dt);
    const armorConsumeCooldown = Math.max(0, Number(self.customState[ARMOR_CONSUME_COOLDOWN] ?? 0) - dt);
    const armorAbilityLock = Math.max(0, Number(self.customState[ARMOR_ABILITY_LOCK] ?? 0) - dt);
    const charges = getArmorCharges(self);
    const regenInterval = BALANCE.shield.armorChargeRegenInterval * self.runModifiers.armorRegenIntervalMultiplier;
    let regenTimer = Number(self.customState[ARMOR_REGEN_TIMER] ?? regenInterval);
    self.customState[SHIELD_TIMER] = guardTimer;
    self.customState[COUNTER_COOLDOWN] = counterCooldown;
    self.customState[ABILITY_COUNTER_LOCK] = abilityCounterLock;
    self.customState[SHIELD_FLASH] = flash;
    self.customState[ARMOR_CONSUME_COOLDOWN] = armorConsumeCooldown;
    self.customState[ARMOR_ABILITY_LOCK] = armorAbilityLock;

    if (charges < getMaxArmorCharges(self)) {
      regenTimer -= dt;
      if (regenTimer <= 0) {
        self.customState[ARMOR_CHARGES] = Math.min(getMaxArmorCharges(self), charges + 1);
        self.stats.armorChargesRegenerated += 1;
        regenTimer = regenInterval;
        self.customState[SHIELD_FLASH] = Math.max(Number(self.customState[SHIELD_FLASH] ?? 0), 0.2);
        game.spawnAbilityText("ARMOR +1", this.secondaryColor, self.position);
      }
    } else {
      regenTimer = regenInterval;
    }
    self.customState[ARMOR_REGEN_TIMER] = regenTimer;

    if (self.contactCooldown <= 0 && self.distanceTo(enemy) < self.radius + enemy.radius + 14) {
      this.basicAttack({ self, enemy, dt, game });
      self.contactCooldown = self.classDef.contactDamageCooldown ?? BALANCE.shield.contactDamageCooldown;
    }

    if (Math.random() < dt * (guardTimer > 0 ? 5 : 1.6)) {
      game.spawnShieldSpark(
        {
          x: self.position.x + randomRange(-22, 22),
          y: self.position.y + randomRange(-22, 22)
        },
        guardTimer > 0 ? this.secondaryColor : "rgba(224,169,40,0.5)"
      );
    }
  },

  modifyIncomingDamage({ amount, self, kind, source, game }: DamageContext): number {
    const active = Number(self.customState[SHIELD_TIMER] ?? 0) > 0;
    if (kind === "burn" || kind === "poison" || kind === "bleed") {
      const reduction = active ? BALANCE.shield.guardBurnReduction : BALANCE.shield.burnTickReduction;
      return amount * (1 - reduction);
    }

    if (!isDirectDamage(kind)) {
      return amount;
    }

    let adjustedAmount = amount;
    if (kind === "projectile") {
      adjustedAmount *= 1 - BALANCE.shield.passiveProjectileReduction;
    }
    if (kind === "ability" && source.classDef.id === "thunder") {
      adjustedAmount *= 1 - BALANCE.shield.passiveLightningReduction;
    }

    if (active) {
      return adjustedAmount * (1 - BALANCE.shield.activeDamageReduction);
    }

    if (Number(self.customState[ARMOR_CONSUME_COOLDOWN] ?? 0) > 0) {
      return adjustedAmount;
    }

    if (kind === "ability" && Number(self.customState[ARMOR_ABILITY_LOCK] ?? 0) > 0) {
      return adjustedAmount;
    }

    const charges = getArmorCharges(self);
    if (charges <= 0) {
      return adjustedAmount;
    }

    self.customState[ARMOR_CHARGES] = charges - 1;
    self.customState[ARMOR_CONSUME_COOLDOWN] = BALANCE.shield.armorConsumeCooldown;
    if (kind === "ability") {
      self.customState[ARMOR_ABILITY_LOCK] = BALANCE.shield.armorAbilityLockDuration;
    }
    self.stats.armorChargesConsumed += 1;
    const armorReduction = clamp(BALANCE.shield.armorChargeReduction + self.runModifiers.armorReductionBonus, 0, 0.75);
    self.stats.armorDamagePrevented += adjustedAmount * armorReduction;
    self.customState[SHIELD_FLASH] = 0.18;
    game.spawnShieldSpark(self.position, "rgba(255, 232, 136, 0.95)");
    game.spawnAbilityText("ARMOR -1", this.secondaryColor, self.position);
    return adjustedAmount * (1 - armorReduction);
  },

  onDamageTaken({ game, self, source, kind }: DamageContext): void {
    if (kind === "counter" || source === self || Number(self.customState[SHIELD_TIMER] ?? 0) <= 0) {
      return;
    }

    if (kind !== "ability" && kind !== "contact" && kind !== "dash" && kind !== "collision") {
      return;
    }

    if (Number(self.customState[COUNTER_COOLDOWN] ?? 0) > 0) {
      return;
    }

    if (kind === "ability" && Number(self.customState[ABILITY_COUNTER_LOCK] ?? 0) > 0) {
      return;
    }

    const counterDamage =
      kind === "ability"
        ? BALANCE.shield.abilityCounterDamage
        : kind === "dash"
          ? BALANCE.shield.dashCounterDamage
          : BALANCE.shield.counterDamage;
    if (counterDamage <= 0) {
      return;
    }

    self.customState[COUNTER_COOLDOWN] = BALANCE.shield.counterCooldown;
    self.stats.guardCounters += 1;
    if (kind === "ability") {
      self.customState[ABILITY_COUNTER_LOCK] = BALANCE.shield.abilityCounterLockDuration;
    }
    self.customState[SHIELD_FLASH] = 0.24;
    source.takeDamage(counterDamage, self, game, {
      hitColor: this.secondaryColor,
      ignoreCooldown: true,
      damageKind: "counter"
    });
    game.spawnShieldCounterEffect(self.position, this.secondaryColor);
    game.spawnAbilityText("COUNTER", this.secondaryColor, self.position);
  },

  basicAttack({ game, self, enemy }: FighterClassContext): void {
    enemy.takeDamage(self.classDef.contactDamage ?? BALANCE.shield.contactDamage, self, game, {
      knockback: 0,
      hitColor: this.secondaryColor,
      damageKind: "contact"
    });
  },

  specialAbility({ game, self }: FighterClassContext): void {
    self.customState[SHIELD_TIMER] = (BALANCE.shield.abilityDuration + self.runModifiers.guardDurationBonus) * self.runModifiers.abilityDurationMultiplier;
    self.customState[ARMOR_CHARGES] = getMaxArmorCharges(self);
    self.customState[ARMOR_REGEN_TIMER] = BALANCE.shield.armorChargeRegenInterval * self.runModifiers.armorRegenIntervalMultiplier;
    self.customState[COUNTER_COOLDOWN] = 0;
    self.customState[SHIELD_FLASH] = 0.35;
    game.spawnAbilityText("GUARD COUNTER", this.secondaryColor, self.position);
    game.spawnShieldCounterEffect(self.position, this.secondaryColor);
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    const active = Number(fighter.customState[SHIELD_TIMER] ?? 0) > 0;
    const flash = Number(fighter.customState[SHIELD_FLASH] ?? 0);
    const radius = fighter.radius + (active ? 26 : 17) + flash * 36;

    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * (active ? 2.1 : 1.1));
    ctx.strokeStyle = active ? "#f8fdff" : "#45606d";
    ctx.fillStyle = active ? "rgba(255, 231, 122, 0.16)" : "rgba(224, 169, 40, 0.1)";
    ctx.lineWidth = active ? 5 : 4;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * TAU;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const active = Number(fighter.customState[SHIELD_TIMER] ?? 0) > 0;
    const flash = Number(fighter.customState[SHIELD_FLASH] ?? 0);
    const charges = getArmorCharges(fighter);

    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    if (active) {
      const alpha = clamp(0.28 + flash * 1.7, 0.28, 0.72);
      ctx.fillStyle = `rgba(223, 244, 255, ${alpha * 0.28})`;
      ctx.strokeStyle = `rgba(255, 232, 136, ${alpha})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 24 + Math.sin(time * 8) * 2, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }

    ctx.rotate(-time * 1.6);
    ctx.strokeStyle = active ? "rgba(255, 232, 136, 0.9)" : "rgba(224, 169, 40, 0.5)";
    ctx.lineWidth = active ? 4 : 3;
    for (let i = 0; i < 3; i += 1) {
      const start = i * (TAU / 3) + time * 0.4;
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 9 + i * 5, start, start + 0.78);
      ctx.stroke();
    }

    ctx.rotate(time * 1.6);
    const maxCharges = getMaxArmorCharges(fighter);
    for (let i = 0; i < maxCharges; i += 1) {
      const angle = -Math.PI / 2 + (i - 1) * 0.34;
      const x = Math.cos(angle) * (fighter.radius + 28);
      const y = Math.sin(angle) * (fighter.radius + 28);
      ctx.fillStyle = i < charges ? "#f8fdff" : "rgba(47, 38, 17, 0.28)";
      ctx.strokeStyle = i < charges ? "#e0a928" : "rgba(47, 38, 17, 0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x + 7, y - 2);
      ctx.lineTo(x + 4, y + 8);
      ctx.lineTo(x, y + 12);
      ctx.lineTo(x - 4, y + 8);
      ctx.lineTo(x - 7, y - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
};

function ensureArmorInitialized(fighter: {
  customState: Record<string, number | boolean | string>;
  runModifiers?: { armorChargesBonus: number };
}): void {
  if (fighter.customState[ARMOR_CHARGES] === undefined) {
    fighter.customState[ARMOR_CHARGES] = getMaxArmorCharges(fighter);
  }
}

function getArmorCharges(fighter: {
  customState: Record<string, number | boolean | string>;
  runModifiers?: { armorChargesBonus: number };
}): number {
  ensureArmorInitialized(fighter);
  return clamp(Number(fighter.customState[ARMOR_CHARGES] ?? getMaxArmorCharges(fighter)), 0, getMaxArmorCharges(fighter));
}

function getMaxArmorCharges(fighter: { runModifiers?: { armorChargesBonus: number } }): number {
  return BALANCE.shield.maxArmorCharges + (fighter.runModifiers?.armorChargesBonus ?? 0);
}

function isDirectDamage(kind: string): boolean {
  return kind === "projectile" || kind === "contact" || kind === "dash" || kind === "ability" || kind === "explosion" || kind === "collision";
}
