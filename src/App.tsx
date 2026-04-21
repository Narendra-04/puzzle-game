/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Terminal, Disc, Skull, Hash } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_DECREMENT = 2; // Milliseconds to speed up per food eaten

const TRACKS = [
  {
    id: '0x0A1',
    title: 'SYS.OP.DRIVE_01',
    url: 'https://actions.google.com/sounds/v1/science_fiction/sci_fi_hum.ogg',
    duration: '02:45'
  },
  {
    id: '0x0B2',
    title: 'CORRUPTION_PROTOCOL.EXE',
    url: 'https://actions.google.com/sounds/v1/science_fiction/computer_data_tape.ogg',
    duration: '01:12'
  },
  {
    id: '0x0C3',
    title: 'AI_OVERRIDE_SEQUENCE',
    url: 'https://actions.google.com/sounds/v1/science_fiction/alien_spaceship_flyby.ogg',
    duration: '03:30'
  }
];

type Point = { x: number; y: number };

export default function App() {
  // Game State
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 15 });
  const [dir, setDir] = useState<Point>({ x: 0, y: -1 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlayingGame, setIsPlayingGame] = useState(false);
  
  // Audio State
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Terminal Logs
  const [logs, setLogs] = useState<string[]>([
    "INITIALIZING SYSTEM...",
    "KERNEL LOADED (0x7F2A).",
    "AWAITING HUMAN DIRECTIVE."
  ]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => {
      const next = [...prev, msg];
      if (next.length > 6) return next.slice(next.length - 6);
      return next;
    });
  }, []);

  // --- Audio Logic ---
  useEffect(() => {
    if (audioRef.current) {
        if (isPlayingAudio) {
            audioRef.current.play().catch(e => {
                console.error("Audio playback failed", e);
                setIsPlayingAudio(false);
                addLog("ERR: AUDIO_SYS_FAILURE");
            });
            addLog(`PLAYING: ${TRACKS[currentTrackIdx].title}`);
        } else {
            audioRef.current.pause();
            addLog(`PAUSED: ${TRACKS[currentTrackIdx].title}`);
        }
    }
  }, [isPlayingAudio, currentTrackIdx, addLog]);

  const handleSkip = (direction: 'next' | 'prev') => {
    setCurrentTrackIdx(prev => {
      if (direction === 'next') return (prev + 1) % TRACKS.length;
      return (prev - 1 + TRACKS.length) % TRACKS.length;
    });
  };

  // --- Game Logic ---
  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // eslint-disable-next-line no-loop-func
      if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        break;
      }
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDir({ x: 0, y: -1 });
    setFood(generateFood([{ x: 10, y: 10 }]));
    setScore(0);
    setGameOver(false);
    setIsPlayingGame(true);
    addLog("SNAKE_PROTOCOL ENGAGED.");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlayingGame || gameOver) return;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          if (dir.y !== 1) setDir({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
          if (dir.y !== -1) setDir({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
          if (dir.x !== 1) setDir({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
          if (dir.x !== -1) setDir({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dir, isPlayingGame, gameOver]);

  useEffect(() => {
    if (!isPlayingGame || gameOver) return;

    const currentSpeed = Math.max(50, INITIAL_SPEED - score * SPEED_DECREMENT);
    
    const moveSnake = setInterval(() => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        const newHead = { x: head.x + dir.x, y: head.y + dir.y };

        // Collision Check
        if (
          newHead.x < 0 || newHead.x >= GRID_SIZE ||
          newHead.y < 0 || newHead.y >= GRID_SIZE ||
          prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)
        ) {
          setGameOver(true);
          setIsPlayingGame(false);
          addLog("FATAL: KERNEL PANIC.");
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Eat Food
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(s => s + 1);
          setFood(generateFood(newSnake));
          addLog(`DATA_FRAGMENT_OBTAINED: +1`);
          // Note: tail is not popped, so snake grows
        } else {
          newSnake.pop(); // Remove tail
        }

        return newSnake;
      });
    }, currentSpeed);

    return () => clearInterval(moveSnake);
  }, [dir, food, isPlayingGame, gameOver, score, generateFood, addLog]);

  return (
    <div className="min-h-screen w-full bg-[#050505] text-[#0ff] crt noise-bg overflow-hidden flex items-center justify-center p-4 selection:bg-[#f0f] selection:text-[#050505]">
      
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        src={TRACKS[currentTrackIdx].url} 
        onEnded={() => handleSkip('next')} 
        loop={false}
      />

      <div className="w-full max-w-5xl md:h-[800px] h-auto flex flex-col md:flex-row gap-6 relative z-10">
        
        {/* LEFT COLUMN: Deck / Music Player */}
        <div className="w-full md:w-1/3 flex flex-col gap-6">
          
          {/* Header Panel */}
          <div className="box-neon p-6 bg-black/60 backdrop-blur-sm relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0ff] to-transparent opacity-50" />
            <h1 className="text-2xl font-bold font-pixel tracking-tighter mb-2 glitch" data-text="SYNTH_DECK">
              SYNTH_DECK
            </h1>
            <p className="text-sm font-terminal opacity-70">v. 4.2.0.9 // AI_OPERATIVE</p>
          </div>

          {/* Music Player Panel */}
          <div className="box-neon-magenta p-6 bg-black/60 backdrop-blur-sm flex-grow flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6 border-b border-[#f0f]/30 pb-4">
                <Disc className={`w-8 h-8 text-[#f0f] ${isPlayingAudio ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                <div>
                  <h2 className="font-pixel text-xs text-[#f0f]">CURRENT_STREAM</h2>
                  <p className="font-terminal text-xl mt-1 glitch" data-text={TRACKS[currentTrackIdx].title}>
                    {TRACKS[currentTrackIdx].title}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                 {TRACKS.map((track, idx) => (
                   <div 
                     key={track.id} 
                     className={`font-terminal flex justify-between cursor-pointer transition-colors ${idx === currentTrackIdx ? 'text-[#f0f] border-l-2 border-[#f0f] pl-2' : 'opacity-50 hover:opacity-100 hover:text-[#0ff]'}`}
                     onClick={() => {
                        setCurrentTrackIdx(idx);
                        setIsPlayingAudio(true);
                     }}
                   >
                     <span>[{track.id}] {track.title}</span>
                     <span>{track.duration}</span>
                   </div>
                 ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pt-4 border-t border-[#f0f]/30">
              <button 
                onClick={() => handleSkip('prev')} 
                className="p-3 box-neon-magenta hover:bg-[#f0f] hover:text-black transition-colors"
                aria-label="Previous Track"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>
              <button 
                onClick={() => setIsPlayingAudio(!isPlayingAudio)} 
                className="p-4 box-neon-magenta text-[#f0f] hover:bg-[#f0f] hover:text-black transition-colors"
                aria-label={isPlayingAudio ? "Pause" : "Play"}
              >
                {isPlayingAudio ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
              </button>
              <button 
                onClick={() => handleSkip('next')} 
                className="p-3 box-neon-magenta hover:bg-[#f0f] hover:text-black transition-colors"
                aria-label="Next Track"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>

          {/* Terminal Output */}
          <div className="box-neon p-4 bg-black/80 font-terminal h-40 overflow-hidden relative group">
             <div className="absolute top-2 right-2 opacity-50">
               <Terminal className="w-4 h-4" />
             </div>
             <div className="flex flex-col justify-end h-full">
               {logs.map((log, i) => (
                 <div key={i} className="text-sm opacity-80 leading-relaxed">
                   <span className="text-[#f0f] mr-2">root@ai~#</span>
                   {log}
                 </div>
               ))}
               <div className="text-sm animate-pulse mt-1">
                 <span className="text-[#f0f] mr-2">root@ai~#</span>_
               </div>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Snake Game */}
        <div className="w-full md:w-2/3 flex flex-col group relative">
          
          {/* Game Header */}
          <div className="flex justify-between items-center mb-4 box-neon-green p-4 bg-black/60 relative overflow-hidden">
             <div className="absolute inset-0 bg-[#39ff14]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="flex items-center gap-3">
               <Hash className="text-[#39ff14] w-6 h-6" />
               <span className="font-pixel text-[#39ff14] text-sm md:text-base">DATA_FRAGMENTS: {score.toString().padStart(4, '0')}</span>
             </div>
             {gameOver && (
               <div className="flex items-center gap-2 text-[#f0f] font-pixel text-xs animate-pulse">
                 <Skull className="w-4 h-4" />
                 <span>SYSTEM FAILURE</span>
               </div>
             )}
          </div>

          {/* Game Board Container */}
          <div className="flex-grow box-neon-green bg-[#020a02] relative aspect-square md:aspect-auto w-full max-w-full overflow-hidden flex items-center justify-center p-2">
            
            <div 
              className="relative w-full h-full max-w-[500px] max-h-[500px] bg-black/40 box-neon-green"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
              }}
            >
              {/* Background Grid Lines (visual flair) */}
              <div className="absolute inset-0 pointer-events-none" style={{
                 backgroundImage: 'linear-gradient(rgba(57, 255, 20, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(57, 255, 20, 0.1) 1px, transparent 1px)',
                 backgroundSize: `${100/GRID_SIZE}% ${100/GRID_SIZE}%`
              }} />

              {/* Game Entities */}
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
                const x = idx % GRID_SIZE;
                const y = Math.floor(idx / GRID_SIZE);
                
                const isSnakeHead = snake[0].x === x && snake[0].y === y;
                const isSnakeBody = !isSnakeHead && snake.some(s => s.x === x && s.y === y);
                const isFood = food.x === x && food.y === y;

                return (
                  <div 
                    key={idx}
                    className={`
                      ${isSnakeHead ? 'bg-[#39ff14] shadow-[0_0_10px_#39ff14] z-20 relative' : ''}
                      ${isSnakeBody ? 'bg-[#39ff14]/70 border border-[#39ff14]/30 z-10' : ''}
                      ${isFood ? 'bg-[#0ff] shadow-[0_0_15px_#0ff] animate-pulse z-10' : ''}
                    `}
                    style={{
                      borderRadius: isFood ? '50%' : (isSnakeHead ? '2px' : '0')
                    }}
                  />
                );
              })}
            </div>

            {/* Overlays */}
            {(!isPlayingGame || gameOver) && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                <div className="box-neon p-8 bg-black/90 flex flex-col items-center text-center max-w-sm">
                  <h2 className="font-pixel text-[#0ff] text-xl md:text-2xl mb-6 glitch" data-text={gameOver ? "KERNEL PANIC" : "SNAKE_PROTOCOL"}>
                    {gameOver ? "KERNEL PANIC" : "SNAKE_PROTOCOL"}
                  </h2>
                  
                  {gameOver && (
                    <p className="font-terminal text-[#f0f] text-lg mb-6">
                      FRAGMENTS SAVED: {score}
                    </p>
                  )}

                  <button 
                    onClick={resetGame}
                    className="box-neon px-6 py-4 font-pixel text-xs md:text-sm text-[#0ff] hover:bg-[#0ff] hover:text-black transition-all"
                  >
                    {gameOver ? "REBOOT_SYSTEM()" : "EXECUTE_PROGRAM()"}
                  </button>
                  
                  <p className="font-terminal opacity-50 mt-6 text-sm">
                    USE [W][A][S][D] OR [ARROWS] TO NAVIGATE
                  </p>
                </div>
              </div>
            )}
            
          </div>
          
        </div>

      </div>
    </div>
  );
}

