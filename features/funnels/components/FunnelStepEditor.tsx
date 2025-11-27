/**
 * FunnelStepEditor Component
 *
 * Form for creating and editing funnel steps
 */

"use client";

import React from "react";
import { StepConditionType, StepCondition } from "../types/funnel.types";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

// Step input without id and order_index (those are assigned on save)
type StepInput = {
  name: string;
  page_path: string;
  conditions?: StepCondition[];
};

interface FunnelStepEditorProps {
  steps: StepInput[];
  onChange: (steps: StepInput[]) => void;
  disabled?: boolean;
}

const conditionTypes: { value: StepConditionType; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "starts_with", label: "Starts with" },
  { value: "ends_with", label: "Ends with" },
  { value: "regex", label: "Regex" },
];

export function FunnelStepEditor({
  steps,
  onChange,
  disabled = false,
}: FunnelStepEditorProps) {
  const addStep = () => {
    const newStep: StepInput = {
      name: `Step ${steps.length + 1}`,
      page_path: "/",
      conditions: [],
    };
    onChange([...steps, newStep]);
  };

  const updateStep = (index: number, updates: Partial<StepInput>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    onChange(newSteps);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    onChange(newSteps);
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [
      newSteps[targetIndex],
      newSteps[index],
    ];
    onChange(newSteps);
  };

  const addCondition = (stepIndex: number) => {
    const step = steps[stepIndex];
    const conditions = step.conditions || [];
    updateStep(stepIndex, {
      conditions: [
        ...conditions,
        { type: "contains" as StepConditionType, value: "" },
      ],
    });
  };

  const updateCondition = (
    stepIndex: number,
    conditionIndex: number,
    updates: Partial<StepCondition>
  ) => {
    const step = steps[stepIndex];
    const conditions = [...(step.conditions || [])];
    conditions[conditionIndex] = { ...conditions[conditionIndex], ...updates };
    updateStep(stepIndex, { conditions });
  };

  const removeCondition = (stepIndex: number, conditionIndex: number) => {
    const step = steps[stepIndex];
    const conditions = (step.conditions || []).filter(
      (_, i) => i !== conditionIndex
    );
    updateStep(stepIndex, { conditions });
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div
          key={index}
          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
        >
          <div className="flex items-start gap-4">
            {/* Step number and reorder */}
            <div className="flex flex-col items-center gap-1">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                {index + 1}
              </span>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => moveStep(index, "up")}
                  disabled={disabled || index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(index, "down")}
                  disabled={disabled || index === steps.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Step configuration */}
            <div className="flex-1 space-y-3">
              {/* Step name */}
              <input
                type="text"
                value={step.name}
                onChange={(e) => updateStep(index, { name: e.target.value })}
                disabled={disabled}
                placeholder="Step name (e.g., 'View Pricing')"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />

              {/* Page path */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 whitespace-nowrap">
                  Page path:
                </label>
                <input
                  type="text"
                  value={step.page_path}
                  onChange={(e) =>
                    updateStep(index, { page_path: e.target.value })
                  }
                  disabled={disabled}
                  placeholder="/pricing"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                />
              </div>

              {/* Additional conditions */}
              {step.conditions && step.conditions.length > 0 && (
                <div className="space-y-2 pl-4 border-l-2 border-blue-100">
                  <p className="text-xs text-gray-500 font-medium">
                    Additional conditions:
                  </p>
                  {step.conditions.map((condition, condIndex) => (
                    <div key={condIndex} className="flex items-center gap-2">
                      <select
                        value={condition.type}
                        onChange={(e) =>
                          updateCondition(index, condIndex, {
                            type: e.target.value as StepConditionType,
                          })
                        }
                        disabled={disabled}
                        className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      >
                        {conditionTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={condition.value}
                        onChange={(e) =>
                          updateCondition(index, condIndex, {
                            value: e.target.value,
                          })
                        }
                        disabled={disabled}
                        placeholder="Value"
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                      <button
                        type="button"
                        onClick={() => removeCondition(index, condIndex)}
                        disabled={disabled}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add condition button */}
              <button
                type="button"
                onClick={() => addCondition(index)}
                disabled={disabled}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <PlusIcon className="w-3 h-3" />
                Add condition
              </button>
            </div>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => removeStep(index)}
              disabled={disabled || steps.length <= 2}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={
                steps.length <= 2
                  ? "Funnel must have at least 2 steps"
                  : "Remove step"
              }
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Connection indicator */}
          {index < steps.length - 1 && (
            <div className="flex justify-center mt-3">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
                <span>then</span>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add step button */}
      <button
        type="button"
        onClick={addStep}
        disabled={disabled || steps.length >= 10}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PlusIcon className="w-5 h-5" />
        <span>Add Step</span>
        {steps.length >= 10 && <span className="text-xs">(Max 10 steps)</span>}
      </button>
    </div>
  );
}
