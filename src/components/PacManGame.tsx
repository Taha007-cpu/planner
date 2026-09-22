"use client";

import { useEffect, useRef, useState } from "react";
import { X, Trophy, Heart, Play, RefreshCw, Volume2, VolumeX } from "lucide-react";

interface PacManGameProps {
  onClose: () => void;
}

// 0: راهرو خالی, 1: دیوار, 2: نقطه, 3: قرص قدرت, 4: در خروج خانه ارواح
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,3,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
  [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
  [1,1,1,1,2,1,0,1,1,4,1,1,0,1,2,1,1,1,1],
  [0,0,0,0,2,0,0,1,0,0,0,1,0,0,2,0,0,0,0], // تونل چپ و راست
  [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
  [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
  [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const TILE_SIZE = 22; // ابعاد دقیق هر کاشی به پیکسل
const ROWS = MAP.length;
const COLS = MAP[0].length;
const SPEED = 2; // سرعت متناسب با ابعاد برای هماهنگی کامل ریاضی

type Dir = { x: number; y: number; name: string };
const DIRS: Record<string, Dir> = {
  UP: { x: 0, y: -1, name: "UP" },
  DOWN: { x: 0, y: 1, name: "DOWN" },
  LEFT: { x: -1, y: 0, name: "LEFT" },
  RIGHT: { x: 1, y: 0, name: "RIGHT" },
  STOP: { x: 0, y: 0, name: "STOP" }
};

class SoundSynth {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playChomp() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.07);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.07);
  }

  playEatGhost() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(250, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playDeath() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }
}

export default function PacManGame({ onClose }: PacManGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const synthRef = useRef<SoundSynth>(new SoundSynth());

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<"ready" | "playing" | "gameover" | "win">("ready");
  const [soundOn, setSoundOn] = useState(true);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  useEffect(() => {
    const saved = localStorage.getItem("pacman_high_score");
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const toggleSound = () => {
    synthRef.current.enabled = !soundOn;
    setSoundOn(!soundOn);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let map = MAP.map((r) => [...r]);
    let totalPellets = 0;
    map.forEach((row) => row.forEach((cell) => { if (cell === 2 || cell === 3) totalPellets++; }));

    // تبدیل شماره کاشی به پیکسل مرکزی
    const toPixel = (tile: number) => tile * TILE_SIZE + TILE_SIZE / 2;

    let pacman = {
      x: toPixel(9),
      y: toPixel(16),
      dir: DIRS.LEFT,
      nextDir: DIRS.LEFT,
      mouth: 0.2,
      mouthSpeed: 0.03
    };

    let ghosts = [
      { id: 1, x: toPixel(9), y: toPixel(9), color: "#EF4444", dir: DIRS.UP, isScared: false },
      { id: 2, x: toPixel(8), y: toPixel(10), color: "#F472B6", dir: DIRS.UP, isScared: false },
      { id: 3, x: toPixel(9), y: toPixel(10), color: "#38BDF8", dir: DIRS.UP, isScared: false },
      { id: 4, x: toPixel(10), y: toPixel(10), color: "#FB923C", dir: DIRS.UP, isScared: false }
    ];

    let scaredTimer = 0;
    let currentScore = 0;
    let currentLives = 3;
    let pelletsEaten = 0;
    let animId: number;

    const isPassable = (tileX: number, tileY: number, isGhost = false) => {
      // تونل باز است
      if (tileY === 10 && (tileX < 0 || tileX >= COLS)) return true;
      if (tileX < 0 || tileX >= COLS || tileY < 0 || tileY >= ROWS) return false;
      const cell = map[tileY][tileX];
      if (cell === 1) return false; // دیوار
      if (cell === 4 && !isGhost) return false; // فقط ارواح از درب خروج رد می‌شوند
      return true;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "KeyW"].includes(e.code)) {
        pacman.nextDir = DIRS.UP;
        e.preventDefault();
      } else if (["ArrowDown", "KeyS"].includes(e.code)) {
        pacman.nextDir = DIRS.DOWN;
        e.preventDefault();
      } else if (["ArrowLeft", "KeyA"].includes(e.code)) {
        pacman.nextDir = DIRS.LEFT;
        e.preventDefault();
      } else if (["ArrowRight", "KeyD"].includes(e.code)) {
        pacman.nextDir = DIRS.RIGHT;
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    const resetPositions = () => {
      pacman.x = toPixel(9);
      pacman.y = toPixel(16);
      pacman.dir = DIRS.LEFT;
      pacman.nextDir = DIRS.LEFT;
      ghosts[0].x = toPixel(9); ghosts[0].y = toPixel(9); ghosts[0].dir = DIRS.UP;
      ghosts[1].x = toPixel(8); ghosts[1].y = toPixel(10); ghosts[1].dir = DIRS.UP;
      ghosts[2].x = toPixel(9); ghosts[2].y = toPixel(10); ghosts[2].dir = DIRS.UP;
      ghosts[3].x = toPixel(10); ghosts[3].y = toPixel(10); ghosts[3].dir = DIRS.UP;
    };

    const update = () => {
      if (gameStateRef.current !== "playing") return;

      // محاسبه کاشی فعلی و فاصله تا مرکز کاشی
      const curTileX = Math.floor(pacman.x / TILE_SIZE);
      const curTileY = Math.floor(pacman.y / TILE_SIZE);
      const centerX = toPixel(curTileX);
      const centerY = toPixel(curTileY);

      const isCenteredX = Math.abs(pacman.x - centerX) < SPEED;
      const isCenteredY = Math.abs(pacman.y - centerY) < SPEED;

      // 1. اگر بازیکن قصد چرخش ۱۸۰ درجه دارد، آنی بچرخد
      if (
        (pacman.nextDir.x !== 0 && pacman.nextDir.x === -pacman.dir.x) ||
        (pacman.nextDir.y !== 0 && pacman.nextDir.y === -pacman.dir.y)
      ) {
        pacman.dir = pacman.nextDir;
      }

      // 2. سیستم Cornering Assist: در مرکز تقاطع‌ها اسنپ شده و جهت جدید اعمال شود
      if (isCenteredX && isCenteredY) {
        // آیا در جهت بعدی راه باز است؟
        if (isPassable(curTileX + pacman.nextDir.x, curTileY + pacman.nextDir.y)) {
          pacman.x = centerX;
          pacman.y = centerY;
          pacman.dir = pacman.nextDir;
        }

        // آیا مسیر فعلی به دیوار خورده؟
        if (!isPassable(curTileX + pacman.dir.x, curTileY + pacman.dir.y)) {
          pacman.x = centerX;
          pacman.y = centerY;
          pacman.dir = DIRS.STOP;
        }
      }

      // اعمال حرکت
      pacman.x += pacman.dir.x * SPEED;
      pacman.y += pacman.dir.y * SPEED;

      // تونل رفت و برگشت
      if (pacman.x < 0) pacman.x = COLS * TILE_SIZE;
      if (pacman.x > COLS * TILE_SIZE) pacman.x = 0;

      // خوردن دانه‌ها
      const pTileX = Math.floor(pacman.x / TILE_SIZE);
      const pTileY = Math.floor(pacman.y / TILE_SIZE);
      if (pTileX >= 0 && pTileX < COLS && pTileY >= 0 && pTileY < ROWS) {
        if (map[pTileY][pTileX] === 2) {
          map[pTileY][pTileX] = 0;
          currentScore += 10;
          pelletsEaten++;
          setScore(currentScore);
          synthRef.current.playChomp();
        } else if (map[pTileY][pTileX] === 3) {
          map[pTileY][pTileX] = 0;
          currentScore += 50;
          pelletsEaten++;
          setScore(currentScore);
          scaredTimer = 350;
          ghosts.forEach((g) => (g.isScared = true));
          synthRef.current.playChomp();
        }
      }

      if (scaredTimer > 0) {
        scaredTimer--;
        if (scaredTimer === 0) ghosts.forEach((g) => (g.isScared = false));
      }

      // حرکت و هوش مصنوعی ارواح (با اسنپ تقاطع‌ها)
      ghosts.forEach((g) => {
        const gTileX = Math.floor(g.x / TILE_SIZE);
        const gTileY = Math.floor(g.y / TILE_SIZE);
        const gCenterX = toPixel(gTileX);
        const gCenterY = toPixel(gTileY);

        if (Math.abs(g.x - gCenterX) < SPEED && Math.abs(g.y - gCenterY) < SPEED) {
          g.x = gCenterX;
          g.y = gCenterY;

          const possibleDirs = [DIRS.UP, DIRS.DOWN, DIRS.LEFT, DIRS.RIGHT].filter((d) => {
            if (d.x === -g.dir.x && d.y === -g.dir.y) return false; // برعکس نشود
            return isPassable(gTileX + d.x, gTileY + d.y, true);
          });

          if (possibleDirs.length > 0) {
            g.dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
          } else {
            g.dir = { x: -g.dir.x, y: -g.dir.y, name: "REVERSE" };
          }
        }

        const ghostSpeed = g.isScared ? SPEED * 0.6 : SPEED * 0.9;
        g.x += g.dir.x * ghostSpeed;
        g.y += g.dir.y * ghostSpeed;

        if (g.x < 0) g.x = COLS * TILE_SIZE;
        if (g.x > COLS * TILE_SIZE) g.x = 0;

        // برخورد
        const dist = Math.hypot(pacman.x - g.x, pacman.y - g.y);
        if (dist < TILE_SIZE * 0.75) {
          if (g.isScared) {
            currentScore += 200;
            setScore(currentScore);
            synthRef.current.playEatGhost();
            g.x = toPixel(9);
            g.y = toPixel(10);
            g.isScared = false;
          } else {
            currentLives--;
            setLives(currentLives);
            synthRef.current.playDeath();
            if (currentLives <= 0) {
              setGameState("gameover");
            } else {
              resetPositions();
            }
          }
        }
      });

      if (pelletsEaten >= totalPellets) setGameState("win");

      if (currentScore > highScore) {
        setHighScore(currentScore);
        localStorage.setItem("pacman_high_score", currentScore.toString());
      }
    };

    const draw = () => {
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // رسم ماز به سبک یکپارچه رترو
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const type = map[r][c];
          const x = c * TILE_SIZE;
          const y = r * TILE_SIZE;

          if (type === 1) {
            ctx.fillStyle = "#1e3a8a";
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = "#3b82f6";
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
          } else if (type === 4) {
            ctx.fillStyle = "#f472b6";
            ctx.fillRect(x, y + TILE_SIZE / 2 - 2, TILE_SIZE, 4);
          } else if (type === 2) {
            ctx.beginPath();
            ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = "#ffb8ae";
            ctx.fill();
          } else if (type === 3) {
            ctx.beginPath();
            ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 6, 0, Math.PI * 2);
            ctx.fillStyle = Math.floor(Date.now() / 180) % 2 === 0 ? "#ffb8ae" : "#ffffff";
            ctx.fill();
          }
        }
      }

      // دهان متحرک پک‌من
      pacman.mouth += pacman.mouthSpeed;
      if (pacman.mouth > 0.32 || pacman.mouth < 0.04) {
        pacman.mouthSpeed = -pacman.mouthSpeed;
      }

      let rotation = 0;
      if (pacman.dir === DIRS.RIGHT) rotation = 0;
      else if (pacman.dir === DIRS.DOWN) rotation = 0.5 * Math.PI;
      else if (pacman.dir === DIRS.LEFT) rotation = Math.PI;
      else if (pacman.dir === DIRS.UP) rotation = 1.5 * Math.PI;

      ctx.save();
      ctx.translate(pacman.x, pacman.y);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.arc(0, 0, TILE_SIZE / 2 - 1, pacman.mouth * Math.PI, (2 - pacman.mouth) * Math.PI);
      ctx.lineTo(0, 0);
      ctx.fillStyle = "#facc15";
      ctx.fill();
      ctx.restore();

      // رسم ارواح
      ghosts.forEach((g) => {
        const radius = TILE_SIZE / 2 - 2;
        const color = g.isScared
          ? scaredTimer < 80 && Math.floor(Date.now() / 150) % 2 === 0
            ? "#ffffff"
            : "#2563eb"
          : g.color;

        ctx.save();
        ctx.translate(g.x, g.y);

        ctx.beginPath();
        ctx.arc(0, -2, radius, Math.PI, 0, false);
        ctx.lineTo(radius, radius);
        for (let i = 0; i < 3; i++) {
          const step = (radius * 2) / 3;
          ctx.lineTo(radius - (i + 0.5) * step, radius - 3);
          ctx.lineTo(radius - (i + 1) * step, radius);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        if (!g.isScared) {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(-4 + g.dir.x * 2, -4 + g.dir.y * 2, 3.5, 0, Math.PI * 2);
          ctx.arc(4 + g.dir.x * 2, -4 + g.dir.y * 2, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#0000ff";
          ctx.beginPath();
          ctx.arc(-4 + g.dir.x * 3, -4 + g.dir.y * 3, 1.8, 0, Math.PI * 2);
          ctx.arc(4 + g.dir.x * 3, -4 + g.dir.y * 3, 1.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#fde047";
          ctx.beginPath();
          ctx.arc(-3, -2, 2, 0, Math.PI * 2);
          ctx.arc(3, -2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    };

    const loop = () => {
      update();
      draw();
      animId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center gap-4 text-white max-w-full">
        {/* هدر */}
        <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400">رکورد:</span>
              <span className="text-xs font-mono font-bold text-amber-400">{highScore}</span>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400">امتیاز: </span>
              <span className="text-sm font-mono font-black text-emerald-400">{score}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-slate-300" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* بوم بازی */}
        <div className="relative border-4 border-blue-950 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(30,58,138,0.4)] bg-slate-950">
          <canvas
            ref={canvasRef}
            width={COLS * TILE_SIZE}
            height={ROWS * TILE_SIZE}
            className="block"
          />

          {gameState === "ready" && (
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-4">
              <div className="text-center space-y-1">
                <h3 className="text-2xl font-black tracking-wider text-yellow-400">PAC-MAN</h3>
                <p className="text-xs text-slate-300">برای کنترل از کلیدهای جهت‌نما یا WASD استفاده کنید</p>
              </div>
              <button
                onClick={() => setGameState("playing")}
                className="flex items-center gap-2 px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-xl cursor-pointer shadow-lg hover:scale-105 transition-all"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>شروع بازی</span>
              </button>
            </div>
          )}

          {gameState === "gameover" && (
            <div className="absolute inset-0 bg-rose-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
              <span className="text-3xl font-black text-rose-400">GAME OVER</span>
              <p className="text-xs text-slate-200">امتیاز شما: {score}</p>
              <button
                onClick={() => {
                  setScore(0);
                  setLives(3);
                  setGameState("ready");
                  setTimeout(() => setGameState("playing"), 50);
                }}
                className="flex items-center gap-2 px-5 py-2 bg-white text-slate-950 font-black rounded-xl cursor-pointer hover:bg-slate-200 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>بازی مجدد</span>
              </button>
            </div>
          )}

          {gameState === "win" && (
            <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
              <span className="text-3xl font-black text-emerald-400">YOU WIN! 🎉</span>
              <p className="text-xs text-slate-200">تبریک! همه نقاط پاکسازی شدند!</p>
              <button
                onClick={() => {
                  setScore(0);
                  setLives(3);
                  setGameState("ready");
                  setTimeout(() => setGameState("playing"), 50);
                }}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-400 text-slate-950 font-black rounded-xl cursor-pointer hover:bg-emerald-300 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>بازی مجدد</span>
              </button>
            </div>
          )}
        </div>

        {/* فوتر */}
        <div className="w-full flex items-center justify-between px-2 text-xs font-bold text-slate-400">
          <div className="flex items-center gap-1.5">
            <span>فرصت‌ها:</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 ${i < lives ? "text-rose-500 fill-rose-500" : "text-slate-700"}`}
              />
            ))}
          </div>
          <div className="text-[11px] text-slate-500">
            کنترل با <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">W A S D</kbd> یا کلیدهای جهتی
          </div>
        </div>
      </div>
    </div>
  );
}
