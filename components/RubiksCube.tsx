import React, { useImperativeHandle, useRef, useMemo, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// --- Types & Constants ---

export interface CubeRef {
  scramble: (count?: number) => Promise<void>;
  solve: () => Promise<void>;
  reset: () => void;
  getHistoryLength: () => number;
}

interface CubeProps {
  onMoveComplete?: (historyLength: number) => void;
}

type Axis = 'x' | 'y' | 'z';
type Direction = 1 | -1; // 1 = Clockwise, -1 = Counter-Clockwise

interface Move {
  axis: Axis;
  layer: number; // coordinate value (-1, 0, 1)
  dir: Direction;
}

// Colors for the faces: Right, Left, Top, Bottom, Front, Back
const COLORS = {
  base: '#0f0f0f', // Darker plastic body
  right: '#b91c1c', // Red
  left: '#d97706', // Orange
  top: '#f3f4f6', // White
  bottom: '#fbbf24', // Yellow
  front: '#16a34a', // Green
  back: '#2563eb', // Blue
};

const ANIMATION_SPEED_NORMAL = 0.25; // Radians per frame (approx 6 frames per move)
const ANIMATION_SPEED_FAST = 0.65; // Very fast for solving/scrambling

// --- Helper Components ---

// A single cubie (mini cube) with 3D stickers
const Cubie = React.memo(({ position, name }: { position: [number, number, number]; name: string }) => {
  // Sticker config
  const stickerSize = 0.88;
  const stickerThick = 0.02;
  const stickerRadius = 0.05;
  const stickerOffset = 0.5 + (stickerThick / 2); // sits exactly on face

  return (
    <group position={position} name={name}>
       {/* The base black cube with rounded edges */}
      <RoundedBox args={[1, 1, 1]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color={COLORS.base} roughness={0.5} metalness={0.1} />
      </RoundedBox>

      {/* Colored 3D stickers */}
      
      {/* Right (+x) */}
      <group position={[stickerOffset, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <RoundedBox args={[stickerSize, stickerSize, stickerThick]} radius={stickerRadius} smoothness={2}>
            <meshStandardMaterial color={COLORS.right} roughness={0.05} metalness={0.1} envMapIntensity={1.5} />
        </RoundedBox>
      </group>

      {/* Left (-x) */}
      <group position={[-stickerOffset, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <RoundedBox args={[stickerSize, stickerSize, stickerThick]} radius={stickerRadius} smoothness={2}>
            <meshStandardMaterial color={COLORS.left} roughness={0.05} metalness={0.1} envMapIntensity={1.5} />
        </RoundedBox>
      </group>

      {/* Top (+y) */}
      <group position={[0, stickerOffset, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <RoundedBox args={[stickerSize, stickerSize, stickerThick]} radius={stickerRadius} smoothness={2}>
            <meshStandardMaterial color={COLORS.top} roughness={0.05} metalness={0.1} envMapIntensity={1.5} />
        </RoundedBox>
      </group>

      {/* Bottom (-y) */}
      <group position={[0, -stickerOffset, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <RoundedBox args={[stickerSize, stickerSize, stickerThick]} radius={stickerRadius} smoothness={2}>
            <meshStandardMaterial color={COLORS.bottom} roughness={0.05} metalness={0.1} envMapIntensity={1.5} />
        </RoundedBox>
      </group>

      {/* Front (+z) */}
      <group position={[0, 0, stickerOffset]}>
        <RoundedBox args={[stickerSize, stickerSize, stickerThick]} radius={stickerRadius} smoothness={2}>
            <meshStandardMaterial color={COLORS.front} roughness={0.05} metalness={0.1} envMapIntensity={1.5} />
        </RoundedBox>
      </group>

      {/* Back (-z) */}
      <group position={[0, 0, -stickerOffset]} rotation={[0, Math.PI, 0]}>
        <RoundedBox args={[stickerSize, stickerSize, stickerThick]} radius={stickerRadius} smoothness={2}>
            <meshStandardMaterial color={COLORS.back} roughness={0.05} metalness={0.1} envMapIntensity={1.5} />
        </RoundedBox>
      </group>
    </group>
  );
});

// --- Main Component ---

export const RubiksCube = forwardRef<CubeRef, CubeProps>(({ onMoveComplete }, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  const pivotRef = useRef<THREE.Group>(null);
  
  // State
  const moveQueue = useRef<Move[]>([]);
  const history = useRef<Move[]>([]);
  const isAnimating = useRef(false);
  const currentMove = useRef<Move | null>(null);
  const progress = useRef(0);
  const speed = useRef(ANIMATION_SPEED_NORMAL);

  // Initialize the 27 positions
  const initialPositions = useMemo(() => {
    const pos: { id: number; p: [number, number, number] }[] = [];
    let id = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          pos.push({ id: id++, p: [x, y, z] });
        }
      }
    }
    return pos;
  }, []);

  // --- Logic Helpers ---

  const getCubiesInLayer = (axis: Axis, layer: number) => {
    if (!groupRef.current) return [];
    const cubies: THREE.Object3D[] = [];
    const epsilon = 0.1;

    groupRef.current.children.forEach((child) => {
      if (child.name.startsWith('cubie')) {
        const pos = child.position;
        let val = 0;
        if (axis === 'x') val = pos.x;
        if (axis === 'y') val = pos.y;
        if (axis === 'z') val = pos.z;

        if (Math.abs(val - layer) < epsilon) {
          cubies.push(child);
        }
      }
    });
    return cubies;
  };

  const attachToPivot = (cubies: THREE.Object3D[]) => {
    if (!pivotRef.current || !groupRef.current) return;
    
    pivotRef.current.rotation.set(0, 0, 0);
    pivotRef.current.updateMatrixWorld();

    cubies.forEach((cubie) => {
      pivotRef.current?.attach(cubie);
    });
  };

  const detachFromPivot = (cubies: THREE.Object3D[]) => {
    if (!pivotRef.current || !groupRef.current) return;
    cubies.forEach((cubie) => {
      groupRef.current?.attach(cubie);
      
      // Snap to nearest 90 degrees / integer grid to prevent drift
      cubie.position.x = Math.round(cubie.position.x);
      cubie.position.y = Math.round(cubie.position.y);
      cubie.position.z = Math.round(cubie.position.z);
      
      const halfPi = Math.PI / 2;
      cubie.rotation.x = Math.round(cubie.rotation.x / halfPi) * halfPi;
      cubie.rotation.y = Math.round(cubie.rotation.y / halfPi) * halfPi;
      cubie.rotation.z = Math.round(cubie.rotation.z / halfPi) * halfPi;
      
      cubie.updateMatrix();
    });
  };

  // --- Animation Loop ---

  useFrame((state, delta) => {
    if (!isAnimating.current) {
      if (moveQueue.current.length > 0) {
        const move = moveQueue.current.shift()!;
        currentMove.current = move;
        isAnimating.current = true;
        progress.current = 0;

        const cubies = getCubiesInLayer(move.axis, move.layer);
        attachToPivot(cubies);
      }
      return;
    }

    if (currentMove.current && pivotRef.current) {
      const move = currentMove.current;
      const step = speed.current * (delta * 60); 
      
      progress.current += step;
      let finished = false;
      
      if (progress.current >= Math.PI / 2) {
        progress.current = Math.PI / 2;
        finished = true;
      }
      
      const currentAngle = progress.current * -move.dir;

      pivotRef.current.rotation.set(0, 0, 0);
      if (move.axis === 'x') pivotRef.current.rotation.x = currentAngle;
      if (move.axis === 'y') pivotRef.current.rotation.y = currentAngle;
      if (move.axis === 'z') pivotRef.current.rotation.z = currentAngle;
      
      pivotRef.current.updateMatrixWorld();

      if (finished) {
        const children = [...pivotRef.current.children];
        detachFromPivot(children);
        pivotRef.current.rotation.set(0, 0, 0);
        
        isAnimating.current = false;
        currentMove.current = null;
        
        // Report current history size (distance from solved)
        // Note: If we are solving, we are popping from history ideally, but logic below handles it by clearing history at start of solve
        // Actually, for 'scramble', we push to history.
        // For 'solve', we consume history.
        // But `history` array here tracks "moves made from solved state".
        // When solving, we are reducing this distance. 
        // However, our `solve()` function clears history immediately and pushes reverse moves to queue.
        // So `history.current.length` will be 0 during solve animation?
        // Correct: The moment solve starts, we consider it "on track to 0". 
        // To visualize countdown, we might need a separate counter, but for now `moveCount` 0 during solve is acceptable
        // OR we can decrement moveCount in App via callback?
        // Current `solve` clears history immediately.
        // Let's fix that: We want to see the countdown!
        
        if (onMoveComplete) {
            // If queue has items, we are still processing a batch.
            // We can estimate remaining moves.
            // But `history` is used for tracking the path back.
            onMoveComplete(history.current.length + moveQueue.current.length);
        }
      }
    }
  });

  // --- Exposed Methods ---

  useImperativeHandle(ref, () => ({
    scramble: async (count = 20) => {
      // Don't clear history, append to it to allow multiple scrambles.
      moveQueue.current = []; 
      speed.current = ANIMATION_SPEED_FAST;

      const axes: Axis[] = ['x', 'y', 'z'];
      const layers = [-1, 0, 1];
      const dirs: Direction[] = [1, -1];
      
      let lastMove = history.current.length > 0 ? history.current[history.current.length - 1] : null;

      for (let i = 0; i < count; i++) {
        let move: Move | null = null;
        
        // Attempt to find a non-redundant move
        for(let attempt = 0; attempt < 5; attempt++) {
             const axis = axes[Math.floor(Math.random() * axes.length)];
             const layer = layers[Math.floor(Math.random() * layers.length)];
             const dir = dirs[Math.floor(Math.random() * dirs.length)];
             
             // Avoid immediate undo
             if (lastMove && lastMove.axis === axis && lastMove.layer === layer && lastMove.dir === -dir) {
                 continue;
             }
             move = { axis, layer, dir };
             break;
        }
        
        // Fallback
        if (!move) {
             move = { axis: 'x', layer: 1, dir: 1 };
        }

        moveQueue.current.push(move);
        history.current.push(move);
        lastMove = move;
      }
      
      return new Promise<void>(resolve => {
        const interval = setInterval(() => {
            if (moveQueue.current.length === 0 && !isAnimating.current) {
                clearInterval(interval);
                speed.current = ANIMATION_SPEED_NORMAL;
                resolve();
            }
        }, 100);
      });
    },

    solve: async () => {
        if (history.current.length === 0) return;

        speed.current = ANIMATION_SPEED_FAST;
        
        // Create reverse moves
        const movesToSolve = [...history.current].reverse().map(m => ({
            ...m,
            dir: (m.dir * -1) as Direction
        }));

        // Clear history immediately as we are committing to solve
        history.current = []; 
        
        // Push to queue. Note: We don't push to history because these are "undo" moves.
        moveQueue.current = [...moveQueue.current, ...movesToSolve];

        return new Promise<void>(resolve => {
            const interval = setInterval(() => {
                if (moveQueue.current.length === 0 && !isAnimating.current) {
                    clearInterval(interval);
                    speed.current = ANIMATION_SPEED_NORMAL;
                    resolve();
                }
            }, 100);
        });
    },

    reset: () => {
        moveQueue.current = [];
        history.current = [];
        isAnimating.current = false;
        currentMove.current = null;
        pivotRef.current?.rotation.set(0,0,0);
        // Visual reset is handled by parent remounting
    },
    
    getHistoryLength: () => history.current.length
  }));

  return (
    <group ref={groupRef}>
      <group ref={pivotRef} />
      {initialPositions.map(({ id, p }) => (
        <Cubie key={id} name={`cubie-${id}`} position={p} />
      ))}
    </group>
  );
});