import type { Game } from "../Game";
import type { Fighter } from "../entities/Fighter";
import { BALANCE } from "../tuning";

export type StatusEffectType = "burn" | "poison" | "gravity-mark" | "gravity-well" | "death-mark";

export type BurnOptions = {
  damagePerSecond: number;
  duration: number;
  stacks: number;
  maxStacks: number;
};

export type PoisonOptions = {
  damagePerSecond: number;
  duration: number;
  stacks: number;
  maxStacks: number;
};

export type GravityStatusOptions = {
  type?: "gravity-mark" | "gravity-well";
  duration: number;
  speedMultiplier: number;
  abilityChargeMultiplier: number;
  restitutionMultiplier: number;
};

export type DeathMarkOptions = {
  duration: number;
  stacks: number;
  maxStacks: number;
};

export type StatusEffect = {
  type: StatusEffectType;
  source: Fighter;
  remaining: number;
  stacks: number;
  maxStacks: number;
  damagePerSecond: number;
  tickTimer: number;
  visualTimer: number;
  speedMultiplier?: number;
  abilityChargeMultiplier?: number;
  restitutionMultiplier?: number;
};

const BURN_TICK_INTERVAL = 0.5;
const POISON_TICK_INTERVAL = 0.5;

export function applyBurn(target: Fighter, source: Fighter, options: BurnOptions): void {
  const duration = getEffectiveBurnDuration(target, options.duration);
  const existing = target.statusEffects.find((effect) => effect.type === "burn" && effect.source === source);
  if (existing) {
    existing.remaining = Math.max(existing.remaining, duration);
    existing.stacks = Math.min(options.maxStacks, existing.stacks + options.stacks);
    existing.damagePerSecond = options.damagePerSecond;
    existing.maxStacks = options.maxStacks;
    return;
  }

  target.statusEffects.push({
    type: "burn",
    source,
    remaining: duration,
    stacks: Math.min(options.maxStacks, options.stacks),
    maxStacks: options.maxStacks,
    damagePerSecond: options.damagePerSecond,
    tickTimer: BURN_TICK_INTERVAL,
    visualTimer: 0
  });
}

export function applyPoison(target: Fighter, source: Fighter, options: PoisonOptions): void {
  const duration = getEffectivePoisonDuration(target, options.duration);
  const existing = target.statusEffects.find((effect) => effect.type === "poison" && effect.source === source);
  if (existing) {
    existing.remaining = Math.max(existing.remaining, duration);
    existing.stacks = Math.min(options.maxStacks, existing.stacks + options.stacks);
    existing.damagePerSecond = options.damagePerSecond;
    existing.maxStacks = options.maxStacks;
    return;
  }

  target.statusEffects.push({
    type: "poison",
    source,
    remaining: duration,
    stacks: Math.min(options.maxStacks, options.stacks),
    maxStacks: options.maxStacks,
    damagePerSecond: options.damagePerSecond,
    tickTimer: POISON_TICK_INTERVAL,
    visualTimer: 0
  });
}

export function applyGravityStatus(target: Fighter, source: Fighter, options: GravityStatusOptions): void {
  const type = options.type ?? "gravity-mark";
  const duration = getEffectiveGravityDuration(target, options.duration);
  const existing = target.statusEffects.find((effect) => effect.type === type && effect.source === source);
  if (existing) {
    existing.remaining = Math.max(existing.remaining, duration);
    existing.speedMultiplier = Math.min(existing.speedMultiplier ?? 1, options.speedMultiplier);
    existing.abilityChargeMultiplier = Math.min(existing.abilityChargeMultiplier ?? 1, options.abilityChargeMultiplier);
    existing.restitutionMultiplier = Math.min(existing.restitutionMultiplier ?? 1, options.restitutionMultiplier);
    return;
  }

  target.statusEffects.push({
    type,
    source,
    remaining: duration,
    stacks: 1,
    maxStacks: 1,
    damagePerSecond: 0,
    tickTimer: 0,
    visualTimer: 0,
    speedMultiplier: options.speedMultiplier,
    abilityChargeMultiplier: options.abilityChargeMultiplier,
    restitutionMultiplier: options.restitutionMultiplier
  });
}

export function applyDeathMark(target: Fighter, source: Fighter, options: DeathMarkOptions): void {
  const existing = target.statusEffects.find((effect) => effect.type === "death-mark" && effect.source === source);
  if (existing) {
    existing.remaining = Math.max(existing.remaining, options.duration);
    existing.stacks = Math.min(options.maxStacks, existing.stacks + options.stacks);
    existing.maxStacks = options.maxStacks;
  } else {
    target.statusEffects.push({
      type: "death-mark",
      source,
      remaining: options.duration,
      stacks: Math.min(options.maxStacks, options.stacks),
      maxStacks: options.maxStacks,
      damagePerSecond: 0,
      tickTimer: 0,
      visualTimer: 0
    });
  }

  source.stats.deathMarksApplied += options.stacks;
  if (getDeathMarkStacks(target, source) >= options.maxStacks) {
    source.stats.maxDeathMarksReached += 1;
  }
}

function getEffectiveBurnDuration(target: Fighter, duration: number): number {
  let nextDuration = duration * target.runModifiers.statusTakenDurationMultiplier;
  if (target.classDef.id === "thunder") {
    nextDuration *= BALANCE.thunder.burnDurationMultiplier;
  }

  return nextDuration;
}

function getEffectivePoisonDuration(target: Fighter, duration: number): number {
  let nextDuration = duration * target.runModifiers.statusTakenDurationMultiplier;
  if (target.classDef.id === "thunder") {
    nextDuration *= BALANCE.thunder.burnDurationMultiplier;
  }

  return nextDuration;
}

function getEffectiveGravityDuration(target: Fighter, duration: number): number {
  let nextDuration = duration * target.runModifiers.statusTakenDurationMultiplier;
  if (target.classDef.id === "thunder") {
    nextDuration *= BALANCE.thunder.slowDurationMultiplier;
  }

  return nextDuration;
}

export function updateStatusEffects(target: Fighter, dt: number, game: Game): void {
  const hadGravitySuppression = target.statusEffects.some((effect) => effect.type === "gravity-mark" || effect.type === "gravity-well");

  for (const effect of target.statusEffects) {
    effect.remaining -= dt;

    if (effect.type === "burn") {
      effect.source.stats.burnUptime += dt;
      effect.tickTimer -= dt;
      effect.visualTimer -= dt;

      if (effect.tickTimer <= 0) {
        effect.tickTimer += BURN_TICK_INTERVAL;
        target.takeDamage(effect.damagePerSecond * effect.stacks * BURN_TICK_INTERVAL, effect.source, game, {
          hitColor: "#ff8a31",
          ignoreCooldown: true,
          damageKind: "burn"
        });
      }

      if (effect.visualTimer <= 0) {
        effect.visualTimer = Math.max(0.08, 0.22 - effect.stacks * 0.035);
        game.spawnFireSpark(target.position, "#ff8a31");
      }
    } else if (effect.type === "poison") {
      effect.source.stats.poisonUptime += dt;
      effect.tickTimer -= dt;
      effect.visualTimer -= dt;

      if (effect.tickTimer <= 0) {
        effect.tickTimer += POISON_TICK_INTERVAL;
        target.takeDamage(effect.damagePerSecond * effect.stacks * POISON_TICK_INTERVAL, effect.source, game, {
          hitColor: "#9eff58",
          ignoreCooldown: true,
          damageKind: "poison"
        });
      }

      if (effect.visualTimer <= 0) {
        effect.visualTimer = Math.max(0.1, 0.28 - effect.stacks * 0.04);
        game.spawnPoisonSpark(target.position, "#9eff58");
      }
    } else if (effect.type === "gravity-mark" || effect.type === "gravity-well") {
      effect.visualTimer -= dt;
      if (effect.visualTimer <= 0) {
        effect.visualTimer = effect.type === "gravity-well" ? 0.16 : 0.24;
        game.spawnGravitySpark(target.position, effect.type === "gravity-well" ? "#bda4ff" : "#6d52b8");
      }
    } else if (effect.type === "death-mark") {
      effect.visualTimer -= dt;
      if (effect.visualTimer <= 0) {
        effect.visualTimer = Math.max(0.18, 0.42 - effect.stacks * 0.04);
        game.spawnReaperSpark(target.position, "#e8fbff");
      }
    }
  }

  target.statusEffects = target.statusEffects.filter((effect) => effect.remaining > 0 && !effect.source.defeated);

  const hasGravitySuppression = target.statusEffects.some((effect) => effect.type === "gravity-mark" || effect.type === "gravity-well");
  if (hadGravitySuppression && !hasGravitySuppression && !target.defeated && !target.isTimeStopped) {
    target.normalizeToTargetSpeed("status-speed-only");
  }
}

export function getGravitySpeedMultiplier(target: Fighter): number {
  const multiplier = target.statusEffects
    .filter((effect) => effect.type === "gravity-mark" || effect.type === "gravity-well")
    .reduce((current, effect) => Math.min(current, effect.speedMultiplier ?? 1), 1);
  return Math.max(BALANCE.gravity.minimumSuppressedSpeedMultiplier, multiplier);
}

export function getGravityAbilityChargeMultiplier(target: Fighter): number {
  return target.statusEffects
    .filter((effect) => effect.type === "gravity-mark" || effect.type === "gravity-well")
    .reduce((current, effect) => Math.min(current, effect.abilityChargeMultiplier ?? 1), 1);
}

export function getGravityRestitutionMultiplier(target: Fighter): number {
  return target.statusEffects
    .filter((effect) => effect.type === "gravity-mark" || effect.type === "gravity-well")
    .reduce((current, effect) => Math.min(current, effect.restitutionMultiplier ?? 1), 1);
}

export function getPoisonStacks(target: Fighter): number {
  return target.statusEffects
    .filter((effect) => effect.type === "poison")
    .reduce((total, effect) => total + effect.stacks, 0);
}

export function getPoisonAbilityChargeMultiplier(target: Fighter): number {
  const poisonEffects = target.statusEffects.filter((effect) => effect.type === "poison");
  const stacks = Math.min(
    BALANCE.poison.maxPoisonStacks,
    poisonEffects.reduce((total, effect) => total + effect.stacks, 0)
  );
  if (stacks <= 0 || poisonEffects.length === 0) {
    return 1;
  }

  const bonus = poisonEffects.reduce((best, effect) => Math.max(best, effect.source.runModifiers.poisonChargeDebuffBonus), 0);
  return Math.max(
    1 - BALANCE.poison.chargeDebuffMax - bonus,
    1 - stacks * (BALANCE.poison.chargeDebuffPerStack + bonus)
  );
}

export function getDeathMarkStacks(target: Fighter, source?: Fighter): number {
  return target.statusEffects
    .filter((effect) => effect.type === "death-mark" && (!source || effect.source === source))
    .reduce((total, effect) => total + effect.stacks, 0);
}

export function consumeDeathMarks(target: Fighter, source: Fighter): number {
  const marks = getDeathMarkStacks(target, source);
  target.statusEffects = target.statusEffects.filter((effect) => !(effect.type === "death-mark" && effect.source === source));
  source.stats.marksConsumed += marks;
  return marks;
}

export function getBurnStacks(target: Fighter): number {
  return target.statusEffects
    .filter((effect) => effect.type === "burn")
    .reduce((total, effect) => total + effect.stacks, 0);
}
