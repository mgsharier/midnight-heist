import * as THREE from 'three';

/**
 * Input handler handles WASD user input
 */
export class InputHandler {

    constructor(camera) {

        this.camera = camera;

        // Track which WASD keys are pressed
        this.keys = { w: false, a: false, s: false, d: false };

        // Space: one attack per press (edge-triggered, avoids key-repeat spam)
        this.spaceHeld = false;
        this.attackQueued = false;

        // Listen for key down events and mark keys as pressed
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                if (!this.spaceHeld) {
                    this.attackQueued = true;
                }
                this.spaceHeld = true;
                return;
            }

            let key = e.key.toLowerCase();
            if (key in this.keys)
                this.keys[key] = true;
        });

        // Listen for key up events and mark keys as not pressed
        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' || e.key === ' ') {
                this.spaceHeld = false;
                return;
            }

            let key = e.key.toLowerCase();
            if (key in this.keys)
                this.keys[key] = false;
        });
    
    }

    // Returns a force vector based on pressed keys and camera direction
    getForce(strength) {
        let force = new THREE.Vector3();

        // WASD for forward/back/left/right movement
        if (this.keys.w) force.z += 1;
        if (this.keys.s) force.z -= 1;
        if (this.keys.a) force.x += 1;
        if (this.keys.d) force.x -= 1;

        // Only process if there is input
        if (force.length() > 0) {

            // Get the direction the camera is facing
            let cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            cameraDirection.y = 0;

            // Calculate camera rotation angle and apply it to the force
            let cameraAngle = Math.atan2(cameraDirection.x, cameraDirection.z);
            force.applyAxisAngle(new THREE.Vector3(0,1,0), cameraAngle);

            // Set force to strength argument
            force.setLength(strength);
        }

        return force;
    }

    /** Returns true once per Space press; clears the queue. */
    consumeAttackPressed() {
        const q = this.attackQueued;
        this.attackQueued = false;
        return q;
    }

}