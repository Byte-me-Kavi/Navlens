"use client";

import { useEffect, useRef } from "react";

export function HeroIllustration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Animation state
    let time = 0;
    let animationFrameId: number;

    // Heatmap simulation data points
    class HeatPoint {
      x: number;
      y: number;
      intensity: number;
      radius: number;
      pulseOffset: number;

      constructor(x: number, y: number, intensity: number) {
        this.x = x;
        this.y = y;
        this.intensity = intensity;
        this.radius = 20 + Math.random() * 30;
        this.pulseOffset = Math.random() * Math.PI * 2;
      }

      draw(ctx: CanvasRenderingContext2D, time: number) {
        const pulse = Math.sin(time * 2 + this.pulseOffset) * 0.2 + 0.8;
        const gradient = ctx.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.radius * pulse
        );

        if (this.intensity > 0.7) {
          gradient.addColorStop(0, "rgba(255, 0, 255, 0.6)"); // magenta for hot spots
          gradient.addColorStop(0.5, "rgba(138, 43, 226, 0.3)"); // purple
          gradient.addColorStop(1, "rgba(0, 200, 200, 0)");
        } else if (this.intensity > 0.4) {
          gradient.addColorStop(0, "rgba(0, 127, 255, 0.5)"); // electric blue
          gradient.addColorStop(0.5, "rgba(0, 200, 200, 0.3)"); // teal
          gradient.addColorStop(1, "rgba(0, 200, 200, 0)");
        } else {
          gradient.addColorStop(0, "rgba(0, 200, 200, 0.4)"); // teal
          gradient.addColorStop(0.5, "rgba(0, 127, 255, 0.2)");
          gradient.addColorStop(1, "rgba(0, 200, 200, 0)");
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(
          this.x - this.radius * pulse,
          this.y - this.radius * pulse,
          this.radius * 2 * pulse,
          this.radius * 2 * pulse
        );
      }
    }

    // Create heatmap points in an attractive pattern
    const heatPoints: HeatPoint[] = [
      // Header area (high intensity)
      new HeatPoint(150, 100, 0.9),
      new HeatPoint(200, 110, 0.85),

      // CTA buttons area (very high intensity)
      new HeatPoint(120, 200, 0.95),
      new HeatPoint(280, 205, 0.92),

      // Content area (medium intensity)
      new HeatPoint(180, 280, 0.6),
      new HeatPoint(220, 300, 0.55),
      new HeatPoint(160, 320, 0.5),

      // Footer area (low intensity)
      new HeatPoint(200, 380, 0.3),
      new HeatPoint(250, 390, 0.35),
    ];

    // Cursor trail effect
    class CursorTrail {
      x: number;
      y: number;
      life: number;
      maxLife: number;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.life = 1;
        this.maxLife = 1;
      }

      update() {
        this.life -= 0.02;
      }

      draw(ctx: CanvasRenderingContext2D) {
        if (this.life <= 0) return;

        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 200, 200, ${this.life * 0.6})`;
        ctx.fill();
      }
    }

    const cursorTrails: CursorTrail[] = [];
    let lastCursorX = 200;
    let lastCursorY = 200;

    // Simulated cursor movement
    const updateCursor = (time: number) => {
      lastCursorX = 200 + Math.sin(time * 0.5) * 100;
      lastCursorY = 200 + Math.cos(time * 0.8) * 80 + Math.sin(time * 1.2) * 40;

      if (Math.random() > 0.7) {
        cursorTrails.push(new CursorTrail(lastCursorX, lastCursorY));
      }
    };

    // Browser window representation
    const drawBrowserWindow = (ctx: CanvasRenderingContext2D, time: number) => {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Window frame
      ctx.strokeStyle = "rgba(0, 200, 200, 0.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX - 180, centerY - 220, 360, 440);

      // Window header
      ctx.fillStyle = "rgba(0, 200, 200, 0.1)";
      ctx.fillRect(centerX - 180, centerY - 220, 360, 30);

      // Window dots
      [10, 30, 50].forEach((offset) => {
        ctx.beginPath();
        ctx.arc(centerX - 170 + offset, centerY - 205, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 200, 200, 0.4)";
        ctx.fill();
      });

      // Content area with grid
      ctx.strokeStyle = "rgba(0, 200, 200, 0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX - 160, centerY - 180 + i * 50);
        ctx.lineTo(centerX + 160, centerY - 180 + i * 50);
        ctx.stroke();
      }
    };

    // Animation loop
    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      time += 0.01;

      // Draw browser window
      drawBrowserWindow(ctx, time);

      // Transform context to center the heatmap
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      ctx.save();
      ctx.translate(centerX - 200, centerY - 220);

      // Draw heatmap points
      heatPoints.forEach((point) => point.draw(ctx, time));

      // Update and draw cursor trails
      updateCursor(time);
      cursorTrails.forEach((trail, index) => {
        trail.update();
        trail.draw(ctx);
        if (trail.life <= 0) {
          cursorTrails.splice(index, 1);
        }
      });

      // Draw animated cursor
      const pulseSize = 2 + Math.sin(time * 5) * 1;
      ctx.beginPath();
      ctx.arc(lastCursorX, lastCursorY, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 0, 255, 0.8)";
      ctx.fill();

      // Cursor pointer
      ctx.save();
      ctx.translate(lastCursorX, lastCursorY);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "rgba(0, 200, 200, 0.9)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(12, 12);
      ctx.lineTo(7, 13);
      ctx.lineTo(0, 20);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.restore();

      // Floating data points
      const floatingPoints = [
        {
          x: rect.width * 0.15,
          y: rect.height * 0.3,
          label: "Click Rate",
          value: "+24%",
        },
        {
          x: rect.width * 0.85,
          y: rect.height * 0.4,
          label: "Engagement",
          value: "89%",
        },
        {
          x: rect.width * 0.12,
          y: rect.height * 0.7,
          label: "Conversions",
          value: "+15%",
        },
      ];

      floatingPoints.forEach((point, i) => {
        const offset = Math.sin(time * 2 + i) * 5;
        ctx.save();
        ctx.translate(point.x, point.y + offset);

        // Card background
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.shadowColor = "rgba(0, 200, 200, 0.3)";
        ctx.shadowBlur = 15;
        ctx.fillRect(-40, -25, 80, 50);
        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = "rgba(0, 200, 200, 0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(-40, -25, 80, 50);

        // Text
        ctx.fillStyle = "#666";
        ctx.font = "10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(point.label, 0, -5);

        ctx.fillStyle = "#00C8C8";
        ctx.font = "bold 16px Inter, sans-serif";
        ctx.fillText(point.value, 0, 15);

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ minHeight: "500px" }}
    />
  );
}
