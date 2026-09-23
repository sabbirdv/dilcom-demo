/** --- DLICOM TACTICAL ENGINE: ENHANCED PBR EDITION --- **/
class DLICOMGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.engine = new BABYLON.Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true });
        this.inputMap = {};
        this.movingObstacles = [];
        this.scene = this.createScene();

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener("resize", () => this.engine.resize());
    }

    createScene() {
        const scene = new BABYLON.Scene(this.engine);
        
        // 1. HIGH-QUALITY ENVIRONMENT (HDR/Skybox)
        // Using a pre-filtered .env file for realistic PBR reflections
        const hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(
            "https://assets.babylonjs.com/environments/environmentSpecular.env", 
            scene
        );
        scene.environmentTexture = hdrTexture;
        scene.createDefaultSkybox(hdrTexture, true, 1000, 0.1);

        // 2. PHYSICS
        scene.enablePhysics(new BABYLON.Vector3(0, -18, 0), new BABYLON.CannonJSPlugin());

        // 3. ENHANCED LIGHTING
        const mainLight = new BABYLON.DirectionalLight("dir01", new BABYLON.Vector3(-1, -2, -1), scene);
        mainLight.position = new BABYLON.Vector3(20, 40, 20);
        mainLight.intensity = 1.5;

        const glow = new BABYLON.GlowLayer("glow", scene);
        glow.intensity = 0.1;

        // 4. PBR MATERIALS
        this.materials = this.createPBRMaterials(scene);

        // 5. COMPLEX LEVEL GENERATION
        this.generateAdvancedLevel(scene);

        // 6. PLAYER (The Spherical Drone)
        this.player = this.createPlayer(scene);

        // 7. CAMERA SETUP (Cinematic Follow)
        this.cameraTarget = new BABYLON.TransformNode("camTarget", scene);
        this.camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 10, -20), scene);
        this.camera.radius = 10;
        this.camera.heightOffset = 4;
        this.camera.rotationOffset = 180;
        this.camera.cameraAcceleration = 0.05;
        this.camera.maxCameraSpeed = 10;
        this.camera.lockedTarget = this.cameraTarget;

        // // 8. CONTROLS
        // scene.onKeyboardObservable.add((kbInfo) => {
        //     this.inputMap[kbInfo.event.key.toLowerCase()] = (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN);
        //     if (kbInfo.event.code === "Space") this.inputMap["space"] = (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN);
        // });

        // 8. CONTROLS
        scene.onKeyboardObservable.add((kbInfo) => {
            let key = kbInfo.event.key.toLowerCase();
            if (kbInfo.event.code === "Space") key = "space";

            if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
                // স্পেসবার চেপে ধরে রাখলে যেন বারবার লাফ না দেয়
                if (key === "space" && kbInfo.event.repeat) {
                    return; 
                }
                this.inputMap[key] = true;
            } else if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYUP) {
                this.inputMap[key] = false;
            }
        });

        // 9. ANIMATION LOOP
        scene.registerBeforeRender(() => {
            this.cameraTarget.position.copyFrom(this.player.position);
            this.updateMovement();
            this.animateObstacles();
            
            // Death/Fall Check
            if (this.player.position.y < -15) {
                this.resetPlayer();
            }
        });

        return scene;
    }

    createPBRMaterials(scene) {
        const mats = {};

        // Floor: Carbon Fiber / Metallic Dark
        mats.floor = new BABYLON.PBRMaterial("floorMat", scene);
        mats.floor.metallic = 0.8;
        mats.floor.roughness = 0.2;
        mats.floor.albedoColor = new BABYLON.Color3(0.02, 0.05, 0.1);
        mats.floor.emissiveColor = new BABYLON.Color3(0, 0.1, 0.2); // Subtle glow

        // Hazards: Glowing Neon Red
        mats.hazard = new BABYLON.PBRMaterial("hazardMat", scene);
        mats.hazard.metallic = 0.5;
        mats.hazard.roughness = 0.1;
        mats.hazard.albedoColor = new BABYLON.Color3(1, 0, 0);
        mats.hazard.emissiveColor = new BABYLON.Color3(0.8, 0, 0);

        // Ramps: Gold/Industrial
        mats.ramp = new BABYLON.PBRMaterial("rampMat", scene);
        mats.ramp.metallic = 1.0;
        mats.ramp.roughness = 0.3;
        mats.ramp.albedoColor = new BABYLON.Color3(0.8, 0.6, 0.1);

        // Moving Walls: Cyan Glass
        mats.moving = new BABYLON.PBRMaterial("movingMat", scene);
        mats.moving.metallic = 0.1;
        mats.moving.roughness = 0.1;
        mats.moving.alpha = 0.8;
        mats.moving.albedoColor = new BABYLON.Color3(0, 0.8, 1);
        mats.moving.emissiveColor = new BABYLON.Color3(0, 0.4, 0.5);

        return mats;
    }

    createPlayer(scene) {
        const player = BABYLON.MeshBuilder.CreateSphere("player", { diameter: 1.5, segments: 32 }, scene);
        player.position = new BABYLON.Vector3(0, 3, 0);
        
        const pMat = new BABYLON.PBRMaterial("playerMat", scene);
        pMat.albedoTexture = new BABYLON.Texture("logo.png", scene); 
        pMat.emissiveTexture = new BABYLON.Texture("logo.png", scene);
        pMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        pMat.metallic = 0.9;
        pMat.roughness = 0.1;
        
        player.material = pMat;
        player.physicsImpostor = new BABYLON.PhysicsImpostor(
            player, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1.2, friction: 0.6, restitution: 0.3 }, scene
        );
        return player;
    }

    generateAdvancedLevel(scene) {
        // --- Starting Platform ---
        this.createBox(scene, 12, 1, 15, 0, -0.5, 0, this.materials.floor);

        // --- The High Jump Ramp ---
        const ramp = this.createBox(scene, 8, 1, 10, 0, 1.5, 15, this.materials.ramp);
        ramp.rotation.x = -Math.PI / 8; // Slight incline
        ramp.physicsImpostor = new BABYLON.PhysicsImpostor(ramp, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene);

        // --- Moving Obstacles Sector ---
        this.createBox(scene, 15, 1, 30, 0, -0.5, 40, this.materials.floor);
        
        const wall1 = this.createBox(scene, 6, 4, 1, -4, 2, 35, this.materials.moving);
        this.movingObstacles.push({ mesh: wall1, axis: 'x', range: 5, speed: 0.05, start: -4 });

        const wall2 = this.createBox(scene, 6, 4, 1, 4, 2, 45, this.materials.moving);
        this.movingObstacles.push({ mesh: wall2, axis: 'x', range: 5, speed: 0.05, start: 4 });

        // --- Narrow Cylindrical Bridge ---
        const bridge = BABYLON.MeshBuilder.CreateCylinder("bridge", { height: 20, diameter: 2 }, scene);
        bridge.position.set(0, -0.5, 65);
        bridge.rotation.x = Math.PI / 2;
        bridge.material = this.materials.ramp;
        bridge.physicsImpostor = new BABYLON.PhysicsImpostor(bridge, BABYLON.PhysicsImpostor.CylinderImpostor, { mass: 0 }, scene);

        // --- Hazard Zig-Zag ---
        this.createBox(scene, 20, 1, 40, 0, -0.5, 95, this.materials.floor);
        for(let z = 80; z < 115; z += 5) {
            const xPos = Math.sin(z * 0.5) * 6;
            this.createBox(scene, 4, 2, 2, xPos, 1, z, this.materials.hazard);
        }

        // --- Finishing Goal Area ---
        const goal = this.createBox(scene, 15, 1, 15, 0, -0.5, 130, this.materials.floor);
        const beacon = BABYLON.MeshBuilder.CreateCylinder("goal", { height: 10, diameter: 12 }, scene);
        beacon.position.set(0, 5, 130);
        const goalMat = new BABYLON.PBRMaterial("goalMat", scene);
        goalMat.albedoColor = new BABYLON.Color3(0, 1, 0.5);
        goalMat.emissiveColor = new BABYLON.Color3(0, 1, 0.2);
        goalMat.alpha = 0.3;
        beacon.material = goalMat;
    }

    createBox(scene, w, h, d, x, y, z, mat) {
        const box = BABYLON.MeshBuilder.CreateBox("box", { width: w, height: h, depth: d }, scene);
        box.position.set(x, y, z);
        box.material = mat;
        box.physicsImpostor = new BABYLON.PhysicsImpostor(box, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5, restitution: 0.1 }, scene);
        return box;
    }

    animateObstacles() {
        this.movingObstacles.forEach(obs => {
            obs.mesh.position[obs.axis] = obs.start + Math.sin(Date.now() * 0.002) * obs.range;
        });
    }

    updateMovement() {
        const force = new BABYLON.Vector3(0, 0, 0);
        const speed = 0.12;

        if (this.inputMap["w"] || this.inputMap["arrowup"]) force.z = speed;
        if (this.inputMap["s"] || this.inputMap["arrowdown"]) force.z = -speed;
        if (this.inputMap["a"] || this.inputMap["arrowleft"]) force.x = -speed;
        if (this.inputMap["d"] || this.inputMap["arrowright"]) force.x = speed;

        if (force.length() > 0) {
            this.player.physicsImpostor.applyImpulse(force, this.player.getAbsolutePosition());
        }

        // Jump logic
        if (this.inputMap["space"]) {
            const ray = new BABYLON.Ray(this.player.position, new BABYLON.Vector3(0, -1, 0), 1.2);
            const hit = this.scene.pickWithRay(ray);
            if (hit.pickedMesh) {
                this.player.physicsImpostor.applyImpulse(new BABYLON.Vector3(0, 10, 0), this.player.getAbsolutePosition());
                this.inputMap["space"] = false;
            }
        }
    }

    resetPlayer() {
        this.player.position.set(0, 3, 0);
        this.player.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
        this.player.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());
    }
}