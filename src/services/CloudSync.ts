import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { CloudSyncConfig, NotebookDoc } from '../types';

const CONFIG_KEY = 'atelier_cloud_sync_v1';

export const SUPABASE_SETUP_SQL = `-- Copia y pega esto en Supabase -> SQL Editor -> Run
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

alter publication supabase_realtime add table public.atelier_documents;
alter table public.atelier_documents enable row level security;

drop policy if exists "atelier_docs_select" on public.atelier_documents;
create policy "atelier_docs_select" on public.atelier_documents for select using (true);

drop policy if exists "atelier_docs_insert" on public.atelier_documents;
create policy "atelier_docs_insert" on public.atelier_documents for insert with check (char_length(space_code) >= 3);

drop policy if exists "atelier_docs_update" on public.atelier_documents;
create policy "atelier_docs_update" on public.atelier_documents for update using (char_length(space_code) >= 3);

drop policy if exists "atelier_docs_delete" on public.atelier_documents;
create policy "atelier_docs_delete" on public.atelier_documents for delete using (char_length(space_code) >= 3);

insert into storage.buckets (id, name, public) values ('atelier-pdfs', 'atelier-pdfs', true) on conflict (id) do nothing;

drop policy if exists "atelier_pdfs_read" on storage.objects;
create policy "atelier_pdfs_read" on storage.objects for select using (bucket_id = 'atelier-pdfs');

drop policy if exists "atelier_pdfs_write" on storage.objects;
create policy "atelier_pdfs_write" on storage.objects for insert with check (bucket_id = 'atelier-pdfs');

drop policy if exists "atelier_pdfs_update" on storage.objects;
create policy "atelier_pdfs_update" on storage.objects for update using (bucket_id = 'atelier-pdfs');`;

interface RemoteRow {
  space_code: string;
  id: string;
  title: string;
  kind: 'notebook' | 'pdf';
  paper: NotebookDoc['paper'];
  page_count: number;
  pages: NotebookDoc['pages'];
  pdf_storage_path: string | null;
  updated_at: number;
}

class CloudSyncService {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private config: CloudSyncConfig;

  constructor() {
    this.config = this.loadConfig();
    if (this.isConfigured() && this.config.autoSync) {
      this.initClient();
    }
  }

  private loadConfig(): CloudSyncConfig {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CloudSyncConfig>;
        return {
          supabaseUrl: parsed.supabaseUrl ?? '',
          supabaseAnonKey: parsed.supabaseAnonKey ?? '',
          spaceCode: parsed.spaceCode || 'mi-espacio',
          autoSync: parsed.autoSync ?? true,
        };
      }
    } catch {
      // Ignore storage error
    }
    return {
      supabaseUrl: '',
      supabaseAnonKey: '',
      spaceCode: 'mi-espacio',
      autoSync: true,
    };
  }

  public getConfig(): CloudSyncConfig {
    return { ...this.config };
  }

  public isConfigured(): boolean {
    return Boolean(
      this.config.supabaseUrl.trim().startsWith('https://') &&
        this.config.supabaseAnonKey.trim().length > 20 &&
        this.config.spaceCode.trim().length >= 3
    );
  }

  public saveConfig(next: CloudSyncConfig): void {
    this.config = {
      supabaseUrl: next.supabaseUrl.trim().replace(/\/+$/, ''),
      supabaseAnonKey: next.supabaseAnonKey.trim(),
      spaceCode: next.spaceCode.trim().toLowerCase() || 'mi-espacio',
      autoSync: next.autoSync,
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
    this.disconnectRealtime();
    this.client = null;
    if (this.isConfigured()) {
      this.initClient();
    }
  }

  private initClient(): void {
    if (!this.isConfigured()) return;
    this.client = createClient(this.config.supabaseUrl, this.config.supabaseAnonKey);
  }

  private ensureClient(): SupabaseClient | null {
    if (!this.client && this.isConfigured()) {
      this.initClient();
    }
    return this.client;
  }

  public async testConnection(): Promise<{ ok: boolean; message: string }> {
    const client = this.ensureClient();
    if (!client) {
      return { ok: false, message: 'Completa URL, Anon Key y código de espacio (mín. 3 letras).' };
    }
    const { error } = await client
      .from('atelier_documents')
      .select('id')
      .eq('space_code', this.config.spaceCode)
      .limit(1);
    if (error) {
      return { ok: false, message: `Error de tabla o permisos: ${error.message}` };
    }
    return { ok: true, message: `Conectado en vivo al espacio «${this.config.spaceCode}».` };
  }

  public async pullAllNotebooks(): Promise<NotebookDoc[]> {
    const client = this.ensureClient();
    if (!client) return [];
    const { data, error } = await client
      .from('atelier_documents')
      .select('*')
      .eq('space_code', this.config.spaceCode);
    if (error || !data) return [];
    return (data as RemoteRow[]).map((r) => ({
      id: r.id,
      title: r.title,
      kind: r.kind,
      paper: r.paper,
      pageCount: r.page_count,
      pages: r.pages ?? {},
      pdfStoragePath: r.pdf_storage_path ?? undefined,
      updatedAt: Number(r.updated_at) || Date.now(),
    }));
  }

  public async pushNotebook(doc: NotebookDoc): Promise<boolean> {
    const client = this.ensureClient();
    if (!client || !this.config.autoSync) return false;
    const row: RemoteRow = {
      space_code: this.config.spaceCode,
      id: doc.id,
      title: doc.title,
      kind: doc.kind,
      paper: doc.paper,
      page_count: doc.pageCount,
      pages: doc.pages,
      pdf_storage_path: doc.pdfStoragePath ?? null,
      updated_at: doc.updatedAt,
    };
    const { error } = await client
      .from('atelier_documents')
      .upsert(row, { onConflict: 'space_code,id' });
    return !error;
  }

  public async deleteRemoteNotebook(id: string): Promise<void> {
    const client = this.ensureClient();
    if (!client || !this.config.autoSync) return;
    await client
      .from('atelier_documents')
      .delete()
      .eq('space_code', this.config.spaceCode)
      .eq('id', id);
  }

  public async uploadPdf(docId: string, bytes: ArrayBuffer): Promise<string | null> {
    const client = this.ensureClient();
    if (!client) return null;
    const path = `${this.config.spaceCode}/${docId}.pdf`;
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const { error } = await client.storage.from('atelier-pdfs').upload(path, blob, {
      contentType: 'application/pdf',
      upsert: true,
    });
    return error ? null : path;
  }

  public async downloadPdf(storagePath: string): Promise<ArrayBuffer | null> {
    const client = this.ensureClient();
    if (!client) return null;
    const { data, error } = await client.storage.from('atelier-pdfs').download(storagePath);
    if (error || !data) return null;
    return data.arrayBuffer();
  }

  public subscribeRealtime(
    onRemoteUpsert: (doc: NotebookDoc) => void,
    onRemoteDelete: (id: string) => void
  ): void {
    this.disconnectRealtime();
    const client = this.ensureClient();
    if (!client || !this.config.autoSync) return;

    this.channel = client
      .channel(`atelier-${this.config.spaceCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'atelier_documents',
          filter: `space_code=eq.${this.config.spaceCode}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as Partial<RemoteRow>;
            if (oldRow?.id) onRemoteDelete(oldRow.id);
            return;
          }
          const r = payload.new as RemoteRow;
          if (!r?.id) return;
          onRemoteUpsert({
            id: r.id,
            title: r.title,
            kind: r.kind,
            paper: r.paper,
            pageCount: r.page_count,
            pages: r.pages ?? {},
            pdfStoragePath: r.pdf_storage_path ?? undefined,
            updatedAt: Number(r.updated_at) || Date.now(),
          });
        }
      )
      .subscribe();
  }

  public disconnectRealtime(): void {
    if (this.channel && this.client) {
      void this.client.removeChannel(this.channel);
    }
    this.channel = null;
  }
}

export const cloudSync = new CloudSyncService();
