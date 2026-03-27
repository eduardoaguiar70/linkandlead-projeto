import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useClientSelection } from '../contexts/ClientSelectionContext';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Save, Loader2, Info, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const STAGES = [
    { id: 'G1', label: 'G1 · Icebreaker', description: 'First touch message — cold outreach.' },
    { id: 'G2', label: 'G2 · Follow-up', description: 'Follow-up after no reply.' },
    { id: 'G3', label: 'G3 · Engagement', description: 'Deepen the conversation after first reply.' },
    { id: 'G4', label: 'G4 · Proposal', description: 'Moving towards a meeting or proposal.' },
    { id: 'G5', label: 'G5 · Close', description: 'Final stage — closing or scheduling.' },
    { id: 'G6', label: 'G6 · Call to Action', description: 'CTA examples — scheduling a call, booking a meeting, or direct invites.' },
];

const MAX_EXAMPLES = 10;

// Migrates old string format (with \n\n separators) or missing data into a string array
const migrateValue = (val) => {
    if (!val) return [''];
    if (Array.isArray(val)) return val.length > 0 ? val : [''];
    // Legacy string — split by double newlines (paragraph separators)
    const parts = String(val).split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts : [''];
};

// Defensive helper: always returns an array, even if state is a legacy string (HMR-safe)
const toArray = (val) => Array.isArray(val) ? val : migrateValue(val);

const DEFAULT_SCRIPTS = { G1: [''], G2: [''], G3: [''], G4: [''], G5: [''], G6: [''] };

export default function MessageScriptsPage() {
    const { selectedClientId } = useClientSelection();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('G1');
    const [scripts, setScripts] = useState(DEFAULT_SCRIPTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchScripts = useCallback(async () => {
        if (!selectedClientId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('message_scripts')
                .eq('id', selectedClientId)
                .eq('user_id', user.id)
                .single();
            if (error) throw error;
            const loaded = data?.message_scripts || {};
            setScripts({
                G1: migrateValue(loaded.G1),
                G2: migrateValue(loaded.G2),
                G3: migrateValue(loaded.G3),
                G4: migrateValue(loaded.G4),
                G5: migrateValue(loaded.G5),
                G6: migrateValue(loaded.G6),
            });
        } catch (err) {
            console.error('[MessageScripts] fetch error:', err);
            toast.error('Error loading scripts.');
        } finally {
            setLoading(false);
        }
    }, [selectedClientId]);

    useEffect(() => { fetchScripts(); }, [fetchScripts]);

    const handleSave = async () => {
        if (!selectedClientId) return;
        setSaving(true);
        try {
            // Clean empty trailing boxes before saving
            const cleaned = {};
            Object.entries(scripts).forEach(([key, arr]) => {
                const nonEmpty = arr.filter(s => s.trim());
                cleaned[key] = nonEmpty.length > 0 ? nonEmpty : [];
            });

            const { error } = await supabase
                .from('clients')
                .update({ message_scripts: cleaned })
                .eq('id', selectedClientId)
                .eq('user_id', user.id);
            if (error) throw error;
            toast.success('✅ Scripts saved successfully!');
        } catch (err) {
            console.error('[MessageScripts] save error:', err);
            toast.error('❌ Error saving scripts.');
        } finally {
            setSaving(false);
        }
    };

    // --- Array mutation helpers ---
    const updateExample = (stageId, index, value) => {
        setScripts(prev => {
            const arr = [...prev[stageId]];
            arr[index] = value;
            return { ...prev, [stageId]: arr };
        });
    };

    const addExample = (stageId) => {
        setScripts(prev => {
            const arr = prev[stageId];
            if (arr.length >= MAX_EXAMPLES) return prev;
            return { ...prev, [stageId]: [...arr, ''] };
        });
    };

    const removeExample = (stageId, index) => {
        setScripts(prev => {
            const arr = prev[stageId];
            if (arr.length <= 1) return prev; // Keep at least 1 box
            return { ...prev, [stageId]: arr.filter((_, i) => i !== index) };
        });
    };

    const activeStage = STAGES.find(s => s.id === activeTab);
    const activeExamples = toArray(scripts[activeTab]);
    const totalChars = activeExamples.reduce((sum, ex) => sum + (ex?.length || 0), 0);
    const filledCount = activeExamples.filter(ex => ex?.trim()).length;
    const canAddMore = activeExamples.length < MAX_EXAMPLES;

    if (!selectedClientId) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Bot size={40} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm font-medium">Select a client to manage their Message Scripts.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                            <Bot size={20} className="text-orange-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Message Scripts</h1>
                            <p className="text-sm text-gray-500">AI Identity · Funnel Stage Templates</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Saving...' : 'Save Scripts'}
                    </button>
                </div>

                {/* Info Banner */}
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 leading-relaxed">
                        Paste here real examples of messages you usually send. The <strong>Copilot AI</strong> will analyze your slang, tone of voice, and structure to generate messages with your identity at each stage of the funnel.
                    </p>
                </div>

                {/* Tab + Editor Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Stage Tabs */}
                    <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
                        {STAGES.map(stage => {
                            const isFilled = toArray(scripts[stage.id]).some(s => s.trim());
                            return (
                                <button
                                    key={stage.id}
                                    onClick={() => setActiveTab(stage.id)}
                                    className={`relative flex-1 min-w-[90px] px-4 py-3.5 text-xs font-bold tracking-wide transition-all whitespace-nowrap border-b-2 ${activeTab === stage.id
                                        ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                        }`}
                                >
                                    {stage.label}
                                    {isFilled && (
                                        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Editor */}
                    <div className="p-6 space-y-4">
                        {/* Stage description + count */}
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-400 font-medium">{activeStage?.description}</p>
                            <span className="text-[11px] font-semibold text-gray-400">
                                {filledCount}/{activeExamples.length} examples · up to {MAX_EXAMPLES}
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center h-52">
                                <Loader2 size={24} className="animate-spin text-gray-300" />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Example textboxes */}
                                {activeExamples.map((example, index) => (
                                    <div key={index} className="group relative">
                                        {/* Example label */}
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                                Example {index + 1}
                                            </span>
                                            {activeExamples.length > 1 && (
                                                <button
                                                    onClick={() => removeExample(activeTab, index)}
                                                    className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Remove this example"
                                                >
                                                    <Trash2 size={11} />
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        <textarea
                                            value={example}
                                            onChange={e => updateExample(activeTab, index, e.target.value)}
                                            placeholder={`Paste a real example message for stage ${activeTab}...`}
                                            rows={4}
                                            className="w-full p-4 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl resize-y leading-relaxed placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 transition-all"
                                        />
                                        {/* Per-box char count */}
                                        <p className="mt-1 text-[10px] text-gray-300 text-right">
                                            {example.length > 0 ? `${example.length} chars` : ''}
                                        </p>
                                    </div>
                                ))}

                                {/* Add example button */}
                                <button
                                    onClick={() => addExample(activeTab)}
                                    disabled={!canAddMore}
                                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-semibold transition-all ${canAddMore
                                        ? 'border-orange-200 text-orange-500 hover:border-orange-400 hover:bg-orange-50/50 cursor-pointer'
                                        : 'border-gray-200 text-gray-300 cursor-not-allowed'
                                        }`}
                                >
                                    <Plus size={15} />
                                    {canAddMore
                                        ? `Add Example ${activeExamples.length + 1 <= MAX_EXAMPLES ? `(${activeExamples.length}/${MAX_EXAMPLES})` : ''}`
                                        : `Limit reached (${MAX_EXAMPLES}/${MAX_EXAMPLES})`}
                                </button>

                                {/* Footer stats */}
                                <div className="flex items-center justify-between pt-1">
                                    <p className="text-xs text-gray-400">
                                        {totalChars > 0
                                            ? `${filledCount} example${filledCount !== 1 ? 's' : ''} · ${totalChars} total chars`
                                            : 'Empty — the AI will use a generic style for this stage.'}
                                    </p>
                                    {filledCount > 0 && (
                                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                            ✓ Has content
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stage Progress Overview */}
                <div className="grid grid-cols-6 gap-3">
                    {STAGES.map(stage => {
                        const arr = toArray(scripts[stage.id]);
                        const filled = arr.some(s => s.trim());
                        const count = arr.filter(s => s.trim()).length;
                        return (
                            <button
                                key={stage.id}
                                onClick={() => setActiveTab(stage.id)}
                                className={`rounded-xl border p-3 text-center transition-all cursor-pointer ${activeTab === stage.id
                                    ? 'border-orange-400 bg-orange-50 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                            >
                                <div className={`text-xs font-bold mb-1 ${filled ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    {stage.id}
                                </div>
                                <div className={`w-2 h-2 rounded-full mx-auto ${filled ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                                {count > 0 && (
                                    <div className="text-[9px] text-emerald-500 font-semibold mt-1">{count}x</div>
                                )}
                            </button>
                        );
                    })}
                </div>

            </div>
        </div>
    );
}
