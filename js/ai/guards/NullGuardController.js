import { GuardController } from "./GuardController.js";

/**
 * Default no-op controller used by foundation code.
 * Keeps behaviour deterministic until advanced systems are plugged in.
 */
export class NullGuardController extends GuardController {
  onAttach(_guard) {}

  update(_dt, _guard, _runtimeContext) {
    // Intentionally empty placeholder.
  }
}
