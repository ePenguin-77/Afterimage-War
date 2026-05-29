import { Projectile } from "../entities/Projectile";
import { BALANCE } from "../tuning";
import type { DamageContext, FighterClass, FighterClassContext } from "./FighterClass";
import { TAU, angleTo, fromAngle, randomRange } from "../utils/math";

export const MirrorClass: FighterClass = {
  id: "mirror",
  displayName: "Mirror Ball",
  primaryColor: "#8fd5e6",
  secondaryColor: "#f3fbff",
  outlineColor: "#223542",
  role: "support",
  roleLabel: "Illusion / Evasion",
  shortDescription: "Creates decoys that absorb attacks, shatter into counter shards, and help evade burst damage.",
  baseHP: BALANCE.mirror.hp,
  baseMoveSpeed: BALANCE.mirror.targetMoveSpeed,
  targetMoveSpeed: BALANCE.mirror.targetMoveSpeed,
  mass: BALANCE.mirror.mass,
  restitution: BALANCE.mirror.restitution,
  minSpeed: BALANCE.mirror.minSpeed,
  maxSpeed: BALANCE.mirror.maxSpeed,
  baseDamage: BALANCE.mirror.projectileDamage,
  scalingStatName: "Decoys",
  abilityName: "MIRROR SPLIT",
  abilityDescription: "Creates decoys that absorb attacks, shatter into counter shards, and help Mirror Ball evade burst damage.",
  abilityChargeRate: BALANCE.mirror.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    return `${Number(fighter.customState.mirrorActiveDecoys ?? 0)}/${getDecoyCount(fighter)}`;
  },

  modifyIncomingDamage({ game, self, amount, kind }: DamageContext): number {
    const phaseKind = kind === "contact" || kind === "dash" || kind === "collision";
    if (phaseKind && Number(self.customState.mirrorPhaseCooldown ?? 0) <= 0) {
      const prevented = amount * BALANCE.mirror.phaseReflectionReduction;
      self.customState.mirrorPhaseCooldown = BALANCE.mirror.phaseReflectionCooldown;
      self.stats.phaseReflectionTriggers += 1;
      self.stats.damagePreventedByPhaseReflection += prevented;
      game.spawnAbilityText("PHASE", this.secondaryColor, self.position);
      game.spawnMirrorShatter(self.position, this.secondaryColor);
      game.spawnMirrorEmergencyDecoy(self);
      return amount - prevented;
    }

    if (kind !== "projectile") {
      return amount;
    }

    const activeDecoys = Number(self.customState.mirrorActiveDecoys ?? 0);
    const splitBonus = activeDecoys > 0 ? BALANCE.mirror.splitEvadeBonus : 0;
    const evadeChance = Math.min(0.42, BALANCE.mirror.projectileEvadeChance + self.runModifiers.mirrorEvadeBonus + splitBonus);
    if (Math.random() > evadeChance) {
      return amount;
    }

    self.stats.projectileEvades += 1;
    game.spawnAbilityText("MISS", this.secondaryColor, self.position);
    game.spawnMirrorShatter(self.position, this.secondaryColor);
    return 0;
  },

  updatePassiveScaling({ game, self, dt }: FighterClassContext): void {
    self.customState.mirrorPhaseCooldown = Math.max(0, Number(self.customState.mirrorPhaseCooldown ?? 0) - dt);
    self.customState.mirrorActiveDecoys = game.mirrorDecoys.filter((decoy) => decoy.owner === self && decoy.active).length;
    self.scalingValue = Number(self.customState.mirrorActiveDecoys ?? 0);
    if (Math.random() < dt * 3.4) {
      game.spawnMirrorSpark(self.position, this.secondaryColor);
    }
  },

  updateAI(context: FighterClassContext): void {
    const { self, enemy, dt, game } = context;
    if (self.attackCooldown <= 0 && self.distanceTo(enemy) < 570) {
      this.basicAttack(context);
      const activeDecoys = Number(self.customState.mirrorActiveDecoys ?? 0);
      const splitTempo = activeDecoys > 0 ? BALANCE.mirror.splitAttackIntervalMultiplier : 1;
      self.attackCooldown = BALANCE.mirror.attackInterval * splitTempo * self.runModifiers.attackIntervalMultiplier;
    }

    if (Math.random() < dt * 2.4) {
      game.spawnMirrorSpark(self.position, this.secondaryColor);
    }
  },

  basicAttack({ game, self, enemy }: FighterClassContext): void {
    const target = game.getTargetPointFor(self, enemy, 0.18);
    const angle = angleTo(self.position, target.position) + randomRange(-0.075, 0.075);
    const spawn = {
      x: self.position.x + Math.cos(angle) * (self.radius + 14),
      y: self.position.y + Math.sin(angle) * (self.radius + 14)
    };
    const bonusDamage = Math.random() < BALANCE.mirror.sparkleBonusChance ? BALANCE.mirror.sparkleBonusDamage : 0;

    game.projectiles.push(
      new Projectile({
        owner: self,
        position: spawn,
        velocity: fromAngle(angle, BALANCE.mirror.projectileSpeed),
        radius: 12,
        damage: BALANCE.mirror.projectileDamage + bonusDamage,
        color: "#f7fdff",
        secondaryColor: this.secondaryColor,
        life: 1.35,
        kind: "refraction"
      })
    );
  },

  specialAbility({ game, self }: FighterClassContext): void {
    game.spawnMirrorDecoys(self);
    self.stats.mirrorSplitUses += 1;
    game.spawnAbilityText("MIRROR SPLIT", this.secondaryColor, self.position);
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * 2.8);
    ctx.strokeStyle = this.secondaryColor;
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i += 1) {
      const angle = i * (TAU / 4);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * (fighter.radius + 7), Math.sin(angle) * (fighter.radius + 7));
      ctx.lineTo(Math.cos(angle + 0.15) * (fighter.radius + 22), Math.sin(angle + 0.15) * (fighter.radius + 22));
      ctx.stroke();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.shadowColor = this.secondaryColor;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "rgba(243, 251, 255, 0.56)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, fighter.radius + 12, fighter.radius + 4, Math.sin(time * 2) * 0.25, 0, TAU);
    ctx.stroke();

    const speedAngle = angleTo({ x: 0, y: 0 }, fighter.velocity);
    ctx.rotate(speedAngle + Math.PI);
    const trail = ctx.createLinearGradient(0, 0, 78, 0);
    trail.addColorStop(0, "rgba(243, 251, 255, 0.36)");
    trail.addColorStop(0.5, "rgba(143, 213, 230, 0.28)");
    trail.addColorStop(1, "rgba(143, 213, 230, 0)");
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.ellipse(fighter.radius * 0.7, 0, 74, 13, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
};

function getDecoyCount(fighter: { runModifiers: { mirrorDecoyCountBonus: number } }): number {
  return BALANCE.mirror.decoyCount + fighter.runModifiers.mirrorDecoyCountBonus;
}
