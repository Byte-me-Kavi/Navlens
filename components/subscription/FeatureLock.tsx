import { ReactNode, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSubscription } from '@/app/context/SubscriptionContext';
import { PLANS, PlanTier } from '@/lib/plans/config';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { UpgradeModal } from './UpgradeModal';

interface FeatureLockProps {
    children: ReactNode;
    feature: string;
    fallback?: ReactNode;
    blur?: boolean;
    title?: string;
    description?: string;
}

export function FeatureLock({ children, feature, fallback, blur = false, title, description }: FeatureLockProps) {
    const { hasFeature, isLoading, plan } = useSubscription();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Determine the minimum plan required for this feature
    const requiredPlan = useMemo(() => {
        const tiers: PlanTier[] = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];
        for (const tier of tiers) {
            if (PLANS[tier].features.includes(feature)) {
                return PLANS[tier];
            }
        }
        return PLANS.PRO; // Default fallback
    }, [feature]);

    if (isLoading) {
        return <div className="animate-pulse bg-gray-100 rounded-lg h-32 w-full" />;
    }

    if (hasFeature(feature)) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    const upgradeLabel = requiredPlan.name;

    // Strict Lock State (No Blur - Replace Content)
    if (!blur) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 rounded-xl border border-gray-200 min-h-[60vh]">
                <div className="bg-white p-4 rounded-full shadow-lg mb-6 ring-1 ring-gray-100">
                    <LockClosedIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {title || `Unlock ${feature.replace(/_/g, ' ')}`}
                </h3>
                <p className="text-gray-600 mb-8 max-w-md text-base leading-relaxed">
                    {description || <>Upgrade to the <span className="font-bold text-indigo-600">{upgradeLabel}</span> plan to access this feature and more.</>}
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all hover:scale-105"
                    >
                        Unlock Feature
                    </button>
                    <Link 
                        href="/pricing"
                        className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
                    >
                        View Plans
                    </Link>
                </div>

                <UpgradeModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    planName={upgradeLabel}
                    featureName={feature.replace(/_/g, ' ')}
                />
            </div>
        );
    }

    // Blurred Preview State
    return (
        <div className="relative group overflow-hidden rounded-lg border border-gray-200">
            {/* Blurred Content */}
            <div className="transition-all duration-300 blur-sm opacity-50 pointer-events-none select-none grayscale">
               {children}
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] z-10 p-6 text-center">
                <div className="bg-white p-3 rounded-full shadow-lg mb-4 ring-1 ring-gray-100">
                    <LockClosedIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {title || `Unlock ${feature.replace(/_/g, ' ')}`}
                </h3>
                <p className="text-sm text-gray-600 mb-6 max-w-sm">
                    {description || <>Upgrade to the <span className="font-bold text-indigo-600">{upgradeLabel}</span> plan to access this feature and more.</>}
                </p>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
                >
                    Unlock Feature
                </button>

                <UpgradeModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    planName={upgradeLabel}
                    featureName={feature.replace(/_/g, ' ')}
                />
            </div>
        </div>
    );
}
