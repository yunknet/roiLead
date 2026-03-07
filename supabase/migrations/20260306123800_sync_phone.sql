-- 1. Cria a função invisível que sincroniza os telefones (com poder de contornar amarras)
CREATE OR REPLACE FUNCTION sync_phone_to_subscriptions()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.phone_number IS DISTINCT FROM OLD.phone_number THEN
    UPDATE public.subscriptions
    SET phone_number = NEW.phone_number
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Derruba o gatilho se ele já existir (para evitar dor de cabeça do postgres)
DROP TRIGGER IF EXISTS trg_sync_phone_to_subscriptions ON public.profiles;

-- 3. Instala o gatilho. Toda vez que profile mudar, ele repete no subscription!
CREATE TRIGGER trg_sync_phone_to_subscriptions
AFTER UPDATE OF phone_number ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION sync_phone_to_subscriptions();
