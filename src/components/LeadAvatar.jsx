import React, { useState, useMemo } from 'react';
import { User } from 'lucide-react';

/**
 * LeadAvatar Component
 * 
 * A resilient avatar component with a multi-stage fallback strategy:
 * 1. avatar_img (Internal/Permanent)
 * 2. avatar_url (External/Temporary)
 * 3. Initials (Generated from name)
 * 4. User Icon (Final fallback)
 */
const LeadAvatar = ({ lead, avatar_img, avatar_url, name, className = "" }) => {
    const [hasError, setHasError] = useState(false);

    // Extract values supporting both full lead object or individual props
    const d_img = lead?.avatar_img || avatar_img;
    const d_url = lead?.avatar_url || avatar_url;
    const d_name = lead?.nome || lead?.name || name || 'Lead';

    // Priority: Internal Subabase Image > External API URL
    const src = d_img || d_url;

    // Generate initials for the visual fallback
    const initials = useMemo(() => {
        if (!d_name || d_name === 'Lead') return '';
        const parts = d_name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        // Capture first letter of first name and first letter of surname (last part)
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }, [d_name]);

    // Error or No Source -> Render Elegant Initials Circle
    if (!src || hasError) {
        return (
            <div 
                className={`
                    flex items-center justify-center shrink-0
                    bg-white border border-slate-200 rounded-full
                    shadow-sm overflow-hidden
                    ${className}
                `}
                title={d_name}
            >
                {initials ? (
                    <span className="text-[#6366f1] font-bold text-[0.85em] leading-none tracking-tight">
                        {initials}
                    </span>
                ) : (
                    <User size="50%" className="text-slate-400" />
                )}
            </div>
        );
    }

    return (
        <div className={`relative shrink-0 overflow-hidden rounded-full bg-white border border-slate-200 shadow-sm ${className}`}>
            <img
                src={src}
                alt={d_name}
                className="w-full h-full object-cover select-none"
                referrerPolicy="no-referrer"
                onError={() => {
                    console.log(`[LeadAvatar] Failed to load image for: ${d_name}`);
                    setHasError(true);
                }}
            />
            
            {/* Subtle Gradient overlay for depth */}
            <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/5" />
        </div>
    );
};

export default LeadAvatar;
