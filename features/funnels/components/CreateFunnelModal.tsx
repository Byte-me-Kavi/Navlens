/**
 * CreateFunnelModal Component
 *
 * Modal for creating new funnels using Headless UI for accessibility
 */

"use client";

import React, { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { FunnelStepEditor } from "./FunnelStepEditor";
import { CreateFunnelRequest, StepCondition } from "../types/funnel.types";

// Step input type matching what FunnelStepEditor expects
type StepInput = {
  name: string;
  page_path: string;
  conditions?: StepCondition[];
};

interface CreateFunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFunnelRequest) => Promise<void>;
  siteId: string;
}

export function CreateFunnelModal({
  isOpen,
  onClose,
  onSubmit,
  siteId,
}: CreateFunnelModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StepInput[]>([
    {
      name: "Landing Page",
      page_path: "/",
      conditions: [],
    },
    {
      name: "Pricing Page",
      page_path: "/pricing",
      conditions: [],
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter a funnel name");
      return;
    }

    if (steps.length < 2) {
      setError("Funnel must have at least 2 steps");
      return;
    }

    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].page_path.trim()) {
        setError(`Step ${i + 1} must have a page path`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        site_id: siteId,
        name: name.trim(),
        description: description.trim() || undefined,
        steps: steps.map((step) => ({
          name: step.name,
          page_path: step.page_path,
          conditions: step.conditions,
        })),
      });
      setName("");
      setDescription("");
      setSteps([
        { name: "Landing Page", page_path: "/", conditions: [] },
        { name: "Pricing Page", page_path: "/pricing", conditions: [] },
      ]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create funnel");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform bg-white rounded-xl shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FunnelIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <Dialog.Title className="text-lg font-bold text-gray-900">
                      Create New Funnel
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-6">
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Funnel Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="e.g., Signup Flow"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="What does this funnel track?"
                        rows={2}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Funnel Steps <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Define the sequence of pages users should visit. Order
                        matters!
                      </p>
                      <FunnelStepEditor
                        steps={steps}
                        onChange={setSteps}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Creating...
                        </>
                      ) : (
                        "Create Funnel"
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
