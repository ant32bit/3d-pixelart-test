import { readFile } from "../utils/file-reader";
import * as THREE from 'three';

export interface IRenderPass {
    target: THREE.WebGLRenderTarget;
    material: THREE.Material;

    clearColor: THREE.Color;
    clearAlpha: number;
    
    autoclear: boolean;
    clearDepth: boolean;
    clear: boolean;
}

export abstract class RenderPass {
    public static default(target: THREE.WebGLRenderTarget): IRenderPass {
        return {
            target, material: null,

            clearColor: new THREE.Color(0x000000), 
            clearAlpha: 1.0,

            autoclear: true,
            clearDepth: true,
            clear: true,
        };
    }

    public static light(target: THREE.WebGLRenderTarget): IRenderPass {
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xffffff),
            roughness: 0.4
        });

        return {
            target, material,

            clearColor: new THREE.Color(0x000000), 
            clearAlpha: 1.0,

            autoclear: true,
            clearDepth: true,
            clear: true,
        };
    }

    public static normals(target: THREE.WebGLRenderTarget): IRenderPass {
        return {
            target, material: new THREE.MeshNormalMaterial(),

            clearColor: new THREE.Color(0x727200), 
            clearAlpha: 1.0,

            autoclear: true,
            clearDepth: true,
            clear: true,
        };
    }

    public static depths(target: THREE.WebGLRenderTarget): IRenderPass {
        return {
            target, material: new THREE.MeshDepthMaterial(),

            clearColor: new THREE.Color(0x000000), 
            clearAlpha: 1.0,

            autoclear: true,
            clearDepth: true,
            clear: true,
        };
    }
}

