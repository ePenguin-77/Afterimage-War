import { getPoisonStacks } from "../combat/statusEffects";
import { Projectile } from "../entities/Projectile";
import { BALANCE } from "../tuning";
import type { FighterClass, FighterClassContext } from "./FighterClass";
import { TAU, angleTo, fromAngle, randomRange } from "../utils/math";

export const PoisonClass: FighterClass = {
  id: "poison",
  displayName: "Poison Ball",
  primaryColor: "#7b4dff",
  secondaryColor: "#9eff58",
  outlineColor: "#21143f",
  role: "control",
  roleLabel: "Damage Over Time / Debuff",
  shortDescription: "Applies long poison damage and slows enemy ability charging.",
  baseHP: BALANCE.poison.hp,
  baseMoveSpeed: BALANCE.poison.targetMoveSpeed,
  targetMoveSpeed: BALANCE.poison.targetMoveSpeed,
  mass: 1,
  restitution: 1,
  minSpeed: BALANCE.poison.minSpeed,
  maxSpeed: BALANCE.poison.maxSpeed,
  baseDamage: BALANCE.poison.projectileDamage,
  scalingStatName: "Poison",
  abilityName: "TOXIC CLOUD",
  abilityDescription: "Releases a poisonous cloud that damages and weakens enemies over time.",
  abilityChargeRate: BALANCE.poison.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    return `${getPoisonStacks(fighter)}/${BALANCE.poison.maxPoisonStacks}`;
  },

  updatePassiveScaling({ self, enemy }: FighterClassContext): void {
    self.scalingValue = getPoisonStacks(enemy);
  },

  updateAI(context: FighterClassContext): void {
    const { self, enemy, dt, game } = context;
    if (self.attackCooldown <= 0 && self.distanceTo(enemy) < 570) {
      this.basicAttack(context);
      self.attackCooldown = BALANCE.poison.attackInterval * self.runModifiers.attackIntervalMultiplier;
    }

    if (Math.random() < dt * 2.6) {
      game.spawnPoisonSpark(self.position, this.secondaryColor);
    }
  },

  basicAttack({ game, self, enemy }: FighterClassContext): void {
    const target = game.getTargetPointFor(self, enemy, 0.14);
    const angle = angleTo(self.position, target.position) + randomRange(-0.08, 0.08);
    const spawn = {
      x: self.position.x + Math.cos(angle) * (self.radius + 13),
      y: self.position.y + Math.sin(angle) * (self.radius + 13)
    };

    game.projectiles.push(
      new Projectile({
        owner: self,
        position: spawn,
        velocity: fromAngle(angle, BALANCE.poison.projectileSpeed),
        radius: 13,
        damage: BALANCE.poison.projectileDamage,
        color: "#7b4dff",
        secondaryColor: this.secondaryColor,
        life: 1.45,
        kind: "venom",
        poison: {
          damagePerSecond: BALANCE.poison.poisonDamagePerSecond,
          duration:
            BALANCE.poison.poisonDuration *
            self.runModifiers.poisonDurationMultiplier *
            self.runModifiers.statusDurationMultiplier,
          stacks: 1,
          maxStacks: BALANCE.poison.maxPoisonStacks
        }
      })
    );
  },

  specialAbility({ game, self }: FighterClassContext): void {
    const radius = BALANCE.poison.cloudRadius + self.runModifiers.toxicCloudRadiusBonus;
    game.spawnToxicCloud(self, self.position, {
      radius,
      duration:
        BALANCE.poison.cloudDuration *
        self.runModifiers.abilityDurationMultiplier *
        self.runModifiers.poisonDurationMultiplier *
        self.runModifiers.statusDurationMultiplier,
      tickInterval: BALANCE.poison.cloudTickInterval,
      directDamage: BALANCE.poison.cloudDirectDamagePerTick,
      poisonStacks: BALANCE.poison.cloudPoisonStacksApplied,
      poisonDuration:
        BALANCE.poison.poisonDuration *
        self.runModifiers.poisonDurationMultiplier *
        self.runModifiers.statusDurationMultiplier
    });
    game.spawnAbilityText("TOXIC CLOUD", this.secondaryColor, self.position);
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * 2.7);
    for (let i = 0; i < 4; i += 1) {
      const angle = i * (TAU / 4);
      const r = fighter.radius + 13 + Math.sin(time * 5 + i) * 3;
      ctx.fillStyle = i % 2 === 0 ? "#9eff58" : "#c7ff87";
      ctx.strokeStyle = "#21143f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 6, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.shadowColor = this.secondaryColor;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "rgba(158, 255, 88, 0.48)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 7 + i * 7, time * 0.8 + i, time * 0.8 + i + TAU * 0.36);
      ctx.stroke();
    }

    const speedAngle = angleTo({ x: 0, y: 0 }, fighter.velocity);
    ctx.rotate(speedAngle + Math.PI);
    const gradient = ctx.createLinearGradient(0, 0, 70, 0);
    gradient.addColorStop(0, "rgba(158, 255, 88, 0.34)");
    gradient.addColorStop(0.5, "rgba(123, 77, 255, 0.26)");
    gradient.addColorStop(1, "rgba(123, 77, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(fighter.radius * 0.7, 0, 66, 14, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
};
