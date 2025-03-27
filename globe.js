// Globe configuration
const GLOBE_CONFIG = {
    radius: 100,
    segments: 64,
    rotation: 0.001,
    tilt: 0.41,
    initialScale: 1.3
};

class WeatherGlobe {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, this.container.offsetWidth / this.container.offsetHeight, 1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.controls = null;
        this.globe = null;
        this.markers = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedLocation = null;
        this.onLocationSelect = null;

        this.init();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.z = 300;

        // Setup controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.minDistance = 150;
        this.controls.maxDistance = 400;

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 100);
        this.scene.add(directionalLight);

        // Create globe
        this.createGlobe();

        // Add event listeners
        window.addEventListener('resize', () => this.onWindowResize());
        this.container.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.container.addEventListener('click', (e) => this.onMouseClick(e));

        // Start animation
        this.animate();
    }

    createGlobe() {
        // Create sphere geometry
        const geometry = new THREE.SphereGeometry(
            GLOBE_CONFIG.radius,
            GLOBE_CONFIG.segments,
            GLOBE_CONFIG.segments
        );

        // Load Earth texture
        const textureLoader = new THREE.TextureLoader();
        
        // Show loading message
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'globe-loading';
        loadingMessage.textContent = 'Loading Earth...';
        this.container.appendChild(loadingMessage);

        // Load textures
        Promise.all([
            this.loadTexture(textureLoader, 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg'),
            this.loadTexture(textureLoader, 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/elev_bump_4k.jpg'),
            this.loadTexture(textureLoader, 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/water_4k.png')
        ]).then(([texture, bumpMap, specularMap]) => {
            // Create material
            const material = new THREE.MeshPhongMaterial({
                map: texture,
                bumpMap: bumpMap,
                bumpScale: 0.5,
                specularMap: specularMap,
                specular: new THREE.Color('grey'),
                shininess: 10
            });

            // Create mesh
            this.globe = new THREE.Mesh(geometry, material);
            this.globe.rotation.x = GLOBE_CONFIG.tilt;
            this.scene.add(this.globe);

            // Remove loading message
            this.container.removeChild(loadingMessage);
        }).catch(error => {
            console.error('Error loading textures:', error);
            loadingMessage.textContent = 'Error loading Earth textures';
        });
    }

    loadTexture(loader, url) {
        return new Promise((resolve, reject) => {
            loader.load(url, resolve, undefined, reject);
        });
    }

    addMarker(lat, lon) {
        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(2, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );

        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        marker.position.x = -(GLOBE_CONFIG.radius * Math.sin(phi) * Math.cos(theta));
        marker.position.y = (GLOBE_CONFIG.radius * Math.cos(phi));
        marker.position.z = (GLOBE_CONFIG.radius * Math.sin(phi) * Math.sin(theta));

        this.markers.push(marker);
        this.globe.add(marker);
    }

    clearMarkers() {
        this.markers.forEach(marker => {
            this.globe.remove(marker);
        });
        this.markers = [];
    }

    latLonToVector3(lat, lon) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        return new THREE.Vector3(
            -(GLOBE_CONFIG.radius * Math.sin(phi) * Math.cos(theta)),
            (GLOBE_CONFIG.radius * Math.cos(phi)),
            (GLOBE_CONFIG.radius * Math.sin(phi) * Math.sin(theta))
        );
    }

    vector3ToLatLon(position) {
        const vector = position.clone().normalize();
        
        const lat = 90 - Math.acos(vector.y) * 180 / Math.PI;
        const lon = (Math.atan2(vector.z, -vector.x) * 180 / Math.PI) - 180;

        return { lat, lon };
    }

    onMouseMove(event) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / this.container.offsetWidth) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / this.container.offsetHeight) * 2 + 1;
    }

    onMouseClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.globe);

        if (intersects.length > 0) {
            const location = this.vector3ToLatLon(intersects[0].point);
            this.clearMarkers();
            this.addMarker(location.lat, location.lon);
            
            if (this.onLocationSelect) {
                this.onLocationSelect(location);
            }
        }
    }

    onWindowResize() {
        this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) {
            this.controls.update();
        }
        if (this.globe) {
            this.globe.rotation.y += GLOBE_CONFIG.rotation;
        }
        this.renderer.render(this.scene, this.camera);
    }
} 