import type { Fighter } from "../entities/Fighter";
import { PortalGate } from "../entities/PortalGate";
import { Projectile } from "../entities/Projectile";
import { BALANCE } from "../tuning";
import type { DamageContext, FighterClass, FighterClassContext, WallBounceContext } from "./FighterClass";
import { TAU, angleTo, clamp, distance, fromAngle, length, randomRange, type Rect, type Vec2 } from "../utils/math";

const RIFT_GATE_TIMER = "portalRiftGateTimer";
const TELEPORT_COOLDOWN = "portalTeleportCooldown";
const RIFT_STRIKE_TIMER = "portalRiftStrikeTimer";
const POST_TELEPORT_GUARD_TIMER = "portalPostTeleportGuardTimer";
const RIFT_STRIKE_BONUS = "portalRiftStrikeBonus";
const PORTAL_FLASH = "portalFlash";
const RIFT_SHOT_COOLDOWN = "portalRiftShotCooldown";
const EXIT_PULSE_PREFIX = "portalExitPulseCooldown_";

export const PortalClass: FighterClass = {
  id: "portal",
  displayName: "Portal Ball",
  primaryColor: "#283fcb",
  secondaryColor: "#30d9ff",
  outlineColor: "#071323",
  role: "control",
  roleLabel: "Wall Portal / Position Trick",
  shortDescription: "Creates linked wall portals and warps through them to set up surprise contact hits.",
  baseHP: BALANCE.portal.hp,
  baseMoveSpeed: BALANCE.portal.targetMoveSpeed,
  targetMoveSpeed: BALANCE.portal.targetMoveSpeed,
  mass: BALANCE.portal.mass,
  restitution: BALANCE.portal.restitution,
  minSpeed: BALANCE.portal.minSpeed,
  maxSpeed: BALANCE.portal.maxSpeed,
  contactDamage: BALANCE.portal.contactDamage,
  contactDamageCooldown: BALANCE.portal.contactDamageCooldown,
  baseDamage: BALANCE.portal.contactDamage,
  scalingStatName: "Portals",
  abilityName: "RIFT GATE",
  abilityDescription: "Creates linked wall portals that let Portal Ball warp across the arena.",
  abilityChargeRate: BALANCE.portal.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    const active = Number(fighter.customState.portalActiveCount ?? 0);
    const linked = Number(fighter.customState.portalLinkedCount ?? 0);
    if (Number(fighter.customState[RIFT_STRIKE_TIMER] ?? 0) > 0) {
      return "Strike";
    }
    return linked >= 2 ? "Linked" : `${active}/2`;
  },

  updatePassiveScaling({ game, self, dt }: FighterClassContext): void {
    self.customState[RIFT_GATE_TIMER] = Math.max(0, Number(self.customState[RIFT_GATE_TIMER] ?? 0) - dt);
    self.customState[TELEPORT_COOLDOWN] = Math.max(0, Number(self.customState[TELEPORT_COOLDOWN] ?? 0) - dt);
    self.customState[RIFT_STRIKE_TIMER] = Math.max(0, Number(self.customState[RIFT_STRIKE_TIMER] ?? 0) - dt);
    self.customState[POST_TELEPORT_GUARD_TIMER] = Math.max(0, Number(self.customState[POST_TELEPORT_GUARD_TIMER] ?? 0) - dt);
    self.customState[PORTAL_FLASH] = Math.max(0, Number(self.customState[PORTAL_FLASH] ?? 0) - dt);
    self.customState[RIFT_SHOT_COOLDOWN] = Math.max(0, Number(self.customState[RIFT_SHOT_COOLDOWN] ?? 0) - dt);
    for (const key of Object.keys(self.customState)) {
      if (key.startsWith(EXIT_PULSE_PREFIX)) {
        self.customState[key] = Math.max(0, Number(self.customState[key] ?? 0) - dt);
      }
    }

    const gates = getOwnerGates(game, self);
    self.customState.portalActiveCount = gates.length;
    self.customState.portalLinkedCount = gates.filter((gate) => gate.linked).length;
    self.scalingValue = Number(self.customState.portalLinkedCount ?? 0);
    tryPortalTeleport(game, self, gates);
  },

  updateAI({ game, self, dt }: FighterClassContext): void {
    if (!game.isFastSimulation && Math.random() < dt * (isRiftGateActive(self) ? 3.2 : 1.3)) {
      game.spawnGravitySpark(
        {
          x: self.position.x + randomRange(-22, 22),
          y: self.position.y + randomRange(-22, 22)
        },
        isRiftGateActive(self) ? "#30d9ff" : "#8068ff"
      );
    }
  },

  onWallBounce({ game, self, collision }: WallBounceContext): void {
    createPortalAtWallHit(game, self, collision.point, collision.normal);
  },

  getContactDamage({ self, baseDamage }): { damage: number; bonusDamage?: number; highImpact?: boolean } {
    const bonus = Number(self.customState[RIFT_STRIKE_TIMER] ?? 0) > 0 ? Number(self.customState[RIFT_STRIKE_BONUS] ?? 0) : 0;
    return {
      damage: baseDamage + bonus,
      bonusDamage: bonus,
      highImpact: bonus > 0
    };
  },

  modifyIncomingDamage({ self, amount, kind }: DamageContext): number {
    if (Number(self.customState[POST_TELEPORT_GUARD_TIMER] ?? 0) <= 0 || !isDirectPressure(kind)) {
      return amount;
    }
    const reduction = clamp(
      getPostTeleportDamageReduction(self) + self.runModifiers.portalPostTeleportReductionBonus,
      0,
      0.55
    );
    const nextAmount = amount * (1 - reduction);
    self.stats.postTeleportDamagePrevented += Math.max(0, amount - nextAmount);
    return nextAmount;
  },

  basicAttack(): void {
    // Portal Ball relies on contact damage and portal repositioning.
  },

  specialAbility({ game, self }: FighterClassContext): void {
    const duration = BALANCE.portal.riftGateDuration * self.runModifiers.abilityDurationMultiplier + self.runModifiers.portalRiftGateDurationBonus;
    self.customState[RIFT_GATE_TIMER] = duration;
    self.stats.riftGateUses += 1;
    for (const gate of getOwnerGates(game, self)) {
      gate.duration = Math.max(gate.duration, BALANCE.portal.portalDuration + self.runModifiers.portalDurationBonus);
      gate.life = Math.max(gate.life, gate.duration);
    }
    game.spawnAbilityText("RIFT GATE", this.secondaryColor, self.position);
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    const active = isRiftGateActive(fighter);
    const angle = Math.atan2(fighter.velocity.y, fighter.velocity.x);
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(angle);
    ctx.strokeStyle = active ? "#30d9ff" : "rgba(255,255,255,0.76)";
    ctx.lineWidth = active ? 4 : 3;
    ctx.beginPath();
    ctx.arc(fighter.radius + 4, 0, 8 + Math.sin(time * 9) * 1.5, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = active ? "#ffffff" : "#30d9ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fighter.radius + 4, 0, 14, -0.8, 0.8);
    ctx.stroke();
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const riftGate = isRiftGateActive(fighter);
    const flash = Number(fighter.customState[PORTAL_FLASH] ?? 0);
    const strike = Number(fighter.customState[RIFT_STRIKE_TIMER] ?? 0) > 0;

    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.strokeStyle = riftGate ? "rgba(48, 217, 255, 0.72)" : "rgba(128, 104, 255, 0.5)";
    ctx.lineWidth = riftGate ? 5 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 10 + Math.sin(time * 8) * 2 + flash * 14, 0, TAU);
    ctx.stroke();

    if (strike) {
      ctx.strokeStyle = "rgba(255,255,255,0.82)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius + 18, time * 3, time * 3 + TAU * 0.76);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const angle = time * 0.9 + i * (TAU / 3);
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius * (0.42 + i * 0.12), angle, angle + 1.1);
      ctx.stroke();
    }
    ctx.restore();
  }
};

function createPortalAtWallHit(game: FighterClassContext["game"], owner: Fighter, position: Vec2, normal: Vec2): void {
  const gates = getOwnerGates(game, owner);
  const duration = BALANCE.portal.portalDuration + owner.runModifiers.portalDurationBonus;
  const radius = BALANCE.portal.portalRadius + owner.runModifiers.portalRadiusBonus;
  const portalPosition = getVisiblePortalPosition(position, normal, radius, game.arenaInner);

  if (gates.length !== 1 || gates[0].linked) {
    game.portalGates = game.portalGates.filter((gate) => gate.owner !== owner);
    game.portalGates.push(new PortalGate({ owner, position: portalPosition, normal, radius, duration }));
    owner.stats.portalsCreated += 1;
    owner.customState[PORTAL_FLASH] = 0.28;
    if (!game.isFastSimulation) {
      game.spawnAbilityText("PORTAL", PortalClass.secondaryColor, portalPosition);
      game.spawnGravitySpark(portalPosition, PortalClass.secondaryColor);
    }
    return;
  }

  const first = gates[0];
  const second = new PortalGate({ owner, position: portalPosition, normal, radius, duration });
  first.linked = true;
  first.life = Math.max(first.life, duration);
  first.duration = Math.max(first.duration, duration);
  second.linked = true;
  game.portalGates.push(second);
  owner.stats.portalsCreated += 1;
  owner.customState[PORTAL_FLASH] = 0.35;
  if (!game.isFastSimulation) {
    game.spawnAbilityText("LINKED", PortalClass.secondaryColor, portalPosition);
    game.spawnGravitySpark(portalPosition, PortalClass.secondaryColor);
    game.spawnGravitySpark(first.position, PortalClass.primaryColor);
  }
}

function tryPortalTeleport(game: FighterClassContext["game"], fighter: Fighter, gates: PortalGate[]): void {
  if (Number(fighter.customState[TELEPORT_COOLDOWN] ?? 0) > 0 || gates.length < 2) {
    return;
  }

  const linked = gates.filter((gate) => gate.linked);
  if (linked.length < 2) {
    return;
  }

  const radius = BALANCE.portal.portalRadius + fighter.runModifiers.portalRadiusBonus;
  const entry = linked.find((gate) => distance(fighter.position, gate.position) <= radius + fighter.radius * 0.72);
  if (!entry) {
    return;
  }

  const exit = linked.find((gate) => gate !== entry);
  if (!exit) {
    return;
  }

  const speed = Math.max(1, length(fighter.velocity));
  fighter.position = getSafeExitPosition(exit, fighter.radius, game.arenaInner);
  fighter.previousPosition = { ...fighter.position };
  entry.pulseTimer = 0.32;
  exit.pulseTimer = 0.32;
  if (!Number.isFinite(fighter.velocity.x) || !Number.isFinite(fighter.velocity.y) || speed <= 1) {
    fighter.normalizeToTargetSpeed("portal-teleport");
  }
  fighter.customState[TELEPORT_COOLDOWN] = getTeleportCooldown(fighter);
  fighter.customState[RIFT_STRIKE_TIMER] = BALANCE.portal.riftStrikeDuration;
  fighter.customState[RIFT_STRIKE_BONUS] = getRiftStrikeBonus(fighter);
  fighter.customState[POST_TELEPORT_GUARD_TIMER] = BALANCE.portal.postTeleportDamageReductionDuration;
  fighter.customState[PORTAL_FLASH] = 0.42;
  fighter.stats.portalTeleports += 1;
  applyExitPulse(game, fighter, exit.position);
  fireRiftShot(game, fighter);

  if (!game.isFastSimulation) {
    game.spawnAbilityText("RIFT!", PortalClass.secondaryColor, fighter.position);
    game.spawnGravitySpark(entry.position, PortalClass.primaryColor);
    game.spawnGravitySpark(exit.position, PortalClass.secondaryColor);
  }
}

function applyExitPulse(game: FighterClassContext["game"], fighter: Fighter, position: Vec2): void {
  const active = isRiftGateActive(fighter);
  const radius = active ? BALANCE.portal.riftGateExitPulseRadius : BALANCE.portal.exitPulseRadius;
  const damage = active ? BALANCE.portal.riftGateExitPulseDamage : BALANCE.portal.exitPulseDamage;
  let hitAny = false;
  for (const enemy of game.getEnemies(fighter)) {
    const cooldownKey = `${EXIT_PULSE_PREFIX}${enemy.id}`;
    if (Number(fighter.customState[cooldownKey] ?? 0) > 0) {
      continue;
    }
    if (distance(enemy.position, position) > radius + enemy.radius) {
      continue;
    }
    const hpBefore = enemy.hp;
    const hit = enemy.takeDamage(damage, fighter, game, {
      knockback: 0,
      hitColor: PortalClass.secondaryColor,
      ignoreCooldown: true,
      damageKind: "ability"
    });
    fighter.customState[cooldownKey] = BALANCE.portal.exitPulseHitCooldown;
    const dealt = Math.max(0, hpBefore - enemy.hp);
    if (hit && dealt > 0) {
      hitAny = true;
      fighter.stats.exitPulseHits += 1;
      fighter.stats.exitPulseDamage += dealt;
    }
  }

  if (!game.isFastSimulation) {
    game.spawnPortalExitPulse(position, radius, hitAny ? PortalClass.secondaryColor : PortalClass.primaryColor);
  }
}

function fireRiftShot(game: FighterClassContext["game"], fighter: Fighter): void {
  if (Number(fighter.customState[RIFT_SHOT_COOLDOWN] ?? 0) > 0) {
    return;
  }

  const target = game.getNearestEnemy(fighter);
  if (!target) {
    return;
  }

  const active = isRiftGateActive(fighter);
  const count = active ? 2 : 1;
  const baseAngle = angleTo(fighter.position, target.position);
  const spread = active ? 0.16 : 0;
  for (let i = 0; i < count; i += 1) {
    const offset = count === 1 ? 0 : (i - 0.5) * spread;
    game.projectiles.push(
      new Projectile({
        owner: fighter,
        position: fighter.position,
        velocity: fromAngle(baseAngle + offset, BALANCE.portal.riftShotSpeed),
        radius: 8,
        damage: BALANCE.portal.riftShotDamage * (active ? 1.15 : 1),
        color: "#dffbff",
        secondaryColor: PortalClass.secondaryColor,
        life: 1.1,
        kind: "riftShot",
        damageKind: "projectile",
        knockback: 0
      })
    );
    fighter.stats.riftShotFired += 1;
  }
  fighter.customState[RIFT_SHOT_COOLDOWN] = BALANCE.portal.riftShotCooldown;
}

function getSafeExitPosition(gate: PortalGate, fighterRadius: number, arena: Rect): Vec2 {
  const offset = Math.max(8, fighterRadius * 0.35);
  return {
    x: clamp(gate.position.x + gate.normal.x * offset, arena.x + fighterRadius, arena.x + arena.w - fighterRadius),
    y: clamp(gate.position.y + gate.normal.y * offset, arena.y + fighterRadius, arena.y + arena.h - fighterRadius)
  };
}

function getVisiblePortalPosition(position: Vec2, normal: Vec2, radius: number, arena: Rect): Vec2 {
  const offset = radius + 4;
  return {
    x: clamp(position.x + normal.x * offset, arena.x + radius, arena.x + arena.w - radius),
    y: clamp(position.y + normal.y * offset, arena.y + radius, arena.y + arena.h - radius)
  };
}

function getOwnerGates(game: FighterClassContext["game"], owner: Fighter): PortalGate[] {
  return game.portalGates.filter((gate) => gate.owner === owner && gate.active);
}

function getTeleportCooldown(fighter: Fighter): number {
  const base = isRiftGateActive(fighter) ? BALANCE.portal.riftGateTeleportCooldown : BALANCE.portal.teleportCooldown;
  return Math.max(0.25, base - fighter.runModifiers.portalTeleportCooldownReduction);
}

function getRiftStrikeBonus(fighter: Fighter): number {
  const base = isRiftGateActive(fighter) ? BALANCE.portal.riftGateStrikeBonusDamage : BALANCE.portal.riftStrikeBonusDamage;
  return base + fighter.runModifiers.portalRiftStrikeBonusDamage;
}

function getPostTeleportDamageReduction(fighter: Fighter): number {
  return isRiftGateActive(fighter) ? BALANCE.portal.riftGatePostTeleportDamageReduction : BALANCE.portal.postTeleportDamageReduction;
}

function isRiftGateActive(fighter: { customState: Record<string, number | boolean | string> }): boolean {
  return Number(fighter.customState[RIFT_GATE_TIMER] ?? 0) > 0;
}

function isDirectPressure(kind: DamageContext["kind"]): boolean {
  return kind === "projectile" || kind === "contact" || kind === "dash" || kind === "ability" || kind === "explosion" || kind === "collision";
}
