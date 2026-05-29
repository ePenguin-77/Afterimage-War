import { playableClasses } from "../classes/classRegistry";
import {
  cloneRunModifiers,
  createDefaultRunModifiers,
  type RunModifiers,
  type SelectedUpgradeRecord,
  type UpgradeDefinition
} from "./Upgrade";

export type LeagueRunPhase = "idle" | "battle" | "reward" | "lost" | "cleared";

export type LeagueRunState = {
  mode: "league-run";
  phase: LeagueRunPhase;
  playerClassId: string;
  round: number;
  totalRounds: number;
  roundsCleared: number;
  opponentClassId: string;
  opponentLabel: string;
  opponentModifierSummary: string;
  bossRound: boolean;
  nextOpponentClassId: string;
  nextOpponentLabel: string;
  nextOpponentModifierSummary: string;
  nextOpponentModifiers: RunModifiers;
  nextBossRound: boolean;
  recommendationTags: string[];
  playerModifiers: RunModifiers;
  opponentModifiers: RunModifiers;
  upgrades: UpgradeDefinition[];
  selectedUpgrades: SelectedUpgradeRecord[];
  pendingChoices: UpgradeDefinition[];
  defeatedOpponents: string[];
  totalDamageDealt: number;
  totalDamageTaken: number;
  damageSources: Record<string, number>;
  totalWins: number;
  finalOpponentName: string;
  totalTime: number;
  isRunOver: boolean;
  isRunCleared: boolean;
};

export function createLeagueRunState(playerClassId: string): LeagueRunState {
  const state: LeagueRunState = {
    mode: "league-run",
    phase: "idle",
    playerClassId,
    round: 1,
    totalRounds: 6,
    roundsCleared: 0,
    opponentClassId: playerClassId,
    opponentLabel: "",
    opponentModifierSummary: "",
    bossRound: false,
    nextOpponentClassId: "",
    nextOpponentLabel: "",
    nextOpponentModifierSummary: "",
    nextOpponentModifiers: createDefaultRunModifiers(),
    nextBossRound: false,
    recommendationTags: [],
    playerModifiers: createDefaultRunModifiers(),
    opponentModifiers: createDefaultRunModifiers(),
    upgrades: [],
    selectedUpgrades: [],
    pendingChoices: [],
    defeatedOpponents: [],
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    damageSources: {},
    totalWins: 0,
    finalOpponentName: "",
    totalTime: 0,
    isRunOver: false,
    isRunCleared: false
  };
  assignOpponentForRound(state);
  return state;
}

export function assignOpponentForRound(state: LeagueRunState): void {
  const assignment = createOpponentAssignment(state, state.round);
  state.opponentClassId = assignment.classId;
  state.bossRound = assignment.bossRound;
  state.opponentLabel = assignment.label;
  state.opponentModifierSummary = assignment.modifierSummary;
  state.opponentModifiers = assignment.modifiers;
}

export function prepareNextOpponent(state: LeagueRunState): void {
  const nextRound = state.round + 1;
  const assignment = createOpponentAssignment(state, nextRound);
  state.nextOpponentClassId = assignment.classId;
  state.nextBossRound = assignment.bossRound;
  state.nextOpponentLabel = assignment.label;
  state.nextOpponentModifierSummary = assignment.modifierSummary;
  state.nextOpponentModifiers = assignment.modifiers;
  state.recommendationTags = getOpponentRecommendations(assignment.classId);
}

export function promotePreparedOpponent(state: LeagueRunState): void {
  state.round += 1;
  if (!state.nextOpponentClassId) {
    assignOpponentForRound(state);
    return;
  }

  state.opponentClassId = state.nextOpponentClassId;
  state.bossRound = state.nextBossRound;
  state.opponentLabel = state.nextOpponentLabel;
  state.opponentModifierSummary = state.nextOpponentModifierSummary;
  state.opponentModifiers = cloneRunModifiers(state.nextOpponentModifiers);
  clearPreparedOpponent(state);
}

function clearPreparedOpponent(state: LeagueRunState): void {
  state.nextOpponentClassId = "";
  state.nextOpponentLabel = "";
  state.nextOpponentModifierSummary = "";
  state.nextOpponentModifiers = createDefaultRunModifiers();
  state.nextBossRound = false;
  state.recommendationTags = [];
}

function createOpponentAssignment(state: LeagueRunState, round: number): {
  classId: string;
  label: string;
  modifierSummary: string;
  bossRound: boolean;
  modifiers: RunModifiers;
} {
  const available = playableClasses.map((fighterClass) => fighterClass.id);
  const nonMirror = available.filter((classId) => classId !== state.playerClassId);
  const recent = state.defeatedOpponents.slice(-2);
  const filtered = nonMirror.filter((classId) => !recent.includes(classId));
  const basePool = filtered.length > 0 ? filtered : nonMirror;
  const pool = Math.random() < 0.15 ? available : basePool;
  const chosen = pool[Math.floor(Math.random() * pool.length)] ?? state.playerClassId;
  const bossRound = round >= state.totalRounds;
  return {
    classId: chosen,
    bossRound,
    label: bossRound ? "Boss" : roundModifierLabel(round),
    modifierSummary: roundModifierSummary(round, state.totalRounds),
    modifiers: createOpponentModifiers(round, state.totalRounds)
  };
}

export function cloneLeaguePlayerModifiers(state: LeagueRunState): RunModifiers {
  const modifiers = cloneRunModifiers(state.playerModifiers);
  modifiers.secondWindUsed = false;
  modifiers.lastDropUsed = false;
  modifiers.cleansePulseUsed = false;
  modifiers.antiBurstCoreUsed = false;
  modifiers.emergencyGuardUsed = false;
  return modifiers;
}

export function createOpponentModifiers(round: number, totalRounds: number): RunModifiers {
  const modifiers = createDefaultRunModifiers();
  if (round >= 3) {
    modifiers.abilityChargeMultiplier *= 1.05;
  }
  if (round >= 4) {
    modifiers.projectileDamageMultiplier *= 1.05;
    modifiers.contactDamageMultiplier *= 1.05;
    modifiers.dashDamageMultiplier *= 1.05;
    modifiers.abilityDamageMultiplier *= 1.05;
    modifiers.burnDamageMultiplier *= 1.05;
    modifiers.poisonDamageMultiplier *= 1.05;
    modifiers.counterDamageMultiplier *= 1.05;
  }
  if (round >= 5) {
    modifiers.moveSpeedMultiplier *= 1.05;
  }
  if (round >= totalRounds) {
    modifiers.abilityChargeMultiplier *= 1.1;
    modifiers.abilityDurationMultiplier *= 1.1;
    modifiers.moveSpeedMultiplier *= 1.08;
    modifiers.projectileDamageMultiplier *= 1.1;
    modifiers.contactDamageMultiplier *= 1.1;
    modifiers.dashDamageMultiplier *= 1.1;
    modifiers.abilityDamageMultiplier *= 1.1;
    modifiers.burnDamageMultiplier *= 1.1;
    modifiers.poisonDamageMultiplier *= 1.1;
    modifiers.counterDamageMultiplier *= 1.1;
  }
  return modifiers;
}

function roundModifierLabel(round: number): string {
  if (round >= 5) {
    return "Elite Rival";
  }
  if (round >= 4) {
    return "Power Rival";
  }
  if (round >= 3) {
    return "Tempo Rival";
  }
  return "Rival";
}

function roundModifierSummary(round: number, totalRounds: number): string {
  if (round >= totalRounds) {
    return "+10% dmg/charge/duration, +8% speed";
  }
  if (round >= 5) {
    return "+5% charge/damage/speed";
  }
  if (round >= 4) {
    return "+5% charge/damage";
  }
  if (round >= 3) {
    return "+5% charge";
  }
  return "No modifier";
}

function getOpponentRecommendations(classId: string): string[] {
  const recommendations: Record<string, string[]> = {
    chrono: ["Burst damage", "Ability charge", "Avoid slow-only"],
    blade: ["Impact Guard", "Dash protection", "Armor / barrier"],
    shield: ["Damage over time", "Ability damage", "Avoid pure contact"],
    fire: ["Heat Guard", "Faster burst", "Damage reduction"],
    thunder: ["Burst reduction", "Reliable damage", "Slow / suppression"],
    poison: ["Toxin Guard", "Burst damage", "Ability charge"],
    gravity: ["Projectile damage", "Ability burst", "Steady Core"],
    vampire: ["Burst damage", "Execute damage", "Sustain pressure"],
    bomb: ["Movement speed", "Damage reduction", "Ranged pressure"],
    mirror: ["AoE damage", "DoT pressure", "Avoid pure projectile"],
    magnet: ["Contact damage", "AoE / DoT", "Avoid pure projectile"],
    ricochet: ["Projectile defense", "Burst damage", "Evasion"],
    reaper: ["Mark resistance", "Burst before execute", "Damage reduction"],
    crusher: ["Ranged pressure", "Impact Guard", "Status damage"],
    spike: ["Ranged pressure", "DoT pressure", "Avoid pure contact"],
    monk: ["Thorn defense", "Contact reduction", "Keep distance"],
    berserker: ["Burst before rage", "Contact reduction", "Avoid low HP trades"],
    drill: ["Keep distance", "DoT pressure", "Avoid armor reliance"],
    ninja: ["Contact reduction", "AoE pressure", "Projectile evasion bypass"],
    fang: ["Impact Guard", "Status Filter", "Keep distance"],
    spear: ["Long-range pressure", "Burst damage", "Avoid narrow lanes"],
    sniper: ["Melee pressure", "Projectile plating", "Close distance"],
    vector: ["Avoid line crossings", "Burst before web", "Movement control"],
    portal: ["Predict exits", "Punish contact", "Sustained pressure"],
    glass: ["Sustained pressure", "DoT pressure", "Force charges down"]
  };
  return recommendations[classId] ?? ["Reliable damage", "Damage reduction", "Ability charge"];
}
