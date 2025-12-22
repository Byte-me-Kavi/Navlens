'use client';

/**
 * Goal Configuration Component
 * 
 * Enterprise-grade goal configuration panel for A/B experiments.
 * Supports multiple goal types with type-specific configuration.
 */

import React, { useState, useCallback } from 'react';
import {
    MousePointer,
    FileText,
    FormInput,
    Zap,
    ScrollText,
    Clock,
    DollarSign,
    Plus,
    Trash2,
    Star,
    GripVertical,
    ChevronDown,
    ChevronUp,
    AlertCircle,
} from 'lucide-react';
import type { ExperimentGoal, GoalType, UrlMatchType } from '@/lib/experiments/types';

// Goal type configuration
const GOAL_TYPES: { 
    type: GoalType; 
    label: string; 
    description: string; 
    icon: React.ElementType;
}[] = [
    { type: 'click', label: 'Click Element', description: 'User clicks a specific element', icon: MousePointer },
    { type: 'pageview', label: 'Page View', description: 'User visits a specific URL', icon: FileText },
    { type: 'form_submit', label: 'Form Submission', description: 'User submits a form', icon: FormInput },
    { type: 'custom_event', label: 'Custom Event', description: 'Track any JavaScript event', icon: Zap },
    { type: 'scroll_depth', label: 'Scroll Depth', description: 'User scrolls to a percentage', icon: ScrollText },
    { type: 'time_on_page', label: 'Time on Page', description: 'User spends X seconds', icon: Clock },
    { type: 'revenue', label: 'Revenue/Transaction', description: 'Track purchase value', icon: DollarSign },
];

interface GoalConfigProps {
    goals: ExperimentGoal[];
    onChange: (goals: ExperimentGoal[]) => void;
    disabled?: boolean;
    onVisualSelect?: (goalId: string) => void; // For visual goal setup
}

export function GoalConfig({ goals, onChange, disabled, onVisualSelect }: GoalConfigProps) {
    const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
    const [showTypeSelector, setShowTypeSelector] = useState(false);

    const addGoal = useCallback((type: GoalType) => {
        const newGoal: ExperimentGoal = {
            id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            name: `New ${GOAL_TYPES.find(t => t.type === type)?.label || 'Goal'}`,
            type,
            is_primary: goals.length === 0, // First goal is primary
        };

        // Set defaults based on type
        switch (type) {
            case 'pageview':
                newGoal.url_pattern = '/';
                newGoal.url_match = 'contains';
                break;
            case 'custom_event':
                newGoal.event_name = 'conversion';
                break;
            case 'scroll_depth':
                newGoal.depth_percentage = 75;
                break;
            case 'time_on_page':
                newGoal.seconds = 30;
                break;
            case 'revenue':
                newGoal.event_name = 'purchase';
                newGoal.track_value = true;
                newGoal.value_field = 'amount';
                newGoal.currency = 'USD';
                break;
        }

        onChange([...goals, newGoal]);
        setExpandedGoalId(newGoal.id);
        setShowTypeSelector(false);
    }, [goals, onChange]);

    const updateGoal = useCallback((id: string, updates: Partial<ExperimentGoal>) => {
        onChange(goals.map(g => g.id === id ? { ...g, ...updates } : g));
    }, [goals, onChange]);

    const removeGoal = useCallback((id: string) => {
        const remaining = goals.filter(g => g.id !== id);
        // Ensure at least one primary goal
        if (remaining.length > 0 && !remaining.some(g => g.is_primary)) {
            remaining[0].is_primary = true;
        }
        onChange(remaining);
    }, [goals, onChange]);

    const setPrimary = useCallback((id: string) => {
        onChange(goals.map(g => ({ ...g, is_primary: g.id === id })));
    }, [goals, onChange]);

    const getIconForType = (type: GoalType) => {
        const config = GOAL_TYPES.find(t => t.type === type);
        return config?.icon || Zap;
    };

    return (
        <div className="space-y-4">
            {/* Goals Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <div className="p-1.5 bg-violet-50 rounded-lg">
                        <Star className="w-4 h-4 text-violet-600" />
                    </div>
                    Goals ({goals.length})
                </h3>
                <button
                    type="button"
                    onClick={() => setShowTypeSelector(!showTypeSelector)}
                    disabled={disabled || goals.length >= 10}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm shadow-indigo-200/50"
                >
                    <Plus className="w-4 h-4" />
                    Add Goal
                </button>
            </div>

            {/* Goal Type Selector */}
            {showTypeSelector && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-3">Select goal type:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {GOAL_TYPES.map(({ type, label, description, icon: Icon }) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => addGoal(type)}
                                className="flex items-start gap-3 p-3 text-left bg-white rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                            >
                                <div className="p-1.5 bg-indigo-50 rounded-lg">
                                    <Icon className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{label}</div>
                                    <div className="text-xs text-gray-500">{description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Goals List */}
            {goals.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                    <div className="w-12 h-12 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <AlertCircle className="w-6 h-6 text-violet-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">No goals configured</p>
                    <p className="text-xs text-gray-500 mt-1">Add at least one goal to measure experiment success</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {goals.map((goal) => {
                        const Icon = getIconForType(goal.type);
                        const isExpanded = expandedGoalId === goal.id;

                        return (
                            <div
                                key={goal.id}
                                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                            >
                                {/* Goal Header */}
                                <div 
                                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                                >
                                    <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                                    <div className="p-1.5 bg-indigo-50 rounded-lg">
                                        <Icon className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {goal.name}
                                            </span>
                                            {goal.is_primary && (
                                                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-violet-50 text-violet-700 border border-violet-100 rounded-md">
                                                    Primary
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {GOAL_TYPES.find(t => t.type === goal.type)?.label}
                                            {goal.selector && ` • ${goal.selector}`}
                                            {goal.url_pattern && ` • ${goal.url_pattern}`}
                                            {goal.event_name && ` • ${goal.event_name}`}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!goal.is_primary && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setPrimary(goal.id); }}
                                                disabled={disabled}
                                                className="p-1.5 text-gray-400 hover:text-yellow-500 transition-colors"
                                                title="Set as primary"
                                            >
                                                <Star className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeGoal(goal.id); }}
                                            disabled={disabled}
                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Delete goal"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        {isExpanded ? (
                                            <ChevronUp className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Goal Configuration Panel */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-4 bg-gray-50">
                                        {/* Goal Name */}
                                        <div>
                                            <label className="block text-xs font-semibold text-indigo-900 mb-1.5">
                                                Goal Name
                                            </label>
                                            <input
                                                type="text"
                                                value={goal.name}
                                                onChange={(e) => updateGoal(goal.id, { name: e.target.value })}
                                                disabled={disabled}
                                                placeholder="e.g., Add to Cart Click"
                                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
                                            />
                                        </div>

                                        {/* Type-specific configuration */}
                                        <GoalTypeConfig
                                            goal={goal}
                                            onUpdate={(updates) => updateGoal(goal.id, updates)}
                                            disabled={disabled}
                                            onVisualSelect={onVisualSelect ? () => onVisualSelect(goal.id) : undefined}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Type-specific configuration component
interface GoalTypeConfigProps {
    goal: ExperimentGoal;
    onUpdate: (updates: Partial<ExperimentGoal>) => void;
    disabled?: boolean;
    onVisualSelect?: () => void;
}

function GoalTypeConfig({ goal, onUpdate, disabled, onVisualSelect }: GoalTypeConfigProps) {
    switch (goal.type) {
        case 'click':
        case 'form_submit':
            return (
                <div className="space-y-3">
                    <div>
                    <label className="block text-xs font-semibold text-indigo-900 mb-1.5">
                            CSS Selector
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={goal.selector || ''}
                                onChange={(e) => onUpdate({ selector: e.target.value })}
                                disabled={disabled}
                                placeholder="e.g., button.add-to-cart, #submit-btn"
                                className="flex-1 px-3 py-2.5 text-sm font-mono border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
                            />
                            {onVisualSelect && (
                                <button
                                    type="button"
                                    onClick={onVisualSelect}
                                    disabled={disabled}
                                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                                >
                                    <MousePointer className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Use CSS selector to target specific elements
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-indigo-900 mb-1.5">
                            URL Pattern (optional)
                        </label>
                        <input
                            type="text"
                            value={goal.url_pattern || ''}
                            onChange={(e) => onUpdate({ url_pattern: e.target.value })}
                            disabled={disabled}
                            placeholder="e.g., /products, /checkout"
                            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
                        />
                    </div>
                </div>
            );

        case 'pageview':
            return (
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-indigo-900 mb-1.5">
                            URL Pattern
                        </label>
                        <input
                            type="text"
                            value={goal.url_pattern || ''}
                            onChange={(e) => onUpdate({ url_pattern: e.target.value })}
                            disabled={disabled}
                            placeholder="e.g., /checkout, /thank-you"
                            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-indigo-900 mb-1.5">
                            Match Type
                        </label>
                        <select
                            value={goal.url_match || 'contains'}
                            onChange={(e) => onUpdate({ url_match: e.target.value as UrlMatchType })}
                            disabled={disabled}
                            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                        >
                            <option value="exact">Exact match</option>
                            <option value="contains">Contains</option>
                            <option value="regex">Regex pattern</option>
                        </select>
                    </div>
                </div>
            );

        case 'custom_event':
            return (
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-indigo-900 mb-1.5">
                            Event Name
                        </label>
                        <input
                            type="text"
                            value={goal.event_name || ''}
                            onChange={(e) => onUpdate({ event_name: e.target.value })}
                            disabled={disabled}
                            placeholder="e.g., conversion, signup, add_to_cart"
                            className="w-full px-3 py-2.5 text-sm font-mono border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
                        />
                        <p className="mt-1.5 text-xs text-gray-500">
                            Track with: navlens.track(&apos;{goal.event_name || 'event_name'}&apos;)
                        </p>
                    </div>
                </div>
            );

        case 'scroll_depth':
            return (
                <div>
                    <label className="block text-xs font-semibold text-indigo-900 mb-1.5">
                        Scroll Depth Threshold
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            value={goal.depth_percentage || 75}
                            onChange={(e) => onUpdate({ depth_percentage: parseInt(e.target.value) })}
                            disabled={disabled}
                            className="flex-1 accent-indigo-600"
                        />
                        <span className="w-12 text-sm font-bold text-indigo-900">
                            {goal.depth_percentage || 75}%
                        </span>
                    </div>
                </div>
            );

        case 'time_on_page':
            return (
                <div>
                    <label className="block text-xs font-semibold text-indigo-900 mb-1.5">
                        Time Threshold (seconds)
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="3600"
                        value={goal.seconds || 30}
                        onChange={(e) => onUpdate({ seconds: parseInt(e.target.value) || 30 })}
                        disabled={disabled}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
            );

        case 'revenue':
            return (
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-indigo-900 mb-1.5">
                            Event Name
                        </label>
                        <input
                            type="text"
                            value={goal.event_name || 'purchase'}
                            onChange={(e) => onUpdate({ event_name: e.target.value })}
                            disabled={disabled}
                            placeholder="e.g., purchase, transaction"
                            className="w-full px-3 py-2.5 text-sm font-mono border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-indigo-900 mb-1.5">
                                Value Field
                            </label>
                            <input
                                type="text"
                                value={goal.value_field || 'amount'}
                                onChange={(e) => onUpdate({ value_field: e.target.value })}
                                disabled={disabled}
                                placeholder="amount"
                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-indigo-900 mb-1.5">
                                Currency
                            </label>
                            <input
                                type="text"
                                value={goal.currency || 'USD'}
                                onChange={(e) => onUpdate({ currency: e.target.value.toUpperCase() })}
                                disabled={disabled}
                                maxLength={3}
                                placeholder="USD"
                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        Track with: navlens.track(&apos;{goal.event_name || 'purchase'}&apos;, &#123; {goal.value_field || 'amount'}: 99.99 &#125;)
                    </p>
                </div>
            );

        default:
            return null;
    }
}

export default GoalConfig;
