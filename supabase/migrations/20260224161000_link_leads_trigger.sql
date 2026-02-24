-- Trigger para vincular automaticamente o user_id em novos lead_requests
-- Isso garante que leads gerados via WhatsApp Bot (que só envia o telefone)
-- sejam visíveis no Dashboard do usuário, já que a RLS agora exige user_id.

CREATE OR REPLACE FUNCTION public.link_lead_request_to_user()
RETURNS TRIGGER AS $$
DECLARE
    found_user_id UUID;
BEGIN
    -- Se o user_id já existir (vindo do site), não faz nada
    IF NEW.user_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Tenta encontrar o user_id pelo telefone no perfil (normalizado)
    SELECT id INTO found_user_id 
    FROM public.profiles 
    WHERE public.normalize_phone(phone_number) = public.normalize_phone(NEW.phone_number)
    LIMIT 1;

    -- Se encontrou, vincula
    IF found_user_id IS NOT NULL THEN
        NEW.user_id := found_user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_link_lead_request_to_user ON public.lead_requests;
CREATE TRIGGER trg_link_lead_request_to_user
BEFORE INSERT ON public.lead_requests
FOR EACH ROW
EXECUTE FUNCTION public.link_lead_request_to_user();
