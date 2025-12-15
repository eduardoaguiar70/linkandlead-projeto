import React, { createContext, useState, useContext } from 'react'

const LanguageContext = createContext()

const translations = {
    pt: {
        dashboard: "Visão Geral",
        posts: "Meus Posts",
        clients: "Gerenciar Clientes",
        newPost: "Novo Conteúdo",
        logout: "Sair",
        agencyProgress: "Progresso da Agência",
        pipelineOverview: "Visão geral do pipeline por cliente",
        drafts: "Ideias (Draft)",
        waiting: "Aguardando Aprovação",
        review: "Em Revisão",
        approved: "Aprovados / Prontos",
        actions: "Ações",
        client: "Cliente",
        openPosts: "Abrir Posts",
        copyLink: "Copiar Link",
        loading: "Carregando...",
        noClients: "Nenhum cliente cadastrado no pipeline.",
        ideas: "Banco de Ideias",
        newQuestion: "Nova Pergunta",
        pendingQuestions: "Perguntas Pendentes",
        answeredQuestions: "Respondidas / Insights",
        save: "Salvar",
        cancel: "Cancelar",
        delete: "Excluir",
        answer: "Responder",
        questionPlaceholder: "Digite a pergunta estratégica para o cliente...",
        answerPlaceholder: "Digite a resposta do cliente..."
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
