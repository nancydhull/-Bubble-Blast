import React, { useState, useEffect } from 'react';
import { GameState } from '../types';
import { Play, Settings, Trophy, HelpCircle, Volume2, VolumeX, RotateCcw, Home, Pause, Sparkles, Target, Zap, Lock } from 'lucide-react';
import { audio } from '../utils/audio';

import bgImage from '../assets/images/dark_arcade_bubbles_1785299834606.jpg';

interface UIProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  score: number;
  level: number;
  shotsLeft: number;
  playerName: string;
  setPlayerName: (name: string) => void;
  startingLevel: number;
  setStartingLevel: (level: number) => void;
  maxUnlockedLevel: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  onStart: () => void;
  onRestart: () => void;
  onNextLevel: () => void;
  onHome: () => void;
  inventory: { bombs: number, rainbows: number };
  onUsePowerup: (type: 'bomb' | 'rainbow') => void;
}

export const GameUI: React.FC<UIProps> = ({
  gameState,
  setGameState,
  score,
  level,
  shotsLeft,
  playerName,
  setPlayerName,
  startingLevel,
  setStartingLevel,
  maxUnlockedLevel,
  soundEnabled,
  setSoundEnabled,
  onStart,
  onRestart,
  onNextLevel,
  onHome,
  inventory,
  onUsePowerup
}) => {
  const [tempName, setTempName] = useState(playerName);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      setPlayerName(tempName.trim());
      setGameState('menu');
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between z-50 font-sans selection:bg-purple-200">
      
      {/* HUD - only visible during gameplay */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <div className="w-full flex justify-between items-center z-10 pointer-events-auto p-2 sm:p-2.5 px-2.5 sm:px-4">
          {/* Left Side: Level & Score */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Level Badge */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-md border border-purple-400/40 font-black text-xs sm:text-sm tracking-wide flex items-center gap-1">
              <Sparkles size={13} className="text-purple-200" />
              <span>Lvl {level}</span>
            </div>

            {/* Score Pill */}
            <div className="bg-slate-900/90 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-md border border-slate-700/70 flex items-center gap-1.5 text-white font-black text-xs sm:text-sm">
              <Zap size={13} className="text-amber-400 fill-amber-400" />
              <span><span className="text-slate-400 hidden sm:inline mr-0.5">Score:</span>{score}</span>
            </div>
          </div>

          {/* Right Side: Shots Left & Pause Button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Shots Left Pill */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-md border border-amber-400/40 font-black text-xs sm:text-sm tracking-wide flex items-center gap-1">
              <Target size={13} className="text-amber-200" />
              <span>Shots: {shotsLeft}</span>
            </div>

            {/* Pause Button */}
            <button 
              onClick={() => setGameState('paused')}
              className="bg-slate-900/90 backdrop-blur-md p-1.5 sm:p-2 rounded-xl shadow-md border border-slate-700/70 hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all text-white"
              title="Pause Game"
            >
              <Pause size={15} className="fill-slate-200 text-slate-200" />
            </button>
          </div>
        </div>
      )}

      {/* Powerups HUD - visible during playing, positioned left & right at balanced distance near shooter ball */}
      {gameState === 'playing' && (
        <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-between pointer-events-none z-20 w-[210px] sm:w-[240px]">
          {/* Bomb Powerup - Left of shooter ball */}
          <button 
            onClick={() => onUsePowerup('bomb')}
            disabled={inventory.bombs <= 0}
            className={`group relative w-9 sm:w-10 h-9 sm:h-10 rounded-xl border shadow-lg flex items-center justify-center transition-all pointer-events-auto ${
              inventory.bombs > 0 
                ? 'bg-slate-900/90 backdrop-blur-md border-red-500/60 hover:bg-slate-800 hover:scale-110 active:scale-95 text-white shadow-red-500/20 ring-1 ring-red-400/30' 
                : 'bg-slate-900/40 backdrop-blur-sm border-slate-700/50 opacity-40 cursor-not-allowed grayscale'
            }`}
            title="Use Bomb"
          >
            <div className="text-sm sm:text-base drop-shadow-sm group-hover:scale-110 transition-transform">💣</div>
            <div className={`absolute -top-1.5 -right-1.5 w-4 sm:w-4.5 h-4 sm:h-4.5 flex items-center justify-center font-black text-[9px] sm:text-[10px] rounded-full border border-slate-900 shadow-md ${
              inventory.bombs > 0 ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white' : 'bg-slate-600 text-slate-300'
            }`}>
              {inventory.bombs}
            </div>
          </button>
          
          {/* Rainbow Powerup - Right of shooter ball */}
          <button 
            onClick={() => onUsePowerup('rainbow')}
            disabled={inventory.rainbows <= 0}
            className={`group relative w-9 sm:w-10 h-9 sm:h-10 rounded-xl border shadow-lg flex items-center justify-center transition-all pointer-events-auto ${
              inventory.rainbows > 0 
                ? 'bg-slate-900/90 backdrop-blur-md border-purple-500/60 hover:bg-slate-800 hover:scale-110 active:scale-95 text-white shadow-purple-500/20 ring-1 ring-purple-400/30' 
                : 'bg-slate-900/40 backdrop-blur-sm border-slate-700/50 opacity-40 cursor-not-allowed grayscale'
            }`}
            title="Use Rainbow"
          >
            <div className="text-sm sm:text-base drop-shadow-sm group-hover:scale-110 transition-transform">🌈</div>
            <div className={`absolute -top-1.5 -right-1.5 w-4 sm:w-4.5 h-4 sm:h-4.5 flex items-center justify-center font-black text-[9px] sm:text-[10px] rounded-full border border-slate-900 shadow-md ${
              inventory.rainbows > 0 ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' : 'bg-slate-600 text-slate-300'
            }`}>
              {inventory.rainbows}
            </div>
          </button>
        </div>
      )}

      {/* FULL SCREEN MAIN MENU */}
      {gameState === 'menu' && (
        <div 
          className="fixed inset-0 z-50 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 overflow-y-auto animate-in fade-in duration-300 pointer-events-auto bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(to bottom right, rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.95)), url(${bgImage})` }}
        >
          
          {/* Top Navigation */}
          <div className="w-full max-w-5xl mx-auto flex justify-between items-center mb-2">
            <button
              onClick={() => setGameState('help')}
              className="px-3.5 py-2 sm:px-5 sm:py-3 bg-white/90 hover:bg-white text-slate-700 hover:text-purple-600 rounded-2xl border border-white/80 shadow-lg shadow-purple-500/5 transition-all flex items-center gap-1.5 sm:gap-2 font-bold text-xs sm:text-sm active:scale-95"
              title="How to Play"
            >
              <HelpCircle size={18} className="text-purple-500" />
              <span className="hidden xs:inline">How to Play</span>
            </button>
            
            <button
              onClick={() => {
                const newSound = !soundEnabled;
                setSoundEnabled(newSound);
                audio.toggle(newSound);
              }}
              className="px-3.5 py-2 sm:px-5 sm:py-3 bg-white/90 hover:bg-white text-slate-700 hover:text-purple-600 rounded-2xl border border-white/80 shadow-lg shadow-purple-500/5 transition-all flex items-center gap-1.5 sm:gap-2 font-bold text-xs sm:text-sm active:scale-95"
              title="Sound Toggle"
            >
              {soundEnabled ? (
                <>
                  <Volume2 size={18} className="text-emerald-500" />
                  <span className="hidden sm:inline">Sound ON</span>
                </>
              ) : (
                <>
                  <VolumeX size={18} className="text-slate-400" />
                  <span className="hidden sm:inline">Sound OFF</span>
                </>
              )}
            </button>
          </div>

          {/* Central Hero Section */}
          <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-6 my-auto py-4">
            
            {/* Custom Logo Emblem */}
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 rounded-full animate-pulse blur-lg opacity-40"></div>
              <img 
                src="/logo.png" 
                alt="Bubble Blast Logo" 
                className="relative w-full h-full object-contain rounded-full shadow-2xl shadow-purple-500/30 z-10"
                onError={(e) => {
                  // Fallback if logo not found
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden relative w-full h-full bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 rounded-full p-1 shadow-2xl shadow-purple-500/30 flex items-center justify-center">
                <div className="w-full h-full bg-gradient-to-br from-white/30 via-transparent to-black/20 rounded-full flex items-center justify-center relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute top-2 left-3 w-8 h-8 bg-white/70 rounded-full blur-[2px]"></div>
                  <Sparkles size={40} className="text-white drop-shadow-md z-10 animate-spin" style={{ animationDuration: '10s' }} />
                </div>
              </div>
            </div>

            {/* Game Title */}
            <div className="text-center">
              <h1 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 drop-shadow-md tracking-tight leading-none mb-2">
                Bubble Blast
              </h1>
              <p className="text-purple-200 font-bold text-sm sm:text-base tracking-wide uppercase drop-shadow-sm">
                Arcade Match & Shoot
              </p>
            </div>

            {/* Main Action Buttons */}
            <div className="w-full max-w-md flex flex-col gap-3.5 mt-2">
              <button
                onClick={onStart}
                className="w-full py-4 sm:py-5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-700 hover:to-pink-700 text-white font-black rounded-2xl shadow-xl shadow-purple-500/25 transform transition-all hover:scale-[1.02] active:scale-95 text-xl sm:text-2xl flex items-center justify-center gap-3 tracking-wider border border-white/30"
              >
                <Play size={28} fill="currentColor" /> PLAY GAME
              </button>

              <button
                onClick={() => setGameState('settings')}
                className="w-full py-3.5 sm:py-4 bg-white/90 hover:bg-white text-slate-800 font-extrabold rounded-2xl shadow-lg shadow-purple-500/5 border border-white hover:border-purple-200 transition-all hover:scale-[1.01] active:scale-95 text-base sm:text-lg flex items-center justify-center gap-2"
              >
                <Settings size={20} className="text-purple-600" /> LEVEL SELECT ({startingLevel})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY DIALOGS (Login, Settings, Help, Pause, Gameover, Levelcomplete, Gamebeat) */}
      {['login', 'settings', 'help', 'paused', 'gameover', 'levelcomplete', 'gamebeat'].includes(gameState) && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-auto w-full p-4 overflow-y-auto ${['login', 'settings', 'help'].includes(gameState) ? 'bg-cover bg-center' : 'bg-slate-950/70 backdrop-blur-md'}`}
          style={['login', 'settings', 'help'].includes(gameState) ? { backgroundImage: `linear-gradient(to bottom right, rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.95)), url(${bgImage})` } : undefined}
        >
        
        {/* LOGIN SCREEN */}
        {gameState === 'login' && (
          <div className="bg-white/95 text-slate-800 backdrop-blur-2xl p-8 sm:p-10 rounded-3xl shadow-2xl flex flex-col items-center max-w-md w-full border border-white/80 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 mb-5 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full animate-pulse shadow-lg shadow-purple-500/40"></div>
              <Sparkles size={36} className="relative text-white z-10 animate-bounce" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-1 text-center tracking-tight">
              Bubble Blast
            </h1>
            <p className="text-slate-500 mb-7 text-center font-semibold text-sm">Enter player name to begin</p>
            
            <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Your Player Name"
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 font-extrabold focus:outline-none focus:border-purple-500 focus:bg-white transition-colors text-center text-lg placeholder:text-slate-400 placeholder:font-normal"
                autoFocus
                maxLength={15}
              />
              <button
                type="submit"
                disabled={!tempName.trim()}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-lg shadow-purple-500/25 transition-all text-lg active:scale-95"
              >
                Start Playing
              </button>
            </form>
          </div>
        )}

        {/* SETTINGS DIALOG */}
        {gameState === 'settings' && (
          <div className="bg-white/95 text-slate-800 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-md w-full border border-white/80 animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-1 flex items-center gap-2">
              <Settings className="text-purple-600" /> Select Level
            </h2>
            <p className="text-xs text-slate-500 font-bold mb-5">
              Unlocked up to <span className="text-purple-600 font-extrabold">Level {maxUnlockedLevel}</span>
            </p>
            
            <div className="w-full mb-6">
              <div className="h-72 overflow-y-auto bg-slate-50 p-3 rounded-2xl border border-slate-200 grid grid-cols-5 gap-2">
                {Array.from({ length: 100 }, (_, i) => i + 1).map((lvl) => {
                  const isUnlocked = lvl <= maxUnlockedLevel;
                  const isSelected = startingLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      disabled={!isUnlocked}
                      onClick={() => isUnlocked && setStartingLevel(lvl)}
                      className={`aspect-square flex flex-col items-center justify-center font-black rounded-xl transition-all border shadow-sm ${
                        !isUnlocked
                          ? 'bg-slate-200/70 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'bg-purple-600 text-white border-purple-700 scale-105 shadow-md ring-2 ring-purple-400'
                          : 'bg-white text-slate-700 hover:bg-purple-50 hover:text-purple-700 hover:scale-105 border-slate-200'
                      }`}
                      title={isUnlocked ? `Select Level ${lvl}` : `Level ${lvl} is Locked`}
                    >
                      {isUnlocked ? (
                        <span className="text-sm sm:text-base">{lvl}</span>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <Lock size={12} className="text-slate-400" />
                          <span className="text-[10px] text-slate-400 font-bold">{lvl}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <button
              onClick={() => setGameState('menu')}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded-2xl shadow-lg transition-colors text-base"
            >
              Done
            </button>
          </div>
        )}

        {/* HELP DIALOG */}
        {gameState === 'help' && (
          <div className="bg-white/95 text-slate-800 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col max-w-md w-full border border-white/80 animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
              <HelpCircle className="text-purple-600" /> How to Play
            </h2>
            
            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-600 font-semibold">
              <li className="flex gap-3 items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xl leading-none">🎯</span>
                <p>Aim with the interactive direction line and release to shoot the bubble.</p>
              </li>
              <li className="flex gap-3 items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xl leading-none">💥</span>
                <p>Match 3 or more bubbles of the same color to pop them!</p>
              </li>
              <li className="flex gap-3 items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xl leading-none">⬇️</span>
                <p>Avoid missing too many shots — misses lower the ceiling towards the line!</p>
              </li>
              <li className="flex gap-3 items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xl leading-none">💣</span>
                <p>Use special power-ups like bombs and rainbow bubbles when stuck.</p>
              </li>
            </ul>
            
            <button
              onClick={() => setGameState('menu')}
              className="mt-6 w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-2xl shadow-lg transition active:scale-95 text-base"
            >
              Back to Menu
            </button>
          </div>
        )}

        {/* PAUSED DIALOG */}
        {gameState === 'paused' && (
          <div className="bg-white/95 text-slate-800 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full border border-white/80 animate-in fade-in zoom-in duration-300">
            <h2 className="text-3xl font-black text-slate-800 mb-6">Game Paused</h2>
            
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => setGameState('playing')}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black rounded-2xl shadow-lg shadow-purple-500/25 transform transition active:scale-95 flex items-center justify-center gap-2 text-lg"
              >
                <Play size={20} fill="currentColor" /> Resume
              </button>
              
              <button
                onClick={onRestart}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl transition flex items-center justify-center gap-2 border border-slate-200"
              >
                <RotateCcw size={18} /> Restart Level
              </button>
              
              <button
                onClick={onHome}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl transition flex items-center justify-center gap-2 border border-slate-200"
              >
                <Home size={18} /> Quit to Menu
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER DIALOG */}
        {gameState === 'gameover' && (
          <div className="bg-white/95 text-slate-800 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full border border-white/80 animate-in fade-in zoom-in duration-300">
            <h2 className="text-3xl sm:text-4xl font-black text-red-500 mb-1 drop-shadow-sm">Game Over</h2>
            <p className="text-slate-500 mb-5 text-center font-bold text-sm">Better luck next shot!</p>
            
            <div className="w-full bg-slate-50 rounded-2xl p-4 mb-6 flex flex-col items-center border border-slate-200 shadow-inner">
              <span className="text-xs text-slate-400 uppercase tracking-widest font-extrabold mb-1">Final Score</span>
              <span className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight">{score}</span>
              <span className="text-xs text-purple-600 font-extrabold mt-2 bg-purple-100 px-3 py-1 rounded-lg border border-purple-200">Level {level}</span>
            </div>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={onRestart}
                className="w-full py-3.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-extrabold rounded-2xl shadow-lg shadow-red-500/25 transform transition active:scale-95 text-base sm:text-lg flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} /> Try Again
              </button>
              
              <button
                onClick={onHome}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl transition flex items-center justify-center gap-2 border border-slate-200"
              >
                <Home size={18} /> Main Menu
              </button>
            </div>
          </div>
        )}

        {/* LEVEL COMPLETE DIALOG */}
        {gameState === 'levelcomplete' && (
          <div className="bg-white/95 text-slate-800 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full border border-white/80 animate-in fade-in zoom-in duration-300">
            <div className="flex gap-2 mb-2 text-amber-400 text-3xl animate-bounce">
              <span>⭐</span><span>⭐</span><span>⭐</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600 mb-1 text-center">
              Level {level} Cleared!
            </h2>
            <p className="text-slate-500 mb-5 text-center font-bold text-sm">Great shooting! Ready for the next challenge?</p>
            
            <div className="w-full bg-slate-50 rounded-2xl p-4 mb-6 flex flex-col items-center border border-slate-200 shadow-inner gap-2">
              <div className="flex justify-between w-full text-sm font-bold text-slate-600 border-b border-slate-200 pb-2">
                <span>Score Earned:</span>
                <span className="text-purple-600 font-black text-base">{score}</span>
              </div>
              <div className="flex justify-between w-full text-sm font-bold text-slate-600 pt-1">
                <span>Shots Remaining:</span>
                <span className="text-emerald-600 font-black text-base">{shotsLeft}</span>
              </div>
            </div>

            <button
              onClick={onNextLevel}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/25 transform transition active:scale-95 text-lg flex items-center justify-center gap-2 tracking-wide"
            >
              <Play size={22} fill="currentColor" /> NEXT LEVEL
            </button>
          </div>
        )}

        {/* GAME BEAT DIALOG */}
        {gameState === 'gamebeat' && (
          <div className="bg-white/95 text-slate-800 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full border border-white/80 animate-in fade-in zoom-in duration-300">
            <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-600 mb-2 text-center">YOU WIN!</h2>
            <p className="text-slate-500 mb-6 text-center font-bold text-sm">Congratulations! You completed all 100 levels!</p>
            
            <div className="w-full bg-slate-50 rounded-2xl p-4 mb-6 flex flex-col items-center border border-slate-200 shadow-inner">
              <Trophy size={40} className="text-amber-500 mb-2 fill-amber-400" />
              <span className="text-xs text-amber-600 uppercase tracking-widest font-extrabold mb-1">Final Epic Score</span>
              <span className="text-4xl sm:text-5xl font-black text-amber-600 tracking-tight">{score}</span>
            </div>

            <button
              onClick={onHome}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold rounded-2xl shadow-lg shadow-amber-500/25 transform transition active:scale-95 text-base sm:text-lg flex items-center justify-center gap-2"
            >
              <Home size={20} /> Return to Menu
            </button>
          </div>
        )}

        </div>
      )}
    </div>
  );
};

