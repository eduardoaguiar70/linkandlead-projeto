-- ============================================================
-- SECURE PUBLIC ACCESS RPCs (POST FEEDBACK & PORTAL)
-- ============================================================

-- 1. RPC: get_public_post_details
-- Fetches post content and its comments safely.
CREATE OR REPLACE FUNCTION public.get_public_post_details(p_post_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_post JSONB;
    v_comments JSONB;
BEGIN
    -- 1. Fetch Post
    SELECT row_to_json(p)::jsonb INTO v_post
    FROM public.tabela_projetofred1 p
    WHERE id = p_post_id;

    IF v_post IS NULL THEN
        RETURN jsonb_build_object('error', 'Post not found.');
    END IF;

    -- 2. Fetch Comments
    SELECT jsonb_agg(c) INTO v_comments
    FROM (
        SELECT *
        FROM public.post_comments
        WHERE post_id = p_post_id
        ORDER BY created_at ASC
    ) c;

    RETURN jsonb_build_object(
        'post', v_post,
        'comments', COALESCE(v_comments, '[]'::jsonb)
    );
END;
$$;

-- 2. RPC: update_public_post
-- Allows public/magic link users to update status or image.
CREATE OR REPLACE FUNCTION public.update_public_post(
    p_post_id BIGINT,
    p_status TEXT DEFAULT NULL,
    p_feedback TEXT DEFAULT NULL,
    p_image_array TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.tabela_projetofred1
    SET 
        status = COALESCE(p_status, status),
        feedback_cliente = COALESCE(p_feedback, feedback_cliente),
        sugestao_imagem = COALESCE(p_image_array, sugestao_imagem)
    WHERE id = p_post_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 3. RPC: add_public_comment
-- Allows public/magic link users to add comments.
CREATE OR REPLACE FUNCTION public.add_public_comment(
    p_post_id BIGINT,
    p_content TEXT,
    p_author_name TEXT,
    p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.post_comments (post_id, content, author_name, role)
    VALUES (p_post_id, p_content, p_author_name, p_role);

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.get_public_post_details(BIGINT) IS 'Safe fetch for unauthenticated post feedback page.';
COMMENT ON FUNCTION public.update_public_post(BIGINT, TEXT, TEXT, TEXT[]) IS 'Safe update for post status/content from public portal.';
COMMENT ON FUNCTION public.add_public_comment(BIGINT, TEXT, TEXT, TEXT) IS 'Safe comment insertion for unauthenticated users.';
