import type { Fighter } from "../entities/Fighter";
import { VectorLine } from "../entities/VectorLine";
import { BALANCE } from "../tuning";
import type { FighterClass, FighterClassContext, WallBounceContext } from "./FighterClass";
import { TAU, clamp, distance, randomRange, type Vec2 } from "../utils/math";

const NODE_X = "vectorNodeX";
const NODE_Y = "vectorNodeY";
const NODE_TIMER = "vectorNodeTimer";
const WEB_TIMER = "vectorWebTimer";
const NODE_FLASH = "vectorNodeFlash";
const LINK_TEXT_TIMER = "vectorLinkTextTimer";

export const VectorClass: FighterClass = {
  id: "vector",
  displayName: "Vector Ball",
  primaryColor: "#2dfcff",
  secondaryColor: "#ff4dff",
  outlineColor: "#071323",
  role: "control",
  roleLabel: "Wall Link / Laser Trap",
  shortDescription: "Links wall-bounce points into damaging energy lines that punish enemies crossing them.",
  baseHP: BALANCE.vector.hp,
  baseMoveSpeed: BALANCE.vector.targetMoveSpeed,
  targetMoveSpeed: BALANCE.vector.targetMoveSpeed,
  mass: BALANCE.vector.mass,
  restitution: BALANCE.vector.restitution,
  minSpeed: BALANCE.vector.minSpeed,
  maxSpeed: BALANCE.vector.maxSpeed,
  contactDamage: BALANCE.vector.contactDamage,
  contactDamageCooldown: BALANCE.vector.contactDamageCooldown,
  baseDamage: BALANCE.vector.vectorLineDamage,
  scalingStatName: "Lines",
  abilityName: "VECTOR WEB",
  abilityDescription: "Creates longer-lasting wall-linked energy lines that damage enemies crossing them.",
  abilityChargeRate: BALANCE.vector.abilityMeterGainRate,

  formatScalingStat(fighter): string {
    const activeLines = Number(fighter.customState.vectorActiveLines ?? 0);
    return `${activeLines}/${getMaxActiveLines(fighter)}`;
  },

  updatePassiveScaling({ game, self, dt }: FighterClassContext): void {
    self.customState[WEB_TIMER] = Math.max(0, Number(self.customState[WEB_TIMER] ?? 0) - dt);
    self.customState[NODE_TIMER] = Math.max(0, Number(self.customState[NODE_TIMER] ?? 0) - dt);
    self.customState[NODE_FLASH] = Math.max(0, Number(self.customState[NODE_FLASH] ?? 0) - dt);
    self.customState[LINK_TEXT_TIMER] = Math.max(0, Number(self.customState[LINK_TEXT_TIMER] ?? 0) - dt);
    self.customState.vectorActiveLines = game.vectorLines.filter((line) => line.owner === self && line.active).length;
    self.scalingValue = Number(self.customState.vectorActiveLines ?? 0);
  },

  updateAI({ game, self, dt }: FighterClassContext): void {
    if (!game.isFastSimulation && Math.random() < dt * (isVectorWebActive(self) ? 4 : 1.4)) {
      game.spawnCrusherSpark(
        {
          x: self.position.x + randomRange(-20, 20),
          y: self.position.y + randomRange(-20, 20)
        },
        isVectorWebActive(self) ? this.secondaryColor : this.primaryColor
      );
    }
  },

  onWallBounce({ game, self, collision }: WallBounceContext): void {
    const currentNode = { x: collision.point.x, y: collision.point.y };
    self.stats.vectorNodesPlaced += 1;
    self.customState[NODE_FLASH] = 0.32;

    const previousTimer = Number(self.customState[NODE_TIMER] ?? 0);
    const previousNode =
      previousTimer > 0 && typeof self.customState[NODE_X] === "number" && typeof self.customState[NODE_Y] === "number"
        ? { x: Number(self.customState[NODE_X]), y: Number(self.customState[NODE_Y]) }
        : null;

    if (previousNode && distance(previousNode, currentNode) > 40) {
      createVectorLine(game, self, previousNode, currentNode);
    } else if (!game.isFastSimulation) {
      game.spawnAbilityText("NODE", this.primaryColor, currentNode);
    }

    self.customState[NODE_X] = currentNode.x;
    self.customState[NODE_Y] = currentNode.y;
    self.customState[NODE_TIMER] = BALANCE.vector.unlinkedNodeDuration;
  },

  basicAttack(): void {
    // Vector Ball relies on contact damage and wall-linked line traps.
  },

  specialAbility({ game, self }: FighterClassContext): void {
    self.customState[WEB_TIMER] = BALANCE.vector.vectorWebDuration * self.runModifiers.abilityDurationMultiplier + self.runModifiers.vectorWebDurationBonus;
    self.stats.vectorWebUses += 1;
    game.spawnAbilityText("VECTOR WEB", this.secondaryColor, self.position);
  },

  drawWeapon(ctx: CanvasRenderingContext2D, fighter, time): void {
    const webActive = isVectorWebActive(fighter);
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.rotate(time * (webActive ? 1.4 : 0.8));
    ctx.strokeStyle = webActive ? "#ff4dff" : "#2dfcff";
    ctx.fillStyle = webActive ? "rgba(255, 77, 255, 0.14)" : "rgba(45, 252, 255, 0.12)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      const angle = i * (TAU / 3);
      const nextAngle = angle + TAU / 3;
      const radius = fighter.radius + 15 + Math.sin(time * 6 + i) * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      ctx.lineTo(Math.cos(nextAngle) * radius, Math.sin(nextAngle) * radius);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawClassEffects(ctx: CanvasRenderingContext2D, fighter, time): void {
    const webActive = isVectorWebActive(fighter);
    const nodeTimer = Number(fighter.customState[NODE_TIMER] ?? 0);
    const flash = Number(fighter.customState[NODE_FLASH] ?? 0);

    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    ctx.strokeStyle = webActive ? "rgba(255, 77, 255, 0.66)" : "rgba(45, 252, 255, 0.42)";
    ctx.lineWidth = webActive ? 4 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 11 + Math.sin(time * 7) * 2 + flash * 12, 0, TAU);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.62)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const angle = time * 0.6 + i * (TAU / 3);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 8, Math.sin(angle) * 8);
      ctx.lineTo(Math.cos(angle) * (fighter.radius - 5), Math.sin(angle) * (fighter.radius - 5));
      ctx.stroke();
    }
    ctx.restore();

    if (nodeTimer > 0 && typeof fighter.customState[NODE_X] === "number" && typeof fighter.customState[NODE_Y] === "number") {
      ctx.save();
      const alpha = clamp(nodeTimer / BALANCE.vector.unlinkedNodeDuration, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.translate(Number(fighter.customState[NODE_X]), Number(fighter.customState[NODE_Y]));
      ctx.fillStyle = webActive ? "#ff4dff" : "#2dfcff";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 5.6 + Math.sin(time * 10) * 1.1, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
};

function createVectorLine(game: FighterClassContext["game"], owner: Fighter, start: Vec2, end: Vec2): void {
  const webActive = isVectorWebActive(owner);
  const lineLength = distance(start, end);
  const duration =
    (webActive ? BALANCE.vector.vectorWebLineDuration : BALANCE.vector.vectorLineDuration) +
    owner.runModifiers.vectorLineDurationBonus;
  const thresholdReduction = owner.runModifiers.vectorLongLineThresholdReduction;
  const longThreshold = Math.max(120, BALANCE.vector.longLineBonusDistance - thresholdReduction);
  const longerThreshold = Math.max(longThreshold + 40, BALANCE.vector.longerLineBonusDistance - thresholdReduction);
  const geometryBonus =
    lineLength > longerThreshold
      ? BALANCE.vector.longerLineBonusDamage
      : lineLength > longThreshold
        ? BALANCE.vector.longLineBonusDamage
        : 0;
  const damage =
    ((webActive ? BALANCE.vector.vectorWebLineDamage : BALANCE.vector.vectorLineDamage) + geometryBonus) *
    owner.runModifiers.vectorLineDamageMultiplier;
  const width =
    (webActive ? BALANCE.vector.vectorWebLineWidth : BALANCE.vector.vectorLineWidth) + owner.runModifiers.vectorLineWidthBonus;

  game.vectorLines.push(
    new VectorLine({
      owner,
      start,
      end,
      damage,
      width,
      duration,
      hitCooldown: BALANCE.vector.vectorLineHitCooldown,
      webEnhanced: webActive
    })
  );
  owner.stats.vectorLinesCreated += 1;
  owner.stats.longestVectorLine = Math.max(owner.stats.longestVectorLine, lineLength);
  if (!game.isFastSimulation && Number(owner.customState[LINK_TEXT_TIMER] ?? 0) <= 0) {
    game.spawnAbilityText("LINK!", webActive ? VectorClass.secondaryColor : VectorClass.primaryColor, end);
    owner.customState[LINK_TEXT_TIMER] = 0.5;
  }

  const maxLines = getMaxActiveLines(owner);
  const ownerLines = game.vectorLines.filter((line) => line.owner === owner && line.active);
  while (ownerLines.length > maxLines) {
    const oldest = ownerLines.shift();
    if (oldest) {
      oldest.life = 0;
    }
  }
}

function getMaxActiveLines(fighter: Fighter): number {
  const base = isVectorWebActive(fighter) ? BALANCE.vector.vectorWebMaxActiveLines : BALANCE.vector.maxActiveVectorLines;
  return base;
}

function isVectorWebActive(fighter: { customState: Record<string, number | boolean | string> }): boolean {
  return Number(fighter.customState[WEB_TIMER] ?? 0) > 0;
}
