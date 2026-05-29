import { applyBurn } from "../combat/statusEffects";
import { Projectile } from "../entities/Projectile";
import { BALANCE } from "../tuning";
import type { FighterClass, FighterClassContext } from "./FighterClass";
import { TAU, angleTo, fromAngle, randomRange } from "../utils/math";

const TRAIL_TIMER = "fireTrailTimer";

export const FireClass: FighterClass = {
  id: "fire",
  displayName: "Fire Ball",
  primaryColor: "#f0522d",
  secondaryColor: "#ffd166",
  outlineColor: "#3a170e",
  role: "burst",
  roleLabel: "Burn / Area Pressure",
  shortDescription: "Applies burn over time with ember shots and a wide fire wave.",
  baseHP: BALANCE.fire.hp,
  baseMoveSpeed: BALANCE.fire.targetMoveSpeed,
  targetMoveSpeed: BALANCE.fire.targetMoveSpeed,
  mass: 1,
  restitution: 1,
  minSpeed: BALANCE.fire.minSpeed,
  maxSpeed: BALANCE.fire.maxSpeed,
  baseDamage: BALANCE.fire.projectileDamage,
  scalingStatName: "Burn DPS",
  abilityName: "FLAME BURST",
  abilityDescription: "Releases a wide fire wave, dealing damage and applying burn to enemies in range.",
  abilityChargeRate: BALANCE.fire.abilityMeterGainRate,

  formatScalingStat(): string {
    return `${BALANCE.fire.burnDamagePerSecond.toFixed(1)}/s`;
  },

  updatePassiveScaling({ self }: FighterClassContext): void {
    self.scalingValue = BALANCE.fire.burnDamagePerSecond;
  },

  updateAI(context: FighterClassContext): void {
    const { self, enemy, dt, game } = context;
    const dist = self.distanceTo(enemy);

    if (self.attackCooldown <= 0 && dist < 570) {
      this.basicAttack(context);
      self.attackCooldown = BALANCE.fire.attackInterval * self.runModifiers.attackIntervalMultiplier;
    }

    const trailTimer = Math.max(0, Number(self.customState[TRAIL_TIMER] ?? 0) - dt);
    if (trailTimer <= 0) {
      self.customState[TRAIL_TIMER] = BALANCE.fire.trailPatchSpawnInterval;
      game.spawnFireSpark(self.position, this.secondaryColor);
    } else {
      self.customState[TRAIL_TIMER] = trailTimer;
    }
  },

  basicAttack({ game, self, enemy }: FighterClassContext): void {
    const target = game.getTargetPointFor(self, enemy, 0.14);
    const angle = angleTo(self.position, target.position) + randomRange(-0.09, 0.09);
    const spawn = {
      x: self.position.x + Math.cos(angle) * (self.radius + 13),
      y: self.position.y + Math.sin(angle) * (self.radius + 13)
    };

    game.projectiles.push(
      new Projectile({
        owner: self,
        position: spawn,
        velocity: fromAngle(angle, BALANCE.fire.projectileSpeed),
        radius: 13,
        damage: BALANCE.fire.projectileDamage,
        color: "#ff5a2f",
        secondaryColor: this.secondaryColor,
        life: 1.45,
        kind: "ember",
        burn: {
          damagePerSecond: BALANCE.fire.burnDamagePerSecond,
          duration: BALANCE.fire.burnDuration * self.runModifiers.burnDurationMultiplier,
          stacks: 1,
          maxStacks: BALANCE.fire.maxBurnStacks
        }
      })
    );
  },

  specialAbility({ game, self, enemy }: FighterClassContext): void {
    const radius = BALANCE.fire.flameBurstRadius + self.runModifiers.flameBurstRadiusBonus;
    const inRange = self.distanceTo(enemy) <= radius + enemy.radius;
    game.spawnFlameBurstEffect(self.position, radius, inRange);
    game.spawnAbilityText("FLAME BURST", this.secondaryColor, self.position);

    if (!inRange) {
      return;
    }

    enemy.takeDamage(BALANCE.fire.flameBurstDamage, self, game, {
      hitColor: this.secondaryColor,
      ignoreCooldown: true,
      damageKind: "ability"
    });
    applyBurn(enemy, self, {
      damagePerSecond: BALANCE.fire.burnDamagePerSecond,
      duration: BALANCE.fire.flameBurstBurnDuration * self.runModifiers.burnDurationMultiplier,
      stacks: BALANCE.fire.flameBurstBurnStacks,
      maxStacks: BALANCE.fire.maxBurnStacks
    });
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * 4.2);
    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * TAU;
      const x = Math.cos(angle) * 43;
      const y = Math.sin(angle) * 43;
      const flame = 1 + Math.sin(time * 9 + i) * 0.16;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + time);
      ctx.fillStyle = i % 2 === 0 ? "#ffd166" : "#ff6b2f";
      ctx.strokeStyle = "#3a170e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -13 * flame);
      ctx.quadraticCurveTo(13, -3, 5, 13);
      ctx.quadraticCurveTo(-10, 5, 0, -13 * flame);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.shadowColor = "#ff6b2f";
    ctx.shadowBlur = 14;
    for (let i = 0; i < 4; i += 1) {
      const angle = time * 2.2 + i * (TAU / 4);
      const r = fighter.radius + 7 + Math.sin(time * 7 + i) * 3;
      ctx.fillStyle = i % 2 === 0 ? "rgba(255, 209, 102, 0.72)" : "rgba(255, 91, 47, 0.62)";
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 5 + Math.sin(time * 8 + i) * 1.5, 0, TAU);
      ctx.fill();
    }

    const speedAngle = angleTo({ x: 0, y: 0 }, fighter.velocity);
    ctx.rotate(speedAngle + Math.PI);
    const gradient = ctx.createLinearGradient(0, 0, 74, 0);
    gradient.addColorStop(0, "rgba(255, 209, 102, 0.38)");
    gradient.addColorStop(1, "rgba(255, 91, 47, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(fighter.radius * 0.75, 0, 70, 16, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
};
