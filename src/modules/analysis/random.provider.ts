import { Injectable } from '@nestjs/common';

/**
 * Injectable randomness so the analysis simulation is deterministic in tests.
 * The class itself is the DI token (no separate symbol/interface needed for one
 * implementation). Production uses `Math.random`; specs pass a stub with a fixed
 * `next()` via the service constructor.
 */
@Injectable()
export class RandomSource {
  /** A float in [0, 1). */
  next(): number {
    return Math.random();
  }
}
