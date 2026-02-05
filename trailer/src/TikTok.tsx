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

// Sprite sheet positions (32x32 tiles)
const SPRITES = {
  player: { x: 0, y: 0 },
  skeleton: { x: 32, y: 0 },
  goblin: { x: 64, y: 0 },
  orc: { x: 96, y: 0 },
  demon: { x: 128, y: 0 },
  sword: { x: 0, y: 32 },
  shield: { x: 32, y: 32 },
  potion: { x: 64, y: 32 },
};

// Animated text with glow
const GlowText: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
  delay?: number;
  shake?: boolean;
}> = ({ children, size = 72, color = "#ff2200", delay = 0, shake = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 8, stiffness: 150 },
  });

  const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  const glow = interpolate(Math.sin((frame - delay) * 0.3), [-1, 1], [20, 50]);

  const shakeX = shake ? Math.sin(frame * 2) * 3 : 0;
  const shakeY = shake ? Math.cos(frame * 2.5) * 2 : 0;

  return (
    <div
      style={{
        fontSize: size,
        fontWeight: "bold",
        color,
        textShadow: `0 0 ${glow}px ${color}, 0 0 ${glow * 2}px ${color}`,
        transform: `scale(${scale}) translate(${shakeX}px, ${shakeY}px)`,
        opacity,
        fontFamily: "'Press Start 2P', monospace",
        textAlign: "center",
        lineHeight: 1.4,
      }}
    >
      {children}
    </div>
  );
};

// Flying emoji/sprite
const FlyingSprite: React.FC<{
  emoji: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
  duration: number;
  size?: number;
  spin?: boolean;
}> = ({ emoji, startX, startY, endX, endY, delay, duration, size = 64, spin = false }) => {
  const frame = useCurrentFrame();
  const progress = Math.max(0, Math.min(1, (frame - delay) / duration));

  const x = interpolate(progress, [0, 1], [startX, endX]);
  const y = interpolate(progress, [0, 1], [startY, endY]);
  const opacity = progress > 0 && progress < 1 ? 1 : 0;
  const rotation = spin ? frame * 10 : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        fontSize: size,
        opacity,
        transform: `rotate(${rotation}deg)`,
        filter: "drop-shadow(0 0 10px rgba(255,100,0,0.8))",
      }}
    >
      {emoji}
    </div>
  );
};

// Screen shake wrapper
const ScreenShake: React.FC<{
  children: React.ReactNode;
  intensity?: number;
  active?: boolean;
}> = ({ children, intensity = 5, active = true }) => {
  const frame = useCurrentFrame();

  const x = active ? Math.sin(frame * 3) * intensity : 0;
  const y = active ? Math.cos(frame * 4) * intensity : 0;

  return (
    <div style={{ transform: `translate(${x}px, ${y}px)` }}>
      {children}
    </div>
  );
};

// Damage number popup
const DamageNumber: React.FC<{
  value: number;
  x: number;
  y: number;
  delay: number;
  crit?: boolean;
}> = ({ value, x, y, delay, crit = false }) => {
  const frame = useCurrentFrame();
  const progress = Math.max(0, (frame - delay) / 30);

  const posY = y - progress * 100;
  const opacity = Math.max(0, 1 - progress);
  const scale = crit ? 1.5 + Math.sin(frame * 0.5) * 0.2 : 1;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: posY,
        fontSize: crit ? 48 : 36,
        fontWeight: "bold",
        color: crit ? "#ff0" : "#fff",
        opacity,
        transform: `scale(${scale})`,
        textShadow: crit
          ? "0 0 20px #ff0, 0 0 40px #f80"
          : "2px 2px 0 #000",
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      {crit && "💥"}{value}
    </div>
  );
};

// Particle explosion
const ParticleExplosion: React.FC<{
  x: number;
  y: number;
  delay: number;
  color?: string;
}> = ({ x, y, delay, color = "#ff4400" }) => {
  const frame = useCurrentFrame();
  const particles = [];

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const progress = Math.max(0, (frame - delay) / 20);
    const distance = progress * 150;
    const px = x + Math.cos(angle) * distance;
    const py = y + Math.sin(angle) * distance;
    const opacity = Math.max(0, 1 - progress);
    const size = 8 - progress * 6;

    particles.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: px,
          top: py,
          width: size,
          height: size,
          borderRadius: "50%",
          background: color,
          opacity,
          boxShadow: `0 0 10px ${color}`,
        }}
      />
    );
  }

  return <>{particles}</>;
};

// Kill counter
const KillCounter: React.FC<{ count: number; delay: number }> = ({ count, delay }) => {
  const frame = useCurrentFrame();
  const displayCount = Math.min(count, Math.floor((frame - delay) / 3));

  if (frame < delay) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 100,
        right: 60,
        fontSize: 32,
        color: "#f44",
        fontFamily: "'Press Start 2P', monospace",
        textShadow: "0 0 20px #f00",
      }}
    >
      💀 {displayCount}
    </div>
  );
};

// Wave indicator
const WaveIndicator: React.FC<{ wave: number; delay: number }> = ({ wave, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  if (frame < delay) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "40%",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${scale})`,
        fontSize: 64,
        color: "#f80",
        fontFamily: "'Press Start 2P', monospace",
        textShadow: "0 0 30px #f80, 0 0 60px #f40",
        textAlign: "center",
      }}
    >
      WAVE {wave}
    </div>
  );
};

// Main TikTok composition
export const TikTokVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Background pulse
  const bgPulse = interpolate(Math.sin(frame * 0.15), [-1, 1], [0.05, 0.2]);

  // Screen shake during combat (frames 180-600)
  const combatActive = frame > 180 && frame < 750;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, rgba(60,0,0,${bgPulse}) 0%, #0a0505 60%, #000 100%)`,
        overflow: "hidden",
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <ScreenShake intensity={combatActive ? 4 : 0} active={combatActive}>

        {/* === SCENE 1: HOOK (0-90 frames, 3 sec) === */}
        <Sequence from={0} durationInFrames={90}>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            {/* Big sword slash */}
            <FlyingSprite emoji="⚔️" startX={-100} startY={height/2} endX={width+100} endY={height/2} delay={0} duration={20} size={200} />

            {/* Hook text */}
            <Sequence from={25}>
              <GlowText size={56} color="#ff0000" shake>
                YOU WILL DIE
              </GlowText>
            </Sequence>

            <Sequence from={50}>
              <div style={{ position: "absolute", top: "60%", width: "100%", textAlign: "center" }}>
                <GlowText size={36} color="#888" delay={50}>
                  ...A LOT
                </GlowText>
              </div>
            </Sequence>

            {/* Skulls flying */}
            <FlyingSprite emoji="💀" startX={100} startY={height} endX={150} endY={-100} delay={10} duration={40} size={48} spin />
            <FlyingSprite emoji="💀" startX={width-200} startY={height} endX={width-150} endY={-100} delay={20} duration={40} size={48} spin />
            <FlyingSprite emoji="💀" startX={width/2} startY={height} endX={width/2+50} endY={-100} delay={30} duration={40} size={48} spin />
          </AbsoluteFill>
        </Sequence>

        {/* === SCENE 2: TITLE (90-180 frames, 3 sec) === */}
        <Sequence from={90} durationInFrames={90}>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
            <GlowText size={72} color="#ff2200" delay={90}>
              ARENA
            </GlowText>
            <GlowText size={48} color="#ff6600" delay={105}>
              SURVIVAL
            </GlowText>

            {/* Particles */}
            <ParticleExplosion x={width/2} y={height/2} delay={100} color="#ff4400" />
            <ParticleExplosion x={width/2-100} y={height/2+50} delay={110} color="#ff0000" />
            <ParticleExplosion x={width/2+100} y={height/2+50} delay={120} color="#ff8800" />
          </AbsoluteFill>
        </Sequence>

        {/* === SCENE 3: COMBAT MONTAGE (180-540 frames, 12 sec) === */}
        <Sequence from={180} durationInFrames={360}>
          <AbsoluteFill>
            {/* Player in center */}
            <div style={{
              position: "absolute",
              left: "50%",
              top: "55%",
              transform: "translate(-50%, -50%)",
              fontSize: 96,
              filter: "drop-shadow(0 0 20px #4af)",
            }}>
              🧙
            </div>

            {/* Kill counter */}
            <KillCounter count={47} delay={180} />

            {/* Wave indicators */}
            <WaveIndicator wave={1} delay={180} />
            <WaveIndicator wave={5} delay={300} />
            <WaveIndicator wave={10} delay={420} />

            {/* Monsters attacking */}
            <FlyingSprite emoji="👹" startX={-80} startY={height*0.4} endX={width/2-150} endY={height*0.5} delay={200} duration={30} size={72} />
            <FlyingSprite emoji="👺" startX={width+80} startY={height*0.5} endX={width/2+150} endY={height*0.55} delay={220} duration={30} size={72} />
            <FlyingSprite emoji="🧟" startX={width/2} startY={-80} endX={width/2} endY={height*0.35} delay={250} duration={30} size={72} />

            {/* More waves */}
            <FlyingSprite emoji="👻" startX={-80} startY={height*0.6} endX={width/2-120} endY={height*0.6} delay={320} duration={25} size={64} />
            <FlyingSprite emoji="🐉" startX={width+80} startY={height*0.3} endX={width/2+100} endY={height*0.4} delay={340} duration={35} size={80} />
            <FlyingSprite emoji="😈" startX={-80} startY={height*0.35} endX={width/2-100} endY={height*0.45} delay={360} duration={25} size={64} />

            {/* Boss wave */}
            <FlyingSprite emoji="👿" startX={width/2} startY={-100} endX={width/2} endY={height*0.25} delay={440} duration={40} size={120} />

            {/* Damage numbers */}
            <DamageNumber value={127} x={width/2-80} y={height*0.4} delay={230} />
            <DamageNumber value={89} x={width/2+100} y={height*0.5} delay={250} />
            <DamageNumber value={256} x={width/2} y={height*0.35} delay={280} crit />
            <DamageNumber value={64} x={width/2-60} y={height*0.55} delay={350} />
            <DamageNumber value={512} x={width/2+80} y={height*0.4} delay={380} crit />
            <DamageNumber value={999} x={width/2} y={height*0.3} delay={480} crit />

            {/* Explosions */}
            <ParticleExplosion x={width/2-100} y={height*0.45} delay={235} color="#ff0000" />
            <ParticleExplosion x={width/2+120} y={height*0.5} delay={255} color="#ff4400" />
            <ParticleExplosion x={width/2} y={height*0.4} delay={285} color="#ffff00" />
            <ParticleExplosion x={width/2-80} y={height*0.5} delay={355} color="#ff0000" />
            <ParticleExplosion x={width/2+100} y={height*0.45} delay={385} color="#ff8800" />
            <ParticleExplosion x={width/2} y={height*0.35} delay={485} color="#ff0000" />
          </AbsoluteFill>
        </Sequence>

        {/* === SCENE 4: LOOT (540-690 frames, 5 sec) === */}
        <Sequence from={540} durationInFrames={150}>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
            <GlowText size={42} color="#ffd700" delay={540}>
              LEGENDARY LOOT
            </GlowText>

            {/* Loot items */}
            <div style={{
              display: "flex",
              gap: 40,
              marginTop: 60,
            }}>
              <Sequence from={20}>
                <div style={{
                  fontSize: 72,
                  animation: "float 1s ease-in-out infinite",
                  filter: "drop-shadow(0 0 20px #ffd700)",
                }}>⚔️</div>
              </Sequence>
              <Sequence from={35}>
                <div style={{
                  fontSize: 72,
                  filter: "drop-shadow(0 0 20px #a855f7)",
                }}>🛡️</div>
              </Sequence>
              <Sequence from={50}>
                <div style={{
                  fontSize: 72,
                  filter: "drop-shadow(0 0 20px #ef4444)",
                }}>🧪</div>
              </Sequence>
            </div>

            {/* Rarity text */}
            <Sequence from={70}>
              <div style={{
                marginTop: 80,
                display: "flex",
                flexDirection: "column",
                gap: 15,
                alignItems: "center",
              }}>
                <div style={{ color: "#9ca3af", fontSize: 18 }}>COMMON</div>
                <div style={{ color: "#22c55e", fontSize: 20 }}>UNCOMMON</div>
                <div style={{ color: "#3b82f6", fontSize: 22 }}>RARE</div>
                <div style={{ color: "#a855f7", fontSize: 24, textShadow: "0 0 10px #a855f7" }}>EPIC</div>
                <div style={{ color: "#ffd700", fontSize: 28, textShadow: "0 0 20px #ffd700" }}>LEGENDARY</div>
              </div>
            </Sequence>
          </AbsoluteFill>
        </Sequence>

        {/* === SCENE 5: DEATH (690-810 frames, 4 sec) === */}
        <Sequence from={690} durationInFrames={120}>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
            {/* Player death */}
            <div style={{
              fontSize: 120,
              opacity: interpolate(frame - 690, [0, 30], [1, 0]),
              filter: "drop-shadow(0 0 30px #f00)",
            }}>
              🧙
            </div>

            <Sequence from={30}>
              <GlowText size={64} color="#ff0000" delay={720} shake>
                YOU DIED
              </GlowText>
            </Sequence>

            <Sequence from={60}>
              <div style={{
                position: "absolute",
                top: "65%",
                color: "#666",
                fontSize: 24,
              }}>
                Wave 47 • Score 12,847
              </div>
            </Sequence>

            {/* Skull explosion */}
            <FlyingSprite emoji="💀" startX={width/2} startY={height/2} endX={width/2-200} endY={height/2-200} delay={695} duration={40} size={48} spin />
            <FlyingSprite emoji="💀" startX={width/2} startY={height/2} endX={width/2+200} endY={height/2-150} delay={695} duration={40} size={48} spin />
            <FlyingSprite emoji="💀" startX={width/2} startY={height/2} endX={width/2} endY={height/2+200} delay={695} duration={40} size={48} spin />
          </AbsoluteFill>
        </Sequence>

        {/* === SCENE 6: CTA (810-900 frames, 3 sec) === */}
        <Sequence from={810} durationInFrames={90}>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
            <GlowText size={42} color="#ff4400" delay={810}>
              PLAY FREE
            </GlowText>

            <Sequence from={20}>
              <div style={{
                marginTop: 40,
                fontSize: 24,
                color: "#888",
                textAlign: "center",
              }}>
                Link in bio 👆
              </div>
            </Sequence>

            <Sequence from={40}>
              <div style={{
                marginTop: 60,
                fontSize: 72,
              }}>
                ⚔️
              </div>
            </Sequence>

            {/* Pulsing border */}
            <div style={{
              position: "absolute",
              width: "90%",
              height: "85%",
              border: `4px solid rgba(255,68,0,${interpolate(Math.sin(frame * 0.2), [-1, 1], [0.3, 0.8])})`,
              borderRadius: 20,
              boxShadow: `0 0 30px rgba(255,68,0,${interpolate(Math.sin(frame * 0.2), [-1, 1], [0.1, 0.4])})`,
            }} />
          </AbsoluteFill>
        </Sequence>

        {/* Persistent vignette */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)",
          pointerEvents: "none",
        }} />

      </ScreenShake>
    </AbsoluteFill>
  );
};
