import React from 'react'

export const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-white/10 rounded-xl ${className}`} />
)

export const KpiCardSkeleton = () => (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="w-24 h-3" />
        </div>
        <Skeleton className="w-16 h-8" />
    </div>
)

export const HeroTaskCardSkeleton = () => (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 border-l-[4px] border-l-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
                <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="w-32 h-4" />
                    <Skeleton className="w-48 h-3" />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="w-24 h-10 rounded-xl" />
                <Skeleton className="w-10 h-10 rounded-xl" />
            </div>
        </div>
    </div>
)
