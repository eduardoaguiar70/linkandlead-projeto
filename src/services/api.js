
export const generateContent = async (cliente, tema, publico, clientData = null, imageUrl = null) => {
    try {
        // Construct rich payload with briefing data if available
        const payload = {
            cliente,
            tema,
            publico,
            imageUrl, // Pass the uploaded image URL
            // If clientData exists, inject its fields
            ...(clientData && {
                clientId: clientData.id, // Explicit ID for DB relation
                resumo_negocio: clientData.description,
                tom_de_voz: clientData.tone_of_voice,
                dores: clientData.pain_points
            })
        }

        const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/create-post-workflow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) {
            throw new Error('Erro ao gerar conteúdo')
        }

        return await response.json()
    } catch (error) {
        console.error('Error generating content:', error)
        throw error
    }
}
