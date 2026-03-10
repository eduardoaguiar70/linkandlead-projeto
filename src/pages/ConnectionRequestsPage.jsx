import React from 'react'
import ConnectionRequests from '../components/ConnectionRequests'
import { Link2 } from 'lucide-react'

const ConnectionRequestsPage = () => {
    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* Header Área */}
            <div className="shrink-0 p-6 border-b border-gray-200 bg-white">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-primary mb-1">
                            <Link2 size={24} strokeWidth={2.5} />
                            <h1 className="text-2xl font-black tracking-tight text-gray-900">Connection Requests</h1>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">
                            Manage LinkedIn connection requests and send personalized icebreakers.
                        </p>
                    </div>
                </div>
            </div>

            {/* Conteúdo Principal (Scrollável) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-4xl mx-auto">
                    <ConnectionRequests />
                </div>
            </div>
        </div>
    )
}

export default ConnectionRequestsPage
