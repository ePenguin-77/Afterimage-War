import { Projectile } from "../entities/Projectile";
import { BALANCE } from "../tuning";
import type { DamageContext, FighterClass, FighterClassContext } from "./FighterClass";
import { TAU, angleTo, fromAngle, randomRange } from "../utils/math";

export const VampireClass: FighterClass = {
  id: "vampire",
  displayName: "Vampire Ball",
  primaryColor: "#6f1020",
  secondaryColor: "#ff8fa3",
  outlineColor: "#17070b",
  role: "support",
  roleLabel: "Lifesteal / Comeback",
  shortDescription: "Steals life from damage dealt and becomes stronger when wounded.",
  baseHP: BALANCE.vampire.hp,
  baseMoveSpeed: BALANCE.vampire.targetMoveSpeed,
  targetMoveSpeed: BALANCE.vampire.targetMoveSpeed,
  mass: 1,
  restitution: 1,
  minSpeed: BALANCE.vampire.minSpeed,
  maxSpeed: BALANCE.vampire.maxSpeed,
  contactDamage: BALANCE.vampire.contactDamage,
  contactDamageCooldown: BALANCE.vampire.contactDamageCooldown,
  baseDamage: BALANCE.vampire.projectileDamage,
  scalingStatName: "Lifesteal",
  abilityName: "BLOOD FEAST",
  abilityDescription: "Temporarily increases lifesteal and damage when Vampire Ball is wounded.",
  abilityChargeRate: BALANCE.vampire.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    return `${Math.round(getLifestealPercent(fighter) * 100)}%`;
  },

  updatePassiveScaling({ self }: FighterClassContext): void {
    self.scalingValue = getLifestealPercent(self);
  },

  updateAI(context: FighterClassContext): void {
    const { self, enemy, dt, game } = context;
    const feastTimer = Number(self.customState.bloodFeastTimer ?? 0);

    if (self.attackCooldown <= 0 && self.distanceTo(enemy) < 560) {
      this.basicAttack(context);
      self.attackCooldown = BALANCE.vampire.attackInterval * self.runModifiers.attackIntervalMultiplier;
    }

    const woundedChargeBonus = getWoundedAbilityChargeMultiplier(self) * getBloodRushMultiplier(self) - 1;
    if (woundedChargeBonus > 0 && !game.physicsTestMode) {
      self.ability.fill(dt * BALANCE.vampire.abilityMeterGainRate * woundedChargeBonus * self.runModifiers.abilityChargeMultiplier);
    }

    if (Math.random() < dt * (feastTimer > 0 ? 5 : 2.4)) {
      game.spawnVampireSpark(self.position, feastTimer > 0 ? "#ff3f5f" : this.secondaryColor);
    }
  },

  onDamageDealt({ game, self, amount, kind }: DamageContext): void {
    if (!isLifestealKind(kind) || amount <= 0) {
      return;
    }

    self.heal(amount * getLifestealPercent(self), self, game, "lifesteal");
  },

  basicAttack({ game, self, enemy }: FighterClassContext): void {
    const target = game.getTargetPointFor(self, enemy, 0.14);
    const angle = angleTo(self.position, target.position) + randomRange(-0.08, 0.08);
    const spawn = {
      x: self.position.x + Math.cos(angle) * (self.radius + 14),
      y: self.position.y + Math.sin(angle) * (self.radius + 14)
    };

    game.projectiles.push(
      new Projectile({
        owner: self,
        position: spawn,
        velocity: fromAngle(angle, BALANCE.vampire.projectileSpeed),
        radius: 13,
        damage: BALANCE.vampire.projectileDamage,
        color: "#7b1020",
        secondaryColor: this.secondaryColor,
        life: 1.45,
        kind: "bloodShard"
      })
    );
  },

  specialAbility({ game, self }: FighterClassContext): void {
    self.customState.bloodFeastTimer =
      (BALANCE.vampire.bloodFeastDuration + self.runModifiers.bloodFeastDurationBonus) * self.runModifiers.abilityDurationMultiplier;
    game.spawnAbilityText("BLOOD FEAST", this.secondaryColor, self.position);
    for (let i = 0; i < 10; i += 1) {
      game.spawnVampireSpark(self.position, i % 2 === 0 ? "#ff3f5f" : "#2a050c");
    }
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * 3.1);
    for (let i = 0; i < 3; i += 1) {
      const angle = i * (TAU / 3);
      const r = fighter.radius + 16 + Math.sin(time * 5 + i) * 3;
      ctx.save();
      ctx.translate(Math.cos(angle) * r, Math.sin(angle) * r);
      ctx.rotate(angle + time);
      ctx.fillStyle = i === 0 ? "#ffe2e6" : this.secondaryColor;
      ctx.strokeStyle = "#17070b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-2, -7);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-2, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const feastTimer = Number(fighter.customState.bloodFeastTimer ?? 0);
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.shadowColor = feastTimer > 0 ? "#ff3f5f" : this.secondaryColor;
    ctx.shadowBlur = feastTimer > 0 ? 18 : 10;
    ctx.strokeStyle = feastTimer > 0 ? "rgba(255, 63, 95, 0.62)" : "rgba(255, 143, 163, 0.38)";
    ctx.lineWidth = feastTimer > 0 ? 4 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 9 + Math.sin(time * 6) * 3, 0, TAU);
    ctx.stroke();

    const speedAngle = angleTo({ x: 0, y: 0 }, fighter.velocity);
    ctx.rotate(speedAngle + Math.PI);
    const gradient = ctx.createLinearGradient(0, 0, 80, 0);
    gradient.addColorStop(0, feastTimer > 0 ? "rgba(255, 63, 95, 0.42)" : "rgba(255, 143, 163, 0.3)");
    gradient.addColorStop(1, "rgba(42, 5, 12, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(fighter.radius * 0.75, 0, feastTimer > 0 ? 78 : 62, feastTimer > 0 ? 18 : 13, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
};

function isLifestealKind(kind: DamageContext["kind"]): boolean {
  return kind === "projectile" || kind === "contact" || kind === "ability";
}

function getLifestealPercent(fighter: { customState: Record<string, number | boolean | string>; runModifiers: { vampireLifestealBonus: number } }): number {
  let percent = BALANCE.vampire.baseLifestealPercent + fighter.runModifiers.vampireLifestealBonus;
  if (Number(fighter.customState.bloodFeastTimer ?? 0) > 0) {
    percent += BALANCE.vampire.bloodFeastLifestealBonus;
  }
  if (Number(fighter.customState.lastDropTimer ?? 0) > 0) {
    percent += 0.2;
  }
  return Math.min(0.75, percent);
}

function getWoundedAbilityChargeMultiplier(fighter: { hp: number }): number {
  if (fighter.hp <= BALANCE.vampire.criticalHpThreshold) {
    return BALANCE.vampire.criticalHpAbilityChargeMultiplier;
  }
  if (fighter.hp <= BALANCE.vampire.lowHpThreshold) {
    return BALANCE.vampire.lowHpAbilityChargeMultiplier;
  }
  return 1;
}

function getBloodRushMultiplier(fighter: { hp: number; runModifiers: { bloodRushChargeMultiplier: number } }): number {
  return fighter.hp <= 50 ? fighter.runModifiers.bloodRushChargeMultiplier : 1;
}
