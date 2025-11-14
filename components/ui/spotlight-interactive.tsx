"use client";
import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion, useSpring, useTransform, SpringOptions } from "framer-motion";
import { cn } from "@/lib/utils";

type SpotlightProps = {
  className?: string;
  size?: number;
  springOptions?: SpringOptions;
};

export function SpotlightInteractive({
  className,
  size = 300,
  springOptions = { bounce: 0.2 },
}: SpotlightProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <motion.div
      className={cn(
        "pointer-events-none fixed rounded-full blur-3xl",
        "bg-[radial-gradient(circle,rgba(0,200,200,0.4),rgba(0,200,200,0.1),transparent_70%)]",
        isVisible ? "opacity-60" : "opacity-0",
        "transition-opacity duration-300",
        className
      )}
      style={{
        width: size,
        height: size,
        left: position.x - size / 2,
        top: position.y - size / 2,
        zIndex: 1,
      }}
      animate={{
        x: 0,
        y: 0,
      }}
      transition={{
        type: "spring",
        ...springOptions,
      }}
    />
  );
}
