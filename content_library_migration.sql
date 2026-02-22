-- Create the content_library table
CREATE TABLE IF NOT EXISTS public.content_library (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_name TEXT NOT NULL,
    content_description TEXT,
    content_url TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('Video', 'Post', 'Artigo', 'Outro')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Create policy to allow users to ONLY select their own content
CREATE POLICY "Users can view own content" ON public.content_library
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to ONLY insert their own content
CREATE POLICY "Users can insert own content" ON public.content_library
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to ONLY update their own content
CREATE POLICY "Users can update own content" ON public.content_library
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to ONLY delete their own content
CREATE POLICY "Users can delete own content" ON public.content_library
    FOR DELETE USING (auth.uid() = user_id);

-- Grant access to authenticated users
GRANT ALL ON TABLE public.content_library TO authenticated;
GRANT ALL ON TABLE public.content_library TO service_role;
