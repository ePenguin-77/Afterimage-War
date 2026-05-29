import { BALANCE } from "../tuning";
import type { ContactDamageContext, DamageContext, FighterClass, FighterClassContext, WallBounceContext } from "./FighterClass";
import { TAU, clamp, distance, safeNormalize } from "../utils/math";

export const MonkClass: FighterClass = {
  id: "monk",
  displayName: "Monk Ball",
  primaryColor: "#d9b45f",
  secondaryColor: "#c7372f",
  outlineColor: "#3b2710",
  role: "melee",
  roleLabel: "Combo / Close-Range Technique",
  shortDescription: "Builds combo from contact hits and releases a short-range chi burst.",
  baseHP: BALANCE.monk.hp,
  baseMoveSpeed: BALANCE.monk.targetMoveSpeed,
  targetMoveSpeed: BALANCE.monk.targetMoveSpeed,
  mass: BALANCE.monk.mass,
  restitution: BALANCE.monk.restitution,
  minSpeed: BALANCE.monk.minSpeed,
  maxSpeed: BALANCE.monk.maxSpeed,
  contactDamage: BALANCE.monk.contactDamage,
  contactDamageCooldown: BALANCE.monk.contactDamageCooldown,
  baseDamage: BALANCE.monk.contactDamage,
  scalingStatName: "Combo",
  abilityName: "PALM BURST",
  abilityDescription: "Builds combo from contact hits, then releases a short-range palm burst based on combo stacks.",
  abilityChargeRate: BALANCE.monk.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    return `${getCombo(fighter)}/${getMaxCombo(fighter)}`;
  },

  updatePassiveScaling({ self, dt }: FighterClassContext): void {
    const previousFlowTimer = Number(self.customState.monkFlowStepTimer ?? 0);
    self.customState.monkFlowStepTimer = Math.max(0, previousFlowTimer - dt);
    if (Number(self.customState.monkFlowStepTimer ?? 0) > 0) {
      applyFocusStepSpeed(self);
    } else if (previousFlowTimer > 0) {
      self.normalizeToTargetSpeed("status-speed-only");
    }
    updateComboDecay(self, dt);
    self.scalingValue = getCombo(self);
  },

  updateAI({ game, self, dt }: FighterClassContext): void {
    if (!game.physicsTestMode && Number(self.customState.monkFlowStepTimer ?? 0) > 0) {
      self.ability.fill(dt * BALANCE.monk.abilityMeterGainRate * (BALANCE.monk.flowStepChargeMultiplier - 1) * self.runModifiers.abilityChargeMultiplier);
    }
    if (!game.isFastSimulation && Math.random() < dt * (2 + getCombo(self) * 0.8)) {
      game.spawnMonkSpark(self.position, getCombo(self) >= getMaxCombo(self) ? "#ffe08a" : this.secondaryColor);
    }
  },

  getContactDamage({ self, baseDamage }: ContactDamageContext) {
    const combo = getCombo(self);
    const comboBonus = baseDamage * BALANCE.monk.contactDamageBonusPerStack * combo;
    const flowBonus = Number(self.customState.monkFlowStepTimer ?? 0) > 0 ? baseDamage * (BALANCE.monk.flowStepContactMultiplier - 1) : 0;
    return {
      damage: baseDamage + comboBonus + flowBonus,
      bonusDamage: comboBonus + flowBonus,
      highImpact: combo >= getMaxCombo(self)
    };
  },

  getContactCooldown({ self }: FighterClassContext): number {
    return Math.max(0.22, BALANCE.monk.contactDamageCooldown - self.runModifiers.monkContactCooldownReduction);
  },

  modifyIncomingDamage({ self, amount, kind }: DamageContext): number {
    if (kind !== "projectile") {
      return amount;
    }

    const combo = getCombo(self);
    if (combo < BALANCE.monk.flowGuardComboThreshold) {
      return amount;
    }

    const reduction =
      combo >= getMaxCombo(self) ? BALANCE.monk.flowGuardMaxComboProjectileReduction : BALANCE.monk.flowGuardProjectileReduction;
    self.stats.flowGuardDamagePrevented += amount * reduction;
    return amount * (1 - reduction);
  },

  onWallBounce({ self, game }: WallBounceContext): void {
    self.customState.monkFlowStepTimer = BALANCE.monk.flowStepDuration;
    self.stats.focusStepTriggers += 1;
    applyFocusStepSpeed(self);
    if (!game.isFastSimulation && Math.random() < 0.7) {
      game.spawnMonkSpark(self.position, "#48b87c");
    }
  },

  basicAttack(): void {
    // Monk Ball's basic attack is rhythmic contact; it has no ranged shot.
  },

  specialAbility({ game, self, enemy }: FighterClassContext): void {
    const combo = getCombo(self);
    const radius = BALANCE.monk.palmBurstRadius + self.runModifiers.monkPalmRadiusBonus;
    const comboDamage = BALANCE.monk.palmBurstDamagePerCombo * self.runModifiers.monkPalmDamagePerComboMultiplier * combo;
    const damage = BALANCE.monk.palmBurstBaseDamage + comboDamage;
    self.stats.palmBurstUses += 1;
    game.spawnPalmBurstEffect(self.position, radius, this.secondaryColor);
    game.spawnAbilityText("PALM BURST", this.secondaryColor, self.position);
    if (distance(self.position, enemy.position) <= radius + enemy.radius) {
      const hpBefore = enemy.hp;
      const hit = enemy.takeDamage(damage, self, game, {
        knockback: 0,
        hitColor: this.secondaryColor,
        ignoreCooldown: true,
        damageKind: "ability"
      });
      const dealt = hit ? Math.max(0, hpBefore - enemy.hp) : 0;
      if (dealt > 0) {
        self.stats.palmBurstHits += 1;
        self.stats.palmBurstDamage += dealt;
        self.stats.comboBonusDamage += Math.min(comboDamage, dealt);
      }
    }
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    const combo = getCombo(fighter);
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * 1.1);
    ctx.strokeStyle = combo >= 3 ? "#48b87c" : this.secondaryColor;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 12 + i * 7, time * (0.5 + i * 0.08), time * (0.5 + i * 0.08) + TAU * 0.38);
      ctx.stroke();
    }
    ctx.fillStyle = "#c7372f";
    for (let i = 0; i < 4; i += 1) {
      const angle = i * (TAU / 4) + 0.45;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * (fighter.radius * 0.58), Math.sin(angle) * (fighter.radius * 0.58), 4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const combo = getCombo(fighter);
    if (combo <= 0 && Number(fighter.customState.monkFlowStepTimer ?? 0) <= 0) {
      return;
    }

    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    const pulse = Math.sin(time * 7) * 3;
    ctx.strokeStyle = combo >= getMaxCombo(fighter) ? "rgba(255, 224, 138, 0.72)" : "rgba(199, 55, 47, 0.4)";
    ctx.lineWidth = combo >= 3 ? 4 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 9 + combo * 2 + pulse, 0, TAU);
    ctx.stroke();
    if (Number(fighter.customState.monkFlowStepTimer ?? 0) > 0) {
      ctx.strokeStyle = "rgba(72, 184, 124, 0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 23, -0.8 + time, 0.7 + time);
      ctx.stroke();
    }
    ctx.restore();
  }
};

export function addMonkCombo(fighter: {
  customState: Record<string, number | boolean | string>;
  runModifiers: { monkComboDecayDelayBonus: number; monkMaxComboBonus: number };
  stats: { comboStacksGained: number; maxComboReached: number };
}): void {
  const nextCombo = Math.min(getMaxCombo(fighter), getCombo(fighter) + 1);
  if (nextCombo > getCombo(fighter)) {
    fighter.stats.comboStacksGained += 1;
  }
  fighter.customState.monkComboStacks = nextCombo;
  fighter.customState.monkComboDecayTimer = getComboDecayDelay(fighter);
  fighter.customState.monkComboDecayProgress = 0;
  fighter.stats.maxComboReached = Math.max(fighter.stats.maxComboReached, nextCombo);
}

function updateComboDecay(
  fighter: {
    customState: Record<string, number | boolean | string>;
    runModifiers: { monkComboDecayDelayBonus: number; monkMaxComboBonus: number };
  },
  dt: number
): void {
  const combo = getCombo(fighter);
  if (combo <= 0) {
    fighter.customState.monkComboStacks = 0;
    return;
  }

  const delayTimer = Math.max(0, Number(fighter.customState.monkComboDecayTimer ?? getComboDecayDelay(fighter)) - dt);
  fighter.customState.monkComboDecayTimer = delayTimer;
  if (delayTimer > 0) {
    return;
  }

  const decayProgress = Number(fighter.customState.monkComboDecayProgress ?? 0) + dt * BALANCE.monk.comboDecayRate;
  const lostStacks = Math.floor(decayProgress);
  fighter.customState.monkComboDecayProgress = decayProgress - lostStacks;
  if (lostStacks > 0) {
    fighter.customState.monkComboStacks = Math.max(0, combo - lostStacks);
  }
}

function getCombo(fighter: { customState: Record<string, number | boolean | string> }): number {
  return Math.max(0, Math.floor(Number(fighter.customState.monkComboStacks ?? 0)));
}

function getMaxCombo(fighter: { runModifiers: { monkMaxComboBonus: number } }): number {
  return BALANCE.monk.maxComboStacks + fighter.runModifiers.monkMaxComboBonus;
}

function getComboDecayDelay(fighter: { runModifiers: { monkComboDecayDelayBonus: number } }): number {
  return BALANCE.monk.comboDecayDelay + fighter.runModifiers.monkComboDecayDelayBonus;
}

function applyFocusStepSpeed(fighter: {
  velocity: { x: number; y: number };
  targetMoveSpeed: number;
  minSpeed: number;
  maxSpeed: number;
  setVelocity(velocity: { x: number; y: number }, reason: "status-speed-only"): void;
}): void {
  const direction = safeNormalize(fighter.velocity, { x: 1, y: 0 });
  const speed = clamp(fighter.targetMoveSpeed * BALANCE.monk.flowStepSpeedMultiplier, fighter.minSpeed, fighter.maxSpeed);
  fighter.setVelocity({ x: direction.x * speed, y: direction.y * speed }, "status-speed-only");
}
