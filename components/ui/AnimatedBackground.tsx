"use client";

import { useEffect, useRef } from "react";

// Particle class for animated background
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  opacity: number;
  offsetX: number;
  offsetY: number;
  speed: number;
  phase: number;
  orbitRadius: number;
  orbitSpeed: number;
  centerX: number;
  centerY: number;
  disruptedVx: number;
  disruptedVy: number;
  disruptionStrength: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    // Create orbiting particles across entire viewport
    this.centerX = canvasWidth / 2;
    this.centerY = canvasHeight / 2;

    // Each particle orbits at different radius - spans entire viewport
    const maxRadius =
      Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight) / 2;
    this.orbitRadius = Math.random() * maxRadius * 0.8 + maxRadius * 0.2; // Full viewport coverage
    this.orbitSpeed = Math.random() * 0.25 + 0.05; // Orbital speed variation
    this.phase = Math.random() * Math.PI * 2; // Starting angle

    // Initial position on orbit
    this.x = this.centerX + Math.cos(this.phase) * this.orbitRadius;
    this.y = this.centerY + Math.sin(this.phase) * this.orbitRadius;

    this.vx = 0;
    this.vy = 0;

    // Blue colors
    const colors = [
      "rgba(37, 99, 235, 0.7)", // blue-600
      "rgba(59, 130, 246, 0.7)", // blue-500
      "rgba(29, 78, 216, 0.8)", // blue-700
      "rgba(30, 64, 175, 0.75)", // blue-800
      "rgba(96, 165, 250, 0.65)", // blue-400
    ];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.size = Math.random() * 2.5 + 1;
    this.opacity = Math.random() * 0.4 + 0.5;

    this.offsetX = Math.random() * Math.PI;
    this.offsetY = Math.random() * Math.PI;
    this.speed = Math.random() * 0.4 + 0.3;
    this.disruptedVx = 0;
    this.disruptedVy = 0;
    this.disruptionStrength = 0;
  }

  update(time: number, mouseX: number, mouseY: number, mouseActive: boolean) {
    // Orbital motion - like planets around the sun
    const currentAngle = this.phase + time * this.orbitSpeed;

    // Pure orbital position
    const orbitalX = this.centerX + Math.cos(currentAngle) * this.orbitRadius;
    const orbitalY = this.centerY + Math.sin(currentAngle) * this.orbitRadius;

    // Calculate orbital velocity
    const nextAngle = currentAngle + 0.01;
    const nextX = this.centerX + Math.cos(nextAngle) * this.orbitRadius;
    const nextY = this.centerY + Math.sin(nextAngle) * this.orbitRadius;
    this.vx = (nextX - orbitalX) * 0.8;
    this.vy = (nextY - orbitalY) * 0.8;

    // Mouse disruption - strong pull towards mouse
    if (mouseActive) {
      const dx = mouseX - orbitalX;
      const dy = mouseY - orbitalY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Larger interaction range across viewport
      if (distance < 600) {
        const disruptForce = (1 - distance / 600) * 2.5;
        const angle = Math.atan2(dy, dx);
        this.disruptedVx = Math.cos(angle) * disruptForce;
        this.disruptedVy = Math.sin(angle) * disruptForce;
        this.disruptionStrength = Math.min(1, this.disruptionStrength + 0.15);
      }
    }

    // Smooth recovery from disruption
    this.disruptionStrength = Math.max(0, this.disruptionStrength - 0.02);
    this.vx += this.disruptedVx * this.disruptionStrength;
    this.vy += this.disruptedVy * this.disruptionStrength;

    // Apply position
    this.x = orbitalX + this.disruptedVx * this.disruptionStrength * 30;
    this.y = orbitalY + this.disruptedVy * this.disruptionStrength * 30;

    // Apply velocity
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.opacity;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Set canvas to viewport size only
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Create particles - orbiting system spanning full viewport
    const particles: Particle[] = [];
    for (let i = 0; i < 500; i++) {
      particles.push(new Particle(canvas.width, canvas.height));
    }

    // Mouse tracking
    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;
    let mouseActive = false;
    let mouseTimeout: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
      mouseActive = true;
      clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(() => {
        mouseActive = false;
      }, 150);
    };

    const handleMouseLeave = () => {
      mouseActive = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    // Animation loop
    let animationFrameId: number;
    const startTime = Date.now();

    const animate = () => {
      const currentTime = (Date.now() - startTime) / 1000;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Smooth mouse tracking
      mouseX += (targetMouseX - mouseX) * 0.15;
      mouseY += (targetMouseY - mouseY) * 0.15;

      // Update and draw all particles
      particles.forEach((particle) => {
        particle.update(currentTime, mouseX, mouseY, mouseActive);
        particle.draw(ctx);
      });

      // Draw soft connections
      particles.forEach((particle, i) => {
        particles.slice(i + 1, i + 12).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            const opacity = (1 - distance / 100) * 0.1;
            ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        });
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(mouseTimeout);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 0,
        opacity: 1,
      }}
    />
  );
}
