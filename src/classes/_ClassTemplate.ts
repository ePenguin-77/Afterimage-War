import type { FighterClass } from "./FighterClass";
import { DEFAULT_MAX_HP } from "../tuning";

/*
  Class template for adding future fighter balls.

  1. Copy this file to a new file, for example FireClass.ts or ShieldClass.ts.
  2. Rename TemplateClass and set id/displayName/colors/role/base stats.
  3. Implement:
     - updateAI: attack timing and ability logic only. Normal body movement is physics-only.
     - updatePassiveScaling: growth over time, such as burn power or barrier size.
     - basicAttack: normal hit/projectile/area attack.
     - specialAbility: what happens when the ability meter reaches 100%.
     - drawWeapon and drawClassEffects: procedural canvas visuals.
  4. Register the class in classRegistry.ts.
*/

export const TemplateClass: FighterClass = {
  id: "template",
  displayName: "Template Ball",
  primaryColor: "#ff7b4a",
  secondaryColor: "#ffe1b5",
  outlineColor: "#211510",
  role: "burst",
  roleLabel: "Burst",
  shortDescription: "Describe this class in one compact class-select sentence.",
  // DEFAULT_MAX_HP is the baseline fallback. Override baseHP when a class needs identity-specific HP.
  baseHP: DEFAULT_MAX_HP,
  baseMoveSpeed: 250,
  targetMoveSpeed: 250,
  radius: 34,
  mass: 1,
  restitution: 0.95,
  minSpeed: 130,
  maxSpeed: 320,
  contactDamage: 0,
  contactDamageCooldown: 0.4,
  baseDamage: 4,
  scalingStatName: "Power",
  abilityName: "TEMPLATE ABILITY",
  abilityDescription: "Describe the class ability here.",
  abilityChargeRate: 0.055,

  updateAI({ self, enemy }): void {
    void self.distanceTo(enemy);
    // Movement is physics-only: do not steer the fighter body here.
    // Use this method for attack timing, aiming, and ability decisions.
  },

  updatePassiveScaling({ self, dt }): void {
    self.scalingValue += dt * 0.04;
  },

  basicAttack(): void {
    // Add projectile or melee logic here.
  },

  specialAbility(): void {
    // Trigger the class ultimate here.
  },

  drawWeapon(): void {
    // Draw an orbiting weapon or class icon here.
  },

  drawClassEffects(): void {
    // Draw passive aura/trails here.
  }
};
