import { IRenderPass, RenderPass } from "./engine/render-pass";
import { getFilename, readFile } from "./utils/file-reader";
import { OBJLoader } from './utils/obj-loader';
import { MeshBasicMaterial, ShaderMaterial, WebGLRenderTarget } from "./utils/three/src/Three";

window.addEventListener("load", async (ev) => {

    let settings = JSON.parse(new TextDecoder("utf8").decode(await readFile('settings.json')));
    settings.params = settings.modelParams[settings.model];
    
    let container;
    let canvas;

    let renderers: {[name: string]: IRenderPass};
    let finalShader: THREE.ShaderMaterial;

    let camera: THREE.Camera; 
    let scene: THREE.Scene; 
    let renderer: THREE.WebGLRenderer;

    let mouseX = 0, mouseY = 0;

    let windowHalfX = window.innerWidth / 2;
    let windowHalfY = window.innerHeight / 2;

    let object;
    let texture: THREE.Texture;

    let rot = 0;

    let last = new Date().getTime();
    const every = 1000 / settings.fps;
    const rate = (2 * Math.PI * settings.rpm) / (settings.fps * 60);

    await loadItems();
    await init();
    animate();

    function loadItems() {
        return new Promise<void>((res, rej) => {

            const manager = new THREE.LoadingManager( );
            manager.onProgress = function ( item, loaded, total ) {
                console.log( item, loaded, total );

                if (loaded == total)
                    res();
            };

            const textureLoader = new THREE.TextureLoader( manager );
            textureLoader.load(getFilename(settings.params.texture), (tex: THREE.Texture) => {
                texture = tex;
                texture.minFilter = settings.mag && settings.mag == "linear" ? THREE.LinearFilter : THREE.NearestFilter;
                texture.magFilter = settings.mag && settings.mag == "linear" ? THREE.LinearFilter : THREE.NearestFilter;
                console.log(texture);
            });
            
            function onModelProgress( xhr ) {

                if ( xhr.lengthComputable ) {
    
                    const percentComplete = xhr.loaded / xhr.total * 100;
                    console.log( 'model ' + Math.round( percentComplete ) + '% downloaded' );
    
                }
            }
    
            function onModelError() {}
    
            const modelLoader = new OBJLoader( manager );
            modelLoader.load( getFilename(settings.params.model), (obj) => {

                object = obj;

            }, onModelProgress, onModelError );
        });
    }

    async function createRenderers() {
        renderers = {};

        const parameters = {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat
		};

		const size = renderer.getSize( new THREE.Vector2() );
		const pixelRatio = renderer.getPixelRatio();
		const width = size.width * pixelRatio;
		const height = size.height * pixelRatio;

		const colorTarget = new THREE.WebGLRenderTarget( width * pixelRatio, height * pixelRatio, parameters );
		colorTarget.texture.name = 'color-render-target.rpt';

        const defaultClearColor = new THREE.Color();
        renderer.getClearColor(defaultClearColor);
        const defaultClearAlpha = renderer.getClearAlpha();

        renderers.color = {
            target: colorTarget,
            autoclear: renderer.autoClear,
            clearColor: defaultClearColor,
            clearAlpha: defaultClearAlpha,
            clearDepth: true,
            clear: true,
            material: scene.overrideMaterial,
        };

        const lightTarget = new THREE.WebGLRenderTarget(width, height, parameters);
        lightTarget.texture.name = 'light-render-target.rpt';
        renderers.light = RenderPass.light(lightTarget);
        (renderers.light.material as THREE.MeshStandardMaterial).roughness = settings.roughness;

        const normalTarget = new THREE.WebGLRenderTarget(
            width * settings.normalsAA, 
            height * settings.normalsAA, 
            parameters
        );
        normalTarget.texture.name = 'normals-render-target.rpt';
        renderers.normals = RenderPass.normals(normalTarget);

        const depthsTarget = new THREE.WebGLRenderTarget(
            width * settings.depthsAA, 
            height * settings.depthsAA, 
            parameters
        );
        depthsTarget.texture.name = 'depths-render-target.rpt';
        renderers.depths = RenderPass.depths(depthsTarget);

        const vertexShader = 
`
varying vec2 v_pixel;

void main() {
    v_pixel = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}

`;
        const fragmentShader = new TextDecoder("utf8").decode(await readFile('final-shader.glsl'));
        const uniforms = {
            u_pixelSize: { value: new THREE.Vector2(1.0 / size.x, 1.0 / size.y) },
            u_normalsAA: { value: settings.normalsAA },
            u_depthsAA: { value: settings.depthsAA },
            u_color: { value: renderers.color.target.texture },
            u_light: { value: renderers.light.target.texture },
            u_normals: { value: renderers.normals.target.texture },
            u_depths: { value: renderers.depths.target.texture }
        }; 

        finalShader = new THREE.ShaderMaterial({
            uniforms,
            vertexShader,
            fragmentShader
        });
    }

    async function init() {

        container = document.createElement( 'div' );
        document.body.appendChild( container );

        camera = new THREE.PerspectiveCamera( 45, 1, 1, 1000 );
        camera.position.y = settings.params.cameraY;
        camera.position.z = settings.params.cameraZ;

        // scene

        scene = new THREE.Scene();
        //scene.background = new THREE.Color(0xffffff);

        const ambientLight = new THREE.AmbientLight( 0xcccccc, 0.4 );
        scene.add( ambientLight );

        const pointLight = new THREE.PointLight( 0xffffff, 0.8 );
        camera.add( pointLight );
        scene.add( camera );

        pointLight.position.x += settings.lightX;
        pointLight.position.y += settings.lightY;
        pointLight.position.z += settings.lightZ;

        const vertexShader = 
`
varying vec2 v_texCoord;

void main() {
    v_texCoord = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}

`;

        const fragmentShader = new TextDecoder("utf8").decode(await readFile('super-nearest-shader.glsl'));
        const uniforms = {
            u_texture: { value: texture }
        };

        const material = new THREE.ShaderMaterial({
            uniforms,
            vertexShader,
            fragmentShader
        });

        // texture

        // const vertexShader = new TextDecoder("utf8").decode(await readFile('vertex-shader.glsl'));
        // const fragmentShader = new TextDecoder("utf8").decode(await readFile('fragment-shader.glsl'));
        // const uniforms = THREE.UniformsUtils.merge(
        //     [
        //         THREE.UniformsLib['lights']
        //     ]);
        // uniforms['u_texture'] = { value: texture }; 

        // const material = new THREE.ShaderMaterial({
        //     uniforms,
        //     vertexShader,
        //     fragmentShader,
        //     lights: true
        // });

        // model

        // const material = new THREE.MeshBasicMaterial({ map: texture });
        object.traverse( function ( child ) {
            if ( child.isMesh ) child.material = material;
        } );

        object.position.y += settings.params.objectY;
        
        scene.add( object );

        //

        renderer = new THREE.WebGLRenderer();

        renderer.setSize(settings.size, settings.size);
        renderer.setClearColor(new THREE.Color(0xffffff));
        canvas = renderer.domElement as HTMLCanvasElement;
        const clientSize = Math.min(window.innerWidth, window.innerHeight) + 'px'
        canvas.style.width = clientSize;
        canvas.style.height = clientSize;
        canvas.style.imageRendering = 'pixelated';
        container.appendChild( canvas );

        await createRenderers();

        window.addEventListener( 'resize', onWindowResize );

    }

    function onWindowResize() {

        const size = Math.min(window.innerWidth, window.innerHeight) + 'px'
        canvas.style.width = size;
        canvas.style.height = size;
    }

    function animate() {

        requestAnimationFrame( animate );

        const curr = new Date().getTime();
        if (curr - last > every) 
        {
            last = curr;
            update();
            render();
        }
    }

    function update() {

        rot += rate;
        object.rotation.y = rot;
        camera.lookAt( scene.position );
    }

    function render() {
        for (const pass of Object.keys(renderers))
            renderPass(renderers[pass]);
        
        finaliseRender();
    }

    function renderPass(pass: IRenderPass) {
        renderer.setRenderTarget(pass.target);
        renderer.setClearColor(pass.clearColor);
        renderer.setClearAlpha(pass.clearAlpha);
        renderer.autoClear = pass.autoclear;
        if (pass.clearDepth) renderer.clearDepth();
        if (pass.clear) renderer.clear();
        scene.overrideMaterial = pass.material;
        renderer.render( scene, camera );
    }

    function finaliseRender() {
        
        const orthCamera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ - 1, 3, 0, - 1, - 1, 0, 3, - 1, 0 ], 3 ) );
        geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( [ 0, 2, 0, 0, 2, 0 ], 2 ) );

        let material: THREE.Material = finalShader;
        if (settings.render && renderers[settings.render]) {
            material = new THREE.MeshBasicMaterial({
                map: renderers[settings.render].target.texture
            });
        }

        const mesh = new THREE.Mesh( geometry, material );

        renderer.setRenderTarget(null)
        renderer.render(mesh, orthCamera);
    }
});

