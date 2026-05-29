export type UpgradeRarity = "common" | "uncommon" | "rare";

export type RunModifiers = {
  moveSpeedMultiplier: number;
  projectileDamageMultiplier: number;
  projectileSpeedMultiplier: number;
  contactDamageMultiplier: number;
  dashDamageMultiplier: number;
  abilityDamageMultiplier: number;
  abilityDurationMultiplier: number;
  counterDamageMultiplier: number;
  projectileDamageTakenMultiplier: number;
  contactDamageTakenMultiplier: number;
  dashDamageTakenMultiplier: number;
  abilityDamageTakenMultiplier: number;
  burnDamageTakenMultiplier: number;
  poisonDamageTakenMultiplier: number;
  statusTakenDurationMultiplier: number;
  burnDamageMultiplier: number;
  burnDurationMultiplier: number;
  poisonDamageMultiplier: number;
  poisonDurationMultiplier: number;
  poisonChargeDebuffBonus: number;
  gravitySuppressionBonus: number;
  gravityMarkDurationBonus: number;
  vampireLifestealBonus: number;
  bloodFeastDurationBonus: number;
  bloodRushChargeMultiplier: number;
  lastDrop: boolean;
  lastDropUsed: boolean;
  bombRadiusBonus: number;
  bombFuseTimeBonus: number;
  bombWallChanceBonus: number;
  chainDamageMultiplier: number;
  chainRadiusBonus: number;
  mirrorEvadeBonus: number;
  mirrorDecoyCountBonus: number;
  mirrorDecoyDurationBonus: number;
  mirrorDecoySpeedMultiplier: number;
  mirrorShatterDamageMultiplier: number;
  magnetMaxShardsBonus: number;
  magnetShardRegenIntervalBonus: number;
  magnetStormDurationBonus: number;
  magnetFirstBlockBarrier: boolean;
  magnetFirstBlockBarrierUsed: boolean;
  ricochetDamageBonusPerBounceBonus: number;
  ricochetMaxBouncesBonus: number;
  ricochetBarrageShotBonus: number;
  ricochetPerfectBankBonus: number;
  deathMarkDurationBonus: number;
  soulReapDamagePerMarkMultiplier: number;
  reaperExecuteThresholdBonus: number;
  reaperFinalWhisper: boolean;
  reaperFinalWhisperUsed: boolean;
  crusherImpactBonusMultiplier: number;
  crusherImpactThresholdReduction: number;
  crusherForceDurationBonus: number;
  spikeReflectBonus: number;
  spikeArmorDurationBonus: number;
  spikeWallChargeBonus: number;
  spikeArmorDamageTakenMultiplier: number;
  monkMaxComboBonus: number;
  monkContactCooldownReduction: number;
  monkPalmDamagePerComboMultiplier: number;
  monkPalmRadiusBonus: number;
  monkComboDecayDelayBonus: number;
  berserkerMaxRageContactBonus: number;
  berserkerRageBreakDurationBonus: number;
  berserkerBloodRushMeterBonus: number;
  berserkerRageAbilityChargeBonus: number;
  berserkerLowHpContactMultiplier: number;
  berserkerContactCooldownMultiplier: number;
  drillArmorBreakEffectBonus: number;
  drillArmorBreakStackCapBonus: number;
  drillPiercingDurationBonus: number;
  drillSpinUpDurationBonus: number;
  drillDefensePierceBonus: number;
  drillSpinUpDamageBonus: number;
  ninjaDashDurationBonus: number;
  ninjaDashCountBonus: number;
  ninjaDashDamageMultiplier: number;
  ninjaEvadeBonus: number;
  ninjaWallShadowBonus: number;
  glassMaxChargesBonus: number;
  glassShiftDurationBonus: number;
  glassWallBounceRequirementReduction: number;
  statusDurationMultiplier: number;
  abilityChargeMultiplier: number;
  attackIntervalMultiplier: number;
  damageTakenMultiplier: number;
  finisherDamageMultiplier: number;
  afterWallBounceSpeedMultiplier: number;
  afterWallBounceSpeedDuration: number;
  momentumBarrierReduction: number;
  dashDurationBonus: number;
  dashGrazeRadiusBonus: number;
  dashGuardReductionBonus: number;
  timeStopDurationBonus: number;
  predictiveLeadBonus: number;
  collisionDamageReductionBonus: number;
  lightningDamageReductionBonus: number;
  flameBurstRadiusBonus: number;
  toxicCloudRadiusBonus: number;
  gravityWellRadiusBonus: number;
  gravityWellDurationBonus: number;
  armorChargesBonus: number;
  armorReductionBonus: number;
  armorRegenIntervalMultiplier: number;
  guardDurationBonus: number;
  staticChargeMaxBonus: number;
  staticChargeCooldownMultiplier: number;
  lightningDamageMultiplier: number;
  secondWind: boolean;
  secondWindUsed: boolean;
  cleansePulse: boolean;
  cleansePulseUsed: boolean;
  antiBurstCore: boolean;
  antiBurstCoreUsed: boolean;
  emergencyGuard: boolean;
  emergencyGuardUsed: boolean;
};

export type UpgradeDefinition = {
  id: string;
  name: string;
  description: string;
  effectText: string;
  rarity: UpgradeRarity;
  allowedClassIds?: string[];
  apply(modifiers: RunModifiers): void;
};

export type SelectedUpgradeRecord = {
  id: string;
  name: string;
  description: string;
  rarity: UpgradeRarity;
  roundAcquired: number;
  effectSummary: string;
};

export function createDefaultRunModifiers(): RunModifiers {
  return {
    moveSpeedMultiplier: 1,
    projectileDamageMultiplier: 1,
    projectileSpeedMultiplier: 1,
    contactDamageMultiplier: 1,
    dashDamageMultiplier: 1,
    abilityDamageMultiplier: 1,
    abilityDurationMultiplier: 1,
    counterDamageMultiplier: 1,
    projectileDamageTakenMultiplier: 1,
    contactDamageTakenMultiplier: 1,
    dashDamageTakenMultiplier: 1,
    abilityDamageTakenMultiplier: 1,
    burnDamageTakenMultiplier: 1,
    poisonDamageTakenMultiplier: 1,
    statusTakenDurationMultiplier: 1,
    burnDamageMultiplier: 1,
    burnDurationMultiplier: 1,
    poisonDamageMultiplier: 1,
    poisonDurationMultiplier: 1,
    poisonChargeDebuffBonus: 0,
    gravitySuppressionBonus: 0,
    gravityMarkDurationBonus: 0,
    vampireLifestealBonus: 0,
    bloodFeastDurationBonus: 0,
    bloodRushChargeMultiplier: 1,
    lastDrop: false,
    lastDropUsed: false,
    bombRadiusBonus: 0,
    bombFuseTimeBonus: 0,
    bombWallChanceBonus: 0,
    chainDamageMultiplier: 1,
    chainRadiusBonus: 0,
    mirrorEvadeBonus: 0,
    mirrorDecoyCountBonus: 0,
    mirrorDecoyDurationBonus: 0,
    mirrorDecoySpeedMultiplier: 1,
    mirrorShatterDamageMultiplier: 1,
    magnetMaxShardsBonus: 0,
    magnetShardRegenIntervalBonus: 0,
    magnetStormDurationBonus: 0,
    magnetFirstBlockBarrier: false,
    magnetFirstBlockBarrierUsed: false,
    ricochetDamageBonusPerBounceBonus: 0,
    ricochetMaxBouncesBonus: 0,
    ricochetBarrageShotBonus: 0,
    ricochetPerfectBankBonus: 0,
    deathMarkDurationBonus: 0,
    soulReapDamagePerMarkMultiplier: 1,
    reaperExecuteThresholdBonus: 0,
    reaperFinalWhisper: false,
    reaperFinalWhisperUsed: false,
    crusherImpactBonusMultiplier: 1,
    crusherImpactThresholdReduction: 0,
    crusherForceDurationBonus: 0,
    spikeReflectBonus: 0,
    spikeArmorDurationBonus: 0,
    spikeWallChargeBonus: 0,
    spikeArmorDamageTakenMultiplier: 1,
    monkMaxComboBonus: 0,
    monkContactCooldownReduction: 0,
    monkPalmDamagePerComboMultiplier: 1,
    monkPalmRadiusBonus: 0,
    monkComboDecayDelayBonus: 0,
    berserkerMaxRageContactBonus: 0,
    berserkerRageBreakDurationBonus: 0,
    berserkerBloodRushMeterBonus: 0,
    berserkerRageAbilityChargeBonus: 0,
    berserkerLowHpContactMultiplier: 1,
    berserkerContactCooldownMultiplier: 1,
    drillArmorBreakEffectBonus: 0,
    drillArmorBreakStackCapBonus: 0,
    drillPiercingDurationBonus: 0,
    drillSpinUpDurationBonus: 0,
    drillDefensePierceBonus: 0,
    drillSpinUpDamageBonus: 0,
    ninjaDashDurationBonus: 0,
    ninjaDashCountBonus: 0,
    ninjaDashDamageMultiplier: 1,
    ninjaEvadeBonus: 0,
    ninjaWallShadowBonus: 0,
    glassMaxChargesBonus: 0,
    glassShiftDurationBonus: 0,
    glassWallBounceRequirementReduction: 0,
    statusDurationMultiplier: 1,
    abilityChargeMultiplier: 1,
    attackIntervalMultiplier: 1,
    damageTakenMultiplier: 1,
    finisherDamageMultiplier: 1,
    afterWallBounceSpeedMultiplier: 1,
    afterWallBounceSpeedDuration: 0,
    momentumBarrierReduction: 0,
    dashDurationBonus: 0,
    dashGrazeRadiusBonus: 0,
    dashGuardReductionBonus: 0,
    timeStopDurationBonus: 0,
    predictiveLeadBonus: 0,
    collisionDamageReductionBonus: 0,
    lightningDamageReductionBonus: 0,
    flameBurstRadiusBonus: 0,
    toxicCloudRadiusBonus: 0,
    gravityWellRadiusBonus: 0,
    gravityWellDurationBonus: 0,
    armorChargesBonus: 0,
    armorReductionBonus: 0,
    armorRegenIntervalMultiplier: 1,
    guardDurationBonus: 0,
    staticChargeMaxBonus: 0,
    staticChargeCooldownMultiplier: 1,
    lightningDamageMultiplier: 1,
    secondWind: false,
    secondWindUsed: false,
    cleansePulse: false,
    cleansePulseUsed: false,
    antiBurstCore: false,
    antiBurstCoreUsed: false,
    emergencyGuard: false,
    emergencyGuardUsed: false
  };
}

export function cloneRunModifiers(modifiers: RunModifiers): RunModifiers {
  return { ...modifiers };
}

export function createSelectedUpgradeRecord(upgrade: UpgradeDefinition, roundAcquired: number): SelectedUpgradeRecord {
  return {
    id: upgrade.id,
    name: upgrade.name,
    description: upgrade.description,
    rarity: upgrade.rarity,
    roundAcquired,
    effectSummary: upgrade.effectText
  };
}

export function getRunModifierSummary(modifiers: RunModifiers, maxLines = 8): string[] {
  const lines: string[] = [];
  addMultiplier(lines, "Move Speed", modifiers.moveSpeedMultiplier);
  addMultiplier(lines, "Ability Charge", modifiers.abilityChargeMultiplier);
  addMultiplier(lines, "Ability Damage", modifiers.abilityDamageMultiplier);
  addMultiplier(lines, "Ability Duration", modifiers.abilityDurationMultiplier);
  addMultiplier(lines, "Projectile Damage", modifiers.projectileDamageMultiplier);
  addMultiplier(lines, "Projectile Speed", modifiers.projectileSpeedMultiplier);
  addMultiplier(lines, "Contact Damage", modifiers.contactDamageMultiplier);
  addMultiplier(lines, "Dash Damage", modifiers.dashDamageMultiplier);
  addMultiplier(lines, "Counter Damage", modifiers.counterDamageMultiplier);
  addMultiplier(lines, "Projectile Taken", modifiers.projectileDamageTakenMultiplier, true);
  addMultiplier(lines, "Impact Taken", modifiers.contactDamageTakenMultiplier, true);
  addMultiplier(lines, "Dash Taken", modifiers.dashDamageTakenMultiplier, true);
  addMultiplier(lines, "Ability Taken", modifiers.abilityDamageTakenMultiplier, true);
  addMultiplier(lines, "Burn Taken", modifiers.burnDamageTakenMultiplier, true);
  addMultiplier(lines, "Poison Taken", modifiers.poisonDamageTakenMultiplier, true);
  addMultiplier(lines, "Status Taken", modifiers.statusTakenDurationMultiplier, true);
  addMultiplier(lines, "Burn Damage", modifiers.burnDamageMultiplier);
  addMultiplier(lines, "Burn Duration", modifiers.burnDurationMultiplier);
  addMultiplier(lines, "Poison Damage", modifiers.poisonDamageMultiplier);
  addMultiplier(lines, "Poison Duration", modifiers.poisonDurationMultiplier);
  addMultiplier(lines, "Status Duration", modifiers.statusDurationMultiplier);
  addMultiplier(lines, "Attack Interval", modifiers.attackIntervalMultiplier, true);
  addMultiplier(lines, "Damage Taken", modifiers.damageTakenMultiplier, true);
  addMultiplier(lines, "Finisher Damage", modifiers.finisherDamageMultiplier);
  addFlatPercent(lines, "Lifesteal", modifiers.vampireLifestealBonus);
  addFlatPercent(lines, "Gravity Suppression", modifiers.gravitySuppressionBonus);
  addFlatPercent(lines, "Armor Reduction", modifiers.armorReductionBonus);
  addFlatPercent(lines, "Mirror Evade", modifiers.mirrorEvadeBonus);
  addFlatPercent(lines, "Poison Charge Debuff", modifiers.poisonChargeDebuffBonus);
  addFlatNumber(lines, "Dash Duration", modifiers.dashDurationBonus, "s");
  addFlatNumber(lines, "Dash Graze Radius", modifiers.dashGrazeRadiusBonus);
  addFlatNumber(lines, "Time Stop Duration", modifiers.timeStopDurationBonus, "s");
  addFlatNumber(lines, "Predictive Lead", modifiers.predictiveLeadBonus, "s");
  addFlatNumber(lines, "Flame Burst Radius", modifiers.flameBurstRadiusBonus);
  addFlatNumber(lines, "Toxic Cloud Radius", modifiers.toxicCloudRadiusBonus);
  addFlatNumber(lines, "Gravity Well Radius", modifiers.gravityWellRadiusBonus);
  addFlatNumber(lines, "Gravity Well Duration", modifiers.gravityWellDurationBonus, "s");
  addFlatNumber(lines, "Blood Feast Duration", modifiers.bloodFeastDurationBonus, "s");
  addFlatNumber(lines, "Bomb Radius", modifiers.bombRadiusBonus);
  addFlatNumber(lines, "Chain Radius", modifiers.chainRadiusBonus);
  addFlatNumber(lines, "Mirror Decoys", modifiers.mirrorDecoyCountBonus);
  addFlatNumber(lines, "Magnet Shards", modifiers.magnetMaxShardsBonus);
  addFlatNumber(lines, "Static Charge Max", modifiers.staticChargeMaxBonus);
  addFlatNumber(lines, "Death Mark Duration", modifiers.deathMarkDurationBonus, "s");
  addFlatNumber(lines, "Execute Threshold", modifiers.reaperExecuteThresholdBonus, " HP");
  addMultiplier(lines, "Impact Bonus", modifiers.crusherImpactBonusMultiplier);
  addFlatNumber(lines, "Crushing Force Duration", modifiers.crusherForceDurationBonus, "s");
  addFlatNumber(lines, "Impact Threshold", -modifiers.crusherImpactThresholdReduction);
  addFlatPercent(lines, "Thorn Reflect", modifiers.spikeReflectBonus);
  addFlatNumber(lines, "Spike Armor Duration", modifiers.spikeArmorDurationBonus, "s");
  addFlatNumber(lines, "Wall Charge Damage", modifiers.spikeWallChargeBonus);
  addMultiplier(lines, "Spike Armor Taken", modifiers.spikeArmorDamageTakenMultiplier, true);
  addFlatNumber(lines, "Combo Max", modifiers.monkMaxComboBonus);
  addFlatNumber(lines, "Contact Cooldown", -modifiers.monkContactCooldownReduction, "s");
  addMultiplier(lines, "Palm Combo Damage", modifiers.monkPalmDamagePerComboMultiplier);
  addFlatNumber(lines, "Palm Radius", modifiers.monkPalmRadiusBonus);
  addFlatNumber(lines, "Combo Decay Delay", modifiers.monkComboDecayDelayBonus, "s");
  addFlatPercent(lines, "Max Rage Contact", modifiers.berserkerMaxRageContactBonus);
  addFlatNumber(lines, "Rage Break Duration", modifiers.berserkerRageBreakDurationBonus, "s");
  addFlatPercent(lines, "Rage Ability Charge", modifiers.berserkerRageAbilityChargeBonus);
  addMultiplier(lines, "Low HP Contact", modifiers.berserkerLowHpContactMultiplier);
  addMultiplier(lines, "Berserker Cooldown", modifiers.berserkerContactCooldownMultiplier, true);
  addFlatPercent(lines, "Armor Break", modifiers.drillArmorBreakEffectBonus);
  addFlatNumber(lines, "Armor Break Cap", modifiers.drillArmorBreakStackCapBonus);
  addFlatNumber(lines, "Piercing Drill Duration", modifiers.drillPiercingDurationBonus, "s");
  addFlatNumber(lines, "Spin-Up Duration", modifiers.drillSpinUpDurationBonus, "s");
  addFlatPercent(lines, "Defense Pierce", modifiers.drillDefensePierceBonus);
  addFlatNumber(lines, "Spin-Up Damage", modifiers.drillSpinUpDamageBonus);
  addFlatNumber(lines, "Shadow Step Duration", modifiers.ninjaDashDurationBonus, "s");
  addFlatNumber(lines, "Shadow Step Dashes", modifiers.ninjaDashCountBonus);
  addMultiplier(lines, "Shadow Strike Damage", modifiers.ninjaDashDamageMultiplier);
  addFlatPercent(lines, "Smoke Evade", modifiers.ninjaEvadeBonus);
  addFlatNumber(lines, "Wall Shadow Damage", modifiers.ninjaWallShadowBonus);
  addFlatNumber(lines, "Glass Charges", modifiers.glassMaxChargesBonus);
  addFlatNumber(lines, "Prism Shift Duration", modifiers.glassShiftDurationBonus, "s");
  addFlatNumber(lines, "Glass Bounce Requirement", -modifiers.glassWallBounceRequirementReduction);
  if (modifiers.secondWind) {
    lines.push("Second Wind active");
  }
  if (modifiers.cleansePulse) {
    lines.push("Cleanse Pulse active");
  }
  if (modifiers.antiBurstCore) {
    lines.push("Anti-Burst Core active");
  }
  if (modifiers.emergencyGuard) {
    lines.push("Emergency Guard active");
  }
  if (modifiers.momentumBarrierReduction > 0) {
    lines.push(`Momentum Barrier -${formatPercent(modifiers.momentumBarrierReduction)}`);
  }
  if (modifiers.reaperFinalWhisper) {
    lines.push("Final Whisper active");
  }
  return lines.slice(0, maxLines);
}

export function getBuildFocusTags(modifiers: RunModifiers): string[] {
  const tags: string[] = [];
  if (modifiers.dashDamageMultiplier > 1.01 || modifiers.dashDurationBonus > 0 || modifiers.dashGrazeRadiusBonus > 0) {
    tags.push("Dash Build");
  }
  if (modifiers.projectileDamageMultiplier > 1.01 || modifiers.projectileSpeedMultiplier > 1.01) {
    tags.push("Projectile Build");
  }
  if (modifiers.contactDamageMultiplier > 1.01) {
    tags.push("Impact Build");
  }
  if (
    modifiers.damageTakenMultiplier < 0.995 ||
    modifiers.projectileDamageTakenMultiplier < 0.995 ||
    modifiers.abilityDamageTakenMultiplier < 0.995 ||
    modifiers.contactDamageTakenMultiplier < 0.995 ||
    modifiers.secondWind ||
    modifiers.momentumBarrierReduction > 0 ||
    modifiers.armorReductionBonus > 0
  ) {
    tags.push("Defensive Build");
  }
  if (modifiers.abilityChargeMultiplier > 1.05 || modifiers.abilityDamageMultiplier > 1.05 || modifiers.abilityDurationMultiplier > 1.01) {
    tags.push("Skill Tempo Build");
  }
  if (
    modifiers.burnDamageMultiplier > 1.01 ||
    modifiers.poisonDamageMultiplier > 1.01 ||
    modifiers.statusDurationMultiplier > 1.01 ||
    modifiers.statusTakenDurationMultiplier < 0.995 ||
    modifiers.poisonChargeDebuffBonus > 0
  ) {
    tags.push("Status Build");
  }
  if (modifiers.vampireLifestealBonus > 0) {
    tags.push("Lifesteal Build");
  }
  if (modifiers.bombRadiusBonus > 0 || modifiers.chainDamageMultiplier > 1.01 || modifiers.chainRadiusBonus > 0) {
    tags.push("Explosion Build");
  }
  if (modifiers.gravitySuppressionBonus > 0 || modifiers.gravityWellRadiusBonus > 0) {
    tags.push("Control Build");
  }
  if (modifiers.crusherImpactBonusMultiplier > 1.01 || modifiers.crusherImpactThresholdReduction > 0 || modifiers.crusherForceDurationBonus > 0) {
    tags.push("Impact Build");
  }
  if (modifiers.spikeReflectBonus > 0 || modifiers.spikeArmorDurationBonus > 0 || modifiers.spikeWallChargeBonus > 0) {
    tags.push("Thorn Build");
  }
  if (
    modifiers.monkMaxComboBonus > 0 ||
    modifiers.monkContactCooldownReduction > 0 ||
    modifiers.monkPalmDamagePerComboMultiplier > 1.01 ||
    modifiers.monkComboDecayDelayBonus > 0
  ) {
    tags.push("Combo Build");
  }
  if (
    modifiers.berserkerMaxRageContactBonus > 0 ||
    modifiers.berserkerRageBreakDurationBonus > 0 ||
    modifiers.berserkerRageAbilityChargeBonus > 0 ||
    modifiers.berserkerLowHpContactMultiplier > 1.01
  ) {
    tags.push("Rage Build");
  }
  if (
    modifiers.drillArmorBreakEffectBonus > 0 ||
    modifiers.drillArmorBreakStackCapBonus > 0 ||
    modifiers.drillPiercingDurationBonus > 0 ||
    modifiers.drillDefensePierceBonus > 0 ||
    modifiers.drillSpinUpDamageBonus > 0
  ) {
    tags.push("Pierce Build");
  }
  if (
    modifiers.ninjaDashDurationBonus > 0 ||
    modifiers.ninjaDashCountBonus > 0 ||
    modifiers.ninjaDashDamageMultiplier > 1.01 ||
    modifiers.ninjaEvadeBonus > 0 ||
    modifiers.ninjaWallShadowBonus > 0
  ) {
    tags.push("Shadow Build");
  }
  if (
    modifiers.glassMaxChargesBonus > 0 ||
    modifiers.glassShiftDurationBonus > 0 ||
    modifiers.glassWallBounceRequirementReduction > 0
  ) {
    tags.push("Glass Build");
  }
  return tags.slice(0, 3);
}

export function getUpgradeSynergyLabel(upgrade: UpgradeDefinition, modifiers: RunModifiers): "Synergy" | "New Direction" | null {
  const before = getBuildFocusTags(modifiers);
  const preview = cloneRunModifiers(modifiers);
  upgrade.apply(preview);
  const after = getBuildFocusTags(preview);
  if (after.length === 0) {
    return null;
  }
  return after.some((tag) => before.includes(tag)) ? "Synergy" : "New Direction";
}

function addMultiplier(lines: string[], label: string, value: number, inverse = false): void {
  if (Math.abs(value - 1) < 0.005) {
    return;
  }
  const delta = inverse ? 1 - value : value - 1;
  lines.push(`${label} ${delta >= 0 ? "+" : "-"}${formatPercent(Math.abs(delta))}`);
}

function addFlatPercent(lines: string[], label: string, value: number): void {
  if (Math.abs(value) < 0.005) {
    return;
  }
  lines.push(`${label} ${value >= 0 ? "+" : "-"}${formatPercent(Math.abs(value))}`);
}

function addFlatNumber(lines: string[], label: string, value: number, suffix = ""): void {
  if (Math.abs(value) < 0.005) {
    return;
  }
  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  lines.push(`${label} ${value >= 0 ? "+" : ""}${rounded}${suffix}`);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
