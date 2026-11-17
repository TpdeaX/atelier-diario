import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { CloudSyncConfig, EcosystemScope, NotebookDoc } from '../types';

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

create table if not exists public.ecosystem_state (
  space_code text not null,
  scope text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at bigint not null,
  primary key (space_code, scope)
);

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

alter table public.atelier_documents enable row level security;
drop policy if exists "atelier_docs_select" on public.atelier_documents;
create policy "atelier_docs_select" on public.atelier_documents for select using (true);
drop policy if exists "atelier_docs_insert" on public.atelier_documents;
create policy "atelier_docs_insert" on public.atelier_documents for insert with check (char_length(space_code) >= 3);
drop policy if exists "atelier_docs_update" on public.atelier_documents;
create policy "atelier_docs_update" on public.atelier_documents for update using (char_length(space_code) >= 3);
drop policy if exists "atelier_docs_delete" on public.atelier_documents;
create policy "atelier_docs_delete" on public.atelier_documents for delete using (char_length(space_code) >= 3);

alter table public.ecosystem_state enable row level security;
drop policy if exists "eco_state_select" on public.ecosystem_state;
create policy "eco_state_select" on public.ecosystem_state for select using (true);
drop policy if exists "eco_state_insert" on public.ecosystem_state;
create policy "eco_state_insert" on public.ecosystem_state for insert with check (char_length(space_code) >= 3);
drop policy if exists "eco_state_update" on public.ecosystem_state;
create policy "eco_state_update" on public.ecosystem_state for update using (char_length(space_code) >= 3);
drop policy if exists "eco_state_delete" on public.ecosystem_state;
create policy "eco_state_delete" on public.ecosystem_state for delete using (char_length(space_code) >= 3);

insert into storage.buckets (id, name, public) values ('atelier-pdfs', 'atelier-pdfs', true) on conflict (id) do nothing;
drop policy if exists "atelier_pdfs_read" on storage.objects;
create policy "atelier_pdfs_read" on storage.objects for select using (bucket_id = 'atelier-pdfs');
drop policy if exists "atelier_pdfs_write" on storage.objects;
create policy "atelier_pdfs_write" on storage.objects for insert with check (bucket_id = 'atelier-pdfs');
drop policy if exists "atelier_pdfs_update" on storage.objects;
create policy "atelier_pdfs_update" on storage.objects for update using (bucket_id = 'atelier-pdfs');
drop policy if exists "atelier_pdfs_delete" on storage.objects;
create policy "atelier_pdfs_delete" on storage.objects for delete using (bucket_id = 'atelier-pdfs');`;

/** Accepts the API URL, a dashboard URL, or a bare project ref and returns https://<ref>.supabase.co */
export function normalizeSupabaseUrl(input: string): string {
  const raw = input.trim().replace(/\/+$/, '');
  const dash = raw.match(/supabase\.com\/dashboard\/project\/([a-z0-9]{15,})/i);
  if (dash) return `https://${dash[1].toLowerCase()}.supabase.co`;
  if (/^[a-z0-9]{15,}$/i.test(raw)) return `https://${raw.toLowerCase()}.supabase.co`;
  const api = raw.match(/^(https:\/\/[a-z0-9-]+\.supabase\.co)/i);
  if (api) return api[1].toLowerCase();
  return raw;
}

interface RemoteDocRow {
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

export interface RemoteScopeRow<T = unknown> {
  space_code: string;
  scope: EcosystemScope;
  payload: T;
  updated_at: number;
}

export type ScopeListener = (scope: EcosystemScope, payload: unknown, updatedAt: number) => void;

class CloudSyncService {
  private client: SupabaseClient | null = null;
  private docsChannel: RealtimeChannel | null = null;
  private ecoChannel: RealtimeChannel | null = null;
  private config: CloudSyncConfig;
  private statusListeners = new Set<() => void>();
  private scopeListeners = new Set<ScopeListener>();
  private lastSyncAt = 0;
  private lastSyncError = '';

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
          supabaseUrl: normalizeSupabaseUrl(parsed.supabaseUrl ?? ''),
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

  public onStatusChange(fn: () => void): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private emitStatus(): void {
    this.statusListeners.forEach((fn) => fn());
  }

  public onScopeUpdate(fn: ScopeListener): () => void {
    this.scopeListeners.add(fn);
    return () => this.scopeListeners.delete(fn);
  }

  public getConfig(): CloudSyncConfig {
    return { ...this.config };
  }

  public getSyncMeta(): { configured: boolean; autoSync: boolean; spaceCode: string; lastSyncAt: number; lastError: string } {
    return {
      configured: this.isConfigured(),
      autoSync: this.config.autoSync,
      spaceCode: this.config.spaceCode,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastSyncError,
    };
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
      supabaseUrl: normalizeSupabaseUrl(next.supabaseUrl),
      supabaseAnonKey: next.supabaseAnonKey.trim(),
      spaceCode: next.spaceCode.trim().toLowerCase() || 'mi-espacio',
      autoSync: next.autoSync,
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
    this.disconnectAllRealtime();
    this.client = null;
    this.lastSyncError = '';
    if (this.isConfigured()) {
      this.initClient();
    }
    this.emitStatus();
  }

  public exportConfigToken(): string {
    return JSON.stringify({
      tipo: 'atelier-cloud-config',
      supabaseUrl: this.config.supabaseUrl,
      supabaseAnonKey: this.config.supabaseAnonKey,
      spaceCode: this.config.spaceCode,
      autoSync: this.config.autoSync,
    });
  }

  public importConfigToken(raw: string): boolean {
    try {
      const parsed = JSON.parse(raw.trim()) as Partial<CloudSyncConfig>;
      if (!parsed.supabaseUrl || !parsed.supabaseAnonKey) return false;
      this.saveConfig({
        supabaseUrl: parsed.supabaseUrl,
        supabaseAnonKey: parsed.supabaseAnonKey,
        spaceCode: parsed.spaceCode || 'mi-espacio',
        autoSync: parsed.autoSync ?? true,
      });
      return true;
    } catch {
      return false;
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

  public async testConnection(): Promise<{ ok: boolean; message: string; missingEcoTable?: boolean }> {
    const client = this.ensureClient();
    if (!client) {
      return { ok: false, message: 'Completa URL, Anon Key y código de espacio (mín. 3 letras).' };
    }
    const { error: docErr } = await client
      .from('atelier_documents')
      .select('id')
      .eq('space_code', this.config.spaceCode)
      .limit(1);
    if (docErr) {
      if (/failed to fetch/i.test(docErr.message)) {
        return {
          ok: false,
          message: `No se pudo contactar ${this.config.supabaseUrl}. Usa la URL de API (https://TU-ID.supabase.co), no la del panel.`,
        };
      }
      if (/atelier_documents|schema cache|does not exist/i.test(docErr.message)) {
        return { ok: false, message: 'Falta ejecutar el SQL de Supabase: pulsa «Copiar SQL completo», pégalo en SQL Editor y pulsa Run.' };
      }
      return { ok: false, message: `Error de tabla o permisos: ${docErr.message}` };
    }

    const { error: ecoErr } = await client
      .from('ecosystem_state')
      .select('scope')
      .eq('space_code', this.config.spaceCode)
      .limit(1);
    if (ecoErr) {
      if (/ecosystem_state|schema cache|does not exist/i.test(ecoErr.message)) {
        return {
          ok: false,
          missingEcoTable: true,
          message: 'Falta la tabla ecosystem_state: copia el nuevo SQL completo, pégalo en Supabase SQL Editor y pulsa Run.',
        };
      }
      return { ok: false, message: `Error en ecosystem_state: ${ecoErr.message}` };
    }

    this.lastSyncError = '';
    this.lastSyncAt = Date.now();
    this.emitStatus();
    return { ok: true, message: `Conectado en vivo al espacio «${this.config.spaceCode}» (cuadernos, perfil, UNUmbral y OMNI ARENA).` };
  }

  /* -------------------- Ecosystem Scopes (All Settings & State) -------------------- */

  public async pullScope<T>(scope: EcosystemScope): Promise<{ payload: T; updatedAt: number } | null> {
    const client = this.ensureClient();
    if (!client) return null;
    const { data, error } = await client
      .from('ecosystem_state')
      .select('payload, updated_at')
      .eq('space_code', this.config.spaceCode)
      .eq('scope', scope)
      .maybeSingle();
    if (error) {
      this.lastSyncError = error.message;
      this.emitStatus();
      return null;
    }
    if (!data) return null;
    this.lastSyncAt = Date.now();
    this.lastSyncError = '';
    this.emitStatus();
    return {
      payload: data.payload as T,
      updatedAt: Number(data.updated_at) || 0,
    };
  }

  public async pullAllScopes(): Promise<Partial<Record<EcosystemScope, { payload: unknown; updatedAt: number }>>> {
    const client = this.ensureClient();
    if (!client) return {};
    const { data, error } = await client
      .from('ecosystem_state')
      .select('scope, payload, updated_at')
      .eq('space_code', this.config.spaceCode);
    if (error || !data) {
      if (error) {
        this.lastSyncError = error.message;
        this.emitStatus();
      }
      return {};
    }
    const out: Partial<Record<EcosystemScope, { payload: unknown; updatedAt: number }>> = {};
    for (const row of data as RemoteScopeRow[]) {
      out[row.scope] = {
        payload: row.payload,
        updatedAt: Number(row.updated_at) || 0,
      };
    }
    this.lastSyncAt = Date.now();
    this.lastSyncError = '';
    this.emitStatus();
    return out;
  }

  public async pushScope<T>(scope: EcosystemScope, payload: T, updatedAt = Date.now()): Promise<boolean> {
    const client = this.ensureClient();
    if (!client || !this.config.autoSync) return false;
    const { error } = await client.from('ecosystem_state').upsert(
      {
        space_code: this.config.spaceCode,
        scope,
        payload,
        updated_at: updatedAt,
      },
      { onConflict: 'space_code,scope' }
    );
    if (error) {
      this.lastSyncError = error.message;
      this.emitStatus();
      return false;
    }
    this.lastSyncAt = Date.now();
    this.lastSyncError = '';
    this.emitStatus();
    return true;
  }

  public startEcosystemRealtime(): void {
    this.stopEcosystemRealtime();
    const client = this.ensureClient();
    if (!client || !this.config.autoSync) return;

    this.ecoChannel = client
      .channel(`eco-${this.config.spaceCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ecosystem_state',
          filter: `space_code=eq.${this.config.spaceCode}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          const r = payload.new as RemoteScopeRow;
          if (!r?.scope) return;
          const ts = Number(r.updated_at) || Date.now();
          this.lastSyncAt = Date.now();
          this.scopeListeners.forEach((fn) => fn(r.scope, r.payload, ts));
          this.emitStatus();
        }
      )
      .subscribe();
  }

  public stopEcosystemRealtime(): void {
    if (this.ecoChannel && this.client) {
      void this.client.removeChannel(this.ecoChannel);
    }
    this.ecoChannel = null;
  }

  /* -------------------- Notebooks & PDFs -------------------- */

  public async pullAllNotebooks(): Promise<NotebookDoc[]> {
    const client = this.ensureClient();
    if (!client) return [];
    const { data, error } = await client
      .from('atelier_documents')
      .select('*')
      .eq('space_code', this.config.spaceCode);
    if (error || !data) return [];
    this.lastSyncAt = Date.now();
    this.emitStatus();
    return (data as RemoteDocRow[]).map((r) => ({
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
    const row: RemoteDocRow = {
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
    if (!error) {
      this.lastSyncAt = Date.now();
      this.emitStatus();
    }
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

    this.docsChannel = client
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
            const oldRow = payload.old as Partial<RemoteDocRow>;
            if (oldRow?.id) onRemoteDelete(oldRow.id);
            return;
          }
          const r = payload.new as RemoteDocRow;
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
    if (this.docsChannel && this.client) {
      void this.client.removeChannel(this.docsChannel);
    }
    this.docsChannel = null;
  }

  public disconnectAllRealtime(): void {
    this.disconnectRealtime();
    this.stopEcosystemRealtime();
  }
}

export const cloudSync = new CloudSyncService();
