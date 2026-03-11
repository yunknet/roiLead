-- Migration: Update User Email
-- Creates a function to handle email updates natively while changing auth.users securely
-- and limits the changes to 15 days.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_email_update TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.change_user_email(new_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_last_update TIMESTAMPTZ;
  v_old_email TEXT;
BEGIN
  -- 1. Obter o ID do usuário autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- 2. Validar formato básico do e-mail
  IF new_email IS NULL OR new_email = '' OR new_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Formato de e-mail inválido';
  END IF;
  
  new_email := lower(trim(new_email));

  -- 3. Verificar se o e-mail já está em uso
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email AND id != v_user_id) THEN
    RAISE EXCEPTION 'Este e-mail já está em uso por outro usuário.';
  END IF;

  -- 4. Obter o e-mail antigo
  SELECT email, last_email_update INTO v_old_email, v_last_update
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_old_email = new_email THEN
    RETURN;
  END IF;

  -- 5. Regra de 15 dias
  IF v_last_update IS NOT NULL AND (now() - v_last_update) < interval '15 days' THEN
    RAISE EXCEPTION 'O e-mail só pode ser alterado uma vez a cada 15 dias.';
  END IF;

  -- 6. Atualizar auth.users
  UPDATE auth.users
  SET email = new_email,
      email_confirmed_at = now(),
      updated_at = now()
  WHERE id = v_user_id;

  -- 7. Atualizar profiles
  UPDATE public.profiles
  SET email = new_email,
      last_email_update = now(),
      updated_at = now()
  WHERE id = v_user_id;

  -- 8. Atualizar subscriptions
  IF v_old_email IS NOT NULL THEN
    UPDATE public.subscriptions
    SET email = new_email
    WHERE email = v_old_email;
  END IF;
  
END;
$$;

-- Permissões para que o security definer consiga rodar como criador (postgres)
ALTER FUNCTION public.change_user_email(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.change_user_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_user_email(text) TO authenticated;
