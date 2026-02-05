import React from 'react'

/**
 * KanbanColumn - A reusable column component for the Kanban board
 * @param {string} title - Column title
 * @param {string} icon - Emoji icon for the column
 * @param {number} count - Number of items in the column
 * @param {string} colorClass - Tailwind color class for the header accent
 * @param {React.ReactNode} children - Lead cards to render
 */
const KanbanColumn = ({ title, icon, count = 0, colorClass = 'bg-slate-500', children }) => {
    return (
        <div className="flex flex-col bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 shadow-lg min-w-[300px] max-w-[320px] h-full">
            {/* Column Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 rounded-t-2xl`}>
                <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${colorClass}`}>
                    {count}
                </span>
            </div>

            {/* Scrollable Card List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[calc(100vh-320px)] custom-scrollbar">
                {children}
                {count === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm italic">
                        Nenhum lead aqui
                    </div>
                )}
            </div>
        </div>
    )
}

export default KanbanColumn
