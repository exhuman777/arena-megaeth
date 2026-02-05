import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Img,
  staticFile,
} from "remotion";

// Simulated game entity
const Entity: React.FC<{
  x: number;
  y: number;
  type: "player" | "enemy";
  frame: number;
}> = ({ x, y, type, frame }) => {
  const wobble = Math.sin(frame * 0.3 + x * 0.1) * 3;
  const colors = {
    player: { bg: "#4488ff", border: "#88ccff", glow: "#0066ff" },
    enemy: { bg: "#ff4444", border: "#ff8888", glow: "#ff0000" },
  };
  const c = colors[type];

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + wobble,
        width: 32,
        height: 32,
        background: c.bg,
        border: `2px solid ${c.border}`,
        borderRadius: type === "player" ? 4 : "50%",
        boxShadow: `0 0 15px ${c.glow}`,
        transition: "all 0.1s",
      }}
    />
  );
};

// Attack effect
const AttackEffect: React.FC<{ x: number; y: number; frame: number; startFrame: number }> = ({
  x,
  y,
  frame,
  startFrame,
}) => {
  const progress = (frame - startFrame) / 15;
  if (progress < 0 || progress > 1) return null;

  const size = 60 * progress;
  const opacity = 1 - progress;

  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        border: "3px solid #ffff00",
        opacity,
        boxShadow: `0 0 20px #ff8800, inset 0 0 20px rgba(255,200,0,0.3)`,
      }}
    />
  );
};

// Damage number
const DamageNumber: React.FC<{
  x: number;
  y: number;
  damage: number;
  frame: number;
  startFrame: number;
}> = ({ x, y, damage, frame, startFrame }) => {
  const elapsed = frame - startFrame;
  if (elapsed < 0 || elapsed > 30) return null;

  const yOffset = interpolate(elapsed, [0, 30], [0, -60]);
  const opacity = interpolate(elapsed, [0, 20, 30], [1, 1, 0]);
  const scale = spring({ frame: elapsed, fps: 30, config: { damping: 10 } });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + yOffset,
        fontSize: 24,
        fontWeight: "bold",
        color: "#ff4444",
        textShadow: "2px 2px 4px #000",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      -{damage}
    </div>
  );
};

// Blood particle
const BloodParticle: React.FC<{
  x: number;
  y: number;
  vx: number;
  vy: number;
  frame: number;
  startFrame: number;
}> = ({ x, y, vx, vy, frame, startFrame }) => {
  const elapsed = frame - startFrame;
  if (elapsed < 0 || elapsed > 40) return null;

  const t = elapsed / 30;
  const px = x + vx * t;
  const py = y + vy * t + 100 * t * t; // Gravity
  const opacity = interpolate(elapsed, [0, 30, 40], [1, 0.5, 0]);
  const size = interpolate(elapsed, [0, 40], [4, 1]);

  return (
    <div
      style={{
        position: "absolute",
        left: px,
        top: py,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#ff0000",
        opacity,
        boxShadow: "0 0 5px #ff0000",
      }}
    />
  );
};

export const GameplayMontage: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Arena center
  const cx = width / 2;
  const cy = height / 2;

  // Player position (circles around center)
  const playerAngle = frame * 0.05;
  const playerX = cx + Math.cos(playerAngle) * 150 - 16;
  const playerY = cy + Math.sin(playerAngle) * 100 - 16;

  // Enemies
  const enemies = [
    { angle: 0.3, dist: 200, speed: -0.02 },
    { angle: 1.5, dist: 180, speed: -0.025 },
    { angle: 2.8, dist: 220, speed: -0.018 },
    { angle: 4.2, dist: 190, speed: -0.022 },
    { angle: 5.5, dist: 210, speed: -0.02 },
  ].map((e, i) => ({
    x: cx + Math.cos(e.angle + frame * e.speed) * e.dist - 16,
    y: cy + Math.sin(e.angle + frame * e.speed) * e.dist - 16,
    id: i,
  }));

  // Attack events (timed)
  const attacks = [
    { frame: 30, x: cx + 100, y: cy },
    { frame: 75, x: cx - 80, y: cy + 50 },
    { frame: 120, x: cx + 50, y: cy - 70 },
    { frame: 180, x: cx - 100, y: cy - 30 },
    { frame: 240, x: cx + 120, y: cy + 80 },
  ];

  // Blood particles
  const bloodParticles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    startFrame: number;
  }> = [];
  attacks.forEach((atk) => {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      bloodParticles.push({
        x: atk.x,
        y: atk.y,
        vx: Math.cos(angle) * 100,
        vy: Math.sin(angle) * 100 - 50,
        startFrame: atk.frame,
      });
    }
  });

  // Screen shake
  const shakeIntensity = attacks.reduce((acc, atk) => {
    const diff = frame - atk.frame;
    if (diff >= 0 && diff < 10) {
      return Math.max(acc, 10 - diff);
    }
    return acc;
  }, 0);
  const shakeX = shakeIntensity * (Math.random() - 0.5) * 2;
  const shakeY = shakeIntensity * (Math.random() - 0.5) * 2;

  // Score counter
  const score = interpolate(frame, [0, 300], [0, 1250], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "#111",
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      {/* Arena floor */}
      <div
        style={{
          position: "absolute",
          left: cx - 350,
          top: cy - 250,
          width: 700,
          height: 500,
          background: "#1a1a1a",
          border: "4px solid #333",
          boxShadow: "inset 0 0 100px rgba(0,0,0,0.5)",
        }}
      />

      {/* Grid lines */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={`h${i}`}
          style={{
            position: "absolute",
            left: cx - 350,
            top: cy - 250 + i * 50,
            width: 700,
            height: 1,
            background: "#222",
          }}
        />
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={`v${i}`}
          style={{
            position: "absolute",
            left: cx - 350 + i * 50,
            top: cy - 250,
            width: 1,
            height: 500,
            background: "#222",
          }}
        />
      ))}

      {/* Blood particles */}
      {bloodParticles.map((bp, i) => (
        <BloodParticle key={i} {...bp} frame={frame} />
      ))}

      {/* Enemies */}
      {enemies.map((e) => (
        <Entity key={e.id} x={e.x} y={e.y} type="enemy" frame={frame} />
      ))}

      {/* Player */}
      <Entity x={playerX} y={playerY} type="player" frame={frame} />

      {/* Attack effects */}
      {attacks.map((atk, i) => (
        <AttackEffect
          key={i}
          x={atk.x}
          y={atk.y}
          frame={frame}
          startFrame={atk.frame}
        />
      ))}

      {/* Damage numbers */}
      {attacks.map((atk, i) => (
        <DamageNumber
          key={i}
          x={atk.x}
          y={atk.y}
          damage={Math.floor(10 + Math.random() * 5)}
          frame={frame}
          startFrame={atk.frame}
        />
      ))}

      {/* HUD */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          fontFamily: "monospace",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 10 }}>
          HP: <span style={{ color: "#44ff44" }}>100/100</span>
        </div>
        <div style={{ fontSize: 36, color: "#ffcc00" }}>
          SCORE: {Math.floor(score)}
        </div>
        <div style={{ fontSize: 24, color: "#44ccff", marginTop: 10 }}>
          WAVE: {Math.floor(frame / 60) + 1}
        </div>
      </div>

      {/* Kill counter popup */}
      <Sequence from={90} durationInFrames={30}>
        <div
          style={{
            position: "absolute",
            top: cy,
            left: cx,
            fontSize: 48,
            fontWeight: "bold",
            color: "#00ff00",
            textShadow: "0 0 20px #00ff00",
            transform: `scale(${spring({ frame: frame - 90, fps: 30 })})`,
          }}
        >
          +50 COMBO!
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
