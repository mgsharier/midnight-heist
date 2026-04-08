import { GuardController } from './GuardController.js';
import { StateMachine } from '../decisions/state-machines/StateMachine.js';
import { GuardPatrolState } from './states/GuardGameplayStates.js';
import { GuardSteeringHelpers } from './GuardSteeringHelpers.js';

/**
 * Integrates FSM (patrol / chase / return), JPS path requests inside states,
 * and inter-guard separation applied here every frame after state logic.
 */
export class GuardGameplayController extends GuardController {
  onAttach(guard) {
    guard.currentPath = [];
    guard.currentPathIndex = 0;
    guard.currentTargetTile = null;
    guard.repathTimer = 0;

    const data = {
      returnPatrolTile: null,
      map: null,
      player: null,
      guards: null,
      levelConfig: null,
    };

    this.fsm = new StateMachine(guard, new GuardPatrolState(), data);
    guard._gameplayFsm = this.fsm;
  }

  update(dt, guard, runtimeContext) {
    const map = runtimeContext?.map;
    if (!map) {
      return;
    }

    const data = this.fsm.data;
    data.map = map;
    data.player = runtimeContext.player;
    data.guards = runtimeContext.guards;
    data.levelConfig = runtimeContext.levelConfig;

    this.fsm.update(dt);

    guard.applyForce(GuardSteeringHelpers.getAvoidanceForce(guard, runtimeContext));
  }
}
