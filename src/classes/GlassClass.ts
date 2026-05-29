import { Projectile } from "../entities/Projectile";
import { BALANCE } from "../tuning";
import type { DamageContext, FighterClass, FighterClassContext, WallBounceContext } from "./FighterClass";
import { TAU, angleTo, clamp, fromAngle, randomRange, safeNormalize } from "../utils/math";

const GLASS_HP_EXCEPTION = 1;

export const GlassClass: FighterClass = {
  id: "glass",
  displayName: "Glass Ball",
  primaryColor: "#bff7ff",
  secondaryColor: "#ffffff",
  outlineColor: "#24445c",
  role: "support",
  roleLabel: "One HP / Perfect Defense",
  shortDescription: "Has only 1 HP but blocks hits with Glass Charges restored by wall bounces.",
  // Special HP exception: DEFAULT_MAX_HP is the baseline, but Glass Ball intentionally
  // sets maxHP to 1 because its entire identity is Glass Charge defense, not health.
  baseHP: GLASS_HP_EXCEPTION,
  baseMoveSpeed: BALANCE.glass.targetMoveSpeed,
  targetMoveSpeed: BALANCE.glass.targetMoveSpeed,
  mass: BALANCE.glass.mass,
  restitution: BALANCE.glass.restitution,
  minSpeed: BALANCE.glass.minSpeed,
  maxSpeed: BALANCE.glass.maxSpeed,
  baseDamage: BALANCE.glass.projectileDamage,
  scalingStatName: "Glass",
  abilityName: "PRISM SHIFT",
  abilityDescription: "Temporarily phases through damage and fires prism shards faster.",
  abilityChargeRate: BALANCE.glass.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    return `${getGlassCharges(fighter)}/${getMaxGlassCharges(fighter)}`;
  },

  modifyIncomingDamage({ game, self, amount, kind }: DamageContext): number {
    initializeGlassState(self);
    if (amount <= 0) {
      return amount;
    }

    if (isPrismShiftActive(self)) {
      self.stats.damagePreventedByGlass += amount;
      game.spawnAbilityText("PHASE", this.secondaryColor, self.position);
      return 0;
    }

    const charges = getGlassCharges(self);
    const isDot = kind === "burn" || kind === "poison" || kind === "field";
    if (isDot) {
      if (charges > 0) {
        self.stats.damagePreventedByGlass += amount;
        return 0;
      }
      return 999;
    }

    if (charges <= 0) {
      return 999;
    }

    self.stats.damagePreventedByGlass += amount;
    if (Number(self.customState.glassChargeBlockCooldown ?? 0) <= 0) {
      self.customState.glassCharges = Math.max(0, charges - 1);
      self.customState.glassChargeBlockCooldown = BALANCE.glass.glassChargeBlockCooldown;
      self.stats.glassChargesBlocked += 1;
      self.stats.glassChargeBreaks += 1;
      game.spawnAbilityText("SHATTER", this.secondaryColor, self.position);
      game.spawnMirrorShatter(self.position, this.secondaryColor);
    } else {
      game.spawnAbilityText("BLOCK", this.secondaryColor, self.position);
    }
    return 0;
  },

  updatePassiveScaling({ game, self, dt }: FighterClassContext): void {
    initializeGlassState(self);
    self.customState.glassChargeBlockCooldown = Math.max(0, Number(self.customState.glassChargeBlockCooldown ?? 0) - dt);
    self.customState.prismShiftTimer = Math.max(0, Number(self.customState.prismShiftTimer ?? 0) - dt);
    const charges = getGlassCharges(self);
    self.scalingValue = charges;
    if (charges <= 0) {
      self.stats.timeAtZeroCharges += dt;
      self.ability.fill(
        dt *
          BALANCE.glass.abilityMeterGainRate *
          (BALANCE.glass.noChargeAbilityChargeMultiplier - 1) *
          self.runModifiers.abilityChargeMultiplier
      );
      applyNoChargeSpeed(self);
    }
    if (!game.isFastSimulation && Math.random() < dt * (isPrismShiftActive(self) ? 8 : 2.8)) {
      game.spawnMirrorSpark(self.position, isPrismShiftActive(self) ? "#ffdff8" : this.primaryColor);
    }
  },

  updateAI(context: FighterClassContext): void {
    const { self, enemy, game } = context;
    if (self.attackCooldown <= 0 && self.distanceTo(enemy) < 590) {
      this.basicAttack(context);
      const shiftTempo = isPrismShiftActive(self) ? BALANCE.glass.prismShiftAttackIntervalMultiplier : 1;
      self.attackCooldown = BALANCE.glass.attackInterval * shiftTempo * self.runModifiers.attackIntervalMultiplier;
    }

    if (!game.isFastSimulation && isPrismShiftActive(self)) {
      game.spawnMirrorSpark(self.position, "#fff4a8");
    }
  },

  onWallBounce({ self, game }: WallBounceContext): void {
    initializeGlassState(self);
    const maxCharges = getMaxGlassCharges(self);
    const charges = getGlassCharges(self);
    if (charges >= maxCharges) {
      self.customState.glassWallBounceCounter = 0;
      return;
    }

    const needed = getWallBouncesPerCharge(self);
    const nextCounter = Number(self.customState.glassWallBounceCounter ?? 0) + 1;
    self.stats.wallBouncesTowardCharge += 1;
    if (nextCounter >= needed) {
      self.customState.glassCharges = Math.min(maxCharges, charges + 1);
      self.customState.glassWallBounceCounter = 0;
      self.stats.glassChargesRestored += 1;
      game.spawnAbilityText("REFRACT", this.secondaryColor, self.position);
      if (!game.isFastSimulation) {
        game.spawnMirrorShatter(self.position, "#bff7ff");
      }
      return;
    }

    self.customState.glassWallBounceCounter = nextCounter;
  },

  basicAttack({ game, self, enemy }: FighterClassContext): void {
    const target = game.getTargetPointFor(self, enemy, BALANCE.glass.predictiveLeadTime + self.runModifiers.predictiveLeadBonus);
    const angle = angleTo(self.position, target.position) + randomRange(-0.055, 0.055);
    const spawn = {
      x: self.position.x + Math.cos(angle) * (self.radius + 15),
      y: self.position.y + Math.sin(angle) * (self.radius + 15)
    };

    game.projectiles.push(
      new Projectile({
        owner: self,
        position: spawn,
        velocity: fromAngle(angle, BALANCE.glass.projectileSpeed),
        radius: 12,
        damage: BALANCE.glass.projectileDamage,
        color: "#f7feff",
        secondaryColor: "#9af5ff",
        life: 1.5,
        kind: "prismShot"
      })
    );
  },

  specialAbility({ game, self }: FighterClassContext): void {
    initializeGlassState(self);
    const duration =
      (BALANCE.glass.prismShiftDuration + self.runModifiers.glassShiftDurationBonus) *
      self.runModifiers.abilityDurationMultiplier;
    self.customState.prismShiftTimer = duration;
    self.stats.prismShiftUses += 1;
    self.attackCooldown = 0;
    game.spawnAbilityText("PRISM SHIFT", "#fff4a8", self.position);
    game.spawnMirrorShatter(self.position, "#ffdff8");
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    const charges = getGlassCharges(fighter);
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * 2.2);
    ctx.globalAlpha = isPrismShiftActive(fighter) ? 0.58 : 0.82;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i += 1) {
      const angle = i * (TAU / 5);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * (fighter.radius * 0.2), Math.sin(angle) * (fighter.radius * 0.2));
      ctx.lineTo(Math.cos(angle + 0.1) * (fighter.radius + 17), Math.sin(angle + 0.1) * (fighter.radius + 17));
      ctx.stroke();
    }
    ctx.fillStyle = charges > 0 ? "rgba(191, 247, 255, 0.34)" : "rgba(255, 255, 255, 0.14)";
    for (let i = 0; i < charges; i += 1) {
      const angle = i * (TAU / Math.max(1, getMaxGlassCharges(fighter))) + time;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * (fighter.radius + 24), Math.sin(angle) * (fighter.radius + 24), 5, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.globalAlpha = isPrismShiftActive(fighter) ? 0.7 : 0.45;
    ctx.strokeStyle = isPrismShiftActive(fighter) ? "rgba(255, 223, 248, 0.8)" : "rgba(191, 247, 255, 0.55)";
    ctx.lineWidth = isPrismShiftActive(fighter) ? 5 : 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.ellipse(0, 0, fighter.radius + 10 + i * 8, fighter.radius + 2 + i * 3, time * (0.7 + i * 0.12), 0, TAU);
      ctx.stroke();
    }
    if (getGlassCharges(fighter) <= 0) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.86)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-fighter.radius * 0.4, -fighter.radius * 0.62);
      ctx.lineTo(4, -4);
      ctx.lineTo(-8, fighter.radius * 0.58);
      ctx.stroke();
    }
    ctx.restore();
  }
};

type GlassStateFighter = {
  customState: Record<string, number | boolean | string>;
  velocity: { x: number; y: number };
  targetMoveSpeed: number;
  minSpeed: number;
  maxSpeed: number;
  runModifiers: {
    glassMaxChargesBonus: number;
    glassWallBounceRequirementReduction: number;
  };
  setVelocity?(velocity: { x: number; y: number }, reason: "status-speed-only"): void;
};

function initializeGlassState(fighter: GlassStateFighter): void {
  if (fighter.customState.glassCharges === undefined) {
    fighter.customState.glassCharges = getMaxGlassCharges(fighter);
    fighter.customState.glassWallBounceCounter = 0;
    fighter.customState.glassChargeBlockCooldown = 0;
    fighter.customState.prismShiftTimer = 0;
  }
}

function getMaxGlassCharges(fighter: GlassStateFighter): number {
  return BALANCE.glass.maxGlassCharges + fighter.runModifiers.glassMaxChargesBonus;
}

function getGlassCharges(fighter: GlassStateFighter): number {
  if (fighter.customState.glassCharges === undefined) {
    return getMaxGlassCharges(fighter);
  }
  return clamp(Math.floor(Number(fighter.customState.glassCharges ?? 0)), 0, getMaxGlassCharges(fighter));
}

function getWallBouncesPerCharge(fighter: GlassStateFighter): number {
  return Math.max(1, BALANCE.glass.wallBouncesPerCharge - fighter.runModifiers.glassWallBounceRequirementReduction);
}

function isPrismShiftActive(fighter: { customState: Record<string, number | boolean | string> }): boolean {
  return Number(fighter.customState.prismShiftTimer ?? 0) > 0;
}

function applyNoChargeSpeed(fighter: GlassStateFighter): void {
  if (!fighter.setVelocity) {
    return;
  }
  const direction = safeNormalize(fighter.velocity, { x: 1, y: 0 });
  const targetSpeed = clamp(fighter.targetMoveSpeed * BALANCE.glass.noChargeMoveSpeedMultiplier, fighter.minSpeed, fighter.maxSpeed);
  const speed = Math.hypot(fighter.velocity.x, fighter.velocity.y);
  if (Math.abs(speed - targetSpeed) < 1.5) {
    return;
  }
  fighter.setVelocity({ x: direction.x * targetSpeed, y: direction.y * targetSpeed }, "status-speed-only");
}
