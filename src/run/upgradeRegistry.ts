import type { UpgradeDefinition, UpgradeRarity } from "./Upgrade";

export const upgradeRegistry: UpgradeDefinition[] = [
  {
    id: "quick-core",
    name: "Quick Core",
    rarity: "common",
    description: "The ball keeps its line but travels faster.",
    effectText: "+6% movement speed",
    apply: (modifiers) => {
      modifiers.moveSpeedMultiplier *= 1.06;
    }
  },
  {
    id: "sharp-impact",
    name: "Sharp Hit",
    rarity: "common",
    description: "Physical hits bite a little harder.",
    effectText: "+8% contact and dash damage",
    apply: (modifiers) => {
      modifiers.contactDamageMultiplier *= 1.08;
      modifiers.dashDamageMultiplier *= 1.08;
    }
  },
  {
    id: "fast-charge",
    name: "Fast Charge",
    rarity: "common",
    description: "Abilities come online sooner.",
    effectText: "+8% ability meter gain",
    apply: (modifiers) => {
      modifiers.abilityChargeMultiplier *= 1.08;
    }
  },
  {
    id: "stable-aim",
    name: "Stable Shot",
    rarity: "common",
    description: "Projectiles cross the arena faster.",
    effectText: "+8% projectile speed",
    apply: (modifiers) => {
      modifiers.projectileSpeedMultiplier *= 1.08;
    }
  },
  {
    id: "reinforced-shell",
    name: "Reinforced Shell",
    rarity: "common",
    description: "A cleaner shell reduces incoming damage.",
    effectText: "-5% damage taken",
    apply: (modifiers) => {
      modifiers.damageTakenMultiplier *= 0.95;
    }
  },
  {
    id: "heat-guard",
    name: "Heat Guard",
    rarity: "common",
    description: "Insulation reduces burn pressure.",
    effectText: "Burn damage taken -10%",
    apply: (modifiers) => {
      modifiers.burnDamageTakenMultiplier *= 0.9;
    }
  },
  {
    id: "toxin-guard",
    name: "Toxin Guard",
    rarity: "common",
    description: "A cleaner shell resists poison ticks.",
    effectText: "Poison damage taken -10%",
    apply: (modifiers) => {
      modifiers.poisonDamageTakenMultiplier *= 0.9;
    }
  },
  {
    id: "steady-core",
    name: "Steady Core",
    rarity: "common",
    description: "Status effects shake loose sooner.",
    effectText: "Status duration taken -10%",
    apply: (modifiers) => {
      modifiers.statusTakenDurationMultiplier *= 0.9;
    }
  },
  {
    id: "impact-guard",
    name: "Impact Guard",
    rarity: "common",
    description: "Bracing reduces collision and dash damage.",
    effectText: "Contact/dash damage taken -8%",
    apply: (modifiers) => {
      modifiers.contactDamageTakenMultiplier *= 0.92;
      modifiers.dashDamageTakenMultiplier *= 0.92;
    }
  },
  {
    id: "afterimage-boost",
    name: "Afterimage Boost",
    rarity: "uncommon",
    description: "Wall bounces leave a faster afterimage line.",
    effectText: "+10% speed for 1.2s after wall bounce",
    apply: (modifiers) => {
      modifiers.afterWallBounceSpeedMultiplier = Math.max(modifiers.afterWallBounceSpeedMultiplier, 1.1);
      modifiers.afterWallBounceSpeedDuration = Math.max(modifiers.afterWallBounceSpeedDuration, 1.2);
    }
  },
  {
    id: "skill-tempo",
    name: "Skill Tempo",
    rarity: "uncommon",
    description: "The ability core spins faster.",
    effectText: "+14% ability charge rate",
    apply: (modifiers) => {
      modifiers.abilityChargeMultiplier *= 1.14;
    }
  },
  {
    id: "status-filter",
    name: "Status Filter",
    rarity: "uncommon",
    description: "Burn, poison, slow, and gravity effects fade sooner.",
    effectText: "Status duration taken -12%",
    apply: (modifiers) => {
      modifiers.statusTakenDurationMultiplier *= 0.88;
    }
  },
  {
    id: "projectile-plating",
    name: "Projectile Plating",
    rarity: "uncommon",
    description: "A layered shell softens direct projectile hits.",
    effectText: "Projectile damage taken -10%",
    apply: (modifiers) => {
      modifiers.projectileDamageTakenMultiplier *= 0.9;
    }
  },
  {
    id: "burst-guard",
    name: "Burst Guard",
    rarity: "uncommon",
    description: "Ability bursts lose some bite.",
    effectText: "Ability damage taken -10%",
    apply: (modifiers) => {
      modifiers.abilityDamageTakenMultiplier *= 0.9;
    }
  },
  {
    id: "critical-collision",
    name: "Impact Tuning",
    rarity: "uncommon",
    description: "Body impacts get more dangerous.",
    effectText: "+12% collision/contact damage",
    apply: (modifiers) => {
      modifiers.contactDamageMultiplier *= 1.12;
    }
  },
  {
    id: "time-shard-tuning",
    name: "Focused Projectiles",
    rarity: "uncommon",
    description: "Projectiles hit more cleanly.",
    effectText: "+10% projectile damage",
    apply: (modifiers) => {
      modifiers.projectileDamageMultiplier *= 1.1;
    }
  },
  {
    id: "burn-extension",
    name: "Status Extension",
    rarity: "uncommon",
    description: "Burns, poison, slows, and marks linger longer.",
    effectText: "+12% status duration",
    apply: (modifiers) => {
      modifiers.burnDurationMultiplier *= 1.12;
      modifiers.poisonDurationMultiplier *= 1.12;
      modifiers.statusDurationMultiplier *= 1.12;
    }
  },
  {
    id: "overclock",
    name: "Overclock",
    rarity: "rare",
    description: "The core charges harder, but exposes weak points.",
    effectText: "+25% charge, +8% damage taken",
    apply: (modifiers) => {
      modifiers.abilityChargeMultiplier *= 1.25;
      modifiers.damageTakenMultiplier *= 1.08;
    }
  },
  {
    id: "echo-skill",
    name: "Echo Skill",
    rarity: "rare",
    description: "Ability hits carry a weaker echo pulse.",
    effectText: "+12% ability damage",
    apply: (modifiers) => {
      modifiers.abilityDamageMultiplier *= 1.12;
    }
  },
  {
    id: "momentum-barrier",
    name: "Momentum Barrier",
    rarity: "rare",
    description: "A wall bounce primes a small defensive shell.",
    effectText: "After wall bounce, next direct hit -20%",
    apply: (modifiers) => {
      modifiers.momentumBarrierReduction = Math.max(modifiers.momentumBarrierReduction, 0.2);
    }
  },
  {
    id: "finisher-core",
    name: "Finisher Core",
    rarity: "rare",
    description: "Finish wounded opponents more reliably.",
    effectText: "+15% damage vs enemies below 30% HP",
    apply: (modifiers) => {
      modifiers.finisherDamageMultiplier *= 1.15;
    }
  },
  {
    id: "second-wind",
    name: "Second Wind",
    rarity: "rare",
    description: "Once per match, survive lethal damage at 1 HP.",
    effectText: "1 lethal save per match",
    apply: (modifiers) => {
      modifiers.secondWind = true;
    }
  },
  {
    id: "cleanse-pulse",
    name: "Cleanse Pulse",
    rarity: "rare",
    description: "Once per match, clear harmful status effects when HP drops below 40.",
    effectText: "Cleanse below 40 HP once",
    apply: (modifiers) => {
      modifiers.cleansePulse = true;
    }
  },
  {
    id: "anti-burst-core",
    name: "Anti-Burst Core",
    rarity: "rare",
    description: "The first ability hit each match is heavily reduced.",
    effectText: "First ability hit -35%",
    apply: (modifiers) => {
      modifiers.antiBurstCore = true;
    }
  },
  {
    id: "emergency-guard",
    name: "Emergency Guard",
    rarity: "rare",
    description: "Once per match, soften a huge incoming hit.",
    effectText: "First 15+ damage hit -30%",
    apply: (modifiers) => {
      modifiers.emergencyGuard = true;
    }
  },
  {
    id: "time-needle",
    name: "Time Needle",
    rarity: "common",
    allowedClassIds: ["chrono"],
    description: "Time shards cut a little cleaner.",
    effectText: "+10% projectile damage",
    apply: (modifiers) => {
      modifiers.projectileDamageMultiplier *= 1.1;
    }
  },
  {
    id: "extended-lock",
    name: "Longer Time Stop",
    rarity: "uncommon",
    allowedClassIds: ["chrono"],
    description: "Time Stop lingers for one extra beat.",
    effectText: "+0.15s Time Stop duration",
    apply: (modifiers) => {
      modifiers.timeStopDurationBonus += 0.15;
    }
  },
  {
    id: "clean-prediction",
    name: "Clean Prediction",
    rarity: "common",
    allowedClassIds: ["chrono"],
    description: "Shots lead targets more confidently.",
    effectText: "+0.03s predictive lead",
    apply: (modifiers) => {
      modifiers.predictiveLeadBonus += 0.03;
    }
  },
  {
    id: "rapid-moment",
    name: "Rapid Moment",
    rarity: "uncommon",
    allowedClassIds: ["chrono"],
    description: "Chrono fires faster during Time Stop windows.",
    effectText: "+8% Time Stop attack speed",
    apply: (modifiers) => {
      modifiers.attackIntervalMultiplier *= 0.92;
    }
  },
  {
    id: "temporal-guard-plus",
    name: "Temporal Guard+",
    rarity: "uncommon",
    allowedClassIds: ["chrono"],
    description: "Chrono shrugs off impacts and lightning better.",
    effectText: "+5% collision/lightning reduction",
    apply: (modifiers) => {
      modifiers.collisionDamageReductionBonus += 0.05;
      modifiers.lightningDamageReductionBonus += 0.05;
    }
  },
  {
    id: "longer-dash",
    name: "Longer Dash",
    rarity: "common",
    allowedClassIds: ["blade"],
    description: "Dash carries farther in a straight line.",
    effectText: "+0.04s dash duration",
    apply: (modifiers) => {
      modifiers.dashDurationBonus += 0.04;
    }
  },
  {
    id: "razor-impact",
    name: "Razor Impact",
    rarity: "common",
    allowedClassIds: ["blade"],
    description: "Dash hits land sharper.",
    effectText: "+8% dash damage",
    apply: (modifiers) => {
      modifiers.dashDamageMultiplier *= 1.08;
    }
  },
  {
    id: "graze-master",
    name: "Graze Master",
    rarity: "uncommon",
    allowedClassIds: ["blade"],
    description: "Near-miss dashes are easier to convert.",
    effectText: "+5 px dash graze radius",
    apply: (modifiers) => {
      modifiers.dashGrazeRadiusBonus += 5;
    }
  },
  {
    id: "momentum-guard-plus",
    name: "Momentum Guard+",
    rarity: "uncommon",
    allowedClassIds: ["blade"],
    description: "Dash windows resist ranged pressure better.",
    effectText: "+6% dash projectile/burn reduction",
    apply: (modifiers) => {
      modifiers.dashGuardReductionBonus += 0.06;
    }
  },
  {
    id: "armor-plating",
    name: "Armor Plating",
    rarity: "common",
    allowedClassIds: ["shield"],
    description: "Armor charges absorb more of each hit.",
    effectText: "+6% armor reduction",
    apply: (modifiers) => {
      modifiers.armorReductionBonus += 0.06;
    }
  },
  {
    id: "faster-refit",
    name: "Faster Refit",
    rarity: "common",
    allowedClassIds: ["shield"],
    description: "Broken plates come back sooner.",
    effectText: "-0.35s armor regen interval",
    apply: (modifiers) => {
      modifiers.armorRegenIntervalMultiplier *= 0.9;
    }
  },
  {
    id: "counter-core",
    name: "Counter Core",
    rarity: "uncommon",
    allowedClassIds: ["shield"],
    description: "Guard Counter returns more damage.",
    effectText: "+8% counter damage",
    apply: (modifiers) => {
      modifiers.counterDamageMultiplier *= 1.08;
    }
  },
  {
    id: "guard-window",
    name: "Guard Window",
    rarity: "uncommon",
    allowedClassIds: ["shield"],
    description: "Guard Counter stays active a little longer.",
    effectText: "+0.15s Guard Counter duration",
    apply: (modifiers) => {
      modifiers.guardDurationBonus += 0.15;
    }
  },
  {
    id: "hotter-burn",
    name: "Hotter Burn",
    rarity: "common",
    allowedClassIds: ["fire"],
    description: "Burn ticks hit harder.",
    effectText: "+8% burn DPS",
    apply: (modifiers) => {
      modifiers.burnDamageMultiplier *= 1.08;
    }
  },
  {
    id: "lingering-flame",
    name: "Lingering Flame",
    rarity: "common",
    allowedClassIds: ["fire"],
    description: "Burn stays active longer.",
    effectText: "+0.25s burn duration",
    apply: (modifiers) => {
      modifiers.burnDurationMultiplier *= 1.08;
    }
  },
  {
    id: "wider-flame-burst",
    name: "Wider Flame Burst",
    rarity: "uncommon",
    allowedClassIds: ["fire"],
    description: "Flame Burst covers more of the arena.",
    effectText: "+10 px Flame Burst radius",
    apply: (modifiers) => {
      modifiers.flameBurstRadiusBonus += 10;
    }
  },
  {
    id: "ember-rhythm",
    name: "Ember Rhythm",
    rarity: "common",
    allowedClassIds: ["fire"],
    description: "Ember Shots fire more often.",
    effectText: "-6% Ember Shot interval",
    apply: (modifiers) => {
      modifiers.attackIntervalMultiplier *= 0.94;
    }
  },
  {
    id: "static-battery",
    name: "Static Battery",
    rarity: "rare",
    allowedClassIds: ["thunder"],
    description: "Thunder can hold one more charge.",
    effectText: "+1 max Static Charge",
    apply: (modifiers) => {
      modifiers.staticChargeMaxBonus += 1;
    }
  },
  {
    id: "faster-spark",
    name: "Faster Spark",
    rarity: "common",
    allowedClassIds: ["thunder"],
    description: "Spark Bolts sting harder.",
    effectText: "+8% Spark Bolt damage",
    apply: (modifiers) => {
      modifiers.projectileDamageMultiplier *= 1.08;
    }
  },
  {
    id: "charge-conductor",
    name: "Charge Conductor",
    rarity: "common",
    allowedClassIds: ["thunder"],
    description: "Wall bounces grant charge more often.",
    effectText: "-0.06s Static Charge cooldown",
    apply: (modifiers) => {
      modifiers.staticChargeCooldownMultiplier *= 0.9;
    }
  },
  {
    id: "chain-surge",
    name: "Chain Surge",
    rarity: "uncommon",
    allowedClassIds: ["thunder"],
    description: "Lightning Chain pulses hit harder.",
    effectText: "+8% Lightning Chain damage",
    apply: (modifiers) => {
      modifiers.lightningDamageMultiplier *= 1.08;
    }
  },
  {
    id: "stronger-venom",
    name: "Stronger Venom",
    rarity: "common",
    allowedClassIds: ["poison"],
    description: "Poison ticks become more dangerous.",
    effectText: "+8% poison DPS",
    apply: (modifiers) => {
      modifiers.poisonDamageMultiplier *= 1.08;
    }
  },
  {
    id: "lingering-toxin",
    name: "Lingering Toxin",
    rarity: "common",
    allowedClassIds: ["poison"],
    description: "Poison stays active longer.",
    effectText: "+0.35s poison duration",
    apply: (modifiers) => {
      modifiers.poisonDurationMultiplier *= 1.07;
    }
  },
  {
    id: "wider-cloud",
    name: "Wider Cloud",
    rarity: "uncommon",
    allowedClassIds: ["poison"],
    description: "Toxic Cloud covers a larger area.",
    effectText: "+10 px Toxic Cloud radius",
    apply: (modifiers) => {
      modifiers.toxicCloudRadiusBonus += 10;
    }
  },
  {
    id: "toxic-pressure",
    name: "Toxic Pressure",
    rarity: "uncommon",
    allowedClassIds: ["poison"],
    description: "Poison suppresses enemy ability tempo more.",
    effectText: "Poison charge debuff stronger",
    apply: (modifiers) => {
      modifiers.poisonChargeDebuffBonus += 0.03;
    }
  },
  {
    id: "venom-rhythm",
    name: "Venom Rhythm",
    rarity: "common",
    allowedClassIds: ["poison"],
    description: "Venom Spit fires more often.",
    effectText: "-6% Venom Spit interval",
    apply: (modifiers) => {
      modifiers.attackIntervalMultiplier *= 0.94;
    }
  },
  {
    id: "dense-core",
    name: "Dense Core",
    rarity: "uncommon",
    allowedClassIds: ["gravity"],
    description: "Gravity effects suppress enemy momentum harder.",
    effectText: "+3% Gravity suppression",
    apply: (modifiers) => {
      modifiers.gravitySuppressionBonus += 0.03;
    }
  },
  {
    id: "wider-well",
    name: "Wider Well",
    rarity: "common",
    allowedClassIds: ["gravity"],
    description: "Gravity Well covers more of the arena.",
    effectText: "+10 px Gravity Well radius",
    apply: (modifiers) => {
      modifiers.gravityWellRadiusBonus += 10;
    }
  },
  {
    id: "longer-collapse",
    name: "Longer Collapse",
    rarity: "common",
    allowedClassIds: ["gravity"],
    description: "Gravity Well remains active longer.",
    effectText: "+0.25s Gravity Well duration",
    apply: (modifiers) => {
      modifiers.gravityWellDurationBonus += 0.25;
    }
  },
  {
    id: "heavy-mark",
    name: "Heavy Mark",
    rarity: "common",
    allowedClassIds: ["gravity"],
    description: "Gravity Pulse marks linger a little longer.",
    effectText: "+0.25s Gravity Mark duration",
    apply: (modifiers) => {
      modifiers.gravityMarkDurationBonus += 0.25;
    }
  },
  {
    id: "pulse-tuning",
    name: "Pulse Tuning",
    rarity: "common",
    allowedClassIds: ["gravity"],
    description: "Gravity Pulses fire more often.",
    effectText: "-6% Gravity Pulse interval",
    apply: (modifiers) => {
      modifiers.attackIntervalMultiplier *= 0.94;
    }
  },
  {
    id: "orbit-charge",
    name: "Orbit Charge",
    rarity: "uncommon",
    allowedClassIds: ["gravity"],
    description: "Orbiting mass charges Gravity Well faster.",
    effectText: "+8% ability charge rate",
    apply: (modifiers) => {
      modifiers.abilityChargeMultiplier *= 1.08;
    }
  },
  {
    id: "deeper-bite",
    name: "Deeper Bite",
    rarity: "common",
    allowedClassIds: ["vampire"],
    description: "Damage dealt returns more health.",
    effectText: "+5% lifesteal",
    apply: (modifiers) => {
      modifiers.vampireLifestealBonus += 0.05;
    }
  },
  {
    id: "crimson-shards",
    name: "Crimson Shards",
    rarity: "common",
    allowedClassIds: ["vampire"],
    description: "Blood Shards hit a little harder.",
    effectText: "+8% Blood Shard damage",
    apply: (modifiers) => {
      modifiers.projectileDamageMultiplier *= 1.08;
    }
  },
  {
    id: "longer-feast",
    name: "Longer Feast",
    rarity: "uncommon",
    allowedClassIds: ["vampire"],
    description: "Blood Feast stays active longer.",
    effectText: "+0.3s Blood Feast duration",
    apply: (modifiers) => {
      modifiers.bloodFeastDurationBonus += 0.3;
    }
  },
  {
    id: "blood-rush",
    name: "Blood Rush",
    rarity: "uncommon",
    allowedClassIds: ["vampire"],
    description: "Low HP charges Blood Feast faster.",
    effectText: "+8% charge below 50 HP",
    apply: (modifiers) => {
      modifiers.bloodRushChargeMultiplier *= 1.08;
    }
  },
  {
    id: "last-drop",
    name: "Last Drop",
    rarity: "rare",
    allowedClassIds: ["vampire"],
    description: "A near-death surge briefly boosts lifesteal.",
    effectText: "+20% lifesteal below 20 HP once",
    apply: (modifiers) => {
      modifiers.lastDrop = true;
    }
  },
  {
    id: "bigger-blast",
    name: "Bigger Blast",
    rarity: "common",
    allowedClassIds: ["bomb"],
    description: "Bomb explosions cover more space.",
    effectText: "+8 px explosion radius",
    apply: (modifiers) => {
      modifiers.bombRadiusBonus += 8;
    }
  },
  {
    id: "hot-fuse",
    name: "Hot Fuse",
    rarity: "common",
    allowedClassIds: ["bomb"],
    description: "Bombs detonate sooner after planting.",
    effectText: "-0.15s fuse time",
    apply: (modifiers) => {
      modifiers.bombFuseTimeBonus -= 0.15;
    }
  },
  {
    id: "chain-reaction",
    name: "Chain Reaction",
    rarity: "uncommon",
    allowedClassIds: ["bomb"],
    description: "Chain Detonation explosions hit harder.",
    effectText: "+8% chain damage",
    apply: (modifiers) => {
      modifiers.chainDamageMultiplier *= 1.08;
    }
  },
  {
    id: "shatter-counter",
    name: "Shatter Counter",
    rarity: "uncommon",
    allowedClassIds: ["mirror"],
    description: "Broken decoys return sharper glass shards.",
    effectText: "+8% shatter shot damage",
    apply: (modifiers) => {
      modifiers.mirrorShatterDamageMultiplier *= 1.08;
    }
  },
  {
    id: "extra-charge",
    name: "Extra Charge",
    rarity: "common",
    allowedClassIds: ["bomb"],
    description: "Wall bounces drop bombs more often.",
    effectText: "+10% wall bomb chance",
    apply: (modifiers) => {
      modifiers.bombWallChanceBonus += 0.1;
    }
  },
  {
    id: "volatile-core",
    name: "Volatile Core",
    rarity: "uncommon",
    allowedClassIds: ["bomb"],
    description: "The detonation core charges faster.",
    effectText: "+8% ability charge rate",
    apply: (modifiers) => {
      modifiers.abilityChargeMultiplier *= 1.08;
    }
  },
  {
    id: "wide-detonation",
    name: "Wide Detonation",
    rarity: "uncommon",
    allowedClassIds: ["bomb"],
    description: "Chain Detonation covers a wider path.",
    effectText: "+10 px chain radius",
    apply: (modifiers) => {
      modifiers.chainRadiusBonus += 10;
    }
  },
  {
    id: "extra-reflection",
    name: "Extra Reflection",
    rarity: "rare",
    allowedClassIds: ["mirror"],
    description: "Mirror Split creates one more decoy.",
    effectText: "+1 Mirror Split decoy",
    apply: (modifiers) => {
      modifiers.mirrorDecoyCountBonus += 1;
    }
  },
  {
    id: "longer-mirage",
    name: "Longer Mirage",
    rarity: "common",
    allowedClassIds: ["mirror"],
    description: "Decoys shimmer for longer before fading.",
    effectText: "+0.4s decoy duration",
    apply: (modifiers) => {
      modifiers.mirrorDecoyDurationBonus += 0.4;
    }
  },
  {
    id: "glass-core",
    name: "Glass Core",
    rarity: "uncommon",
    allowedClassIds: ["mirror"],
    description: "False Reflection avoids projectiles more often.",
    effectText: "+4% projectile evade",
    apply: (modifiers) => {
      modifiers.mirrorEvadeBonus += 0.04;
    }
  },
  {
    id: "sharp-refraction",
    name: "Sharp Refraction",
    rarity: "common",
    allowedClassIds: ["mirror"],
    description: "Refraction Shots cut cleaner.",
    effectText: "+8% Refraction Shot damage",
    apply: (modifiers) => {
      modifiers.projectileDamageMultiplier *= 1.08;
    }
  },
  {
    id: "fast-shimmer",
    name: "Fast Shimmer",
    rarity: "common",
    allowedClassIds: ["mirror"],
    description: "Mirror Split charges faster.",
    effectText: "+8% ability charge rate",
    apply: (modifiers) => {
      modifiers.abilityChargeMultiplier *= 1.08;
    }
  },
  {
    id: "mirror-drift",
    name: "Mirror Drift",
    rarity: "common",
    allowedClassIds: ["mirror"],
    description: "Decoys drift faster around the arena.",
    effectText: "+10% decoy speed",
    apply: (modifiers) => {
      modifiers.mirrorDecoySpeedMultiplier *= 1.1;
    }
  },
  {
    id: "extra-shard",
    name: "Extra Shard",
    rarity: "rare",
    allowedClassIds: ["magnet"],
    description: "Orbit Shield can hold one more shard.",
    effectText: "+1 max orbit shard",
    apply: (modifiers) => {
      modifiers.magnetMaxShardsBonus += 1;
    }
  },
  {
    id: "faster-regeneration",
    name: "Faster Regeneration",
    rarity: "common",
    allowedClassIds: ["magnet"],
    description: "Orbit shards rebuild sooner.",
    effectText: "-0.5s shard regen",
    apply: (modifiers) => {
      modifiers.magnetShardRegenIntervalBonus -= 0.5;
    }
  },
  {
    id: "sharper-metal",
    name: "Sharper Metal",
    rarity: "common",
    allowedClassIds: ["magnet"],
    description: "Metal Shards hit harder.",
    effectText: "+8% Metal Shard damage",
    apply: (modifiers) => {
      modifiers.projectileDamageMultiplier *= 1.08;
    }
  },
  {
    id: "longer-storm",
    name: "Longer Storm",
    rarity: "uncommon",
    allowedClassIds: ["magnet"],
    description: "Magnetic Storm spins longer.",
    effectText: "+0.3s Magnetic Storm duration",
    apply: (modifiers) => {
      modifiers.magnetStormDurationBonus += 0.3;
    }
  },
  {
    id: "storm-core",
    name: "Storm Core",
    rarity: "common",
    allowedClassIds: ["magnet"],
    description: "Magnetic Storm charges faster.",
    effectText: "+8% ability charge rate",
    apply: (modifiers) => {
      modifiers.abilityChargeMultiplier *= 1.08;
    }
  },
  {
    id: "reinforced-orbit",
    name: "Reinforced Orbit",
    rarity: "uncommon",
    allowedClassIds: ["magnet"],
    description: "The first blocked shot primes a small defensive shell.",
    effectText: "First block: next direct hit -10%",
    apply: (modifiers) => {
      modifiers.magnetFirstBlockBarrier = true;
    }
  },
  {
    id: "sharper-angle",
    name: "Sharper Angle",
    rarity: "common",
    allowedClassIds: ["ricochet"],
    description: "Bank Shots gain more damage after bouncing.",
    effectText: "+6% damage bonus per bounce",
    apply: (modifiers) => {
      modifiers.ricochetDamageBonusPerBounceBonus += 0.06;
    }
  },
  {
    id: "extra-bank",
    name: "Extra Bank",
    rarity: "rare",
    allowedClassIds: ["ricochet"],
    description: "Shots can ricochet one more time before fading.",
    effectText: "+1 max projectile bounce",
    apply: (modifiers) => {
      modifiers.ricochetMaxBouncesBonus += 1;
    }
  },
  {
    id: "faster-disc",
    name: "Faster Disc",
    rarity: "common",
    allowedClassIds: ["ricochet"],
    description: "Bank Shots cross the arena faster.",
    effectText: "+8% projectile speed",
    apply: (modifiers) => {
      modifiers.projectileSpeedMultiplier *= 1.08;
    }
  },
  {
    id: "trick-shot-tempo",
    name: "Trick Shot Tempo",
    rarity: "common",
    allowedClassIds: ["ricochet"],
    description: "Bank Shots fire more often.",
    effectText: "-6% Bank Shot interval",
    apply: (modifiers) => {
      modifiers.attackIntervalMultiplier *= 0.94;
    }
  },
  {
    id: "barrage-core",
    name: "Barrage Core",
    rarity: "uncommon",
    allowedClassIds: ["ricochet"],
    description: "Bank Shot Barrage adds one more angle.",
    effectText: "+1 barrage shot",
    apply: (modifiers) => {
      modifiers.ricochetBarrageShotBonus += 1;
    }
  },
  {
    id: "perfect-bank",
    name: "Perfect Bank",
    rarity: "uncommon",
    allowedClassIds: ["ricochet"],
    description: "Clean multi-bank hits feed the ability meter harder.",
    effectText: "+3% meter from bounced hits",
    apply: (modifiers) => {
      modifiers.ricochetPerfectBankBonus += 0.03;
    }
  },
  {
    id: "sharper-soul",
    name: "Sharper Soul",
    rarity: "common",
    allowedClassIds: ["reaper"],
    description: "Soul Blades cut harder.",
    effectText: "+8% Soul Blade damage",
    apply: (modifiers) => {
      modifiers.projectileDamageMultiplier *= 1.08;
    }
  },
  {
    id: "longer-mark",
    name: "Longer Mark",
    rarity: "common",
    allowedClassIds: ["reaper"],
    description: "Death Marks linger longer.",
    effectText: "+0.4s Death Mark duration",
    apply: (modifiers) => {
      modifiers.deathMarkDurationBonus += 0.4;
    }
  },
  {
    id: "deep-reap",
    name: "Deep Reap",
    rarity: "uncommon",
    allowedClassIds: ["reaper"],
    description: "Soul Reap gains more damage from each mark.",
    effectText: "+8% damage per Death Mark",
    apply: (modifiers) => {
      modifiers.soulReapDamagePerMarkMultiplier *= 1.08;
    }
  },
  {
    id: "early-execution",
    name: "Early Execution",
    rarity: "uncommon",
    allowedClassIds: ["reaper"],
    description: "Soul Reap starts executing at a higher HP threshold.",
    effectText: "+3 HP execute threshold",
    apply: (modifiers) => {
      modifiers.reaperExecuteThresholdBonus += 3;
    }
  },
  {
    id: "mark-hunter",
    name: "Mark Hunter",
    rarity: "common",
    allowedClassIds: ["reaper"],
    description: "Soul Blades fire more often.",
    effectText: "-6% Soul Blade interval",
    apply: (modifiers) => {
      modifiers.attackIntervalMultiplier *= 0.94;
    }
  },
  {
    id: "final-whisper",
    name: "Final Whisper",
    rarity: "rare",
    allowedClassIds: ["reaper"],
    description: "The first Soul Reap against a very wounded enemy cuts deeper.",
    effectText: "+3 first Reap damage below 25 HP",
    apply: (modifiers) => {
      modifiers.reaperFinalWhisper = true;
    }
  },
  {
    id: "heavier-core",
    name: "Heavier Core",
    rarity: "uncommon",
    allowedClassIds: ["crusher"],
    description: "High-speed collisions hit harder.",
    effectText: "+8% impact bonus damage",
    apply: (modifiers) => {
      modifiers.crusherImpactBonusMultiplier *= 1.08;
    }
  },
  {
    id: "crushing-tempo",
    name: "Crushing Tempo",
    rarity: "common",
    allowedClassIds: ["crusher"],
    description: "Crushing Force charges faster.",
    effectText: "+8% ability charge",
    apply: (modifiers) => {
      modifiers.abilityChargeMultiplier *= 1.08;
    }
  },
  {
    id: "longer-force",
    name: "Longer Force",
    rarity: "uncommon",
    allowedClassIds: ["crusher"],
    description: "Crushing Force stays active longer.",
    effectText: "+0.3s Crushing Force duration",
    apply: (modifiers) => {
      modifiers.crusherForceDurationBonus += 0.3;
    }
  },
  {
    id: "stone-shell",
    name: "Stone Shell",
    rarity: "common",
    allowedClassIds: ["crusher"],
    description: "Physical hits glance off Crusher's heavy core.",
    effectText: "-5% contact/dash damage taken",
    apply: (modifiers) => {
      modifiers.contactDamageTakenMultiplier *= 0.95;
      modifiers.dashDamageTakenMultiplier *= 0.95;
    }
  },
  {
    id: "momentum-crush",
    name: "Momentum Crush",
    rarity: "uncommon",
    allowedClassIds: ["crusher"],
    description: "Impact bonus starts at a slightly lower collision speed.",
    effectText: "-20 impact threshold",
    apply: (modifiers) => {
      modifiers.crusherImpactThresholdReduction += 20;
    }
  },
  {
    id: "cracked-core",
    name: "Cracked Core",
    rarity: "common",
    allowedClassIds: ["crusher"],
    description: "Crusher's base contact hits land harder.",
    effectText: "+8% contact damage",
    apply: (modifiers) => {
      modifiers.contactDamageMultiplier *= 1.08;
    }
  },
  {
    id: "sharper-spikes",
    name: "Sharper Spikes",
    rarity: "common",
    allowedClassIds: ["spike"],
    description: "Spike Ball's contact hits cut deeper.",
    effectText: "+8% contact damage",
    apply: (modifiers) => {
      modifiers.contactDamageMultiplier *= 1.08;
    }
  },
  {
    id: "longer-armor",
    name: "Longer Armor",
    rarity: "uncommon",
    allowedClassIds: ["spike"],
    description: "Spike Armor stays extended longer.",
    effectText: "+0.3s Spike Armor duration",
    apply: (modifiers) => {
      modifiers.spikeArmorDurationBonus += 0.3;
    }
  },
  {
    id: "hard-thorns",
    name: "Hard Thorns",
    rarity: "uncommon",
    allowedClassIds: ["spike"],
    description: "Thorn Skin reflects more contact damage.",
    effectText: "+5% reflected contact damage",
    apply: (modifiers) => {
      modifiers.spikeReflectBonus += 0.05;
    }
  },
  {
    id: "wall-charge",
    name: "Wall Charge",
    rarity: "common",
    allowedClassIds: ["spike"],
    description: "Wall-bounce spike charges add more damage.",
    effectText: "+1 wall charge damage",
    apply: (modifiers) => {
      modifiers.spikeWallChargeBonus += 1;
    }
  },
  {
    id: "iron-hide",
    name: "Iron Hide",
    rarity: "common",
    allowedClassIds: ["spike"],
    description: "Spike Armor blunts incoming damage slightly.",
    effectText: "-5% damage taken during Spike Armor",
    apply: (modifiers) => {
      modifiers.spikeArmorDamageTakenMultiplier *= 0.95;
    }
  },
  {
    id: "faster-armor",
    name: "Faster Armor",
    rarity: "common",
    allowedClassIds: ["spike"],
    description: "Spike Armor charges more quickly.",
    effectText: "+8% ability charge",
    apply: (modifiers) => {
      modifiers.abilityChargeMultiplier *= 1.08;
    }
  },
  {
    id: "deeper-flow",
    name: "Deeper Flow",
    rarity: "rare",
    allowedClassIds: ["monk"],
    description: "Monk can hold one more combo stack.",
    effectText: "+1 max combo stack",
    apply: (modifiers) => {
      modifiers.monkMaxComboBonus += 1;
    }
  },
  {
    id: "faster-hands",
    name: "Faster Hands",
    rarity: "uncommon",
    allowedClassIds: ["monk"],
    description: "Contact hits can trigger more often.",
    effectText: "-0.04s contact cooldown",
    apply: (modifiers) => {
      modifiers.monkContactCooldownReduction += 0.04;
    }
  },
  {
    id: "strong-palm",
    name: "Strong Palm",
    rarity: "uncommon",
    allowedClassIds: ["monk"],
    description: "Palm Burst scales harder from combo.",
    effectText: "+8% Palm Burst combo damage",
    apply: (modifiers) => {
      modifiers.monkPalmDamagePerComboMultiplier *= 1.08;
    }
  },
  {
    id: "wider-palm",
    name: "Wider Palm",
    rarity: "common",
    allowedClassIds: ["monk"],
    description: "Palm Burst reaches farther.",
    effectText: "+8 Palm Burst radius",
    apply: (modifiers) => {
      modifiers.monkPalmRadiusBonus += 8;
    }
  },
  {
    id: "steady-rhythm",
    name: "Steady Rhythm",
    rarity: "common",
    allowedClassIds: ["monk"],
    description: "Combo stacks wait longer before decaying.",
    effectText: "+0.5s combo decay delay",
    apply: (modifiers) => {
      modifiers.monkComboDecayDelayBonus += 0.5;
    }
  },
  {
    id: "chi-focus",
    name: "Chi Focus",
    rarity: "common",
    allowedClassIds: ["monk"],
    description: "Palm Burst charges faster.",
    effectText: "+8% ability charge",
    apply: (modifiers) => {
      modifiers.abilityChargeMultiplier *= 1.08;
    }
  },
  {
    id: "deeper-rage",
    name: "Deeper Rage",
    rarity: "uncommon",
    allowedClassIds: ["berserker"],
    description: "Rage Core can push contact damage higher at low HP.",
    effectText: "+6% max rage contact bonus",
    apply: (modifiers) => {
      modifiers.berserkerMaxRageContactBonus += 0.06;
    }
  },
  {
    id: "longer-rage-break",
    name: "Longer Rage Break",
    rarity: "common",
    allowedClassIds: ["berserker"],
    description: "Rage Break stays active longer.",
    effectText: "+0.3s Rage Break duration",
    apply: (modifiers) => {
      modifiers.berserkerRageBreakDurationBonus += 0.3;
    }
  },
  {
    id: "blood-rush-plus",
    name: "Blood Rush+",
    rarity: "uncommon",
    allowedClassIds: ["berserker"],
    description: "Blood Rush grants more ability meter when Berserker is wounded.",
    effectText: "+10% Blood Rush meter",
    apply: (modifiers) => {
      modifiers.berserkerBloodRushMeterBonus += 0.1;
    }
  },
  {
    id: "pain-engine",
    name: "Pain Engine",
    rarity: "common",
    allowedClassIds: ["berserker"],
    description: "Missing HP feeds Rage Break faster.",
    effectText: "+8% missing-HP ability charge",
    apply: (modifiers) => {
      modifiers.berserkerRageAbilityChargeBonus += 0.08;
    }
  },
  {
    id: "furious-impact",
    name: "Furious Impact",
    rarity: "common",
    allowedClassIds: ["berserker"],
    description: "Contact hits land harder while Berserker is below half HP.",
    effectText: "+8% contact damage below 50 HP",
    apply: (modifiers) => {
      modifiers.berserkerLowHpContactMultiplier *= 1.08;
    }
  },
  {
    id: "reckless-core",
    name: "Reckless Core",
    rarity: "rare",
    allowedClassIds: ["berserker"],
    description: "Berserker hits harder, but all incoming damage hurts more.",
    effectText: "+12% contact damage, +5% damage taken",
    apply: (modifiers) => {
      modifiers.contactDamageMultiplier *= 1.12;
      modifiers.damageTakenMultiplier *= 1.05;
    }
  },
  {
    id: "sharper-drill",
    name: "Sharper Drill",
    rarity: "common",
    allowedClassIds: ["drill"],
    description: "Drill Ball's contact hits bite harder.",
    effectText: "+8% contact damage",
    apply: (modifiers) => {
      modifiers.contactDamageMultiplier *= 1.08;
    }
  },
  {
    id: "deeper-break",
    name: "Deeper Break",
    rarity: "rare",
    allowedClassIds: ["drill"],
    description: "Armor Break can stack one level higher.",
    effectText: "+1 Armor Break stack cap",
    apply: (modifiers) => {
      modifiers.drillArmorBreakStackCapBonus += 1;
    }
  },
  {
    id: "longer-pierce",
    name: "Longer Pierce",
    rarity: "common",
    allowedClassIds: ["drill"],
    description: "Piercing Drill stays active longer.",
    effectText: "+0.3s Piercing Drill duration",
    apply: (modifiers) => {
      modifiers.drillPiercingDurationBonus += 0.3;
    }
  },
  {
    id: "fast-spin-up",
    name: "Fast Spin-Up",
    rarity: "common",
    allowedClassIds: ["drill"],
    description: "Wall bounce Spin-Up lasts longer.",
    effectText: "+0.5s Spin-Up duration",
    apply: (modifiers) => {
      modifiers.drillSpinUpDurationBonus += 0.5;
    }
  },
  {
    id: "hard-tip",
    name: "Hard Tip",
    rarity: "uncommon",
    allowedClassIds: ["drill"],
    description: "Piercing Drill pushes more damage through defenses.",
    effectText: "+8% defense pierce",
    apply: (modifiers) => {
      modifiers.drillDefensePierceBonus += 0.08;
    }
  },
  {
    id: "drill-tempo",
    name: "Drill Tempo",
    rarity: "common",
    allowedClassIds: ["drill"],
    description: "Piercing Drill charges faster.",
    effectText: "+8% ability charge",
    apply: (modifiers) => {
      modifiers.abilityChargeMultiplier *= 1.08;
    }
  },
  {
    id: "longer-step",
    name: "Longer Step",
    rarity: "common",
    allowedClassIds: ["ninja"],
    description: "Shadow Step dashes hold their line a little longer.",
    effectText: "+0.03s Shadow Step dash duration",
    apply: (modifiers) => {
      modifiers.ninjaDashDurationBonus += 0.03;
    }
  },
  {
    id: "extra-shadow",
    name: "Extra Shadow",
    rarity: "rare",
    allowedClassIds: ["ninja"],
    description: "Shadow Step chains one additional dash.",
    effectText: "+1 Shadow Step dash",
    apply: (modifiers) => {
      modifiers.ninjaDashCountBonus += 1;
    }
  },
  {
    id: "sharp-strike",
    name: "Sharp Strike",
    rarity: "common",
    allowedClassIds: ["ninja"],
    description: "Shadow Step strikes cut harder when they connect.",
    effectText: "+8% Shadow Step damage",
    apply: (modifiers) => {
      modifiers.ninjaDashDamageMultiplier *= 1.08;
    }
  },
  {
    id: "smoke-master",
    name: "Smoke Master",
    rarity: "uncommon",
    allowedClassIds: ["ninja"],
    description: "Smoke Reflex avoids direct projectiles more often.",
    effectText: "+4% projectile evade",
    apply: (modifiers) => {
      modifiers.ninjaEvadeBonus += 0.04;
    }
  },
  {
    id: "faster-step",
    name: "Faster Step",
    rarity: "common",
    allowedClassIds: ["ninja"],
    description: "Shadow Step charges faster.",
    effectText: "+8% ability charge",
    apply: (modifiers) => {
      modifiers.abilityChargeMultiplier *= 1.08;
    }
  },
  {
    id: "wall-assassin",
    name: "Wall Assassin",
    rarity: "common",
    allowedClassIds: ["ninja"],
    description: "Wall Shadow contacts hit with a sharper opening strike.",
    effectText: "+1 Wall Shadow damage",
    apply: (modifiers) => {
      modifiers.ninjaWallShadowBonus += 1;
    }
  },
  {
    id: "sharper-fangs",
    name: "Sharper Fangs",
    rarity: "common",
    allowedClassIds: ["fang"],
    description: "Fang contact hits bite harder.",
    effectText: "+8% contact damage",
    apply: (modifiers) => {
      modifiers.contactDamageMultiplier *= 1.08;
    }
  },
  {
    id: "deep-wound",
    name: "Deep Wound",
    rarity: "common",
    allowedClassIds: ["fang"],
    description: "Bleed lasts longer after Fang contacts.",
    effectText: "+0.35s Bleed duration",
    apply: (modifiers) => {
      modifiers.bleedDurationBonus += 0.35;
    }
  },
  {
    id: "blood-trail",
    name: "Blood Trail",
    rarity: "common",
    allowedClassIds: ["fang"],
    description: "Bleed ticks cut a little deeper.",
    effectText: "+8% Bleed damage",
    apply: (modifiers) => {
      modifiers.bleedDamageMultiplier *= 1.08;
    }
  },
  {
    id: "longer-hunt",
    name: "Longer Hunt",
    rarity: "common",
    allowedClassIds: ["fang"],
    description: "Rending Hunt stays active longer.",
    effectText: "+0.3s Rending Hunt",
    apply: (modifiers) => {
      modifiers.fangRendingHuntDurationBonus += 0.3;
    }
  },
  {
    id: "savage-bite",
    name: "Savage Bite",
    rarity: "uncommon",
    allowedClassIds: ["fang"],
    description: "Bleeding targets take more Fang contact damage.",
    effectText: "+5% damage vs bleeding",
    apply: (modifiers) => {
      modifiers.fangBleedBonusDamage += 0.05;
    }
  },
  {
    id: "scent-hunter",
    name: "Scent Hunter",
    rarity: "uncommon",
    allowedClassIds: ["fang"],
    description: "Blood Scent feeds more ability meter.",
    effectText: "+5% Blood Scent charge",
    apply: (modifiers) => {
      modifiers.fangBloodScentChargeBonus += 0.05;
    }
  },
  {
    id: "longer-reach",
    name: "Longer Reach",
    rarity: "common",
    allowedClassIds: ["spear"],
    description: "Spear Thrust reaches farther into the mid-range lane.",
    effectText: "+10 Spear Thrust range",
    apply: (modifiers) => {
      modifiers.spearThrustRangeBonus += 10;
    }
  },
  {
    id: "sharper-tip",
    name: "Sharper Tip",
    rarity: "common",
    allowedClassIds: ["spear"],
    description: "Spear Thrust hits harder when the line connects.",
    effectText: "+8% Spear Thrust damage",
    apply: (modifiers) => {
      modifiers.spearThrustDamageMultiplier *= 1.08;
    }
  },
  {
    id: "faster-thrust",
    name: "Faster Thrust",
    rarity: "common",
    allowedClassIds: ["spear"],
    description: "Spear Ball recovers from each thrust a little faster.",
    effectText: "-0.06s Spear Thrust cooldown",
    apply: (modifiers) => {
      modifiers.spearThrustCooldownReduction += 0.06;
    }
  },
  {
    id: "longer-rush",
    name: "Longer Rush",
    rarity: "common",
    allowedClassIds: ["spear"],
    description: "Spear Rush keeps the extended lance active longer.",
    effectText: "+0.3s Spear Rush",
    apply: (modifiers) => {
      modifiers.spearRushDurationBonus += 0.3;
    }
  },
  {
    id: "piercing-focus",
    name: "Piercing Focus",
    rarity: "uncommon",
    allowedClassIds: ["spear"],
    description: "Ideal-range thrusts gain a cleaner damage payoff.",
    effectText: "+5% ideal range damage",
    apply: (modifiers) => {
      modifiers.spearIdealRangeBonus += 0.05;
    }
  },
  {
    id: "wall-lance",
    name: "Wall Lance",
    rarity: "common",
    allowedClassIds: ["spear"],
    description: "Lance Ready reaches farther after a wall bounce.",
    effectText: "+10 Lance Ready range",
    apply: (modifiers) => {
      modifiers.spearLanceReadyRangeBonus += 10;
    }
  },
  {
    id: "sharper-shot",
    name: "Sharper Shot",
    rarity: "common",
    allowedClassIds: ["sniper"],
    description: "Charged Shots punch harder when they connect.",
    effectText: "+8% Charged Shot damage",
    apply: (modifiers) => {
      modifiers.sniperShotDamageMultiplier *= 1.08;
    }
  },
  {
    id: "faster-lock",
    name: "Faster Lock",
    rarity: "common",
    allowedClassIds: ["sniper"],
    description: "Charged Shot aim locks faster before firing.",
    effectText: "-0.1s Charged Shot lock",
    apply: (modifiers) => {
      modifiers.sniperChargeTimeReduction += 0.1;
    }
  },
  {
    id: "deadeye-focus",
    name: "Deadeye Focus",
    rarity: "common",
    allowedClassIds: ["sniper"],
    description: "Deadeye Beam hits with more precision force.",
    effectText: "+8% Deadeye Beam damage",
    apply: (modifiers) => {
      modifiers.sniperBeamDamageMultiplier *= 1.08;
    }
  },
  {
    id: "wider-beam",
    name: "Wider Beam",
    rarity: "uncommon",
    allowedClassIds: ["sniper"],
    description: "Deadeye Beam cuts a wider line through the arena.",
    effectText: "+4 Deadeye Beam width",
    apply: (modifiers) => {
      modifiers.sniperBeamWidthBonus += 4;
    }
  },
  {
    id: "scope-discipline",
    name: "Scope Discipline",
    rarity: "uncommon",
    allowedClassIds: ["sniper"],
    description: "Weakpoint Aim deals more damage to vulnerable targets.",
    effectText: "+5% Weakpoint damage",
    apply: (modifiers) => {
      modifiers.sniperWeakpointBonus += 0.05;
    }
  },
  {
    id: "quick-scope",
    name: "Quick Scope",
    rarity: "common",
    allowedClassIds: ["sniper"],
    description: "Deadeye Beam charges more often.",
    effectText: "+8% ability charge",
    apply: (modifiers) => {
      modifiers.abilityChargeMultiplier *= 1.08;
    }
  },
  {
    id: "longer-link",
    name: "Longer Link",
    rarity: "common",
    allowedClassIds: ["vector"],
    description: "Vector Lines stay armed a little longer.",
    effectText: "+0.4s Vector Line duration",
    apply: (modifiers) => {
      modifiers.vectorLineDurationBonus += 0.4;
    }
  },
  {
    id: "sharper-line",
    name: "Sharper Line",
    rarity: "common",
    allowedClassIds: ["vector"],
    description: "Linked energy lines cut harder when crossed.",
    effectText: "+8% Vector Line damage",
    apply: (modifiers) => {
      modifiers.vectorLineDamageMultiplier *= 1.08;
    }
  },
  {
    id: "wider-vector-beam",
    name: "Wider Beam",
    rarity: "common",
    allowedClassIds: ["vector"],
    description: "Vector Lines become easier to clip while crossing.",
    effectText: "+2 Vector Line width",
    apply: (modifiers) => {
      modifiers.vectorLineWidthBonus += 2;
    }
  },
  {
    id: "web-architect",
    name: "Web Architect",
    rarity: "uncommon",
    allowedClassIds: ["vector"],
    description: "Vector Web stays active longer.",
    effectText: "+0.5s Vector Web duration",
    apply: (modifiers) => {
      modifiers.vectorWebDurationBonus += 0.5;
    }
  },
  {
    id: "extra-segment",
    name: "Extra Segment",
    rarity: "rare",
    allowedClassIds: ["vector"],
    description: "Vector Ball keeps linked segments armed a little longer without increasing screen clutter.",
    effectText: "+0.25s Vector Line duration",
    apply: (modifiers) => {
      modifiers.vectorLineDurationBonus += 0.25;
    }
  },
  {
    id: "long-geometry",
    name: "Long Geometry",
    rarity: "uncommon",
    allowedClassIds: ["vector"],
    description: "Long-line damage bonuses start from shorter links.",
    effectText: "-50 long line bonus threshold",
    apply: (modifiers) => {
      modifiers.vectorLongLineThresholdReduction += 50;
    }
  },
  {
    id: "longer-gate",
    name: "Longer Gate",
    rarity: "common",
    allowedClassIds: ["portal"],
    description: "Wall portals stay open longer.",
    effectText: "+0.8s portal duration",
    apply: (modifiers) => {
      modifiers.portalDurationBonus += 0.8;
    }
  },
  {
    id: "quick-rift",
    name: "Quick Rift",
    rarity: "common",
    allowedClassIds: ["portal"],
    description: "Portal Ball can use linked gates more often.",
    effectText: "-0.15s teleport cooldown",
    apply: (modifiers) => {
      modifiers.portalTeleportCooldownReduction += 0.15;
    }
  },
  {
    id: "sharp-exit",
    name: "Sharp Exit",
    rarity: "common",
    allowedClassIds: ["portal"],
    description: "Rift Strike hits harder after teleporting.",
    effectText: "+1 Rift Strike damage",
    apply: (modifiers) => {
      modifiers.portalRiftStrikeBonusDamage += 1;
    }
  },
  {
    id: "stable-gate",
    name: "Stable Gate",
    rarity: "uncommon",
    allowedClassIds: ["portal"],
    description: "Portal Ball is briefly safer after warping.",
    effectText: "+5% post-teleport guard",
    apply: (modifiers) => {
      modifiers.portalPostTeleportReductionBonus += 0.05;
    }
  },
  {
    id: "rift-tempo",
    name: "Rift Tempo",
    rarity: "common",
    allowedClassIds: ["portal"],
    description: "Rift Gate charges more often.",
    effectText: "+8% ability charge",
    apply: (modifiers) => {
      modifiers.abilityChargeMultiplier *= 1.08;
    }
  },
  {
    id: "wide-portal",
    name: "Wide Portal",
    rarity: "uncommon",
    allowedClassIds: ["portal"],
    description: "Linked portals are easier for Portal Ball to enter.",
    effectText: "+4 portal radius",
    apply: (modifiers) => {
      modifiers.portalRadiusBonus += 4;
    }
  },
  {
    id: "stronger-prism",
    name: "Stronger Prism",
    rarity: "common",
    allowedClassIds: ["glass"],
    description: "Prism Shots cut with brighter edges.",
    effectText: "+8% Prism Shot damage",
    apply: (modifiers) => {
      modifiers.projectileDamageMultiplier *= 1.08;
    }
  },
  {
    id: "longer-shift",
    name: "Longer Shift",
    rarity: "common",
    allowedClassIds: ["glass"],
    description: "Prism Shift phases a little longer.",
    effectText: "+0.25s Prism Shift duration",
    apply: (modifiers) => {
      modifiers.glassShiftDurationBonus += 0.25;
    }
  },
  {
    id: "quick-refract",
    name: "Quick Refract",
    rarity: "common",
    allowedClassIds: ["glass"],
    description: "Prism Shift charges faster.",
    effectText: "+8% ability charge",
    apply: (modifiers) => {
      modifiers.abilityChargeMultiplier *= 1.08;
    }
  },
  {
    id: "extra-glass-charge",
    name: "Extra Charge",
    rarity: "rare",
    allowedClassIds: ["glass"],
    description: "Glass Ball can hold one additional Glass Charge.",
    effectText: "+1 max Glass Charge",
    apply: (modifiers) => {
      modifiers.glassMaxChargesBonus += 1;
    }
  },
  {
    id: "wall-refocus",
    name: "Wall Refocus",
    rarity: "rare",
    allowedClassIds: ["glass"],
    description: "Glass Charges restore after fewer wall bounces.",
    effectText: "-1 wall bounce per Glass Charge",
    apply: (modifiers) => {
      modifiers.glassWallBounceRequirementReduction += 1;
    }
  },
  {
    id: "clear-edge",
    name: "Clear Edge",
    rarity: "common",
    allowedClassIds: ["glass"],
    description: "Prism Shots travel faster.",
    effectText: "+10% Prism Shot speed",
    apply: (modifiers) => {
      modifiers.projectileSpeedMultiplier *= 1.1;
    }
  }
];

export function applyUpgradeById(upgradeId: string, modifiers: import("./Upgrade").RunModifiers): void {
  const upgrade = upgradeRegistry.find((item) => item.id === upgradeId);
  if (upgrade) {
    upgrade.apply(modifiers);
  }
}

export function rollUpgradeChoices(classId: string, ownedIds: string[], count = 3): UpgradeDefinition[] {
  const owned = new Set(ownedIds);
  const pool = upgradeRegistry.filter((upgrade) => {
    if (owned.has(upgrade.id) && upgrade.rarity === "rare") {
      return false;
    }
    return !upgrade.allowedClassIds || upgrade.allowedClassIds.includes(classId);
  });

  const choices: UpgradeDefinition[] = [];
  const bag = [...pool];
  while (choices.length < count && bag.length > 0) {
    const rarity = rollRarity();
    const matching = bag.filter((upgrade) => upgrade.rarity === rarity);
    const source = matching.length > 0 ? matching : bag;
    const selected = source[Math.floor(Math.random() * source.length)];
    choices.push(selected);
    bag.splice(bag.indexOf(selected), 1);
  }

  return choices;
}

export function rarityColor(rarity: UpgradeRarity): string {
  if (rarity === "rare") {
    return "#d9b8ff";
  }
  if (rarity === "uncommon") {
    return "#b8f2cf";
  }
  return "#dff6ff";
}

function rollRarity(): UpgradeRarity {
  const roll = Math.random();
  if (roll > 0.86) {
    return "rare";
  }
  if (roll > 0.54) {
    return "uncommon";
  }
  return "common";
}
