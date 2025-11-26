"use client";

import { useEffect, useRef } from "react";

// Particle class for animated background
class Particle {
  x: number;
  y: number;
  z: number; // 3D depth
  vx: number;
  vy: number;
  vz: number; // 3D velocity
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
  centerZ: number; // 3D center
  disruptedVx: number;
  disruptedVy: number;
  disruptedVz: number; // 3D disruption
  disruptionStrength: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    // Create 3D orbiting particles across entire viewport
    this.centerX = canvasWidth / 2;
    this.centerY = canvasHeight / 2;
    this.centerZ = 0; // Base depth

    // 3D orbital system - particles orbit in 3D space
    const maxRadius =
      Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight) / 2;
    this.orbitRadius = Math.random() * maxRadius * 0.8 + maxRadius * 0.2;
    this.orbitSpeed = Math.random() * 0.25 + 0.05;

    // 3D positioning
    this.phase = Math.random() * Math.PI * 2;
    const elevation = (Math.random() - 0.5) * Math.PI; // -90° to +90° elevation
    const distance = Math.random() * this.orbitRadius;

    // Convert spherical to cartesian coordinates
    this.x =
      this.centerX + Math.cos(this.phase) * Math.cos(elevation) * distance;
    this.y = this.centerY + Math.sin(elevation) * distance;
    this.z =
      this.centerZ + Math.sin(this.phase) * Math.cos(elevation) * distance;

    this.vx = 0;
    this.vy = 0;
    this.vz = 0;

    // Blue colors with depth-based opacity
    const colors = [
      "rgba(37, 99, 235, 0.9)", // blue-600
      "rgba(59, 130, 246, 0.9)", // blue-500
      "rgba(29, 78, 216, 1.0)", // blue-700
      "rgba(30, 64, 175, 0.95)", // blue-800
      "rgba(96, 165, 250, 0.85)", // blue-400
    ];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.size = Math.random() * 2.5 + 1;
    this.opacity = Math.random() * 0.6 + 0.6;

    this.offsetX = Math.random() * Math.PI;
    this.offsetY = Math.random() * Math.PI;
    this.speed = Math.random() * 0.4 + 0.3;
    this.disruptedVx = 0;
    this.disruptedVy = 0;
    this.disruptedVz = 0;
    this.disruptionStrength = 0;
  }

  update(time: number, mouseX: number, mouseY: number, mouseActive: boolean) {
    // 3D orbital motion
    const currentAngle = this.phase + time * this.orbitSpeed;
    const elevation = Math.sin(time * 0.3 + this.phase) * 0.5; // Dynamic elevation

    // 3D orbital position
    const distance =
      this.orbitRadius * (0.8 + Math.sin(time * 0.5 + this.phase) * 0.2);
    const orbitalX =
      this.centerX + Math.cos(currentAngle) * Math.cos(elevation) * distance;
    const orbitalY = this.centerY + Math.sin(elevation) * distance;
    const orbitalZ =
      this.centerZ +
      Math.sin(currentAngle) * Math.cos(elevation) * distance * 0.5;

    // Calculate 3D orbital velocity
    const nextAngle = currentAngle + 0.01;
    const nextElevation = Math.sin(time * 0.3 + this.phase + 0.01) * 0.5;
    const nextDistance =
      this.orbitRadius * (0.8 + Math.sin(time * 0.5 + this.phase + 0.01) * 0.2);

    const nextX =
      this.centerX +
      Math.cos(nextAngle) * Math.cos(nextElevation) * nextDistance;
    const nextY = this.centerY + Math.sin(nextElevation) * nextDistance;
    const nextZ =
      this.centerZ +
      Math.sin(nextAngle) * Math.cos(nextElevation) * nextDistance * 0.5;

    this.vx = (nextX - orbitalX) * 0.8;
    this.vy = (nextY - orbitalY) * 0.8;
    this.vz = (nextZ - orbitalZ) * 0.8;

    // 3D mouse disruption
    if (mouseActive) {
      const dx = mouseX - orbitalX;
      const dy = mouseY - orbitalY;
      const dz = 0 - orbitalZ; // Mouse is at z=0
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < 600) {
        const disruptForce = (1 - distance / 600) * 2.5;
        const angleXY = Math.atan2(dy, dx);
        const angleZ = Math.atan2(dz, Math.sqrt(dx * dx + dy * dy));

        this.disruptedVx = Math.cos(angleXY) * Math.cos(angleZ) * disruptForce;
        this.disruptedVy = Math.sin(angleXY) * Math.cos(angleZ) * disruptForce;
        this.disruptedVz = Math.sin(angleZ) * disruptForce;
        this.disruptionStrength = Math.min(1, this.disruptionStrength + 0.15);
      }
    }

    // Smooth recovery from disruption
    this.disruptionStrength = Math.max(0, this.disruptionStrength - 0.02);

    this.vx += this.disruptedVx * this.disruptionStrength;
    this.vy += this.disruptedVy * this.disruptionStrength;
    this.vz += this.disruptedVz * this.disruptionStrength;

    // Apply 3D position
    this.x = orbitalX + this.disruptedVx * this.disruptionStrength * 30;
    this.y = orbitalY + this.disruptedVy * this.disruptionStrength * 30;
    this.z = orbitalZ + this.disruptedVz * this.disruptionStrength * 30;

    // Apply velocity
    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // 3D perspective rendering
    const perspective = 1000; // Perspective distance
    const scale = perspective / (perspective + this.z);

    const screenX = this.x;
    const screenY = this.y;
    const screenSize = this.size * scale;

    // Depth-based opacity and color
    const depthOpacity = Math.max(0.3, Math.min(1, (this.z + 500) / 1000));
    const finalOpacity = this.opacity * depthOpacity;

    ctx.save();
    ctx.globalAlpha = finalOpacity;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, Math.max(0.5, screenSize), 0, Math.PI * 2);
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

    // Set canvas to full viewport size
    let devicePixelRatio = window.devicePixelRatio || 1;
    const resizeCanvas = () => {
      devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Create particles - 3D orbital system spanning full viewport
    const particles: Particle[] = [];
    const particleCount = Math.min(
      1000,
      Math.max(500, Math.floor((canvas.width * canvas.height) / 10000))
    );
    for (let i = 0; i < particleCount; i++) {
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
      targetMouseX = e.clientX * devicePixelRatio;
      targetMouseY = e.clientY * devicePixelRatio;
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

      // Draw soft connections between nearby particles
      particles.forEach((particle, i) => {
        // Connect to nearby particles in 3D space
        particles.slice(i + 1, i + 15).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const dz = particle.z - otherParticle.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          // Connection distance based on depth
          const maxConnectionDistance = 120 + Math.abs(particle.z) * 0.1;

          if (distance < maxConnectionDistance) {
            const opacity = (1 - distance / maxConnectionDistance) * 0.15;
            const depthFactor = Math.max(0.3, 1 - Math.abs(particle.z) / 1000);

            ctx.strokeStyle = `rgba(59, 130, 246, ${opacity * depthFactor})`;
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
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        opacity: 1,
      }}
    />
  );
}
