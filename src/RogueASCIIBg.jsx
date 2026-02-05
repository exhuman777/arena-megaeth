import { useEffect, useRef } from "react";

const WALLS = ["#", "▓", "▒", "░", "█", "╬", "╫", "╪"];
const FLOOR = [".", "·", ",", ";", "`", ":", "'"];
const ITEMS = ["†", "♦", "⚷", "☠", "⚔", "⚗", "♠", "Ω", "¤", "∆"];
const ENEMIES = ["@", "&", "ð", "§", "¥", "£", "Ψ", "Σ", "Þ", "Ŧ"];
const FIRE = ["*", "~", "^", "≈", "∿"];
const WATER = ["≈", "~", "∽", "∿", "≋"];

export default function RogueASCIIBg() {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let cols, rows, cellW, cellH, fontSize;
    let particles = [];
    let torches = [];
    let crawlers = [];
    let drips = [];
    let baseGrid = null;
    let time = 0;

    const hash = (x, y, s) => {
      let h = (s * 374761393 + x * 668265263 + y * 1274126177) | 0;
      h = ((h ^ (h >> 13)) * 1103515245) | 0;
      return ((h ^ (h >> 16)) >>> 0) / 4294967296;
    };

    const buildGrid = () => {
      const grid = [];
      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
          const n1 = Math.sin(c * 0.12) * Math.cos(r * 0.15) + Math.sin((c + r) * 0.07) * 0.6;
          const n = (n1 + 1.6) / 3.2;
          const rnd = hash(c, r, 42);
          let ch, type;
          if (n > 0.62) { type = "wall"; ch = WALLS[Math.floor(rnd * WALLS.length)]; }
          else if (rnd > 0.94) { type = "item"; ch = ITEMS[Math.floor(hash(c, r, 99) * ITEMS.length)]; }
          else if (rnd > 0.9) { type = "enemy"; ch = ENEMIES[Math.floor(hash(c, r, 77) * ENEMIES.length)]; }
          else { type = "floor"; ch = FLOOR[Math.floor(rnd * FLOOR.length)]; }
          row.push({ ch, type, brightness: 0, targetBrightness: 0 });
        }
        grid.push(row);
      }
      return grid;
    };

    const spawnTorches = () => {
      torches = [];
      for (let i = 0; i < 6; i++) {
        torches.push({
          x: Math.random() * cols, y: Math.random() * rows,
          radius: 4 + Math.random() * 5,
          speed: 0.3 + Math.random() * 0.4,
          angle: Math.random() * Math.PI * 2,
          drift: 0.005 + Math.random() * 0.01,
        });
      }
    };

    const spawnCrawlers = () => {
      crawlers = [];
      for (let i = 0; i < 8; i++) {
        crawlers.push({
          x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows),
          char: ENEMIES[Math.floor(Math.random() * ENEMIES.length)],
          speed: 0.02 + Math.random() * 0.04,
          timer: 0, dx: 0, dy: 0,
          trail: [],
        });
      }
    };

    const spawnDrips = () => {
      drips = [];
      for (let i = 0; i < 15; i++) {
        drips.push({
          x: Math.floor(Math.random() * cols),
          y: Math.random() * rows,
          speed: 0.3 + Math.random() * 0.8,
          char: WATER[Math.floor(Math.random() * WATER.length)],
          length: 2 + Math.floor(Math.random() * 5),
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      fontSize = Math.max(11, Math.min(15, Math.floor(window.innerWidth / 90)));
      cellW = fontSize * 0.62;
      cellH = fontSize * 1.1;
      cols = Math.ceil(canvas.width / cellW) + 2;
      rows = Math.ceil(canvas.height / cellH) + 2;
      ctx.font = `${fontSize}px "Courier New", monospace`;
      ctx.textBaseline = "top";
      baseGrid = buildGrid();
      spawnTorches();
      spawnCrawlers();
      spawnDrips();
      particles = [];
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      time += 0.016;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (!baseGrid) { frameRef.current = requestAnimationFrame(animate); return; }

      // move torches in wandering paths
      for (const t of torches) {
        t.angle += (Math.sin(time * t.speed + t.x) * 0.05 + t.drift);
        t.x += Math.cos(t.angle) * 0.15;
        t.y += Math.sin(t.angle) * 0.12;
        if (t.x < -5) t.x = cols + 5;
        if (t.x > cols + 5) t.x = -5;
        if (t.y < -5) t.y = rows + 5;
        if (t.y > rows + 5) t.y = -5;
        t.radius = 4.5 + Math.sin(time * 3 + t.x) * 1.5 + Math.sin(time * 7 + t.y) * 0.5;
      }

      // move crawlers
      for (const cr of crawlers) {
        cr.timer += cr.speed;
        if (cr.timer >= 1) {
          cr.timer = 0;
          cr.trail.push({ x: cr.x, y: cr.y, age: 0 });
          if (cr.trail.length > 6) cr.trail.shift();
          if (Math.random() < 0.3) {
            cr.dx = Math.floor(Math.random() * 3) - 1;
            cr.dy = Math.floor(Math.random() * 3) - 1;
          }
          cr.x = ((cr.x + cr.dx) % cols + cols) % cols;
          cr.y = ((cr.y + cr.dy) % rows + rows) % rows;
        }
        for (const t of cr.trail) t.age += 0.016;
      }

      // move drips downward
      for (const d of drips) {
        d.y += d.speed * 0.08;
        if (d.y > rows + d.length) {
          d.y = -d.length;
          d.x = Math.floor(Math.random() * cols);
        }
      }

      // spawn particles near torches
      for (const t of torches) {
        if (Math.random() < 0.15) {
          particles.push({
            x: t.x + (Math.random() - 0.5) * 2,
            y: t.y + (Math.random() - 0.5) * 2,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.2 - Math.random() * 0.4,
            life: 1,
            char: FIRE[Math.floor(Math.random() * FIRE.length)],
          });
        }
      }
      particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.015;
        return p.life > 0;
      });

      // compute per-cell brightness from torches
      const scrollX = time * 0.8;
      const scrollY = time * 0.3;

      for (let r = 0; r < Math.min(rows, baseGrid.length); r++) {
        for (let c = 0; c < Math.min(cols, baseGrid[0].length); c++) {
          let brightness = 0;
          for (const t of torches) {
            const dx = c - t.x;
            const dy = r - t.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < t.radius) {
              const falloff = 1 - dist / t.radius;
              brightness += falloff * falloff * (0.7 + Math.sin(time * 5 + c * 0.3 + r * 0.2) * 0.15);
            }
          }
          brightness = Math.min(1, brightness);

          // ambient flicker - reduced for subtlety
          const ambFlicker = 0.02 + Math.sin(time * 0.5 + c * 0.04 + r * 0.03) * 0.015;
          brightness = Math.max(ambFlicker, brightness);

          // scroll effect — shift character based on time
          const shiftC = Math.floor(c + scrollX) % cols;
          const shiftR = Math.floor(r + scrollY) % rows;
          const shifted = baseGrid[((shiftR % baseGrid.length) + baseGrid.length) % baseGrid.length]
                                  [((shiftC % baseGrid[0].length) + baseGrid[0].length) % baseGrid[0].length];

          // wave warp
          const waveX = Math.sin(r * 0.15 + time * 1.2) * cellW * 0.4;
          const waveY = Math.cos(c * 0.12 + time * 0.9) * cellH * 0.3;

          const px = c * cellW + waveX;
          const py = r * cellH + waveY;

          if (brightness < 0.02) continue;

          let color;
          const b = brightness * 0.6; // Dimmed for background
          if (shifted.type === "wall") {
            color = `rgba(${Math.floor(40 + b * 50)},${Math.floor(35 + b * 40)},${Math.floor(55 + b * 60)},${b * 0.8})`;
          } else if (shifted.type === "item") {
            const glint = Math.sin(time * 4 + c * 5) > 0.7 ? 1.4 : 1;
            color = `rgba(${Math.floor(140 * b * glint)},${Math.floor(120 * b * glint)},${Math.floor(40 * b)},${b * 0.7})`;
          } else if (shifted.type === "enemy") {
            const pulse = 0.8 + Math.sin(time * 3 + r) * 0.2;
            color = `rgba(${Math.floor(140 * b * pulse)},${Math.floor(25 * b)},${Math.floor(25 * b)},${b * 0.7})`;
          } else {
            color = `rgba(${Math.floor(20 + b * 25)},${Math.floor(25 + b * 30)},${Math.floor(20 + b * 25)},${0.1 + b * 0.4})`;
          }

          ctx.fillStyle = color;
          ctx.fillText(shifted.ch, px, py);
        }
      }

      // draw drips
      for (const d of drips) {
        for (let i = 0; i < d.length; i++) {
          const dy = d.y - i;
          if (dy < 0 || dy >= rows) continue;
          const alpha = (1 - i / d.length) * 0.3;
          ctx.fillStyle = `rgba(60,90,150,${alpha})`;
          ctx.fillText(d.char, d.x * cellW, dy * cellH);
        }
      }

      // draw crawler trails + crawlers
      for (const cr of crawlers) {
        for (const t of cr.trail) {
          const a = Math.max(0, 0.15 - t.age * 0.1);
          ctx.fillStyle = `rgba(100,25,25,${a})`;
          ctx.fillText("·", t.x * cellW, t.y * cellH);
        }
        // check if any torch illuminates crawler
        let lit = 0.1;
        for (const t of torches) {
          const dx = cr.x - t.x, dy = cr.y - t.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < t.radius) lit = Math.max(lit, (1 - dist / t.radius) * 0.6);
        }
        ctx.fillStyle = `rgba(180,35,35,${lit})`;
        ctx.fillText(cr.char, cr.x * cellW, cr.y * cellH);
      }

      // draw fire particles
      for (const p of particles) {
        const a = p.life * 0.5;
        const heat = p.life;
        ctx.fillStyle = `rgba(${Math.floor(200 * heat)},${Math.floor(120 * heat * heat)},${Math.floor(25 * heat)},${a})`;
        ctx.fillText(p.char, p.x * cellW, p.y * cellH);
      }

      // vignette - stronger for better UI contrast
      const grd = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.15,
        canvas.width / 2, canvas.height / 2, canvas.height * 0.7
      );
      grd.addColorStop(0, "rgba(0,0,0,0)");
      grd.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // scanlines
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      for (let y = 0; y < canvas.height; y += 2) ctx.fillRect(0, y, canvas.width, 1);

      frameRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener("resize", resize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none"
      }}
    />
  );
}
