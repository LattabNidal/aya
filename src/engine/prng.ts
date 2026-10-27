/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32)
 * Ensures 100% scientific reproducibility across runs and replications.
 */

export class PRNG {
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed >>> 0;
    if (this.state === 0) {
      this.state = 1337;
    }
  }

  /**
   * Returns a float in [0, 1)
   */
  nextFloat(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer in [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  /**
   * Returns standard normal deviate (mean 0, stdDev 1) using Box-Muller
   */
  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    let u1 = this.nextFloat();
    let u2 = this.nextFloat();
    while (u1 <= 1e-15) {
      u1 = this.nextFloat();
    }
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Resets PRNG to a given seed
   */
  setSeed(seed: number): void {
    this.state = seed >>> 0;
    if (this.state === 0) {
      this.state = 1337;
    }
  }

  getSeed(): number {
    return this.state;
  }
}
