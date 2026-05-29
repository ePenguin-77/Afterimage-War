import type { DamageContext, FighterClass, FighterClassContext } from "./FighterClass";
import { BALANCE, BLADE, MOVEMENT } from "../tuning";
import { TAU, angleTo, circleOverlap, clamp, fromAngle, randomRange } from "../utils/math";

export const BladeClass: FighterClass = {
  id: "blade",
  displayName: "Blade Ball",
  primaryColor: "#50e35e",
  secondaryColor: "#c7ff4f",
  outlineColor: "#142018",
  role: "melee",
  roleLabel: "Melee Burst",
  shortDescription: "Performs a longer straight-line dash and deals impact damage on collision.",
  baseHP: BALANCE.blade.hp,
  baseMoveSpeed: BALANCE.blade.targetMoveSpeed,
  targetMoveSpeed: BALANCE.blade.targetMoveSpeed,
  mass: 1,
  restitution: 1,
  minSpeed: BALANCE.blade.minSpeed,
  maxSpeed: BALANCE.blade.maxSpeed,
  contactDamage: BALANCE.blade.contactDamage,
  contactDamageCooldown: BALANCE.blade.contactDamageCooldown,
  dashSpeed: BALANCE.blade.dashSpeed,
  dashDamage: BALANCE.blade.dashDamage,
  dashDuration: BALANCE.blade.dashDuration,
  baseDamage: 3,
  scalingStatName: "Damage",
  abilityName: "DASH",
  abilityDescription: "Dash farther in a straight line and strike on fighter collision.",
  abilityChargeRate: BALANCE.blade.abilityMeterGainRate,

  modifyIncomingDamage({ amount, self, kind }: DamageContext): number {
    const dashing = Number(self.customState.bladeDashTimer ?? 0) > 0;
    if (kind === "projectile" || kind === "ability") {
      const reduction = dashing
        ? BALANCE.blade.projectileDamageReductionDuringDash + self.runModifiers.dashGuardReductionBonus
        : BALANCE.blade.projectileDamageReduction;
      return amount * (1 - Math.min(0.75, reduction));
    }

    if (kind === "burn") {
      const reduction = dashing
        ? BALANCE.blade.burnDamageReductionDuringDash + self.runModifiers.dashGuardReductionBonus
        : BALANCE.blade.burnDamageReduction;
      return amount * (1 - Math.min(0.75, reduction));
    }

    return amount;
  },

  updatePassiveScaling({ self, dt, game }: FighterClassContext): void {
    self.scalingValue = clamp(self.scalingValue + dt * 0.055 * game.intensityMultiplier, 3, 7.3);
  },

  updateAI(context: FighterClassContext): void {
    const { self, enemy, dt, game } = context;
    const dashTimer = Number(self.customState.bladeDashTimer ?? 0);

    if (dashTimer > 0) {
      const nextDashTimer = Math.max(0, dashTimer - dt);
      self.customState.bladeDashTimer = nextDashTimer;
      if (nextDashTimer <= 0) {
        self.normalizeToTargetSpeed("speed-normalize");
      }

      if (
        !self.customState.bladeDashHit &&
        circleOverlap(
          self.position,
          self.radius + BALANCE.blade.dashGrazeRadiusBonus + self.runModifiers.dashGrazeRadiusBonus,
          enemy.position,
          enemy.radius
        )
      ) {
        const fullHit = circleOverlap(self.position, self.radius + 7, enemy.position, enemy.radius);
        const damage = (self.classDef.dashDamage ?? BALANCE.blade.dashDamage) * BLADE.dashDamageMultiplier;
        enemy.takeDamage(fullHit ? damage : damage * BALANCE.blade.dashGrazeDamageMultiplier, self, game, {
          knockback: MOVEMENT.tinyHitNudge,
          hitColor: this.secondaryColor,
          ignoreCooldown: true,
          damageKind: "dash"
        });
        self.customState.bladeDashHit = true;
        game.spawnSlashBurst(enemy.position, angleTo(self.position, enemy.position));
      }
      return;
    }

    const dist = self.distanceTo(enemy);

    if (self.contactCooldown <= 0 && dist < self.radius + enemy.radius + 16) {
      this.basicAttack(context);
      self.contactCooldown = self.classDef.contactDamageCooldown ?? BALANCE.blade.contactDamageCooldown;
    }

    if (Math.random() < dt * 3.2) {
      game.spawnBladeSpark(self.position, this.secondaryColor);
    }
  },

  basicAttack({ game, self, enemy }: FighterClassContext): void {
    const damage = self.classDef.contactDamage ?? BALANCE.blade.contactDamage;
    const hit = enemy.takeDamage(damage, self, game, {
      knockback: MOVEMENT.tinyHitNudge,
      hitColor: this.secondaryColor,
      damageKind: "contact"
    });

    if (hit) {
      game.spawnSlashBurst(enemy.position, angleTo(self.position, enemy.position));
    }
  },

  specialAbility({ game, self, enemy }: FighterClassContext): void {
    const target = game.getTargetPointFor(self, enemy);
    const angle = angleTo(self.position, target.position);
    self.setVelocity(fromAngle(angle, self.classDef.dashSpeed ?? BLADE.dashSpeed), "dash-start");
    self.customState.bladeDashTimer = (self.classDef.dashDuration ?? BLADE.dashDuration) + self.runModifiers.dashDurationBonus;
    self.customState.bladeDashHit = false;
    game.addShake(5);
    game.spawnAbilityText("DASH", self.classDef.secondaryColor, self.position);
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    const dash = Number(fighter.customState.bladeDashTimer ?? 0);
    const speedAngle = fighter.distanceTravelSpeed > 10 ? angleTo({ x: 0, y: 0 }, fighter.velocity) : time * 2.8;
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(speedAngle + Math.sin(time * 9) * 0.18);
    ctx.translate(fighter.radius + 17 + dash * 42, 0);
    ctx.fillStyle = dash > 0 ? "#ecff8b" : "#c8ff48";
    ctx.strokeStyle = "#142018";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(-9, -8);
    ctx.lineTo(-18, 0);
    ctx.lineTo(-9, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const dash = Number(fighter.customState.bladeDashTimer ?? 0);
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * 3.2);
    ctx.strokeStyle = dash > 0 ? "rgba(220, 255, 76, 0.9)" : "rgba(90, 224, 78, 0.45)";
    ctx.lineWidth = dash > 0 ? 5 : 3;
    for (let i = 0; i < 2; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 8 + i * 9, randomRange(0, 0.1), TAU * 0.38 + i * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }
};
