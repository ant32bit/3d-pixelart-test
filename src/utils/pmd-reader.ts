import { vec2, vec3, vec4 } from 'gl-matrix';
import { ArrayBufferReader } from './file-reader';

export interface IPmd {
    header: IPmdHeader;
    vertices: IPmdVertex[];
    faces: IPmdFace[];
    materials: IPmdMaterial[];
    textures: string[];
    bones: IPmdBone[];
    boneGroups: IPmdBoneGroup[];
    ikChains: IPmdIkChain[]
    faceMorphs: IPmdFaceMorph[];
    rigidBodies: IPmdRigidBody[];
    physicsConstraints: IPmdPhysicsConstraint[];
}

export interface IPmdHeader {
    type: string;
    version: number;
    modelName: string;
    modelDescription: string;
    modelNameEng?: string;
    modelDescriptionEng?: string;
}

export interface IPmdVertex {
    pos: vec3;
    norm: vec3;
    tex: vec2;
    bone0: number;
    bone1: number;
    bone0weight: number;
    edge: boolean;
}

export interface IPmdFace {
    vertices: Uint16Array
}

export interface IPmdMaterial {
    diffuse: vec4;
    specular: vec3;
    ambient: vec3;
    
    specularity: number;
    
    toonTex: number;
    edge: boolean;

    nFaces: number;
    tex: string;
    sphereMap: string;
}

export interface IPmdBone {
    name: string;
    nameEng?: string;
    parent: number;
    child: number;
    type: number;
    targetBone?: number;
    coRotateCoefficient?: number;
    pos: vec3;
}

export interface IPmdIkChain {
    targetBone: number;
    endEffectorBone: number;
    chainedBones: number[];
    maxIterations: number;
    maxAngle: number;
}

export interface IPmdFaceMorph {
    name: string;
    nameEng?: string;
    type: number;
    selectable: boolean;
    vertices: { id: number, pos: vec3 }[];
}

export interface IPmdBoneGroup {
    name: string;
    nameEng?: string;
    bones: number[];
}

export interface IPmdRigidBody {
    name: string;
    boneId: number;
    size: vec3;
    pos: vec3;
    rot: vec3;
    mass: number;
    type: number;
    collisionGroup: number;
    collisionGroupMask: number;
    rigidBodyShape: number;
    linearDampening: number;
    angularDampening: number;
    recoil: number;
    friction: number;
}

export interface IPmdPhysicsConstraint {
    name: string;
    rigidBody0: number;
    rigidBody1: number;
    relPos: vec3;
    rot: vec3;
    posMin: vec3;
    posMax: vec3;
    rotMin: vec3;
    rotMax: vec3;
    posStiffness: vec3;
    rotStiffness: vec3;
}


export function readPmd(buffer: ArrayBuffer): IPmd {
    
    const reader = new ArrayBufferReader(buffer);
    const type = reader.readASCIIFixedLengthString(3);
    const version = reader.readFloat();
    const modelName = reader.readShiftJISZeroTerminatedString(20);
    const modelDescription = reader.readShiftJISZeroTerminatedString(256);
    const nVertices = reader.readUint32();
    const vertices: IPmdVertex[] = [];
    while(vertices.length < nVertices) {
        const floats = reader.readFloatArray(8);
        const shorts = reader.readUint16Array(2);
        const bytes = reader.readUint8Array(2);
        vertices.push({
            pos: floats.slice(0, 3),
            norm: floats.slice(3, 6),
            tex: floats.slice(6, 8),
            bone0: shorts[0],
            bone1: shorts[1],
            bone0weight: bytes[0],
            edge: bytes[2] != 0
        });
    }

    const nFaces = reader.readUint32() / 3;
    const faces: IPmdFace[] = [];
    while (faces.length < nFaces) {
        const vertices = reader.readUint16Array(3);
        faces.push({ vertices })
    }

    const nMaterials = reader.readUint32();
    const materials: IPmdMaterial[] = [];
    while (materials.length < nMaterials) {
        const floats = reader.readFloatArray(11);
        const bytes = reader.readUint8Array(2);
        const nFacesPerMat = reader.readUint32() / 3;
        const texStr = reader.readShiftJISZeroTerminatedString(20).split('*');
        const tex = texStr[0] !== '' ? texStr[0] : null;
        const sphereMap = texStr.length > 1 && texStr[2] !== '' ? texStr[1] : null;
        materials.push({
            diffuse: floats.slice(0, 4),
            specularity: floats[4],
            specular: floats.slice(5, 8),
            ambient: floats.slice(8, 11),
            toonTex: bytes[0] === 0 ? null : bytes[0],
            edge: bytes[1] != 0,
            nFaces: nFacesPerMat,
            tex, sphereMap
        });
    }

    const nBones = reader.readUint16();
    const bones: IPmdBone[] = [];
    while (bones.length < nBones) {
        const name = reader.readShiftJISZeroTerminatedString(20);
        const shorts = reader.readInt16Array(2);
        const type = reader.readUint8();
        const extra = reader.readInt16();
        const position = reader.readFloatArray(3);
        bones.push({
            name,
            parent: shorts[0],
            child: shorts[1],
            type, 
            targetBone: type === 4 ? extra : null,
            coRotateCoefficient: type === 9 ? extra : null,
            pos: position
        });
    }

    const nIkChains = reader.readUint16();
    const ikChains: IPmdIkChain[] = [];
    while (ikChains.length < nIkChains) {
        const bones = reader.readInt16Array(2);
        const nChainedBones = reader.readUint8();
        const maxIterations = reader.readInt16();
        const maxAngle = reader.readFloat();
        const chainedBones = reader.readInt16Array(nChainedBones);
        ikChains.push({
            targetBone: bones[0],
            endEffectorBone: bones[1],
            chainedBones: Array.from(chainedBones),
            maxIterations, maxAngle
        });
    }

    const nFaceMorphs = reader.readUint16();
    const faceMorphs: IPmdFaceMorph[] = [];
    while (faceMorphs.length < nFaceMorphs) {
        const name = reader.readShiftJISZeroTerminatedString(20);
        const nFaceVerts = reader.readUint32();
        const type = reader.readUint8();
        const faceVerts: { id: number, pos: vec3 }[] = [];
        while (faceVerts.length < nFaceVerts) {
            faceVerts.push({
                id: reader.readUint32(),
                pos: reader.readFloatArray(3)
            })
        }
        faceMorphs.push({ name, type, selectable: false, vertices: faceVerts });
    }

    const selectableMorphs = reader.readUint16Array(reader.readUint8());
    for (const i of selectableMorphs)
        faceMorphs[i].selectable = true;

    const nBoneGroups = reader.readUint8();
    const boneGroups: IPmdBoneGroup[] = [];
    while (boneGroups.length < nBoneGroups) {
        boneGroups.push({
            name: reader.readShiftJISZeroTerminatedString(50),
            bones: []
        });
    }

    const nBoneGroupEntries = reader.readUint32();
    for (let i = 0; i < nBoneGroupEntries; i++) {
        const boneIdx = reader.readUint16();
        const groupIdx = reader.readUint8() - 1;
        boneGroups[groupIdx].bones.push(boneIdx);
    }

    const textures: string[] = [
        'toon01.bmp',
        'toon02.bmp',
        'toon04.bmp',
        'toon05.bmp',
        'toon06.bmp',
        'toon07.bmp',
        'toon03.bmp',
        'toon08.bmp',
        'toon09.bmp',
        'toon10.bmp'
    ];

    const pmd: IPmd = {
        header: { type, version, modelName, modelDescription },
        vertices, faces, materials, textures, 
        bones, boneGroups, ikChains, faceMorphs,
        rigidBodies: [], physicsConstraints: []
    }

    if (reader.eof)
        return pmd;
    
    if (reader.readUint8() > 0) {
        pmd.header.modelNameEng = reader.readShiftJISZeroTerminatedString(20);
        pmd.header.modelDescriptionEng = reader.readShiftJISZeroTerminatedString(256);
        for (const bone of pmd.bones)
            bone.nameEng = reader.readShiftJISZeroTerminatedString(20);
        for (const faceMorph of pmd.faceMorphs.slice(1))
            faceMorph.nameEng = reader.readShiftJISZeroTerminatedString(20);
        for (const boneGroup of pmd.boneGroups)
            boneGroup.nameEng = reader.readShiftJISZeroTerminatedString(50);
    }

    if (reader.eof)
        return pmd;

    for (let i = 0; i < textures.length; i++) {
        textures[i] = reader.readShiftJISZeroTerminatedString(100);
    }

    if (reader.eof)
        return pmd;

    const nRigidBodies = reader.readUint32();
    while (pmd.rigidBodies.length < nRigidBodies) {
        const name = reader.readShiftJISZeroTerminatedString(20);
        const boneId = reader.readUint16();
        const collisionGroup = reader.readUint8();
        const collisionGroupMask = reader.readUint16();
        const rigidBodyShape = reader.readUint8();
        const params = reader.readFloatArray(14);
        const type = reader.readUint8();

        pmd.rigidBodies.push({
            name, boneId, type, rigidBodyShape,
            collisionGroup, collisionGroupMask,
            size: params.slice(0, 3),
            pos: params.slice(3, 6),
            rot: params.slice(6, 9),
            mass: params[9],
            linearDampening: params[10],
            angularDampening: params[11],
            recoil: params[12],
            friction: params[13],
        });
    }

    const nPhysicsConstraints = reader.readUint32();
    while(pmd.physicsConstraints.length < nPhysicsConstraints) {
        const name = reader.readShiftJISZeroTerminatedString(20);
        const rigidBodyIds = reader.readUint32Array(2);
        const params = reader.readFloatArray(24);
        pmd.physicsConstraints.push({
            name,
            rigidBody0: rigidBodyIds[0], rigidBody1: rigidBodyIds[1],
            relPos: params.slice(0,3),
            rot: params.slice(3,6),
            posMin: params.slice(6,9),
            posMax: params.slice(9,12),
            rotMin: params.slice(12,15),
            rotMax: params.slice(15,18),
            posStiffness: params.slice(18,21),
            rotStiffness: params.slice(21,24)
        })
    }

    return pmd;
}

