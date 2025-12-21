-- Allow users to view their own subscription details based on their Auth email
-- This is necessary for the Dashboard to verify subscription status
alter table public.subscriptions enable row level security;

drop policy if exists "Users can view own subscription via email" on public.subscriptions;

create policy "Users can view own subscription via email"
on public.subscriptions
for select
using (
  email = (select auth.jwt() ->> 'email')
);
