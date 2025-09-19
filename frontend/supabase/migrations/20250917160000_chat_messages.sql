-- Create chat messages table for assistant Q/A
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  model text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.chat_messages enable row level security;

-- Policies: users can CRUD only their own messages
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'Users can view their own chat messages'
  ) then
    create policy "Users can view their own chat messages"
      on public.chat_messages
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'Users can insert their own chat messages'
  ) then
    create policy "Users can insert their own chat messages"
      on public.chat_messages
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'Users can update their own chat messages'
  ) then
    create policy "Users can update their own chat messages"
      on public.chat_messages
      for update
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'Users can delete their own chat messages'
  ) then
    create policy "Users can delete their own chat messages"
      on public.chat_messages
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- Indexes
create index if not exists idx_chat_messages_user_date on public.chat_messages(user_id, created_at desc);
