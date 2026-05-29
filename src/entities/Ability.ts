import { clamp } from "../utils/math";

export class AbilityMeter {
  value = 0;
  flash = 0;
  justTriggered = false;

  fill(amount: number): void {
    if (this.justTriggered) {
      this.justTriggered = false;
    }

    this.value = clamp(this.value + amount, 0, 1);
    if (this.value >= 1) {
      this.flash = Math.max(this.flash, 0.35);
    }
  }

  consume(): void {
    this.value = 0;
    this.flash = 0.55;
    this.justTriggered = true;
  }

  forceFull(): void {
    this.value = 1;
    this.flash = 0.5;
  }

  update(dt: number): void {
    this.flash = Math.max(0, this.flash - dt);
  }
}
