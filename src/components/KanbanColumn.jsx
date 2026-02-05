import React from 'react'

/**
 * Reusable Kanban Column component
 * @param {string} title - Column title
 * @param {string} icon - Emoji icon for the column
 * @param {number} count - Number of items in the column
 * @param {string} color - Tailwind color class for the header accent
 * @param {React.ReactNode} children - Lead cards to render inside
 */
const KanbanColumn = ({ title, icon, count = 0, color = 'bg-slate-500', children }) => {
    return (
        <div className="flex flex-col bg-slate-50 rounded-2xl border border-slate-200 min-w-[300px] max-w-[320px] h-full">
            {/* Column Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-200 ${color} bg-opacity-10 rounded-t-2xl`}>
                <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${color} text-white`}>
                    {count}
                </span>
            </div>

            {/* Scrollable Card List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[calc(100vh-280px)]">
                {children}
                {count === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        Nenhum lead aqui
                    </div>
                )}
            </div>
        </div>
    )
}

export default KanbanColumn
