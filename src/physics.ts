import { MOVEMENT } from "./tuning";
import {
  Rect,
  Vec2,
  add,
  clampVectorMagnitude,
  dot,
  length,
  mul,
  randomUnitVector,
  safeNormalize,
  sub
} from "./utils/math";

export type PhysicsBody = {
  previousPosition: Vec2;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  mass: number;
  restitution: number;
  minSpeed: number;
  maxSpeed: number;
};

export type WallCollisionResult = {
  hit: boolean;
  normal: Vec2;
  point: Vec2;
  impactSpeed: number;
  wall: "left" | "right" | "top" | "bottom" | "corner" | "none";
};

export type CircleCollisionResult = {
  collided: boolean;
  normal: Vec2;
  point: Vec2;
  impactSpeed: number;
};

export function reflectVelocityAgainstWall(body: PhysicsBody, wallNormal: Vec2, restitution: number): number {
  const normal = safeNormalize(wallNormal);
  const speedIntoWall = dot(body.velocity, normal);
  if (speedIntoWall >= 0) {
    return 0;
  }

  body.velocity.x -= (1 + restitution) * speedIntoWall * normal.x;
  body.velocity.y -= (1 + restitution) * speedIntoWall * normal.y;
  return Math.abs(speedIntoWall);
}

export function resolveWallCollision(body: PhysicsBody, arena: Rect): WallCollisionResult {
  const result: WallCollisionResult = {
    hit: false,
    normal: { x: 0, y: 0 },
    point: { x: body.position.x, y: body.position.y },
    impactSpeed: 0,
    wall: "none"
  };
  const restitution = body.restitution * MOVEMENT.wallRestitution;
  const left = arena.x + body.radius;
  const right = arena.x + arena.w - body.radius;
  const top = arena.y + body.radius;
  const bottom = arena.y + arena.h - body.radius;

  if (body.position.x < left) {
    body.position.x = left;
    body.velocity.x = Math.abs(body.velocity.x) * restitution;
    mergeWallHit(result, { x: 1, y: 0 }, { x: arena.x, y: body.position.y }, Math.abs(body.velocity.x), "left");
  } else if (body.position.x > right) {
    body.position.x = right;
    body.velocity.x = -Math.abs(body.velocity.x) * restitution;
    mergeWallHit(result, { x: -1, y: 0 }, { x: arena.x + arena.w, y: body.position.y }, Math.abs(body.velocity.x), "right");
  }

  if (body.position.y < top) {
    body.position.y = top;
    body.velocity.y = Math.abs(body.velocity.y) * restitution;
    mergeWallHit(result, { x: 0, y: 1 }, { x: body.position.x, y: arena.y }, Math.abs(body.velocity.y), "top");
  } else if (body.position.y > bottom) {
    body.position.y = bottom;
    body.velocity.y = -Math.abs(body.velocity.y) * restitution;
    mergeWallHit(result, { x: 0, y: -1 }, { x: body.position.x, y: arena.y + arena.h }, Math.abs(body.velocity.y), "bottom");
  }

  if (result.hit) {
    body.velocity = clampVectorMagnitude(body.velocity, body.minSpeed, body.maxSpeed);
  }

  return result;
}

export function resolveCircleOverlap(a: PhysicsBody, b: PhysicsBody): CircleCollisionResult {
  const delta = sub(b.position, a.position);
  const fallback = safeNormalize(sub(b.position, a.position), randomUnitVector());
  const dist = length(delta);
  const normal = dist > 0.0001 ? { x: delta.x / dist, y: delta.y / dist } : fallback;
  const minDist = a.radius + b.radius;
  const overlap = minDist - dist;

  if (overlap <= 0) {
    return {
      collided: false,
      normal,
      point: midpoint(a.position, b.position),
      impactSpeed: 0
    };
  }

  const inverseMassA = 1 / a.mass;
  const inverseMassB = 1 / b.mass;
  const inverseMassSum = inverseMassA + inverseMassB;
  const percent = 0.82;
  const slop = 0.01;
  const correctionMagnitude = (Math.max(overlap - slop, 0) / inverseMassSum) * percent;
  const correction = mul(normal, correctionMagnitude);

  a.position.x -= correction.x * inverseMassA;
  a.position.y -= correction.y * inverseMassA;
  b.position.x += correction.x * inverseMassB;
  b.position.y += correction.y * inverseMassB;

  return {
    collided: true,
    normal,
    point: midpoint(a.position, b.position),
    impactSpeed: 0
  };
}

export function resolveCircleCollision(a: PhysicsBody, b: PhysicsBody, restitution: number): CircleCollisionResult {
  const overlapResult = resolveCircleOverlap(a, b);
  if (!overlapResult.collided) {
    return overlapResult;
  }

  const normal = overlapResult.normal;
  const relativeVelocity = sub(a.velocity, b.velocity);
  const velocityAlongNormal = dot(relativeVelocity, normal);
  const impactSpeed = Math.abs(velocityAlongNormal);

  if (velocityAlongNormal < 0) {
    overlapResult.impactSpeed = impactSpeed;
    return overlapResult;
  }

  const inverseMassA = 1 / a.mass;
  const inverseMassB = 1 / b.mass;
  const impulseMagnitude = -((1 + restitution) * velocityAlongNormal) / (inverseMassA + inverseMassB);
  const impulse = mul(normal, impulseMagnitude);

  a.velocity.x += impulse.x * inverseMassA;
  a.velocity.y += impulse.y * inverseMassA;
  b.velocity.x -= impulse.x * inverseMassB;
  b.velocity.y -= impulse.y * inverseMassB;
  a.velocity = clampVectorMagnitude(a.velocity, a.minSpeed, a.maxSpeed);
  b.velocity = clampVectorMagnitude(b.velocity, b.minSpeed, b.maxSpeed);

  return {
    collided: true,
    normal,
    point: midpoint(a.position, b.position),
    impactSpeed
  };
}

function mergeWallHit(
  result: WallCollisionResult,
  normal: Vec2,
  point: Vec2,
  impactSpeed: number,
  wall: WallCollisionResult["wall"]
): void {
  const wasHit = result.hit;
  result.hit = true;
  result.normal = safeNormalize(add(result.normal, normal), normal);
  result.point = point;
  result.impactSpeed = Math.max(result.impactSpeed, impactSpeed);
  result.wall = wasHit ? "corner" : wall;
}

function midpoint(a: Vec2, b: Vec2): Vec2 {
  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5
  };
}
