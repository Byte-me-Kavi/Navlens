/**
 * FeedbackModal Component
 * 
 * Choice-based feedback modal with rating, intent, and issue selection
 * Optimized for high response rates with minimal typing required
 */

"use client";

import { useState, useEffect } from "react";
import { FiX, FiSend, FiCheck } from "react-icons/fi";
import {
  ISSUE_OPTIONS,
  INTENT_OPTIONS,
  RATING_OPTIONS,
  type IssueCode,
  type IntentCode,
  type SurveyTrigger,
  type FeedbackWidgetConfig,
  type FeedbackSubmission,
} from "../types/feedback.types";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  onSubmitSuccess: () => void;
  siteId: string;
  surveyTrigger: SurveyTrigger;
  config: FeedbackWidgetConfig;
}

type Step = "rating" | "intent" | "issues" | "message" | "success";

export function FeedbackModal({
  isOpen,
  onClose,
  onDismiss,
  onSubmitSuccess,
  siteId,
  surveyTrigger,
  config,
}: FeedbackModalProps) {
  const [step, setStep] = useState<Step>("rating");
  const [rating, setRating] = useState<number | null>(null);
  const [intent, setIntent] = useState<IntentCode | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<IssueCode[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("rating");
      setRating(null);
      setIntent(null);
      setSelectedIssues([]);
      setMessage("");
      setError(null);
    }
  }, [isOpen]);

  const handleRatingSelect = (value: number) => {
    setRating(value);
    // If rating is good (4-5), show shorter flow
    if (value >= 4) {
      setStep("intent");
    } else {
      // Low rating - go to issues first
      setStep("issues");
    }
  };

  const handleIntentSelect = (code: IntentCode) => {
    setIntent(code);
    setStep("message");
  };

  const toggleIssue = (code: IssueCode) => {
    setSelectedIssues((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  };

  const handleIssuesContinue = () => {
    setStep("intent");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const submission: FeedbackSubmission = {
        siteId,
        sessionId: getSessionId(),
        rating: rating || undefined,
        intent: intent || undefined,
        issues: selectedIssues.length > 0 ? selectedIssues : undefined,
        message: message.trim() || undefined,
        pagePath: window.location.pathname,
        pageUrl: window.location.href,
        deviceType: getDeviceType(),
        userAgent: navigator.userAgent,
        surveyType: surveyTrigger,
        dismissible: config.allowDismiss,
      };

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: submission.siteId,
          session_id: submission.sessionId,
          feedback_type: surveyTrigger === "manual" ? "general" : surveyTrigger,
          rating: submission.rating,
          message: submission.message,
          page_path: submission.pagePath,
          page_url: submission.pageUrl,
          device_type: submission.deviceType,
          user_agent: submission.userAgent,
          metadata: {
            intent: submission.intent,
            issues: submission.issues,
            surveyType: submission.surveyType,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to submit feedback");
      }

      setStep("success");
      setTimeout(() => {
        onSubmitSuccess();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const getSessionId = (): string => {
    // Try to get from tracker or localStorage
    const trackerId = (window as unknown as { NavlensTracker?: { sessionId?: string } })
      ?.NavlensTracker?.sessionId;
    if (trackerId) return trackerId;
    
    let storedId = localStorage.getItem("navlens_session_id");
    if (!storedId) {
      storedId = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("navlens_session_id", storedId);
    }
    return storedId;
  };

  const getDeviceType = (): string => {
    const width = window.innerWidth;
    if (width < 768) return "mobile";
    if (width < 1024) return "tablet";
    return "desktop";
  };

  // Survey-specific opening messages
  const getOpeningMessage = () => {
    switch (surveyTrigger) {
      case "exit_intent":
        return "Before you go...";
      case "frustration":
        return "Having trouble?";
      case "long_page_time":
        return "Need help finding something?";
      default:
        return "Quick Feedback";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {getOpeningMessage()}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step: Rating */}
          {step === "rating" && (
            <div className="space-y-4">
              <p className="text-center text-gray-600">
                How was your experience?
              </p>
              <div className="flex justify-center gap-2">
                {RATING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleRatingSelect(option.value)}
                    className={`p-3 rounded-xl transition-all hover:scale-110 ${
                      rating === option.value
                        ? "bg-blue-100 ring-2 ring-blue-500"
                        : "hover:bg-gray-100"
                    }`}
                    title={option.label}
                  >
                    <span className="text-3xl">{option.emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Issues (for low ratings) */}
          {step === "issues" && (
            <div className="space-y-4">
              <p className="text-center text-gray-600">
                What went wrong? <span className="text-gray-400">(Select all that apply)</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ISSUE_OPTIONS.map((option) => (
                  <button
                    key={option.code}
                    onClick={() => toggleIssue(option.code)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                      selectedIssues.includes(option.code)
                        ? "bg-red-50 border-red-300 text-red-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <span>{option.icon}</span>
                    <span className="text-sm font-medium">{option.label}</span>
                    {selectedIssues.includes(option.code) && (
                      <FiCheck className="w-4 h-4 ml-auto text-red-600" />
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={handleIssuesContinue}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step: Intent */}
          {step === "intent" && (
            <div className="space-y-4">
              <p className="text-center text-gray-600">
                What brought you here today?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {INTENT_OPTIONS.map((option) => (
                  <button
                    key={option.code}
                    onClick={() => handleIntentSelect(option.code)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      intent === option.code
                        ? "bg-blue-50 border-blue-300"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <span className="text-2xl">{option.icon}</span>
                    <span className="text-sm font-medium text-gray-700">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Message (optional) */}
          {step === "message" && (
            <div className="space-y-4">
              <p className="text-center text-gray-600">
                Anything else? <span className="text-gray-400">(optional)</span>
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your thoughts..."
                className="w-full h-24 p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {error && (
                <p className="text-red-600 text-sm text-center">{error}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FiSend className="w-4 h-4" />
                      Submit
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCheck className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Thank you!
              </h3>
              <p className="text-gray-600">
                Your feedback helps us improve.
              </p>
            </div>
          )}
        </div>

        {/* Footer with dismiss option */}
        {onDismiss && step !== "success" && (
          <div className="px-6 pb-4 text-center">
            <button
              onClick={onDismiss}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Don&apos;t ask again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
