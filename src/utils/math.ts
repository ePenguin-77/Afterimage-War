export type Vec2 = {
  x: number;
  y: number;
};

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export const TAU = Math.PI * 2;

export function vec(x = 0, y = 0): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function mul(v: Vec2, n: number): Vec2 {
  return { x: v.x * n, y: v.y * n };
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len <= 0.0001) {
    return { x: 0, y: 0 };
  }

  return { x: v.x / len, y: v.y / len };
}

export function safeNormalize(v: Vec2, fallback: Vec2 = { x: 1, y: 0 }): Vec2 {
  const len = length(v);
  if (len <= 0.0001 || !Number.isFinite(len)) {
    return normalize(fallback);
  }

  return { x: v.x / len, y: v.y / len };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function randomUnitVector(): Vec2 {
  return fromAngle(randomRange(0, TAU));
}

export function clampVectorMagnitude(v: Vec2, min: number, max: number): Vec2 {
  const len = length(v);
  if (len <= 0.0001 || !Number.isFinite(len)) {
    return { x: min, y: 0 };
  }

  if (len < min) {
    const scale = min / len;
    return { x: v.x * scale, y: v.y * scale };
  }

  if (len <= max) {
    return { x: v.x, y: v.y };
  }

  const scale = max / len;
  return { x: v.x * scale, y: v.y * scale };
}

export function clampVectorLength(v: Vec2, max: number): Vec2 {
  return clampVectorMagnitude(v, 0, max);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function angleTo(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function fromAngle(angle: number, magnitude = 1): Vec2 {
  return { x: Math.cos(angle) * magnitude, y: Math.sin(angle) * magnitude };
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomPointInRect(rect: Rect, inset = 0): Vec2 {
  return {
    x: randomRange(rect.x + inset, rect.x + rect.w - inset),
    y: randomRange(rect.y + inset, rect.y + rect.h - inset)
  };
}

export function circleOverlap(a: Vec2, ar: number, b: Vec2, br: number): boolean {
  return distance(a, b) <= ar + br;
}

export function copyVec(v: Vec2): Vec2 {
  return { x: v.x, y: v.y };
}
