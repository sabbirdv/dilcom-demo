/** --- 3D ENGINE CLASS --- **/
class DLICOMGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.inputMap = {};
        this.scene = this.createScene();

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener("resize", () => this.engine.resize());
    }

    createScene() {
        const scene = new BABYLON.Scene(this.engine);
        scene.clearColor = new BABYLON.Color4(0.01, 0.01, 0.03, 1);
        
        // Physics
        scene.enablePhysics(new BABYLON.Vector3(0, -15, 0), new BABYLON.CannonJSPlugin());

        // Lighting & Effects
        const light = new BABYLON.HemisphericLight("Hemi", new BABYLON.Vector3(0, 1, 0), scene);
        light.intensity = 0.4;
        
        // Glow Intensity - Reduced to 0.4 for better visibility
        const glow = new BABYLON.GlowLayer("glow", scene);
        glow.intensity = 0.4;

        // Materials
        this.platMat = new BABYLON.StandardMaterial("platMat", scene);
        this.platMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.2);
        this.platMat.specularColor = new BABYLON.Color3(0, 1, 1);

        this.obsMat = new BABYLON.StandardMaterial("obsMat", scene);
        this.obsMat.emissiveColor = new BABYLON.Color3(1, 0, 0.1); // Neon Red
        this.obsMat.diffuseColor = new BABYLON.Color3(0.5, 0, 0);

        // Level Generation
        this.generateLevelOne(scene);

        // Player Character
        this.player = BABYLON.MeshBuilder.CreateSphere("player", { diameter: 1.5 }, scene);
        this.player.position = new BABYLON.Vector3(0, 3, 0);
        
        // // Player Material Update
        // const pMat = new BABYLON.StandardMaterial("pMat", scene);
        // pMat.diffuseTexture = new BABYLON.Texture("logo.png", scene); // Apply logo image
        // pMat.specularColor = new BABYLON.Color3(0.4, 0, 0); // Remove shiny glare
        // pMat.disableLighting = true; // Show original image colors
        // this.player.material = pMat;

        
        // Player Material Update
        const pMat = new BABYLON.StandardMaterial("pMat", scene);
        pMat.emissiveTexture = new BABYLON.Texture("logo.png", scene); // diffuseTexture এর বদলে emissiveTexture ব্যবহার করা হয়েছে
        pMat.specularColor = new BABYLON.Color3(0, 0, 0); // চকচকে ভাব পুরোপুরি দূর করতে 0, 0, 0 দেওয়া হয়েছে
        pMat.disableLighting = true; // এখন অরিজিনাল ইমেজ কালার ঠিকমতো দেখাবে
        this.player.material = pMat;





        this.player.physicsImpostor = new BABYLON.PhysicsImpostor(
            this.player, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1, friction: 0.5, restitution: 0.1 }, scene
        );

        // Camera Setup
        this.cameraTarget = new BABYLON.TransformNode("camTarget", scene);
        this.camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 10, -20), scene);
        this.camera.radius = 12;
        this.camera.heightOffset = 5;
        this.camera.rotationOffset = 180;
        this.camera.cameraAcceleration = 0.05;
        this.camera.lockedTarget = this.cameraTarget;

        // Controls
        scene.onKeyboardObservable.add((kbInfo) => {
            this.inputMap[kbInfo.event.key.toLowerCase()] = (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN);
            if (kbInfo.event.code === "Space") this.inputMap["space"] = (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN);
        });

        scene.registerBeforeRender(() => {
            this.cameraTarget.position.copyFrom(this.player.position);
            this.updateMovement();
            
            // Fall check
            if (this.player.position.y < -10) {
                this.player.position.set(0, 3, 0);
                this.player.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
            }
        });

        return scene;
    }

    generateLevelOne(scene) {
        const platforms = [
            [10, 20, 0, 0],    
            [8, 15, 0, 25],    
            [12, 30, 0, 55],   
            [6, 10, -5, 80],   
            [6, 10, 5, 100],   
            [15, 40, 0, 135]   
        ];

        const obstacles = [
            [6, 2, 1, 0, 28],    
            [2, 4, 2, -3, 50],   
            [2, 4, 2, 3, 60],    
            [12, 1.5, 2, 0, 70], 
            [1, 5, 1, -5, 80],   
            [4, 2, 1, 0, 125],   
            [15, 1, 1, 0, 140],  
            [15, 1, 1, 0, 150]   
        ];

        platforms.forEach((data, i) => {
            const plat = BABYLON.MeshBuilder.CreateBox(`plat${i}`, { width: data[0], height: 1, depth: data[1] }, scene);
            plat.position.set(data[2], -0.5, data[3]);
            plat.material = this.platMat;
            plat.physicsImpostor = new BABYLON.PhysicsImpostor(plat, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1 }, scene);
        });

        obstacles.forEach((data, i) => {
            const obs = BABYLON.MeshBuilder.CreateBox(`obs${i}`, { width: data[0], height: data[1], depth: data[2] }, scene);
            obs.position.set(data[3], data[1]/2, data[4]);
            obs.material = this.obsMat;
            obs.physicsImpostor = new BABYLON.PhysicsImpostor(obs, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene);
        });
    }

    updateMovement() {
        const force = new BABYLON.Vector3(0, 0, 0);
        // Movement Speed - Reduced to 0.02 for precision control
        const speed = 0.1;

        if (this.inputMap["w"] || this.inputMap["arrowup"]) force.z = speed;
        if (this.inputMap["s"] || this.inputMap["arrowdown"]) force.z = -speed;
        if (this.inputMap["a"] || this.inputMap["arrowleft"]) force.x = -speed;
        if (this.inputMap["d"] || this.inputMap["arrowright"]) force.x = speed;

        if (force.length() > 0) {
            this.player.physicsImpostor.applyImpulse(force, this.player.getAbsolutePosition());
        }

        if (this.inputMap["space"] && Math.abs(this.player.physicsImpostor.getLinearVelocity().y) < 0.01 && this.player.position.y < 1.5) {
            this.player.physicsImpostor.applyImpulse(new BABYLON.Vector3(0, 8.75, 0), this.player.getAbsolutePosition());
            this.inputMap["space"] = false;
        }
    }
}