/**
 * FeedbackWidget Component
 * 
 * Floating feedback button that opens the feedback modal
 * Includes exit intent and frustration detection triggers
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FeedbackModal } from "./FeedbackModal";
import type { FeedbackWidgetConfig, SurveyTrigger } from "../types/feedback.types";
import { DEFAULT_FEEDBACK_CONFIG } from "../types/feedback.types";
import { FiMessageCircle } from "react-icons/fi";

interface FeedbackWidgetProps {
  siteId: string;
  config?: Partial<FeedbackWidgetConfig>;
  onFeedbackSubmit?: () => void;
}

export function FeedbackWidget({
  siteId,
  config: userConfig,
  onFeedbackSubmit,
}: FeedbackWidgetProps) {
  const config = { ...DEFAULT_FEEDBACK_CONFIG, ...userConfig };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [surveyTrigger, setSurveyTrigger] = useState<SurveyTrigger>("manual");
  const [dismissed, setDismissed] = useState(() => {
    // Lazy initialization - read from localStorage on first render
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`navlens_feedback_dismissed_${siteId}`) === "true";
    }
    return false;
  });
  const pageLoadTimeRef = useRef<number>(0);
  const exitIntentTriggered = useRef(false);
  const frustrationTriggered = useRef(false);
  
  // Initialize page load time on mount
  useEffect(() => {
    pageLoadTimeRef.current = Date.now();
  }, []);
  
  // Check if minimum time has passed
  const hasMinTimePassed = useCallback(() => {
    if (pageLoadTimeRef.current === 0) return false;
    return (Date.now() - pageLoadTimeRef.current) >= config.minTimeBeforeSurvey * 1000;
  }, [config.minTimeBeforeSurvey]);

  // Exit intent detection
  useEffect(() => {
    if (!config.showExitIntent || !config.enabled) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (
        e.clientY <= 0 &&
        !exitIntentTriggered.current &&
        !isModalOpen &&
        !dismissed &&
        hasMinTimePassed()
      ) {
        exitIntentTriggered.current = true;
        setSurveyTrigger("exit_intent");
        setIsModalOpen(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [config.showExitIntent, config.enabled, isModalOpen, dismissed, hasMinTimePassed]);

  // Listen for frustration events from tracker
  useEffect(() => {
    if (!config.showFrustrationSurvey || !config.enabled) return;

    const handleFrustration = () => {
      if (
        !frustrationTriggered.current &&
        !isModalOpen &&
        !dismissed &&
        hasMinTimePassed()
      ) {
        frustrationTriggered.current = true;
        setSurveyTrigger("frustration");
        setIsModalOpen(true);
      }
    };

    // Listen for custom frustration event from tracker.js
    window.addEventListener("navlens:frustration", handleFrustration);
    return () => window.removeEventListener("navlens:frustration", handleFrustration);
  }, [config.showFrustrationSurvey, config.enabled, isModalOpen, dismissed, hasMinTimePassed]);

  const handleOpenModal = () => {
    setSurveyTrigger("manual");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setIsModalOpen(false);
    // Store dismissal in localStorage
    localStorage.setItem(`navlens_feedback_dismissed_${siteId}`, "true");
  };

  const handleSubmitSuccess = () => {
    setIsModalOpen(false);
    onFeedbackSubmit?.();
  };



  if (!config.enabled) return null;

  // Position styles
  const positionStyles = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  };

  return (
    <>
      {/* Floating Button */}
      {!isModalOpen && (
        <button
          onClick={handleOpenModal}
          className={`fixed ${positionStyles[config.position]} z-50 p-4 rounded-full shadow-lg 
            hover:scale-110 transition-all duration-300 group`}
          style={{ backgroundColor: config.primaryColor }}
          aria-label="Give Feedback"
        >
          <FiMessageCircle className="w-6 h-6 text-white" />
          
          {/* Tooltip */}
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 
            bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg 
            opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Give Feedback
          </span>
          
          {/* Pulse animation */}
          <span 
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: config.primaryColor }}
          />
        </button>
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onDismiss={config.allowDismiss ? handleDismiss : undefined}
        onSubmitSuccess={handleSubmitSuccess}
        siteId={siteId}
        surveyTrigger={surveyTrigger}
        config={config}
      />
    </>
  );
}
