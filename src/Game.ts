import { BladeClass } from "./classes/BladeClass";
import { ChronoClass } from "./classes/ChronoClass";
import { consumeOrbitShard } from "./classes/MagnetClass";
import { addMonkCombo } from "./classes/MonkClass";
import { getFighterClass, playableClasses } from "./classes/classRegistry";
import type { FighterClass } from "./classes/FighterClass";
import { applyGravityStatus, applyPoison, getGravityAbilityChargeMultiplier, getGravitySpeedMultiplier } from "./combat/statusEffects";
import { Fighter, createFighterStats, type FighterStats } from "./entities/Fighter";
import { Bomb } from "./entities/Bomb";
import { MirrorDecoy } from "./entities/MirrorDecoy";
import { Projectile } from "./entities/Projectile";
import { Particle, burstParticles } from "./effects/Particle";
import { CircleCollisionResult, resolveCircleCollision } from "./physics";
import { cloneLeaguePlayerModifiers, createLeagueRunState, prepareNextOpponent, promotePreparedOpponent } from "./run/LeagueRunMode";
import type { LeagueRunState } from "./run/RunState";
import {
  createSelectedUpgradeRecord,
  getBuildFocusTags,
  getRunModifierSummary,
  getUpgradeSynergyLabel,
  type UpgradeDefinition
} from "./run/Upgrade";
import { applyUpgradeById, rarityColor, rollUpgradeChoices } from "./run/upgradeRegistry";
import { BALANCE, DEFAULT_MAX_HP, MOVEMENT } from "./tuning";
import { Rect, TAU, Vec2, angleTo, circleOverlap, clamp, distance, fromAngle, randomRange } from "./utils/math";

type ButtonRect = Rect & {
  label: string;
};

type BalanceButtonRect = ButtonRect & {
  matches: number;
};

type TournamentClassToggleRect = Rect & {
  classId: string;
};

type TournamentFocusSelectorButtonRect = ButtonRect & {
  fighterIndex: 0 | 1;
  direction: -1 | 1;
};

type SimulationMode = "visual" | "fast";
type TournamentRunMode = "matrix" | "matchup" | "class";

type TournamentProgress = {
  active: boolean;
  cancelled: boolean;
  mode: TournamentRunMode;
  currentMatch: number;
  totalMatches: number;
  currentLabel: string;
  startedAt: number;
};

type GameState =
  | "class-select"
  | "battle"
  | "ko-freeze"
  | "battle-ended"
  | "balance-results"
  | "tournament-options"
  | "tournament-running"
  | "tournament-results"
  | "league-reward"
  | "league-over"
  | "league-cleared";

type MainMode = "quick" | "league";

type ClassCardRect = Rect & {
  fighterIndex: 0 | 1;
  classId: string;
  locked: boolean;
};

type ClassSelectorButtonRect = ButtonRect & {
  fighterIndex: 0 | 1;
  direction: -1 | 1;
};

type ClassDetailButtonRect = ButtonRect & {
  fighterIndex: 0 | 1;
};

type ClassDetailTab = "overview" | "skill" | "build";

type ClassDetailTabRect = ButtonRect & {
  tab: ClassDetailTab;
};

type LightningEffect = {
  from: Vec2;
  to: Vec2;
  color: string;
  secondaryColor: string;
  life: number;
  maxLife: number;
};

type ToxicCloud = {
  owner: Fighter;
  position: Vec2;
  radius: number;
  duration: number;
  maxDuration: number;
  tickInterval: number;
  tickTimer: number;
  directDamage: number;
  poisonStacks: number;
  poisonDuration: number;
};

type GravityWell = {
  owner: Fighter;
  position: Vec2;
  radius: number;
  duration: number;
  maxDuration: number;
  speedMultiplier: number;
  abilityChargeMultiplier: number;
  restitutionMultiplier: number;
  enemyInside: boolean;
  lastDistance: number;
};

type FighterResultSummary = {
  label: string;
  className: string;
  finalHp: number;
  stats: FighterStats;
};

type MatchSummary = {
  winnerName: string;
  loserName: string;
  duration: number;
  winnerHp: number;
  fighters: [FighterResultSummary, FighterResultSummary];
};

type BalanceTestResult = {
  classNames: [string, string];
  matches: number;
  wins: [number, number];
  averageDuration: number;
  averageRemainingHp: [number, number];
  fastestWin: number;
  longestMatch: number;
  averageStats: [FighterStats, FighterStats];
};

type SimulatedMatchOutcome = {
  winnerIndex: 0 | 1;
  duration: number;
  remainingHp: [number, number];
  stats: [FighterStats, FighterStats];
};

type TournamentMatchupCell = {
  rowClassId: string;
  columnClassId: string;
  rowClassName: string;
  columnClassName: string;
  matches: number;
  rowWins: number;
  columnWins: number;
  averageDuration: number;
  averageRemainingHp: [number, number];
  averageStats: [FighterStats, FighterStats];
  mirror: boolean;
};

type TournamentRanking = {
  classId: string;
  className: string;
  wins: number;
  losses: number;
  winRate: number;
  averageDuration: number;
};

type TournamentResult = {
  classIds: string[];
  matchesPerMatchup: number;
  includeMirrors: boolean;
  runMode: TournamentRunMode;
  focusClassId?: string;
  cells: Record<string, TournamentMatchupCell>;
  rankings: TournamentRanking[];
  warnings: string[];
};

type TournamentCellRect = Rect & {
  key: string;
};

type UpgradeCardRect = Rect & {
  upgradeId: string;
};

export class Game {
  readonly width = 576;
  readonly height = 1024;
  readonly arena: Rect = { x: 48, y: 146, w: 480, h: 662 };
  readonly arenaBorder = 8;
  readonly fixedDt = 1 / 60;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  fighters: [Fighter, Fighter];
  projectiles: Projectile[] = [];
  bombs: Bomb[] = [];
  mirrorDecoys: MirrorDecoy[] = [];
  particles: Particle[] = [];
  lightningEffects: LightningEffect[] = [];
  toxicClouds: ToxicCloud[] = [];
  gravityWells: GravityWell[] = [];
  gameState: GameState = "class-select";
  selectedMode: MainMode = "quick";
  selectedClassIds: [string, string] = [ChronoClass.id, BladeClass.id];
  classSelectCards: ClassCardRect[] = [];
  classSelectorButtons: ClassSelectorButtonRect[] = [];
  classDetailButtons: ClassDetailButtonRect[] = [];
  classDetailTabButtons: ClassDetailTabRect[] = [];
  classDetailCloseButton: ButtonRect = { x: 498, y: 78, w: 36, h: 34, label: "X" };
  classDetailOpen = false;
  classDetailClassId: string | null = null;
  classDetailTab: ClassDetailTab = "overview";
  leagueRun: LeagueRunState | null = null;
  leagueRewardCards: UpgradeCardRect[] = [];
  selectedLeagueUpgradeId: string | null = null;
  time = 0;
  paused = false;
  debug = false;
  devToolsVisible = false;
  physicsTestMode = false;
  simulationMode: SimulationMode = "visual";
  winner: Fighter | null = null;
  koLoser: Fighter | null = null;
  koTimer = 0;
  readonly koFreezeDuration = 1.5;
  lastMatchSummary: MatchSummary | null = null;
  balanceTestResult: BalanceTestResult | null = null;
  tournamentResult: TournamentResult | null = null;
  tournamentMatchesPerMatchup = 30;
  tournamentIncludeMirrors = false;
  tournamentRunMode: TournamentRunMode = "matrix";
  selectedTournamentClassIds = new Set<string>(playableClasses.map((fighterClass) => fighterClass.id));
  focusedTournamentClassIds: [string, string] = [ChronoClass.id, BladeClass.id];
  focusedTournamentClassId = ChronoClass.id;
  tournamentProgress: TournamentProgress | null = null;
  tournamentCancelRequested = false;
  tournamentCellRects: TournamentCellRect[] = [];
  tournamentClassToggleRects: TournamentClassToggleRect[] = [];
  selectedTournamentCellKey: string | null = null;
  selectedTournamentFocusClassId: string | null = null;
  showFullTournamentMatrix = false;
  stasisTimer = 0;
  shake = 0;
  debugCollisionNormal: CircleCollisionResult | null = null;
  debugWallHit: { point: Vec2; normal: Vec2; wall: string; timer: number } | null = null;
  debugCollisionTimer = 0;
  lastFrame = performance.now();
  accumulator = 0;
  fps = 60;
  restartButton: ButtonRect = { x: 196, y: 964, w: 184, h: 42, label: "RESTART" };
  quickModeButton: ButtonRect = { x: 108, y: 94, w: 170, h: 34, label: "QUICK BATTLE" };
  leagueModeButton: ButtonRect = { x: 298, y: 94, w: 170, h: 34, label: "LEAGUE RUN" };
  matrixModeButton: ButtonRect = { x: 384, y: 94, w: 154, h: 34, label: "MATCHUP MATRIX" };
  startBattleButton: ButtonRect = { x: 128, y: 764, w: 320, h: 54, label: "START BATTLE" };
  startLeagueButton: ButtonRect = { x: 128, y: 764, w: 320, h: 54, label: "START LEAGUE RUN" };
  restartSameButton: ButtonRect = { x: 54, y: 888, w: 222, h: 54, label: "RESTART SAME" };
  classSelectButton: ButtonRect = { x: 300, y: 888, w: 222, h: 54, label: "CLASS SELECT" };
  leagueRetryButton: ButtonRect = { x: 54, y: 888, w: 222, h: 54, label: "RETRY RUN" };
  leagueBackButton: ButtonRect = { x: 300, y: 888, w: 222, h: 54, label: "CLASS SELECT" };
  leagueContinueButton: ButtonRect = { x: 178, y: 824, w: 220, h: 46, label: "CONTINUE" };
  resultBalanceButton: ButtonRect = { x: 178, y: 950, w: 220, h: 46, label: "RUN TEST 30" };
  balanceBackButton: ButtonRect = { x: 178, y: 950, w: 220, h: 46, label: "CLASS SELECT" };
  tournamentEntryButton: ButtonRect = { x: 128, y: 954, w: 320, h: 42, label: "MATCHUP MATRIX" };
  devMatrixButton: ButtonRect = { x: 178, y: 858, w: 220, h: 42, label: "MATCHUP MATRIX" };
  tournamentBackButton: ButtonRect = { x: 54, y: 950, w: 222, h: 46, label: "BACK" };
  tournamentStartButton: ButtonRect = { x: 300, y: 950, w: 222, h: 46, label: "START" };
  tournamentCancelButton: ButtonRect = { x: 178, y: 950, w: 220, h: 46, label: "CANCEL" };
  tournamentModeButton: ButtonRect = { x: 56, y: 142, w: 256, h: 34, label: "MATRIX MODE" };
  tournamentSelectAllButton: ButtonRect = { x: 58, y: 486, w: 110, h: 30, label: "ALL" };
  tournamentClearButton: ButtonRect = { x: 174, y: 486, w: 110, h: 30, label: "CLEAR" };
  tournamentCoreButton: ButtonRect = { x: 290, y: 486, w: 110, h: 30, label: "CORE" };
  tournamentRecentButton: ButtonRect = { x: 406, y: 486, w: 110, h: 30, label: "RECENT" };
  tournamentMirrorButton: ButtonRect = { x: 108, y: 456, w: 360, h: 48, label: "MIRRORS OFF" };
  tournamentFocusedButtons: TournamentFocusSelectorButtonRect[] = [
    { x: 58, y: 256, w: 42, h: 34, label: "<", fighterIndex: 0, direction: -1 },
    { x: 476, y: 256, w: 42, h: 34, label: ">", fighterIndex: 0, direction: 1 },
    { x: 58, y: 326, w: 42, h: 34, label: "<", fighterIndex: 1, direction: -1 },
    { x: 476, y: 326, w: 42, h: 34, label: ">", fighterIndex: 1, direction: 1 }
  ];
  tournamentFocusPrevButton: ButtonRect = { x: 52, y: 536, w: 42, h: 32, label: "<" };
  tournamentFocusNextButton: ButtonRect = { x: 482, y: 536, w: 42, h: 32, label: ">" };
  tournamentFullMatrixButton: ButtonRect = { x: 198, y: 872, w: 180, h: 28, label: "FULL MATRIX" };
  balanceTestButtons: BalanceButtonRect[] = [
    { x: 46, y: 908, w: 150, h: 40, label: "TEST 10", matches: 10 },
    { x: 213, y: 908, w: 150, h: 40, label: "TEST 30", matches: 30 },
    { x: 380, y: 908, w: 150, h: 40, label: "TEST 100", matches: 100 }
  ];
  tournamentOptionButtons: BalanceButtonRect[] = [
    { x: 72, y: 382, w: 130, h: 44, label: "10", matches: 10 },
    { x: 223, y: 382, w: 130, h: 44, label: "30", matches: 30 },
    { x: 374, y: 382, w: 130, h: 44, label: "100", matches: 100 }
  ];
  tournamentResultButtons: BalanceButtonRect[] = [
    { x: 46, y: 908, w: 150, h: 40, label: "RUN 10", matches: 10 },
    { x: 213, y: 908, w: 150, h: 40, label: "RUN 30", matches: 30 },
    { x: 380, y: 908, w: 150, h: 40, label: "RUN 100", matches: 100 }
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("2D canvas context is unavailable.");
    }

    this.ctx = context;
    this.fighters = this.createFighters();
    try {
      this.devToolsVisible = localStorage.getItem("afterimageWarDevTools") === "true";
    } catch {
      this.devToolsVisible = false;
    }
    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
    this.canvas.addEventListener("pointerdown", (event) => this.handlePointer(event));
  }

  start(): void {
    requestAnimationFrame((time) => this.loop(time));
  }

  restart(): void {
    if (this.selectedMode === "league" && this.leagueRun?.phase === "battle") {
      this.startLeagueRound();
      return;
    }

    this.fighters = this.physicsTestMode ? this.createPhysicsTestFighters() : this.createFighters();
    this.projectiles = [];
    this.bombs = [];
    this.mirrorDecoys = [];
    this.particles = [];
    this.lightningEffects = [];
    this.toxicClouds = [];
    this.gravityWells = [];
    this.leagueRewardCards = [];
    this.time = 0;
    this.winner = null;
    this.koLoser = null;
    this.koTimer = 0;
    this.lastMatchSummary = null;
    this.balanceTestResult = null;
    this.tournamentResult = null;
    this.selectedTournamentCellKey = null;
    this.paused = false;
    this.stasisTimer = 0;
    this.shake = 0;
    this.gameState = "battle";
    this.accumulator = 0;
  }

  backToClassSelect(): void {
    this.projectiles = [];
    this.bombs = [];
    this.mirrorDecoys = [];
    this.particles = [];
    this.lightningEffects = [];
    this.toxicClouds = [];
    this.gravityWells = [];
    this.time = 0;
    this.winner = null;
    this.koLoser = null;
    this.koTimer = 0;
    this.lastMatchSummary = null;
    this.paused = false;
    this.physicsTestMode = false;
    this.leagueRun = null;
    this.leagueRewardCards = [];
    this.selectedLeagueUpgradeId = null;
    this.stasisTimer = 0;
    this.shake = 0;
    this.gameState = "class-select";
    this.accumulator = 0;
  }

  private startLeagueRun(): void {
    this.selectedMode = "league";
    this.leagueRun = createLeagueRunState(this.selectedClassIds[0]);
    this.selectedLeagueUpgradeId = null;
    this.startLeagueRound();
  }

  private startLeagueRound(): void {
    if (!this.leagueRun) {
      this.startLeagueRun();
      return;
    }

    this.leagueRun.phase = "battle";
    this.selectedClassIds = [this.leagueRun.playerClassId, this.leagueRun.opponentClassId];
    this.fighters = this.createFighters();
    this.projectiles = [];
    this.bombs = [];
    this.mirrorDecoys = [];
    this.particles = [];
    this.lightningEffects = [];
    this.toxicClouds = [];
    this.gravityWells = [];
    this.time = 0;
    this.winner = null;
    this.koLoser = null;
    this.koTimer = 0;
    this.lastMatchSummary = null;
    this.paused = false;
    this.physicsTestMode = false;
    this.stasisTimer = 0;
    this.shake = 0;
    this.gameState = "battle";
    this.accumulator = 0;
  }

  private chooseLeagueUpgrade(upgradeId: string): void {
    if (!this.leagueRun) {
      return;
    }

    const upgrade = this.leagueRun.pendingChoices.find((choice) => choice.id === upgradeId);
    if (!upgrade) {
      return;
    }

    this.selectedLeagueUpgradeId = upgrade.id;
  }

  private confirmLeagueUpgrade(): void {
    if (!this.leagueRun || !this.selectedLeagueUpgradeId) {
      return;
    }

    const upgrade = this.leagueRun.pendingChoices.find((choice) => choice.id === this.selectedLeagueUpgradeId);
    if (!upgrade) {
      return;
    }

    this.leagueRun.upgrades.push(upgrade);
    this.leagueRun.selectedUpgrades.push(createSelectedUpgradeRecord(upgrade, this.leagueRun.round));
    applyUpgradeById(upgrade.id, this.leagueRun.playerModifiers);
    this.leagueRun.pendingChoices = [];
    this.selectedLeagueUpgradeId = null;
    promotePreparedOpponent(this.leagueRun);
    this.startLeagueRound();
  }

  private beginKoFreeze(winner: Fighter, loser: Fighter): void {
    this.winner = winner;
    this.koLoser = loser;
    loser.hp = 0;
    this.koTimer = this.koFreezeDuration;
    this.gameState = "ko-freeze";
    this.addShake(11);
    this.spawnAbilityText("KO!", winner.classDef.secondaryColor, loser.position);
  }

  private finishKoFreeze(): void {
    if (!this.winner || !this.koLoser) {
      return;
    }

    this.finishBattle(this.winner, this.koLoser);
  }

  private finishBattle(winner: Fighter, loser: Fighter): void {
    this.winner = winner;
    this.koLoser = loser;
    loser.hp = 0;
    this.lastMatchSummary = this.createMatchSummary(winner, loser);

    if (this.selectedMode === "league" && this.leagueRun?.phase === "battle" && !this.isFastSimulation) {
      this.leagueRun.totalDamageDealt += this.fighters[0].stats.damageDealt;
      this.leagueRun.totalDamageTaken += this.fighters[0].stats.damageTaken;
      this.addLeagueDamageSources(this.fighters[0].stats);
      this.leagueRun.totalTime += this.time;
      this.leagueRun.finalOpponentName = this.fighters[1].classDef.displayName;

      if (winner === this.fighters[0]) {
        this.leagueRun.roundsCleared += 1;
        this.leagueRun.totalWins += 1;
        this.leagueRun.defeatedOpponents.push(this.fighters[1].classDef.id);
        if (this.leagueRun.roundsCleared >= this.leagueRun.totalRounds) {
          this.leagueRun.phase = "cleared";
          this.leagueRun.isRunCleared = true;
          this.gameState = "league-cleared";
        } else {
          prepareNextOpponent(this.leagueRun);
          this.leagueRun.phase = "reward";
          this.selectedLeagueUpgradeId = null;
          this.leagueRun.pendingChoices = rollUpgradeChoices(
            this.leagueRun.playerClassId,
            this.leagueRun.upgrades.map((upgrade) => upgrade.id)
          );
          this.gameState = "league-reward";
        }
      } else {
        this.leagueRun.phase = "lost";
        this.leagueRun.isRunOver = true;
        this.gameState = "league-over";
      }
    } else {
      this.gameState = "battle-ended";
    }

  }

  private addLeagueDamageSources(stats: FighterStats): void {
    if (!this.leagueRun) {
      return;
    }
    const sources: Array<[string, number]> = [
      ["Projectile", stats.projectileDamage],
      ["Contact", stats.contactDamage],
      ["Dash", stats.dashDamage],
      ["Ability", stats.abilityDamage],
      ["Explosion", stats.explosionDamage],
      ["Burn", stats.burnDamage],
      ["Poison", stats.poisonDamage],
      ["Counter", stats.counterDamage],
      ["Collision", stats.collisionDamage]
    ];
    for (const [label, amount] of sources) {
      if (amount > 0) {
        this.leagueRun.damageSources[label] = (this.leagueRun.damageSources[label] ?? 0) + amount;
      }
    }
  }

  get intensityMultiplier(): number {
    return 1 + Math.min(1, this.time / 50) * 0.52;
  }

  get isFastSimulation(): boolean {
    return this.simulationMode === "fast";
  }

  get arenaInner(): Rect {
    const inset = this.arenaBorder * 0.5;
    return {
      x: this.arena.x + inset,
      y: this.arena.y + inset,
      w: this.arena.w - inset * 2,
      h: this.arena.h - inset * 2
    };
  }

  getEnemyOf(fighter: Fighter): Fighter {
    return this.fighters[0] === fighter ? this.fighters[1] : this.fighters[0];
  }

  private clearTransientBattleState(): void {
    this.projectiles = [];
    this.bombs = [];
    this.mirrorDecoys = [];
    this.particles = [];
    this.lightningEffects = [];
    this.toxicClouds = [];
    this.gravityWells = [];
    this.time = 0;
    this.winner = null;
    this.koLoser = null;
    this.koTimer = 0;
    this.lastMatchSummary = null;
    this.stasisTimer = 0;
    this.shake = 0;
  }

  getTargetPointFor(_attacker: Fighter, enemy: Fighter, leadTime = 0): { position: Vec2; radius: number; isDecoy: boolean } {
    const decoys = this.mirrorDecoys.filter((decoy) => decoy.active && decoy.owner === enemy);
    const totalWeight = BALANCE.mirror.realTargetWeight + decoys.length * BALANCE.mirror.decoyTargetWeight;
    let roll = Math.random() * totalWeight;

    if (roll < BALANCE.mirror.realTargetWeight || decoys.length === 0) {
      return {
        position: {
          x: enemy.position.x + enemy.velocity.x * leadTime,
          y: enemy.position.y + enemy.velocity.y * leadTime
        },
        radius: enemy.radius,
        isDecoy: false
      };
    }

    roll -= BALANCE.mirror.realTargetWeight;
    const decoy = decoys[Math.min(decoys.length - 1, Math.floor(roll / BALANCE.mirror.decoyTargetWeight))];
    return {
      position: {
        x: decoy.position.x + decoy.velocity.x * leadTime,
        y: decoy.position.y + decoy.velocity.y * leadTime
      },
      radius: decoy.radius,
      isDecoy: true
    };
  }

  tryAbsorbSingleTargetAbility(attacker: Fighter, enemy: Fighter, color: string): boolean {
    const target = this.getTargetPointFor(attacker, enemy);
    if (!target.isDecoy) {
      return false;
    }

    const decoy = this.mirrorDecoys
      .filter((candidate) => candidate.active && candidate.owner === enemy)
      .sort((a, b) => distance(a.position, target.position) - distance(b.position, target.position))[0];
    if (!decoy) {
      return false;
    }

    decoy.absorbHit(this, attacker, color);
    return true;
  }

  tryMirrorDecoyProjectileHit(projectile: Projectile): boolean {
    for (const decoy of this.mirrorDecoys) {
      if (!decoy.active || decoy.owner === projectile.owner) {
        continue;
      }

      if (circleOverlap(projectile.position, projectile.radius, decoy.position, decoy.radius)) {
        decoy.absorbHit(this, projectile.owner, projectile.secondaryColor);
        return true;
      }
    }

    return false;
  }

  tryMagnetProjectileBlock(projectile: Projectile, target: Fighter): boolean {
    if (target.classDef.id !== "magnet" || projectile.owner === target) {
      return false;
    }

    if (!consumeOrbitShard(target)) {
      return false;
    }

    this.spawnAbilityText("BLOCK", target.classDef.secondaryColor, target.position);
    this.spawnMagnetSpark(projectile.position, target.classDef.secondaryColor);
    return true;
  }

  spawnHitEffect(position: Vec2, color: string, amount: number): void {
    if (this.isFastSimulation) {
      return;
    }

    burstParticles(this.particles, position, color, 10, 70, 260, "spark");
    burstParticles(this.particles, position, "rgba(20,20,26,0.32)", 3, 30, 90, "circle");
    this.particles.push(
      new Particle({
        position: { x: position.x, y: position.y - 28 },
        velocity: { x: randomRange(-24, 24), y: -72 },
        life: 0.72,
        color: "#ffffff",
        size: 18,
        kind: "damageText",
        text: `-${Math.round(amount)}`
      })
    );
  }

  spawnHealEffect(position: Vec2, amount: number, color: string): void {
    if (this.isFastSimulation || amount <= 0) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x + randomRange(-14, 14), y: position.y - 42 },
        velocity: { x: randomRange(-14, 14), y: -54 },
        life: 0.62,
        color,
        size: 16,
        kind: "damageText",
        text: `+${amount.toFixed(1)}`
      })
    );
  }

  spawnWallImpact(position: Vec2, normal: Vec2, color: string, impactSpeed: number): void {
    if (this.isFastSimulation) {
      return;
    }

    this.debugWallHit = {
      point: { x: position.x, y: position.y },
      normal: { x: normal.x, y: normal.y },
      wall: wallNameFromNormal(normal),
      timer: 0.18
    };

    if (impactSpeed < 80) {
      return;
    }

    const count = clamp(Math.floor(impactSpeed / 90), 2, 7);
    for (let i = 0; i < count; i += 1) {
      this.particles.push(
        new Particle({
          position,
          velocity: {
            x: normal.x * randomRange(50, 130) + randomRange(-35, 35),
            y: normal.y * randomRange(50, 130) + randomRange(-35, 35)
          },
          life: randomRange(0.18, 0.34),
          color,
          size: randomRange(6, 12),
          kind: "spark",
          rotation: randomRange(0, TAU)
        })
      );
    }

    this.addShake(Math.min(3.2, impactSpeed / 170));
  }

  spawnCollisionImpact(position: Vec2, normal: Vec2, impactSpeed: number): void {
    if (this.isFastSimulation) {
      return;
    }

    const color = impactSpeed > 320 ? "#ffffff" : "rgba(25,25,34,0.45)";
    burstParticles(this.particles, position, color, impactSpeed > 320 ? 8 : 4, 45, 160, "spark");
    this.particles.push(
      new Particle({
        position,
        velocity: { x: normal.x * 38, y: normal.y * 38 },
        life: 0.28,
        color: "rgba(20,20,26,0.35)",
        size: 26,
        kind: "circle"
      })
    );
    this.addShake(Math.min(5, impactSpeed / 120));
  }

  spawnSlashBurst(position: Vec2, angle: number): void {
    if (this.isFastSimulation) {
      return;
    }

    for (let i = 0; i < 5; i += 1) {
      this.particles.push(
        new Particle({
          position,
          velocity: fromAngle(angle + randomRange(-1.2, 1.2), randomRange(60, 190)),
          life: randomRange(0.24, 0.42),
          color: i % 2 === 0 ? "#d7ff55" : "#ffffff",
          size: randomRange(30, 54),
          kind: "slash",
          rotation: angle + randomRange(-0.6, 0.6)
        })
      );
    }
  }

  spawnTimeDust(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x + randomRange(-28, 28), y: position.y + randomRange(-28, 28) },
        velocity: fromAngle(randomRange(0, TAU), randomRange(18, 64)),
        life: randomRange(0.28, 0.55),
        color,
        size: randomRange(5, 10),
        kind: "shard",
        rotation: randomRange(0, TAU)
      })
    );
  }

  spawnBladeSpark(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x + randomRange(-30, 30), y: position.y + randomRange(-30, 30) },
        velocity: fromAngle(randomRange(0, TAU), randomRange(20, 80)),
        life: randomRange(0.18, 0.36),
        color,
        size: randomRange(8, 16),
        kind: "spark",
        rotation: randomRange(0, TAU)
      })
    );
  }

  spawnFireSpark(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x + randomRange(-24, 24), y: position.y + randomRange(-24, 24) },
        velocity: fromAngle(randomRange(0, TAU), randomRange(30, 120)),
        life: randomRange(0.22, 0.46),
        color,
        size: randomRange(8, 18),
        kind: Math.random() < 0.35 ? "circle" : "spark",
        rotation: randomRange(0, TAU)
      })
    );
  }

  spawnPoisonSpark(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x + randomRange(-28, 28), y: position.y + randomRange(-28, 28) },
        velocity: fromAngle(randomRange(0, TAU), randomRange(18, 92)),
        life: randomRange(0.24, 0.58),
        color,
        size: randomRange(7, 17),
        kind: Math.random() < 0.55 ? "circle" : "spark",
        rotation: randomRange(0, TAU)
      })
    );
  }

  spawnGravitySpark(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x + randomRange(-26, 26), y: position.y + randomRange(-26, 26) },
        velocity: fromAngle(randomRange(0, TAU), randomRange(20, 105)),
        life: randomRange(0.22, 0.5),
        color,
        size: randomRange(7, 16),
        kind: Math.random() < 0.45 ? "circle" : "spark",
        rotation: randomRange(0, TAU)
      })
    );
  }

  spawnVampireSpark(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x + randomRange(-26, 26), y: position.y + randomRange(-26, 26) },
        velocity: fromAngle(randomRange(0, TAU), randomRange(18, 96)),
        life: randomRange(0.22, 0.5),
        color,
        size: randomRange(7, 17),
        kind: Math.random() < 0.42 ? "circle" : "spark",
        rotation: randomRange(0, TAU)
      })
    );
  }

  spawnMirrorSpark(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x + randomRange(-24, 24), y: position.y + randomRange(-24, 24) },
        velocity: fromAngle(randomRange(0, TAU), randomRange(24, 110)),
        life: randomRange(0.18, 0.42),
        color,
        size: randomRange(6, 14),
        kind: Math.random() < 0.5 ? "shard" : "spark",
        rotation: randomRange(0, TAU)
      })
    );
  }

  spawnMirrorShatter(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    burstParticles(this.particles, position, color, 12, 70, 230, "shard");
    burstParticles(this.particles, position, "rgba(255,255,255,0.56)", 5, 40, 130, "spark");
  }

  spawnMirrorShatterShots(owner: Fighter, target: Fighter, position: Vec2): void {
    const count = BALANCE.mirror.shatterShotCount;
    const centerAngle = angleTo(position, target.position);
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * BALANCE.mirror.shatterShotSpread;
      const angle = centerAngle + offset + randomRange(-0.04, 0.04);
      this.projectiles.push(
        new Projectile({
          owner,
          position,
          velocity: fromAngle(angle, BALANCE.mirror.shatterShotSpeed),
          radius: 9,
          damage: BALANCE.mirror.shatterShotDamage * owner.runModifiers.mirrorShatterDamageMultiplier,
          color: "#f7fdff",
          secondaryColor: owner.classDef.secondaryColor,
          life: 1.15,
          kind: "shatterShot",
          damageKind: "counter"
        })
      );
    }
  }

  spawnMirrorEmergencyDecoy(owner: Fighter): void {
    const angle = angleTo({ x: 0, y: 0 }, owner.velocity) + Math.PI * 0.7 + randomRange(-0.25, 0.25);
    const position = {
      x: clamp(owner.position.x + Math.cos(angle) * 42, this.arenaInner.x + owner.radius, this.arenaInner.x + this.arenaInner.w - owner.radius),
      y: clamp(owner.position.y + Math.sin(angle) * 42, this.arenaInner.y + owner.radius, this.arenaInner.y + this.arenaInner.h - owner.radius)
    };
    this.mirrorDecoys.push(
      new MirrorDecoy({
        owner,
        position,
        velocity: fromAngle(angle, BALANCE.mirror.decoySpeed * 1.08),
        radius: owner.radius * 0.9,
        duration: BALANCE.mirror.phaseReflectionDecoyDuration * owner.runModifiers.abilityDurationMultiplier,
        absorbHits: BALANCE.mirror.decoyAbsorbHits
      })
    );
    owner.stats.decoysCreated += 1;
    this.spawnMirrorSpark(position, owner.classDef.secondaryColor);
  }

  spawnMagnetSpark(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x + randomRange(-22, 22), y: position.y + randomRange(-22, 22) },
        velocity: fromAngle(randomRange(0, TAU), randomRange(42, 150)),
        life: randomRange(0.16, 0.38),
        color,
        size: randomRange(7, 15),
        kind: Math.random() < 0.58 ? "spark" : "shard",
        rotation: randomRange(0, TAU)
      })
    );
  }

  spawnReaperSpark(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x + randomRange(-24, 24), y: position.y + randomRange(-24, 24) },
        velocity: fromAngle(randomRange(0, TAU), randomRange(18, 105)),
        life: randomRange(0.22, 0.52),
        color,
        size: randomRange(7, 16),
        kind: Math.random() < 0.58 ? "shard" : "spark",
        rotation: randomRange(0, TAU)
      })
    );
  }

  spawnRicochetSpark(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    burstParticles(this.particles, position, color, 5, 44, 150, "spark");
    this.particles.push(
      new Particle({
        position: { x: position.x, y: position.y },
        velocity: fromAngle(randomRange(0, TAU), randomRange(36, 120)),
        life: 0.24,
        color: "#ff9d36",
        size: 12,
        kind: "shard",
        rotation: randomRange(0, TAU)
      })
    );
  }

  spawnCrusherSpark(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x + randomRange(-28, 28), y: position.y + randomRange(-28, 28) },
        velocity: fromAngle(randomRange(0, TAU), randomRange(18, 92)),
        life: randomRange(0.22, 0.48),
        color,
        size: randomRange(8, 18),
        kind: Math.random() < 0.55 ? "shard" : "spark",
        rotation: randomRange(0, TAU)
      })
    );
  }

  spawnCrusherImpact(position: Vec2, normal: Vec2, impactSpeed: number, active: boolean): void {
    if (this.isFastSimulation) {
      return;
    }

    const dustCount = impactSpeed > 360 ? 13 : 8;
    burstParticles(this.particles, position, active ? "#ffb35f" : "#6c737d", dustCount, 55, 210, "shard");
    burstParticles(this.particles, position, "rgba(44, 40, 36, 0.42)", 5, 30, 110, "circle");
    this.particles.push(
      new Particle({
        position,
        velocity: { x: normal.x * 48, y: normal.y * 48 },
        life: 0.36,
        color: active ? "rgba(255, 138, 49, 0.45)" : "rgba(33, 34, 38, 0.35)",
        size: active ? 44 : 34,
        kind: "circle"
      })
    );
  }

  spawnSpikeSpark(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x + randomRange(-26, 26), y: position.y + randomRange(-26, 26) },
        velocity: fromAngle(randomRange(0, TAU), randomRange(36, 140)),
        life: randomRange(0.16, 0.36),
        color,
        size: randomRange(9, 19),
        kind: Math.random() < 0.7 ? "shard" : "spark",
        rotation: randomRange(0, TAU)
      })
    );
  }

  spawnMonkSpark(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x + randomRange(-24, 24), y: position.y + randomRange(-24, 24) },
        velocity: fromAngle(randomRange(0, TAU), randomRange(24, 105)),
        life: randomRange(0.2, 0.42),
        color,
        size: randomRange(8, 17),
        kind: Math.random() < 0.45 ? "circle" : "spark",
        rotation: randomRange(0, TAU)
      })
    );
  }

  spawnPalmBurstEffect(position: Vec2, radius: number, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    burstParticles(this.particles, position, color, 10, 65, 210, "spark");
    this.particles.push(
      new Particle({
        position,
        velocity: { x: 0, y: 0 },
        life: 0.34,
        color: "rgba(255, 224, 138, 0.72)",
        size: radius,
        kind: "circle"
      })
    );
    this.addShake(4);
  }

  spawnMirrorDecoys(owner: Fighter): void {
    this.mirrorDecoys = this.mirrorDecoys.filter((decoy) => decoy.active && decoy.owner !== owner);
    const count = BALANCE.mirror.decoyCount + owner.runModifiers.mirrorDecoyCountBonus;
    const duration = (BALANCE.mirror.decoyDuration + owner.runModifiers.mirrorDecoyDurationBonus) * owner.runModifiers.abilityDurationMultiplier;
    const speed = BALANCE.mirror.decoySpeed * owner.runModifiers.mirrorDecoySpeedMultiplier;
    for (let i = 0; i < count; i += 1) {
      const angle = angleTo({ x: 0, y: 0 }, owner.velocity) + (i - (count - 1) / 2) * 1.05 + randomRange(-0.2, 0.2);
      const position = {
        x: clamp(owner.position.x + Math.cos(angle + Math.PI * 0.65) * 42, this.arenaInner.x + owner.radius, this.arenaInner.x + this.arenaInner.w - owner.radius),
        y: clamp(owner.position.y + Math.sin(angle + Math.PI * 0.65) * 42, this.arenaInner.y + owner.radius, this.arenaInner.y + this.arenaInner.h - owner.radius)
      };
      this.mirrorDecoys.push(
        new MirrorDecoy({
          owner,
          position,
          velocity: fromAngle(angle, speed),
          radius: owner.radius * 0.92,
          duration,
          absorbHits: BALANCE.mirror.decoyAbsorbHits
        })
      );
      owner.stats.decoysCreated += 1;
      this.spawnMirrorSpark(position, owner.classDef.secondaryColor);
    }
  }

  spawnToxicCloud(
    owner: Fighter,
    position: Vec2,
    options: {
      radius: number;
      duration: number;
      tickInterval: number;
      directDamage: number;
      poisonStacks: number;
      poisonDuration: number;
    }
  ): void {
    this.toxicClouds.push({
      owner,
      position: { x: position.x, y: position.y },
      radius: options.radius,
      duration: options.duration,
      maxDuration: options.duration,
      tickInterval: options.tickInterval,
      tickTimer: 0,
      directDamage: options.directDamage,
      poisonStacks: options.poisonStacks,
      poisonDuration: options.poisonDuration
    });
  }

  spawnGravityWell(
    owner: Fighter,
    position: Vec2,
    options: {
      radius: number;
      duration: number;
      speedMultiplier: number;
      abilityChargeMultiplier: number;
      restitutionMultiplier: number;
    }
  ): void {
    this.gravityWells = this.gravityWells.filter((well) => well.owner !== owner);
    this.gravityWells.push({
      owner,
      position: { x: position.x, y: position.y },
      radius: options.radius,
      duration: options.duration,
      maxDuration: options.duration,
      speedMultiplier: options.speedMultiplier,
      abilityChargeMultiplier: options.abilityChargeMultiplier,
      restitutionMultiplier: options.restitutionMultiplier,
      enemyInside: false,
      lastDistance: Number.POSITIVE_INFINITY
    });
  }

  spawnThunderSpark(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x + randomRange(-26, 26), y: position.y + randomRange(-26, 26) },
        velocity: fromAngle(randomRange(0, TAU), randomRange(70, 210)),
        life: randomRange(0.14, 0.32),
        color,
        size: randomRange(8, 16),
        kind: "spark",
        rotation: randomRange(0, TAU)
      })
    );
  }

  spawnLightningChainEffect(from: Vec2, to: Vec2, color: string, secondaryColor: string): void {
    if (this.isFastSimulation) {
      return;
    }

    this.lightningEffects.push({
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      color,
      secondaryColor,
      life: 0.16,
      maxLife: 0.16
    });
    this.addShake(2.8);
  }

  spawnFlameBurstEffect(position: Vec2, radius: number, hit: boolean): void {
    if (this.isFastSimulation) {
      return;
    }

    burstParticles(this.particles, position, "#ff8a31", hit ? 22 : 14, 90, 300, "spark");
    burstParticles(this.particles, position, "#ffd166", hit ? 10 : 6, 50, 190, "circle");
    this.particles.push(
      new Particle({
        position,
        velocity: { x: 0, y: 0 },
        life: 0.52,
        color: "rgba(255, 99, 45, 0.78)",
        size: radius,
        kind: "circle"
      })
    );
    if (hit) {
      this.addShake(5.5);
    }
  }

  spawnBombExplosion(position: Vec2, radius: number, hit: boolean): void {
    if (this.isFastSimulation) {
      return;
    }

    burstParticles(this.particles, position, "#ff8a31", hit ? 20 : 13, 85, 285, "spark");
    burstParticles(this.particles, position, "rgba(42, 38, 38, 0.55)", hit ? 8 : 5, 35, 120, "circle");
    this.particles.push(
      new Particle({
        position,
        velocity: { x: 0, y: 0 },
        life: 0.46,
        color: "rgba(255, 110, 34, 0.78)",
        size: radius,
        kind: "circle"
      })
    );
    if (hit) {
      this.addShake(5);
    }
  }

  spawnShieldSpark(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x + randomRange(-28, 28), y: position.y + randomRange(-28, 28) },
        velocity: fromAngle(randomRange(0, TAU), randomRange(24, 96)),
        life: randomRange(0.18, 0.34),
        color,
        size: randomRange(7, 14),
        kind: "spark",
        rotation: randomRange(0, TAU)
      })
    );
  }

  spawnShieldCounterEffect(position: Vec2, color: string): void {
    if (this.isFastSimulation) {
      return;
    }

    burstParticles(this.particles, position, color, 12, 90, 240, "spark");
    this.particles.push(
      new Particle({
        position,
        velocity: { x: 0, y: 0 },
        life: 0.42,
        color: "rgba(255, 232, 134, 0.75)",
        size: 68,
        kind: "circle"
      })
    );
    this.addShake(4.5);
  }

  spawnAbilityText(text: string, color: string, position: Vec2): void {
    if (this.isFastSimulation) {
      return;
    }

    this.particles.push(
      new Particle({
        position: { x: position.x, y: position.y - 72 },
        velocity: { x: 0, y: -48 },
        life: 0.78,
        color,
        size: 24,
        kind: "damageText",
        text
      })
    );
  }

  addShake(amount: number): void {
    if (this.isFastSimulation) {
      return;
    }

    this.shake = Math.max(this.shake, amount);
  }

  private createFighters(): [Fighter, Fighter] {
    const fighterAClass = getFighterClass(this.selectedClassIds[0]);
    const fighterBClass = getFighterClass(this.selectedClassIds[1]);
    const fighterA = new Fighter("left", fighterAClass, {
      x: this.arena.x + this.arena.w * 0.3,
      y: this.arena.y + this.arena.h * 0.35
    });
    const fighterB = new Fighter("right", fighterBClass, {
      x: this.arena.x + this.arena.w * 0.7,
      y: this.arena.y + this.arena.h * 0.65
    });

    fighterA.setVelocity(makeVelocity(1, 0.65, fighterA.targetMoveSpeed), "spawn");
    fighterB.setVelocity(makeVelocity(-1, -0.55, fighterB.targetMoveSpeed), "spawn");

    if (this.selectedMode === "league" && this.leagueRun?.phase === "battle" && !this.isFastSimulation) {
      fighterA.runModifiers = cloneLeaguePlayerModifiers(this.leagueRun);
      fighterB.runModifiers = { ...this.leagueRun.opponentModifiers };
      fighterA.normalizeToTargetSpeed("spawn");
      fighterB.normalizeToTargetSpeed("spawn");
    }

    return [fighterA, fighterB];
  }

  private createPhysicsTestFighters(): [Fighter, Fighter] {
    const bounds = this.arenaInner;
    const chrono = new Fighter("left", getFighterClass(ChronoClass.id), {
      x: bounds.x + bounds.w * 0.34,
      y: bounds.y + bounds.h * 0.48
    });
    const blade = new Fighter("right", getFighterClass(BladeClass.id), {
      x: bounds.x + bounds.w * 0.66,
      y: bounds.y + bounds.h * 0.52
    });

    chrono.setVelocity(makeVelocity(1, 0.72, chrono.targetMoveSpeed), "spawn");
    blade.setVelocity(makeVelocity(-1, -0.62, blade.targetMoveSpeed), "spawn");
    chrono.hp = chrono.maxHP;
    blade.hp = blade.maxHP;
    return [chrono, blade];
  }

  private loop(frameTime: number): void {
    const rawDt = clamp((frameTime - this.lastFrame) / 1000, 0, 0.1);
    this.lastFrame = frameTime;
    this.fps = this.fps * 0.9 + (1 / Math.max(rawDt, 0.001)) * 0.1;

    if (!this.paused) {
      this.accumulator = Math.min(this.accumulator + rawDt, this.fixedDt * 5);
      while (this.accumulator >= this.fixedDt) {
        this.updatePhysics(this.fixedDt);
        this.accumulator -= this.fixedDt;
      }
    }
    this.draw();
    requestAnimationFrame((time) => this.loop(time));
  }

  private updatePhysics(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 18);

    if (this.gameState !== "ko-freeze") {
      this.time += dt;
    }
    this.stasisTimer = Math.max(0, this.stasisTimer - dt);
    this.debugCollisionTimer = Math.max(0, this.debugCollisionTimer - dt);
    if (this.debugWallHit) {
      this.debugWallHit.timer -= dt;
      if (this.debugWallHit.timer <= 0) {
        this.debugWallHit = null;
      }
    }
    if (this.debugCollisionTimer <= 0) {
      this.debugCollisionNormal = null;
    }

    if (this.gameState === "ko-freeze") {
      this.koTimer = Math.max(0, this.koTimer - dt);
      if (this.koTimer <= 0) {
        this.finishKoFreeze();
      }
    }

    if (this.gameState === "battle" && !this.winner) {
      this.fighters[0].update(dt, this, this.fighters[1]);
      this.fighters[1].update(dt, this, this.fighters[0]);
      this.resolveFighterCollision();

      if (this.physicsTestMode) {
        this.projectiles = [];
        this.bombs = [];
        this.mirrorDecoys = [];
      } else {
        this.updateToxicClouds(dt);
        this.updateGravityWells(dt);
        for (const decoy of this.mirrorDecoys) {
          decoy.update(dt, this);
        }
        this.mirrorDecoys = this.mirrorDecoys.filter((decoy) => decoy.active);
        for (const bomb of this.bombs) {
          bomb.update(dt, this);
        }
        this.bombs = this.bombs.filter((bomb) => !bomb.exploded);
        for (const projectile of this.projectiles) {
          projectile.update(dt, this);
        }
        this.projectiles = this.projectiles.filter((projectile) => !projectile.remove);
      }

      if (!this.physicsTestMode) {
        const defeatedFighters = this.fighters.filter((fighter) => fighter.defeated);
        const defeated = defeatedFighters[0];
        if (defeated) {
          const winner = defeatedFighters.length > 1
            ? this.fighters.reduce((best, fighter) => (fighter.stats.damageDealt > best.stats.damageDealt ? fighter : best), this.fighters[0])
            : this.getEnemyOf(defeated);
          if (this.isFastSimulation) {
            this.finishBattle(winner, this.getEnemyOf(winner));
          } else {
            this.beginKoFreeze(winner, this.getEnemyOf(winner));
          }
        }
      }
    }

    for (const particle of this.particles) {
      particle.update(dt);
    }
    this.particles = this.particles.filter((particle) => particle.alive);
    for (const lightning of this.lightningEffects) {
      lightning.life -= dt;
    }
    this.lightningEffects = this.lightningEffects.filter((lightning) => lightning.life > 0);
  }

  private updateToxicClouds(dt: number): void {
    for (const cloud of this.toxicClouds) {
      cloud.duration -= dt;
      cloud.tickTimer -= dt;
      if (!this.isFastSimulation && Math.random() < dt * 8) {
        this.spawnPoisonSpark(
          {
            x: cloud.position.x + randomRange(-cloud.radius * 0.7, cloud.radius * 0.7),
            y: cloud.position.y + randomRange(-cloud.radius * 0.7, cloud.radius * 0.7)
          },
          "rgba(158, 255, 88, 0.72)"
        );
      }

      if (cloud.tickTimer > 0 || cloud.owner.defeated) {
        continue;
      }

      cloud.tickTimer = cloud.tickInterval;
      const enemy = this.getEnemyOf(cloud.owner);
      if (enemy.defeated || distance(enemy.position, cloud.position) > cloud.radius + enemy.radius) {
        continue;
      }

      enemy.takeDamage(cloud.directDamage, cloud.owner, this, {
        hitColor: "#9eff58",
        ignoreCooldown: true,
        damageKind: "poison"
      });
      applyPoison(enemy, cloud.owner, {
        damagePerSecond: BALANCE.poison.poisonDamagePerSecond,
        duration: cloud.poisonDuration,
        stacks: cloud.poisonStacks,
        maxStacks: BALANCE.poison.maxPoisonStacks
      });
      this.spawnPoisonSpark(enemy.position, "#9eff58");
    }

    this.toxicClouds = this.toxicClouds.filter((cloud) => cloud.duration > 0 && !cloud.owner.defeated);
  }

  private updateGravityWells(dt: number): void {
    for (const well of this.gravityWells) {
      well.duration -= dt;
      if (!this.isFastSimulation && Math.random() < dt * 9) {
        const angle = randomRange(0, TAU);
        const radius = randomRange(8, well.radius * 0.85);
        this.spawnGravitySpark(
          {
            x: well.position.x + Math.cos(angle) * radius,
            y: well.position.y + Math.sin(angle) * radius
          },
          "rgba(189, 164, 255, 0.76)"
        );
      }

      if (well.owner.defeated) {
        continue;
      }

      const enemy = this.getEnemyOf(well.owner);
      well.lastDistance = enemy.defeated ? Number.POSITIVE_INFINITY : distance(enemy.position, well.position);
      const enemyInside = !enemy.defeated && well.lastDistance <= well.radius + enemy.radius;
      well.enemyInside = enemyInside;
      if (!enemyInside) {
        continue;
      }

      const wasAlreadySuppressed = enemy.statusEffects.some((effect) => effect.type === "gravity-well" && effect.source === well.owner);
      applyGravityStatus(enemy, well.owner, {
        type: "gravity-well",
        duration: Math.max(0.24, this.fixedDt * 4),
        speedMultiplier: well.speedMultiplier,
        abilityChargeMultiplier: well.abilityChargeMultiplier,
        restitutionMultiplier: well.restitutionMultiplier
      });
      enemy.normalizeToTargetSpeed("status-speed-only");

      if (!wasAlreadySuppressed) {
        this.spawnAbilityText("GRAVITY", well.owner.classDef.secondaryColor, enemy.position);
      }

    }

    this.gravityWells = this.gravityWells.filter((well) => well.duration > 0 && !well.owner.defeated);
  }

  private resolveFighterCollision(): void {
    const [a, b] = this.fighters;
    const collision = resolveCircleCollision(a, b, MOVEMENT.ballRestitution);
    if (!collision.collided) {
      return;
    }

    a.stats.fighterCollisions += 1;
    b.stats.fighterCollisions += 1;
    this.debugCollisionNormal = collision;
    this.debugCollisionTimer = 0.22;
    a.normalizeToTargetSpeed("fighter-collision");
    b.normalizeToTargetSpeed("fighter-collision");
    if (collision.impactSpeed > 120) {
      this.spawnCollisionImpact(collision.point, collision.normal, collision.impactSpeed);
    }

    if (!this.physicsTestMode) {
      this.applyContactDamage(a, b, collision);
      this.applyContactDamage(b, a, collision);

      if (
        collision.impactSpeed > MOVEMENT.collisionDamageMinSpeed &&
        a.collisionDamageCooldown <= 0 &&
        b.collisionDamageCooldown <= 0
      ) {
        const t = clamp(
          (collision.impactSpeed - MOVEMENT.collisionDamageMinSpeed) /
            (MOVEMENT.collisionDamageMaxSpeed - MOVEMENT.collisionDamageMinSpeed),
          0,
          1
        );
        const damage = MOVEMENT.collisionDamageMin + (MOVEMENT.collisionDamageMax - MOVEMENT.collisionDamageMin) * t;
        a.takeDamage(damage, b, this, { knockback: 0, hitColor: b.classDef.secondaryColor, damageKind: "collision" });
        b.takeDamage(damage, a, this, { knockback: 0, hitColor: a.classDef.secondaryColor, damageKind: "collision" });
        a.collisionDamageCooldown = MOVEMENT.collisionDamageCooldown;
        b.collisionDamageCooldown = MOVEMENT.collisionDamageCooldown;
      }
    }

    const aWall = a.applyWallBounce(this.arenaInner, 0, this);
    const bWall = b.applyWallBounce(this.arenaInner, 0, this);
    if (aWall.hit) {
      this.spawnWallImpact(aWall.point, aWall.normal, a.classDef.primaryColor, aWall.impactSpeed);
    }
    if (bWall.hit) {
      this.spawnWallImpact(bWall.point, bWall.normal, b.classDef.primaryColor, bWall.impactSpeed);
    }
  }

  private applyContactDamage(attacker: Fighter, defender: Fighter, collision: CircleCollisionResult): void {
    const baseContactDamage = attacker.classDef.contactDamage ?? 0;
    const contactResult =
      baseContactDamage > 0
        ? (attacker.classDef.getContactDamage?.({
            game: this,
            self: attacker,
            enemy: defender,
            dt: 0,
            collision,
            baseDamage: baseContactDamage
          }) ?? { damage: baseContactDamage })
        : { damage: 0 };
    const contactDamage = contactResult.damage;
    if (contactDamage > 0 && attacker.contactCooldown <= 0) {
      const hpBefore = defender.hp;
      const hit = defender.takeDamage(contactDamage, attacker, this, {
        knockback: 0,
        hitColor: attacker.classDef.secondaryColor,
        ignoreCooldown: true,
        damageKind: "contact"
      });
      if (hit && attacker.classDef.id === "crusher") {
        attacker.stats.crusherContactHits += 1;
        attacker.stats.impactBonusDamage += contactResult.bonusDamage ?? 0;
        if (contactResult.highImpact) {
          attacker.stats.highImpactHits += 1;
          this.spawnAbilityText("CRUSH", attacker.classDef.secondaryColor, collision.point);
        }
        this.spawnCrusherImpact(
          collision.point,
          collision.normal,
          collision.impactSpeed,
          Number(attacker.customState.crushingForceTimer ?? 0) > 0
        );
      }
      if (hit && attacker.classDef.id === "spike") {
        attacker.stats.spikeContactHits += 1;
        attacker.stats.spikeArmorDamageBonus += contactResult.bonusDamage ?? 0;
        this.spawnSpikeSpark(collision.point, attacker.classDef.secondaryColor);
        if (contactResult.highImpact) {
          this.spawnAbilityText("SPIKE CHARGE", attacker.classDef.secondaryColor, collision.point);
        }
      }
      if (hit && attacker.classDef.id === "monk") {
        attacker.stats.monkContactHits += 1;
        attacker.stats.comboBonusDamage += contactResult.bonusDamage ?? 0;
        addMonkCombo(attacker);
        this.spawnMonkSpark(collision.point, attacker.classDef.secondaryColor);
        if (contactResult.highImpact) {
          this.spawnAbilityText("COMBO MAX", attacker.classDef.secondaryColor, attacker.position);
        }
      }
      if (hit && attacker.classDef.id === "berserker") {
        const dealt = Math.max(0, hpBefore - defender.hp);
        attacker.stats.berserkerContactHits += 1;
        attacker.stats.rageBonusDamage += contactResult.bonusDamage ?? 0;
        if (attacker.hp <= 50) {
          attacker.stats.lowHpDamageDealt += dealt;
        }
        this.spawnSpikeSpark(collision.point, attacker.classDef.secondaryColor);
        if (contactResult.highImpact) {
          this.spawnAbilityText("RAGE HIT", attacker.classDef.secondaryColor, collision.point);
        }
      }
      if (hit && attacker.classDef.id === "drill") {
        attacker.stats.drillContactHits += 1;
        attacker.stats.pierceDamageBonus += contactResult.bonusDamage ?? 0;
        this.spawnCrusherSpark(collision.point, attacker.classDef.secondaryColor);
        if (contactResult.highImpact) {
          this.spawnAbilityText("DRILL HIT", attacker.classDef.secondaryColor, collision.point);
        }
      }
      if (hit && attacker.classDef.id === "ninja") {
        attacker.stats.ninjaContactHits += 1;
        this.spawnSpikeSpark(collision.point, attacker.classDef.secondaryColor);
        if (contactResult.highImpact) {
          this.spawnAbilityText("SHADOW STRIKE", attacker.classDef.secondaryColor, collision.point);
        }
      }
      if (hit && attacker.classDef.id === "blade") {
        this.spawnSlashBurst(collision.point, Math.atan2(collision.normal.y, collision.normal.x));
      }
      attacker.contactCooldown =
        attacker.classDef.getContactCooldown?.({ game: this, self: attacker, enemy: defender, dt: 0 }) ??
        attacker.classDef.contactDamageCooldown ??
        BALANCE.blade.contactDamageCooldown;
    }

    if (
      attacker.classDef.id === "blade" &&
      attacker.customState.bladeDashTimer &&
      !attacker.customState.bladeDashHit
    ) {
      defender.takeDamage(attacker.classDef.dashDamage ?? BALANCE.blade.dashDamage, attacker, this, {
        knockback: 0,
        hitColor: attacker.classDef.secondaryColor,
        ignoreCooldown: true,
        damageKind: "dash"
      });
      attacker.customState.bladeDashHit = true;
      attacker.contactCooldown = Math.max(attacker.contactCooldown, BALANCE.blade.dashHitCooldown);
      this.spawnSlashBurst(collision.point, Math.atan2(collision.normal.y, collision.normal.x));
      this.addShake(7);
    }
  }

  private createMatchSummary(winner: Fighter, loser: Fighter): MatchSummary {
    return {
      winnerName: winner.classDef.displayName,
      loserName: loser.classDef.displayName,
      duration: this.time,
      winnerHp: winner.hp,
      fighters: [this.createFighterResult(this.fighters[0]), this.createFighterResult(this.fighters[1])]
    };
  }

  private createFighterResult(fighter: Fighter): FighterResultSummary {
    return {
      label: fighter.id === "left" ? "Fighter A" : "Fighter B",
      className: fighter.classDef.displayName,
      finalHp: fighter.hp,
      stats: cloneStats(fighter.stats)
    };
  }

  private runBalanceTest(matches: number): void {
    this.simulationMode = "fast";
    this.balanceTestResult = null;
    this.balanceTestResult = this.simulateMatchBatch(this.selectedClassIds, matches);

    this.projectiles = [];
    this.bombs = [];
    this.mirrorDecoys = [];
    this.particles = [];
    this.lightningEffects = [];
    this.toxicClouds = [];
    this.gravityWells = [];
    this.time = 0;
    this.winner = null;
    this.koLoser = null;
    this.koTimer = 0;
    this.lastMatchSummary = null;
    this.simulationMode = "visual";
    this.gameState = "balance-results";
  }

  private simulateMatchBatch(classIds: [string, string], matches: number): BalanceTestResult {
    const previousPhysicsTestMode = this.physicsTestMode;
    const previousClassIds: [string, string] = [this.selectedClassIds[0], this.selectedClassIds[1]];
    this.physicsTestMode = false;

    const wins: [number, number] = [0, 0];
    const totalHp: [number, number] = [0, 0];
    const stats: [FighterStats, FighterStats] = [createFighterStats(), createFighterStats()];
    let totalDuration = 0;
    let fastestWin = Number.POSITIVE_INFINITY;
    let longestMatch = 0;

    for (let matchIndex = 0; matchIndex < matches; matchIndex += 1) {
      const outcome = this.simulateSingleMatch(classIds);
      wins[outcome.winnerIndex] += 1;
      totalDuration += outcome.duration;
      fastestWin = Math.min(fastestWin, outcome.duration);
      longestMatch = Math.max(longestMatch, outcome.duration);
      totalHp[0] += outcome.remainingHp[0];
      totalHp[1] += outcome.remainingHp[1];
      addStats(stats[0], outcome.stats[0]);
      addStats(stats[1], outcome.stats[1]);
    }

    this.selectedClassIds = previousClassIds;
    this.physicsTestMode = previousPhysicsTestMode;

    return {
      classNames: [getFighterClass(classIds[0]).displayName, getFighterClass(classIds[1]).displayName],
      matches,
      wins,
      averageDuration: totalDuration / matches,
      averageRemainingHp: [totalHp[0] / matches, totalHp[1] / matches],
      fastestWin: fastestWin === Number.POSITIVE_INFINITY ? 0 : fastestWin,
      longestMatch,
      averageStats: [averageStats(stats[0], matches), averageStats(stats[1], matches)]
    };
  }

  private simulateSingleMatch(classIds: [string, string]): SimulatedMatchOutcome {
    this.selectedClassIds = [classIds[0], classIds[1]];
    this.fighters = this.createFighters();
    this.clearTransientBattleState();
    this.gameState = "battle";

    let steps = 0;
    const maxSteps = 90 * 60;
    while (this.gameState === "battle" && steps < maxSteps) {
      this.updatePhysics(this.fixedDt);
      steps += 1;
    }

    if (!this.winner) {
      const aHp = this.fighters[0].hp;
      const bHp = this.fighters[1].hp;
      this.winner = aHp >= bHp ? this.fighters[0] : this.fighters[1];
      const loser = this.getEnemyOf(this.winner);
      this.lastMatchSummary = this.createMatchSummary(this.winner, loser);
      this.koLoser = loser;
      this.gameState = "battle-ended";
    }

    return {
      winnerIndex: this.winner === this.fighters[0] ? 0 : 1,
      duration: this.time,
      remainingHp: [this.fighters[0].hp, this.fighters[1].hp],
      stats: [cloneStats(this.fighters[0].stats), cloneStats(this.fighters[1].stats)]
    };
  }

  private async simulateMatchBatchAsync(
    classIds: [string, string],
    matches: number,
    progressLabel: string,
    onProgress: () => void
  ): Promise<BalanceTestResult> {
    const wins: [number, number] = [0, 0];
    const totalHp: [number, number] = [0, 0];
    const stats: [FighterStats, FighterStats] = [createFighterStats(), createFighterStats()];
    let totalDuration = 0;
    let fastestWin = Number.POSITIVE_INFINITY;
    let longestMatch = 0;

    for (let matchIndex = 0; matchIndex < matches && !this.tournamentCancelRequested; matchIndex += 1) {
      const outcome = this.simulateSingleMatch(classIds);
      wins[outcome.winnerIndex] += 1;
      totalDuration += outcome.duration;
      fastestWin = Math.min(fastestWin, outcome.duration);
      longestMatch = Math.max(longestMatch, outcome.duration);
      totalHp[0] += outcome.remainingHp[0];
      totalHp[1] += outcome.remainingHp[1];
      addStats(stats[0], outcome.stats[0]);
      addStats(stats[1], outcome.stats[1]);

      if (this.tournamentProgress) {
        this.tournamentProgress.currentMatch += 1;
        this.tournamentProgress.currentLabel = progressLabel;
      }
      onProgress();

      if ((matchIndex + 1) % 12 === 0) {
        this.gameState = "tournament-running";
        await yieldToBrowser();
      }
    }

    const completedMatches = wins[0] + wins[1];
    const divisor = Math.max(1, completedMatches);
    return {
      classNames: [getFighterClass(classIds[0]).displayName, getFighterClass(classIds[1]).displayName],
      matches: completedMatches,
      wins,
      averageDuration: totalDuration / divisor,
      averageRemainingHp: [totalHp[0] / divisor, totalHp[1] / divisor],
      fastestWin: fastestWin === Number.POSITIVE_INFINITY ? 0 : fastestWin,
      longestMatch,
      averageStats: [averageStats(stats[0], divisor), averageStats(stats[1], divisor)]
    };
  }

  private async runTournamentTest(): Promise<void> {
    if (this.tournamentProgress?.active) {
      return;
    }

    const classIds = this.getTournamentClassIdsForCurrentMode();
    if (classIds.length < 2) {
      return;
    }

    const cells: Record<string, TournamentMatchupCell> = {};
    const totals = new Map(
      classIds.map((classId) => [
        classId,
        {
          wins: 0,
          losses: 0,
          duration: 0,
          batches: 0
        }
      ])
    );

    this.simulationMode = "fast";
    const previousPhysicsTestMode = this.physicsTestMode;
    const previousClassIds: [string, string] = [this.selectedClassIds[0], this.selectedClassIds[1]];
    this.physicsTestMode = false;
    this.tournamentResult = null;
    this.selectedTournamentCellKey = null;
    if (this.tournamentRunMode === "class") {
      this.selectedTournamentFocusClassId = this.focusedTournamentClassId;
    } else {
      this.selectedTournamentFocusClassId ??= classIds[0] ?? null;
    }
    if (this.selectedTournamentFocusClassId && !classIds.includes(this.selectedTournamentFocusClassId)) {
      this.selectedTournamentFocusClassId = classIds[0] ?? null;
    }
    this.showFullTournamentMatrix = false;
    this.tournamentCancelRequested = false;
    this.tournamentProgress = {
      active: true,
      cancelled: false,
      mode: this.tournamentRunMode,
      currentMatch: 0,
      totalMatches: this.getTournamentWorkload(classIds),
      currentLabel: "Preparing...",
      startedAt: performance.now()
    };
    this.gameState = "tournament-running";

    const noteProgress = () => {
      if (!this.tournamentProgress) {
        return;
      }
      this.tournamentProgress.cancelled = this.tournamentCancelRequested;
    };

    try {
      if (this.tournamentRunMode === "matchup") {
        const rowId = classIds[0];
        const columnId = classIds[1];
        const focused = await this.simulateMatchBatchAsync(
          [rowId, columnId],
          this.tournamentMatchesPerMatchup,
          `${shortClassName(getFighterClass(rowId).displayName)} vs ${shortClassName(getFighterClass(columnId).displayName)}`,
          noteProgress
        );
        if (!this.tournamentCancelRequested && focused.matches > 0) {
          const rowName = getFighterClass(rowId).displayName;
          const columnName = getFighterClass(columnId).displayName;
          cells[tournamentKey(rowId, columnId)] = createTournamentCell(
            rowId,
            columnId,
            rowName,
            columnName,
            focused.matches,
            focused.wins[0],
            focused.wins[1],
            focused.averageDuration,
            focused.averageRemainingHp,
            focused.averageStats,
            rowId === columnId
          );
          const rowTotal = totals.get(rowId);
          const columnTotal = totals.get(columnId);
          if (rowTotal) {
            rowTotal.wins += focused.wins[0];
            rowTotal.losses += focused.wins[1];
            rowTotal.duration += focused.averageDuration;
            rowTotal.batches += 1;
          }
          if (columnTotal) {
            columnTotal.wins += focused.wins[1];
            columnTotal.losses += focused.wins[0];
            columnTotal.duration += focused.averageDuration;
            columnTotal.batches += 1;
          }
        }
      } else if (this.tournamentRunMode === "class") {
        const focusId = this.focusedTournamentClassId;
        const focusName = getFighterClass(focusId).displayName;
        const opponents = this.getFocusedClassOpponentIds();
        if (this.tournamentIncludeMirrors) {
          const mirror = await this.simulateMatchBatchAsync(
            [focusId, focusId],
            this.tournamentMatchesPerMatchup,
            `${shortClassName(focusName)} mirror`,
            noteProgress
          );
          if (mirror.matches > 0) {
            cells[tournamentKey(focusId, focusId)] = createTournamentCell(
              focusId,
              focusId,
              focusName,
              focusName,
              mirror.matches,
              mirror.wins[0],
              mirror.wins[1],
              mirror.averageDuration,
              mirror.averageRemainingHp,
              mirror.averageStats,
              true
            );
          }
        }

        for (const opponentId of opponents) {
          if (this.tournamentCancelRequested) {
            break;
          }
          const opponentName = getFighterClass(opponentId).displayName;
          const focusShortName = shortClassName(focusName);
          const opponentShortName = shortClassName(opponentName);
          const forward = await this.simulateMatchBatchAsync(
            [focusId, opponentId],
            this.tournamentMatchesPerMatchup,
            `${focusShortName} vs ${opponentShortName}`,
            noteProgress
          );
          if (this.tournamentCancelRequested) {
            break;
          }
          const reverse = await this.simulateMatchBatchAsync(
            [opponentId, focusId],
            this.tournamentMatchesPerMatchup,
            `${opponentShortName} vs ${focusShortName}`,
            noteProgress
          );
          if (this.tournamentCancelRequested) {
            break;
          }

          const totalMatches = forward.matches + reverse.matches;
          if (totalMatches <= 0) {
            continue;
          }

          const focusWins = forward.wins[0] + reverse.wins[1];
          const opponentWins = forward.wins[1] + reverse.wins[0];
          const averageDuration =
            (forward.averageDuration * forward.matches + reverse.averageDuration * reverse.matches) / totalMatches;
          const focusHp =
            (forward.averageRemainingHp[0] * forward.matches + reverse.averageRemainingHp[1] * reverse.matches) /
            totalMatches;
          const opponentHp =
            (forward.averageRemainingHp[1] * forward.matches + reverse.averageRemainingHp[0] * reverse.matches) /
            totalMatches;

          const focusStats = createFighterStats();
          const opponentStats = createFighterStats();
          addScaledStats(focusStats, forward.averageStats[0], forward.matches);
          addScaledStats(focusStats, reverse.averageStats[1], reverse.matches);
          addScaledStats(opponentStats, forward.averageStats[1], forward.matches);
          addScaledStats(opponentStats, reverse.averageStats[0], reverse.matches);

          const focusAverageStats = averageStats(focusStats, totalMatches);
          const opponentAverageStats = averageStats(opponentStats, totalMatches);
          cells[tournamentKey(focusId, opponentId)] = createTournamentCell(
            focusId,
            opponentId,
            focusName,
            opponentName,
            totalMatches,
            focusWins,
            opponentWins,
            averageDuration,
            [focusHp, opponentHp],
            [focusAverageStats, opponentAverageStats],
            false
          );
          cells[tournamentKey(opponentId, focusId)] = createTournamentCell(
            opponentId,
            focusId,
            opponentName,
            focusName,
            totalMatches,
            opponentWins,
            focusWins,
            averageDuration,
            [opponentHp, focusHp],
            [opponentAverageStats, focusAverageStats],
            false
          );

          const focusTotal = totals.get(focusId);
          const opponentTotal = totals.get(opponentId);
          if (focusTotal && opponentTotal) {
            focusTotal.wins += focusWins;
            focusTotal.losses += opponentWins;
            focusTotal.duration += averageDuration;
            focusTotal.batches += 1;
            opponentTotal.wins += opponentWins;
            opponentTotal.losses += focusWins;
            opponentTotal.duration += averageDuration;
            opponentTotal.batches += 1;
          }
        }
      } else {
        for (let i = 0; i < classIds.length && !this.tournamentCancelRequested; i += 1) {
          for (let j = i; j < classIds.length && !this.tournamentCancelRequested; j += 1) {
            if (i === j && !this.tournamentIncludeMirrors) {
              continue;
            }

            const rowId = classIds[i];
            const columnId = classIds[j];
            const rowShortName = shortClassName(getFighterClass(rowId).displayName);
            const columnShortName = shortClassName(getFighterClass(columnId).displayName);

            if (rowId === columnId) {
              const mirror = await this.simulateMatchBatchAsync(
                [rowId, columnId],
                this.tournamentMatchesPerMatchup,
                `${rowShortName} mirror`,
                noteProgress
              );
              if (mirror.matches > 0) {
                cells[tournamentKey(rowId, columnId)] = createTournamentCell(
                  rowId,
                  columnId,
                  mirror.classNames[0],
                  mirror.classNames[1],
                  mirror.matches,
                  mirror.wins[0],
                  mirror.wins[1],
                  mirror.averageDuration,
                  mirror.averageRemainingHp,
                  mirror.averageStats,
                  true
                );
              }
              continue;
            }

            const forward = await this.simulateMatchBatchAsync(
              [rowId, columnId],
              this.tournamentMatchesPerMatchup,
              `${rowShortName} vs ${columnShortName}`,
              noteProgress
            );
            if (this.tournamentCancelRequested) {
              break;
            }
            const reverse = await this.simulateMatchBatchAsync(
              [columnId, rowId],
              this.tournamentMatchesPerMatchup,
              `${columnShortName} vs ${rowShortName}`,
              noteProgress
            );
            if (this.tournamentCancelRequested) {
              break;
            }

            const totalMatches = forward.matches + reverse.matches;
            if (totalMatches <= 0) {
              continue;
            }
            const rowWins = forward.wins[0] + reverse.wins[1];
            const columnWins = forward.wins[1] + reverse.wins[0];
            const averageDuration =
              (forward.averageDuration * forward.matches + reverse.averageDuration * reverse.matches) / totalMatches;
            const rowHp =
              (forward.averageRemainingHp[0] * forward.matches + reverse.averageRemainingHp[1] * reverse.matches) /
              totalMatches;
            const columnHp =
              (forward.averageRemainingHp[1] * forward.matches + reverse.averageRemainingHp[0] * reverse.matches) /
              totalMatches;

            const rowStats = createFighterStats();
            const columnStats = createFighterStats();
            addScaledStats(rowStats, forward.averageStats[0], forward.matches);
            addScaledStats(rowStats, reverse.averageStats[1], reverse.matches);
            addScaledStats(columnStats, forward.averageStats[1], forward.matches);
            addScaledStats(columnStats, reverse.averageStats[0], reverse.matches);

            const rowAverageStats = averageStats(rowStats, totalMatches);
            const columnAverageStats = averageStats(columnStats, totalMatches);
            const rowName = getFighterClass(rowId).displayName;
            const columnName = getFighterClass(columnId).displayName;

            cells[tournamentKey(rowId, columnId)] = createTournamentCell(
              rowId,
              columnId,
              rowName,
              columnName,
              totalMatches,
              rowWins,
              columnWins,
              averageDuration,
              [rowHp, columnHp],
              [rowAverageStats, columnAverageStats],
              false
            );
            cells[tournamentKey(columnId, rowId)] = createTournamentCell(
              columnId,
              rowId,
              columnName,
              rowName,
              totalMatches,
              columnWins,
              rowWins,
              averageDuration,
              [columnHp, rowHp],
              [columnAverageStats, rowAverageStats],
              false
            );

            const rowTotal = totals.get(rowId);
            const columnTotal = totals.get(columnId);
            if (rowTotal && columnTotal) {
              rowTotal.wins += rowWins;
              rowTotal.losses += columnWins;
              rowTotal.duration += averageDuration;
              rowTotal.batches += 1;
              columnTotal.wins += columnWins;
              columnTotal.losses += rowWins;
              columnTotal.duration += averageDuration;
              columnTotal.batches += 1;
            }
          }
        }
      }
    } finally {
      this.selectedClassIds = previousClassIds;
      this.physicsTestMode = previousPhysicsTestMode;
    }

    const rankings = classIds
      .map((classId) => {
        const total = totals.get(classId);
        const matches = (total?.wins ?? 0) + (total?.losses ?? 0);
        return {
          classId,
          className: getFighterClass(classId).displayName,
          wins: total?.wins ?? 0,
          losses: total?.losses ?? 0,
          winRate: matches > 0 ? (total?.wins ?? 0) / matches : 0,
          averageDuration: total && total.batches > 0 ? total.duration / total.batches : 0
        };
      })
      .sort((a, b) => b.winRate - a.winRate);

    if (!this.tournamentCancelRequested || Object.keys(cells).length > 0) {
      this.tournamentResult = {
        classIds,
        matchesPerMatchup: this.tournamentMatchesPerMatchup,
        includeMirrors: this.tournamentIncludeMirrors,
        runMode: this.tournamentRunMode,
        focusClassId: this.tournamentRunMode === "class" ? this.focusedTournamentClassId : undefined,
        cells,
        rankings,
        warnings: this.tournamentCancelRequested
          ? ["Tournament cancelled; showing partial results."]
          : createTournamentWarnings(cells, rankings)
      };
    }

    this.clearTransientBattleState();
    this.simulationMode = "visual";
    if (this.tournamentProgress) {
      this.tournamentProgress.active = false;
      this.tournamentProgress.cancelled = this.tournamentCancelRequested;
    }
    this.tournamentProgress = null;
    this.gameState = "tournament-results";
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground(ctx);

    if (this.gameState === "class-select") {
      this.drawClassSelect(ctx);
      if (this.classDetailOpen) {
        this.drawClassDetailPanel(ctx);
      }
      return;
    }

    if (this.gameState === "balance-results") {
      this.drawBalanceResults(ctx);
      return;
    }

    if (this.gameState === "tournament-options") {
      this.drawTournamentOptions(ctx);
      return;
    }

    if (this.gameState === "tournament-running") {
      this.drawTournamentOptions(ctx);
      this.drawTournamentProgress(ctx);
      return;
    }

    if (this.gameState === "tournament-results") {
      this.drawTournamentResults(ctx);
      return;
    }

    ctx.save();
    if (this.shake > 0) {
      ctx.translate(randomRange(-this.shake, this.shake), randomRange(-this.shake, this.shake));
    }

    this.drawTopUI(ctx);
    this.drawArena(ctx);
    this.drawToxicClouds(ctx);
    this.drawGravityWells(ctx);
    for (const decoy of this.mirrorDecoys) {
      decoy.draw(ctx, this.time);
    }
    for (const bomb of this.bombs) {
      bomb.draw(ctx, this.time);
    }
    for (const projectile of this.projectiles) {
      projectile.draw(ctx);
    }
    this.drawLightningEffects(ctx);
    for (const fighter of this.fighters) {
      if (this.selectedMode === "league" && this.leagueRun?.bossRound && fighter.id === "right") {
        this.drawBossAura(ctx, fighter);
      }
      fighter.draw(ctx, this.time);
    }
    for (const particle of this.particles) {
      particle.draw(ctx);
    }
    ctx.restore();

    this.drawBottomUI(ctx);
    if (this.gameState === "battle" || this.gameState === "ko-freeze" || this.gameState === "battle-ended") {
      this.drawRestartButton(ctx);
    }

    if (this.gameState === "ko-freeze" && this.winner) {
      this.drawKoFreeze(ctx);
    }

    if (this.gameState === "battle-ended" && this.winner) {
      this.drawWinner(ctx);
    }

    if (this.gameState === "league-reward") {
      this.drawLeagueReward(ctx);
    }

    if (this.gameState === "league-over" || this.gameState === "league-cleared") {
      this.drawLeagueRunEnd(ctx, this.gameState === "league-cleared");
    }

    if (this.gameState === "battle" && this.paused) {
      this.drawPauseOverlay(ctx);
    }

    if (this.debug) {
      this.drawDebug(ctx);
      this.drawPhysicsDebug(ctx);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#f4f2fa");
    gradient.addColorStop(1, "#e4e1ef");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "rgba(255,255,255,0.34)";
    for (let i = 0; i < 18; i += 1) {
      const y = (i * 73 + this.time * 12) % this.height;
      ctx.fillRect(0, y, this.width, 2);
    }
  }

  private drawArena(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(this.arena.x, this.arena.y, this.arena.w, this.arena.h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(30,30,42,0.08)";
    ctx.lineWidth = 2;
    for (let y = this.arena.y + 70; y < this.arena.y + this.arena.h; y += 70) {
      ctx.beginPath();
      ctx.moveTo(this.arena.x + 8, y);
      ctx.lineTo(this.arena.x + this.arena.w - 8, y);
      ctx.stroke();
    }

    if (this.stasisTimer > 0) {
      const alpha = Math.min(0.5, this.stasisTimer * 0.52);
      ctx.fillStyle = `rgba(67, 73, 86, ${alpha})`;
      ctx.fillRect(this.arena.x + 4, this.arena.y + 4, this.arena.w - 8, this.arena.h - 8);
      ctx.strokeStyle = `rgba(166, 224, 255, ${alpha + 0.2})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(this.arena.x + 22, this.arena.y + 22, this.arena.w - 44, this.arena.h - 44);
    }

    ctx.restore();
  }

  private drawClassSelect(ctx: CanvasRenderingContext2D): void {
    this.classSelectCards = [];
    this.classSelectorButtons = [];
    this.classDetailButtons = [];
    this.drawOutlinedText(ctx, "Afterimage War", this.width / 2, 38, 36, "#ffffff", "#111119", 8, "center");
    this.drawOutlinedText(
      ctx,
      this.selectedMode === "league" ? "Choose Your League Ball" : "Choose Fighters",
      this.width / 2,
      74,
      21,
      "#5d6070",
      "#ffffff",
      5,
      "center"
    );
    this.drawModeButton(ctx, this.quickModeButton, this.selectedMode === "quick");
    this.drawModeButton(ctx, this.leagueModeButton, this.selectedMode === "league");

    if (this.selectedMode === "league") {
      this.drawFocusedSelectionPanel(ctx, 0, "Player Ball", 38, 154, 500, 370);
      this.drawLeagueIntroPanel(ctx, 54, 548, 468, 116);
      this.drawOutlinedText(ctx, "Opponent generated automatically each round", this.width / 2, 704, 16, "#242431", "#ffffff", 4, "center");
      this.drawMenuButton(ctx, this.startLeagueButton, "#ffffff", "#111119", "#242431");
    } else {
      this.drawFocusedSelectionPanel(ctx, 0, "Fighter A", 28, 148, 520, 284);
      this.drawFocusedSelectionPanel(ctx, 1, "Fighter B", 28, 452, 520, 284);
      this.drawMenuButton(ctx, this.startBattleButton, "#ffffff", "#111119", "#242431");
    }
    if (this.devToolsVisible) {
      this.drawDevToolsPanel(ctx);
    }
    this.drawOutlinedText(
      ctx,
      this.selectedMode === "league"
        ? "A/D or Left/Right Player Ball   Enter Start Run"
        : "A/D Fighter A   Left/Right Fighter B   Enter Start",
      this.width / 2,
      928,
      12,
      "#242431",
      "#ffffff",
      4,
      "center"
    );
  }

  private drawFocusedSelectionPanel(
    ctx: CanvasRenderingContext2D,
    fighterIndex: 0 | 1,
    title: string,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    ctx.save();
    ctx.fillStyle = "#f8f8fc";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    this.drawOutlinedText(ctx, title, x + 22, y + 28, 22, "#ffffff", "#111119", 5, "left");

    const fighterClass = getFighterClass(this.selectedClassIds[fighterIndex]);
    const currentIndex = Math.max(0, playableClasses.findIndex((candidate) => candidate.id === fighterClass.id));
    const accentY = y + 48;
    ctx.fillStyle = fighterClass.primaryColor;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.roundRect(x + 14, accentY, w - 28, h - 122, 8);
    ctx.fill();
    ctx.globalAlpha = 1;

    const infoButtonSize = 32;
    const detailButton: ClassDetailButtonRect = {
      x: x + w - 58,
      y: accentY + 12,
      w: infoButtonSize,
      h: infoButtonSize,
      label: "i",
      fighterIndex
    };

    this.drawBallPreview(ctx, x + 72, y + 126, h > 330 ? 54 : 44, fighterClass);
    ctx.font = "900 25px Arial, sans-serif";
    const className = ellipsizeText(ctx, fighterClass.displayName, w - 214);
    this.drawOutlinedText(ctx, className, x + 140, y + 78, 25, "#ffffff", "#111119", 6, "left");

    ctx.fillStyle = "#252633";
    ctx.font = "900 14px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(ellipsizeText(ctx, fighterClass.roleLabel ?? fighterClass.role.toUpperCase(), w - 214), x + 140, y + 104);

    ctx.font = "900 15px Arial, sans-serif";
    ctx.fillText(`HP ${fighterClass.baseHP ?? DEFAULT_MAX_HP}`, x + 140, y + 130);
    ctx.fillText(`SPD ${fighterClass.targetMoveSpeed ?? fighterClass.baseMoveSpeed}`, x + 226, y + 130);

    ctx.font = "900 14px Arial, sans-serif";
    ctx.fillText(ellipsizeText(ctx, `Skill: ${fighterClass.abilityName}`, w - 184), x + 140, y + 156);

    this.drawWrappedText(ctx, fighterClass.shortDescription ?? fighterClass.abilityDescription, x + 140, y + 181, w - 172, 15, 2);

    const prevButton: ClassSelectorButtonRect = { x: x + 24, y: y + h - 58, w: 120, h: 38, label: "< PREV", fighterIndex, direction: -1 };
    const nextButton: ClassSelectorButtonRect = { x: x + w - 144, y: y + h - 58, w: 120, h: 38, label: "NEXT >", fighterIndex, direction: 1 };
    this.classSelectorButtons.push(prevButton, nextButton);
    this.classDetailButtons.push(detailButton);
    this.drawMenuButton(ctx, prevButton, "#ffffff", fighterClass.primaryColor, "#242431");
    this.drawInfoButton(ctx, detailButton, fighterClass);
    this.drawMenuButton(ctx, nextButton, "#ffffff", fighterClass.primaryColor, "#242431");

    this.drawOutlinedText(ctx, `${currentIndex + 1} / ${playableClasses.length}`, x + w / 2, y + h - 38, 14, "#242431", "#ffffff", 3, "center");
    ctx.restore();
  }

  private drawBallPreview(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    colors: Pick<FighterClass, "primaryColor" | "secondaryColor" | "outlineColor">
  ): void {
    const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.35, 3, x, y, radius);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.38, colors.secondaryColor);
    gradient.addColorStop(1, colors.primaryColor);
    ctx.fillStyle = gradient;
    ctx.strokeStyle = colors.outlineColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  private drawInfoButton(ctx: CanvasRenderingContext2D, button: ClassDetailButtonRect, fighterClass: FighterClass): void {
    ctx.save();
    const cx = button.x + button.w / 2;
    const cy = button.y + button.h / 2;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = fighterClass.primaryColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, button.w / 2, 0, TAU);
    ctx.fill();
    ctx.stroke();
    this.drawOutlinedText(ctx, "i", cx, cy + 1, 18, "#242431", "#ffffff", 3, "center");
    ctx.restore();
  }

  private drawClassDetailPanel(ctx: CanvasRenderingContext2D): void {
    const fighterClass = getFighterClass(this.classDetailClassId ?? this.selectedClassIds[0]);
    const meta = fighterClass.classMeta;
    this.classDetailTabButtons = [];

    ctx.save();
    ctx.fillStyle = "rgba(17,17,25,0.62)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#f8f8fc";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(28, 64, 520, 848, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = fighterClass.primaryColor;
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.roundRect(44, 86, 488, 90, 8);
    ctx.fill();
    ctx.globalAlpha = 1;

    this.drawBallPreview(ctx, 86, 130, 35, fighterClass);
    this.drawOutlinedText(ctx, fighterClass.displayName, 132, 110, 30, "#ffffff", "#111119", 7, "left");
    this.drawOutlinedText(ctx, fighterClass.roleLabel ?? fighterClass.role.toUpperCase(), 132, 144, 16, "#242431", "#ffffff", 4, "left");
    this.drawMenuButton(ctx, this.classDetailCloseButton, "#ffffff", "#111119", "#242431");

    const tabs: Array<[ClassDetailTab, string]> = [
      ["overview", "Overview"],
      ["skill", "Skill"],
      ["build", "Build"]
    ];
    tabs.forEach(([tab, label], index) => {
      const rect: ClassDetailTabRect = { x: 54 + index * 156, y: 190, w: 144, h: 36, label, tab };
      this.classDetailTabButtons.push(rect);
      this.drawMenuButton(ctx, rect, this.classDetailTab === tab ? fighterClass.secondaryColor : "#ffffff", fighterClass.primaryColor, "#242431");
    });

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(54, 242, 468, 642, 8);
    ctx.fill();
    ctx.stroke();

    if (this.classDetailTab === "overview") {
      this.drawClassOverviewTab(ctx, fighterClass, meta);
    } else if (this.classDetailTab === "skill") {
      this.drawClassSkillTab(ctx, fighterClass, meta);
    } else {
      this.drawClassBuildTab(ctx, fighterClass, meta);
    }
    ctx.restore();
  }

  private drawClassOverviewTab(ctx: CanvasRenderingContext2D, fighterClass: FighterClass, meta = fighterClass.classMeta): void {
    const stats = [
      `Difficulty: ${meta?.difficulty ?? "Medium"}`,
      `HP: ${fighterClass.baseHP ?? DEFAULT_MAX_HP}`,
      `Speed: ${fighterClass.targetMoveSpeed ?? fighterClass.baseMoveSpeed}`,
      `Skill: ${fighterClass.abilityName}`
    ];
    stats.forEach((line, index) => {
      const chipX = 76 + (index % 2) * 212;
      const chipY = 270 + Math.floor(index / 2) * 48;
      this.drawDetailChip(ctx, line, chipX, chipY, 190, fighterClass.primaryColor);
    });
    this.drawDetailListCard(ctx, "Strengths", meta?.strengths ?? ["Distinct class identity"], 76, 384, 196, 170, fighterClass.secondaryColor);
    this.drawDetailListCard(ctx, "Weaknesses", meta?.weaknesses ?? ["Requires matchup awareness"], 304, 384, 196, 170, fighterClass.secondaryColor);
    this.drawDetailTextCard(
      ctx,
      "Class Fantasy",
      fighterClass.shortDescription ?? fighterClass.abilityDescription,
      76,
      588,
      424,
      156,
      fighterClass.primaryColor,
      5
    );
    this.drawDetailTextCard(ctx, "Selection Tip", "Use the Build tab to see upgrades and matchup hints before locking in a fighter.", 76, 766, 424, 88, fighterClass.primaryColor, 2);
  }

  private drawClassSkillTab(ctx: CanvasRenderingContext2D, fighterClass: FighterClass, meta = fighterClass.classMeta): void {
    this.drawDetailTextCard(
      ctx,
      `Basic Attack: ${meta?.basicAttackName ?? "Basic Attack"}`,
      meta?.basicAttackDescription ?? "Uses the class basic attack pattern.",
      76,
      272,
      424,
      126,
      fighterClass.primaryColor,
      4
    );
    this.drawDetailTextCard(ctx, `Skill: ${fighterClass.abilityName}`, fighterClass.abilityDescription, 76, 422, 424, 146, fighterClass.secondaryColor, 5);
    this.drawDetailTextCard(
      ctx,
      `Passive: ${meta?.passiveName ?? "None"}`,
      meta?.passiveDescription ?? "No dedicated passive listed.",
      76,
      592,
      424,
      128,
      fighterClass.primaryColor,
      4
    );
    this.drawDetailTextCard(
      ctx,
      "Mechanics Notes",
      "Skill effects deal damage, apply status, or modify stats only through their listed mechanics. Visual effects do not redirect fighter movement.",
      76,
      744,
      424,
      110,
      fighterClass.secondaryColor,
      3
    );
  }

  private drawClassBuildTab(ctx: CanvasRenderingContext2D, fighterClass: FighterClass, meta = fighterClass.classMeta): void {
    this.drawDetailListCard(ctx, "Recommended Upgrades", meta?.recommendedUpgrades ?? ["Skill Tempo"], 76, 274, 424, 180, fighterClass.primaryColor);
    this.drawDetailListCard(ctx, "Matchup Hints", meta?.matchupHints ?? ["Learn opponent damage sources."], 76, 480, 424, 180, fighterClass.secondaryColor);
    this.drawDetailTextCard(
      ctx,
      "Suggested Playstyle",
      this.getClassPlaystyleSummary(fighterClass),
      76,
      690,
      424,
      154,
      fighterClass.primaryColor,
      5
    );
  }

  private drawDetailChip(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, accentColor: string): void {
    ctx.save();
    ctx.fillStyle = "#f1f3fb";
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 34, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#242431";
    ctx.font = "900 13px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ellipsizeText(ctx, text, w - 18), x + w / 2, y + 17);
    ctx.restore();
  }

  private drawDetailListCard(
    ctx: CanvasRenderingContext2D,
    title: string,
    lines: string[],
    x: number,
    y: number,
    w: number,
    h: number,
    accentColor: string
  ): void {
    this.drawDetailCardBackground(ctx, x, y, w, h, accentColor);
    this.drawOutlinedText(ctx, title, x + 16, y + 26, 17, "#ffffff", "#111119", 4, "left");
    ctx.save();
    ctx.fillStyle = "#242431";
    ctx.font = "800 13px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    lines.slice(0, 5).forEach((line, index) => {
      ctx.fillText(ellipsizeText(ctx, `- ${line}`, w - 32), x + 16, y + 50 + index * 22);
    });
    ctx.restore();
  }

  private drawDetailTextCard(
    ctx: CanvasRenderingContext2D,
    title: string,
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    accentColor: string,
    maxLines: number
  ): void {
    this.drawDetailCardBackground(ctx, x, y, w, h, accentColor);
    this.drawOutlinedText(ctx, title, x + 16, y + 26, 17, "#ffffff", "#111119", 4, "left");
    this.drawWrappedText(ctx, text, x + 16, y + 50, w - 32, 18, maxLines);
  }

  private drawDetailCardBackground(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, accentColor: string): void {
    ctx.save();
    ctx.fillStyle = "#f4f5fb";
    ctx.strokeStyle = "rgba(17,17,25,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.14;
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 5, w - 10, 28, 6);
    ctx.fill();
    ctx.restore();
  }

  private getClassPlaystyleSummary(fighterClass: FighterClass): string {
    const playstyles: Record<string, string> = {
      chrono: "Play around Time Stop. Stay alive while charging, then use rapid ranged pressure during the frozen window.",
      blade: "Keep pressure high and look for clean dash connections. Missed dash windows leave Blade exposed to ranged and counter tools.",
      shield: "Absorb key hits, time Guard Counter, and win through defense into retaliation instead of raw damage racing.",
      fire: "Maintain burn uptime and use Flame Burst to punish opponents that stay near the center or cross your path.",
      thunder: "Use speed and wall bounces to build Static Charge, then convert charge into Lightning Chain pressure.",
      poison: "Win longer fights by refreshing poison and delaying enemy ability tempo with steady attrition.",
      gravity: "Use Gravity Mark and Gravity Well to suppress enemy tempo, then capitalize with steady projectile and contact pressure.",
      vampire: "Keep landing hits to sustain. Blood Feast and low HP bonuses reward controlled comeback windows.",
      bomb: "Place delayed threats where the enemy will travel. Chain Detonation rewards reading bounce paths.",
      mirror: "Use decoys to break targeting, punish absorbed shots with shatter counters, and avoid direct AoE trades.",
      magnet: "Let Orbit Shield blunt projectile pressure, then use Magnetic Storm to turn defense into shard pressure.",
      ricochet: "Bank shots through walls to improve damage and pressure angles opponents are not directly guarding.",
      reaper: "Build Death Marks early, then cash them in with Soul Reap when the enemy is wounded.",
      crusher: "Force physical trades. High-speed collisions and Crushing Force are your real damage windows.",
      spike: "Seek contact trades. Thorn Skin and Spike Armor punish enemies that rely on collision or dash damage.",
      monk: "Chain contact hits to build combo, then cash the rhythm into a close-range Palm Burst.",
      berserker: "Trade carefully early, then let missing HP fuel faster Rage Breaks and heavier contact hits.",
      drill: "Use wall bounces and contact hits to stack Armor Break, then pierce defensive windows with Piercing Drill.",
      ninja: "Use wall bounces to prime Shadow Ready, then let Shadow Step chain short straight-line strike windows.",
      glass: "Protect your single HP with Glass Charges. Keep bouncing to refill charges before pressure catches you."
    };
    return playstyles[fighterClass.id] ?? "Lean into this class's core mechanic and choose upgrades that reinforce its role.";
  }

  private drawTopUI(ctx: CanvasRenderingContext2D): void {
    this.drawOutlinedText(ctx, "Afterimage War", this.width / 2, 29, 28, "#ffffff", "#111119", 6, "center");
    if (this.selectedMode === "league" && this.leagueRun) {
      ctx.save();
      ctx.font = "900 13px Arial, sans-serif";
      const leagueLine = `Round ${this.leagueRun.round}/${this.leagueRun.totalRounds}  ${this.leagueRun.opponentLabel}: ${this.leagueRun.opponentModifierSummary}  Upgrades ${this.leagueRun.upgrades.length}`;
      this.drawOutlinedText(
        ctx,
        ellipsizeText(ctx, leagueLine, 510),
        this.width / 2,
        54,
        13,
        "#242431",
        "#ffffff",
        4,
        "center"
      );
      ctx.restore();
    }
    this.drawNamePlate(ctx, this.fighters[0], 28, 72, "left");
    this.drawNamePlate(ctx, this.fighters[1], 548, 72, "right");
  }

  private drawNamePlate(ctx: CanvasRenderingContext2D, fighter: Fighter, x: number, y: number, align: CanvasTextAlign): void {
    const plateW = 230;
    const startX = align === "left" ? x : x - plateW;
    const label = fighter.id === "left" ? "FIGHTER A" : "FIGHTER B";
    ctx.save();
    ctx.fillStyle = fighter.classDef.primaryColor;
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(startX, y - 25, plateW, 50, 8);
    ctx.fill();
    ctx.stroke();
    this.drawOutlinedText(ctx, label, x, y - 13, 11, fighter.classDef.secondaryColor, "#111119", 3, align);
    this.drawOutlinedText(ctx, fighter.classDef.displayName, x, y + 8, 21, "#ffffff", "#111119", 5, align);
    ctx.restore();
  }

  private drawBossAura(ctx: CanvasRenderingContext2D, fighter: Fighter): void {
    ctx.save();
    ctx.translate(fighter.position.x, fighter.position.y);
    const pulse = 1 + Math.sin(this.time * 6) * 0.05;
    ctx.strokeStyle = "rgba(255, 209, 102, 0.72)";
    ctx.fillStyle = "rgba(255, 209, 102, 0.08)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, (fighter.radius + 18) * pulse, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 30 + Math.sin(this.time * 9) * 3, 0, TAU * 0.72);
    ctx.stroke();
    ctx.restore();
  }

  private drawBottomUI(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = "#f7f7fb";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(28, 830, 520, 124, 8);
    ctx.fill();
    ctx.stroke();

    this.drawAbilityPanel(ctx, this.fighters[0], 48, 850, 222);
    this.drawAbilityPanel(ctx, this.fighters[1], 306, 850, 222);
    this.drawOutlinedText(
      ctx,
      "Space Pause  R Restart  F Meters  D Debug  P Physics  Esc Select",
      288,
      942,
      14,
      "#242431",
      "#ffffff",
      4,
      "center"
    );
    ctx.restore();
  }

  private drawAbilityPanel(ctx: CanvasRenderingContext2D, fighter: Fighter, x: number, y: number, w: number): void {
    const flash = fighter.ability.flash > 0 ? Math.sin(this.time * 36) * 0.12 + 0.18 : 0;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 78, 8);
    ctx.fill();
    ctx.stroke();

    this.drawOutlinedText(ctx, fighter.classDef.abilityName, x + 10, y + 20, 16, fighter.classDef.secondaryColor, "#111119", 4, "left");

    ctx.fillStyle = "#dddde8";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 32, w - 20, 20, 5);
    ctx.fill();
    ctx.stroke();

    const fillW = (w - 26) * fighter.ability.value;
    ctx.fillStyle = fighter.classDef.primaryColor;
    ctx.beginPath();
    ctx.roundRect(x + 13, y + 35, fillW, 14, 4);
    ctx.fill();
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flash})`;
      ctx.fillRect(x + 13, y + 35, Math.max(0, fillW), 14);
    }

    const statValue = fighter.classDef.formatScalingStat?.(fighter) ?? `X${fighter.scalingValue.toFixed(2)}`;
    const stat = `${fighter.classDef.scalingStatName} ${statValue}`;
    this.drawOutlinedText(ctx, stat, x + 10, y + 66, 16, "#242431", "#ffffff", 4, "left");
    ctx.restore();
  }

  private drawRestartButton(ctx: CanvasRenderingContext2D): void {
    if (this.gameState !== "battle") {
      return;
    }

    this.drawMenuButton(ctx, this.restartButton, "#ffffff", "#111119", "#242431");
  }

  private drawKoFreeze(ctx: CanvasRenderingContext2D): void {
    if (!this.winner || !this.koLoser) {
      return;
    }

    const panelX = this.arena.x + 44;
    const panelY = this.arena.y + 214;
    const panelW = this.arena.w - 88;
    const panelH = 190;
    ctx.save();
    ctx.fillStyle = "rgba(17,17,25,0.36)";
    ctx.fillRect(this.arena.x + 4, this.arena.y + 4, this.arena.w - 8, this.arena.h - 8);
    ctx.fillStyle = "rgba(248,248,252,0.92)";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 8);
    ctx.fill();
    ctx.stroke();

    this.drawOutlinedText(ctx, "KO!", this.width / 2, panelY + 48, 54, this.winner.classDef.secondaryColor, "#111119", 10, "center");
    this.drawOutlinedText(
      ctx,
      `${this.winner.classDef.displayName} Wins!`,
      this.width / 2,
      panelY + 98,
      25,
      "#ffffff",
      "#111119",
      6,
      "center"
    );
    this.drawOutlinedText(
      ctx,
      `${this.koLoser.classDef.displayName} HP 0`,
      this.width / 2,
      panelY + 132,
      17,
      "#242431",
      "#ffffff",
      4,
      "center"
    );
    this.drawOutlinedText(ctx, "Click / Enter to continue", this.width / 2, panelY + 164, 13, "#5d6070", "#ffffff", 3, "center");
    ctx.restore();
  }

  private drawWinner(ctx: CanvasRenderingContext2D): void {
    if (!this.winner || !this.lastMatchSummary) {
      return;
    }

    const summary = this.lastMatchSummary;
    ctx.save();
    ctx.fillStyle = "rgba(17,17,25,0.58)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#f8f8fc";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(28, 104, 520, 766, 8);
    ctx.fill();
    ctx.stroke();

    this.drawOutlinedText(
      ctx,
      `${summary.winnerName} Wins!`,
      this.width / 2,
      142,
      34,
      this.winner.classDef.secondaryColor,
      "#111119",
      8,
      "center"
    );
    this.drawOutlinedText(ctx, `Duration ${summary.duration.toFixed(1)}s`, this.width / 2, 178, 19, "#242431", "#ffffff", 4, "center");
    this.drawOutlinedText(
      ctx,
      `Winner HP ${Math.ceil(summary.winnerHp)}  |  Loser ${summary.loserName}`,
      this.width / 2,
      204,
      17,
      "#242431",
      "#ffffff",
      4,
      "center"
    );

    this.drawResultColumn(ctx, summary.fighters[0], 46, 232, 232);
    this.drawResultColumn(ctx, summary.fighters[1], 298, 232, 232);
    ctx.restore();

    this.drawMenuButton(ctx, this.restartSameButton, "#ffffff", "#111119", "#242431");
    this.drawMenuButton(ctx, this.classSelectButton, "#ffffff", "#111119", "#242431");
    if (this.devToolsVisible) {
      this.drawMenuButton(ctx, this.resultBalanceButton, "#eeeeF6", "#5d6070", "#242431");
    }
  }

  private drawLeagueReward(ctx: CanvasRenderingContext2D): void {
    if (!this.leagueRun || !this.lastMatchSummary) {
      return;
    }

    this.leagueRewardCards = [];
    const summary = this.lastMatchSummary;
    ctx.save();
    ctx.fillStyle = "rgba(17,17,25,0.62)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#f8f8fc";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(28, 82, 520, 824, 8);
    ctx.fill();
    ctx.stroke();

    this.drawOutlinedText(ctx, `Round ${this.leagueRun.round} Cleared!`, this.width / 2, 124, 32, "#ffffff", "#111119", 8, "center");
    this.drawOutlinedText(
      ctx,
      `${summary.winnerName} won in ${summary.duration.toFixed(1)}s  |  HP ${Math.ceil(summary.winnerHp)}`,
      this.width / 2,
      160,
      16,
      "#242431",
      "#ffffff",
      4,
      "center"
    );
    this.drawOutlinedText(
      ctx,
      `Damage dealt ${summary.fighters[0].stats.damageDealt.toFixed(0)}  |  Damage taken ${summary.fighters[0].stats.damageTaken.toFixed(0)}`,
      this.width / 2,
      184,
      14,
      "#242431",
      "#ffffff",
      4,
      "center"
    );
    this.drawNextOpponentPreview(ctx, this.leagueRun, 54, 206, 468, 66);
    this.drawOutlinedText(ctx, "Choose 1 Upgrade", this.width / 2, 292, 24, "#ffffff", "#111119", 6, "center");

    this.leagueRun.pendingChoices.forEach((upgrade, index) => {
      const card: UpgradeCardRect = { x: 54, y: 314 + index * 116, w: 468, h: 108, upgradeId: upgrade.id };
      this.leagueRewardCards.push(card);
      this.drawUpgradeCard(ctx, upgrade, card, upgrade.id === this.selectedLeagueUpgradeId);
    });

    this.drawRunBuildPanel(ctx, this.leagueRun, 64, 662, 448, 140, "compact");
    ctx.restore();
    this.drawMenuButton(
      ctx,
      this.leagueContinueButton,
      this.selectedLeagueUpgradeId ? "#dff6ff" : "#eeeeF6",
      this.selectedLeagueUpgradeId ? "#22b8ff" : "#8c8f9d",
      "#242431"
    );
  }

  private drawLeagueRunEnd(ctx: CanvasRenderingContext2D, cleared: boolean): void {
    if (!this.leagueRun) {
      return;
    }

    ctx.save();
    ctx.fillStyle = "rgba(17,17,25,0.62)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#f8f8fc";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(28, 98, 520, 760, 8);
    ctx.fill();
    ctx.stroke();

    this.drawOutlinedText(ctx, cleared ? "League Cleared!" : "Run Over", this.width / 2, 144, 36, "#ffffff", "#111119", 8, "center");
    const playerClass = getFighterClass(this.leagueRun.playerClassId);
    this.drawOutlinedText(ctx, playerClass.displayName, this.width / 2, 186, 24, playerClass.secondaryColor, "#111119", 6, "center");

    const lines = [
      `Rounds cleared: ${this.leagueRun.roundsCleared}/${this.leagueRun.totalRounds}`,
      `Final opponent: ${this.leagueRun.finalOpponentName || getFighterClass(this.leagueRun.opponentClassId).displayName}`,
      `Total wins: ${this.leagueRun.totalWins}`,
      `Total damage dealt: ${this.leagueRun.totalDamageDealt.toFixed(0)}`,
      `Total damage taken: ${this.leagueRun.totalDamageTaken.toFixed(0)}`,
      `Total battle time: ${this.leagueRun.totalTime.toFixed(1)}s`
    ];
    ctx.fillStyle = "#242431";
    ctx.font = "900 17px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    lines.forEach((line, index) => ctx.fillText(line, 72, 240 + index * 34));

    this.drawRunBuildPanel(ctx, this.leagueRun, 64, 440, 448, 310, "full");
    this.drawTopDamageSources(ctx, this.leagueRun, 64, 760, 448);
    ctx.restore();

    this.leagueRetryButton.label = cleared ? "NEW RUN" : "RETRY RUN";
    this.drawMenuButton(ctx, this.leagueRetryButton, "#ffffff", "#111119", "#242431");
    this.drawMenuButton(ctx, this.leagueBackButton, "#ffffff", "#111119", "#242431");
  }

  private drawUpgradeCard(ctx: CanvasRenderingContext2D, upgrade: UpgradeDefinition, card: UpgradeCardRect, selected: boolean): void {
    ctx.save();
    ctx.fillStyle = rarityColor(upgrade.rarity);
    ctx.strokeStyle = selected ? "#22b8ff" : "#111119";
    ctx.lineWidth = selected ? 7 : 5;
    ctx.beginPath();
    ctx.roundRect(card.x, card.y, card.w, card.h, 8);
    ctx.fill();
    ctx.stroke();
    this.drawOutlinedText(ctx, upgrade.name, card.x + 18, card.y + 24, 22, "#ffffff", "#111119", 5, "left");
    this.drawOutlinedText(ctx, upgrade.rarity.toUpperCase(), card.x + card.w - 18, card.y + 23, 14, "#242431", "#ffffff", 3, "right");
    if (this.leagueRun) {
      const label = this.getUpgradeChoiceLabel(upgrade);
      if (label) {
        this.drawOutlinedText(ctx, label, card.x + card.w - 18, card.y + 43, 12, selected ? "#22b8ff" : "#242431", "#ffffff", 3, "right");
      }
    }
    ctx.fillStyle = "#242431";
    ctx.font = "900 15px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(upgrade.effectText, card.x + 20, card.y + 50);
    this.drawWrappedText(ctx, upgrade.description, card.x + 20, card.y + 72, card.w - 40, 15, 2);
    if (selected) {
      this.drawOutlinedText(ctx, "SELECTED", card.x + card.w - 18, card.y + card.h - 18, 14, "#ffffff", "#111119", 4, "right");
    }
    ctx.restore();
  }

  private drawNextOpponentPreview(ctx: CanvasRenderingContext2D, run: LeagueRunState, x: number, y: number, w: number, h: number): void {
    const opponent = getFighterClass(run.nextOpponentClassId || run.opponentClassId);
    const nextRound = Math.min(run.totalRounds, run.round + 1);
    const tagText = run.recommendationTags.length > 0 ? run.recommendationTags.slice(0, 3).join(" / ") : "Reliable damage / Defense";
    ctx.save();
    ctx.fillStyle = run.nextBossRound ? "#fff3c4" : "#ffffff";
    ctx.strokeStyle = run.nextBossRound ? "#d19a21" : "#111119";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    this.drawBallPreview(ctx, x + 36, y + h / 2, 20, opponent);
    this.drawOutlinedText(
      ctx,
      `${run.nextBossRound ? "Boss Round" : "Next Round"} ${nextRound}/${run.totalRounds}: ${opponent.displayName}`,
      x + 70,
      y + 17,
      16,
      "#ffffff",
      "#111119",
      4,
      "left"
    );
    ctx.fillStyle = "#242431";
    ctx.font = "800 11px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(ellipsizeText(ctx, `${opponent.roleLabel ?? opponent.role} | ${opponent.abilityName}`, w - 92), x + 70, y + 28);
    ctx.fillText(ellipsizeText(ctx, `Threat: ${this.getOpponentThreatText(opponent.id)}`, w - 92), x + 70, y + 42);
    ctx.fillText(ellipsizeText(ctx, `Recommended: ${tagText}`, w - 92), x + 70, y + 55);
    if (run.nextOpponentModifierSummary && run.nextOpponentModifierSummary !== "No modifier") {
      this.drawOutlinedText(ctx, run.nextOpponentModifierSummary, x + w - 12, y + 17, 10, "#242431", "#ffffff", 3, "right");
    }
    ctx.restore();
  }

  private getUpgradeChoiceLabel(upgrade: UpgradeDefinition): string | null {
    if (!this.leagueRun) {
      return null;
    }
    if (this.isUpgradeRecommendedForNextOpponent(upgrade, this.leagueRun.nextOpponentClassId)) {
      return upgrade.rarity === "rare" ? "Recommended" : "Good vs Next";
    }
    return getUpgradeSynergyLabel(upgrade, this.leagueRun.playerModifiers);
  }

  private isUpgradeRecommendedForNextOpponent(upgrade: UpgradeDefinition, opponentClassId: string): boolean {
    const commonDefense = new Set(["reinforced-shell", "momentum-barrier", "second-wind", "emergency-guard"]);
    const recommended: Record<string, string[]> = {
      chrono: ["fast-charge", "skill-tempo", "overclock", "burst-guard", "cleanse-pulse"],
      blade: ["impact-guard", "reinforced-shell", "momentum-barrier", "armor-plating", "emergency-guard"],
      shield: ["hotter-burn", "stronger-venom", "time-shard-tuning", "echo-skill", "finisher-core"],
      fire: ["heat-guard", "status-filter", "reinforced-shell", "burst-guard", "quick-core"],
      thunder: ["burst-guard", "anti-burst-core", "steady-core", "dense-core", "reinforced-shell"],
      poison: ["toxin-guard", "status-filter", "cleanse-pulse", "fast-charge", "finisher-core"],
      gravity: ["steady-core", "status-filter", "time-shard-tuning", "echo-skill", "fast-charge"],
      vampire: ["finisher-core", "sharp-impact", "razor-impact", "deep-reap", "time-shard-tuning"],
      bomb: ["quick-core", "reinforced-shell", "burst-guard", "projectile-plating", "time-shard-tuning"],
      mirror: ["hotter-burn", "stronger-venom", "bigger-blast", "wide-detonation", "chain-reaction"],
      magnet: ["sharp-impact", "critical-collision", "hotter-burn", "stronger-venom", "bigger-blast"],
      ricochet: ["projectile-plating", "reinforced-shell", "burst-guard", "quick-core", "glass-core"],
      reaper: ["reinforced-shell", "burst-guard", "emergency-guard", "finisher-core", "cleanse-pulse"],
      crusher: ["projectile-plating", "stronger-venom", "hotter-burn", "impact-guard", "quick-core"],
      spike: ["projectile-plating", "stronger-venom", "hotter-burn", "bigger-blast", "impact-guard"],
      monk: ["impact-guard", "reinforced-shell", "momentum-barrier", "hard-thorns", "projectile-plating"],
      berserker: ["impact-guard", "burst-guard", "emergency-guard", "momentum-barrier", "reinforced-shell"],
      drill: ["reinforced-shell", "momentum-barrier", "projectile-plating", "quick-core", "impact-guard"],
      ninja: ["impact-guard", "projectile-plating", "burst-guard", "momentum-barrier", "hard-thorns"],
      glass: ["stable-shot", "focused-projectiles", "fast-charge", "skill-tempo", "clear-edge"]
    };
    return (recommended[opponentClassId] ?? Array.from(commonDefense)).includes(upgrade.id) || commonDefense.has(upgrade.id);
  }

  private getOpponentThreatText(classId: string): string {
    const threats: Record<string, string> = {
      chrono: "Time Stop burst and precise shards.",
      blade: "Fast dash/contact burst.",
      shield: "Armor charges and Guard Counter.",
      fire: "Burn damage and wide Flame Burst.",
      thunder: "Fast pressure and chain lightning.",
      poison: "Long poison and ability tempo debuff.",
      gravity: "Suppression field and heavy marks.",
      vampire: "Lifesteal comeback windows.",
      bomb: "Timed explosions and chain traps.",
      mirror: "Decoys absorb projectiles.",
      magnet: "Orbit shards block projectiles.",
      ricochet: "Bouncing projectiles pressure angles.",
      reaper: "Death Marks into execute damage.",
      crusher: "Heavy impact damage on collisions.",
      spike: "Contact damage and thorn reflection.",
      monk: "Contact combos into Palm Burst.",
      berserker: "Low HP rage contact pressure.",
      drill: "Armor Break and defense piercing.",
      ninja: "Short multi-dashes and projectile evasion.",
      glass: "One HP, Glass Charges, and Prism Shift."
    };
    return threats[classId] ?? "Flexible pressure.";
  }

  private drawRunBuildPanel(
    ctx: CanvasRenderingContext2D,
    run: LeagueRunState,
    x: number,
    y: number,
    w: number,
    h: number,
    mode: "compact" | "full"
  ): void {
    const playerClass = getFighterClass(run.playerClassId);
    const tags = getBuildFocusTags(run.playerModifiers);
    const modifierLines = getRunModifierSummary(run.playerModifiers, mode === "compact" ? 3 : 7);
    const history = run.selectedUpgrades;
    const latestCount = mode === "compact" ? 3 : 8;
    const latest = history.slice(-latestCount);
    const moreCount = Math.max(0, history.length - latest.length);

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    this.drawOutlinedText(ctx, `Current Build: ${playerClass.displayName}`, x + 16, y + 20, mode === "compact" ? 16 : 20, "#ffffff", "#111119", 4, "left");
    this.drawOutlinedText(ctx, `Upgrades ${history.length}`, x + w - 16, y + 20, 14, "#242431", "#ffffff", 3, "right");

    ctx.fillStyle = "#242431";
    ctx.font = mode === "compact" ? "800 12px Arial, sans-serif" : "900 14px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const tagText = tags.length > 0 ? tags.join(" / ") : "No focus yet";
    ctx.fillText(ellipsizeText(ctx, `Focus: ${tagText}`, w - 32), x + 16, y + 39);

    if (history.length === 0) {
      ctx.font = "800 12px Arial, sans-serif";
      ctx.fillText("No upgrades yet.", x + 16, y + 61);
      ctx.fillText("Choose your first upgrade to shape this run.", x + 16, y + 80);
      ctx.restore();
      return;
    }

    const upgradeStartY = y + (mode === "compact" ? 60 : 70);
    ctx.font = mode === "compact" ? "800 12px Arial, sans-serif" : "800 13px Arial, sans-serif";
    latest.forEach((upgrade, index) => {
      const line = `R${upgrade.roundAcquired} ${upgrade.name}`;
      ctx.fillText(ellipsizeText(ctx, line, mode === "compact" ? w * 0.48 : w - 34), x + 16, upgradeStartY + index * 17);
      if (mode === "full") {
        ctx.fillText(ellipsizeText(ctx, upgrade.effectSummary, w - 230), x + 220, upgradeStartY + index * 17);
      }
    });
    if (moreCount > 0 && mode === "compact") {
      ctx.fillText(`+${moreCount} more upgrades`, x + 16, upgradeStartY + latest.length * 17);
    }

    const bonusX = mode === "compact" ? x + 250 : x + 16;
    const bonusY = mode === "compact" ? y + 60 : y + 222;
    ctx.font = mode === "compact" ? "800 12px Arial, sans-serif" : "900 14px Arial, sans-serif";
    ctx.fillText("Total Bonuses:", bonusX, bonusY);
    ctx.font = mode === "compact" ? "800 11px Arial, sans-serif" : "800 13px Arial, sans-serif";
    const shownBonuses = modifierLines.length > 0 ? modifierLines : ["No stat bonuses yet"];
    shownBonuses.forEach((line, index) => {
      ctx.fillText(ellipsizeText(ctx, `- ${line}`, mode === "compact" ? w - 268 : w - 36), bonusX, bonusY + 18 + index * 17);
    });
    ctx.restore();
  }

  private drawTopDamageSources(ctx: CanvasRenderingContext2D, run: LeagueRunState, x: number, y: number, w: number): void {
    const entries = Object.entries(run.damageSources)
      .filter(([, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    if (entries.length === 0) {
      return;
    }

    ctx.save();
    ctx.fillStyle = "#242431";
    ctx.font = "900 14px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Top Damage:", x + 14, y);
    entries.forEach(([label, amount], index) => {
      ctx.fillText(ellipsizeText(ctx, `${index + 1}. ${label} ${amount.toFixed(0)}`, w - 32), x + 14, y + 20 + index * 20);
    });
    ctx.restore();
  }

  private drawResultColumn(
    ctx: CanvasRenderingContext2D,
    result: FighterResultSummary,
    x: number,
    y: number,
    w: number
  ): void {
    const stats = result.stats;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 600, 8);
    ctx.fill();
    ctx.stroke();

    this.drawOutlinedText(ctx, result.label, x + w / 2, y + 24, 17, "#ffffff", "#111119", 4, "center");
    this.drawOutlinedText(ctx, result.className, x + w / 2, y + 49, 20, "#242431", "#ffffff", 4, "center");

    const lines = [
      ["Final HP", Math.ceil(result.finalHp).toString()],
      ["Damage dealt", stats.damageDealt.toFixed(1)],
      ["Damage taken", stats.damageTaken.toFixed(1)],
      ["Healing", stats.healingDone.toFixed(1)],
      ["Projectile dmg", stats.projectileDamage.toFixed(1)],
      ["Explosion dmg", stats.explosionDamage.toFixed(1)],
      ["Contact dmg", stats.contactDamage.toFixed(1)],
      ["Dash dmg", stats.dashDamage.toFixed(1)],
      ["Ability dmg", stats.abilityDamage.toFixed(1)],
      ["Burn dmg", stats.burnDamage.toFixed(1)],
      ["Counter dmg", stats.counterDamage.toFixed(1)],
      ["Collision dmg", stats.collisionDamage.toFixed(1)],
      ["Ability uses", stats.abilityUses.toString()],
      ["Projectile hits", stats.projectileHits.toString()],
      ["Contact hits", stats.contactHits.toString()],
      ["Dash hits", stats.dashHits.toString()],
      ["Bomb hits", stats.explosionHits.toString()],
      ["Decoys made/lost", `${stats.decoysCreated}/${stats.decoysDestroyed}`],
      ["Decoy absorbs", stats.attacksAbsorbedByDecoys.toString()],
      ["Shatter dmg", stats.shatterShotDamage.toFixed(1)],
      ["Evades", stats.projectileEvades.toString()],
      ["Phase/prevent", `${stats.phaseReflectionTriggers}/${stats.damagePreventedByPhaseReflection.toFixed(1)}`],
      ["Status ticks", stats.statusTicks.toString()],
      ["Wall bounces", stats.wallBounces.toString()],
      ["Fighter collisions", stats.fighterCollisions.toString()]
    ];

    ctx.font = "800 11px Arial, sans-serif";
    ctx.textBaseline = "middle";
    const rowStep = 20;
    for (let i = 0; i < lines.length; i += 1) {
      const rowY = y + 82 + i * rowStep;
      ctx.fillStyle = i % 2 === 0 ? "#f1f1f7" : "#ffffff";
      ctx.fillRect(x + 10, rowY - 11, w - 20, 22);
      ctx.fillStyle = "#242431";
      ctx.textAlign = "left";
      ctx.fillText(lines[i][0], x + 18, rowY);
      ctx.textAlign = "right";
      ctx.fillText(lines[i][1], x + w - 18, rowY);
    }
    ctx.restore();
  }

  private drawBalanceResults(ctx: CanvasRenderingContext2D): void {
    const result = this.balanceTestResult;
    if (!result) {
      this.drawClassSelect(ctx);
      return;
    }

    ctx.save();
    this.drawOutlinedText(ctx, "Balance Test", this.width / 2, 58, 36, "#ffffff", "#111119", 8, "center");
    this.drawOutlinedText(
      ctx,
      `${result.classNames[0]} vs ${result.classNames[1]}`,
      this.width / 2,
      96,
      22,
      "#242431",
      "#ffffff",
      4,
      "center"
    );

    ctx.fillStyle = "#f8f8fc";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(28, 126, 520, 742, 8);
    ctx.fill();
    ctx.stroke();

    const aRate = result.wins[0] / result.matches;
    const bRate = result.wins[1] / result.matches;
    this.drawOutlinedText(ctx, `Matches ${result.matches}`, 288, 162, 22, "#ffffff", "#111119", 5, "center");

    this.drawBalanceOverview(ctx, result, aRate, bRate);
    this.drawBalanceStatsColumn(ctx, "Fighter A", result.classNames[0], result.averageStats[0], 46, 328, 232);
    this.drawBalanceStatsColumn(ctx, "Fighter B", result.classNames[1], result.averageStats[1], 298, 328, 232);
    ctx.restore();

    for (const button of this.balanceTestButtons) {
      this.drawMenuButton(ctx, button, "#ffffff", "#111119", "#242431");
    }
    this.drawMenuButton(ctx, this.balanceBackButton, "#ffffff", "#111119", "#242431");
  }

  private drawBalanceOverview(
    ctx: CanvasRenderingContext2D,
    result: BalanceTestResult,
    aRate: number,
    bRate: number
  ): void {
    const rows = [
      [`${result.classNames[0]} wins`, `${result.wins[0]} (${Math.round(aRate * 100)}%)`],
      [`${result.classNames[1]} wins`, `${result.wins[1]} (${Math.round(bRate * 100)}%)`],
      ["Average duration", `${result.averageDuration.toFixed(1)}s`],
      ["Fastest / Longest", `${result.fastestWin.toFixed(1)}s / ${result.longestMatch.toFixed(1)}s`],
      ["Avg remaining HP", `${result.averageRemainingHp[0].toFixed(1)} / ${result.averageRemainingHp[1].toFixed(1)}`]
    ];

    ctx.save();
    ctx.font = "900 15px Arial, sans-serif";
    ctx.textBaseline = "middle";
    rows.forEach((row, index) => {
      const y = 198 + index * 24;
      ctx.fillStyle = index % 2 === 0 ? "#ffffff" : "#eeeeF6";
      ctx.fillRect(56, y - 11, 464, 22);
      ctx.fillStyle = "#242431";
      ctx.textAlign = "left";
      ctx.fillText(row[0], 68, y);
      ctx.textAlign = "right";
      ctx.fillText(row[1], 508, y);
    });
    ctx.restore();
  }

  private drawBalanceStatsColumn(
    ctx: CanvasRenderingContext2D,
    label: string,
    className: string,
    stats: FighterStats,
    x: number,
    y: number,
    w: number
  ): void {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 498, 8);
    ctx.fill();
    ctx.stroke();
    this.drawOutlinedText(ctx, label, x + w / 2, y + 23, 17, "#ffffff", "#111119", 4, "center");
    this.drawOutlinedText(ctx, className, x + w / 2, y + 48, 18, "#242431", "#ffffff", 4, "center");

    const rows = [
      ["Avg dealt", stats.damageDealt.toFixed(1)],
      ["Avg taken", stats.damageTaken.toFixed(1)],
      ["Projectile", stats.projectileDamage.toFixed(1)],
      ["Contact", stats.contactDamage.toFixed(1)],
      ["Dash", stats.dashDamage.toFixed(1)],
      ["Ability", stats.abilityDamage.toFixed(1)],
      ["Burn", stats.burnDamage.toFixed(1)],
      ["Counter", stats.counterDamage.toFixed(1)],
      ["Abilities", stats.abilityUses.toFixed(1)],
      ["Proj hits", stats.projectileHits.toFixed(1)],
      ["Contact hits", stats.contactHits.toFixed(1)],
      ["Wall bounces", stats.wallBounces.toFixed(1)],
      ["Collisions", stats.fighterCollisions.toFixed(1)]
    ];

    ctx.font = "800 13px Arial, sans-serif";
    ctx.textBaseline = "middle";
    rows.forEach((row, index) => {
      const rowY = y + 82 + index * 29;
      ctx.fillStyle = index % 2 === 0 ? "#f1f1f7" : "#ffffff";
      ctx.fillRect(x + 10, rowY - 12, w - 20, 24);
      ctx.fillStyle = "#242431";
      ctx.textAlign = "left";
      ctx.fillText(row[0], x + 18, rowY);
      ctx.textAlign = "right";
      ctx.fillText(row[1], x + w - 18, rowY);
    });
    ctx.restore();
  }

  private getSelectedTournamentClassIds(): string[] {
    return playableClasses
      .map((fighterClass) => fighterClass.id)
      .filter((classId) => this.selectedTournamentClassIds.has(classId));
  }

  private getTournamentClassIdsForCurrentMode(): string[] {
    if (this.tournamentRunMode === "matchup") {
      return [this.focusedTournamentClassIds[0], this.focusedTournamentClassIds[1]];
    }
    if (this.tournamentRunMode === "class") {
      return [this.focusedTournamentClassId, ...this.getFocusedClassOpponentIds()];
    }
    return this.getSelectedTournamentClassIds();
  }

  private getFocusedClassOpponentIds(): string[] {
    const selected = this.getSelectedTournamentClassIds();
    const source = selected.length > 0 ? selected : playableClasses.map((fighterClass) => fighterClass.id);
    return source.filter((classId) => classId !== this.focusedTournamentClassId);
  }

  private getTournamentWorkload(classIds = this.getTournamentClassIdsForCurrentMode()): number {
    if (this.tournamentRunMode === "matchup") {
      return this.tournamentMatchesPerMatchup;
    }

    if (this.tournamentRunMode === "class") {
      const opponentCount = this.getFocusedClassOpponentIds().length;
      const mirrorMatches = this.tournamentIncludeMirrors ? this.tournamentMatchesPerMatchup : 0;
      return opponentCount * this.tournamentMatchesPerMatchup * 2 + mirrorMatches;
    }

    const classCount = classIds.length;
    if (classCount < 2) {
      return 0;
    }
    const sideOrderMatches = classCount * (classCount - 1) * this.tournamentMatchesPerMatchup;
    const mirrorMatches = this.tournamentIncludeMirrors ? classCount * this.tournamentMatchesPerMatchup : 0;
    return sideOrderMatches + mirrorMatches;
  }

  private getTournamentWorkloadLabel(totalMatches: number): string {
    if (totalMatches >= 10000) {
      return "High workload";
    }
    if (totalMatches >= 3000) {
      return "Medium workload";
    }
    return "Fast workload";
  }

  private cycleFocusedTournamentClass(fighterIndex: 0 | 1, direction: number): void {
    const classIds = playableClasses.map((fighterClass) => fighterClass.id);
    const currentIndex = Math.max(0, classIds.indexOf(this.focusedTournamentClassIds[fighterIndex]));
    const nextIndex = (currentIndex + direction + classIds.length) % classIds.length;
    this.focusedTournamentClassIds[fighterIndex] = classIds[nextIndex];
  }

  private cycleFocusedClass(direction: number): void {
    const classIds = playableClasses.map((fighterClass) => fighterClass.id);
    const currentIndex = Math.max(0, classIds.indexOf(this.focusedTournamentClassId));
    const nextIndex = (currentIndex + direction + classIds.length) % classIds.length;
    this.focusedTournamentClassId = classIds[nextIndex];
  }

  private setTournamentClassSubset(kind: "all" | "clear" | "core" | "recent"): void {
    if (kind === "all") {
      this.selectedTournamentClassIds = new Set(playableClasses.map((fighterClass) => fighterClass.id));
      return;
    }
    if (kind === "clear") {
      this.selectedTournamentClassIds = new Set();
      return;
    }
    if (kind === "core") {
      const core = new Set(["chrono", "blade", "shield", "fire", "thunder", "poison"]);
      this.selectedTournamentClassIds = new Set(
        playableClasses.map((fighterClass) => fighterClass.id).filter((classId) => core.has(classId))
      );
      return;
    }
    this.selectedTournamentClassIds = new Set(playableClasses.slice(-6).map((fighterClass) => fighterClass.id));
  }

  private getTournamentModeLabel(): string {
    if (this.tournamentRunMode === "matrix") {
      return "MODE: FULL MATRIX";
    }
    if (this.tournamentRunMode === "matchup") {
      return "MODE: FOCUSED MATCHUP";
    }
    return "MODE: FOCUSED CLASS";
  }

  private getTournamentModeDescription(): string {
    if (this.tournamentRunMode === "matrix") {
      return "Subset class-vs-class tournament";
    }
    if (this.tournamentRunMode === "matchup") {
      return "One selected matchup only";
    }
    return "One class fights every selected opponent";
  }

  private drawTournamentOptions(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    this.drawOutlinedText(ctx, "Matchup Matrix", this.width / 2, 58, 36, "#ffffff", "#111119", 8, "center");
    this.drawOutlinedText(ctx, "Tournament Balance Tool", this.width / 2, 96, 21, "#242431", "#ffffff", 4, "center");

    this.tournamentClassToggleRects = [];
    ctx.fillStyle = "#f8f8fc";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(38, 132, 500, 760, 8);
    ctx.fill();
    ctx.stroke();

    this.tournamentModeButton.label = this.getTournamentModeLabel();
    this.drawMenuButton(ctx, this.tournamentModeButton, "#ffffff", "#111119", "#242431");
    ctx.fillStyle = "#242431";
    ctx.font = "800 12px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(this.getTournamentModeDescription(), 286, 159);

    if (this.tournamentRunMode === "matrix" || this.tournamentRunMode === "class") {
      if (this.tournamentRunMode === "class") {
        const fighterClass = getFighterClass(this.focusedTournamentClassId);
        this.drawOutlinedText(ctx, "Focus Class", 288, 202, 21, "#ffffff", "#111119", 5, "center");
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = fighterClass.primaryColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(112, 224, 352, 48, 8);
        ctx.fill();
        ctx.stroke();
        this.drawBallPreview(ctx, 138, 248, 15, fighterClass);
        ctx.fillStyle = "#242431";
        ctx.font = "900 18px Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(fighterClass.displayName, 166, 248);
        this.tournamentFocusedButtons[0].y = 231;
        this.tournamentFocusedButtons[1].y = 231;
        this.drawMenuButton(ctx, this.tournamentFocusedButtons[0], "#ffffff", "#111119", "#242431");
        this.drawMenuButton(ctx, this.tournamentFocusedButtons[1], "#ffffff", "#111119", "#242431");
        ctx.fillStyle = "#5d6070";
        ctx.font = "800 11px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("This class fights every selected playable opponent.", 288, 292);
      }

      const subsetTitleY = this.tournamentRunMode === "class" ? 326 : 204;
      const startY = this.tournamentRunMode === "class" ? 348 : 226;
      this.drawOutlinedText(ctx, this.tournamentRunMode === "class" ? "Opponent Subset" : "Class Subset", 288, subsetTitleY, 20, "#ffffff", "#111119", 5, "center");
      const columns = 3;
      const tileW = 146;
      const tileH = 27;
      const startX = 60;
      playableClasses.forEach((fighterClass, index) => {
        const x = startX + (index % columns) * 158;
        const y = startY + Math.floor(index / columns) * 31;
        const isFocusClass = this.tournamentRunMode === "class" && fighterClass.id === this.focusedTournamentClassId;
        const selected = this.selectedTournamentClassIds.has(fighterClass.id) && !isFocusClass;
        this.tournamentClassToggleRects.push({ x, y, w: tileW, h: tileH, classId: fighterClass.id });
        ctx.fillStyle = isFocusClass ? "#fff3b0" : selected ? "#ffffff" : "#dedee8";
        ctx.strokeStyle = selected ? fighterClass.primaryColor : "#9a9cab";
        ctx.lineWidth = selected ? 4 : 3;
        ctx.beginPath();
        ctx.roundRect(x, y, tileW, tileH, 7);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = isFocusClass ? "#d6a626" : selected ? fighterClass.secondaryColor : "#8a8d9c";
        ctx.beginPath();
        ctx.arc(x + 15, y + tileH / 2, 6, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#242431";
        ctx.font = "900 10px Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(ellipsizeText(ctx, isFocusClass ? "FOCUS" : fighterClass.displayName.replace(" Ball", ""), 110), x + 28, y + tileH / 2);
      });

      const subsetButtonY = this.tournamentRunMode === "class" ? 536 : 486;
      this.tournamentSelectAllButton.y = subsetButtonY;
      this.tournamentClearButton.y = subsetButtonY;
      this.tournamentCoreButton.y = subsetButtonY;
      this.tournamentRecentButton.y = subsetButtonY;
      this.drawMenuButton(ctx, this.tournamentSelectAllButton, "#ffffff", "#111119", "#242431");
      this.drawMenuButton(ctx, this.tournamentClearButton, "#ffffff", "#111119", "#242431");
      this.drawMenuButton(ctx, this.tournamentCoreButton, "#ffffff", "#111119", "#242431");
      this.drawMenuButton(ctx, this.tournamentRecentButton, "#ffffff", "#111119", "#242431");
    } else {
      this.drawOutlinedText(ctx, "Focused Matchup", 288, 218, 22, "#ffffff", "#111119", 5, "center");
      const labels: [string, string] = ["Fighter A", "Fighter B"];
      this.focusedTournamentClassIds.forEach((classId, index) => {
        const fighterClass = getFighterClass(classId);
        const y = index === 0 ? 244 : 314;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = fighterClass.primaryColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(112, y, 352, 48, 8);
        ctx.fill();
        ctx.stroke();
        this.drawBallPreview(ctx, 138, y + 24, 15, fighterClass);
        ctx.fillStyle = "#242431";
        ctx.font = "900 11px Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(labels[index], 166, y + 15);
        ctx.font = "900 18px Arial, sans-serif";
        ctx.fillText(fighterClass.displayName, 166, y + 34);
      });
      this.tournamentFocusedButtons.forEach((button) =>
        this.drawMenuButton(ctx, button, "#ffffff", "#111119", "#242431")
      );
    }

    const selectedCount =
      this.tournamentRunMode === "matrix"
        ? this.getSelectedTournamentClassIds().length
        : this.tournamentRunMode === "class"
          ? this.getFocusedClassOpponentIds().length
          : 2;
    const totalMatches = this.getTournamentWorkload();
    const optionButtonY = this.tournamentRunMode === "class" ? 570 : 552;
    this.tournamentOptionButtons.forEach((button) => {
      button.y = optionButtonY;
    });
    this.tournamentMirrorButton.y = optionButtonY + 60;
    const workloadY = this.tournamentRunMode === "matrix" || this.tournamentRunMode === "class" ? this.tournamentMirrorButton.y + 62 : optionButtonY + 62;
    const notesY = this.tournamentRunMode === "class" ? workloadY + 102 : workloadY + 108;
    const outputY = notesY + 116;

    this.drawOutlinedText(ctx, "Test Preset", 288, optionButtonY - 16, 20, "#242431", "#ffffff", 4, "center");
    for (const button of this.tournamentOptionButtons) {
      const selected = button.matches === this.tournamentMatchesPerMatchup;
      this.drawMenuButton(ctx, button, selected ? "#dff6ff" : "#ffffff", selected ? "#22b8ff" : "#111119", "#242431");
    }

    if (this.tournamentRunMode === "matrix" || this.tournamentRunMode === "class") {
      this.tournamentMirrorButton.label = this.tournamentIncludeMirrors ? "MIRRORS ON" : "MIRRORS OFF";
      this.drawMenuButton(
        ctx,
        this.tournamentMirrorButton,
        this.tournamentIncludeMirrors ? "#fff3b0" : "#ffffff",
        "#111119",
        "#242431"
      );
    }

    ctx.fillStyle = totalMatches > 10000 ? "#fff3b0" : "#eeeeF6";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(70, workloadY, 436, 88, 8);
    ctx.fill();
    ctx.stroke();
    this.drawOutlinedText(ctx, "Workload", 288, workloadY + 24, 18, "#ffffff", "#111119", 5, "center");
    ctx.fillStyle = "#242431";
    ctx.font = "900 12px Arial, sans-serif";
    ctx.textAlign = "center";
    if (this.tournamentRunMode === "class") {
      ctx.fillText(`Focus: ${getFighterClass(this.focusedTournamentClassId).displayName}   Opponents: ${selectedCount}`, 288, workloadY + 43);
      ctx.fillText(`Side orders: ON   Total matches: ${totalMatches.toLocaleString()}`, 288, workloadY + 62);
      ctx.fillText(this.getTournamentWorkloadLabel(totalMatches), 288, workloadY + 79);
    } else {
      ctx.fillText(`Classes selected: ${selectedCount}   Total matches: ${totalMatches.toLocaleString()}`, 288, workloadY + 49);
      ctx.fillText(`${this.getTournamentWorkloadLabel(totalMatches)} - fast simulation, no battle rendering`, 288, workloadY + 69);
    }

    const notes = [
      "Quick Scan 10 = rough, Standard 30 = quick balance, Deep 100 = slow.",
      this.tournamentRunMode === "matrix"
        ? "Matrix mode combines both side orders for each non-mirror matchup."
        : this.tournamentRunMode === "class"
          ? "Focused Class combines both side orders against each opponent."
          : "Focused Matchup tests only the selected ordered matchup.",
      totalMatches > 10000 ? "High workload: consider fewer classes or Run 30." : "Runs in batches so the UI stays responsive."
    ];
    ctx.fillStyle = "#242431";
    ctx.font = "800 12px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    notes.forEach((note, index) => ctx.fillText(note, 70, notesY + index * 24));

    if (this.tournamentRunMode !== "class") {
      ctx.fillStyle = "#eeeeF6";
      ctx.strokeStyle = "#111119";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(70, outputY, 436, 78, 8);
      ctx.fill();
      ctx.stroke();
      this.drawOutlinedText(ctx, "Output", 288, outputY + 23, 18, "#ffffff", "#111119", 5, "center");
      ctx.fillStyle = "#242431";
      ctx.font = "800 12px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Balance summary, problem matchups, focused view,", 288, outputY + 48);
      ctx.fillText("optional full matrix, and matchup details.", 288, outputY + 66);
    }
    ctx.restore();

    this.drawMenuButton(ctx, this.tournamentBackButton, "#ffffff", "#111119", "#242431");
    this.drawMenuButton(
      ctx,
      this.tournamentStartButton,
      totalMatches > 0 ? "#ffffff" : "#dedee8",
      totalMatches > 0 ? "#111119" : "#9a9cab",
      "#242431"
    );
  }

  private drawTournamentProgress(ctx: CanvasRenderingContext2D): void {
    const progress = this.tournamentProgress;
    if (!progress) {
      return;
    }

    const percent = progress.totalMatches > 0 ? progress.currentMatch / progress.totalMatches : 0;
    ctx.save();
    ctx.fillStyle = "rgba(24, 24, 32, 0.76)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#f8f8fc";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(56, 356, 464, 258, 10);
    ctx.fill();
    ctx.stroke();
    this.drawOutlinedText(ctx, "Running Tournament", this.width / 2, 396, 26, "#ffffff", "#111119", 7, "center");
    ctx.fillStyle = "#242431";
    ctx.font = "900 14px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(progress.currentLabel, this.width / 2, 434);
    ctx.fillText(
      `Match ${Math.min(progress.currentMatch, progress.totalMatches).toLocaleString()} / ${progress.totalMatches.toLocaleString()}`,
      this.width / 2,
      462
    );
    ctx.fillText(`Progress: ${Math.round(percent * 100)}%`, this.width / 2, 490);
    ctx.fillStyle = "#dedee8";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(96, 516, 384, 24, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#22b8ff";
    ctx.beginPath();
    ctx.roundRect(100, 520, Math.max(8, 376 * clamp(percent, 0, 1)), 16, 6);
    ctx.fill();
    ctx.fillStyle = "#5d6070";
    ctx.font = "800 11px Arial, sans-serif";
    ctx.fillText("Fast mode skips rendering, trails, particles, and floating text.", this.width / 2, 562);
    ctx.restore();

    this.drawMenuButton(ctx, this.tournamentCancelButton, "#ffe2e2", "#9b2e2e", "#242431");
  }

  private drawTournamentResults(ctx: CanvasRenderingContext2D): void {
    const result = this.tournamentResult;
    if (!result) {
      this.drawTournamentOptions(ctx);
      return;
    }

    this.tournamentCellRects = [];
    const focusClassId = this.getTournamentFocusClassId(result);
    ctx.save();
    this.drawOutlinedText(
      ctx,
      result.runMode === "class" ? "Focused Class Report" : "Matchup Matrix",
      this.width / 2,
      42,
      32,
      "#ffffff",
      "#111119",
      8,
      "center"
    );
    this.drawOutlinedText(
      ctx,
      `${result.matchesPerMatchup} matches per matchup${result.includeMirrors ? " + mirrors" : ""}${result.runMode === "class" ? " + side orders" : ""}`,
      this.width / 2,
      76,
      17,
      "#242431",
      "#ffffff",
      4,
      "center"
    );

    ctx.fillStyle = "#f8f8fc";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(20, 100, 536, 800, 8);
    ctx.fill();
    ctx.stroke();

    if (this.showFullTournamentMatrix) {
      this.drawMatrixTable(ctx, result, 36, 132);
      this.drawTournamentRanking(ctx, result, 42, 452);
      this.drawTournamentDetail(ctx, result, 42, 656);
    } else {
      this.drawTournamentSummaryList(ctx, result, 36, 116);
      this.drawTopProblemMatchups(ctx, result, 36, 336);
      this.drawFocusedMatchupView(ctx, result, focusClassId, 36, 502);
      this.drawTournamentDetail(ctx, result, 42, 718);
    }

    ctx.fillStyle = "#242431";
    ctx.font = "800 11px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Run 30 is noisy. Use Run 100 for balance decisions.", this.width / 2, 858);
    ctx.restore();

    this.tournamentFullMatrixButton.label = this.showFullTournamentMatrix ? "FOCUSED VIEW" : "FULL MATRIX";
    this.drawMenuButton(ctx, this.tournamentFullMatrixButton, "#eeeeF6", "#5d6070", "#242431");

    for (const button of this.tournamentResultButtons) {
      const selected = button.matches === this.tournamentMatchesPerMatchup;
      this.drawMenuButton(ctx, button, selected ? "#dff6ff" : "#ffffff", selected ? "#22b8ff" : "#111119", "#242431");
    }
    this.drawMenuButton(ctx, this.balanceBackButton, "#ffffff", "#111119", "#242431");
  }

  private getTournamentFocusClassId(result: TournamentResult): string {
    const fallback = result.runMode === "class" && result.focusClassId ? result.focusClassId : result.rankings[0]?.classId ?? result.classIds[0] ?? "";
    if (!this.selectedTournamentFocusClassId || !result.classIds.includes(this.selectedTournamentFocusClassId)) {
      this.selectedTournamentFocusClassId = fallback;
    }
    return this.selectedTournamentFocusClassId;
  }

  private cycleTournamentFocus(direction: number): void {
    const result = this.tournamentResult;
    if (!result || result.classIds.length === 0) {
      return;
    }

    const currentClassId = this.getTournamentFocusClassId(result);
    const currentIndex = Math.max(0, result.classIds.indexOf(currentClassId));
    const nextIndex = (currentIndex + direction + result.classIds.length) % result.classIds.length;
    this.selectedTournamentFocusClassId = result.classIds[nextIndex];
    this.selectedTournamentCellKey = null;
  }

  private drawTournamentSummaryList(ctx: CanvasRenderingContext2D, result: TournamentResult, x: number, y: number): void {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, 504, 206, 8);
    ctx.fill();
    ctx.stroke();

    if (result.runMode === "class" && result.focusClassId) {
      const focusClass = getFighterClass(result.focusClassId);
      const focusRanking = result.rankings.find((ranking) => ranking.classId === result.focusClassId);
      const focusRate = focusRanking?.winRate ?? 0;
      const focusStatus = balanceStatus(focusRate);
      this.drawOutlinedText(ctx, `Focused Class: ${focusClass.displayName}`, x + 252, y + 24, 18, "#ffffff", "#111119", 5, "center");
      this.drawBallPreview(ctx, x + 44, y + 58, 16, focusClass);
      ctx.fillStyle = "#242431";
      ctx.font = "900 15px Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`Overall ${Math.round(focusRate * 100)}%`, x + 70, y + 54);
      ctx.fillStyle = focusStatus.color;
      ctx.fillText(focusStatus.label, x + 190, y + 54);
      ctx.fillStyle = "#242431";
      ctx.font = "900 11px Arial, sans-serif";
      ctx.fillText(`Opponents: ${Math.max(0, result.classIds.length - 1)}   Matches/opponent: ${result.matchesPerMatchup}`, x + 70, y + 76);

      const cells = result.classIds
        .filter((classId) => classId !== result.focusClassId)
        .map((opponentId) => result.cells[tournamentKey(result.focusClassId!, opponentId)])
        .filter((cell): cell is TournamentMatchupCell => Boolean(cell));
      const problemCells = cells
        .map((cell) => ({ cell, rate: cell.rowWins / Math.max(1, cell.matches) }))
        .filter(({ rate }) => rate < 0.35 || rate > 0.65)
        .sort((a, b) => Math.abs(b.rate - 0.5) - Math.abs(a.rate - 0.5));
      ctx.font = "900 11px Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "#5d6070";
      ctx.fillText("Problem Matchups", x + 20, y + 106);
      const rows = problemCells.length > 0 ? problemCells.slice(0, 5) : [];
      if (rows.length === 0) {
        ctx.fillStyle = "#242431";
        ctx.fillText("No severe focus-class outliers detected.", x + 20, y + 130);
      } else {
        rows.forEach(({ cell, rate }, index) => {
          const rowY = y + 128 + index * 14;
          ctx.fillStyle = index % 2 === 0 ? "#f1f1f7" : "#ffffff";
          ctx.fillRect(x + 12, rowY - 7, 480, 14);
          ctx.fillStyle = rate < 0.35 ? "#246b9b" : "#9b2e2e";
          ctx.fillText(
            ellipsizeText(ctx, `${shortClassName(cell.rowClassName)} ${rate < 0.35 ? "struggles vs" : "may be strong vs"} ${shortClassName(cell.columnClassName)}: ${Math.round(rate * 100)}%`, 462),
            x + 20,
            rowY
          );
        });
      }
      ctx.restore();
      return;
    }

    this.drawOutlinedText(ctx, "Class Balance Summary", x + 252, y + 24, 18, "#ffffff", "#111119", 5, "center");
    ctx.font = "900 11px Arial, sans-serif";
    ctx.textBaseline = "middle";
    const rowH = 14;
    result.rankings.forEach((ranking, index) => {
      const rowY = y + 47 + index * rowH;
      if (rowY > y + 188) {
        return;
      }
      const status = balanceStatus(ranking.winRate);
      ctx.fillStyle = index % 2 === 0 ? "#f1f1f7" : "#ffffff";
      ctx.fillRect(x + 12, rowY - 7, 480, rowH);
      ctx.fillStyle = "#242431";
      ctx.textAlign = "left";
      ctx.fillText(`${index + 1}. ${ranking.className}`, x + 20, rowY);
      ctx.textAlign = "right";
      ctx.fillText(`${Math.round(ranking.winRate * 100)}%`, x + 276, rowY);
      ctx.fillStyle = status.color;
      ctx.fillText(status.label, x + 484, rowY);
    });
    ctx.restore();
  }

  private drawTopProblemMatchups(ctx: CanvasRenderingContext2D, result: TournamentResult, x: number, y: number): void {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, 504, 150, 8);
    ctx.fill();
    ctx.stroke();

    this.drawOutlinedText(ctx, "Top Problem Matchups", x + 252, y + 24, 18, "#ffffff", "#111119", 5, "center");
    ctx.font = "900 12px Arial, sans-serif";
    ctx.textBaseline = "middle";
    const problems = topProblemMatchups(result.cells, 5);
    const rows = problems.length > 0 ? problems : ["No hard counters detected in this run."];
    rows.forEach((line, index) => {
      const rowY = y + 50 + index * 18;
      ctx.fillStyle = index % 2 === 0 ? "#f1f1f7" : "#ffffff";
      ctx.fillRect(x + 12, rowY - 9, 480, 18);
      ctx.fillStyle = index === 0 && problems.length > 0 ? "#9b2e2e" : "#242431";
      ctx.textAlign = "left";
      ctx.fillText(ellipsizeText(ctx, String(line), 464), x + 20, rowY);
    });
    ctx.restore();
  }

  private drawFocusedMatchupView(
    ctx: CanvasRenderingContext2D,
    result: TournamentResult,
    focusClassId: string,
    x: number,
    y: number
  ): void {
    const focusClass = getFighterClass(focusClassId);
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = focusClass.primaryColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, 504, 198, 8);
    ctx.fill();
    ctx.stroke();

    this.drawOutlinedText(ctx, result.runMode === "class" ? "Focused Class Matchups" : "Focused Matchup View", x + 252, y + 24, 18, "#ffffff", "#111119", 5, "center");
    this.tournamentFocusPrevButton.y = y + 34;
    this.tournamentFocusNextButton.y = y + 34;
    if (result.runMode !== "class") {
      this.drawMenuButton(ctx, this.tournamentFocusPrevButton, "#ffffff", "#111119", "#242431");
      this.drawMenuButton(ctx, this.tournamentFocusNextButton, "#ffffff", "#111119", "#242431");
    }
    this.drawOutlinedText(ctx, focusClass.displayName, x + 252, y + 54, 18, focusClass.secondaryColor, "#111119", 5, "center");
    const focusRanking = result.rankings.find((ranking) => ranking.classId === focusClassId);
    const focusStatus = balanceStatus(focusRanking?.winRate ?? 0.5);
    ctx.fillStyle = focusStatus.color;
    ctx.font = "900 10px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `${Math.round((focusRanking?.winRate ?? 0.5) * 100)}% overall - ${focusStatus.label}`,
      x + 252,
      y + 70
    );

    ctx.font = "900 12px Arial, sans-serif";
    ctx.textBaseline = "middle";
    const opponents = result.classIds.filter((classId) => classId !== focusClassId);
    if (result.runMode === "class") {
      const rowH = 12;
      const colW = 238;
      opponents.forEach((opponentId, index) => {
        const column = index >= 8 ? 1 : 0;
        const row = column === 0 ? index : index - 8;
        const key = tournamentKey(focusClassId, opponentId);
        const cell = result.cells[key];
        const cellX = x + 14 + column * colW;
        const rowY = y + 84 + row * rowH;
        if (rowY > y + 186) {
          return;
        }
        this.tournamentCellRects.push({ x: cellX, y: rowY - 5, w: colW - 6, h: 11, key });
        const rate = cell ? cell.rowWins / Math.max(1, cell.matches) : 0.5;
        const selected = this.selectedTournamentCellKey === key;
        ctx.fillStyle = selected ? "#dff6ff" : index % 2 === 0 ? "#f1f1f7" : "#ffffff";
        ctx.fillRect(cellX, rowY - 5, colW - 6, 11);
        ctx.fillStyle = matrixColor(rate);
        ctx.fillRect(cellX + 150, rowY - 4, 48, 8);
        ctx.fillStyle = "#242431";
        ctx.font = "900 10px Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`vs ${shortClassName(getFighterClass(opponentId).displayName)}`, cellX + 8, rowY);
        ctx.textAlign = "right";
        ctx.fillText(cell ? `${Math.round(rate * 100)}%` : "-", cellX + colW - 14, rowY);
      });
      ctx.restore();
      return;
    }

    opponents.forEach((opponentId, index) => {
      const key = tournamentKey(focusClassId, opponentId);
      const cell = result.cells[key];
      const rowY = y + 84 + index * 11;
      if (rowY > y + 186) {
        return;
      }
      this.tournamentCellRects.push({ x: x + 14, y: rowY - 5, w: 476, h: 11, key });
      const rate = cell ? cell.rowWins / Math.max(1, cell.matches) : 0.5;
      const selected = this.selectedTournamentCellKey === key;
      ctx.fillStyle = selected ? "#dff6ff" : index % 2 === 0 ? "#f1f1f7" : "#ffffff";
      ctx.fillRect(x + 14, rowY - 5, 476, 11);
      ctx.fillStyle = matrixColor(rate);
      ctx.fillRect(x + 358, rowY - 4, 92, 8);
      ctx.fillStyle = "#242431";
      ctx.textAlign = "left";
      ctx.fillText(`vs ${shortClassName(getFighterClass(opponentId).displayName)}`, x + 24, rowY);
      ctx.textAlign = "right";
      ctx.fillText(cell ? `${Math.round(rate * 100)}%` : "-", x + 480, rowY);
    });
    ctx.restore();
  }

  private drawMatrixTable(ctx: CanvasRenderingContext2D, result: TournamentResult, x: number, y: number): void {
    const rowLabelW = 86;
    const cellW = Math.floor((492 - rowLabelW) / Math.max(1, result.classIds.length));
    const cellH = Math.max(24, Math.min(38, Math.floor(250 / Math.max(1, result.classIds.length))));

    this.drawOutlinedText(ctx, "Win Rate Matrix", x + 250, y - 15, 19, "#ffffff", "#111119", 5, "center");

    ctx.save();
    ctx.font = result.classIds.length > 5 ? "900 9px Arial, sans-serif" : "900 11px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    result.classIds.forEach((classId, index) => {
      const name = shortClassName(getFighterClass(classId).displayName);
      ctx.fillStyle = "#242431";
      ctx.fillText(name, x + rowLabelW + index * cellW + cellW / 2, y + 14);
    });

    result.classIds.forEach((rowId, rowIndex) => {
      const rowY = y + 30 + rowIndex * cellH;
      ctx.fillStyle = "#242431";
      ctx.textAlign = "right";
      ctx.fillText(shortClassName(getFighterClass(rowId).displayName), x + rowLabelW - 8, rowY + cellH / 2);
      ctx.textAlign = "center";

      result.classIds.forEach((columnId, columnIndex) => {
        const cellX = x + rowLabelW + columnIndex * cellW;
        const key = tournamentKey(rowId, columnId);
        const cell = result.cells[key];
        const clickable = Boolean(cell);
        const selected = this.selectedTournamentCellKey === key;
        this.tournamentCellRects.push({ x: cellX, y: rowY, w: cellW - 4, h: cellH - 4, key });

        ctx.fillStyle = cell ? matrixColor(cell.rowWins / Math.max(1, cell.matches)) : "#dedee8";
        ctx.strokeStyle = selected ? "#111119" : "rgba(17,17,25,0.45)";
        ctx.lineWidth = selected ? 4 : 2;
        ctx.beginPath();
        ctx.roundRect(cellX, rowY, cellW - 4, cellH - 4, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#111119";
        ctx.font = cell?.mirror ? "900 9px Arial, sans-serif" : result.classIds.length > 5 ? "900 11px Arial, sans-serif" : "900 13px Arial, sans-serif";
        const text = cell ? `${Math.round((cell.rowWins / Math.max(1, cell.matches)) * 100)}%` : "-";
        ctx.fillText(clickable && cell?.mirror ? `A ${text}` : text, cellX + (cellW - 4) / 2, rowY + cellH / 2);
      });
    });

    ctx.font = "800 11px Arial, sans-serif";
    ctx.fillStyle = "#242431";
    ctx.textAlign = "left";
    ctx.fillText("Green 45-55 balanced   Amber uneven   Red problematic", x, y + 34 + result.classIds.length * cellH);
    ctx.restore();
  }

  private drawTournamentRanking(ctx: CanvasRenderingContext2D, result: TournamentResult, x: number, y: number): void {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, 492, 182, 8);
    ctx.fill();
    ctx.stroke();

    this.drawOutlinedText(ctx, "Class Balance Summary", x + 246, y + 25, 19, "#ffffff", "#111119", 5, "center");
    ctx.font = "900 11px Arial, sans-serif";
    ctx.textBaseline = "middle";
    result.rankings.forEach((ranking, index) => {
      const rowY = y + 48 + index * 13;
      if (rowY > y + 168) {
        return;
      }
      const status = balanceStatus(ranking.winRate);
      ctx.fillStyle = index % 2 === 0 ? "#f1f1f7" : "#ffffff";
      ctx.fillRect(x + 12, rowY - 6, 468, 12);
      ctx.fillStyle = "#242431";
      ctx.textAlign = "left";
      ctx.fillText(`${index + 1}. ${ranking.className}`, x + 20, rowY);
      ctx.textAlign = "right";
      ctx.fillText(`${Math.round(ranking.winRate * 100)}%`, x + 268, rowY);
      ctx.fillStyle = status.color;
      ctx.fillText(status.label, x + 468, rowY);
    });
    ctx.restore();
  }

  private drawTournamentDetail(ctx: CanvasRenderingContext2D, result: TournamentResult, x: number, y: number): void {
    const selected =
      (this.selectedTournamentCellKey && result.cells[this.selectedTournamentCellKey]) ??
      Object.values(result.cells).find((cell) => !cell.mirror) ??
      Object.values(result.cells)[0];

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, 492, 128, 8);
    ctx.fill();
    ctx.stroke();

    if (!selected) {
      this.drawOutlinedText(ctx, "Click a matchup row for details", x + 246, y + 64, 20, "#242431", "#ffffff", 4, "center");
      ctx.restore();
      return;
    }

    this.drawOutlinedText(
      ctx,
      `${selected.rowClassName} vs ${selected.columnClassName}`,
      x + 246,
      y + 24,
      18,
      "#ffffff",
      "#111119",
      5,
      "center"
    );

    const rowRate = selected.rowWins / Math.max(1, selected.matches);
    const leftLines = [
      [`${selected.rowClassName} wins`, `${selected.rowWins}/${selected.matches}`],
      ["Win rate", `${Math.round(rowRate * 100)}%`],
      ["Proj / Contact", `${selected.averageStats[0].projectileDamage.toFixed(1)} / ${selected.averageStats[0].contactDamage.toFixed(1)}`],
      ["Ability / DoT", `${selected.averageStats[0].abilityDamage.toFixed(1)} / ${(selected.averageStats[0].burnDamage + selected.averageStats[0].poisonDamage).toFixed(1)}`],
      this.formatSpecialTournamentDetail(selected.averageStats[0]),
      ["Hits / Abilities", `${selected.averageStats[0].projectileHits.toFixed(1)} / ${selected.averageStats[0].abilityUses.toFixed(1)}`]
    ];
    const rightLines = [
      [`${selected.columnClassName} wins`, `${selected.columnWins}/${selected.matches}`],
      ["Avg duration", `${selected.averageDuration.toFixed(1)}s`],
      ["Proj / Contact", `${selected.averageStats[1].projectileDamage.toFixed(1)} / ${selected.averageStats[1].contactDamage.toFixed(1)}`],
      ["Ability / DoT", `${selected.averageStats[1].abilityDamage.toFixed(1)} / ${(selected.averageStats[1].burnDamage + selected.averageStats[1].poisonDamage).toFixed(1)}`],
      this.formatSpecialTournamentDetail(selected.averageStats[1]),
      ["Hits / Abilities", `${selected.averageStats[1].projectileHits.toFixed(1)} / ${selected.averageStats[1].abilityUses.toFixed(1)}`]
    ];

    this.drawMiniDetailRows(ctx, leftLines, x + 18, y + 48, 218);
    this.drawMiniDetailRows(ctx, rightLines, x + 256, y + 48, 218);
    ctx.restore();
  }

  private formatSpecialTournamentDetail(stats: FighterStats): string[] {
    if (stats.glassChargesBlocked > 0 || stats.prismShiftUses > 0 || stats.glassChargesRestored > 0) {
      return [
        "Glass B/R/P",
        `${stats.glassChargesBlocked.toFixed(1)} / ${stats.glassChargesRestored.toFixed(1)} / ${stats.prismShiftUses.toFixed(1)}`
      ];
    }
    if (stats.shadowStepUses > 0 || stats.ninjaContactHits > 0 || stats.smokeReflexEvades > 0) {
      return [
        "Ninja D/H/E",
        `${stats.shadowStepDashHits.toFixed(1)} / ${stats.ninjaContactHits.toFixed(1)} / ${stats.smokeReflexEvades.toFixed(1)}`
      ];
    }
    if (stats.monkContactHits > 0 || stats.palmBurstUses > 0) {
      return [
        "Monk H/P/C",
        `${stats.monkContactHits.toFixed(1)} / ${stats.palmBurstHits.toFixed(1)} / ${stats.maxComboReached.toFixed(1)}`
      ];
    }
    if (stats.berserkerContactHits > 0 || stats.rageBreakUses > 0) {
      return [
        "Rage H/R/U",
        `${stats.berserkerContactHits.toFixed(1)} / ${Math.round(stats.maxRageReached * 100)}% / ${stats.rageBreakUses.toFixed(1)}`
      ];
    }
    if (stats.drillContactHits > 0 || stats.piercingDrillUses > 0) {
      return [
        "Drill H/B/P",
        `${stats.drillContactHits.toFixed(1)} / ${stats.armorBreakStacksApplied.toFixed(1)} / ${stats.defensePiercedDamage.toFixed(1)}`
      ];
    }
    if (stats.spikeContactHits > 0 || stats.thornDamageDealt > 0 || stats.wallSpikeChargesGained > 0) {
      return [
        "Spike H/T/B",
        `${stats.spikeContactHits.toFixed(1)} / ${stats.thornDamageDealt.toFixed(1)} / ${stats.wallSpikeBonusDamage.toFixed(1)}`
      ];
    }
    if (stats.crusherContactHits > 0 || stats.impactBonusDamage > 0) {
      return ["Crush H/B/U", `${stats.highImpactHits.toFixed(1)} / ${stats.impactBonusDamage.toFixed(1)} / ${stats.crushingForceUses.toFixed(1)}`];
    }
    if (stats.soulReapUses > 0 || stats.deathMarksApplied > 0) {
      const averageMarks = stats.deathMarksOnSoulReap / Math.max(1, stats.soulReapUses);
      return ["Reap D/M/U", `${stats.soulReapDamage.toFixed(1)} / ${averageMarks.toFixed(1)} / ${stats.soulReapUses.toFixed(1)}`];
    }
    if (stats.ricochetShotsFired > 0 || stats.bankShotBouncedHits > 0) {
      return ["Bank H/B/U", `${stats.bankShotBouncedHits.toFixed(1)} / ${stats.ricochetProjectileBounces.toFixed(1)} / ${stats.bankShotBarrageUses.toFixed(1)}`];
    }
    return ["Prevent/Counter", `${stats.armorDamagePrevented.toFixed(1)}/${stats.guardCounters.toFixed(1)}`];
  }

  private drawMiniDetailRows(ctx: CanvasRenderingContext2D, rows: string[][], x: number, y: number, w: number): void {
    ctx.save();
    ctx.font = "800 9px Arial, sans-serif";
    ctx.textBaseline = "middle";
    rows.forEach((row, index) => {
      const rowY = y + index * 14;
      ctx.fillStyle = index % 2 === 0 ? "#f1f1f7" : "#ffffff";
      ctx.fillRect(x, rowY - 7, w, 14);
      ctx.fillStyle = "#242431";
      ctx.textAlign = "left";
      ctx.fillText(row[0], x + 8, rowY);
      ctx.textAlign = "right";
      ctx.fillText(row[1], x + w - 8, rowY);
    });
    ctx.restore();
  }

  private drawLeagueIntroPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.save();
    ctx.fillStyle = "#f8f8fc";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    this.drawOutlinedText(ctx, "League Run", x + w / 2, y + 24, 22, "#ffffff", "#111119", 5, "center");
    ctx.fillStyle = "#242431";
    ctx.font = "800 13px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Clear 5 rounds plus a boss. Choose 1 upgrade after each win.", x + w / 2, y + 48);
    ctx.fillText("Each class keeps its own HP identity; upgrades modify future rounds.", x + w / 2, y + 68);
    ctx.restore();
  }

  private drawDevToolsPanel(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = "rgba(32, 33, 42, 0.94)";
    ctx.strokeStyle = "#111119";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(28, 818, 520, 176, 8);
    ctx.fill();
    ctx.stroke();

    this.drawOutlinedText(ctx, "DEV TOOLS", 54, 846, 17, "#dff6ff", "#111119", 4, "left");
    ctx.fillStyle = "#d7d9e6";
    ctx.font = "800 12px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Internal balance testing only. Toggle with Shift+D.", 54, 862);
    ctx.fillText(
      `A: ${getFighterClass(this.selectedClassIds[0]).displayName}   B: ${getFighterClass(this.selectedClassIds[1]).displayName}`,
      54,
      880
    );

    this.drawMenuButton(ctx, this.devMatrixButton, "#eeeeF6", "#5d6070", "#242431");
    this.drawOutlinedText(ctx, "Balance Test", 288, 922, 14, "#d7d9e6", "#111119", 3, "center");
    for (const button of this.balanceTestButtons) {
      this.drawMenuButton(ctx, button, "#eeeeF6", "#5d6070", "#242431");
    }
    ctx.restore();
  }

  private drawPauseOverlay(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.34)";
    ctx.fillRect(this.arena.x + 4, this.arena.y + 4, this.arena.w - 8, this.arena.h - 8);
    this.drawOutlinedText(ctx, "PAUSED", this.width / 2, 468, 44, "#ffffff", "#111119", 9, "center");
    ctx.restore();
  }

  private drawDebug(ctx: CanvasRenderingContext2D): void {
    const well = this.gravityWells[0];
    const wellEnemy = well ? this.getEnemyOf(well.owner) : null;
    const wellBaseSpeed = wellEnemy ? wellEnemy.classDef.targetMoveSpeed ?? wellEnemy.classDef.baseMoveSpeed : 0;
    const wellEffectiveSpeed = wellEnemy ? wellBaseSpeed * wellEnemy.runModifiers.moveSpeedMultiplier * getGravitySpeedMultiplier(wellEnemy) : 0;
    ctx.save();
    ctx.fillStyle = "rgba(17,17,25,0.78)";
    ctx.fillRect(18, 150, 330, 336);
    ctx.fillStyle = "#f6fbff";
    ctx.font = "700 13px Consolas, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const lines = [
      `FPS: ${this.fps.toFixed(1)}  Mode: ${this.physicsTestMode ? "PHYSICS" : "BATTLE"}`,
      `Time: ${this.time.toFixed(1)}s`,
      `${this.fighters[0].classDef.displayName}: (${this.fighters[0].position.x.toFixed(0)}, ${this.fighters[0].position.y.toFixed(0)})`,
      `Vel: ${this.fighters[0].velocity.x.toFixed(0)}, ${this.fighters[0].velocity.y.toFixed(0)}  v${this.fighters[0].distanceTravelSpeed.toFixed(0)}`,
      `Wall ${this.fighters[0].lastWallHit} Lock ${this.fighters[0].wallBounceLockTime.toFixed(2)}`,
      `Reason ${this.fighters[0].lastVelocityChangeReason}`,
      `Mass ${this.fighters[0].mass.toFixed(2)} Rest ${this.fighters[0].restitution.toFixed(2)}`,
      `${this.fighters[1].classDef.displayName}: (${this.fighters[1].position.x.toFixed(0)}, ${this.fighters[1].position.y.toFixed(0)})`,
      `Vel: ${this.fighters[1].velocity.x.toFixed(0)}, ${this.fighters[1].velocity.y.toFixed(0)}  v${this.fighters[1].distanceTravelSpeed.toFixed(0)}`,
      `Wall ${this.fighters[1].lastWallHit} Lock ${this.fighters[1].wallBounceLockTime.toFixed(2)}`,
      `Reason ${this.fighters[1].lastVelocityChangeReason}`,
      `Mass ${this.fighters[1].mass.toFixed(2)} Rest ${this.fighters[1].restitution.toFixed(2)}`,
      `Gravity Well: ${well ? "active" : "none"} inside=${well?.enemyInside ? "true" : "false"}`,
      `Well dist/r: ${well ? `${well.lastDistance.toFixed(0)}/${well.radius.toFixed(0)}` : "-"}`,
      `Well dmg: none  speed x${well ? well.speedMultiplier.toFixed(2) : "-"}`,
      `Enemy speed: ${well ? `${wellEffectiveSpeed.toFixed(0)}/${wellBaseSpeed.toFixed(0)}` : "-"}`,
      `Enemy charge x: ${wellEnemy ? getGravityAbilityChargeMultiplier(wellEnemy).toFixed(2) : "-"}`
    ];
    lines.forEach((line, index) => ctx.fillText(line, 28, 160 + index * 20));
    ctx.restore();
  }

  private drawPhysicsDebug(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.lineWidth = 3;
    for (const fighter of this.fighters) {
      const scale = 0.38;
      ctx.strokeStyle = fighter.classDef.secondaryColor;
      ctx.beginPath();
      ctx.moveTo(fighter.position.x, fighter.position.y);
      ctx.lineTo(fighter.position.x + fighter.velocity.x * scale, fighter.position.y + fighter.velocity.y * scale);
      ctx.stroke();
    }

    if (this.debugCollisionNormal) {
      const collision = this.debugCollisionNormal;
      ctx.strokeStyle = "#ff3d7f";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(collision.point.x, collision.point.y);
      ctx.lineTo(collision.point.x + collision.normal.x * 70, collision.point.y + collision.normal.y * 70);
      ctx.stroke();
    }
    if (this.debugWallHit) {
      const wall = this.debugWallHit;
      ctx.strokeStyle = "#58d7ff";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(wall.point.x, wall.point.y);
      ctx.lineTo(wall.point.x + wall.normal.x * 70, wall.point.y + wall.normal.y * 70);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawLightningEffects(ctx: CanvasRenderingContext2D): void {
    for (const lightning of this.lightningEffects) {
      const alpha = Math.max(0, lightning.life / lightning.maxLife);
      const dx = lightning.to.x - lightning.from.x;
      const dy = lightning.to.y - lightning.from.y;
      const length = Math.hypot(dx, dy) || 1;
      const normal = { x: -dy / length, y: dx / length };
      const segments = 9;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let pass = 0; pass < 2; pass += 1) {
        ctx.strokeStyle = pass === 0 ? lightning.secondaryColor : lightning.color;
        ctx.lineWidth = pass === 0 ? 8 : 3;
        ctx.beginPath();
        ctx.moveTo(lightning.from.x, lightning.from.y);
        for (let i = 1; i < segments; i += 1) {
          const t = i / segments;
          const jitter = randomRange(-18, 18) * (1 - Math.abs(t - 0.5) * 0.7);
          ctx.lineTo(
            lightning.from.x + dx * t + normal.x * jitter,
            lightning.from.y + dy * t + normal.y * jitter
          );
        }
        ctx.lineTo(lightning.to.x, lightning.to.y);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawToxicClouds(ctx: CanvasRenderingContext2D): void {
    for (const cloud of this.toxicClouds) {
      const alpha = Math.max(0, cloud.duration / cloud.maxDuration);
      ctx.save();
      ctx.globalAlpha = Math.min(0.7, 0.18 + alpha * 0.32);
      const gradient = ctx.createRadialGradient(cloud.position.x, cloud.position.y, 8, cloud.position.x, cloud.position.y, cloud.radius);
      gradient.addColorStop(0, "rgba(158, 255, 88, 0.42)");
      gradient.addColorStop(0.55, "rgba(123, 77, 255, 0.24)");
      gradient.addColorStop(1, "rgba(78, 222, 84, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cloud.position.x, cloud.position.y, cloud.radius, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(158, 255, 88, 0.38)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cloud.position.x, cloud.position.y, cloud.radius * (0.88 + Math.sin(this.time * 5) * 0.03), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawGravityWells(ctx: CanvasRenderingContext2D): void {
    for (const well of this.gravityWells) {
      const alpha = Math.max(0, well.duration / well.maxDuration);
      ctx.save();
      ctx.globalAlpha = Math.min(0.78, 0.22 + alpha * 0.34);
      const gradient = ctx.createRadialGradient(well.position.x, well.position.y, 10, well.position.x, well.position.y, well.radius);
      gradient.addColorStop(0, "rgba(189, 164, 255, 0.36)");
      gradient.addColorStop(0.52, "rgba(72, 39, 130, 0.24)");
      gradient.addColorStop(1, "rgba(31, 15, 58, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(well.position.x, well.position.y, well.radius, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = "rgba(189, 164, 255, 0.5)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i += 1) {
        const pulse = 0.58 + i * 0.18 + Math.sin(this.time * 3.2 + i) * 0.025;
        ctx.beginPath();
        ctx.arc(well.position.x, well.position.y, well.radius * pulse, 0, TAU);
        ctx.stroke();
      }

      for (let i = 0; i < 6; i += 1) {
        const angle = this.time * (0.85 + i * 0.08) + i * (TAU / 6);
        const orbitRadius = well.radius * (0.34 + (i % 3) * 0.17);
        ctx.fillStyle = i % 2 === 0 ? "rgba(245, 241, 255, 0.85)" : "rgba(189, 164, 255, 0.7)";
        ctx.beginPath();
        ctx.arc(
          well.position.x + Math.cos(angle) * orbitRadius,
          well.position.y + Math.sin(angle) * orbitRadius,
          3.5,
          0,
          TAU
        );
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawMenuButton(ctx: CanvasRenderingContext2D, button: ButtonRect, fill: string, stroke: string, textColor: string): void {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.w, button.h, 8);
    ctx.fill();
    ctx.stroke();
    this.drawOutlinedText(
      ctx,
      button.label,
      button.x + button.w / 2,
      button.y + button.h / 2 + 1,
      button.h > 50 ? 22 : 20,
      textColor,
      "#ffffff",
      4,
      "center"
    );
    ctx.restore();
  }

  private drawModeButton(ctx: CanvasRenderingContext2D, button: ButtonRect, selected: boolean): void {
    ctx.save();
    ctx.fillStyle = selected ? "#dff6ff" : "#ffffff";
    ctx.strokeStyle = selected ? "#22b8ff" : "#111119";
    ctx.lineWidth = selected ? 5 : 4;
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.w, button.h, 8);
    ctx.fill();
    ctx.stroke();
    this.drawOutlinedText(ctx, button.label, button.x + button.w / 2, button.y + button.h / 2 + 1, 13, "#242431", "#ffffff", 3, "center");
    ctx.restore();
  }

  private drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number
  ): void {
    ctx.save();
    ctx.fillStyle = "#252633";
    ctx.font = "700 11px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const words = text.split(" ");
    let line = "";
    let lineIndex = 0;
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        if (lineIndex === maxLines - 1) {
          ctx.fillText(ellipsizeText(ctx, `${line}...`, maxWidth), x, y + lineIndex * lineHeight);
          ctx.restore();
          return;
        }
        ctx.fillText(line, x, y + lineIndex * lineHeight);
        line = word;
        lineIndex += 1;
        if (lineIndex >= maxLines) {
          ctx.restore();
          return;
        }
      } else {
        line = testLine;
      }
    }

    if (line && lineIndex < maxLines) {
      ctx.fillText(line, x, y + lineIndex * lineHeight);
    }
    ctx.restore();
  }

  private drawOutlinedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    size: number,
    fill: string,
    stroke: string,
    strokeWidth: number,
    align: CanvasTextAlign
  ): void {
    ctx.save();
    ctx.font = `900 ${size}px Arial, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.code === "KeyD" && event.shiftKey) {
      this.devToolsVisible = !this.devToolsVisible;
      try {
        localStorage.setItem("afterimageWarDevTools", String(this.devToolsVisible));
      } catch {
        // Dev tools persistence is optional.
      }
      return;
    }

    if (this.gameState === "class-select") {
      if (this.classDetailOpen) {
        if (event.code === "Escape") {
          this.classDetailOpen = false;
          event.preventDefault();
        } else if (event.code === "Digit1") {
          this.classDetailTab = "overview";
        } else if (event.code === "Digit2") {
          this.classDetailTab = "skill";
        } else if (event.code === "Digit3") {
          this.classDetailTab = "build";
        }
        return;
      }

      if (this.selectedMode === "league" && (event.code === "KeyA" || event.code === "ArrowLeft")) {
        event.preventDefault();
        this.cycleSelectedClass(0, -1);
      } else if (this.selectedMode === "league" && (event.code === "KeyD" || event.code === "ArrowRight")) {
        event.preventDefault();
        this.cycleSelectedClass(0, 1);
      } else if (event.code === "KeyA") {
        this.cycleSelectedClass(0, -1);
      } else if (event.code === "KeyD") {
        this.cycleSelectedClass(0, 1);
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        this.cycleSelectedClass(1, -1);
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        this.cycleSelectedClass(1, 1);
      } else if (event.code === "Enter") {
        if (this.selectedMode === "league") {
          this.startLeagueRun();
        } else {
          this.restart();
        }
      }
      return;
    }

    if (this.gameState === "league-reward") {
      if (event.code === "Enter") {
        this.confirmLeagueUpgrade();
      } else if (event.code === "Escape") {
        this.backToClassSelect();
      }
      return;
    }

    if (this.gameState === "ko-freeze") {
      if (event.code === "Enter" || event.code === "Space") {
        event.preventDefault();
        this.koTimer = 0;
        this.finishKoFreeze();
      } else if (event.code === "Escape") {
        this.backToClassSelect();
      }
      return;
    }

    if (this.gameState === "tournament-options") {
      if (event.code === "Escape") {
        this.backToClassSelect();
      } else if (event.code === "Enter") {
        void this.runTournamentTest();
      } else if (this.tournamentRunMode === "class" && (event.code === "ArrowLeft" || event.code === "KeyA")) {
        event.preventDefault();
        this.cycleFocusedClass(-1);
      } else if (this.tournamentRunMode === "class" && (event.code === "ArrowRight" || event.code === "KeyD")) {
        event.preventDefault();
        this.cycleFocusedClass(1);
      } else if (this.tournamentRunMode === "matchup" && event.code === "ArrowLeft") {
        event.preventDefault();
        this.cycleFocusedTournamentClass(1, -1);
      } else if (this.tournamentRunMode === "matchup" && event.code === "ArrowRight") {
        event.preventDefault();
        this.cycleFocusedTournamentClass(1, 1);
      } else if (this.tournamentRunMode === "matchup" && event.code === "KeyA") {
        this.cycleFocusedTournamentClass(0, -1);
      } else if (this.tournamentRunMode === "matchup" && event.code === "KeyD") {
        this.cycleFocusedTournamentClass(0, 1);
      }
      return;
    }

    if (this.gameState === "tournament-running") {
      if (event.code === "Escape") {
        this.tournamentCancelRequested = true;
      }
      return;
    }

    if (event.code === "Escape") {
      this.backToClassSelect();
    } else if (event.code === "Space" && this.gameState === "battle") {
      event.preventDefault();
      this.paused = !this.paused;
    } else if (event.code === "KeyR") {
      this.restart();
    } else if (event.code === "KeyF" && this.gameState === "battle") {
      for (const fighter of this.fighters) {
        fighter.ability.forceFull();
      }
    } else if (event.code === "KeyD") {
      this.debug = !this.debug;
    } else if (event.code === "KeyP") {
      this.physicsTestMode = !this.physicsTestMode;
      this.restart();
    }
  }

  private handlePointer(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.width / rect.width;
    const scaleY = this.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    if (this.gameState === "class-select") {
      if (this.classDetailOpen) {
        if (pointInRect(x, y, this.classDetailCloseButton)) {
          this.classDetailOpen = false;
          return;
        }
        for (const button of this.classDetailTabButtons) {
          if (pointInRect(x, y, button)) {
            this.classDetailTab = button.tab;
            return;
          }
        }
        return;
      }

      if (pointInRect(x, y, this.quickModeButton)) {
        this.selectedMode = "quick";
        return;
      }
      if (pointInRect(x, y, this.leagueModeButton)) {
        this.selectedMode = "league";
        return;
      }
      for (const button of this.classSelectorButtons) {
        if (pointInRect(x, y, button)) {
          this.cycleSelectedClass(button.fighterIndex, button.direction);
          return;
        }
      }
      for (const button of this.classDetailButtons) {
        if (pointInRect(x, y, button)) {
          this.classDetailOpen = true;
          this.classDetailClassId = this.selectedClassIds[button.fighterIndex];
          this.classDetailTab = "overview";
          return;
        }
      }
      for (const card of this.classSelectCards) {
        if (!card.locked && pointInRect(x, y, card)) {
          this.selectedClassIds[card.fighterIndex] = card.classId;
          return;
        }
      }

      if (this.devToolsVisible) {
        if (pointInRect(x, y, this.devMatrixButton)) {
          this.gameState = "tournament-options";
          return;
        }
        for (const button of this.balanceTestButtons) {
          if (pointInRect(x, y, button)) {
            this.runBalanceTest(button.matches);
            return;
          }
        }
        if (pointInRect(x, y, { x: 28, y: 818, w: 520, h: 176 })) {
          return;
        }
      }

      if (this.selectedMode === "league" && pointInRect(x, y, this.startLeagueButton)) {
        this.startLeagueRun();
        return;
      }

      if (this.selectedMode === "quick" && pointInRect(x, y, this.startBattleButton)) {
        this.restart();
        return;
      }

      return;
    }

    if (this.gameState === "league-reward") {
      if (pointInRect(x, y, this.leagueContinueButton)) {
        this.confirmLeagueUpgrade();
        return;
      }
      for (const card of this.leagueRewardCards) {
        if (pointInRect(x, y, card)) {
          this.chooseLeagueUpgrade(card.upgradeId);
          return;
        }
      }
      return;
    }

    if (this.gameState === "ko-freeze") {
      this.koTimer = 0;
      this.finishKoFreeze();
      return;
    }

    if (this.gameState === "league-over" || this.gameState === "league-cleared") {
      if (pointInRect(x, y, this.leagueRetryButton)) {
        this.startLeagueRun();
      } else if (pointInRect(x, y, this.leagueBackButton)) {
        this.backToClassSelect();
      }
      return;
    }

    if (this.gameState === "tournament-options") {
      if (pointInRect(x, y, this.tournamentModeButton)) {
        this.tournamentRunMode =
          this.tournamentRunMode === "matrix" ? "matchup" : this.tournamentRunMode === "matchup" ? "class" : "matrix";
        return;
      }
      for (const button of this.tournamentOptionButtons) {
        if (pointInRect(x, y, button)) {
          this.tournamentMatchesPerMatchup = button.matches;
          return;
        }
      }
      for (const toggle of this.tournamentClassToggleRects) {
        if (pointInRect(x, y, toggle)) {
          if (this.selectedTournamentClassIds.has(toggle.classId)) {
            this.selectedTournamentClassIds.delete(toggle.classId);
          } else {
            this.selectedTournamentClassIds.add(toggle.classId);
          }
          return;
        }
      }
      if (this.tournamentRunMode === "class") {
        for (const button of this.tournamentFocusedButtons.slice(0, 2)) {
          if (pointInRect(x, y, button)) {
            this.cycleFocusedClass(button.direction);
            return;
          }
        }
      } else if (this.tournamentRunMode === "matchup") {
        for (const button of this.tournamentFocusedButtons) {
          if (pointInRect(x, y, button)) {
            this.cycleFocusedTournamentClass(button.fighterIndex, button.direction);
            return;
          }
        }
      }
      if (pointInRect(x, y, this.tournamentSelectAllButton)) {
        this.setTournamentClassSubset("all");
        return;
      }
      if (pointInRect(x, y, this.tournamentClearButton)) {
        this.setTournamentClassSubset("clear");
        return;
      }
      if (pointInRect(x, y, this.tournamentCoreButton)) {
        this.setTournamentClassSubset("core");
        return;
      }
      if (pointInRect(x, y, this.tournamentRecentButton)) {
        this.setTournamentClassSubset("recent");
        return;
      }
      if ((this.tournamentRunMode === "matrix" || this.tournamentRunMode === "class") && pointInRect(x, y, this.tournamentMirrorButton)) {
        this.tournamentIncludeMirrors = !this.tournamentIncludeMirrors;
      } else if (pointInRect(x, y, this.tournamentStartButton)) {
        void this.runTournamentTest();
      } else if (pointInRect(x, y, this.tournamentBackButton)) {
        this.backToClassSelect();
      }
      return;
    }

    if (this.gameState === "tournament-running") {
      if (pointInRect(x, y, this.tournamentCancelButton)) {
        this.tournamentCancelRequested = true;
      }
      return;
    }

    if (this.gameState === "battle-ended") {
      if (pointInRect(x, y, this.restartSameButton)) {
        this.restart();
      } else if (pointInRect(x, y, this.classSelectButton)) {
        this.backToClassSelect();
      } else if (this.devToolsVisible && pointInRect(x, y, this.resultBalanceButton)) {
        this.runBalanceTest(30);
      }
      return;
    }

    if (this.gameState === "balance-results") {
      for (const button of this.balanceTestButtons) {
        if (pointInRect(x, y, button)) {
          this.runBalanceTest(button.matches);
          return;
        }
      }
      if (pointInRect(x, y, this.balanceBackButton)) {
        this.backToClassSelect();
      }
      return;
    }

    if (this.gameState === "tournament-results") {
      if (
        !this.showFullTournamentMatrix &&
        this.tournamentResult?.runMode !== "class" &&
        pointInRect(x, y, this.tournamentFocusPrevButton)
      ) {
        this.cycleTournamentFocus(-1);
        return;
      }
      if (
        !this.showFullTournamentMatrix &&
        this.tournamentResult?.runMode !== "class" &&
        pointInRect(x, y, this.tournamentFocusNextButton)
      ) {
        this.cycleTournamentFocus(1);
        return;
      }
      if (pointInRect(x, y, this.tournamentFullMatrixButton)) {
        this.showFullTournamentMatrix = !this.showFullTournamentMatrix;
        this.selectedTournamentCellKey = null;
        return;
      }
      for (const cell of this.tournamentCellRects) {
        if (pointInRect(x, y, cell) && this.tournamentResult?.cells[cell.key]) {
          this.selectedTournamentCellKey = cell.key;
          return;
        }
      }
      for (const button of this.tournamentResultButtons) {
        if (pointInRect(x, y, button)) {
          this.tournamentMatchesPerMatchup = button.matches;
          void this.runTournamentTest();
          return;
        }
      }
      if (pointInRect(x, y, this.balanceBackButton)) {
        this.backToClassSelect();
      }
      return;
    }

    const button = this.restartButton;

    if (pointInRect(x, y, button)) {
      this.restart();
    }
  }

  private cycleSelectedClass(fighterIndex: 0 | 1, direction: number): void {
    const currentIndex = playableClasses.findIndex((fighterClass) => fighterClass.id === this.selectedClassIds[fighterIndex]);
    const nextIndex = (currentIndex + direction + playableClasses.length) % playableClasses.length;
    this.selectedClassIds[fighterIndex] = playableClasses[nextIndex].id;
  }
}

function wallNameFromNormal(normal: Vec2): string {
  if (Math.abs(normal.x) > Math.abs(normal.y)) {
    return normal.x > 0 ? "left" : "right";
  }

  if (Math.abs(normal.y) > 0) {
    return normal.y > 0 ? "top" : "bottom";
  }

  return "none";
}

function makeVelocity(x: number, y: number, speed: number): Vec2 {
  const length = Math.hypot(x, y) || 1;
  return {
    x: (x / length) * speed,
    y: (y / length) * speed
  };
}

function pointInRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function cloneStats(stats: FighterStats): FighterStats {
  return {
    damageDealt: stats.damageDealt,
    damageTaken: stats.damageTaken,
    healingDone: stats.healingDone,
    healingReceived: stats.healingReceived,
    lifestealHealing: stats.lifestealHealing,
    explosionDamage: stats.explosionDamage,
    projectileDamage: stats.projectileDamage,
    contactDamage: stats.contactDamage,
    dashDamage: stats.dashDamage,
    burnDamage: stats.burnDamage,
    poisonDamage: stats.poisonDamage,
    counterDamage: stats.counterDamage,
    abilityDamage: stats.abilityDamage,
    collisionDamage: stats.collisionDamage,
    unknownDamage: stats.unknownDamage,
    projectileHits: stats.projectileHits,
    contactHits: stats.contactHits,
    dashHits: stats.dashHits,
    abilityHits: stats.abilityHits,
    counterHits: stats.counterHits,
    fighterCollisions: stats.fighterCollisions,
    wallBounces: stats.wallBounces,
    abilityUses: stats.abilityUses,
    statusTicks: stats.statusTicks,
    bombsPlaced: stats.bombsPlaced,
    bombsExploded: stats.bombsExploded,
    explosionHits: stats.explosionHits,
    decoysCreated: stats.decoysCreated,
    decoysDestroyed: stats.decoysDestroyed,
    attacksAbsorbedByDecoys: stats.attacksAbsorbedByDecoys,
    projectileEvades: stats.projectileEvades,
    mirrorSplitUses: stats.mirrorSplitUses,
    shatterShotDamage: stats.shatterShotDamage,
    phaseReflectionTriggers: stats.phaseReflectionTriggers,
    damagePreventedByPhaseReflection: stats.damagePreventedByPhaseReflection,
    projectilesBlocked: stats.projectilesBlocked,
    orbitShardsConsumed: stats.orbitShardsConsumed,
    orbitShardsRegenerated: stats.orbitShardsRegenerated,
    magneticStormUses: stats.magneticStormUses,
    stormShardHits: stats.stormShardHits,
    stormDamage: stats.stormDamage,
    ricochetShotsFired: stats.ricochetShotsFired,
    ricochetProjectileBounces: stats.ricochetProjectileBounces,
    bankShotHits: stats.bankShotHits,
    bankShotBouncedHits: stats.bankShotBouncedHits,
    perfectBankHits: stats.perfectBankHits,
    ricochetBonusDamage: stats.ricochetBonusDamage,
    bankMeterGained: stats.bankMeterGained,
    bankShotBarrageUses: stats.bankShotBarrageUses,
    deathMarksApplied: stats.deathMarksApplied,
    maxDeathMarksReached: stats.maxDeathMarksReached,
    soulReapUses: stats.soulReapUses,
    soulReapDamage: stats.soulReapDamage,
    deathMarksOnSoulReap: stats.deathMarksOnSoulReap,
    executeBonusTriggers: stats.executeBonusTriggers,
    marksConsumed: stats.marksConsumed,
    crusherContactHits: stats.crusherContactHits,
    impactBonusDamage: stats.impactBonusDamage,
    crushingForceUses: stats.crushingForceUses,
    highImpactHits: stats.highImpactHits,
    collisionDamageReduced: stats.collisionDamageReduced,
    spikeContactHits: stats.spikeContactHits,
    thornDamageDealt: stats.thornDamageDealt,
    spikeArmorUses: stats.spikeArmorUses,
    spikeArmorUptime: stats.spikeArmorUptime,
    spikeArmorDamageBonus: stats.spikeArmorDamageBonus,
    reflectedDamage: stats.reflectedDamage,
    wallSpikeChargesGained: stats.wallSpikeChargesGained,
    wallSpikeChargesConsumed: stats.wallSpikeChargesConsumed,
    wallSpikeBonusDamage: stats.wallSpikeBonusDamage,
    bristleGuardDamagePrevented: stats.bristleGuardDamagePrevented,
    monkContactHits: stats.monkContactHits,
    comboStacksGained: stats.comboStacksGained,
    maxComboReached: stats.maxComboReached,
    palmBurstUses: stats.palmBurstUses,
    palmBurstHits: stats.palmBurstHits,
    palmBurstDamage: stats.palmBurstDamage,
    comboBonusDamage: stats.comboBonusDamage,
    focusStepTriggers: stats.focusStepTriggers,
    flowGuardDamagePrevented: stats.flowGuardDamagePrevented,
    berserkerContactHits: stats.berserkerContactHits,
    rageAveragePercent: stats.rageAveragePercent,
    maxRageReached: stats.maxRageReached,
    rageBreakUses: stats.rageBreakUses,
    rageBonusDamage: stats.rageBonusDamage,
    bloodRushTriggers: stats.bloodRushTriggers,
    lowHpDamageDealt: stats.lowHpDamageDealt,
    drillContactHits: stats.drillContactHits,
    armorBreakStacksApplied: stats.armorBreakStacksApplied,
    pierceDamageBonus: stats.pierceDamageBonus,
    defensePiercedDamage: stats.defensePiercedDamage,
    piercingDrillUses: stats.piercingDrillUses,
    spinUpChargesUsed: stats.spinUpChargesUsed,
    ninjaContactHits: stats.ninjaContactHits,
    shadowStepUses: stats.shadowStepUses,
    shadowStepDashHits: stats.shadowStepDashHits,
    shadowStepTotalDamage: stats.shadowStepTotalDamage,
    smokeReflexEvades: stats.smokeReflexEvades,
    wallShadowTriggers: stats.wallShadowTriggers,
    wallShadowBonusDamage: stats.wallShadowBonusDamage,
    glassChargesBlocked: stats.glassChargesBlocked,
    glassChargesRestored: stats.glassChargesRestored,
    glassChargeBreaks: stats.glassChargeBreaks,
    prismShiftUses: stats.prismShiftUses,
    damagePreventedByGlass: stats.damagePreventedByGlass,
    timeAtZeroCharges: stats.timeAtZeroCharges,
    wallBouncesTowardCharge: stats.wallBouncesTowardCharge,
    armorChargesConsumed: stats.armorChargesConsumed,
    armorChargesRegenerated: stats.armorChargesRegenerated,
    armorDamagePrevented: stats.armorDamagePrevented,
    guardCounters: stats.guardCounters,
    burnUptime: stats.burnUptime,
    poisonUptime: stats.poisonUptime,
    slowUptime: stats.slowUptime
  };
}

function addStats(total: FighterStats, stats: FighterStats): void {
  total.damageDealt += stats.damageDealt;
  total.damageTaken += stats.damageTaken;
  total.healingDone += stats.healingDone;
  total.healingReceived += stats.healingReceived;
  total.lifestealHealing += stats.lifestealHealing;
  total.explosionDamage += stats.explosionDamage;
  total.projectileDamage += stats.projectileDamage;
  total.contactDamage += stats.contactDamage;
  total.dashDamage += stats.dashDamage;
  total.burnDamage += stats.burnDamage;
  total.poisonDamage += stats.poisonDamage;
  total.counterDamage += stats.counterDamage;
  total.abilityDamage += stats.abilityDamage;
  total.collisionDamage += stats.collisionDamage;
  total.unknownDamage += stats.unknownDamage;
  total.projectileHits += stats.projectileHits;
  total.contactHits += stats.contactHits;
  total.dashHits += stats.dashHits;
  total.abilityHits += stats.abilityHits;
  total.counterHits += stats.counterHits;
  total.fighterCollisions += stats.fighterCollisions;
  total.wallBounces += stats.wallBounces;
  total.abilityUses += stats.abilityUses;
  total.statusTicks += stats.statusTicks;
  total.bombsPlaced += stats.bombsPlaced;
  total.bombsExploded += stats.bombsExploded;
  total.explosionHits += stats.explosionHits;
  total.decoysCreated += stats.decoysCreated;
  total.decoysDestroyed += stats.decoysDestroyed;
  total.attacksAbsorbedByDecoys += stats.attacksAbsorbedByDecoys;
  total.projectileEvades += stats.projectileEvades;
  total.mirrorSplitUses += stats.mirrorSplitUses;
  total.shatterShotDamage += stats.shatterShotDamage;
  total.phaseReflectionTriggers += stats.phaseReflectionTriggers;
  total.damagePreventedByPhaseReflection += stats.damagePreventedByPhaseReflection;
  total.projectilesBlocked += stats.projectilesBlocked;
  total.orbitShardsConsumed += stats.orbitShardsConsumed;
  total.orbitShardsRegenerated += stats.orbitShardsRegenerated;
  total.magneticStormUses += stats.magneticStormUses;
  total.stormShardHits += stats.stormShardHits;
  total.stormDamage += stats.stormDamage;
  total.ricochetShotsFired += stats.ricochetShotsFired;
  total.ricochetProjectileBounces += stats.ricochetProjectileBounces;
  total.bankShotHits += stats.bankShotHits;
  total.bankShotBouncedHits += stats.bankShotBouncedHits;
  total.perfectBankHits += stats.perfectBankHits;
  total.ricochetBonusDamage += stats.ricochetBonusDamage;
  total.bankMeterGained += stats.bankMeterGained;
  total.bankShotBarrageUses += stats.bankShotBarrageUses;
  total.deathMarksApplied += stats.deathMarksApplied;
  total.maxDeathMarksReached += stats.maxDeathMarksReached;
  total.soulReapUses += stats.soulReapUses;
  total.soulReapDamage += stats.soulReapDamage;
  total.deathMarksOnSoulReap += stats.deathMarksOnSoulReap;
  total.executeBonusTriggers += stats.executeBonusTriggers;
  total.marksConsumed += stats.marksConsumed;
  total.crusherContactHits += stats.crusherContactHits;
  total.impactBonusDamage += stats.impactBonusDamage;
  total.crushingForceUses += stats.crushingForceUses;
  total.highImpactHits += stats.highImpactHits;
  total.collisionDamageReduced += stats.collisionDamageReduced;
  total.spikeContactHits += stats.spikeContactHits;
  total.thornDamageDealt += stats.thornDamageDealt;
  total.spikeArmorUses += stats.spikeArmorUses;
  total.spikeArmorUptime += stats.spikeArmorUptime;
  total.spikeArmorDamageBonus += stats.spikeArmorDamageBonus;
  total.reflectedDamage += stats.reflectedDamage;
  total.wallSpikeChargesGained += stats.wallSpikeChargesGained;
  total.wallSpikeChargesConsumed += stats.wallSpikeChargesConsumed;
  total.wallSpikeBonusDamage += stats.wallSpikeBonusDamage;
  total.bristleGuardDamagePrevented += stats.bristleGuardDamagePrevented;
  total.monkContactHits += stats.monkContactHits;
  total.comboStacksGained += stats.comboStacksGained;
  total.maxComboReached += stats.maxComboReached;
  total.palmBurstUses += stats.palmBurstUses;
  total.palmBurstHits += stats.palmBurstHits;
  total.palmBurstDamage += stats.palmBurstDamage;
  total.comboBonusDamage += stats.comboBonusDamage;
  total.focusStepTriggers += stats.focusStepTriggers;
  total.flowGuardDamagePrevented += stats.flowGuardDamagePrevented;
  total.berserkerContactHits += stats.berserkerContactHits;
  total.rageAveragePercent += stats.rageAveragePercent;
  total.maxRageReached += stats.maxRageReached;
  total.rageBreakUses += stats.rageBreakUses;
  total.rageBonusDamage += stats.rageBonusDamage;
  total.bloodRushTriggers += stats.bloodRushTriggers;
  total.lowHpDamageDealt += stats.lowHpDamageDealt;
  total.drillContactHits += stats.drillContactHits;
  total.armorBreakStacksApplied += stats.armorBreakStacksApplied;
  total.pierceDamageBonus += stats.pierceDamageBonus;
  total.defensePiercedDamage += stats.defensePiercedDamage;
  total.piercingDrillUses += stats.piercingDrillUses;
  total.spinUpChargesUsed += stats.spinUpChargesUsed;
  total.ninjaContactHits += stats.ninjaContactHits;
  total.shadowStepUses += stats.shadowStepUses;
  total.shadowStepDashHits += stats.shadowStepDashHits;
  total.shadowStepTotalDamage += stats.shadowStepTotalDamage;
  total.smokeReflexEvades += stats.smokeReflexEvades;
  total.wallShadowTriggers += stats.wallShadowTriggers;
  total.wallShadowBonusDamage += stats.wallShadowBonusDamage;
  total.glassChargesBlocked += stats.glassChargesBlocked;
  total.glassChargesRestored += stats.glassChargesRestored;
  total.glassChargeBreaks += stats.glassChargeBreaks;
  total.prismShiftUses += stats.prismShiftUses;
  total.damagePreventedByGlass += stats.damagePreventedByGlass;
  total.timeAtZeroCharges += stats.timeAtZeroCharges;
  total.wallBouncesTowardCharge += stats.wallBouncesTowardCharge;
  total.armorChargesConsumed += stats.armorChargesConsumed;
  total.armorChargesRegenerated += stats.armorChargesRegenerated;
  total.armorDamagePrevented += stats.armorDamagePrevented;
  total.guardCounters += stats.guardCounters;
  total.burnUptime += stats.burnUptime;
  total.poisonUptime += stats.poisonUptime;
  total.slowUptime += stats.slowUptime;
}

function averageStats(stats: FighterStats, divisor: number): FighterStats {
  const safeDivisor = Math.max(1, divisor);
  const averaged = createFighterStats();
  for (const key of Object.keys(averaged) as Array<keyof FighterStats>) {
    averaged[key] = stats[key] / safeDivisor;
  }
  return averaged;
}

function addScaledStats(total: FighterStats, stats: FighterStats, scale: number): void {
  total.damageDealt += stats.damageDealt * scale;
  total.damageTaken += stats.damageTaken * scale;
  total.healingDone += stats.healingDone * scale;
  total.healingReceived += stats.healingReceived * scale;
  total.lifestealHealing += stats.lifestealHealing * scale;
  total.explosionDamage += stats.explosionDamage * scale;
  total.projectileDamage += stats.projectileDamage * scale;
  total.contactDamage += stats.contactDamage * scale;
  total.dashDamage += stats.dashDamage * scale;
  total.burnDamage += stats.burnDamage * scale;
  total.poisonDamage += stats.poisonDamage * scale;
  total.counterDamage += stats.counterDamage * scale;
  total.abilityDamage += stats.abilityDamage * scale;
  total.collisionDamage += stats.collisionDamage * scale;
  total.unknownDamage += stats.unknownDamage * scale;
  total.projectileHits += stats.projectileHits * scale;
  total.contactHits += stats.contactHits * scale;
  total.dashHits += stats.dashHits * scale;
  total.abilityHits += stats.abilityHits * scale;
  total.counterHits += stats.counterHits * scale;
  total.fighterCollisions += stats.fighterCollisions * scale;
  total.wallBounces += stats.wallBounces * scale;
  total.abilityUses += stats.abilityUses * scale;
  total.statusTicks += stats.statusTicks * scale;
  total.bombsPlaced += stats.bombsPlaced * scale;
  total.bombsExploded += stats.bombsExploded * scale;
  total.explosionHits += stats.explosionHits * scale;
  total.decoysCreated += stats.decoysCreated * scale;
  total.decoysDestroyed += stats.decoysDestroyed * scale;
  total.attacksAbsorbedByDecoys += stats.attacksAbsorbedByDecoys * scale;
  total.projectileEvades += stats.projectileEvades * scale;
  total.mirrorSplitUses += stats.mirrorSplitUses * scale;
  total.shatterShotDamage += stats.shatterShotDamage * scale;
  total.phaseReflectionTriggers += stats.phaseReflectionTriggers * scale;
  total.damagePreventedByPhaseReflection += stats.damagePreventedByPhaseReflection * scale;
  total.projectilesBlocked += stats.projectilesBlocked * scale;
  total.orbitShardsConsumed += stats.orbitShardsConsumed * scale;
  total.orbitShardsRegenerated += stats.orbitShardsRegenerated * scale;
  total.magneticStormUses += stats.magneticStormUses * scale;
  total.stormShardHits += stats.stormShardHits * scale;
  total.stormDamage += stats.stormDamage * scale;
  total.ricochetShotsFired += stats.ricochetShotsFired * scale;
  total.ricochetProjectileBounces += stats.ricochetProjectileBounces * scale;
  total.bankShotHits += stats.bankShotHits * scale;
  total.bankShotBouncedHits += stats.bankShotBouncedHits * scale;
  total.perfectBankHits += stats.perfectBankHits * scale;
  total.ricochetBonusDamage += stats.ricochetBonusDamage * scale;
  total.bankMeterGained += stats.bankMeterGained * scale;
  total.bankShotBarrageUses += stats.bankShotBarrageUses * scale;
  total.deathMarksApplied += stats.deathMarksApplied * scale;
  total.maxDeathMarksReached += stats.maxDeathMarksReached * scale;
  total.soulReapUses += stats.soulReapUses * scale;
  total.soulReapDamage += stats.soulReapDamage * scale;
  total.deathMarksOnSoulReap += stats.deathMarksOnSoulReap * scale;
  total.executeBonusTriggers += stats.executeBonusTriggers * scale;
  total.marksConsumed += stats.marksConsumed * scale;
  total.crusherContactHits += stats.crusherContactHits * scale;
  total.impactBonusDamage += stats.impactBonusDamage * scale;
  total.crushingForceUses += stats.crushingForceUses * scale;
  total.highImpactHits += stats.highImpactHits * scale;
  total.collisionDamageReduced += stats.collisionDamageReduced * scale;
  total.spikeContactHits += stats.spikeContactHits * scale;
  total.thornDamageDealt += stats.thornDamageDealt * scale;
  total.spikeArmorUses += stats.spikeArmorUses * scale;
  total.spikeArmorUptime += stats.spikeArmorUptime * scale;
  total.spikeArmorDamageBonus += stats.spikeArmorDamageBonus * scale;
  total.reflectedDamage += stats.reflectedDamage * scale;
  total.wallSpikeChargesGained += stats.wallSpikeChargesGained * scale;
  total.wallSpikeChargesConsumed += stats.wallSpikeChargesConsumed * scale;
  total.wallSpikeBonusDamage += stats.wallSpikeBonusDamage * scale;
  total.bristleGuardDamagePrevented += stats.bristleGuardDamagePrevented * scale;
  total.monkContactHits += stats.monkContactHits * scale;
  total.comboStacksGained += stats.comboStacksGained * scale;
  total.maxComboReached += stats.maxComboReached * scale;
  total.palmBurstUses += stats.palmBurstUses * scale;
  total.palmBurstHits += stats.palmBurstHits * scale;
  total.palmBurstDamage += stats.palmBurstDamage * scale;
  total.comboBonusDamage += stats.comboBonusDamage * scale;
  total.focusStepTriggers += stats.focusStepTriggers * scale;
  total.flowGuardDamagePrevented += stats.flowGuardDamagePrevented * scale;
  total.berserkerContactHits += stats.berserkerContactHits * scale;
  total.rageAveragePercent += stats.rageAveragePercent * scale;
  total.maxRageReached += stats.maxRageReached * scale;
  total.rageBreakUses += stats.rageBreakUses * scale;
  total.rageBonusDamage += stats.rageBonusDamage * scale;
  total.bloodRushTriggers += stats.bloodRushTriggers * scale;
  total.lowHpDamageDealt += stats.lowHpDamageDealt * scale;
  total.drillContactHits += stats.drillContactHits * scale;
  total.armorBreakStacksApplied += stats.armorBreakStacksApplied * scale;
  total.pierceDamageBonus += stats.pierceDamageBonus * scale;
  total.defensePiercedDamage += stats.defensePiercedDamage * scale;
  total.piercingDrillUses += stats.piercingDrillUses * scale;
  total.spinUpChargesUsed += stats.spinUpChargesUsed * scale;
  total.ninjaContactHits += stats.ninjaContactHits * scale;
  total.shadowStepUses += stats.shadowStepUses * scale;
  total.shadowStepDashHits += stats.shadowStepDashHits * scale;
  total.shadowStepTotalDamage += stats.shadowStepTotalDamage * scale;
  total.smokeReflexEvades += stats.smokeReflexEvades * scale;
  total.wallShadowTriggers += stats.wallShadowTriggers * scale;
  total.wallShadowBonusDamage += stats.wallShadowBonusDamage * scale;
  total.glassChargesBlocked += stats.glassChargesBlocked * scale;
  total.glassChargesRestored += stats.glassChargesRestored * scale;
  total.glassChargeBreaks += stats.glassChargeBreaks * scale;
  total.prismShiftUses += stats.prismShiftUses * scale;
  total.damagePreventedByGlass += stats.damagePreventedByGlass * scale;
  total.timeAtZeroCharges += stats.timeAtZeroCharges * scale;
  total.wallBouncesTowardCharge += stats.wallBouncesTowardCharge * scale;
  total.armorChargesConsumed += stats.armorChargesConsumed * scale;
  total.armorChargesRegenerated += stats.armorChargesRegenerated * scale;
  total.armorDamagePrevented += stats.armorDamagePrevented * scale;
  total.guardCounters += stats.guardCounters * scale;
  total.burnUptime += stats.burnUptime * scale;
  total.poisonUptime += stats.poisonUptime * scale;
  total.slowUptime += stats.slowUptime * scale;
}

function tournamentKey(rowClassId: string, columnClassId: string): string {
  return `${rowClassId}->${columnClassId}`;
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function createTournamentCell(
  rowClassId: string,
  columnClassId: string,
  rowClassName: string,
  columnClassName: string,
  matches: number,
  rowWins: number,
  columnWins: number,
  averageDuration: number,
  averageRemainingHp: [number, number],
  averageStats: [FighterStats, FighterStats],
  mirror: boolean
): TournamentMatchupCell {
  return {
    rowClassId,
    columnClassId,
    rowClassName,
    columnClassName,
    matches,
    rowWins,
    columnWins,
    averageDuration,
    averageRemainingHp,
    averageStats,
    mirror
  };
}

function shortClassName(displayName: string): string {
  return displayName.replace(" Ball", "");
}

function matrixColor(winRate: number): string {
  const distance = Math.abs(winRate - 0.5);
  if (distance <= 0.05) {
    return "#b8f2cf";
  }
  if (distance <= 0.15) {
    return "#ffe09a";
  }
  return winRate > 0.5 ? "#ffaaa5" : "#b8d8ff";
}

function balanceStatus(winRate: number): { label: string; color: string } {
  if (winRate >= 0.66) {
    return { label: "Too Strong", color: "#9b2e2e" };
  }
  if (winRate >= 0.56) {
    return { label: "Slightly Strong", color: "#9a6a00" };
  }
  if (winRate >= 0.45) {
    return { label: "Balanced", color: "#207647" };
  }
  if (winRate >= 0.35) {
    return { label: "Slightly Weak", color: "#8a6a08" };
  }
  return { label: "Too Weak", color: "#24558f" };
}

function topProblemMatchups(cells: Record<string, TournamentMatchupCell>, limit: number): string[] {
  return Object.values(cells)
    .filter((cell) => !cell.mirror)
    .filter((cell) => cell.rowClassId < cell.columnClassId)
    .map((cell) => {
      const rowRate = cell.rowWins / Math.max(1, cell.matches);
      const winnerName = rowRate >= 0.5 ? cell.rowClassName : cell.columnClassName;
      const loserName = rowRate >= 0.5 ? cell.columnClassName : cell.rowClassName;
      const winnerRate = rowRate >= 0.5 ? rowRate : 1 - rowRate;
      return {
        text: `${winnerName} beats ${loserName} ${Math.round(winnerRate * 100)}%`,
        severity: Math.abs(winnerRate - 0.5)
      };
    })
    .sort((a, b) => b.severity - a.severity)
    .slice(0, limit)
    .map((problem) => problem.text);
}

function createTournamentWarnings(
  cells: Record<string, TournamentMatchupCell>,
  rankings: TournamentRanking[]
): string[] {
  const warnings: string[] = [];
  const strongest = rankings[0];
  const weakest = rankings[rankings.length - 1];

  for (const ranking of rankings) {
    if (ranking.winRate > 0.85) {
      warnings.push(`Critical: ${ranking.className} is overpowered at ${Math.round(ranking.winRate * 100)}%.`);
    } else if (ranking.winRate > 0.7) {
      warnings.push(`Overpowered: ${ranking.className} is at ${Math.round(ranking.winRate * 100)}%.`);
    } else if (ranking.winRate < 0.15) {
      warnings.push(`Critical: ${ranking.className} is too weak at ${Math.round(ranking.winRate * 100)}%.`);
    } else if (ranking.winRate < 0.3) {
      warnings.push(`Weak: ${ranking.className} is at ${Math.round(ranking.winRate * 100)}%.`);
    }
  }

  if (warnings.length === 0) {
    if (strongest && strongest.winRate > 0.65) {
      warnings.push(`${strongest.className} is slightly high overall.`);
    }
    if (weakest && weakest.winRate < 0.35) {
      warnings.push(`${weakest.className} is slightly low overall.`);
    }
  }

  const problematic = Object.values(cells)
    .filter((cell) => !cell.mirror)
    .filter((cell) => {
      const rate = cell.rowWins / Math.max(1, cell.matches);
      return rate <= 0.15 || rate >= 0.85;
    })
    .sort((a, b) => Math.abs(b.rowWins / b.matches - 0.5) - Math.abs(a.rowWins / a.matches - 0.5))
    .slice(0, 5);

  for (const cell of problematic) {
    const rate = cell.rowWins / Math.max(1, cell.matches);
    if (rate >= 0.85) {
      warnings.push(`Hard counter: ${cell.rowClassName} beats ${cell.columnClassName} ${Math.round(rate * 100)}%.`);
    } else if (rate <= 0.15) {
      warnings.push(`Hard counter: ${cell.columnClassName} beats ${cell.rowClassName} ${Math.round((1 - rate) * 100)}%.`);
    } else if (rate > 0.65) {
      warnings.push(`${cell.rowClassName} favors ${cell.columnClassName} ${Math.round(rate * 100)}%.`);
    } else if (rate < 0.35) {
      warnings.push(`${cell.rowClassName} struggles into ${cell.columnClassName} ${Math.round(rate * 100)}%.`);
    }
  }

  if (warnings.length === 0) {
    const uneven = Object.values(cells).find((cell) => {
      const rate = cell.rowWins / Math.max(1, cell.matches);
      return !cell.mirror && (rate < 0.45 || rate > 0.55);
    });
    if (uneven) {
      warnings.push("Some matchups are slightly uneven; inspect matrix cells.");
    }
  }

  return warnings;
}

function ellipsizeText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  const suffix = "...";
  let clipped = text;
  while (clipped.length > 0 && ctx.measureText(`${clipped}${suffix}`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped.trimEnd()}${suffix}`;
}
