import { Projectile } from "../entities/Projectile";
import { BALANCE } from "../tuning";
import type { FighterClass, FighterClassContext } from "./FighterClass";
import { TAU, Vec2, angleTo, fromAngle, randomRange } from "../utils/math";

const BARRAGE_SHOTS_LEFT = "ricochetBarrageShotsLeft";
const BARRAGE_SHOT_TIMER = "ricochetBarrageShotTimer";

export const RicochetClass: FighterClass = {
  id: "ricochet",
  displayName: "Ricochet Ball",
  primaryColor: "#f8fdff",
  secondaryColor: "#28d9c8",
  outlineColor: "#24303a",
  role: "ranged",
  roleLabel: "Trick Shot / Wall Bounce",
  shortDescription: "Fires shots that bounce off walls and gain damage after each ricochet.",
  baseHP: BALANCE.ricochet.hp,
  baseMoveSpeed: BALANCE.ricochet.targetMoveSpeed,
  targetMoveSpeed: BALANCE.ricochet.targetMoveSpeed,
  mass: BALANCE.ricochet.mass,
  restitution: BALANCE.ricochet.restitution,
  minSpeed: BALANCE.ricochet.minSpeed,
  maxSpeed: BALANCE.ricochet.maxSpeed,
  baseDamage: BALANCE.ricochet.projectileDamage,
  scalingStatName: "Bounce",
  abilityName: "BANK SHOT BARRAGE",
  abilityDescription: "Fires bouncing shots that gain damage after each wall ricochet.",
  abilityChargeRate: BALANCE.ricochet.abilityMeterGainRate,

  formatScalingStat(): string {
    return `${BALANCE.ricochet.maxProjectileBounces} / +${Math.round(BALANCE.ricochet.damageBonusPerBounce * 100)}%`;
  },

  updatePassiveScaling({ self }: FighterClassContext): void {
    self.scalingValue = Number(self.customState[BARRAGE_SHOTS_LEFT] ?? 0);
  },

  updateAI(context: FighterClassContext): void {
    const { self, enemy, dt, game } = context;
    updateBarrage(context);

    if (self.attackCooldown <= 0 && self.distanceTo(enemy) < 610) {
      fireRicochetShot(context, {
        baseDamage: BALANCE.ricochet.projectileDamage,
        speed: BALANCE.ricochet.projectileSpeed,
        maxBounces: BALANCE.ricochet.maxProjectileBounces + self.runModifiers.ricochetMaxBouncesBonus,
        damageBonusPerBounce: BALANCE.ricochet.damageBonusPerBounce + self.runModifiers.ricochetDamageBonusPerBounceBonus,
        life: BALANCE.ricochet.projectileLifetime,
        leadTime: BALANCE.ricochet.predictiveLeadTime,
        angleOffset: randomRange(-0.05, 0.05),
        aimMode: Math.random() < BALANCE.ricochet.bankShotChance ? "bank" : "direct",
        bankWall: chooseBankWall(context, 0),
        kind: "bankShot",
        damageKind: "projectile"
      });
      self.attackCooldown = BALANCE.ricochet.attackInterval * self.runModifiers.attackIntervalMultiplier;
    }

    if (Math.random() < dt * 3.1) {
      game.spawnRicochetSpark(self.position, this.secondaryColor);
    }
  },

  basicAttack(context: FighterClassContext): void {
    fireRicochetShot(context, {
      baseDamage: BALANCE.ricochet.projectileDamage,
      speed: BALANCE.ricochet.projectileSpeed,
      maxBounces: BALANCE.ricochet.maxProjectileBounces + context.self.runModifiers.ricochetMaxBouncesBonus,
      damageBonusPerBounce: BALANCE.ricochet.damageBonusPerBounce + context.self.runModifiers.ricochetDamageBonusPerBounceBonus,
      life: BALANCE.ricochet.projectileLifetime,
      leadTime: BALANCE.ricochet.predictiveLeadTime,
      angleOffset: randomRange(-0.05, 0.05),
      aimMode: Math.random() < BALANCE.ricochet.bankShotChance ? "bank" : "direct",
      bankWall: chooseBankWall(context, 0),
      kind: "bankShot",
      damageKind: "projectile"
    });
  },

  specialAbility({ game, self }: FighterClassContext): void {
    self.customState[BARRAGE_SHOTS_LEFT] = BALANCE.ricochet.barrageShotCount + self.runModifiers.ricochetBarrageShotBonus;
    self.customState[BARRAGE_SHOT_TIMER] = 0;
    self.stats.bankShotBarrageUses += 1;
    game.spawnAbilityText("BANK SHOT BARRAGE", this.secondaryColor, self.position);
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * 3.4);
    for (let i = 0; i < 4; i += 1) {
      const angle = i * (TAU / 4);
      const x = Math.cos(angle) * (fighter.radius + 16);
      const y = Math.sin(angle) * (fighter.radius + 16);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = i % 2 === 0 ? this.secondaryColor : "#ff9d36";
      ctx.strokeStyle = this.outlineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(-7, -6);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-7, 6);
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
    ctx.strokeStyle = "rgba(40, 217, 200, 0.52)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 2; i += 1) {
      const start = time * (2.2 + i * 0.6) + i * 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 9 + i * 8, start, start + TAU * 0.28);
      ctx.stroke();
    }

    const speedAngle = angleTo({ x: 0, y: 0 }, fighter.velocity);
    ctx.rotate(speedAngle + Math.PI);
    ctx.strokeStyle = "rgba(255, 157, 54, 0.34)";
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(fighter.radius * 0.35, (i - 1) * 7);
      ctx.lineTo(fighter.radius + 58, (i - 1) * 7);
      ctx.stroke();
    }
    ctx.restore();
  }
};

function updateBarrage(context: FighterClassContext): void {
  const { self, dt } = context;
  const shotsLeft = Number(self.customState[BARRAGE_SHOTS_LEFT] ?? 0);
  if (shotsLeft <= 0) {
    return;
  }

  const timer = Number(self.customState[BARRAGE_SHOT_TIMER] ?? 0) - dt;
  if (timer > 0) {
    self.customState[BARRAGE_SHOT_TIMER] = timer;
    return;
  }

  const total = BALANCE.ricochet.barrageShotCount + self.runModifiers.ricochetBarrageShotBonus;
  const firedIndex = total - shotsLeft;
  const offsets = [-0.5, -0.24, 0, 0.24, 0.5, -0.72, 0.72, 0.95];
  const aimMode = firedIndex <= 1 ? "direct" : firedIndex >= 5 ? "bank" : "direct";
  fireRicochetShot(context, {
    baseDamage: BALANCE.ricochet.barrageBaseDamage,
    speed: BALANCE.ricochet.barrageProjectileSpeed,
    maxBounces: BALANCE.ricochet.barrageMaxBounces + self.runModifiers.ricochetMaxBouncesBonus,
    damageBonusPerBounce: BALANCE.ricochet.barrageDamageBonusPerBounce + self.runModifiers.ricochetDamageBonusPerBounceBonus,
    life: BALANCE.ricochet.projectileLifetime,
    leadTime: firedIndex <= 1 ? 0.28 : 0.2,
    angleOffset: (offsets[firedIndex % offsets.length] ?? 0) + randomRange(-0.04, 0.04),
    aimMode,
    bankWall: chooseBankWall(context, firedIndex),
    kind: "barrageBankShot",
    damageKind: "ability"
  });
  self.customState[BARRAGE_SHOTS_LEFT] = shotsLeft - 1;
  self.customState[BARRAGE_SHOT_TIMER] = BALANCE.ricochet.barrageShotInterval;
}

function fireRicochetShot(
  { game, self, enemy }: FighterClassContext,
  options: {
    baseDamage: number;
    speed: number;
    maxBounces: number;
    damageBonusPerBounce: number;
    life: number;
    leadTime: number;
    angleOffset: number;
    aimMode: "direct" | "bank";
    bankWall: "left" | "right" | "top" | "bottom";
    kind: "bankShot" | "barrageBankShot";
    damageKind: "projectile" | "ability";
  }
): void {
  const target = game.getTargetPointFor(self, enemy, options.leadTime);
  const aimPosition = options.aimMode === "bank" ? mirrorPointAcrossWall(target.position, game.arenaInner, options.bankWall) : target.position;
  const angle = angleTo(self.position, aimPosition) + options.angleOffset;
  const spawn = {
    x: self.position.x + Math.cos(angle) * (self.radius + 15),
    y: self.position.y + Math.sin(angle) * (self.radius + 15)
  };

  game.projectiles.push(
    new Projectile({
      owner: self,
      position: spawn,
      velocity: fromAngle(angle, options.speed),
      radius: BALANCE.ricochet.projectileRadius,
      damage: options.baseDamage,
      color: "#f8fdff",
      secondaryColor: self.classDef.secondaryColor,
      life: options.life,
      kind: options.kind,
      damageKind: options.damageKind,
      maxBounces: options.maxBounces,
      damageBonusPerBounce: options.damageBonusPerBounce,
      bankAbilityBonus: BALANCE.ricochet.bankAbilityBonus,
      perfectBankAbilityBonus: BALANCE.ricochet.perfectBankAbilityBonus,
      bouncedHitRadiusBonus: BALANCE.ricochet.bouncedHitRadiusBonus,
      perfectBankHitRadiusBonus: BALANCE.ricochet.perfectBankHitRadiusBonus,
      perfectBankFlatDamage: BALANCE.ricochet.perfectBankFlatDamage
    })
  );
  self.stats.ricochetShotsFired += 1;
}

function chooseBankWall({ game, self, enemy }: FighterClassContext, salt: number): "left" | "right" | "top" | "bottom" {
  const dxLeft = Math.abs(enemy.position.x - game.arenaInner.x);
  const dxRight = Math.abs(game.arenaInner.x + game.arenaInner.w - enemy.position.x);
  const dyTop = Math.abs(enemy.position.y - game.arenaInner.y);
  const dyBottom = Math.abs(game.arenaInner.y + game.arenaInner.h - enemy.position.y);
  const horizontalWall = dxLeft < dxRight ? "left" : "right";
  const verticalWall = dyTop < dyBottom ? "top" : "bottom";
  const movingMostlyHorizontal = Math.abs(enemy.velocity.x) > Math.abs(enemy.velocity.y);
  if (salt % 3 === 1) {
    return movingMostlyHorizontal ? verticalWall : horizontalWall;
  }
  if (salt % 3 === 2) {
    return Math.abs(self.position.x - enemy.position.x) > Math.abs(self.position.y - enemy.position.y) ? verticalWall : horizontalWall;
  }
  return movingMostlyHorizontal ? horizontalWall : verticalWall;
}

function mirrorPointAcrossWall(point: Vec2, bounds: { x: number; y: number; w: number; h: number }, wall: "left" | "right" | "top" | "bottom"): Vec2 {
  if (wall === "left") {
    return { x: bounds.x * 2 - point.x, y: point.y };
  }
  if (wall === "right") {
    return { x: (bounds.x + bounds.w) * 2 - point.x, y: point.y };
  }
  if (wall === "top") {
    return { x: point.x, y: bounds.y * 2 - point.y };
  }
  return { x: point.x, y: (bounds.y + bounds.h) * 2 - point.y };
}
