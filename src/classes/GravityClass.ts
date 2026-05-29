import { applyGravityStatus } from "../combat/statusEffects";
import { Projectile } from "../entities/Projectile";
import { BALANCE } from "../tuning";
import type { FighterClass, FighterClassContext } from "./FighterClass";
import { TAU, angleTo, fromAngle, randomRange } from "../utils/math";

export const GravityClass: FighterClass = {
  id: "gravity",
  displayName: "Gravity Ball",
  primaryColor: "#2b174d",
  secondaryColor: "#bda4ff",
  outlineColor: "#0d0718",
  role: "control",
  roleLabel: "Gravity / Suppression",
  shortDescription: "Suppresses enemy speed, bounce energy, and ability charging inside a gravity field.",
  baseHP: BALANCE.gravity.hp,
  baseMoveSpeed: BALANCE.gravity.targetMoveSpeed,
  targetMoveSpeed: BALANCE.gravity.targetMoveSpeed,
  mass: BALANCE.gravity.mass,
  restitution: BALANCE.gravity.restitution,
  minSpeed: BALANCE.gravity.minSpeed,
  maxSpeed: BALANCE.gravity.maxSpeed,
  contactDamage: BALANCE.gravity.contactDamage,
  contactDamageCooldown: BALANCE.gravity.contactDamageCooldown,
  baseDamage: BALANCE.gravity.projectileDamage,
  scalingStatName: "Gravity",
  abilityName: "GRAVITY WELL",
  abilityDescription: "Creates a heavy field that greatly slows movement, weakens bounces, and delays ability charge.",
  abilityChargeRate: BALANCE.gravity.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    return Number(fighter.customState.gravityWellTimer ?? 0) > 0 ? "Active" : "Mark";
  },

  updatePassiveScaling({ self }: FighterClassContext): void {
    self.scalingValue = Number(self.customState.gravityWellTimer ?? 0);
  },

  updateAI(context: FighterClassContext): void {
    const { self, enemy, dt, game } = context;
    self.customState.gravityWellTimer = Math.max(0, Number(self.customState.gravityWellTimer ?? 0) - dt);

    if (self.attackCooldown <= 0 && self.distanceTo(enemy) < 560) {
      this.basicAttack(context);
      self.attackCooldown = BALANCE.gravity.attackInterval * self.runModifiers.attackIntervalMultiplier;
    }

    if (self.contactCooldown <= 0 && self.distanceTo(enemy) < self.radius + enemy.radius + 12) {
      enemy.takeDamage(BALANCE.gravity.contactDamage, self, game, {
        hitColor: this.secondaryColor,
        ignoreCooldown: true,
        damageKind: "contact"
      });
      applyGravityStatus(enemy, self, createGravityMarkOptions(self, BALANCE.gravity.contactMarkDuration));
      self.contactCooldown = BALANCE.gravity.contactDamageCooldown;
    }

    if (Math.random() < dt * 2.2) {
      game.spawnGravitySpark(self.position, this.secondaryColor);
    }
  },

  basicAttack({ game, self, enemy }: FighterClassContext): void {
    const target = game.getTargetPointFor(self, enemy, 0.12);
    const angle = angleTo(self.position, target.position) + randomRange(-0.07, 0.07);
    const spawn = {
      x: self.position.x + Math.cos(angle) * (self.radius + 15),
      y: self.position.y + Math.sin(angle) * (self.radius + 15)
    };

    game.projectiles.push(
      new Projectile({
        owner: self,
        position: spawn,
        velocity: fromAngle(angle, BALANCE.gravity.projectileSpeed),
        radius: 14,
        damage: BALANCE.gravity.projectileDamage,
        color: "#2b174d",
        secondaryColor: this.secondaryColor,
        life: 1.5,
        kind: "gravityPulse",
        gravity: createGravityMarkOptions(self, BALANCE.gravity.gravityMarkDuration + self.runModifiers.gravityMarkDurationBonus)
      })
    );
  },

  specialAbility({ game, self }: FighterClassContext): void {
    const radius = BALANCE.gravity.wellRadius + self.runModifiers.gravityWellRadiusBonus;
    const duration = (BALANCE.gravity.wellDuration + self.runModifiers.gravityWellDurationBonus) * self.runModifiers.abilityDurationMultiplier;
    self.customState.gravityWellTimer = duration;
    game.spawnGravityWell(self, self.position, {
      radius,
      duration,
      speedMultiplier: withSuppressionBonus(BALANCE.gravity.wellSpeedMultiplier, self.runModifiers.gravitySuppressionBonus),
      abilityChargeMultiplier: withSuppressionBonus(BALANCE.gravity.wellAbilityChargeMultiplier, self.runModifiers.gravitySuppressionBonus),
      restitutionMultiplier: withSuppressionBonus(BALANCE.gravity.wellRestitutionMultiplier, self.runModifiers.gravitySuppressionBonus)
    });
    game.spawnAbilityText("GRAVITY WELL", this.secondaryColor, self.position);
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * 1.7);
    ctx.strokeStyle = this.secondaryColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, fighter.radius + 19, fighter.radius + 8, 0, 0, TAU);
    ctx.stroke();

    for (let i = 0; i < 3; i += 1) {
      const angle = time * 2 + i * (TAU / 3);
      ctx.fillStyle = i === 0 ? "#f4f0ff" : this.secondaryColor;
      ctx.strokeStyle = "#0d0718";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * (fighter.radius + 18), Math.sin(angle) * (fighter.radius + 8), 5, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.strokeStyle = "rgba(189, 164, 255, 0.42)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 9 + i * 9 + Math.sin(time * 3 + i) * 2, time * 0.7 + i, time * 0.7 + i + TAU * 0.48);
      ctx.stroke();
    }
    ctx.restore();
  }
};

function createGravityMarkOptions(self: { runModifiers: { gravitySuppressionBonus: number } }, duration: number) {
  return {
    type: "gravity-mark" as const,
    duration,
    speedMultiplier: withSuppressionBonus(BALANCE.gravity.gravityMarkSpeedMultiplier, self.runModifiers.gravitySuppressionBonus),
    abilityChargeMultiplier: withSuppressionBonus(
      BALANCE.gravity.gravityMarkAbilityChargeMultiplier,
      self.runModifiers.gravitySuppressionBonus
    ),
    restitutionMultiplier: withSuppressionBonus(
      BALANCE.gravity.gravityMarkRestitutionMultiplier,
      self.runModifiers.gravitySuppressionBonus
    )
  };
}

function withSuppressionBonus(multiplier: number, bonus: number): number {
  return Math.max(BALANCE.gravity.minimumSuppressedSpeedMultiplier, multiplier - bonus);
}
