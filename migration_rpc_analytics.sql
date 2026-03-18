-- migration_rpc_analytics.sql

DROP FUNCTION IF EXISTS get_analytics_payload(uuid[], timestamptz);
DROP FUNCTION IF EXISTS get_team_leaderboard(uuid[], timestamptz);
DROP FUNCTION IF EXISTS get_analytics_payload(bigint[], timestamptz);
DROP FUNCTION IF EXISTS get_team_leaderboard(bigint[], timestamptz);

-- 1. Cria a função geral para Dashboard e Analytics Pessoal
CREATE OR REPLACE FUNCTION get_analytics_payload(
    p_client_ids TEXT[],
    p_after_date TIMESTAMPTZ DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_stats JSON;
BEGIN
    WITH lead_pool AS (
        SELECT id, client_id, icp_score, has_engaged, call_status
        FROM leads
        WHERE client_id = ANY(p_client_ids)
          AND is_blacklisted = false
    ),
    first_messages AS (
        SELECT
            i.lead_id,
            MIN(CASE WHEN i.is_sender = false THEN i.interaction_date END) AS first_received_date,
            MIN(CASE WHEN i.is_sender = true AND LENGTH(TRIM(COALESCE(i.content, ''))) >= 10 THEN i.interaction_date END) AS first_real_sent_date
        FROM interactions i
        WHERE i.lead_id IN (SELECT id FROM lead_pool)
        GROUP BY i.lead_id
    ),
    prospects AS (
        SELECT fm.lead_id, fm.first_real_sent_date
        FROM first_messages fm
        WHERE fm.first_real_sent_date IS NOT NULL
          AND (fm.first_received_date IS NULL OR fm.first_received_date >= fm.first_real_sent_date)
          AND (p_after_date IS NULL OR fm.first_real_sent_date >= p_after_date)
    ),
    chart_data AS (
        SELECT TO_CHAR(first_real_sent_date AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date_key, COUNT(*) AS count
        FROM prospects
        GROUP BY 1
    )
    SELECT json_build_object(
        'prospeccoes', (SELECT COUNT(*) FROM prospects),
        'mensagens', (
            SELECT COUNT(*) 
            FROM interactions i 
            WHERE i.lead_id IN (SELECT id FROM lead_pool)
              AND i.is_sender = true 
              AND (p_after_date IS NULL OR i.interaction_date >= p_after_date)
        ),
        'calls', (SELECT COUNT(*) FROM lead_pool WHERE call_status IN ('scheduled', 'completed')),
        'engajados_prospectados', (SELECT COUNT(*) FROM prospects p JOIN lead_pool lp ON lp.id = p.lead_id WHERE lp.has_engaged = true),
        'icp_sem_contato', (
            SELECT COUNT(*) FROM lead_pool lp
            WHERE lp.icp_score = 'A' 
              AND NOT EXISTS (SELECT 1 FROM interactions i WHERE i.lead_id = lp.id)
        ),
        'chart', (
            SELECT COALESCE(json_object_agg(date_key, count), '{}'::json)
            FROM chart_data
        )
    ) INTO v_stats;

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Cria a função que retorna o Leaderboard do Team Dashboard
CREATE OR REPLACE FUNCTION get_team_leaderboard(
    p_client_ids TEXT[],
    p_after_date TIMESTAMPTZ DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_leaderboard JSON;
BEGIN
    WITH lead_pool AS (
        SELECT id, client_id, call_status, has_engaged
        FROM leads
        WHERE client_id = ANY(p_client_ids)
          AND is_blacklisted = false
    ),
    first_messages AS (
        SELECT
            i.lead_id,
            MIN(CASE WHEN i.is_sender = false THEN i.interaction_date END) AS first_received_date,
            MIN(CASE WHEN i.is_sender = true AND LENGTH(TRIM(COALESCE(i.content, ''))) >= 10 THEN i.interaction_date END) AS first_real_sent_date
        FROM interactions i
        WHERE i.lead_id IN (SELECT id FROM lead_pool)
        GROUP BY i.lead_id
    ),
    prospects AS (
        SELECT fm.lead_id
        FROM first_messages fm
        WHERE fm.first_real_sent_date IS NOT NULL
          AND (fm.first_received_date IS NULL OR fm.first_received_date >= fm.first_real_sent_date)
          AND (p_after_date IS NULL OR fm.first_real_sent_date >= p_after_date)
    ),
    client_stats AS (
        SELECT 
            lp.client_id,
            COUNT(DISTINCT p.lead_id) AS prospeccoes,
            COUNT(DISTINCT CASE WHEN lp.call_status IN ('scheduled', 'completed') THEN lp.id END) AS calls,
            COUNT(DISTINCT CASE WHEN p.lead_id IS NOT NULL AND lp.has_engaged = true THEN p.lead_id END) AS engajados_prospectados
        FROM lead_pool lp
        LEFT JOIN prospects p ON p.lead_id = lp.id
        GROUP BY lp.client_id
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'client_id', client_id,
            'prospeccoes', prospeccoes,
            'calls', calls,
            'engajados_prospectados', engajados_prospectados
        )
    ), '[]'::json) INTO v_leaderboard
    FROM client_stats;

    RETURN v_leaderboard;
END;
$$ LANGUAGE plpgsql STABLE;
