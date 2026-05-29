import type { Fighter } from "./Fighter";
import { Vec2, clamp } from "../utils/math";

export class PortalGate {
  owner: Fighter;
  position: Vec2;
  normal: Vec2;
  radius: number;
  duration: number;
  life: number;
  linked = false;
  pulseTimer = 0;

  constructor(options: { owner: Fighter; position: Vec2; normal: Vec2; radius: number; duration: number }) {
    this.owner = options.owner;
    this.position = { ...options.position };
    this.normal = { ...options.normal };
    this.radius = options.radius;
    this.duration = options.duration;
    this.life = options.duration;
  }

  update(dt: number): void {
    this.life = Math.max(0, this.life - dt);
    this.pulseTimer = Math.max(0, this.pulseTimer - dt);
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const alpha = clamp(this.life / Math.max(0.001, this.duration), 0, 1);
    const pulse = 1 + Math.sin(time * 8 + this.position.x * 0.01) * 0.08;
    const ringRadius = this.radius * pulse;
    const pulseProgress = this.pulseTimer > 0 ? 1 - this.pulseTimer / 0.32 : 1;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.globalAlpha = alpha;

    ctx.fillStyle = this.linked ? "rgba(48, 217, 255, 0.1)" : "rgba(95, 98, 255, 0.08)";
    ctx.strokeStyle = this.linked ? "rgba(48, 217, 255, 0.88)" : "rgba(129, 99, 255, 0.74)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = this.linked ? "rgba(255, 255, 255, 0.72)" : "rgba(255, 255, 255, 0.44)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius * 0.62, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = this.linked ? "rgba(151, 88, 255, 0.66)" : "rgba(48, 217, 255, 0.42)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const offset = i * (Math.PI * 2 / 3) + time * 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius * (0.78 + i * 0.1), offset, offset + 1.05);
      ctx.stroke();
    }

    ctx.fillStyle = this.linked ? "rgba(255,255,255,0.72)" : "rgba(48,217,255,0.44)";
    for (let i = 0; i < 5; i += 1) {
      const sparkleAngle = time * (1.3 + i * 0.09) + i * (Math.PI * 2 / 5);
      const sparkleRadius = ringRadius + 4 + Math.sin(time * 5 + i) * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(sparkleAngle) * sparkleRadius, Math.sin(sparkleAngle) * sparkleRadius, this.linked ? 2.2 : 1.7, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.pulseTimer > 0) {
      ctx.globalAlpha = alpha * (1 - pulseProgress);
      ctx.strokeStyle = this.linked ? "rgba(48, 217, 255, 0.92)" : "rgba(129, 99, 255, 0.76)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius + pulseProgress * 26, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  get active(): boolean {
    return this.life > 0 && !this.owner.defeated;
  }
}
