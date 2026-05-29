import { BALANCE } from "../tuning";
import type { ContactDamageContext, DamageContext, FighterClass, FighterClassContext, WallBounceContext } from "./FighterClass";
import { TAU, angleTo, circleOverlap, clamp, fromAngle } from "../utils/math";

export const NinjaClass: FighterClass = {
  id: "ninja",
  displayName: "Ninja Ball",
  primaryColor: "#101628",
  secondaryColor: "#7be8ff",
  outlineColor: "#07090f",
  role: "melee",
  roleLabel: "Evasive Melee / Multi-Dash",
  shortDescription: "Performs multiple short dashes and evades projectiles during shadow movement.",
  baseHP: BALANCE.ninja.hp,
  baseMoveSpeed: BALANCE.ninja.targetMoveSpeed,
  targetMoveSpeed: BALANCE.ninja.targetMoveSpeed,
  mass: BALANCE.ninja.mass,
  restitution: BALANCE.ninja.restitution,
  minSpeed: BALANCE.ninja.minSpeed,
  maxSpeed: BALANCE.ninja.maxSpeed,
  contactDamage: BALANCE.ninja.contactDamage,
  contactDamageCooldown: BALANCE.ninja.contactDamageCooldown,
  dashSpeed: BALANCE.ninja.shadowStepDashSpeed,
  dashDamage: BALANCE.ninja.shadowStepDashDamage,
  dashDuration: BALANCE.ninja.shadowStepDashDuration,
  baseDamage: BALANCE.ninja.contactDamage,
  scalingStatName: "Shadow",
  abilityName: "SHADOW STEP",
  abilityDescription: "Performs several short straight-line dashes with brief projectile protection and shadow strikes.",
  abilityChargeRate: BALANCE.ninja.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    if (isShadowStepActive(fighter)) {
      return "Step";
    }
    return Number(fighter.customState.ninjaWallShadowTimer ?? 0) > 0 ? "Ready" : `${Math.round(getEvadeChance(fighter) * 100)}%`;
  },

  updatePassiveScaling({ self, dt }: FighterClassContext): void {
    self.customState.ninjaWallShadowTimer = Math.max(0, Number(self.customState.ninjaWallShadowTimer ?? 0) - dt);
    self.scalingValue = Number(self.customState.ninjaWallShadowTimer ?? 0) > 0 ? 1 : 0;
  },

  updateAI(context: FighterClassContext): void {
    const { self, enemy, game, dt } = context;
    const dashTimer = Number(self.customState.shadowStepDashTimer ?? 0);

    if (dashTimer > 0) {
      self.customState.shadowStepDashTimer = Math.max(0, dashTimer - dt);
      if (
        !self.customState.shadowStepDashHasHit &&
        circleOverlap(self.position, self.radius + 9, enemy.position, enemy.radius)
      ) {
        const hpBefore = enemy.hp;
        const damage = BALANCE.ninja.shadowStepDashDamage * self.runModifiers.ninjaDashDamageMultiplier;
        const hit = enemy.takeDamage(damage, self, game, {
          knockback: 0,
          hitColor: this.secondaryColor,
          ignoreCooldown: true,
          damageKind: "dash"
        });
        const dealt = hit ? Math.max(0, hpBefore - enemy.hp) : 0;
        if (dealt > 0) {
          self.stats.shadowStepDashHits += 1;
          self.stats.shadowStepTotalDamage += dealt;
          game.spawnSlashBurst(enemy.position, angleTo(self.position, enemy.position));
          game.spawnAbilityText("SHADOW HIT", this.secondaryColor, enemy.position);
        }
        self.customState.shadowStepDashHasHit = true;
      }

      if (Number(self.customState.shadowStepDashTimer ?? 0) <= 0) {
        self.normalizeToTargetSpeed("status-speed-only");
        if (getRemainingDashes(self) > 0) {
          self.customState.shadowStepDashDelayTimer = BALANCE.ninja.shadowStepDashDelay;
        }
      }
      return;
    }

    const delayTimer = Number(self.customState.shadowStepDashDelayTimer ?? 0);
    if (delayTimer > 0) {
      self.customState.shadowStepDashDelayTimer = Math.max(0, delayTimer - dt);
      if (Number(self.customState.shadowStepDashDelayTimer ?? 0) <= 0 && getRemainingDashes(self) > 0) {
        startShadowDash(context);
      }
      return;
    }

    if (!game.isFastSimulation && Math.random() < dt * (Number(self.customState.ninjaWallShadowTimer ?? 0) > 0 ? 5 : 2)) {
      game.spawnSpikeSpark(self.position, this.secondaryColor);
    }
  },

  getContactDamage({ self, baseDamage }: ContactDamageContext) {
    const wallShadowActive = Number(self.customState.ninjaWallShadowTimer ?? 0) > 0;
    const bonus = wallShadowActive ? BALANCE.ninja.wallShadowBonusDamage + self.runModifiers.ninjaWallShadowBonus : 0;
    if (wallShadowActive) {
      self.customState.ninjaWallShadowTimer = 0;
      self.stats.wallShadowBonusDamage += bonus;
    }
    return {
      damage: baseDamage + bonus,
      bonusDamage: bonus,
      highImpact: bonus > 0
    };
  },

  modifyIncomingDamage({ self, amount, kind, game }: DamageContext): number {
    if (kind !== "projectile") {
      return amount;
    }

    if (Math.random() < getEvadeChance(self)) {
      self.stats.smokeReflexEvades += 1;
      self.stats.projectileEvades += 1;
      game.spawnAbilityText("EVADE", this.secondaryColor, self.position);
      if (!game.isFastSimulation) {
        for (let i = 0; i < 4; i += 1) {
          game.spawnSpikeSpark(self.position, "#6f5cff");
        }
      }
      return 0;
    }

    if (isShadowStepActive(self)) {
      return amount * (1 - BALANCE.ninja.shadowStepProjectileReduction);
    }
    return amount;
  },

  onWallBounce({ self, game }: WallBounceContext): void {
    self.customState.ninjaWallShadowTimer = BALANCE.ninja.wallShadowDuration;
    self.stats.wallShadowTriggers += 1;
    if (!game.isFastSimulation) {
      game.spawnAbilityText("SHADOW READY", this.secondaryColor, self.position);
      game.spawnSpikeSpark(self.position, "#6f5cff");
    }
  },

  basicAttack(): void {
    // Ninja Ball's baseline pressure is contact-based; Shadow Step supplies its active strike pattern.
  },

  specialAbility(context: FighterClassContext): void {
    const { game, self } = context;
    const dashCount = Math.max(1, BALANCE.ninja.shadowStepDashCount + self.runModifiers.ninjaDashCountBonus);
    self.customState.shadowStepRemainingDashes = dashCount;
    self.customState.shadowStepDashDelayTimer = 0;
    self.stats.shadowStepUses += 1;
    startShadowDash(context);
    game.spawnAbilityText("SHADOW STEP", this.secondaryColor, self.position);
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    const active = isShadowStepActive(fighter);
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * (active ? 7 : 2.5));
    ctx.strokeStyle = active ? "#7be8ff" : "#875bff";
    ctx.lineWidth = active ? 5 : 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 7 + i * 8, i * 0.7 + time, i * 0.7 + time + TAU * 0.22);
      ctx.stroke();
    }
    ctx.fillStyle = "#7be8ff";
    ctx.beginPath();
    ctx.arc(fighter.radius * 0.25, -fighter.radius * 0.18, 6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#07090f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -2, fighter.radius * 0.58, -0.25, 1.0);
    ctx.stroke();
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const active = isShadowStepActive(fighter);
    const ready = Number(fighter.customState.ninjaWallShadowTimer ?? 0) > 0;
    if (!active && !ready) {
      return;
    }

    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    const pulse = Math.sin(time * 12) * 3;
    ctx.strokeStyle = active ? "rgba(123, 232, 255, 0.78)" : "rgba(135, 91, 255, 0.55)";
    ctx.lineWidth = active ? 5 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 13 + pulse, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < (active ? 5 : 3); i += 1) {
      const angle = time * 3 + i * (TAU / 5);
      ctx.fillStyle = active ? "rgba(123, 232, 255, 0.55)" : "rgba(16, 22, 40, 0.45)";
      ctx.beginPath();
      ctx.ellipse(Math.cos(angle) * (fighter.radius + 16), Math.sin(angle) * (fighter.radius + 16), 9, 3, angle, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
};

function getRemainingDashes(fighter: { customState: Record<string, number | boolean | string> }): number {
  return Math.max(0, Math.floor(Number(fighter.customState.shadowStepRemainingDashes ?? 0)));
}

function isShadowStepActive(fighter: { customState: Record<string, number | boolean | string> }): boolean {
  return Number(fighter.customState.shadowStepDashTimer ?? 0) > 0 || Number(fighter.customState.shadowStepDashDelayTimer ?? 0) > 0;
}

function getEvadeChance(fighter: {
  customState: Record<string, number | boolean | string>;
  runModifiers: { ninjaEvadeBonus: number };
}): number {
  const shadowBonus = Number(fighter.customState.ninjaWallShadowTimer ?? 0) > 0 ? BALANCE.ninja.wallShadowEvadeBonus : 0;
  return clamp(BALANCE.ninja.projectileEvadeChance + fighter.runModifiers.ninjaEvadeBonus + shadowBonus, 0, 0.35);
}

function startShadowDash({ game, self, enemy }: FighterClassContext): void {
  const remaining = getRemainingDashes(self);
  if (remaining <= 0) {
    return;
  }

  const target = game.getTargetPointFor(self, enemy, 0.1);
  const angle = angleTo(self.position, target.position);
  self.setVelocity(fromAngle(angle, BALANCE.ninja.shadowStepDashSpeed), "dash-start");
  self.customState.shadowStepRemainingDashes = remaining - 1;
  self.customState.shadowStepDashTimer = Math.max(
    0.08,
    BALANCE.ninja.shadowStepDashDuration + self.runModifiers.ninjaDashDurationBonus
  );
  self.customState.shadowStepDashHasHit = false;
}
