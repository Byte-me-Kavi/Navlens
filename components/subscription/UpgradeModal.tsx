'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { PLANS, FEATURE_LABELS } from '@/lib/plans/config';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName?: string; // 'Starter', 'Pro', etc. if we want to target a specific plan
  featureName?: string; // Feature they tried to access
}

export function UpgradeModal({ isOpen, onClose, planName = 'Pro', featureName }: UpgradeModalProps) {
  // @ts-ignore
  const targetPlan = PLANS[planName.toUpperCase()] || PLANS.PRO;
  
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900 mb-2">
                       {featureName ? `Unlock ${featureName}` : 'Upgrade Your Plan'}
                    </Dialog.Title>
                    <div className="mt-2 text-sm text-gray-600 mb-6">
                        {featureName 
                            ? `The ${featureName} feature is available on the ${planName} plan.` 
                            : `Get access to advanced features with the ${planName} plan.`}
                    </div>

                    {/* Plan Highlight */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-6">
                        <div className="flex justify-between items-center mb-4">
                             <div>
                                <h4 className="font-bold text-lg text-indigo-900">{planName} Plan</h4>
                                <div className="text-2xl font-bold text-indigo-700">
                                    ${targetPlan.price}<span className="text-sm font-normal text-indigo-600">/mo</span>
                                </div>
                             </div>
                             <div className="h-10 w-10 bg-indigo-200 rounded-full flex items-center justify-center text-xl">
                                💎
                             </div>
                        </div>
                        
                        <div className="space-y-2">
                            {targetPlan.features.slice(0, 4).map((f: string) => (
                                <div key={f} className="flex items-center gap-2 text-sm text-indigo-800">
                                    <CheckIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <span>{FEATURE_LABELS[f] || f}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                      <Link
                        href={`/pricing?plan=${planName.toLowerCase()}`}
                        className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:w-auto"
                        onClick={onClose}
                      >
                         View Pricing
                      </Link>
                      <button
                        type="button"
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                        onClick={onClose}
                      >
                        Maybe Later
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
