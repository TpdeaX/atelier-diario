-- =====================================================================
-- Atelier Diario — Script de configuración para Supabase (Gratis)
-- Copia y pega este script completo en: Supabase -> SQL Editor -> Run
-- =====================================================================

-- 1. Tabla de cuadernos y anotaciones sobre PDFs
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

-- 2. Habilitar sincronización en vivo (Realtime)
alter publication supabase_realtime add table public.atelier_documents;

-- 3. Seguridad básica para acceso desde GitHub Pages con tu código de sala
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

-- 4. Bucket de Storage para guardar tus archivos PDF entre PC, laptop y celular
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
