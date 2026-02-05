import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";
import { IntroSequence } from "./IntroSequence";
import { GameplayMontage } from "./GameplayMontage";

// Transition effect between scenes
const Transition: React.FC<{
  direction: "in" | "out";
}> = ({ direction }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 20], direction === "in" ? [1, 0] : [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "#000",
        opacity: progress,
        zIndex: 100,
      }}
    />
  );
};

// Call to action at the end
const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  const pulse = Math.sin(frame * 0.2) * 0.05 + 1;

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at center, #200 0%, #000 100%)",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "monospace",
      }}
    >
      {/* Pulsing border */}
      <div
        style={{
          position: "absolute",
          width: "70%",
          height: "50%",
          border: `4px solid rgba(255, 0, 0, ${0.3 + Math.sin(frame * 0.1) * 0.2})`,
          boxShadow: `0 0 50px rgba(255, 0, 0, ${0.2 + Math.sin(frame * 0.1) * 0.1})`,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${titleScale})`,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: "bold",
            color: "#ff2200",
            textShadow: "0 0 30px #ff0000",
            letterSpacing: 10,
          }}
        >
          ARENA SURVIVAL
        </div>

        <div
          style={{
            fontSize: 32,
            color: "#888",
            marginTop: 30,
            opacity: interpolate(frame, [30, 60], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          HOW LONG CAN YOU LAST?
        </div>

        <Sequence from={60}>
          <div
            style={{
              marginTop: 60,
              padding: "20px 60px",
              fontSize: 36,
              fontWeight: "bold",
              color: "#000",
              background: `linear-gradient(135deg, #ff6600 0%, #ffcc00 100%)`,
              borderRadius: 8,
              transform: `scale(${pulse})`,
              boxShadow: "0 0 30px rgba(255, 150, 0, 0.5)",
              opacity: interpolate(frame - 60, [0, 20], [0, 1], {
                extrapolateRight: "clamp",
              }),
            }}
          >
            PLAY NOW
          </div>
        </Sequence>

        <Sequence from={90}>
          <div
            style={{
              marginTop: 40,
              fontSize: 18,
              color: "#666",
              opacity: interpolate(frame - 90, [0, 30], [0, 1], {
                extrapolateRight: "clamp",
              }),
            }}
          >
            localhost:8080/arena.html
          </div>
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};

export const GameTrailer: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* Intro sequence: 0-150 */}
      <Sequence from={0} durationInFrames={150}>
        <IntroSequence />
      </Sequence>

      {/* Transition out of intro */}
      <Sequence from={140} durationInFrames={20}>
        <Transition direction="out" />
      </Sequence>

      {/* Gameplay montage: 150-350 */}
      <Sequence from={150} durationInFrames={200}>
        <GameplayMontage />
      </Sequence>

      {/* Transition into gameplay */}
      <Sequence from={150} durationInFrames={20}>
        <Transition direction="in" />
      </Sequence>

      {/* Transition out of gameplay */}
      <Sequence from={340} durationInFrames={20}>
        <Transition direction="out" />
      </Sequence>

      {/* Call to action: 350-450 */}
      <Sequence from={350} durationInFrames={100}>
        <CallToAction />
      </Sequence>

      {/* Transition into CTA */}
      <Sequence from={350} durationInFrames={20}>
        <Transition direction="in" />
      </Sequence>
    </AbsoluteFill>
  );
};
