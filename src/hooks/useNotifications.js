import { useRef, useCallback, useEffect } from 'react'

// Minimal "ping" notification sound as base64 WAV (200ms soft chime)
// Generated from a sine wave: 880Hz, 200ms, with fade-out envelope
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVYGAACAgoSGiIqMjo+RkpOUlJSUk5KRj46MioiGhIKAf317eXd1c3FwbnxtbGtqa2prbGxubm9xcnR2eHp8foCChIaIioyOj5GSlJWWl5eXl5aVlJKRj46MioiGhIKAf31beXd1c3FwbnxtbGtraWlpamtsbm9xc3V3eXt9f4GDhYeJi42PkZOUlpeYmJiYl5aVk5KQjo2LiYeEgoB+fHp4dnRycG9tbGtqaWhoaGlqa2xtb3Fyc3V3eXt9f4GDhYeJi42PkJKTlJWWlpaWlZSTkpCOjYuJh4WDgX99e3l3dXNxcG5tbGtqaWhoaGlqa2xtb3FydHZ4ent9f4GDhYeJi42PkJKTlZaWl5eXlpWUk5GQjo2LiYeFg4F/fXt5d3VzcXBubWxramloZ2doaWprbG5vcXN1d3l7fX+Bg4WHiYuNj5GTlJWXmJiZmZiXlpWTkpCOjYuJh4WDgX99e3l3dXNxcG5tbGtqaWhoaGlqa2xub3Fyc3V3eXt9f4GDhYeJi42PkJKTlZaXmJiYmJeWlZOSkI6Ni4mHhYOBf317eXd1c3FwbnxtbGtraWlpamtsbm9xc3V3eXt9f4GDhYeJi42PkZOUlpeYmJiYl5aVk5KQjo2LiYeEgn99e3l3dXNxcG5tbGtqaGdnaGlqa2xub3FzdXd5e31/gYOFh4mLjY+RkpSVl5iZmZmYl5aUk5GQjouKiIaDgX99e3l3dnRycW9ubWxramlpaWprbG1vcHJ0dnh6fH6AgYOFh4mLjY+RkpSVlpeXl5eWlZSTkZCOjIqIhoSCgH58enl3dXRycW9ubWxramlpaWprbG5vcXJ0dnd5e31/gYOFh4mLjY+RkpSVlpeXl5eWlZSTkZCOjIqIhoSCgH58enl3dXRycW9ubWxramlpaWlqamxub3FzdXd5fH6AgYSGiImLjY+QkpSVlpeXl5eWlZSTkZCOjIqIhoSCgH58enl3dXRycW9ubWxramlpaWlqamxub3FzdXd5fH6AgYSGiImLjY+QkZOUlZeYmJiYl5aVk5KQj42LiYeFg4GAfnx6eHZ0cnFvbm1sa2ppaGhpaWprbG5vcXN1d3l7fYCBg4WHiYuNj5CSkpSVlpeXlpaVlJOSkI+NjIqIhoSDgYB+fHp5d3V0cnFvbm1sa2tqa2trbG1ub3Fyc3V3eXp8fn+BgoSGiImLjI6PkJKTlJWWlpaWlZSTkpGPjoyLiYeGhIKBf358enl3dnRzcXBvbm1sa2trbGxtbm9wcnN1dnd5ent9fn+BgoSFh4iKi42Oj5GSk5SUlZWVlJSTkpGQjo2LioiHhYSDgYB/fXx7eXh3dnV0c3JxcHBwcHFxcnN0dXZ3eHl7fH1+f4CBgoOEhYaHiImKi4yNjo+QkJGRkZGRkZCQj46NjYyLioqJiIeGhYSEg4KBgYCAf39/f39/f4CAgIGBgoKDg4SEhYWGhoeHiIiJiYqKioqKioqKiYmIiIeHhoaFhISEg4OCgoGBgYCAgICAgICAgIGBgYKCgoODhISEhYWFhoaGhoaGhoaGhoWFhYSEhIODg4KCgoGBgYCAgIB/f39/f4CAgICBgYGCgoKDg4ODhISEhISEhISEhISEhIODg4KCgoGBgYCAgH9/f39/f39/f4CAgIGBgYKCgoODg4SEhISEhYWFhQAA'

const DEBOUNCE_TTL_MS = 5000

export function useNotifications() {
    const audioRef = useRef(null)
    const recentlyNotified = useRef(new Set())

    useEffect(() => {
        // Pre-load audio once
        try {
            audioRef.current = new Audio(NOTIFICATION_SOUND)
            audioRef.current.volume = 0.5
        } catch (e) {
            console.warn('[Notifications] Audio not supported:', e)
        }

        // Request permission on mount
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => { })
        }
    }, [])

    const playSound = useCallback(() => {
        if (!audioRef.current) return
        // Clone to allow overlapping plays
        const sound = audioRef.current.cloneNode()
        sound.volume = 0.5
        sound.play().catch(() => { })
    }, [])

    const notify = useCallback((leadName, leadId) => {
        // Debounce: skip if this lead was notified in the last 5 seconds
        if (recentlyNotified.current.has(leadId)) return
        recentlyNotified.current.add(leadId)
        setTimeout(() => recentlyNotified.current.delete(leadId), DEBOUNCE_TTL_MS)

        // Play sound
        playSound()

        // Native browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                const n = new Notification('💬 Nova mensagem de ' + leadName, {
                    body: 'Clique para abrir a conversa no Inbox',
                    icon: '/favicon.png',
                    tag: 'lead-' + leadId, // OS groups notifications with same tag
                    renotify: true
                })
                n.onclick = () => {
                    window.focus()
                    window.location.href = '/sales/inbox?leadId=' + leadId
                    n.close()
                }
                // Auto-close after 8 seconds
                setTimeout(() => n.close(), 8000)
            } catch (e) {
                console.warn('[Notifications] Native notification failed:', e)
            }
        }
    }, [playSound])

    return { notify, playSound }
}
