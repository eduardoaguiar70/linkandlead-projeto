# Link&Lead - Arquitetura de Sistema

## 🧠 Módulo de Inteligência & Automação (Intelligence Module)

Este documento detalha a arquitetura do "Inbox Inteligente" e "Análise de Sentimento", descrevendo a estrutura de dados, fluxos de automação e regras visuais.

### 1. Estrutura de Dados (Novas Colunas)

A tabela `leads` foi enriquecida com campos de inteligência artificial. O Frontend deve consumir estes dados preferencialmente através de JOINs ou Views atualizadas.

| Coluna | Tipo | Descrição e Regras |
| :--- | :--- | :--- |
| `trust_score` | `Integer` | **Mede a probabilidade de conversão (0-100).**<br>• **0-20:** Crítico/Hostil<br>• **21-40:** Frio/Desinteressado<br>• **41-60:** Neutro<br>• **61-80:** Engajado<br>• **81-100:** Quente (Sinais de compra) |
| `sentiment_reasoning` | `Text` | Explicação curta da IA sobre o porquê da nota do Trust Score (ex: "Lead pediu reunião"). |
| `icp_reason` | `Text` | Justificativa da classificação de perfil (A/B/C). |
| `conversation_summary` | `Text` | Breve resumo do contexto da negociação até o momento. |
| `ai_suggested_replies` | `JSONB` | Array de objetos para sugestão de resposta.<br>**Schema:** `[{ "text":String, "strategy":String }]`<br>**Uso:** `text` vai para editor, `strategy` aparece como label. |
| `ready_for_analysis` | `Boolean` | Flag de controle de fila. `TRUE` = Lead precisa ser processado pela IA. |

### 2. Arquitetura de Automação Híbrida (Triggers)

O sistema utiliza uma abordagem híbrida (Reativa + Proativa) para manter os dados atualizados com baixo custo de tokens.

#### A. Controle de Fila (`ready_for_analysis`)
O campo booleano `ready_for_analysis` na tabela `leads` atua como um "cursor de fila".
- **TRUE:** O lead aguarda processamento da IA.
- **FALSE:** O lead está atualizado.

#### B. Workflow 5: O Analista (Processador)
- **Função:** Consome a fila, analisa o histórico do chat via OpenAI, gera Insights/Scores e limpa a fila.
- **Lógica:** Roda a cada 15/30min → Pega leads (`ready=true`) → Processa → Seta `ready=false`.
- **Output:** Atualiza `trust_score`, `ai_suggested_replies`, etc.

#### C. Workflow 3: Sync Mensagens (Gatilho Reativo)
- **Função:** Detecta mensagens novas em tempo real.
- **Lógica:** Sempre que uma mensagem (sent/received) é salva no banco, este workflow força `ready_for_analysis = true` imediatamente.
- **Objetivo:** Garantir resposta rápida da IA em conversas ativas.

#### D. Workflow 6: O Vigia (Gatilho Proativo/Time-Decay)
- **Função:** Re-engajamento de leads esquecidos (Ghosting).
- **Lógica:** Roda via Cron (Diário 00:00). Executa query SQL para encontrar leads que:
  1. Não estão na fila (`ready=false`);
  2. Estão em silêncio há > 7 dias;
  3. Possuem Score > 30 (Lead qualificado);
  4. Pipeline em aberto (Não é Lost/Won).
- **Ação:** Seta `ready_for_analysis = true` para que o Workflow 5 gere uma estratégia de recuperação na manhã seguinte.

### 3. Mapeamento Visual (Frontend - Kanban)

A visualização de lista deve ser tratada como um Kanban de Prioridades baseada nos dados acima:

#### Colunas Prioritárias
1. **🔥 Prioridade Alta:** `trust_score > 70` **OU** `Tier A`.
2. **📩 Para Responder:** `last_interaction_type = 'received'` (Ordenado por data).
3. **⏳ Aguardando:** `last_interaction_type = 'sent'`.
4. **💤 Stand-by:** `trust_score < 40` **OU** Sem interação > 7 dias.

#### Componente "Smart Action"
- Deve exibir a sugestão de resposta (`item.text`) acompanhada obrigatoriamente da sua estratégia (`item.strategy`) para dar contexto ao usuário antes do envio.
