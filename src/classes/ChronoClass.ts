import { Projectile } from "../entities/Projectile";
import { BALANCE, CHRONO } from "../tuning";
import type { DamageContext, FighterClass, FighterClassContext } from "./FighterClass";
import { TAU, angleTo, clamp, fromAngle, randomRange } from "../utils/math";

const TIME_STOP_TIMER = "chronoTimeStopTimer";
const EMERGENCY_STASIS_TIMER = "chronoEmergencyStasisTimer";
const EMERGENCY_STASIS_USED = "chronoEmergencyStasisUsed";

export const ChronoClass: FighterClass = {
  id: "chrono",
  displayName: "Chrono Ball",
  primaryColor: "#98a6b8",
  secondaryColor: "#dff6ff",
  outlineColor: "#1f2734",
  role: "control",
  roleLabel: "Time Burst / Control",
  shortDescription: "Stops the enemy briefly and fires rapid time shards during the frozen moment.",
  baseHP: BALANCE.chrono.hp,
  baseMoveSpeed: BALANCE.chrono.targetMoveSpeed,
  targetMoveSpeed: BALANCE.chrono.targetMoveSpeed,
  mass: 1,
  restitution: 1,
  minSpeed: BALANCE.chrono.minSpeed,
  maxSpeed: BALANCE.chrono.maxSpeed,
  contactDamage: 0,
  contactDamageCooldown: 0.5,
  baseDamage: BALANCE.chrono.projectileDamage,
  scalingStatName: "Attack Speed",
  abilityName: "TIME STOP",
  abilityDescription: "Stops the enemy briefly and massively accelerates Chrono's attacks during the stop.",
  abilityChargeRate: BALANCE.chrono.abilityMeterGainRate,

  modifyIncomingDamage({ amount, kind, source, self, game }: DamageContext): number {
    let adjustedAmount = amount;
    if (kind === "contact" || kind === "dash" || kind === "collision") {
      adjustedAmount *= 1 - BALANCE.chrono.phaseBufferCollisionReduction - self.runModifiers.collisionDamageReductionBonus;
    }

    if (kind === "ability" && source.classDef.id === "thunder") {
      adjustedAmount *= 1 - BALANCE.chrono.temporalGuardLightningReduction - self.runModifiers.lightningDamageReductionBonus;
    }

    const emergencyActive = Number(self.customState[EMERGENCY_STASIS_TIMER] ?? 0) > 0;
    if (emergencyActive) {
      return adjustedAmount * (1 - BALANCE.chrono.emergencyStasisDamageReduction);
    }

    const canTriggerEmergency =
      kind === "contact" || kind === "dash" || kind === "collision" || (kind === "ability" && source.classDef.id === "thunder");
    const wouldDropLow = self.hp - adjustedAmount <= BALANCE.chrono.emergencyStasisThreshold;
    if (canTriggerEmergency && !self.customState[EMERGENCY_STASIS_USED] && wouldDropLow) {
      self.customState[EMERGENCY_STASIS_USED] = true;
      self.customState[EMERGENCY_STASIS_TIMER] = BALANCE.chrono.emergencyStasisDuration;
      game.spawnAbilityText("STASIS", self.classDef.secondaryColor, self.position);
      return adjustedAmount * (1 - BALANCE.chrono.emergencyStasisDamageReduction);
    }

    return adjustedAmount;
  },

  updatePassiveScaling({ self, dt, game }: FighterClassContext): void {
    self.customState[EMERGENCY_STASIS_TIMER] = Math.max(0, Number(self.customState[EMERGENCY_STASIS_TIMER] ?? 0) - dt);
    self.scalingValue = clamp(
      self.scalingValue + dt * BALANCE.chrono.attackSpeedGrowth * game.intensityMultiplier,
      BALANCE.chrono.startingAttackSpeed,
      BALANCE.chrono.maxAttackSpeed
    );

    if (Number(self.customState[EMERGENCY_STASIS_TIMER] ?? 0) > 0 && Math.random() < dt * 10) {
      game.spawnTimeDust(self.position, this.secondaryColor);
    }
  },

  updateAI(context: FighterClassContext): void {
    const { self, enemy, dt } = context;
    const dist = self.distanceTo(enemy);
    const timeStopTimer = Math.max(0, Number(self.customState[TIME_STOP_TIMER] ?? 0) - dt);
    self.customState[TIME_STOP_TIMER] = timeStopTimer;
    const timeStopActive = timeStopTimer > 0;
    const timeStopMultiplier = timeStopActive ? BALANCE.chrono.timeStopAttackIntervalMultiplier : 1;

    if (self.attackCooldown <= 0 && dist < 560) {
      this.basicAttack(context);
      self.attackCooldown = Math.max(
        timeStopActive ? 0.16 : BALANCE.chrono.minimumAttackInterval,
        (BALANCE.chrono.baseAttackInterval * timeStopMultiplier * self.runModifiers.attackIntervalMultiplier) / self.scalingValue
      );
    }

    if (Math.random() < dt * (timeStopActive ? 7 : 1.8)) {
      context.game.spawnTimeDust(self.position, this.secondaryColor);
    }
  },

  basicAttack({ game, self, enemy }: FighterClassContext): void {
    const target = game.getTargetPointFor(self, enemy, BALANCE.chrono.predictiveLeadTime + self.runModifiers.predictiveLeadBonus);
    const angle = angleTo(self.position, target.position) + randomRange(-0.045, 0.045);
    const spawn = {
      x: self.position.x + Math.cos(angle) * (self.radius + 15),
      y: self.position.y + Math.sin(angle) * (self.radius + 15)
    };

    game.projectiles.push(
      new Projectile({
        owner: self,
        position: spawn,
        velocity: fromAngle(angle, BALANCE.chrono.projectileSpeed),
        radius: 15,
        damage: self.classDef.baseDamage + self.scalingValue * 0.08,
        color: "#ffffff",
        secondaryColor: this.secondaryColor,
        life: 1.55
      })
    );
  },

  specialAbility({ game, self, enemy }: FighterClassContext): void {
    const duration =
      (CHRONO.timeStopDuration + self.runModifiers.timeStopDurationBonus) *
      self.runModifiers.statusDurationMultiplier *
      self.runModifiers.abilityDurationMultiplier;
    if (game.tryAbsorbSingleTargetAbility(self, enemy, this.secondaryColor)) {
      game.spawnAbilityText("REFLECTED", self.classDef.secondaryColor, self.position);
      return;
    }

    game.stasisTimer = duration;
    game.addShake(7);
    self.customState[TIME_STOP_TIMER] = duration;
    self.attackCooldown = 0;
    enemy.applyTimeStop(duration);
    for (let i = 0; i < 14; i += 1) {
      game.spawnTimeDust(enemy.position, this.secondaryColor);
    }

    game.spawnAbilityText("TIME STOP", self.classDef.secondaryColor, self.position);
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * 2.4);
    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * TAU;
      const x = Math.cos(angle) * 47;
      const y = Math.sin(angle) * 47;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + time * 2);
      ctx.fillStyle = "#f5fdff";
      ctx.strokeStyle = "#253043";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-5, -5);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.strokeStyle = "rgba(129, 207, 242, 0.42)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 2; i += 1) {
      const r = fighter.radius + 10 + i * 10 + Math.sin(time * 2.2 + i) * 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU * (0.78 + i * 0.08));
      ctx.stroke();
    }
    ctx.restore();
  }
};
