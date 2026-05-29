import type { Game } from "../Game";
import type { Fighter } from "../entities/Fighter";
import type { CircleCollisionResult, WallCollisionResult } from "../physics";

export type FighterRole = "ranged" | "melee" | "tank" | "control" | "burst" | "support";
export type FighterDifficulty = "Easy" | "Medium" | "Hard";

export type FighterClassMeta = {
  difficulty: FighterDifficulty;
  basicAttackName: string;
  basicAttackDescription: string;
  passiveName?: string;
  passiveDescription?: string;
  strengths: string[];
  weaknesses: string[];
  recommendedUpgrades: string[];
  matchupHints: string[];
};

export type FighterClassContext = {
  game: Game;
  self: Fighter;
  enemy: Fighter;
  dt: number;
};

export type DamageKind =
  | "projectile"
  | "contact"
  | "dash"
  | "collision"
  | "counter"
  | "burn"
  | "poison"
  | "bleed"
  | "field"
  | "explosion"
  | "ability"
  | "generic";

export type DamageContext = FighterClassContext & {
  amount: number;
  source: Fighter;
  kind: DamageKind;
};

export type PostDefenseDamageContext = DamageContext & {
  originalAmount: number;
  modifiedAmount: number;
};

export type WallBounceContext = FighterClassContext & {
  collision: WallCollisionResult;
};

export type ContactDamageResult = {
  damage: number;
  bonusDamage?: number;
  highImpact?: boolean;
};

export type ContactDamageContext = FighterClassContext & {
  collision: CircleCollisionResult;
  baseDamage: number;
};

export interface FighterClass {
  id: string;
  displayName: string;
  primaryColor: string;
  secondaryColor: string;
  outlineColor: string;
  role: FighterRole;
  roleLabel?: string;
  shortDescription?: string;
  classMeta?: FighterClassMeta;
  // DEFAULT_MAX_HP is only the baseline fallback; classes can override baseHP for balance identity.
  baseHP?: number;
  baseMoveSpeed: number;
  targetMoveSpeed?: number;
  radius?: number;
  mass?: number;
  restitution?: number;
  minSpeed?: number;
  maxSpeed?: number;
  contactDamage?: number;
  contactDamageCooldown?: number;
  dashSpeed?: number;
  dashDamage?: number;
  dashDuration?: number;
  baseDamage: number;
  scalingStatName: string;
  abilityName: string;
  abilityDescription: string;
  abilityChargeRate: number;

  formatScalingStat?(fighter: Fighter): string;
  modifyIncomingDamage?(context: DamageContext): number;
  modifyPostDefenseDamage?(context: PostDefenseDamageContext): number;
  onDamageDealt?(context: DamageContext): void;
  onDamageTaken?(context: DamageContext): void;
  onWallBounce?(context: WallBounceContext): void;
  getContactDamage?(context: ContactDamageContext): ContactDamageResult;
  getContactCooldown?(context: FighterClassContext): number;
  updateAI(context: FighterClassContext): void;
  updatePassiveScaling(context: FighterClassContext): void;
  basicAttack(context: FighterClassContext): void;
  specialAbility(context: FighterClassContext): void;
  drawWeapon(ctx: CanvasRenderingContext2D, fighter: Fighter, time: number): void;
  drawClassEffects(ctx: CanvasRenderingContext2D, fighter: Fighter, time: number): void;
}
