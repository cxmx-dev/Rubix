import React, { useState, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import { RotateCcw, Play, Shuffle } from 'lucide-react';
import { RubiksCube, CubeRef } from './components/RubiksCube';

const App: React.FC = () => {
  const cubeRef = useRef<CubeRef>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [isScrambling, setIsScrambling] = useState(false);
  const [cubeKey, setCubeKey] = useState(0);

  const handleScramble = async () => {
    if (cubeRef.current && !isSolving && !isScrambling) {
      setIsScrambling(true);
      await cubeRef.current.scramble(20);
      setIsScrambling(false);
    }
  };

  const handleSolve = async () => {
    if (cubeRef.current && !isSolving && !isScrambling && moveCount > 0) {
      setIsSolving(true);
      await cubeRef.current.solve();
      // Move count will naturally go to 0 via callback
      setIsSolving(false);
    }
  };

  const handleReset = () => {
    setCubeKey(prev => prev + 1);
    setMoveCount(0);
    setIsSolving(false);
    setIsScrambling(false);
  };

  return (
    <div className="relative w-full h-full bg-slate-950 text-white font-sans overflow-hidden select-none">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900 to-black">
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
          <PerspectiveCamera makeDefault position={[6, 5, 6]} fov={40} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
          <spotLight position={[-10, 5, -5]} intensity={1} angle={0.5} />
          
          <Suspense fallback={null}>
            <group position={[0, 0, 0]}>
              <RubiksCube 
                key={cubeKey} 
                ref={cubeRef} 
                onMoveComplete={(count) => setMoveCount(count)} 
              />
            </group>
            <Environment preset="night" blur={0.6} background={false} />
            <ContactShadows position={[0, -2.5, 0]} opacity={0.5} scale={15} blur={2} far={4.5} color="#000000" />
          </Suspense>
          
          <OrbitControls 
            enablePan={false} 
            minDistance={5} 
            maxDistance={20} 
            dampingFactor={0.05}
            autoRotate={!isSolving && !isScrambling && moveCount > 0}
            autoRotateSpeed={1.0}
          />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6 md:p-8">
        
        {/* Header */}
        <div className="flex justify-between items-start pointer-events-auto animate-fade-in-down">
          <div className="flex items-center gap-3">
            {/* Custom CSS 3x3 Cube Icon */}
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg p-1.5 grid grid-cols-3 gap-0.5 shadow-lg shadow-blue-500/20 border border-blue-400/20">
              <div className="bg-white/90 rounded-[1px]"></div>
              <div className="bg-blue-300/90 rounded-[1px]"></div>
              <div className="bg-white/90 rounded-[1px]"></div>
              <div className="bg-blue-300/90 rounded-[1px]"></div>
              <div className="bg-white/90 rounded-[1px]"></div>
              <div className="bg-blue-300/90 rounded-[1px]"></div>
              <div className="bg-white/90 rounded-[1px]"></div>
              <div className="bg-blue-300/90 rounded-[1px]"></div>
              <div className="bg-white/90 rounded-[1px]"></div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter flex">
                <span className="text-red-500 drop-shadow-sm">R</span>
                <span className="text-white drop-shadow-sm">u</span>
                <span className="text-blue-500 drop-shadow-sm">b</span>
                <span className="text-green-500 drop-shadow-sm">i</span>
                <span className="text-yellow-400 drop-shadow-sm">x</span>
              </h1>
              <p className="text-slate-400 text-xs md:text-sm font-medium">
                Interactive Simulation Engine
              </p>
            </div>
          </div>
        </div>

        {/* Main Controls Container */}
        <div className="w-full max-w-md mx-auto pointer-events-auto animate-fade-in-up">
          
          {/* Status Display */}
          <div className="flex justify-between items-end mb-4 px-1">
             <div className="flex flex-col">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</span>
               <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${isSolving ? 'bg-green-500 animate-ping' : isScrambling ? 'bg-orange-500 animate-bounce' : 'bg-slate-500'}`}></div>
                 <span className={`text-sm font-semibold ${isSolving ? 'text-green-400' : isScrambling ? 'text-orange-400' : 'text-slate-300'}`}>
                   {isSolving ? 'Solving Sequence...' : isScrambling ? 'Scrambling...' : moveCount > 0 ? 'Ready to Solve' : 'Solved'}
                 </span>
               </div>
             </div>
             <div className="text-right">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Moves to Solve</span>
               <div className="text-2xl font-mono font-bold text-cyan-400 leading-none mt-1">{moveCount}</div>
             </div>
          </div>

          {/* Control Bar */}
          <div className="bg-slate-900/70 backdrop-blur-xl p-2 rounded-2xl border border-slate-700/50 shadow-2xl flex items-center gap-2">
            
            <button 
              onClick={handleReset}
              disabled={isSolving || isScrambling}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 border border-transparent hover:border-slate-600"
              title="Reset Cube"
            >
              <RotateCcw size={20} />
            </button>

            <div className="w-px h-8 bg-slate-700/50 mx-1"></div>

            <button 
              onClick={handleScramble}
              disabled={isSolving || isScrambling}
              className="flex-1 flex items-center justify-center gap-2 h-14 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold transition-all shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 active:scale-95 group"
            >
              <Shuffle size={18} className={`transition-transform group-hover:rotate-180 ${isScrambling ? 'animate-spin' : ''}`} />
              <span>Scramble</span>
            </button>

            <button 
              onClick={handleSolve}
              disabled={isSolving || isScrambling || moveCount === 0}
              className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-xl font-bold transition-all shadow-lg active:scale-95
                ${moveCount === 0 
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-900/20 hover:shadow-emerald-900/40'}`}
            >
              <Play size={18} fill="currentColor" />
              <span>Solve</span>
            </button>
          </div>
          
          <div className="text-center mt-4 pb-2">
             <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600 font-semibold">
                {isSolving ? 'Computing Solution...' : 'Drag to Rotate View'}
              </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;