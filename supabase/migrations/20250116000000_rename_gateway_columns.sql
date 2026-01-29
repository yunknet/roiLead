ALTER TABLE public.subscriptions
RENAME COLUMN kiwify_order_id TO gateway_order_id;

ALTER TABLE public.subscriptions
RENAME COLUMN kiwify_status TO gateway_status;
