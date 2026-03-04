import React, { useState, useCallback } from 'react'
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
} from '@dnd-kit/core'
import { Snowflake, Zap, Target, Calendar, FileText, Trophy, XCircle } from 'lucide-react'
import PipelineColumn from './PipelineColumn'
import PipelineLeadCard from './PipelineLeadCard'
import { supabase } from '../../services/supabaseClient'

const STAGES = [
    { id: 'Frio', title: 'Frio', icon: Snowflake },
    { id: 'Engajado', title: 'Engajado', icon: Zap },
    { id: 'Qualificado', title: 'Qualificado', icon: Target },
    { id: 'Agendado', title: 'Agendado', icon: Calendar },
    { id: 'Proposta', title: 'Proposta', icon: FileText },
    { id: 'Ganho', title: 'Ganho', icon: Trophy },
    { id: 'Perdido', title: 'Perdido', icon: XCircle },
]

const PipelineKanbanBoard = ({ leads, setLeads, onCardClick }) => {
    const [activeId, setActiveId] = useState(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    )

    const leadsById = Object.fromEntries(leads.map(l => [l.id, l]))
    const activeLead = activeId ? leadsById[activeId] : null

    const groupedLeads = {}
    STAGES.forEach(s => { groupedLeads[s.id] = [] })
    leads.forEach(lead => {
        const stage = lead.crm_stage || 'Frio'
        if (groupedLeads[stage]) groupedLeads[stage].push(lead)
        else groupedLeads['Frio'].push(lead)
    })

    const findStageByLeadId = useCallback((leadId) => {
        for (const lead of leads) {
            if (lead.id === leadId) return lead.crm_stage || 'Frio'
        }
        return null
    }, [leads])

    const handleDragStart = useCallback((event) => {
        setActiveId(event.active.id)
    }, [])

    const handleDragOver = useCallback((event) => {
        const { active, over } = event
        if (!over) return
        const activeLeadId = active.id
        const overId = over.id
        const sourceStage = findStageByLeadId(activeLeadId)
        const targetStage = STAGES.find(s => s.id === overId) ? overId : findStageByLeadId(overId)
        if (!sourceStage || !targetStage || sourceStage === targetStage) return
        setLeads(prev => prev.map(l => l.id === activeLeadId ? { ...l, crm_stage: targetStage } : l))
    }, [setLeads, findStageByLeadId])

    const handleDragEnd = useCallback(async (event) => {
        const { active } = event
        const leadId = active.id
        const lead = leads.find(l => l.id === leadId)
        setActiveId(null)
        if (!lead) return
        try {
            await supabase.from('leads').update({ crm_stage: lead.crm_stage }).eq('id', leadId)
        } catch (err) {
            console.error('[Pipeline] Error updating crm_stage:', err)
        }
    }, [leads])

    return (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', height: '100%', scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
                {STAGES.map(stage => (
                    <PipelineColumn
                        key={stage.id}
                        id={stage.id}
                        title={stage.title}
                        icon={stage.icon}
                        leads={groupedLeads[stage.id]}
                        onCardClick={onCardClick}
                    />
                ))}
            </div>
            <DragOverlay>
                {activeLead ? (
                    <div style={{ transform: 'rotate(2deg) scale(1.03)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', borderRadius: '8px' }}>
                        <PipelineLeadCard lead={activeLead} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}

export default PipelineKanbanBoard
