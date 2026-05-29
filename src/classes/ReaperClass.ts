import { applyDeathMark, consumeDeathMarks, getDeathMarkStacks } from "../combat/statusEffects";
import { Projectile } from "../entities/Projectile";
import { BALANCE } from "../tuning";
import type { DamageContext, FighterClass, FighterClassContext } from "./FighterClass";
import { TAU, angleTo, clamp, fromAngle, randomRange } from "../utils/math";

const CONTACT_MARK_COOLDOWN = "reaperContactMarkCooldown";

export const ReaperClass: FighterClass = {
  id: "reaper",
  displayName: "Reaper Ball",
  primaryColor: "#21142c",
  secondaryColor: "#e8fbff",
  outlineColor: "#0a0710",
  role: "burst",
  roleLabel: "Execute / Death Mark",
  shortDescription: "Applies Death Marks and consumes them to execute wounded enemies.",
  baseHP: BALANCE.reaper.hp,
  baseMoveSpeed: BALANCE.reaper.targetMoveSpeed,
  targetMoveSpeed: BALANCE.reaper.targetMoveSpeed,
  mass: BALANCE.reaper.mass,
  restitution: BALANCE.reaper.restitution,
  minSpeed: BALANCE.reaper.minSpeed,
  maxSpeed: BALANCE.reaper.maxSpeed,
  contactDamage: BALANCE.reaper.contactDamage,
  contactDamageCooldown: BALANCE.reaper.contactDamageCooldown,
  baseDamage: BALANCE.reaper.projectileDamage,
  scalingStatName: "Marks",
  abilityName: "SOUL REAP",
  abilityDescription: "Consumes Death Marks to deal execute damage against wounded enemies.",
  abilityChargeRate: BALANCE.reaper.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    return `${Math.round(fighter.scalingValue)}/${BALANCE.reaper.maxDeathMarks}`;
  },

  updatePassiveScaling({ self, enemy, dt }: FighterClassContext): void {
    self.scalingValue = getDeathMarkStacks(enemy, self);
    self.customState[CONTACT_MARK_COOLDOWN] = Math.max(0, Number(self.customState[CONTACT_MARK_COOLDOWN] ?? 0) - dt);
  },

  updateAI(context: FighterClassContext): void {
    const { self, enemy, dt, game } = context;
    if (self.attackCooldown <= 0 && self.distanceTo(enemy) < 590) {
      this.basicAttack(context);
      self.attackCooldown = BALANCE.reaper.attackInterval * self.runModifiers.attackIntervalMultiplier;
    }

    if (self.contactCooldown <= 0 && self.distanceTo(enemy) < self.radius + enemy.radius + 12) {
      enemy.takeDamage(BALANCE.reaper.contactDamage, self, game, {
        hitColor: this.secondaryColor,
        knockback: 0,
        damageKind: "contact"
      });
      self.contactCooldown = BALANCE.reaper.contactDamageCooldown;
    }

    if (Math.random() < dt * 2.7) {
      game.spawnReaperSpark(self.position, this.secondaryColor);
    }
  },

  basicAttack({ game, self, enemy }: FighterClassContext): void {
    const target = game.getTargetPointFor(self, enemy, BALANCE.reaper.predictiveLeadTime);
    const angle = angleTo(self.position, target.position) + randomRange(-0.06, 0.06);
    const spawn = {
      x: self.position.x + Math.cos(angle) * (self.radius + 15),
      y: self.position.y + Math.sin(angle) * (self.radius + 15)
    };

    game.projectiles.push(
      new Projectile({
        owner: self,
        position: spawn,
        velocity: fromAngle(angle, BALANCE.reaper.projectileSpeed),
        radius: 13,
        damage: BALANCE.reaper.projectileDamage,
        color: "#21142c",
        secondaryColor: this.secondaryColor,
        life: 1.45,
        kind: "soulBlade",
        deathMark: {
          duration: BALANCE.reaper.deathMarkDuration + self.runModifiers.deathMarkDurationBonus,
          stacks: 1,
          maxStacks: BALANCE.reaper.maxDeathMarks
        }
      })
    );
  },

  specialAbility({ game, self, enemy }: FighterClassContext): void {
    const marks = consumeDeathMarks(enemy, self);
    const executeThreshold = BALANCE.reaper.executeThreshold + self.runModifiers.reaperExecuteThresholdBonus;
    const executeActive = enemy.hp <= executeThreshold;
    let damage =
      BALANCE.reaper.soulReapBaseDamage +
      marks * BALANCE.reaper.soulReapDamagePerMark * self.runModifiers.soulReapDamagePerMarkMultiplier;
    if (executeActive) {
      damage += BALANCE.reaper.executeBonusDamage;
      self.stats.executeBonusTriggers += 1;
    }
    if (self.runModifiers.reaperFinalWhisper && !self.runModifiers.reaperFinalWhisperUsed && enemy.hp <= 25) {
      self.runModifiers.reaperFinalWhisperUsed = true;
      damage += 3;
      game.spawnAbilityText("FINAL WHISPER", this.secondaryColor, self.position);
    }

    enemy.takeDamage(damage, self, game, {
      hitColor: this.secondaryColor,
      ignoreCooldown: true,
      damageKind: "ability"
    });
    self.stats.soulReapUses += 1;
    self.stats.deathMarksOnSoulReap += marks;
    game.addShake(clamp(4 + marks, 4, 9));
    for (let i = 0; i < 16; i += 1) {
      game.spawnReaperSpark(enemy.position, i % 2 === 0 ? this.secondaryColor : this.primaryColor);
    }
    game.spawnAbilityText(executeActive ? "EXECUTE" : "SOUL REAP", this.secondaryColor, enemy.position);
  },

  onDamageDealt({ game, self, enemy, kind, amount }: DamageContext): void {
    if (amount <= 0) {
      return;
    }
    if (kind === "contact" && Number(self.customState[CONTACT_MARK_COOLDOWN] ?? 0) <= 0) {
      applyDeathMark(enemy, self, {
        duration: BALANCE.reaper.deathMarkDuration + self.runModifiers.deathMarkDurationBonus,
        stacks: 1,
        maxStacks: BALANCE.reaper.maxDeathMarks
      });
      self.customState[CONTACT_MARK_COOLDOWN] = BALANCE.reaper.contactMarkCooldown;
      game.spawnReaperSpark(enemy.position, this.secondaryColor);
    } else if (kind === "ability") {
      self.stats.soulReapDamage += amount;
    }
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * 1.8);
    ctx.strokeStyle = this.secondaryColor;
    ctx.lineWidth = 4;
    ctx.shadowColor = this.secondaryColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 18, -0.9, 0.95);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fighter.radius + 7, -12);
    ctx.lineTo(fighter.radius + 22, 0);
    ctx.lineTo(fighter.radius + 6, 12);
    ctx.stroke();
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.strokeStyle = "rgba(232, 251, 255, 0.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const angle = time * (1.2 + i * 0.25) + (i / 3) * TAU;
      const x = Math.cos(angle) * (fighter.radius + 13 + i * 4);
      const y = Math.sin(angle) * (fighter.radius + 13 + i * 4);
      ctx.beginPath();
      ctx.arc(x, y, 4 + i, 0, TAU);
      ctx.stroke();
    }

    const speedAngle = angleTo({ x: 0, y: 0 }, fighter.velocity);
    ctx.rotate(speedAngle + Math.PI);
    const trail = ctx.createLinearGradient(0, 0, 74, 0);
    trail.addColorStop(0, "rgba(232, 251, 255, 0.28)");
    trail.addColorStop(0.6, "rgba(82, 54, 118, 0.18)");
    trail.addColorStop(1, "rgba(33, 20, 44, 0)");
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.ellipse(fighter.radius * 0.68, 0, 70, 14, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
};
