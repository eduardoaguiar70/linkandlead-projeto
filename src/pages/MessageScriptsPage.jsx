import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useClientSelection } from '../contexts/ClientSelectionContext';
import { Bot, Save, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

const STAGES = [
    { id: 'G1', label: 'G1 · Icebreaker', description: 'First touch message — cold outreach.' },
    { id: 'G2', label: 'G2 · Follow-up', description: 'Follow-up after no reply.' },
    { id: 'G3', label: 'G3 · Engagement', description: 'Deepen the conversation after first reply.' },
    { id: 'G4', label: 'G4 · Proposal', description: 'Moving towards a meeting or proposal.' },
    { id: 'G5', label: 'G5 · Close', description: 'Final stage — closing or scheduling.' },
];

const DEFAULT_SCRIPTS = { G1: '', G2: '', G3: '', G4: '', G5: '' };

export default function MessageScriptsPage() {
    const { selectedClientId } = useClientSelection();
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
                .single();
            if (error) throw error;
            const loaded = data?.message_scripts || {};
            setScripts({
                G1: loaded.G1 || '',
                G2: loaded.G2 || '',
                G3: loaded.G3 || '',
                G4: loaded.G4 || '',
                G5: loaded.G5 || '',
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
            const { error } = await supabase
                .from('clients')
                .update({ message_scripts: scripts })
                .eq('id', selectedClientId);
            if (error) throw error;
            toast.success('✅ Scripts saved successfully!');
        } catch (err) {
            console.error('[MessageScripts] save error:', err);
            toast.error('❌ Error saving scripts.');
        } finally {
            setSaving(false);
        }
    };

    const activeStage = STAGES.find(s => s.id === activeTab);
    const charCount = scripts[activeTab]?.length || 0;

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
                        {STAGES.map(stage => (
                            <button
                                key={stage.id}
                                onClick={() => setActiveTab(stage.id)}
                                className={`flex-1 min-w-[90px] px-4 py-3.5 text-xs font-bold tracking-wide transition-all whitespace-nowrap border-b-2 ${
                                    activeTab === stage.id
                                        ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                }`}
                            >
                                {stage.label}
                            </button>
                        ))}
                    </div>

                    {/* Editor */}
                    <div className="p-6 space-y-3">
                        <p className="text-xs text-gray-400 font-medium">{activeStage?.description}</p>
                        {loading ? (
                            <div className="flex items-center justify-center h-52">
                                <Loader2 size={24} className="animate-spin text-gray-300" />
                            </div>
                        ) : (
                            <>
                                <textarea
                                    value={scripts[activeTab]}
                                    onChange={e => setScripts(prev => ({ ...prev, [activeTab]: e.target.value }))}
                                    placeholder={`Paste real example messages for stage ${activeTab}. You can add multiple examples separated by line breaks.`}
                                    className="w-full min-h-[260px] p-4 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl resize-y leading-relaxed placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 transition-all"
                                />
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-400">
                                        {charCount > 0
                                            ? `${charCount} characters · ${scripts[activeTab].split('\n').filter(l => l.trim()).length} lines`
                                            : 'Empty — the AI will use a generic style for this stage.'}
                                    </p>
                                    {charCount > 0 && (
                                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                            ✓ Has content
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Stage Progress Overview */}
                <div className="grid grid-cols-5 gap-3">
                    {STAGES.map(stage => {
                        const filled = (scripts[stage.id]?.trim().length || 0) > 0;
                        return (
                            <button
                                key={stage.id}
                                onClick={() => setActiveTab(stage.id)}
                                className={`rounded-xl border p-3 text-center transition-all cursor-pointer ${
                                    activeTab === stage.id
                                        ? 'border-orange-400 bg-orange-50 shadow-sm'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                                <div className={`text-xs font-bold mb-1 ${filled ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    {stage.id}
                                </div>
                                <div className={`w-2 h-2 rounded-full mx-auto ${filled ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                            </button>
                        );
                    })}
                </div>

            </div>
        </div>
    );
}
