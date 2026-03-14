import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useClientSelection } from '../contexts/ClientSelectionContext';
import { 
    Calendar, 
    Plus, 
    Clock, 
    Trash2, 
    Search, 
    Filter, 
    ExternalLink,
    AlertCircle,
    CheckCircle2,
    Timer,
    ChevronRight,
    Loader2,
    MessageSquare,
    MoreVertical
} from 'lucide-react';
import LeadAvatar from '../components/LeadAvatar';
import ScheduleMessageModal from '../components/ScheduleMessageModal';
import { toast } from 'sonner';

const ScheduledMessagesPage = () => {
    const { selectedClientId } = useClientSelection();
    const [scheduledMessages, setScheduledMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchScheduledMessages = useCallback(async () => {
        if (!selectedClientId) return;
        
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('scheduled_messages')
                .select(`
                    *,
                    leads:lead_id (
                        id,
                        nome,
                        avatar_url,
                        avatar_img,
                        empresa,
                        headline
                    )
                `)
                .eq('client_id', selectedClientId)
                .order('scheduled_at', { ascending: true });

            if (error) throw error;
            setScheduledMessages(data || []);
        } catch (err) {
            console.error('[ScheduledMessages] Error fetching:', err);
            toast.error('Failed to load scheduled messages.');
        } finally {
            setLoading(false);
        }
    }, [selectedClientId]);

    useEffect(() => {
        fetchScheduledMessages();
    }, [fetchScheduledMessages]);

    const handleCancelMessage = async (id) => {
        if (!confirm('Are you sure you want to cancel this scheduled message?')) return;

        try {
            const { error } = await supabase
                .from('scheduled_messages')
                .delete()
                .eq('id', id);

            if (error) throw error;
            
            setScheduledMessages(prev => prev.filter(m => m.id !== id));
            toast.success('Message cancelled successfully.');
        } catch (err) {
            console.error('[ScheduledMessages] Error deleting:', err);
            toast.error('Failed to cancel message.');
        }
    };

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
                        <Timer size={12} /> Pending
                    </span>
                );
            case 'sent':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <CheckCircle2 size={12} /> Sent
                    </span>
                );
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                        <AlertCircle size={12} /> Failed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-500 border border-gray-200">
                        {status || 'Unknown'}
                    </span>
                );
        }
    };

    const filteredMessages = scheduledMessages.filter(msg => {
        const matchesSearch = msg.leads?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             msg.message_text?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || msg.status?.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Calendar className="text-orange-500" size={32} />
                        Scheduled Messages
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Manage and monitor LinkedIn messages scheduled for future delivery.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus size={20} />
                    New Scheduled Message
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Timer size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-gray-900">{scheduledMessages.filter(m => m.status?.toLowerCase() === 'pending').length}</div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pending</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-gray-900">{scheduledMessages.filter(m => m.status?.toLowerCase() === 'sent').length}</div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sent</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-gray-900">{scheduledMessages.filter(m => m.status?.toLowerCase() === 'failed').length}</div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Failed</div>
                    </div>
                </div>
            </div>

            {/* Controls Area */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text"
                        placeholder="Search leads or messages..."
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-gray-100/50 rounded-2xl border border-gray-200 overflow-hidden">
                    {['all', 'pending', 'sent', 'failed'].map(filter => (
                        <button
                            key={filter}
                            onClick={() => setStatusFilter(filter)}
                            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                statusFilter === filter 
                                ? 'bg-white text-orange-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Table/List */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                        <Loader2 className="animate-spin text-orange-500" size={32} />
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading messages...</span>
                    </div>
                ) : filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] gap-4 p-8 text-center uppercase tracking-widest">
                        <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                            <Clock size={40} />
                        </div>
                        <div>
                            <p className="font-black text-gray-900 mb-1">No scheduled messages found</p>
                            <p className="text-xs text-gray-400 font-bold">Try adjusting your filters or create a new message.</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] w-[25%] text-center">Lead</th>
                                    <th className="px-6 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] w-[35%]">Message Content</th>
                                    <th className="px-6 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] w-[20%] text-center">Scheduled For</th>
                                    <th className="px-6 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] w-[10%] text-center">Status</th>
                                    <th className="px-6 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] w-[10%] text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredMessages.map(msg => (
                                    <tr key={msg.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <LeadAvatar lead={msg.leads} className="w-10 h-10 border-2 border-white shadow-sm" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-gray-900 truncate">
                                                        {msg.leads?.nome || 'Unknown Lead'}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-medium truncate">
                                                        {msg.leads?.empresa || msg.leads?.headline || 'Qualified lead'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                                {msg.message_text}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="inline-flex flex-col items-center p-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-600 min-w-[120px]">
                                                <span className="text-xs font-black">
                                                    {new Date(msg.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400 tracking-wider">
                                                    {new Date(msg.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            {getStatusBadge(msg.status)}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                {msg.status?.toLowerCase() === 'pending' && (
                                                    <button 
                                                        onClick={() => handleCancelMessage(msg.id)}
                                                        className="p-2.5 rounded-xl bg-white border border-red-100 text-red-500 hover:bg-red-50 transition-all shadow-sm hover:shadow-md active:scale-95"
                                                        title="Cancel Scheduling"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => window.open(`/sales/inbox?leadId=${msg.lead_id}`, '_self')}
                                                    className="p-2.5 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-orange-500 hover:border-orange-100 transition-all shadow-sm hover:shadow-md active:scale-95"
                                                    title="Go to Chat"
                                                >
                                                    <MessageSquare size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <ScheduleMessageModal 
                    clientId={selectedClientId}
                    onClose={() => setShowModal(false)}
                    onSuccess={(msg) => {
                        toast.success(msg);
                        fetchScheduledMessages();
                    }}
                    onError={(msg) => toast.error(msg)}
                />
            )}
        </div>
    );
};

export default ScheduledMessagesPage;
