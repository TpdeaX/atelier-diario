-- =====================================================================
-- Ecosistema Atelier (Atelier Diario + UNUmbral + OMNI ARENA)
-- Script idempotente para Supabase (Gratis)
-- Copia y pega este script completo en: Supabase -> SQL Editor -> Run
-- =====================================================================

-- 1. Tabla de cuadernos digitales y anotaciones sobre PDFs
create table if not exists public.atelier_documents (
  space_code text not null,
  id text not null,
  title text not null,
  kind text not null default 'notebook',
  paper text not null default 'dotted',
  page_count integer not null default 1,
  pages jsonb not null default '{}'::jsonb,
  pdf_storage_path text,
  updated_at bigint not null,
  primary key (space_code, id)
);

-- 2. Tabla unificada de estado y configuraciones de todo el ecosistema
--    Scopes: 'directory_config' | 'atelier_profile' | 'unumbral_backup' | 'arena_profile'
create table if not exists public.ecosystem_state (
  space_code text not null,
  scope text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at bigint not null,
  primary key (space_code, scope)
);

-- 3. Habilitar sincronización en vivo (Realtime) de forma segura e idempotente
do $$
begin
  alter publication supabase_realtime add table public.atelier_documents;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.ecosystem_state;
exception when duplicate_object then null;
end $$;

-- 4. Seguridad RLS por código de espacio compartido (mínimo 3 caracteres)
alter table public.atelier_documents enable row level security;

drop policy if exists "atelier_docs_select" on public.atelier_documents;
create policy "atelier_docs_select" on public.atelier_documents
  for select using (true);

drop policy if exists "atelier_docs_insert" on public.atelier_documents;
create policy "atelier_docs_insert" on public.atelier_documents
  for insert with check (char_length(space_code) >= 3);

drop policy if exists "atelier_docs_update" on public.atelier_documents;
create policy "atelier_docs_update" on public.atelier_documents
  for update using (char_length(space_code) >= 3);

drop policy if exists "atelier_docs_delete" on public.atelier_documents;
create policy "atelier_docs_delete" on public.atelier_documents
  for delete using (char_length(space_code) >= 3);

alter table public.ecosystem_state enable row level security;

drop policy if exists "eco_state_select" on public.ecosystem_state;
create policy "eco_state_select" on public.ecosystem_state
  for select using (true);

drop policy if exists "eco_state_insert" on public.ecosystem_state;
create policy "eco_state_insert" on public.ecosystem_state
  for insert with check (char_length(space_code) >= 3);

drop policy if exists "eco_state_update" on public.ecosystem_state;
create policy "eco_state_update" on public.ecosystem_state
  for update using (char_length(space_code) >= 3);

drop policy if exists "eco_state_delete" on public.ecosystem_state;
create policy "eco_state_delete" on public.ecosystem_state
  for delete using (char_length(space_code) >= 3);

-- 5. Bucket de Storage para archivos PDF sincronizados entre dispositivos
insert into storage.buckets (id, name, public)
values ('atelier-pdfs', 'atelier-pdfs', true)
on conflict (id) do nothing;

drop policy if exists "atelier_pdfs_read" on storage.objects;
create policy "atelier_pdfs_read" on storage.objects
  for select using (bucket_id = 'atelier-pdfs');

drop policy if exists "atelier_pdfs_write" on storage.objects;
create policy "atelier_pdfs_write" on storage.objects
  for insert with check (bucket_id = 'atelier-pdfs');

drop policy if exists "atelier_pdfs_update" on storage.objects;
create policy "atelier_pdfs_update" on storage.objects
  for update using (bucket_id = 'atelier-pdfs');

drop policy if exists "atelier_pdfs_delete" on storage.objects;
create policy "atelier_pdfs_delete" on storage.objects
  for delete using (bucket_id = 'atelier-pdfs');
