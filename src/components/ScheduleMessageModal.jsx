import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Calendar, Clock, Loader2, Send, Search, Globe } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import LeadAvatar from './LeadAvatar';

const TIMEZONES = [
    { label: 'Berlin (GMT+1/2)', value: 'Europe/Berlin' },
    { label: 'Jakarta (GMT+7)', value: 'Asia/Jakarta' },
    { label: 'Zurich (GMT+1/2)', value: 'Europe/Zurich' },
    { label: 'Vienna (GMT+1/2)', value: 'Europe/Vienna' },
    { label: 'Amsterdam (GMT+1/2)', value: 'Europe/Amsterdam' },
    { label: 'Brasília/São Paulo (GMT-3)', value: 'America/Sao_Paulo' },
    { label: 'Lisbon (GMT+0/1)', value: 'Europe/Lisbon' },
    { label: 'London (GMT+0/1)', value: 'Europe/London' },
    { label: 'New York (GMT-5/4)', value: 'America/New_York' },
    { label: 'Los Angeles (GMT-8/7)', value: 'America/Los_Angeles' },
    { label: 'Madrid (GMT+1/2)', value: 'Europe/Madrid' },
    { label: 'Paris (GMT+1/2)', value: 'Europe/Paris' },
    { label: 'Dubai (GMT+4)', value: 'Asia/Dubai' },
    { label: 'Tokyo (GMT+9)', value: 'Asia/Tokyo' }
];

const ScheduleMessageModal = ({ lead: initialLead, clientId, onClose, onSuccess, onError }) => {
    const [lead, setLead] = useState(initialLead || null);
    const [message, setMessage] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [timezone, setTimezone] = useState(() => {
        // Try to find if the browser timezone is in our list, otherwise default to Sao_Paulo or browser default
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return TIMEZONES.some(t => t.value === browserTz) ? browserTz : 'America/Sao_Paulo';
    });
    const [isSaving, setIsSaving] = useState(false);
    
    // Lead selection state (global mode)
    const [leads, setLeads] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Helper to format date for datetime-local in a specific timezone
    const formatForInput = useCallback((date, tz) => {
        const options = {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        const formatter = new Intl.DateTimeFormat('en-CA', options);
        const parts = formatter.formatToParts(date);
        const getPart = (type) => parts.find(p => p.type === type).value;
        return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`;
    }, []);

    // Set initial date/time when component mounts or timezone changes
    useEffect(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30);
        setScheduledAt(formatForInput(now, timezone));
    }, [timezone, formatForInput]);

    // Current local time string for 'min' attribute
    const minTimeStr = useMemo(() => formatForInput(new Date(), timezone), [timezone, formatForInput]);

    // Fetch leads for selection if no initial lead
    useEffect(() => {
        if (initialLead || !clientId) return;

        const searchLeads = async () => {
            if (searchTerm.trim().length < 2) {
                setLeads([]);
                return;
            }

            setIsLoadingLeads(true);
            try {
                const { data, error } = await supabase
                    .from('leads')
                    .select('id, nome, avatar_url, avatar_img, empresa, headline')
                    .eq('client_id', clientId)
                    .ilike('nome', `%${searchTerm}%`)
                    .limit(5)
                    .order('nome');

                if (error) throw error;
                setLeads(data || []);
            } catch (err) {
                console.error('[ScheduleModal] Error fetching leads:', err);
            } finally {
                setIsLoadingLeads(false);
            }
        };

        const timer = setTimeout(searchLeads, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, clientId, initialLead]);

    const handleSchedule = async (e) => {
        e.preventDefault();
        
        if (!lead) {
            onError('Please select a lead.');
            return;
        }

        if (!message.trim()) {
            onError('Please enter a message.');
            return;
        }

        if (!scheduledAt) {
            onError('Please choose a date and time.');
            return;
        }

        // Convert the input string (which is in 'timezone') to a real Date object (UTC)
        // Since we don't have luxon, we use a trick: 
        // 1. Create a date string that JS can parse as local time for that timezone
        // 2. Or just use the browser's ability to calculate the offset
        
        const [datePart, timePart] = scheduledAt.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        
        // This is the chosen time in the chosen timezone. 
        // We need to find the UTC equivalent.
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            hour12: false
        });

        // Binary search or iterative approach to find the UTC time that matches this local time?
        // Actually, a simpler way: new Date(scheduledAt) assumes browser timezone.
        // We can offset it.
        const localDate = new Date(scheduledAt);
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        if (timezone === browserTz) {
            // Easy case
            if (localDate <= new Date()) {
                onError('The scheduled date must be in the future.');
                return;
            }
        }
        
        // For Supabase, the best is to just convert the local string to UTC by accounting for the timezone's offset at that time.
        // Since we are in the browser, let's use a simpler heuristic for now if it's Brazil.
        
        setIsSaving(true);
        try {
            // Create a date object from the input string.
            // But we need to tell JS that this string is in 'timezone', not local.
            // Modern browsers support this via the locale string if we are careful.
            
            // Fallback strategy: Just use the selected date as is if it's already considered future by the browser
            // BUT ensure we send a proper ISO string.
            
            // To properly convert, we'd ideally use Luxon. Without it, we'll use a reliable native way:
            const zonedDate = new Date(new Date(scheduledAt).toLocaleString('en-US', { timeZone: timezone }));
            const utcDate = new Date(scheduledAt);
            const offset = zonedDate.getTime() - utcDate.getTime();
            const finalUtcDate = new Date(utcDate.getTime() - offset);

            if (finalUtcDate <= new Date()) {
                onError('The scheduled date must be in the future.');
                setIsSaving(false);
                return;
            }

            const { error } = await supabase
                .from('scheduled_messages')
                .insert([
                    {
                        lead_id: lead.id,
                        client_id: clientId,
                        message_text: message.trim(),
                        scheduled_at: finalUtcDate.toISOString(),
                        status: 'pending'
                    }
                ]);

            if (error) throw error;

            onSuccess('Message scheduled successfully!');
            onClose();
        } catch (err) {
            console.error('[ScheduleModal] Error:', err);
            onError('Error scheduling message. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                            <Clock size={18} />
                        </div>
                        <h3 className="font-bold text-gray-900">Schedule Message</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSchedule} className="p-6 space-y-5">
                    {/* Lead Selection */}
                    <div className="space-y-2 relative">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recipient Lead</label>
                        
                        {lead ? (
                            <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl relative group transition-all">
                                <LeadAvatar lead={lead} className="w-10 h-10" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-gray-900 truncate">{lead.nome}</div>
                                    <div className="text-[10px] text-gray-500 truncate">{lead.empresa || lead.headline}</div>
                                </div>
                                {!initialLead && (
                                    <button 
                                        type="button"
                                        onClick={() => { setLead(null); setSearchTerm(''); }}
                                        className="p-1 rounded-md hover:bg-orange-200 text-orange-400 hover:text-orange-600 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all"
                                    placeholder="Search for a lead..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                                    onFocus={() => setShowDropdown(true)}
                                />
                                
                                {showDropdown && (searchTerm.length >= 2 || isLoadingLeads) && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-48 overflow-y-auto overflow-x-hidden">
                                        {isLoadingLeads ? (
                                            <div className="p-4 text-center text-xs text-gray-400">Searching leads...</div>
                                        ) : leads.length > 0 ? (
                                            leads.map(l => (
                                                <button
                                                    key={l.id}
                                                    type="button"
                                                    onClick={() => { setLead(l); setShowDropdown(false); }}
                                                    className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                                                >
                                                    <LeadAvatar lead={l} className="w-8 h-8" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-gray-900 truncate">{l.nome}</div>
                                                        <div className="text-[10px] text-gray-500 truncate">{l.empresa || l.headline}</div>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-xs text-gray-400">No leads found.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Timezone Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <Globe size={12} className="text-gray-400" /> Timezone
                        </label>
                        <select
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all appearance-none cursor-pointer"
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                        >
                            {TIMEZONES.map(tz => (
                                <option key={tz.value} value={tz.value}>{tz.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Message Area */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Message</label>
                        <textarea
                            className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all resize-none min-h-[100px]"
                            placeholder="Type the LinkedIn message to be scheduled..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>

                    {/* DateTime Picker */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Scheduled Time</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="datetime-local"
                                className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all"
                                value={scheduledAt}
                                min={minTimeStr}
                                onChange={(e) => setScheduledAt(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !lead || !message.trim() || !scheduledAt}
                            className="flex-[2] px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-sm"
                        >
                            {isSaving ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <Send size={16} />
                                    Schedule Message
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Backdrop for dropdown */}
            {showDropdown && (
                <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setShowDropdown(false)} 
                />
            )}
        </div>
    );
};

export default ScheduleMessageModal;
