import { Projectile } from "../entities/Projectile";
import { BALANCE } from "../tuning";
import type { DamageContext, FighterClass, FighterClassContext, WallBounceContext } from "./FighterClass";
import { TAU, angleTo, clamp, fromAngle, randomRange } from "../utils/math";

const STATIC_CHARGE = "thunderStaticCharge";
const CHAIN_HITS = "thunderChainHits";
const CHAIN_TIMER = "thunderChainTimer";
const CHAIN_DAMAGE = "thunderChainDamage";
const CHARGE_COOLDOWN = "thunderChargeCooldown";

export const ThunderClass: FighterClass = {
  id: "thunder",
  displayName: "Thunder Ball",
  primaryColor: "#22b8ff",
  secondaryColor: "#fff36a",
  outlineColor: "#10283d",
  role: "burst",
  roleLabel: "Speed / Chain",
  shortDescription: "Builds static charge from wall bounces and releases chain lightning.",
  baseHP: BALANCE.thunder.hp,
  baseMoveSpeed: BALANCE.thunder.targetMoveSpeed,
  targetMoveSpeed: BALANCE.thunder.targetMoveSpeed,
  mass: BALANCE.thunder.mass,
  restitution: BALANCE.thunder.restitution,
  minSpeed: BALANCE.thunder.minSpeed,
  maxSpeed: BALANCE.thunder.maxSpeed,
  baseDamage: BALANCE.thunder.projectileDamage,
  scalingStatName: "Static",
  abilityName: "LIGHTNING CHAIN",
  abilityDescription: "Releases chain lightning after building electric charge.",
  abilityChargeRate: BALANCE.thunder.abilityMeterGainRate,

  modifyIncomingDamage({ amount, self, kind }: DamageContext): number {
    if (getCharge(self) < BALANCE.thunder.overchargeGuardMinCharge) {
      return amount;
    }

    if (kind === "projectile") {
      return amount * (1 - BALANCE.thunder.overchargeProjectileReduction);
    }

    if (kind === "burn" || kind === "poison") {
      return amount * (1 - BALANCE.thunder.overchargeBurnReduction);
    }

    if (kind === "contact" || kind === "dash" || kind === "collision") {
      return amount * (1 - BALANCE.thunder.overchargeCollisionReduction);
    }

    return amount;
  },

  formatScalingStat(fighter): string {
    return `${getCharge(fighter)}/${getMaxCharge(fighter)}`;
  },

  updatePassiveScaling({ self }: FighterClassContext): void {
    self.scalingValue = getCharge(self);
  },

  onWallBounce({ game, self, collision }: WallBounceContext): void {
    if (Number(self.customState[CHARGE_COOLDOWN] ?? 0) > 0) {
      game.spawnThunderSpark(collision.point, "rgba(255, 243, 106, 0.45)");
      return;
    }

    const charge = clamp(
      getCharge(self) + BALANCE.thunder.staticChargeGainOnWallBounce,
      0,
      getMaxCharge(self)
    );
    self.customState[STATIC_CHARGE] = charge;
    self.customState[CHARGE_COOLDOWN] = BALANCE.thunder.staticChargeGainCooldown * self.runModifiers.staticChargeCooldownMultiplier;
    game.spawnThunderSpark(collision.point, this.secondaryColor);
  },

  updateAI(context: FighterClassContext): void {
    const { self, enemy, dt, game } = context;
    updateChainPulses(context, this);
    self.customState[CHARGE_COOLDOWN] = Math.max(0, Number(self.customState[CHARGE_COOLDOWN] ?? 0) - dt);

    if (self.attackCooldown <= 0 && self.distanceTo(enemy) < 590) {
      this.basicAttack(context);
      self.attackCooldown = BALANCE.thunder.attackInterval * self.runModifiers.attackIntervalMultiplier;
    }

    if (Math.random() < dt * 6.5) {
      game.spawnThunderSpark(self.position, this.secondaryColor);
    }
  },

  basicAttack({ game, self, enemy }: FighterClassContext): void {
    const target = game.getTargetPointFor(self, enemy, 0.12);
    const angle = angleTo(self.position, target.position) + randomRange(-0.07, 0.07);
    const spawn = {
      x: self.position.x + Math.cos(angle) * (self.radius + 14),
      y: self.position.y + Math.sin(angle) * (self.radius + 14)
    };

    game.projectiles.push(
      new Projectile({
        owner: self,
        position: spawn,
        velocity: fromAngle(angle, BALANCE.thunder.projectileSpeed),
        radius: 12,
        damage: BALANCE.thunder.projectileDamage,
        color: "#22b8ff",
        secondaryColor: this.secondaryColor,
        life: 1.25,
        kind: "sparkBolt"
      })
    );
  },

  specialAbility({ game, self }: FighterClassContext): void {
    const charge = getCharge(self);
    const hits = Math.min(BALANCE.thunder.lightningMaxHits, 1 + Math.floor(charge / 2));
    const damage = BALANCE.thunder.lightningBaseDamage + charge * BALANCE.thunder.lightningDamagePerCharge;
    self.customState[CHAIN_HITS] = hits;
    self.customState[CHAIN_TIMER] = 0;
    self.customState[CHAIN_DAMAGE] = damage;
    self.customState[STATIC_CHARGE] = 0;
    game.spawnAbilityText("LIGHTNING CHAIN", this.secondaryColor, self.position);
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    const charge = getCharge(fighter);
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * 5.2);
    ctx.strokeStyle = this.secondaryColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = this.secondaryColor;
    ctx.shadowBlur = 10;
    for (let i = 0; i < 2 + Math.min(3, charge); i += 1) {
      const angle = (i / Math.max(2, 2 + charge)) * TAU;
      const r = fighter.radius + 13 + (i % 2) * 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      ctx.lineTo(Math.cos(angle + 0.18) * (r + 12), Math.sin(angle + 0.18) * (r + 12));
      ctx.lineTo(Math.cos(angle - 0.08) * (r + 20), Math.sin(angle - 0.08) * (r + 20));
      ctx.stroke();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const charge = getCharge(fighter);
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.strokeStyle = `rgba(34, 184, 255, ${0.36 + charge * 0.08})`;
    ctx.lineWidth = 3;
    ctx.rotate(-time * 4.5);
    for (let i = 0; i < 3; i += 1) {
      const start = i * (TAU / 3) + Math.sin(time * 9 + i) * 0.18;
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 7 + i * 5, start, start + 0.45 + charge * 0.04);
      ctx.stroke();
    }

    const speedAngle = angleTo({ x: 0, y: 0 }, fighter.velocity);
    ctx.rotate(speedAngle + Math.PI + time * 4.5);
    const trail = ctx.createLinearGradient(0, 0, 82, 0);
    trail.addColorStop(0, "rgba(255, 243, 106, 0.45)");
    trail.addColorStop(0.45, "rgba(34, 184, 255, 0.34)");
    trail.addColorStop(1, "rgba(34, 184, 255, 0)");
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.ellipse(fighter.radius * 0.75, 0, 78, 13, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
};

function getCharge(fighter: { customState: Record<string, number | boolean | string> }): number {
  return Number(fighter.customState[STATIC_CHARGE] ?? 0);
}

function getMaxCharge(fighter: { customState: Record<string, number | boolean | string>; runModifiers?: { staticChargeMaxBonus: number } }): number {
  return BALANCE.thunder.staticChargeMax + (fighter.runModifiers?.staticChargeMaxBonus ?? 0);
}

function updateChainPulses({ game, self, enemy, dt }: FighterClassContext, classDef: FighterClass): void {
  const hits = Number(self.customState[CHAIN_HITS] ?? 0);
  if (hits <= 0 || enemy.defeated) {
    return;
  }

  const timer = Number(self.customState[CHAIN_TIMER] ?? 0) - dt;
  if (timer > 0) {
    self.customState[CHAIN_TIMER] = timer;
    return;
  }

  const damage = Number(self.customState[CHAIN_DAMAGE] ?? BALANCE.thunder.lightningBaseDamage);
  if (game.tryAbsorbSingleTargetAbility(self, enemy, classDef.secondaryColor)) {
    self.customState[CHAIN_HITS] = hits - 1;
    self.customState[CHAIN_TIMER] = BALANCE.thunder.lightningPulseDelay;
    return;
  }

  enemy.takeDamage(damage, self, game, {
    hitColor: classDef.secondaryColor,
    ignoreCooldown: true,
    damageKind: "ability"
  });
  game.spawnLightningChainEffect(self.position, enemy.position, classDef.primaryColor, classDef.secondaryColor);
  game.spawnThunderSpark(enemy.position, classDef.secondaryColor);
  self.customState[CHAIN_HITS] = hits - 1;
  self.customState[CHAIN_TIMER] = BALANCE.thunder.lightningPulseDelay;
}
