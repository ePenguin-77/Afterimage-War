import type { Game } from "../Game";
import type { DamageKind, FighterClass } from "../classes/FighterClass";
import type { StatusEffect } from "../combat/statusEffects";
import {
  getGravityAbilityChargeMultiplier,
  getGravityRestitutionMultiplier,
  getGravitySpeedMultiplier,
  getPoisonAbilityChargeMultiplier,
  updateStatusEffects
} from "../combat/statusEffects";
import { WallCollisionResult, resolveWallCollision } from "../physics";
import { createDefaultRunModifiers, type RunModifiers } from "../run/Upgrade";
import { BALANCE, BLADE, DEFAULT_MAX_HP, MOVEMENT } from "../tuning";
import { AbilityMeter } from "./Ability";
import {
  Rect,
  Vec2,
  angleTo,
  clamp,
  copyVec,
  distance,
  length,
  normalize,
  safeNormalize
} from "../utils/math";

type FighterAfterimage = {
  position: Vec2;
  rotation: number;
  scale: number;
  alpha: number;
};

export type FighterStats = {
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  healingReceived: number;
  lifestealHealing: number;
  explosionDamage: number;
  projectileDamage: number;
  contactDamage: number;
  dashDamage: number;
  burnDamage: number;
  poisonDamage: number;
  bleedDamage: number;
  counterDamage: number;
  abilityDamage: number;
  collisionDamage: number;
  unknownDamage: number;
  projectileHits: number;
  contactHits: number;
  dashHits: number;
  abilityHits: number;
  counterHits: number;
  fighterCollisions: number;
  wallBounces: number;
  abilityUses: number;
  kos: number;
  statusTicks: number;
  bombsPlaced: number;
  bombsExploded: number;
  explosionHits: number;
  decoysCreated: number;
  decoysDestroyed: number;
  attacksAbsorbedByDecoys: number;
  projectileEvades: number;
  mirrorSplitUses: number;
  shatterShotDamage: number;
  phaseReflectionTriggers: number;
  damagePreventedByPhaseReflection: number;
  projectilesBlocked: number;
  orbitShardsConsumed: number;
  orbitShardsRegenerated: number;
  magneticStormUses: number;
  stormShardHits: number;
  stormDamage: number;
  ricochetShotsFired: number;
  ricochetProjectileBounces: number;
  bankShotHits: number;
  bankShotBouncedHits: number;
  perfectBankHits: number;
  ricochetBonusDamage: number;
  bankMeterGained: number;
  bankShotBarrageUses: number;
  deathMarksApplied: number;
  maxDeathMarksReached: number;
  soulReapUses: number;
  soulReapDamage: number;
  deathMarksOnSoulReap: number;
  executeBonusTriggers: number;
  marksConsumed: number;
  crusherContactHits: number;
  impactBonusDamage: number;
  crushingForceUses: number;
  highImpactHits: number;
  collisionDamageReduced: number;
  spikeContactHits: number;
  thornDamageDealt: number;
  spikeArmorUses: number;
  spikeArmorUptime: number;
  spikeArmorDamageBonus: number;
  reflectedDamage: number;
  wallSpikeChargesGained: number;
  wallSpikeChargesConsumed: number;
  wallSpikeBonusDamage: number;
  bristleGuardDamagePrevented: number;
  monkContactHits: number;
  comboStacksGained: number;
  maxComboReached: number;
  palmBurstUses: number;
  palmBurstHits: number;
  palmBurstDamage: number;
  comboBonusDamage: number;
  focusStepTriggers: number;
  flowGuardDamagePrevented: number;
  berserkerContactHits: number;
  rageAveragePercent: number;
  maxRageReached: number;
  rageBreakUses: number;
  rageBonusDamage: number;
  bloodRushTriggers: number;
  lowHpDamageDealt: number;
  drillContactHits: number;
  armorBreakStacksApplied: number;
  pierceDamageBonus: number;
  defensePiercedDamage: number;
  piercingDrillUses: number;
  spinUpChargesUsed: number;
  ninjaContactHits: number;
  shadowStepUses: number;
  shadowStepDashHits: number;
  shadowStepTotalDamage: number;
  smokeReflexEvades: number;
  wallShadowTriggers: number;
  wallShadowBonusDamage: number;
  fangContactHits: number;
  bleedStacksApplied: number;
  bloodScentUptime: number;
  rendingHuntUses: number;
  rendingHuntDamageBonus: number;
  spearThrustUses: number;
  spearThrustHits: number;
  spearThrustDamage: number;
  idealRangeHits: number;
  sweetSpotHits: number;
  spearRushUses: number;
  spearRushHits: number;
  lanceReadyTriggers: number;
  guardedStanceUptime: number;
  chargedShotsStarted: number;
  chargedShotsFired: number;
  chargedShotsHit: number;
  chargedShotDamage: number;
  weakpointHits: number;
  deadeyeBeamUses: number;
  deadeyeBeamHits: number;
  deadeyeBeamDamage: number;
  closeRangePressureTime: number;
  vectorNodesPlaced: number;
  vectorLinesCreated: number;
  vectorLineHits: number;
  vectorLineDamage: number;
  longestVectorLine: number;
  vectorWebUses: number;
  vectorWebLineHits: number;
  portalsCreated: number;
  portalTeleports: number;
  exitPulseHits: number;
  exitPulseDamage: number;
  riftShotFired: number;
  riftShotHits: number;
  riftShotDamage: number;
  riftStrikeHits: number;
  riftStrikeDamage: number;
  riftGateUses: number;
  postTeleportDamagePrevented: number;
  glassChargesBlocked: number;
  glassChargesRestored: number;
  glassChargeBreaks: number;
  prismShiftUses: number;
  damagePreventedByGlass: number;
  timeAtZeroCharges: number;
  wallBouncesTowardCharge: number;
  armorChargesConsumed: number;
  armorChargesRegenerated: number;
  armorDamagePrevented: number;
  guardCounters: number;
  burnUptime: number;
  poisonUptime: number;
  bleedUptime: number;
  slowUptime: number;
};

export function createFighterStats(): FighterStats {
  return {
    damageDealt: 0,
    damageTaken: 0,
    healingDone: 0,
    healingReceived: 0,
    lifestealHealing: 0,
    explosionDamage: 0,
    projectileDamage: 0,
    contactDamage: 0,
    dashDamage: 0,
    burnDamage: 0,
    poisonDamage: 0,
    bleedDamage: 0,
    counterDamage: 0,
    abilityDamage: 0,
    collisionDamage: 0,
    unknownDamage: 0,
    projectileHits: 0,
    contactHits: 0,
    dashHits: 0,
    abilityHits: 0,
    counterHits: 0,
    fighterCollisions: 0,
    wallBounces: 0,
    abilityUses: 0,
    kos: 0,
    statusTicks: 0,
    bombsPlaced: 0,
    bombsExploded: 0,
    explosionHits: 0,
    decoysCreated: 0,
    decoysDestroyed: 0,
    attacksAbsorbedByDecoys: 0,
    projectileEvades: 0,
    mirrorSplitUses: 0,
    shatterShotDamage: 0,
    phaseReflectionTriggers: 0,
    damagePreventedByPhaseReflection: 0,
    projectilesBlocked: 0,
    orbitShardsConsumed: 0,
    orbitShardsRegenerated: 0,
    magneticStormUses: 0,
    stormShardHits: 0,
    stormDamage: 0,
    ricochetShotsFired: 0,
    ricochetProjectileBounces: 0,
    bankShotHits: 0,
    bankShotBouncedHits: 0,
    perfectBankHits: 0,
    ricochetBonusDamage: 0,
    bankMeterGained: 0,
    bankShotBarrageUses: 0,
    deathMarksApplied: 0,
    maxDeathMarksReached: 0,
    soulReapUses: 0,
    soulReapDamage: 0,
    deathMarksOnSoulReap: 0,
    executeBonusTriggers: 0,
    marksConsumed: 0,
    crusherContactHits: 0,
    impactBonusDamage: 0,
    crushingForceUses: 0,
    highImpactHits: 0,
    collisionDamageReduced: 0,
    spikeContactHits: 0,
    thornDamageDealt: 0,
    spikeArmorUses: 0,
    spikeArmorUptime: 0,
    spikeArmorDamageBonus: 0,
    reflectedDamage: 0,
    wallSpikeChargesGained: 0,
    wallSpikeChargesConsumed: 0,
    wallSpikeBonusDamage: 0,
    bristleGuardDamagePrevented: 0,
    monkContactHits: 0,
    comboStacksGained: 0,
    maxComboReached: 0,
    palmBurstUses: 0,
    palmBurstHits: 0,
    palmBurstDamage: 0,
    comboBonusDamage: 0,
    focusStepTriggers: 0,
    flowGuardDamagePrevented: 0,
    berserkerContactHits: 0,
    rageAveragePercent: 0,
    maxRageReached: 0,
    rageBreakUses: 0,
    rageBonusDamage: 0,
    bloodRushTriggers: 0,
    lowHpDamageDealt: 0,
    drillContactHits: 0,
    armorBreakStacksApplied: 0,
    pierceDamageBonus: 0,
    defensePiercedDamage: 0,
    piercingDrillUses: 0,
    spinUpChargesUsed: 0,
    ninjaContactHits: 0,
    shadowStepUses: 0,
    shadowStepDashHits: 0,
    shadowStepTotalDamage: 0,
    smokeReflexEvades: 0,
    wallShadowTriggers: 0,
    wallShadowBonusDamage: 0,
    fangContactHits: 0,
    bleedStacksApplied: 0,
    bloodScentUptime: 0,
    rendingHuntUses: 0,
    rendingHuntDamageBonus: 0,
    spearThrustUses: 0,
    spearThrustHits: 0,
    spearThrustDamage: 0,
    idealRangeHits: 0,
    sweetSpotHits: 0,
    spearRushUses: 0,
    spearRushHits: 0,
    lanceReadyTriggers: 0,
    guardedStanceUptime: 0,
    chargedShotsStarted: 0,
    chargedShotsFired: 0,
    chargedShotsHit: 0,
    chargedShotDamage: 0,
    weakpointHits: 0,
    deadeyeBeamUses: 0,
    deadeyeBeamHits: 0,
    deadeyeBeamDamage: 0,
    closeRangePressureTime: 0,
    vectorNodesPlaced: 0,
    vectorLinesCreated: 0,
    vectorLineHits: 0,
    vectorLineDamage: 0,
    longestVectorLine: 0,
    vectorWebUses: 0,
    vectorWebLineHits: 0,
    portalsCreated: 0,
    portalTeleports: 0,
    exitPulseHits: 0,
    exitPulseDamage: 0,
    riftShotFired: 0,
    riftShotHits: 0,
    riftShotDamage: 0,
    riftStrikeHits: 0,
    riftStrikeDamage: 0,
    riftGateUses: 0,
    postTeleportDamagePrevented: 0,
    glassChargesBlocked: 0,
    glassChargesRestored: 0,
    glassChargeBreaks: 0,
    prismShiftUses: 0,
    damagePreventedByGlass: 0,
    timeAtZeroCharges: 0,
    wallBouncesTowardCharge: 0,
    armorChargesConsumed: 0,
    armorChargesRegenerated: 0,
    armorDamagePrevented: 0,
    guardCounters: 0,
    burnUptime: 0,
    poisonUptime: 0,
    bleedUptime: 0,
    slowUptime: 0
  };
}

function applyOutgoingRunModifier(source: Fighter, target: Fighter, amount: number, damageKind: DamageKind): number {
  let nextAmount = amount;
  switch (damageKind) {
    case "projectile":
      nextAmount *= source.runModifiers.projectileDamageMultiplier;
      break;
    case "contact":
    case "collision":
      nextAmount *= source.runModifiers.contactDamageMultiplier;
      break;
    case "dash":
      nextAmount *= source.runModifiers.dashDamageMultiplier;
      break;
    case "burn":
      nextAmount *= source.runModifiers.burnDamageMultiplier;
      break;
    case "poison":
      nextAmount *= source.runModifiers.poisonDamageMultiplier;
      break;
    case "bleed":
      nextAmount *= source.runModifiers.bleedDamageMultiplier;
      break;
    case "counter":
      nextAmount *= source.runModifiers.counterDamageMultiplier;
      break;
    case "ability":
      nextAmount *= source.runModifiers.abilityDamageMultiplier * source.runModifiers.lightningDamageMultiplier;
      break;
    case "field":
      nextAmount *= source.runModifiers.abilityDamageMultiplier;
      break;
    case "explosion":
      nextAmount *= source.runModifiers.abilityDamageMultiplier;
      break;
    default:
      break;
  }

  if (source.classDef.id === "vampire" && isVampireLifestealDamage(damageKind)) {
    nextAmount *= getVampireDamageMultiplier(source);
  }

  if (source.classDef.id === "reaper" && isReaperFinisherDamage(damageKind)) {
    nextAmount *= getReaperDamageMultiplier(target);
  }

  return source.runModifiers.finisherDamageMultiplier > 1 && target.hp / Math.max(1, target.maxHP) <= 0.3
    ? nextAmount * source.runModifiers.finisherDamageMultiplier
    : nextAmount;
}

function isRunDirectDamage(damageKind: DamageKind): boolean {
  return (
    damageKind === "projectile" ||
    damageKind === "contact" ||
    damageKind === "dash" ||
    damageKind === "ability" ||
    damageKind === "explosion" ||
    damageKind === "collision"
  );
}

function isVampireLifestealDamage(damageKind: DamageKind): boolean {
  return damageKind === "projectile" || damageKind === "contact" || damageKind === "ability";
}

function getVampireDamageMultiplier(fighter: Fighter): number {
  let multiplier = 1;
  if (fighter.hp <= BALANCE.vampire.criticalHpThreshold) {
    multiplier *= BALANCE.vampire.criticalHpDamageMultiplier;
  } else if (fighter.hp <= BALANCE.vampire.lowHpThreshold) {
    multiplier *= BALANCE.vampire.lowHpDamageMultiplier;
  }
  if (Number(fighter.customState.bloodFeastTimer ?? 0) > 0) {
    multiplier *= BALANCE.vampire.bloodFeastDamageMultiplier;
  }
  return multiplier;
}

function isReaperFinisherDamage(damageKind: DamageKind): boolean {
  return damageKind === "projectile" || damageKind === "contact" || damageKind === "ability";
}

function getReaperDamageMultiplier(target: Fighter): number {
  if (target.hp <= BALANCE.reaper.criticalThreshold) {
    return BALANCE.reaper.criticalDamageMultiplier;
  }
  if (target.hp <= BALANCE.reaper.woundedThreshold) {
    return BALANCE.reaper.woundedDamageMultiplier;
  }
  return 1;
}

export type VelocityChangeReason =
  | "spawn"
  | "wall-left"
  | "wall-right"
  | "wall-top"
  | "wall-bottom"
  | "wall-corner"
  | "fighter-collision"
  | "dash-start"
  | "portal-teleport"
  | "speed-normalize"
  | "status-speed-only"
  | "none";

export class Fighter {
  id: string;
  classDef: FighterClass;
  position: Vec2;
  previousPosition: Vec2;
  velocity: Vec2;
  acceleration: Vec2 = { x: 0, y: 0 };
  radius = 34;
  maxHP: number;
  hp: number;
  ability = new AbilityMeter();
  scalingValue: number;
  attackCooldown = 0;
  contactCooldown = 0;
  collisionDamageCooldown = 0;
  hitCooldown = 0;
  flash = 0;
  slowTimer = 0;
  slowFactor = 1;
  statusEffects: StatusEffect[] = [];
  afterimages: FighterAfterimage[] = [];
  customState: Record<string, number | boolean | string> = {};
  runModifiers: RunModifiers = createDefaultRunModifiers();
  wallHugTimer = 0;
  cornerTimer = 0;
  wallBounceLockTime = 0;
  lastWallHit = "none";
  lastVelocityChangeReason: VelocityChangeReason = "none";
  stats: FighterStats = createFighterStats();
  chaosKoStarted = false;
  chaosKoHidden = false;
  chaosKoTimer = 0;
  chaosKoDuration = 0.6;

  constructor(id: string, classDef: FighterClass, position: Vec2) {
    this.id = id;
    this.classDef = classDef;
    this.position = copyVec(position);
    this.previousPosition = copyVec(position);
    this.velocity = { x: 0, y: 0 };
    this.radius = classDef.radius ?? this.radius;
    this.maxHP = classDef.baseHP ?? DEFAULT_MAX_HP;
    this.hp = this.maxHP;
    this.scalingValue = classDef.id === "blade" ? classDef.baseDamage : 1;
  }

  get defeated(): boolean {
    return this.hp <= 0;
  }

  get alive(): boolean {
    return !this.defeated;
  }

  update(dt: number, game: Game, enemy: Fighter): void {
    this.ability.update(dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.contactCooldown = Math.max(0, this.contactCooldown - dt);
    this.collisionDamageCooldown = Math.max(0, this.collisionDamageCooldown - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    this.customState.runWallBoostTimer = Math.max(0, Number(this.customState.runWallBoostTimer ?? 0) - dt);
    this.customState.bloodFeastTimer = Math.max(0, Number(this.customState.bloodFeastTimer ?? 0) - dt);
    this.customState.lastDropTimer = Math.max(0, Number(this.customState.lastDropTimer ?? 0) - dt);
    this.updateTimeStop(dt);
    if (this.slowTimer > 0) {
      this.stats.slowUptime += dt;
    }
    this.wallBounceLockTime = Math.max(0, this.wallBounceLockTime - dt);
    updateStatusEffects(this, dt, game);

    if (!this.defeated) {
      this.previousPosition = copyVec(this.position);
      this.acceleration.x = 0;
      this.acceleration.y = 0;
      if (!game.physicsTestMode) {
        this.ability.fill(
          dt *
            this.classDef.abilityChargeRate *
            this.runModifiers.abilityChargeMultiplier *
            getPoisonAbilityChargeMultiplier(this) *
            getGravityAbilityChargeMultiplier(this) *
            this.timeStopAbilityMultiplier *
            game.intensityMultiplier
        );
      }
      if (this.ability.value >= 1) {
        this.stats.abilityUses += 1;
        this.classDef.specialAbility({ game, self: this, enemy, dt });
        this.keepInsideArena(game.arenaInner);
        this.ability.consume();
      }

      if (!game.physicsTestMode && !this.isTimeStopped) {
        this.classDef.updatePassiveScaling({ game, self: this, enemy, dt });
        this.classDef.updateAI({ game, self: this, enemy, dt });
      }
      this.keepInsideArena(game.arenaInner);
      this.integrate(dt, game);
    }

    if (game.isFastSimulation) {
      this.afterimages = [];
    } else {
      this.recordAfterimage(dt);
    }
  }

  setVelocity(velocity: Vec2, reason: VelocityChangeReason): void {
    this.velocity = copyVec(velocity);
    this.lastVelocityChangeReason = reason;
  }

  applySlow(duration: number, factor: number): void {
    const dashResistance = this.customState.bladeDashTimer ? BLADE.projectileSlowResistanceDuringDash : 0;
    let classDurationMultiplier = this.classDef.id === "thunder" ? BALANCE.thunder.slowDurationMultiplier : 1;
    if (
      this.classDef.id === "thunder" &&
      Number(this.customState.thunderStaticCharge ?? 0) >= BALANCE.thunder.overchargeGuardMinCharge
    ) {
      classDurationMultiplier *= BALANCE.thunder.overchargeSlowDurationMultiplier;
    }
    const bladeDashMultiplier =
      this.classDef.id === "blade" && this.customState.bladeDashTimer ? BALANCE.blade.slowDurationMultiplierDuringDash : 1;
    const effectiveDuration =
      duration * this.runModifiers.statusTakenDurationMultiplier * classDurationMultiplier * bladeDashMultiplier * (1 - dashResistance * 0.35);
    const effectiveFactor = factor + (1 - factor) * dashResistance;
    this.slowTimer = Math.max(this.slowTimer, effectiveDuration);
    this.slowFactor = Math.min(this.slowFactor, effectiveFactor);
  }

  clearSlow(): void {
    if (this.slowTimer <= 0) {
      this.slowFactor = 1;
    }
  }

  applyTimeStop(duration: number): void {
    const effectiveDuration = duration * (this.classDef.id === "shield" ? BALANCE.shield.timeStopDurationMultiplier : 1);
    const existingTimer = Number(this.customState.timeStopTimer ?? 0);
    const direction =
      existingTimer > 0
        ? safeNormalize({
            x: Number(this.customState.timeStopDirX ?? 1),
            y: Number(this.customState.timeStopDirY ?? 0)
          })
        : length(this.velocity) > 1
          ? normalize(this.velocity)
          : { x: 1, y: 0 };
    this.customState.timeStopDirX = direction.x;
    this.customState.timeStopDirY = direction.y;
    this.customState.timeStopTimer = Math.max(existingTimer, effectiveDuration);
    this.setVelocity({ x: 0, y: 0 }, "status-speed-only");
  }

  get isTimeStopped(): boolean {
    return Number(this.customState.timeStopTimer ?? 0) > 0;
  }

  private get timeStopAbilityMultiplier(): number {
    return this.isTimeStopped ? 0 : 1;
  }

  takeDamage(
    amount: number,
    source: Fighter,
    game: Game,
    options?: {
      knockback?: number;
      hitColor?: string;
      ignoreCooldown?: boolean;
      damageKind?: DamageKind;
    }
  ): boolean {
    if (game.physicsTestMode) {
      return false;
    }

    if (this.defeated || (!options?.ignoreCooldown && this.hitCooldown > 0)) {
      return false;
    }

    const hpBefore = this.hp;
    const damageKind = options?.damageKind ?? "generic";
    const outgoingAmount = applyOutgoingRunModifier(source, this, amount, damageKind);
    let modifiedAmount =
      this.classDef.modifyIncomingDamage?.({
        game,
        self: this,
        enemy: source,
        source,
        amount: outgoingAmount,
        kind: damageKind,
        dt: 0
      }) ?? outgoingAmount;
    if (isRunDirectDamage(damageKind) && this.runModifiers.momentumBarrierReduction > 0 && this.customState.runBarrierReady) {
      modifiedAmount *= 1 - this.runModifiers.momentumBarrierReduction;
      this.customState.runBarrierReady = false;
      game.spawnAbilityText("BARRIER", this.classDef.secondaryColor, this.position);
    }
    if (isRunDirectDamage(damageKind) && this.customState.magnetBarrierReady) {
      modifiedAmount *= 0.9;
      this.customState.magnetBarrierReady = false;
      game.spawnAbilityText("ORBIT", this.classDef.secondaryColor, this.position);
    }

    modifiedAmount = this.applyRunIncomingModifiers(modifiedAmount, damageKind, game);
    modifiedAmount =
      source.classDef.modifyPostDefenseDamage?.({
        game,
        self: source,
        enemy: this,
        source,
        amount: modifiedAmount,
        kind: damageKind,
        dt: 0,
        originalAmount: outgoingAmount,
        modifiedAmount
      }) ?? modifiedAmount;
    let finalAmount = Math.max(0, modifiedAmount * this.runModifiers.damageTakenMultiplier);
    if (this.classDef.id === "vampire" && Number(this.customState.bloodFeastTimer ?? 0) > 0) {
      finalAmount *= 1 - BALANCE.vampire.bloodFeastDamageReduction;
    }

    const nextHp = this.hp - finalAmount;
    if (nextHp <= 0 && this.runModifiers.secondWind && !this.runModifiers.secondWindUsed) {
      this.runModifiers.secondWindUsed = true;
      this.hp = 1;
      this.flash = 0.5;
      game.spawnAbilityText("SECOND WIND", this.classDef.secondaryColor, this.position);
    } else {
      this.hp = clamp(nextHp, 0, this.maxHP);
    }
    if (
      this.classDef.id === "vampire" &&
      this.runModifiers.lastDrop &&
      !this.runModifiers.lastDropUsed &&
      hpBefore > 20 &&
      this.hp <= 20 &&
      !this.defeated
    ) {
      this.runModifiers.lastDropUsed = true;
      this.customState.lastDropTimer = 2;
      game.spawnAbilityText("LAST DROP", this.classDef.secondaryColor, this.position);
    }
    if (
      this.runModifiers.cleansePulse &&
      !this.runModifiers.cleansePulseUsed &&
      hpBefore > 40 &&
      this.hp <= 40 &&
      !this.defeated
    ) {
      this.runModifiers.cleansePulseUsed = true;
      this.statusEffects = this.statusEffects.filter((effect) => effect.type === "death-mark");
      this.slowTimer = 0;
      this.slowFactor = 1;
      this.normalizeToTargetSpeed("status-speed-only");
      game.spawnAbilityText("CLEANSE", this.classDef.secondaryColor, this.position);
    }

    const actualDamage = Math.max(0, hpBefore - this.hp);
    this.recordDamageStats(source, actualDamage, damageKind);
    this.hitCooldown = 0.28;
    this.flash = 0.16;

    if (actualDamage > 0) {
      if (hpBefore > 0 && this.hp <= 0) {
        if (source !== this) {
          source.stats.kos += 1;
        }
        game.registerFighterKo(this, source);
      }
      game.spawnHitEffect(this.position, options?.hitColor ?? source.classDef.primaryColor, actualDamage);
      game.addShake(Math.min(8, 2 + actualDamage * 0.12));
      source.classDef.onDamageDealt?.({
        game,
        self: source,
        enemy: this,
        source,
        amount: actualDamage,
        kind: damageKind,
        dt: 0
      });
    }
    this.classDef.onDamageTaken?.({
      game,
      self: this,
      enemy: source,
      source,
      amount: actualDamage,
      kind: damageKind,
      dt: 0
    });
    return true;
  }

  private applyRunIncomingModifiers(amount: number, damageKind: DamageKind, game: Game): number {
    let nextAmount = amount;
    if (damageKind === "projectile") {
      nextAmount *= this.runModifiers.projectileDamageTakenMultiplier;
    } else if (damageKind === "contact" || damageKind === "collision") {
      nextAmount *= this.runModifiers.contactDamageTakenMultiplier;
    } else if (damageKind === "dash") {
      nextAmount *= this.runModifiers.dashDamageTakenMultiplier;
    } else if (damageKind === "ability" || damageKind === "field" || damageKind === "explosion") {
      nextAmount *= this.runModifiers.abilityDamageTakenMultiplier;
    } else if (damageKind === "burn") {
      nextAmount *= this.runModifiers.burnDamageTakenMultiplier;
    } else if (damageKind === "poison" || damageKind === "bleed") {
      nextAmount *= this.runModifiers.poisonDamageTakenMultiplier;
    }

    if ((damageKind === "ability" || damageKind === "field" || damageKind === "explosion") && this.runModifiers.antiBurstCore && !this.runModifiers.antiBurstCoreUsed) {
      this.runModifiers.antiBurstCoreUsed = true;
      nextAmount *= 0.65;
      game.spawnAbilityText("ANTI-BURST", this.classDef.secondaryColor, this.position);
    }

    if (nextAmount > 15 && this.runModifiers.emergencyGuard && !this.runModifiers.emergencyGuardUsed) {
      this.runModifiers.emergencyGuardUsed = true;
      nextAmount *= 0.7;
      game.spawnAbilityText("EMERGENCY", this.classDef.secondaryColor, this.position);
    }

    return nextAmount;
  }

  heal(amount: number, source: Fighter, game: Game, sourceType: "lifesteal" | "ability" = "lifesteal"): number {
    if (amount <= 0 || this.defeated) {
      return 0;
    }

    const before = this.hp;
    this.hp = clamp(this.hp + amount, 0, this.maxHP);
    const healed = this.hp - before;
    if (healed <= 0) {
      return 0;
    }

    source.stats.healingDone += healed;
    this.stats.healingReceived += healed;
    if (sourceType === "lifesteal") {
      source.stats.lifestealHealing += healed;
    }
    game.spawnHealEffect(this.position, healed, this.classDef.secondaryColor);
    return healed;
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    for (let i = this.afterimages.length - 1; i >= 0; i -= 1) {
      const afterimage = this.afterimages[i];
      this.drawBody(ctx, time, afterimage.position, afterimage.alpha, afterimage.scale, true);
    }

    this.classDef.drawClassEffects(ctx, this, time);
    this.drawBody(ctx, time, this.position, 1, 1, false);
    this.classDef.drawWeapon(ctx, this, time);
    this.drawHP(ctx);
  }

  beginChaosKo(): boolean {
    if (this.chaosKoStarted) {
      return false;
    }

    this.chaosKoStarted = true;
    this.chaosKoHidden = false;
    this.chaosKoDuration = 0.6;
    this.chaosKoTimer = this.chaosKoDuration;
    this.hp = 0;
    this.velocity = { x: 0, y: 0 };
    this.acceleration = { x: 0, y: 0 };
    this.attackCooldown = Number.POSITIVE_INFINITY;
    this.contactCooldown = Number.POSITIVE_INFINITY;
    this.collisionDamageCooldown = Number.POSITIVE_INFINITY;
    this.afterimages = [];
    this.customState = {};
    return true;
  }

  updateChaosKo(dt: number): void {
    if (!this.chaosKoStarted || this.chaosKoHidden) {
      return;
    }

    this.chaosKoTimer = Math.max(0, this.chaosKoTimer - dt);
    this.afterimages = [];
    if (this.chaosKoTimer <= 0) {
      this.chaosKoHidden = true;
    }
  }

  drawChaosKo(ctx: CanvasRenderingContext2D, time: number): void {
    if (!this.chaosKoStarted || this.chaosKoHidden) {
      return;
    }

    const progress = 1 - this.chaosKoTimer / Math.max(0.001, this.chaosKoDuration);
    const alpha = clamp(1 - progress, 0, 1);
    const scale = 1 - progress * 0.24;
    this.drawBody(ctx, time, this.position, alpha, scale, false);
  }

  keepInsideArena(arena: Rect): void {
    this.applyWallBounce(arena, 0);
  }

  get mass(): number {
    return this.classDef.mass ?? 1;
  }

  get restitution(): number {
    return (this.classDef.restitution ?? MOVEMENT.defaultRestitution) * getGravityRestitutionMultiplier(this);
  }

  get minSpeed(): number {
    const gravitySpeedMultiplier = getGravitySpeedMultiplier(this);
    const normalMinimum = (this.classDef.minSpeed ?? MOVEMENT.minSpeed) * this.currentNonGravitySpeedMultiplier * gravitySpeedMultiplier;
    const insideGravityWell = this.statusEffects.some((effect) => effect.type === "gravity-well");
    if (!insideGravityWell) {
      return normalMinimum;
    }

    const baseTargetSpeed = (this.classDef.targetMoveSpeed ?? this.classDef.baseMoveSpeed) * this.currentNonGravitySpeedMultiplier;
    return Math.min(normalMinimum, baseTargetSpeed * BALANCE.gravity.minimumSuppressedSpeedMultiplier);
  }

  get maxSpeed(): number {
    return this.getMaxMoveSpeed();
  }

  get targetMoveSpeed(): number {
    if (this.customState.bladeDashTimer || this.customState.shadowStepDashTimer) {
      return (this.classDef.dashSpeed ?? BLADE.dashSpeed) * this.currentRunSpeedMultiplier;
    }

    return (this.classDef.targetMoveSpeed ?? this.classDef.baseMoveSpeed) * this.currentRunSpeedMultiplier;
  }

  ensureMinSpeed(): void {
    const minSpeed = this.minSpeed;
    const speed = length(this.velocity);
    if (speed >= minSpeed) {
      return;
    }

    this.normalizeToTargetSpeed("speed-normalize");
  }

  clampMoveSpeed(): void {
    const maxSpeed = this.getMaxMoveSpeed();
    const speed = length(this.velocity);
    if (speed > maxSpeed) {
      this.normalizeToTargetSpeed("speed-normalize");
    }
  }

  normalizeToTargetSpeed(reason: VelocityChangeReason): void {
    const speed = length(this.velocity);
    const direction = speed > 1 ? normalize(this.velocity) : { x: 1, y: 0 };
    const targetSpeed = clamp(this.targetMoveSpeed, this.minSpeed, this.getMaxMoveSpeed());
    this.setVelocity({ x: direction.x * targetSpeed, y: direction.y * targetSpeed }, reason);
  }

  applyWallBounce(arena: Rect, _dt: number, game?: Game): WallCollisionResult {
    const result = resolveWallCollision(this, arena);
    if (result.hit) {
      const reason: VelocityChangeReason =
        result.wall === "corner" || result.wall === "none" ? "wall-corner" : `wall-${result.wall}`;
      this.acceleration.x = 0;
      this.acceleration.y = 0;
      this.wallHugTimer = 0;
      this.wallBounceLockTime = MOVEMENT.wallBounceLockTime;
      this.lastWallHit = result.wall;
      this.stats.wallBounces += 1;
      if (this.runModifiers.afterWallBounceSpeedDuration > 0) {
        this.customState.runWallBoostTimer = this.runModifiers.afterWallBounceSpeedDuration;
      }
      if (this.runModifiers.momentumBarrierReduction > 0) {
        this.customState.runBarrierReady = true;
      }
      this.normalizeAfterWallBounce(reason);
      if (game && !game.physicsTestMode) {
        this.classDef.onWallBounce?.({
          game,
          self: this,
          enemy: game.getEnemyOf(this),
          dt: _dt,
          collision: result
        });
      }
    }

    return result;
  }

  private integrate(dt: number, game: Game): void {
    if (this.isTimeStopped) {
      this.velocity.x = 0;
      this.velocity.y = 0;
      return;
    }

    const statusSpeed = this.slowTimer > 0 ? this.slowFactor : 1;
    this.clearSlow();

    this.acceleration.x = 0;
    this.acceleration.y = 0;

    this.clampMoveSpeed();
    this.ensureMinSpeed();

    this.position.x += this.velocity.x * dt * statusSpeed;
    this.position.y += this.velocity.y * dt * statusSpeed;

    const wallHit = this.applyWallBounce(game.arenaInner, dt, game);
    if (wallHit.hit) {
      game.spawnWallImpact(wallHit.point, wallHit.normal, this.classDef.primaryColor, wallHit.impactSpeed);
    }
    this.clampMoveSpeed();
  }

  private getMaxMoveSpeed(): number {
    const normalMax = this.classDef.maxSpeed ?? Math.max(MOVEMENT.maxSpeed, this.classDef.baseMoveSpeed * 1.08);
    const dashMax = this.classDef.dashSpeed ?? BLADE.dashSpeed;
    const dashing = this.customState.bladeDashTimer || this.customState.shadowStepDashTimer;
    const baseMax = dashing ? Math.max(normalMax, dashMax) : normalMax;
    return baseMax * this.currentRunSpeedMultiplier;
  }

  private get currentRunSpeedMultiplier(): number {
    return this.currentNonGravitySpeedMultiplier * getGravitySpeedMultiplier(this);
  }

  private get currentNonGravitySpeedMultiplier(): number {
    const wallBoost = Number(this.customState.runWallBoostTimer ?? 0) > 0 ? this.runModifiers.afterWallBounceSpeedMultiplier : 1;
    return this.runModifiers.moveSpeedMultiplier * wallBoost;
  }

  private normalizeAfterWallBounce(reason: VelocityChangeReason): void {
    const direction = safeNormalize(this.velocity, { x: 1, y: 0 });
    const restitutionMultiplier = getGravityRestitutionMultiplier(this);
    const targetSpeed = clamp(this.targetMoveSpeed * restitutionMultiplier, this.minSpeed, this.getMaxMoveSpeed());
    this.setVelocity({ x: direction.x * targetSpeed, y: direction.y * targetSpeed }, reason);
  }

  private updateTimeStop(dt: number): void {
    const timer = Number(this.customState.timeStopTimer ?? 0);
    if (timer <= 0) {
      return;
    }

    const nextTimer = Math.max(0, timer - dt);
    this.customState.timeStopTimer = nextTimer;
    if (nextTimer > 0) {
      this.velocity.x = 0;
      this.velocity.y = 0;
      this.stats.slowUptime += dt;
      return;
    }

    const direction = safeNormalize({
      x: Number(this.customState.timeStopDirX ?? 1),
      y: Number(this.customState.timeStopDirY ?? 0)
    });
    const targetSpeed = clamp(this.targetMoveSpeed, this.minSpeed, this.getMaxMoveSpeed());
    this.setVelocity({ x: direction.x * targetSpeed, y: direction.y * targetSpeed }, "status-speed-only");
  }

  private recordAfterimage(dt: number): void {
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    const dashBoost = this.customState.bladeDashTimer || this.customState.shadowStepDashTimer ? 1 : 0;
    const shouldRecord = speed > 38 || dashBoost > 0 || this.slowTimer > 0;

    if (shouldRecord) {
      this.afterimages.unshift({
        position: copyVec(this.position),
        rotation: angleTo({ x: 0, y: 0 }, this.velocity),
        scale: dashBoost ? 1.08 : 1,
        alpha: dashBoost ? 0.5 : 0.27
      });
    }

    this.afterimages = this.afterimages.slice(0, dashBoost ? 24 : 14);
    for (const afterimage of this.afterimages) {
      afterimage.alpha *= Math.pow(0.006, dt);
      afterimage.scale *= 0.998;
    }
  }

  private drawBody(
    ctx: CanvasRenderingContext2D,
    time: number,
    position: Vec2,
    alpha: number,
    scale: number,
    afterimage: boolean
  ): void {
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    const pulse = 1 + Math.sin(time * 7 + this.id.length) * 0.018;
    const radius = this.radius * pulse;
    const gradient = ctx.createRadialGradient(-10, -12, 5, 0, 0, radius);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.28, this.flash > 0 && !afterimage ? "#ffffff" : this.classDef.secondaryColor);
    gradient.addColorStop(1, this.classDef.primaryColor);

    ctx.fillStyle = gradient;
    ctx.strokeStyle = this.classDef.outlineColor;
    ctx.lineWidth = afterimage ? 3 : 6;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (!afterimage) {
      const gravitySuppressed = this.statusEffects.some((effect) => effect.type === "gravity-mark" || effect.type === "gravity-well");
      if (this.isTimeStopped || gravitySuppressed) {
        ctx.strokeStyle = this.isTimeStopped ? "rgba(223,246,255,0.95)" : "rgba(189,164,255,0.88)";
        ctx.lineWidth = this.isTimeStopped ? 5 : 4;
        ctx.beginPath();
        ctx.arc(0, 0, radius + (this.isTimeStopped ? 10 : 7), 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-8, -8, radius * 0.52, Math.PI * 0.9, Math.PI * 1.55);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawHP(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y + 2);
    ctx.font = "900 12px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#111119";
    ctx.fillStyle = this.classDef.secondaryColor;
    const label = getFighterHudLabel(this.id);
    ctx.strokeText(label, 0, -19);
    ctx.fillText(label, 0, -19);

    ctx.font = "900 28px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#111119";
    ctx.fillStyle = "#ffffff";
    const hpText = `${Math.ceil(this.hp)}`;
    ctx.strokeText(hpText, 0, 0);
    ctx.fillText(hpText, 0, 0);
    ctx.restore();
  }

  get distanceTravelSpeed(): number {
    return Math.hypot(this.velocity.x, this.velocity.y);
  }

  distanceTo(other: Fighter): number {
    return distance(this.position, other.position);
  }

  private recordDamageStats(source: Fighter, amount: number, damageKind: DamageKind): void {
    if (amount <= 0) {
      return;
    }

    this.stats.damageTaken += amount;
    source.stats.damageDealt += amount;

    switch (damageKind) {
      case "projectile":
        source.stats.projectileDamage += amount;
        source.stats.projectileHits += 1;
        break;
      case "contact":
        source.stats.contactDamage += amount;
        source.stats.contactHits += 1;
        break;
      case "dash":
        source.stats.dashDamage += amount;
        source.stats.dashHits += 1;
        break;
      case "burn":
        source.stats.burnDamage += amount;
        source.stats.statusTicks += 1;
        break;
      case "poison":
        source.stats.poisonDamage += amount;
        source.stats.statusTicks += 1;
        break;
      case "bleed":
        source.stats.bleedDamage += amount;
        source.stats.statusTicks += 1;
        break;
      case "counter":
        source.stats.counterDamage += amount;
        source.stats.counterHits += 1;
        if (source.classDef.id === "mirror") {
          source.stats.shatterShotDamage += amount;
        }
        break;
      case "ability":
        source.stats.abilityDamage += amount;
        source.stats.abilityHits += 1;
        break;
      case "field":
        source.stats.abilityDamage += amount;
        source.stats.statusTicks += 1;
        break;
      case "explosion":
        source.stats.explosionDamage += amount;
        source.stats.explosionHits += 1;
        source.stats.abilityDamage += amount;
        break;
      case "collision":
        source.stats.collisionDamage += amount;
        break;
      default:
        source.stats.unknownDamage += amount;
        break;
    }
  }
}

function getFighterHudLabel(id: string): string {
  if (id === "left") {
    return "A";
  }
  if (id === "right") {
    return "B";
  }
  const match = /^chaos-(\d+)$/.exec(id);
  if (match) {
    return String.fromCharCode(65 + Number(match[1]));
  }
  return id.slice(0, 1).toUpperCase();
}
