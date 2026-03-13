-- Migration to add instance_name column to ai_agents table
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS instance_name TEXT;
