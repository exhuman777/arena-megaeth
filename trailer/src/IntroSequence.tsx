import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";

const Title: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const glowIntensity = interpolate(
    Math.sin((frame - delay) * 0.2),
    [-1, 1],
    [20, 40]
  );

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        opacity,
        textShadow: `0 0 ${glowIntensity}px #ff0000, 0 0 ${glowIntensity * 2}px #ff4400`,
      }}
    >
      {text}
    </div>
  );
};

const Particle: React.FC<{
  x: number;
  y: number;
  delay: number;
  color: string;
}> = ({ x, y, delay, color }) => {
  const frame = useCurrentFrame();
  const progress = Math.max(0, (frame - delay) / 60);

  const particleY = y - progress * 200;
  const opacity = Math.max(0, 1 - progress);
  const size = 4 + Math.sin(frame * 0.3 + x) * 2;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: particleY,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        opacity,
        boxShadow: `0 0 10px ${color}`,
      }}
    />
  );
};

export const IntroSequence: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Background pulse
  const bgPulse = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.1, 0.15]);

  // Generate particles
  const particles = [];
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: Math.random() * width,
      y: height + Math.random() * 100,
      delay: Math.random() * 60,
      color: ["#ff0000", "#ff4400", "#ff8800", "#ffcc00"][
        Math.floor(Math.random() * 4)
      ],
    });
  }

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, rgba(40,0,0,${bgPulse}) 0%, #000 70%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "monospace",
        overflow: "hidden",
      }}
    >
      {/* Particles */}
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}

      {/* Arena border effect */}
      <div
        style={{
          position: "absolute",
          width: "80%",
          height: "60%",
          border: "4px solid #333",
          boxShadow: `inset 0 0 100px rgba(255,0,0,${bgPulse * 2})`,
        }}
      />

      {/* Title sequence */}
      <Sequence from={0} durationInFrames={150}>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: "bold",
              color: "#ff2200",
              letterSpacing: 20,
            }}
          >
            <Title text="ARENA" delay={0} />
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: "bold",
              color: "#ff6600",
              letterSpacing: 15,
              marginTop: 20,
            }}
          >
            <Title text="SURVIVAL" delay={20} />
          </div>

          {/* Tagline */}
          <Sequence from={60}>
            <div
              style={{
                fontSize: 28,
                color: "#888",
                marginTop: 60,
                opacity: interpolate(frame - 60, [0, 30], [0, 1], {
                  extrapolateRight: "clamp",
                }),
              }}
            >
              FIGHT. SURVIVE. REPEAT.
            </div>
          </Sequence>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
