import type { FighterClass, FighterClassMeta } from "./FighterClass";
import { BerserkerClass } from "./BerserkerClass";
import { BombClass } from "./BombClass";
import { BladeClass } from "./BladeClass";
import { ChronoClass } from "./ChronoClass";
import { CrusherClass } from "./CrusherClass";
import { DrillClass } from "./DrillClass";
import { FangClass } from "./FangClass";
import { FireClass } from "./FireClass";
import { GlassClass } from "./GlassClass";
import { GravityClass } from "./GravityClass";
import { MagnetClass } from "./MagnetClass";
import { MirrorClass } from "./MirrorClass";
import { MonkClass } from "./MonkClass";
import { NinjaClass } from "./NinjaClass";
import { PoisonClass } from "./PoisonClass";
import { PortalClass } from "./PortalClass";
import { RicochetClass } from "./RicochetClass";
import { ReaperClass } from "./ReaperClass";
import { ShieldClass } from "./ShieldClass";
import { SpikeClass } from "./SpikeClass";
import { SpearClass } from "./SpearClass";
import { SniperClass } from "./SniperClass";
import { ThunderClass } from "./ThunderClass";
import { VampireClass } from "./VampireClass";
import { VectorClass } from "./VectorClass";

export type ComingSoonClassPreview = {
  id: string;
  displayName: string;
  roleLabel: string;
  abilityName: string;
  primaryColor: string;
  secondaryColor: string;
};

export const playableClasses: FighterClass[] = [
  ChronoClass,
  BladeClass,
  ShieldClass,
  FireClass,
  ThunderClass,
  PoisonClass,
  GravityClass,
  VampireClass,
  BombClass,
  MirrorClass,
  MagnetClass,
  RicochetClass,
  ReaperClass,
  CrusherClass,
  SpikeClass,
  MonkClass,
  BerserkerClass,
  DrillClass,
  NinjaClass,
  FangClass,
  SpearClass,
  SniperClass,
  VectorClass,
  PortalClass,
  GlassClass
];

const classMeta: Record<string, FighterClassMeta> = {
  chrono: {
    difficulty: "Medium",
    basicAttackName: "Time Shard",
    basicAttackDescription: "Fires precise time projectiles while building toward a burst window.",
    passiveName: "Temporal Guard",
    passiveDescription: "Slightly reduces collision and lightning burst damage.",
    strengths: ["Time Stop burst", "Control windows", "Ranged pressure"],
    weaknesses: ["Weaker outside Time Stop", "Projectile blockers", "Burst collision"],
    recommendedUpgrades: ["Longer Time Stop", "Rapid Moment", "Clean Prediction"],
    matchupHints: ["Good against slower classes", "Be careful against Magnet Ball and Mirror Ball"]
  },
  blade: {
    difficulty: "Easy",
    basicAttackName: "Blade Contact",
    basicAttackDescription: "Wins through direct contact and straight-line dash pressure.",
    passiveName: "Momentum Guard",
    passiveDescription: "Takes less projectile and burn pressure during dash windows.",
    strengths: ["Dash pressure", "Contact damage", "Simple aggressive play"],
    weaknesses: ["Projectile/status pressure", "Shield counters", "Missed dash windows"],
    recommendedUpgrades: ["Longer Dash", "Razor Impact", "Graze Master"],
    matchupHints: ["Punishes fragile ranged classes", "Avoid feeding Shield Guard Counter"]
  },
  shield: {
    difficulty: "Medium",
    basicAttackName: "Shield Bash",
    basicAttackDescription: "Relies on contact damage and defensive timing rather than ranged pressure.",
    passiveName: "Armor Charges",
    passiveDescription: "Consumes armor charges to reduce direct hits and refits armor over time.",
    strengths: ["Armor charges", "Counter window", "Anti-burst"],
    weaknesses: ["Damage over time", "Field effects", "Weak offense"],
    recommendedUpgrades: ["Armor Plating", "Faster Refit", "Guard Window"],
    matchupHints: ["Strong into melee bursts", "Needs status defense against Fire and Poison"]
  },
  fire: {
    difficulty: "Easy",
    basicAttackName: "Ember Shot",
    basicAttackDescription: "Fires embers that apply burn for sustained pressure.",
    passiveName: "Burn",
    passiveDescription: "Burn stacks tick over time and reward long fights.",
    strengths: ["Burn damage", "AoE pressure", "Long fights"],
    weaknesses: ["Anti-status", "Burst classes", "Projectile blockers"],
    recommendedUpgrades: ["Hotter Burn", "Lingering Flame", "Wider Flame Burst"],
    matchupHints: ["Pressures tanks and evasive classes", "Watch for Thunder and cleanse tools"]
  },
  thunder: {
    difficulty: "Medium",
    basicAttackName: "Spark Bolt",
    basicAttackDescription: "Fires quick electric bolts while wall bounces build Static Charge.",
    passiveName: "Overcharge Guard",
    passiveDescription: "Static Charge grants light protection until Lightning Chain is used.",
    strengths: ["High speed", "Wall-bounce charge", "Lightning Chain"],
    weaknesses: ["Suppression", "Anti-burst", "Inconsistent setup"],
    recommendedUpgrades: ["Static Battery", "Chain Surge", "Charge Conductor"],
    matchupHints: ["Strong when it keeps bouncing", "Gravity and burst guards can blunt chain value"]
  },
  poison: {
    difficulty: "Medium",
    basicAttackName: "Venom Spit",
    basicAttackDescription: "Fires toxic droplets that apply poison and slow ability tempo.",
    passiveName: "Poison Debuff",
    passiveDescription: "Poison deals damage over time and reduces enemy ability charge.",
    strengths: ["Poison uptime", "Ability charge debuff", "Attrition"],
    weaknesses: ["Burst damage", "Cleanse/status resistance", "Slow start"],
    recommendedUpgrades: ["Stronger Venom", "Lingering Toxin", "Toxic Pressure"],
    matchupHints: ["Good in longer matches", "Avoid letting burst classes end fights early"]
  },
  gravity: {
    difficulty: "Hard",
    basicAttackName: "Gravity Pulse",
    basicAttackDescription: "Fires gravity pulses that mark enemies and suppress movement energy.",
    passiveName: "Heavy Impact",
    passiveDescription: "Contact applies Gravity Mark and adds small pressure.",
    strengths: ["Gravity Well", "Movement suppression", "Ability delay"],
    weaknesses: ["Low direct damage", "Needs field value", "Ranged pressure"],
    recommendedUpgrades: ["Dense Core", "Wider Well", "Heavy Mark"],
    matchupHints: ["Strong against fast classes", "Needs projectiles and field placement to matter"]
  },
  vampire: {
    difficulty: "Medium",
    basicAttackName: "Blood Shard",
    basicAttackDescription: "Fires crimson shards and heals from real damage dealt.",
    passiveName: "Bloodied Power",
    passiveDescription: "Deals and charges slightly harder at low HP.",
    strengths: ["Sustain", "Blood Feast", "Low HP comeback"],
    weaknesses: ["Burst damage", "Anti-heal if added later", "DoT pressure"],
    recommendedUpgrades: ["Deeper Bite", "Longer Feast", "Crimson Shards"],
    matchupHints: ["Good if it keeps landing hits", "Avoid getting executed or bursted down"]
  },
  bomb: {
    difficulty: "Medium",
    basicAttackName: "Mini Bomb",
    basicAttackDescription: "Throws timed bombs that explode after a short fuse.",
    passiveName: "Volatile Bounce",
    passiveDescription: "Wall bounces can drop extra bombs at the bounce point.",
    strengths: ["Explosions", "Chain Detonation", "Area control"],
    weaknesses: ["Mobile enemies", "Missed bombs", "Projectile blockers less relevant"],
    recommendedUpgrades: ["Bigger Blast", "Hot Fuse", "Chain Reaction"],
    matchupHints: ["Strong into predictable paths", "Speed and evasion can dodge the blast pattern"]
  },
  mirror: {
    difficulty: "Hard",
    basicAttackName: "Refraction Shot",
    basicAttackDescription: "Fires reflective shards while decoys confuse targeting.",
    passiveName: "False Reflection",
    passiveDescription: "Can evade projectile hits and phase some collision burst.",
    strengths: ["Decoys", "Projectile evasion", "Shatter counters"],
    weaknesses: ["AoE", "DoT", "Direct collision pressure"],
    recommendedUpgrades: ["Longer Mirage", "Glass Core", "Shatter Counter"],
    matchupHints: ["Good against single-target projectiles", "Fire, Poison, and Bomb can bypass decoys"]
  },
  magnet: {
    difficulty: "Medium",
    basicAttackName: "Metal Shard",
    basicAttackDescription: "Fires metal shards while orbit fragments block incoming projectiles.",
    passiveName: "Orbit Shield",
    passiveDescription: "Orbiting shards block projectile direct hits and regenerate over time.",
    strengths: ["Blocks projectiles", "Magnetic Storm", "Anti-ranged"],
    weaknesses: ["Collision", "DoT", "AoE"],
    recommendedUpgrades: ["Faster Regeneration", "Sharper Metal", "Longer Storm"],
    matchupHints: ["Strong into projectile classes", "Weak when enemies deal damage without projectiles"]
  },
  ricochet: {
    difficulty: "Hard",
    basicAttackName: "Bank Shot",
    basicAttackDescription: "Fires bouncing projectiles that gain value after wall ricochets.",
    passiveName: "Ricochet Momentum",
    passiveDescription: "Bounced hits feed some ability meter and reward trick shots.",
    strengths: ["Bouncing projectiles", "Bank shots", "Wall pressure"],
    weaknesses: ["Projectile blockers", "Inconsistent aim", "Fast enemies"],
    recommendedUpgrades: ["Sharper Angle", "Faster Disc", "Trick Shot Tempo"],
    matchupHints: ["Best against predictable movement", "Magnet and Mirror can waste shots"]
  },
  reaper: {
    difficulty: "Medium",
    basicAttackName: "Soul Blade",
    basicAttackDescription: "Fires crescent blades that apply Death Marks.",
    passiveName: "Wounded Prey",
    passiveDescription: "Deals more damage to wounded enemies and sets up Soul Reap.",
    strengths: ["Death Marks", "Execute damage", "Finishing wounded enemies"],
    weaknesses: ["Weak early", "Mark blockers", "Sustain/decoys"],
    recommendedUpgrades: ["Longer Mark", "Deep Reap", "Mark Hunter"],
    matchupHints: ["Scary below execute range", "Projectile blockers and decoys slow mark stacking"]
  },
  crusher: {
    difficulty: "Easy",
    basicAttackName: "Heavy Collision",
    basicAttackDescription: "Deals contact damage on fighter collisions, with extra damage from high-impact crashes.",
    passiveName: "Heavy Core",
    passiveDescription: "Higher mass, lower bounce energy, and light resistance to contact, collision, and dash damage.",
    strengths: ["High-impact collisions", "Melee pressure", "Physical damage resistance"],
    weaknesses: ["Ranged kiting", "Burn and poison", "Needs contact to win"],
    recommendedUpgrades: ["Heavier Core", "Crushing Tempo", "Momentum Crush"],
    matchupHints: ["Punishes melee trades", "Must close distance against projectile and status classes"]
  },
  spike: {
    difficulty: "Easy",
    basicAttackName: "Spike Contact",
    basicAttackDescription: "Deals direct contact damage whenever it physically collides with the enemy.",
    passiveName: "Thorn Skin",
    passiveDescription: "Reflects contact damage and gains Wall Spike Charges from wall bounces for stronger contact hits and light projectile guard.",
    strengths: ["Contact damage", "Thorn reflection", "Wall Spike Charge pressure"],
    weaknesses: ["Ranged kiting", "Damage over time outside armor", "AoE pressure"],
    recommendedUpgrades: ["Sharper Spikes", "Longer Armor", "Wall Charge"],
    matchupHints: ["Punishes Blade-style contact", "Use wall bounces and Spike Armor to survive ranged pressure"]
  },
  monk: {
    difficulty: "Medium",
    basicAttackName: "Combo Contact",
    basicAttackDescription: "Lands rhythmic contact hits to build combo stacks and increase close-range pressure.",
    passiveName: "Combo Flow",
    passiveDescription: "Contact hits add combo stacks. Wall bounces trigger Focus Step, and higher combo grants projectile Flow Guard.",
    strengths: ["Repeated contact", "Combo scaling", "Palm Burst payoff"],
    weaknesses: ["Needs contact uptime", "Thorns/counters", "Ranged and status pressure"],
    recommendedUpgrades: ["Deeper Flow", "Faster Hands", "Strong Palm"],
    matchupHints: ["Rewards frequent collisions", "Be careful into Spike and Shield counters"]
  },
  berserker: {
    difficulty: "Medium",
    basicAttackName: "Rage Contact",
    basicAttackDescription: "Deals contact damage on fighter collisions, scaling harder as Berserker loses HP.",
    passiveName: "Rage Core",
    passiveDescription: "Missing HP increases contact damage, ability charge, and movement speed. Blood Rush grants meter once below 30 HP.",
    strengths: ["Low HP comeback", "Rage Break windows", "Contact pressure"],
    weaknesses: ["Burst damage", "Thorns and counters", "Can die before rage matters"],
    recommendedUpgrades: ["Deeper Rage", "Longer Rage Break", "Blood Rush+"],
    matchupHints: ["Gets scary below half HP", "Avoid feeding Spike, Shield, and Crusher contact trades too freely"]
  },
  drill: {
    difficulty: "Medium",
    basicAttackName: "Drill Contact",
    basicAttackDescription: "Deals contact damage and applies Armor Break through physical collisions.",
    passiveName: "Armor Break",
    passiveDescription: "Contact hits make the target take more Drill damage for a short time, stacking lightly.",
    strengths: ["Armor breaking", "Piercing defensive windows", "Wall Spin-Up contacts"],
    weaknesses: ["Ranged kiting", "Damage over time", "Must make contact to matter"],
    recommendedUpgrades: ["Sharper Drill", "Deeper Break", "Hard Tip"],
    matchupHints: ["Good into Shield, Spike, Crusher, and other defensive tools", "Still needs collisions against ranged classes"]
  },
  ninja: {
    difficulty: "Hard",
    basicAttackName: "Shadow Contact",
    basicAttackDescription: "Deals light contact damage and uses wall bounces to prime a stronger opening strike.",
    passiveName: "Smoke Reflex",
    passiveDescription: "Has a modest chance to evade direct projectile hits. Wall Shadow briefly improves the next contact and projectile evade chance.",
    strengths: ["Multi-dash pressure", "Projectile evasion", "Hit-and-run contact"],
    weaknesses: ["Thorns and counters", "Area damage", "Needs dash connections"],
    recommendedUpgrades: ["Extra Shadow", "Sharp Strike", "Smoke Master"],
    matchupHints: ["Good into projectile-heavy classes when Shadow Step connects", "Be careful into Spike, Shield, Fire, and Bomb"]
  },
  fang: {
    difficulty: "Medium",
    basicAttackName: "Fang Contact",
    basicAttackDescription: "Deals contact damage on fighter collisions and applies Bleed.",
    passiveName: "Blood Scent",
    passiveDescription: "Deals more contact damage and charges faster against enemies bleeding from Fang hits.",
    strengths: ["Bleed uptime", "Aggressive contact pressure", "Bonus damage against wounded targets"],
    weaknesses: ["Needs contact", "Thorns and counters", "Ranged kiting"],
    recommendedUpgrades: ["Sharper Fangs", "Deep Wound", "Savage Bite"],
    matchupHints: ["Pressures sustain classes through Bleed", "Be careful into Spike, Shield, and strong projectile zoning"]
  },
  spear: {
    difficulty: "Medium",
    basicAttackName: "Spear Thrust",
    basicAttackDescription: "Strikes at mid-range with a sharp lance thrust toward the selected target.",
    passiveName: "Guarded Reach",
    passiveDescription: "Spear Thrust deals bonus damage when enemies are inside spear range but outside direct body contact.",
    strengths: ["Mid-range poke", "Punishes approaches", "Spear Rush pressure"],
    weaknesses: ["Long-range zoning", "Needs line alignment", "Can be rushed between thrusts"],
    recommendedUpgrades: ["Longer Reach", "Sharper Tip", "Piercing Focus"],
    matchupHints: ["Good into melee approaches", "Magnet cannot block thrusts, but true ranged classes can keep distance"]
  },
  sniper: {
    difficulty: "Hard",
    basicAttackName: "Charged Shot",
    basicAttackDescription: "Locks an aim line, charges briefly, then fires a fast precision shot without homing after release.",
    passiveName: "Weakpoint Aim",
    passiveDescription: "Charged Shots deal bonus damage against enemies below 35% HP, with a stronger bonus below 20%.",
    strengths: ["Long-range burst", "Punishes predictable paths", "Finishes low HP targets"],
    weaknesses: ["Low HP", "Slow firing rhythm", "Melee pressure"],
    recommendedUpgrades: ["Sharper Shot", "Faster Lock", "Deadeye Focus"],
    matchupHints: ["Strong when it keeps distance", "Blade, Ninja, and other melee classes are dangerous once they connect"]
  },
  vector: {
    difficulty: "Hard",
    basicAttackName: "Vector Link",
    basicAttackDescription: "Uses wall bounces to place nodes and connect them into damaging laser lines.",
    passiveName: "Clean Geometry",
    passiveDescription: "Longer wall-linked lines deal more damage and reward clean cross-arena angles.",
    strengths: ["Wall-link traps", "Punishes crossing paths", "Strong arena control"],
    weaknesses: ["Needs wall bounces", "Low direct pressure", "Can miss if lines expire unused"],
    recommendedUpgrades: ["Longer Link", "Sharper Line", "Extra Segment"],
    matchupHints: ["Strong when enemies cross lanes", "Ranged classes can pressure before the web is built"]
  },
  portal: {
    difficulty: "Hard",
    basicAttackName: "Wall Gate",
    basicAttackDescription: "Places a portal on one wall bounce, then links it to a second wall portal on the next bounce.",
    passiveName: "Rift Strike",
    passiveDescription: "After teleporting, the next contact hit briefly gains bonus damage.",
    strengths: ["Unusual repositioning", "Surprise contact angles", "Wall-bounce mobility"],
    weaknesses: ["Low raw damage", "Only owner can use portals", "Needs wall setup"],
    recommendedUpgrades: ["Longer Gate", "Quick Rift", "Sharp Exit"],
    matchupHints: ["Use portals to dodge ranged lanes", "Contact classes with counters still punish bad exits"]
  },
  glass: {
    difficulty: "Hard",
    basicAttackName: "Prism Shot",
    basicAttackDescription: "Fires precise prism shards while relying on Glass Charges instead of HP.",
    passiveName: "Glass Charges",
    passiveDescription: "Starts with 1 HP and 3 Glass Charges. Charges block direct hits and restore through wall bounces.",
    strengths: ["Blocks lethal hits", "High bounce value", "Prism Shift evasion", "Precise projectile pressure"],
    weaknesses: ["Only 1 HP", "Dies with no charges", "Sustained pressure", "Requires wall-bounce recovery"],
    recommendedUpgrades: ["Extra Charge", "Wall Refocus", "Longer Shift"],
    matchupHints: ["Reward constant wall bounces to refresh charges", "DoT and rapid pressure become lethal once charges are down"]
  }
};

for (const fighterClass of playableClasses) {
  fighterClass.classMeta = classMeta[fighterClass.id];
}

export const classRegistry: Record<string, FighterClass> = Object.fromEntries(
  playableClasses.map((fighterClass) => [fighterClass.id, fighterClass])
);

export const comingSoonClasses: ComingSoonClassPreview[] = [];

export function getFighterClass(id: string): FighterClass {
  const fighterClass = classRegistry[id];
  if (!fighterClass) {
    throw new Error(`Unknown fighter class: ${id}`);
  }

  return fighterClass;
}
