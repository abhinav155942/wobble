CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;


--
-- Name: update_conversation_title(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_conversation_title() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update conversation title with first user message if title is null
  IF NEW.role = 'user' THEN
    UPDATE conversations
    SET title = LEFT(NEW.content, 50)
    WHERE id = NEW.conversation_id
    AND title IS NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: agent_memories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_memories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    user_id uuid NOT NULL,
    conversation_id uuid,
    content text NOT NULL,
    summary text,
    importance_score double precision DEFAULT 0.5,
    memory_type text DEFAULT 'conversation'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    accessed_at timestamp with time zone DEFAULT now(),
    access_count integer DEFAULT 0
);


--
-- Name: agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    system_prompt text,
    knowledge_base_config jsonb DEFAULT '{}'::jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    user_id uuid NOT NULL,
    title text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: execution_traces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.execution_traces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    message_id uuid,
    step_number integer NOT NULL,
    step_type text NOT NULL,
    step_name text NOT NULL,
    step_description text,
    status text DEFAULT 'pending'::text,
    input_data jsonb,
    output_data jsonb,
    error_message text,
    duration_ms integer,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: knowledge_base; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_base (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    url text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT knowledge_base_type_check CHECK ((type = ANY (ARRAY['document'::text, 'url'::text, 'faq'::text])))
);


--
-- Name: message_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    rating integer,
    feedback_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    response_time_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text,
    full_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prompt_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    system_prompt text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL
);


--
-- Name: agent_memories agent_memories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memories
    ADD CONSTRAINT agent_memories_pkey PRIMARY KEY (id);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: execution_traces execution_traces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.execution_traces
    ADD CONSTRAINT execution_traces_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base knowledge_base_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_pkey PRIMARY KEY (id);


--
-- Name: message_feedback message_feedback_message_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_feedback
    ADD CONSTRAINT message_feedback_message_id_key UNIQUE (message_id);


--
-- Name: message_feedback message_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_feedback
    ADD CONSTRAINT message_feedback_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: prompt_versions prompt_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_versions
    ADD CONSTRAINT prompt_versions_pkey PRIMARY KEY (id);


--
-- Name: agent_memories_agent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_memories_agent_id_idx ON public.agent_memories USING btree (agent_id);


--
-- Name: agent_memories_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_memories_user_id_idx ON public.agent_memories USING btree (user_id);


--
-- Name: execution_traces_conversation_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX execution_traces_conversation_id_idx ON public.execution_traces USING btree (conversation_id);


--
-- Name: execution_traces_message_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX execution_traces_message_id_idx ON public.execution_traces USING btree (message_id);


--
-- Name: idx_conversations_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_agent_id ON public.conversations USING btree (agent_id);


--
-- Name: idx_conversations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_user_id ON public.conversations USING btree (user_id);


--
-- Name: idx_knowledge_base_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_agent_id ON public.knowledge_base USING btree (agent_id);


--
-- Name: idx_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);


--
-- Name: idx_prompt_versions_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_versions_agent_id ON public.prompt_versions USING btree (agent_id);


--
-- Name: idx_prompt_versions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_versions_created_at ON public.prompt_versions USING btree (created_at DESC);


--
-- Name: messages set_conversation_title; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_conversation_title AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_title();


--
-- Name: agents update_agents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: conversations update_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: knowledge_base update_knowledge_base_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON public.knowledge_base FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_memories agent_memories_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memories
    ADD CONSTRAINT agent_memories_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_memories agent_memories_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memories
    ADD CONSTRAINT agent_memories_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: execution_traces execution_traces_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.execution_traces
    ADD CONSTRAINT execution_traces_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: execution_traces execution_traces_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.execution_traces
    ADD CONSTRAINT execution_traces_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: knowledge_base knowledge_base_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: message_feedback message_feedback_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_feedback
    ADD CONSTRAINT message_feedback_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: prompt_versions prompt_versions_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_versions
    ADD CONSTRAINT prompt_versions_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: message_feedback Users can create feedback on their messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create feedback on their messages" ON public.message_feedback FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.messages m
     JOIN public.conversations c ON ((c.id = m.conversation_id)))
  WHERE ((m.id = message_feedback.message_id) AND (c.user_id = auth.uid())))));


--
-- Name: knowledge_base Users can create knowledge base for their agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create knowledge base for their agents" ON public.knowledge_base FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = knowledge_base.agent_id) AND (agents.user_id = auth.uid())))));


--
-- Name: agent_memories Users can create memories for their agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create memories for their agents" ON public.agent_memories FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = agent_memories.agent_id) AND (agents.user_id = auth.uid())))));


--
-- Name: messages Users can create messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create messages in their conversations" ON public.messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = messages.conversation_id) AND (conversations.user_id = auth.uid())))));


--
-- Name: prompt_versions Users can create prompt versions for their agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create prompt versions for their agents" ON public.prompt_versions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = prompt_versions.agent_id) AND (agents.user_id = auth.uid())))));


--
-- Name: agents Users can create their own agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own agents" ON public.agents FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: conversations Users can create their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own conversations" ON public.conversations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: execution_traces Users can create traces for their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create traces for their conversations" ON public.execution_traces FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = execution_traces.conversation_id) AND (conversations.user_id = auth.uid())))));


--
-- Name: knowledge_base Users can delete knowledge base for their agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete knowledge base for their agents" ON public.knowledge_base FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = knowledge_base.agent_id) AND (agents.user_id = auth.uid())))));


--
-- Name: agent_memories Users can delete memories for their agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete memories for their agents" ON public.agent_memories FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = agent_memories.agent_id) AND (agents.user_id = auth.uid())))));


--
-- Name: agents Users can delete their own agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own agents" ON public.agents FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: conversations Users can delete their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own conversations" ON public.conversations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: knowledge_base Users can update knowledge base for their agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update knowledge base for their agents" ON public.knowledge_base FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = knowledge_base.agent_id) AND (agents.user_id = auth.uid())))));


--
-- Name: agent_memories Users can update memories for their agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update memories for their agents" ON public.agent_memories FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = agent_memories.agent_id) AND (agents.user_id = auth.uid())))));


--
-- Name: agents Users can update their own agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own agents" ON public.agents FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: conversations Users can update their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own conversations" ON public.conversations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: message_feedback Users can view feedback on their messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view feedback on their messages" ON public.message_feedback FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.messages m
     JOIN public.conversations c ON ((c.id = m.conversation_id)))
  WHERE ((m.id = message_feedback.message_id) AND (c.user_id = auth.uid())))));


--
-- Name: knowledge_base Users can view knowledge base for their agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view knowledge base for their agents" ON public.knowledge_base FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = knowledge_base.agent_id) AND (agents.user_id = auth.uid())))));


--
-- Name: agent_memories Users can view memories for their agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view memories for their agents" ON public.agent_memories FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = agent_memories.agent_id) AND (agents.user_id = auth.uid())))));


--
-- Name: messages Users can view messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = messages.conversation_id) AND (conversations.user_id = auth.uid())))));


--
-- Name: prompt_versions Users can view prompt versions for their agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view prompt versions for their agents" ON public.prompt_versions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = prompt_versions.agent_id) AND (agents.user_id = auth.uid())))));


--
-- Name: agents Users can view their own agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own agents" ON public.agents FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: conversations Users can view their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own conversations" ON public.conversations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: execution_traces Users can view traces for their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view traces for their conversations" ON public.execution_traces FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = execution_traces.conversation_id) AND (conversations.user_id = auth.uid())))));


--
-- Name: agent_memories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

--
-- Name: agents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: execution_traces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.execution_traces ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_base; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

--
-- Name: message_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


