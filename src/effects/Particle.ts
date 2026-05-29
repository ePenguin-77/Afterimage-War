import { Vec2, copyVec, fromAngle, randomRange } from "../utils/math";

export type ParticleKind = "spark" | "circle" | "slash" | "shard" | "damageText";

export class Particle {
  position: Vec2;
  velocity: Vec2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  kind: ParticleKind;
  rotation: number;
  text: string;

  constructor(options: {
    position: Vec2;
    velocity?: Vec2;
    life: number;
    color: string;
    size: number;
    kind: ParticleKind;
    rotation?: number;
    text?: string;
  }) {
    this.position = copyVec(options.position);
    this.velocity = options.velocity ? copyVec(options.velocity) : { x: 0, y: 0 };
    this.life = options.life;
    this.maxLife = options.life;
    this.color = options.color;
    this.size = options.size;
    this.kind = options.kind;
    this.rotation = options.rotation ?? 0;
    this.text = options.text ?? "";
  }

  update(dt: number): void {
    this.life -= dt;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.velocity.x *= Math.pow(0.08, dt);
    this.velocity.y *= Math.pow(0.08, dt);
    this.rotation += dt * 8;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const t = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = t;
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;

    if (this.kind === "damageText") {
      ctx.globalAlpha = Math.min(1, t * 1.5);
      ctx.font = "900 24px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#11111b";
      ctx.strokeText(this.text, 0, 0);
      ctx.fillStyle = this.color;
      ctx.fillText(this.text, 0, 0);
    } else if (this.kind === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, this.size * (1.2 - t), 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.kind === "slash") {
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-this.size, -this.size * 0.4);
      ctx.quadraticCurveTo(0, this.size * 0.8, this.size, -this.size * 0.2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.roundRect(-this.size * 0.5, -this.size * 0.16, this.size, this.size * 0.32, this.size * 0.16);
      ctx.fill();
    }

    ctx.restore();
  }

  get alive(): boolean {
    return this.life > 0;
  }
}

export function burstParticles(
  list: Particle[],
  position: Vec2,
  color: string,
  count: number,
  speedMin: number,
  speedMax: number,
  kind: ParticleKind = "spark"
): void {
  for (let i = 0; i < count; i += 1) {
    const angle = randomRange(0, Math.PI * 2);
    list.push(
      new Particle({
        position,
        velocity: fromAngle(angle, randomRange(speedMin, speedMax)),
        life: randomRange(0.28, 0.62),
        color,
        size: randomRange(8, 18),
        kind,
        rotation: angle
      })
    );
  }
}
