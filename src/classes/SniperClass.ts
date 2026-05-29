import { Projectile } from "../entities/Projectile";
import type { Fighter } from "../entities/Fighter";
import { BALANCE } from "../tuning";
import type { FighterClass, FighterClassContext } from "./FighterClass";
import { TAU, angleTo, clamp, distance, dot, fromAngle, safeNormalize, type Vec2 } from "../utils/math";

export const SniperClass: FighterClass = {
  id: "sniper",
  displayName: "Sniper Ball",
  primaryColor: "#182333",
  secondaryColor: "#ff334d",
  outlineColor: "#070a10",
  role: "ranged",
  roleLabel: "Long-range Charged Shot",
  shortDescription: "Charges powerful long-range shots and fires a piercing beam at vulnerable targets.",
  baseHP: BALANCE.sniper.hp,
  baseMoveSpeed: BALANCE.sniper.targetMoveSpeed,
  targetMoveSpeed: BALANCE.sniper.targetMoveSpeed,
  mass: BALANCE.sniper.mass,
  restitution: BALANCE.sniper.restitution,
  minSpeed: BALANCE.sniper.minSpeed,
  maxSpeed: BALANCE.sniper.maxSpeed,
  baseDamage: BALANCE.sniper.chargedShotDamage,
  scalingStatName: "Charge",
  abilityName: "DEADEYE BEAM",
  abilityDescription: "Locks onto a target and fires a powerful piercing beam after a short charge.",
  abilityChargeRate: BALANCE.sniper.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    const beamCharge = Number(fighter.customState.deadeyeBeamChargeTimer ?? 0);
    if (beamCharge > 0) {
      return isDeadeyeAimLocked(fighter) ? "Lock" : "Beam";
    }
    const shotCharge = getShotChargePercent(fighter);
    if (shotCharge > 0) {
      return isShotAimLocked(fighter) ? "Lock" : `${Math.round(shotCharge * 100)}%`;
    }
    return Number(fighter.customState.sniperScopeFocusTimer ?? 0) >= BALANCE.sniper.scopeFocusDelay ? "Focus" : "Ready";
  },

  updatePassiveScaling({ self, dt }: FighterClassContext): void {
    self.customState.deadeyeBeamFireVisualTimer = Math.max(0, Number(self.customState.deadeyeBeamFireVisualTimer ?? 0) - dt);
    self.customState.sniperScopeFocusTimer = Number(self.customState.sniperScopeFocusTimer ?? BALANCE.sniper.scopeFocusDelay) + dt;
    self.scalingValue = getShotChargePercent(self);
  },

  updateAI(context: FighterClassContext): void {
    const { self, dt } = context;
    if (Number(self.customState.deadeyeBeamChargeTimer ?? 0) > 0) {
      if (!isDeadeyeAimLocked(self)) {
        updateBeamDirection(context);
      }
      const pressureMultiplier = getCloseRangeChargeMultiplier(context, "beam");
      self.customState.deadeyeBeamChargeTimer = Math.max(0, Number(self.customState.deadeyeBeamChargeTimer ?? 0) - dt * pressureMultiplier);
      if (Number(self.customState.deadeyeBeamChargeTimer ?? 0) <= 0) {
        fireDeadeyeBeam(context);
      }
      return;
    }

    const chargeTimer = Math.max(0, Number(self.customState.sniperShotChargeTimer ?? 0));
    if (chargeTimer > 0) {
      if (!isShotAimLocked(self)) {
        updateAimDirection(context);
      }
      const pressureMultiplier = getCloseRangeChargeMultiplier(context, "shot");
      self.customState.sniperShotChargeTimer = Math.max(0, chargeTimer - dt * pressureMultiplier);
      if (Number(self.customState.sniperShotChargeTimer ?? 0) <= 0) {
        fireChargedShot(context);
        self.attackCooldown = BALANCE.sniper.chargedShotCooldown * self.runModifiers.attackIntervalMultiplier;
      }
      return;
    }

    if (self.attackCooldown <= 0) {
      startChargedShot(context);
    }
  },

  basicAttack(context: FighterClassContext): void {
    if (Number(context.self.customState.sniperShotChargeTimer ?? 0) <= 0) {
      startChargedShot(context);
    }
  },

  specialAbility(context: FighterClassContext): void {
    const { game, self } = context;
    const target = chooseDeadeyeTarget(self, game.getEnemies(self));
    if (!target) {
      return;
    }
    const direction = safeNormalize(
      { x: target.position.x - self.position.x, y: target.position.y - self.position.y },
      self.velocity
    );
    self.customState.deadeyeBeamChargeTimer = BALANCE.sniper.deadeyeChargeTime;
    self.customState.deadeyeBeamDirX = direction.x;
    self.customState.deadeyeBeamDirY = direction.y;
    self.customState.deadeyeBeamFireVisualTimer = 0;
    self.customState.sniperShotChargeTimer = 0;
    self.stats.deadeyeBeamUses += 1;
    game.spawnAbilityText("DEADEYE", this.secondaryColor, self.position);
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    const aimDirection = getCurrentScopeDirection(fighter);
    const angle = angleTo({ x: 0, y: 0 }, aimDirection);
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(angle);
    ctx.fillStyle = "#0d1522";
    ctx.strokeStyle = this.outlineColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(fighter.radius - 2, -6, 28, 12, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.secondaryColor;
    ctx.beginPath();
    ctx.arc(fighter.radius + 23, 0, 5, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 51, 77, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fighter.radius + 29, 0);
    ctx.lineTo(fighter.radius + 48 + Math.sin(time * 4) * 3, 0);
    ctx.stroke();
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const shotCharge = getShotChargePercent(fighter);
    const beamCharge = Number(fighter.customState.deadeyeBeamChargeTimer ?? 0);
    const beamFire = Number(fighter.customState.deadeyeBeamFireVisualTimer ?? 0);
    if (shotCharge > 0) {
      const locked = isShotAimLocked(fighter);
      drawAimLine(
        ctx,
        fighter,
        getStoredDirection(fighter, fighter.velocity),
        520,
        locked ? "rgba(255, 51, 77, 0.48)" : "rgba(255, 51, 77, 0.2)",
        locked ? 4.5 : 2 + shotCharge * 1.4
      );
    }
    if (beamCharge > 0) {
      const locked = isDeadeyeAimLocked(fighter);
      const pulse = locked ? 0.68 + Math.sin(time * 20) * 0.1 : 0.34 + Math.sin(time * 14) * 0.08;
      drawAimLine(ctx, fighter, getStoredBeamDirection(fighter), BALANCE.sniper.deadeyeRange, `rgba(255, 51, 77, ${pulse})`, locked ? 5 : 3.5);
    }
    if (beamFire > 0) {
      const alpha = clamp(beamFire / BALANCE.sniper.deadeyeFireVisualDuration, 0, 1);
      drawBeamLine(ctx, fighter, getStoredBeamDirection(fighter), BALANCE.sniper.deadeyeRange, alpha, BALANCE.sniper.deadeyeWidth);
    }

    const focusReady = Number(fighter.customState.sniperScopeFocusTimer ?? 0) >= BALANCE.sniper.scopeFocusDelay;
    if (focusReady || shotCharge > 0 || beamCharge > 0) {
      ctx.save();
      ctx.translate(fighter.position.x, fighter.position.y);
      ctx.strokeStyle = beamCharge > 0 ? "rgba(255, 51, 77, 0.62)" : "rgba(255, 51, 77, 0.34)";
      ctx.lineWidth = beamCharge > 0 ? 4 : 2;
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 12 + Math.sin(time * 6) * 2, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }
};

function startChargedShot({ game, self, enemy }: FighterClassContext): void {
  const target = game.getNearestEnemy(self) ?? enemy;
  if (!target || target.defeated) {
    return;
  }
  self.customState.sniperShotChargeDuration = getChargeTime(self);
  self.customState.sniperShotChargeTimer = getChargeTime(self);
  self.stats.chargedShotsStarted += 1;
  updateAimDirection({ game, self, enemy: target, dt: 0 });
}

function updateAimDirection({ game, self, enemy }: FighterClassContext): void {
  const target = game.getNearestEnemy(self) ?? enemy;
  const targetPoint = game.getTargetPointFor(self, target, BALANCE.sniper.predictiveLeadTime + self.runModifiers.predictiveLeadBonus);
  const direction = safeNormalize({ x: targetPoint.position.x - self.position.x, y: targetPoint.position.y - self.position.y }, self.velocity);
  self.customState.sniperAimDirX = direction.x;
  self.customState.sniperAimDirY = direction.y;
}

function updateBeamDirection({ game, self, enemy }: FighterClassContext): void {
  const target = chooseDeadeyeTarget(self, game.getEnemies(self)) ?? enemy;
  if (!target || target.defeated) {
    return;
  }
  const targetPoint = game.getTargetPointFor(self, target, Math.max(0, BALANCE.sniper.predictiveLeadTime * 0.75));
  const direction = safeNormalize({ x: targetPoint.position.x - self.position.x, y: targetPoint.position.y - self.position.y }, self.velocity);
  self.customState.deadeyeBeamDirX = direction.x;
  self.customState.deadeyeBeamDirY = direction.y;
}

function getCloseRangeChargeMultiplier({ game, self, dt }: FighterClassContext, chargeType: "shot" | "beam"): number {
  const pressured = game.getEnemies(self).some((target) => distance(self.position, target.position) <= BALANCE.sniper.closeRange);
  if (!pressured) {
    return 1;
  }
  self.stats.closeRangePressureTime += dt;
  return chargeType === "beam" ? BALANCE.sniper.closeRangeBeamChargeMultiplier : BALANCE.sniper.closeRangeShotChargeMultiplier;
}

function fireChargedShot({ game, self }: FighterClassContext): void {
  const direction = getStoredDirection(self, self.velocity);
  const angle = Math.atan2(direction.y, direction.x);
  const spawn = {
    x: self.position.x + direction.x * (self.radius + 16),
    y: self.position.y + direction.y * (self.radius + 16)
  };
  const focusReady = Number(self.customState.sniperScopeFocusTimer ?? 0) >= BALANCE.sniper.scopeFocusDelay;
  const target = game.getNearestEnemy(self);
  let damage = BALANCE.sniper.chargedShotDamage * self.runModifiers.sniperShotDamageMultiplier;
  if (target) {
    damage *= getWeakpointMultiplier(target, self);
  }
  if (focusReady) {
    damage *= 1 + BALANCE.sniper.scopeFocusBonus;
  }

  game.projectiles.push(
    new Projectile({
      owner: self,
      position: spawn,
      velocity: fromAngle(angle, BALANCE.sniper.chargedShotSpeed),
      radius: BALANCE.sniper.chargedShotRadius,
      damage,
      color: "#fff1f1",
      secondaryColor: SniperClass.secondaryColor,
      life: BALANCE.sniper.chargedShotLife,
      kind: "sniperShot",
      damageKind: "projectile",
      knockback: 0
    })
  );
  self.stats.chargedShotsFired += 1;
  self.customState.sniperScopeFocusTimer = 0;
  game.spawnAbilityText("SHOT", SniperClass.secondaryColor, self.position);
}

function fireDeadeyeBeam({ game, self }: FighterClassContext): void {
  const direction = getStoredBeamDirection(self);
  const width = BALANCE.sniper.deadeyeWidth + self.runModifiers.sniperBeamWidthBonus;
  const range = BALANCE.sniper.deadeyeRange;
  const targets = game.getEnemies(self).filter((target) => lineHitsCircle(self.position, direction, range, width / 2, target));
  self.customState.deadeyeBeamFireVisualTimer = BALANCE.sniper.deadeyeFireVisualDuration;
  for (const target of targets) {
    const beforeHp = target.hp;
    target.takeDamage(BALANCE.sniper.deadeyeDamage * self.runModifiers.sniperBeamDamageMultiplier, self, game, {
      knockback: 0,
      hitColor: SniperClass.secondaryColor,
      ignoreCooldown: true,
      damageKind: "ability"
    });
    const dealt = Math.max(0, beforeHp - target.hp);
    if (dealt > 0) {
      self.stats.deadeyeBeamHits += 1;
      self.stats.deadeyeBeamDamage += dealt;
      game.spawnAbilityText("DEADEYE", SniperClass.secondaryColor, target.position);
    }
  }
  game.addShake(targets.length > 0 ? 7 : 3);
}

function getChargeTime(fighter: Fighter): number {
  return Math.max(0.65, BALANCE.sniper.chargedShotChargeTime - fighter.runModifiers.sniperChargeTimeReduction);
}

function getShotChargePercent(fighter: Fighter): number {
  const timer = Number(fighter.customState.sniperShotChargeTimer ?? 0);
  const duration = Number(fighter.customState.sniperShotChargeDuration ?? getChargeTime(fighter));
  return timer > 0 ? clamp(1 - timer / Math.max(0.001, duration), 0, 1) : 0;
}

function isShotAimLocked(fighter: Fighter): boolean {
  const timer = Number(fighter.customState.sniperShotChargeTimer ?? 0);
  if (timer <= 0) {
    return false;
  }
  const duration = Number(fighter.customState.sniperShotChargeDuration ?? getChargeTime(fighter));
  return timer <= duration * BALANCE.sniper.chargedShotAimLockFraction;
}

function isDeadeyeAimLocked(fighter: Fighter): boolean {
  const timer = Number(fighter.customState.deadeyeBeamChargeTimer ?? 0);
  return timer > 0 && timer <= BALANCE.sniper.deadeyeFinalLockTime;
}

function getWeakpointMultiplier(target: Fighter, source: Fighter): number {
  const hpPercent = target.hp / Math.max(1, target.maxHP);
  if (hpPercent <= BALANCE.sniper.criticalWeakpointThreshold) {
    return 1 + BALANCE.sniper.criticalWeakpointBonus + source.runModifiers.sniperWeakpointBonus;
  }
  if (hpPercent <= BALANCE.sniper.weakpointThreshold) {
    return 1 + BALANCE.sniper.weakpointBonus + source.runModifiers.sniperWeakpointBonus;
  }
  return 1;
}

function chooseDeadeyeTarget(self: Fighter, enemies: Fighter[]): Fighter | null {
  return (
    [...enemies].sort(
      (a, b) =>
        a.hp / Math.max(1, a.maxHP) - b.hp / Math.max(1, b.maxHP) ||
        distance(self.position, a.position) - distance(self.position, b.position)
    )[0] ?? null
  );
}

function getStoredDirection(fighter: Fighter, fallback: Vec2): Vec2 {
  return safeNormalize(
    {
      x: Number(fighter.customState.sniperAimDirX ?? fallback.x),
      y: Number(fighter.customState.sniperAimDirY ?? fallback.y)
    },
    fallback
  );
}

function getStoredBeamDirection(fighter: Fighter): Vec2 {
  return safeNormalize(
    {
      x: Number(fighter.customState.deadeyeBeamDirX ?? fighter.velocity.x),
      y: Number(fighter.customState.deadeyeBeamDirY ?? fighter.velocity.y)
    },
    fighter.velocity
  );
}

function getCurrentScopeDirection(fighter: Fighter): Vec2 {
  if (
    Number(fighter.customState.deadeyeBeamChargeTimer ?? 0) > 0 ||
    Number(fighter.customState.deadeyeBeamFireVisualTimer ?? 0) > 0
  ) {
    return getStoredBeamDirection(fighter);
  }
  if (Number(fighter.customState.sniperShotChargeTimer ?? 0) > 0) {
    return getStoredDirection(fighter, fighter.velocity);
  }
  return safeNormalize(fighter.velocity, { x: 1, y: 0 });
}

function lineHitsCircle(origin: Vec2, direction: Vec2, range: number, halfWidth: number, target: Fighter): boolean {
  const toTarget = { x: target.position.x - origin.x, y: target.position.y - origin.y };
  const along = dot(toTarget, direction);
  if (along < 0 || along > range + target.radius) {
    return false;
  }
  const closest = {
    x: origin.x + direction.x * clamp(along, 0, range),
    y: origin.y + direction.y * clamp(along, 0, range)
  };
  return distance(closest, target.position) <= target.radius + halfWidth;
}

function drawAimLine(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  direction: Vec2,
  length: number,
  color: string,
  width: number
): void {
  ctx.save();
  ctx.translate(fighter.position.x, fighter.position.y);
  ctx.rotate(Math.atan2(direction.y, direction.x));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash([14, 9]);
  ctx.beginPath();
  ctx.moveTo(fighter.radius + 14, 0);
  ctx.lineTo(length, 0);
  ctx.stroke();
  ctx.restore();
}

function drawBeamLine(ctx: CanvasRenderingContext2D, fighter: Fighter, direction: Vec2, length: number, alpha: number, width: number): void {
  ctx.save();
  ctx.translate(fighter.position.x, fighter.position.y);
  ctx.rotate(Math.atan2(direction.y, direction.x));
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(255, 51, 77, 0.3)";
  ctx.lineWidth = width + 18;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(fighter.radius + 12, 0);
  ctx.lineTo(length, 0);
  ctx.stroke();
  ctx.strokeStyle = "#ff334d";
  ctx.lineWidth = Math.max(6, width * 0.42);
  ctx.beginPath();
  ctx.moveTo(fighter.radius + 12, 0);
  ctx.lineTo(length, 0);
  ctx.stroke();
  ctx.strokeStyle = "#fff1f1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fighter.radius + 12, 0);
  ctx.lineTo(length, 0);
  ctx.stroke();
  ctx.restore();
}
