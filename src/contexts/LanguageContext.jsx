import React, { createContext, useState, useContext } from 'react'

const LanguageContext = createContext()

const translations = {
    pt: {
        dashboard: "Dashboard",
        posts: "My Posts",
        clients: "Manage Clients",
        newPost: "New Content",
        logout: "Logout",
        agencyProgress: "Agency Progress",
        pipelineOverview: "Pipeline overview by client",
        drafts: "Ideas (Draft)",
        waiting: "Waiting Approval",
        review: "In Review",
        approved: "Approved / Ready",
        actions: "Actions",
        client: "Client",
        openPosts: "Open Posts",
        copyLink: "Copy Link",
        loading: "Loading...",
        noClients: "No clients registered in the pipeline.",
        ideas: "Ideas Bank",
        newQuestion: "New Question",
        pendingQuestions: "Pending Questions",
        answeredQuestions: "Answered / Insights",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        answer: "Answer",
        questionPlaceholder: "Type the strategic question for the client...",
        answerPlaceholder: "Type the client's answer..."
    },
    de: {
        dashboard: "Übersicht",
        posts: "Meine Beiträge",
        clients: "Kunden verwalten",
        newPost: "Neuer Inhalt",
        logout: "Abmelden",
        agencyProgress: "Agenturfortschritt",
        pipelineOverview: "Pipeline-Übersicht pro Kunde",
        drafts: "Ideen (Entwurf)",
        waiting: "Wartet auf Genehmigung",
        review: "In Überarbeitung",
        approved: "Genehmigt / Fertig",
        actions: "Aktionen",
        client: "Kunde",
        openPosts: "Beiträge öffnen",
        copyLink: "Link kopieren",
        loading: "Laden...",
        noClients: "Keine Kunden in der Pipeline registriert.",
        ideas: "Ideenbank",
        newQuestion: "Neue Frage",
        pendingQuestions: "Offene Fragen",
        answeredQuestions: "Beantwortet / Insights",
        save: "Speichern",
        cancel: "Abbrechen",
        delete: "Löschen",
        answer: "Antworten",
        questionPlaceholder: "Geben Sie die strategische Frage für den Kunden ein...",
        answerPlaceholder: "Geben Sie die Antwort des Kunden ein..."
    }
}

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('pt')

    const t = (key) => {
        return translations[language][key] || key
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export const useLanguage = () => useContext(LanguageContext)
