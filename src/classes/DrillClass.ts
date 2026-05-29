import { BALANCE } from "../tuning";
import type { ContactDamageContext, DamageContext, FighterClass, FighterClassContext, PostDefenseDamageContext, WallBounceContext } from "./FighterClass";
import { TAU, clamp, safeNormalize } from "../utils/math";

export const DrillClass: FighterClass = {
  id: "drill",
  displayName: "Drill Ball",
  primaryColor: "#7f8790",
  secondaryColor: "#d77a2f",
  outlineColor: "#1b2026",
  role: "melee",
  roleLabel: "Pierce / Armor Break",
  shortDescription: "Breaks defenses and pierces armor through close-range contact hits.",
  baseHP: BALANCE.drill.hp,
  baseMoveSpeed: BALANCE.drill.targetMoveSpeed,
  targetMoveSpeed: BALANCE.drill.targetMoveSpeed,
  mass: BALANCE.drill.mass,
  restitution: BALANCE.drill.restitution,
  minSpeed: BALANCE.drill.minSpeed,
  maxSpeed: BALANCE.drill.maxSpeed,
  contactDamage: BALANCE.drill.contactDamage,
  contactDamageCooldown: BALANCE.drill.contactDamageCooldown,
  baseDamage: BALANCE.drill.contactDamage,
  scalingStatName: "Break",
  abilityName: "PIERCING DRILL",
  abilityDescription: "Empowers Drill Ball's next contacts to pierce defenses and weaken armor.",
  abilityChargeRate: BALANCE.drill.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    return isPiercingDrillActive(fighter) ? "Pierce" : `${getArmorBreakStacks(fighter.customState)}x`;
  },

  updatePassiveScaling({ self, enemy }: FighterClassContext): void {
    self.customState.piercingDrillTimer = Math.max(0, Number(self.customState.piercingDrillTimer ?? 0));
    self.customState.drillSpinUpTimer = Math.max(0, Number(self.customState.drillSpinUpTimer ?? 0));
    if (Number(self.customState.drillSpinUpTimer ?? 0) <= 0) {
      self.customState.drillSpinUpCharges = 0;
    } else {
      applySpinUpSpeed(self);
    }
    updateArmorBreakDecay(enemy);
    self.scalingValue = getArmorBreakStacks(enemy.customState);
  },

  updateAI({ game, self, enemy, dt }: FighterClassContext): void {
    self.customState.piercingDrillTimer = Math.max(0, Number(self.customState.piercingDrillTimer ?? 0) - dt);
    self.customState.drillSpinUpTimer = Math.max(0, Number(self.customState.drillSpinUpTimer ?? 0) - dt);
    if (Number(self.customState.drillSpinUpTimer ?? 0) <= 0) {
      self.customState.drillSpinUpCharges = 0;
    } else {
      applySpinUpSpeed(self);
    }
    updateArmorBreakDecay(enemy, dt);
    if (!game.isFastSimulation && Math.random() < dt * (isPiercingDrillActive(self) ? 6 : 2.2)) {
      game.spawnCrusherSpark(self.position, isPiercingDrillActive(self) ? "#59d7ff" : this.secondaryColor);
    }
  },

  getContactDamage({ self, enemy, baseDamage }: ContactDamageContext) {
    const active = isPiercingDrillActive(self);
    const breakStacks = getArmorBreakStacks(enemy.customState);
    const breakBonus = baseDamage * breakStacks * (BALANCE.drill.armorBreakDamageTakenPerStack + self.runModifiers.drillArmorBreakEffectBonus);
    const abilityBonus = active ? baseDamage * (BALANCE.drill.piercingDrillContactMultiplier - 1) : 0;
    const spinCharges = getSpinUpCharges(self.customState);
    const spinBonus =
      spinCharges > 0
        ? (active ? BALANCE.drill.piercingSpinUpBonusDamage : BALANCE.drill.spinUpBonusDamage) + self.runModifiers.drillSpinUpDamageBonus
        : 0;
    if (spinBonus > 0) {
      self.customState.drillSpinUpCharges = Math.max(0, spinCharges - 1);
      if (getSpinUpCharges(self.customState) <= 0) {
        self.customState.drillSpinUpTimer = 0;
      }
      self.stats.spinUpChargesUsed += 1;
    }
    return {
      damage: baseDamage + breakBonus + abilityBonus + spinBonus,
      bonusDamage: breakBonus + abilityBonus + spinBonus,
      highImpact: active || spinBonus > 0 || breakStacks >= BALANCE.drill.armorBreakMaxStacks
    };
  },

  modifyPostDefenseDamage({ self, originalAmount, modifiedAmount, kind }: PostDefenseDamageContext): number {
    if (kind !== "contact" || !isPiercingDrillActive(self)) {
      return modifiedAmount;
    }
    const minimumThrough = originalAmount * (BALANCE.drill.piercingDrillMinimumDamageThroughDefense + self.runModifiers.drillDefensePierceBonus);
    const restored = Math.max(0, minimumThrough - modifiedAmount);
    if (restored > 0) {
      self.stats.defensePiercedDamage += restored;
      return modifiedAmount + restored;
    }
    return modifiedAmount;
  },

  onDamageDealt({ game, self, enemy, amount, kind }: DamageContext): void {
    if (kind !== "contact" || amount <= 0) {
      return;
    }
    const stacks = isPiercingDrillActive(self) ? BALANCE.drill.piercingDrillStacksApplied : 1;
    applyArmorBreak(enemy, self, stacks);
    self.stats.armorBreakStacksApplied += stacks;
    game.spawnAbilityText("ARMOR BREAK", this.secondaryColor, enemy.position);
  },

  onWallBounce({ self, game }: WallBounceContext): void {
    const nextCharges = Math.min(BALANCE.drill.maxSpinUpCharges, getSpinUpCharges(self.customState) + 1);
    self.customState.drillSpinUpCharges = nextCharges;
    self.customState.drillSpinUpTimer = BALANCE.drill.spinUpDuration + self.runModifiers.drillSpinUpDurationBonus;
    applySpinUpSpeed(self);
    if (!game.isFastSimulation && Math.random() < 0.65) {
      game.spawnCrusherSpark(self.position, this.secondaryColor);
    }
  },

  basicAttack(): void {
    // Drill Ball fights through fighter collisions instead of ranged shots.
  },

  specialAbility({ game, self }: FighterClassContext): void {
    const duration =
      (BALANCE.drill.piercingDrillDuration + self.runModifiers.drillPiercingDurationBonus) *
      self.runModifiers.abilityDurationMultiplier;
    self.customState.piercingDrillTimer = duration;
    self.stats.piercingDrillUses += 1;
    game.spawnAbilityText("PIERCING DRILL", "#59d7ff", self.position);
    for (let i = 0; i < 12; i += 1) {
      game.spawnCrusherSpark(self.position, i % 2 === 0 ? "#59d7ff" : this.secondaryColor);
    }
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    const active = isPiercingDrillActive(fighter);
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * (active ? 9 : 4.2));
    ctx.fillStyle = active ? "#59d7ff" : this.secondaryColor;
    ctx.strokeStyle = this.outlineColor;
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i += 1) {
      const angle = i * (TAU / 4);
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(fighter.radius - 4, -8);
      ctx.lineTo(fighter.radius + (active ? 28 : 20), 0);
      ctx.lineTo(fighter.radius - 4, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = "#d2d7dc";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius * (0.34 + i * 0.15), time + i * 0.7, time + i * 0.7 + TAU * 0.42);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const active = isPiercingDrillActive(fighter);
    const spinCharges = getSpinUpCharges(fighter.customState);
    if (!active && spinCharges <= 0) {
      return;
    }

    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.strokeStyle = active ? "rgba(89, 215, 255, 0.72)" : "rgba(215, 122, 47, 0.5)";
    ctx.lineWidth = active ? 5 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 9 + Math.sin(time * 10) * 3, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < spinCharges; i += 1) {
      ctx.strokeStyle = "rgba(215, 122, 47, 0.5)";
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 18 + i * 5, time + i * 0.5, time + i * 0.5 + 0.85);
      ctx.stroke();
    }
    ctx.restore();
  }
};

function isPiercingDrillActive(fighter: { customState: Record<string, number | boolean | string> }): boolean {
  return Number(fighter.customState.piercingDrillTimer ?? 0) > 0;
}

function getSpinUpCharges(customState: Record<string, number | boolean | string>): number {
  return Number(customState.drillSpinUpTimer ?? 0) > 0
    ? Math.max(0, Math.floor(Number(customState.drillSpinUpCharges ?? 0)))
    : 0;
}

function getArmorBreakStacks(customState: Record<string, number | boolean | string>): number {
  return Number(customState.drillArmorBreakTimer ?? 0) > 0
    ? Math.max(0, Math.floor(Number(customState.drillArmorBreakStacks ?? 0)))
    : 0;
}

function applyArmorBreak(
  target: { customState: Record<string, number | boolean | string> },
  source: { runModifiers: { drillArmorBreakStackCapBonus: number } },
  stacks: number
): void {
  const maxStacks = BALANCE.drill.armorBreakMaxStacks + source.runModifiers.drillArmorBreakStackCapBonus;
  target.customState.drillArmorBreakStacks = Math.min(maxStacks, getArmorBreakStacks(target.customState) + stacks);
  target.customState.drillArmorBreakTimer = BALANCE.drill.armorBreakDuration;
}

function updateArmorBreakDecay(target: { customState: Record<string, number | boolean | string> }, dt = 0): void {
  const timer = Math.max(0, Number(target.customState.drillArmorBreakTimer ?? 0) - dt);
  target.customState.drillArmorBreakTimer = timer;
  if (timer <= 0) {
    target.customState.drillArmorBreakStacks = 0;
  }
}

function applySpinUpSpeed(fighter: {
  velocity: { x: number; y: number };
  targetMoveSpeed: number;
  minSpeed: number;
  maxSpeed: number;
  setVelocity(velocity: { x: number; y: number }, reason: "status-speed-only"): void;
}): void {
  const targetSpeed = clamp(fighter.targetMoveSpeed * BALANCE.drill.spinUpSpeedMultiplier, fighter.minSpeed, fighter.maxSpeed);
  const currentSpeed = Math.hypot(fighter.velocity.x, fighter.velocity.y);
  if (Math.abs(currentSpeed - targetSpeed) < 1.5) {
    return;
  }
  const direction = safeNormalize(fighter.velocity, { x: 1, y: 0 });
  fighter.setVelocity({ x: direction.x * targetSpeed, y: direction.y * targetSpeed }, "status-speed-only");
}
