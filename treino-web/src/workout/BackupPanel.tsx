import { useState } from 'react';
import { workoutRepository, type Backup } from './repository';
import { readBackup } from './install';

type Remote = { revision: number; savedAt: string | null; snapshot: Backup | null };
const api = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');

export function BackupPanel() {
  const [key, setKey] = useState('');
  const [remote, setRemote] = useState<Remote>();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  async function request<T>(body?: unknown): Promise<T> {
    const url = new URL(`${api}/v1/backup`, location.origin);
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('O backup remoto exige HTTPS.');
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${key.trim()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 401) throw new Error('Chave de acesso inválida.');
    if (response.status === 409) throw new Error('O backup mudou. Consulte o backup remoto de novo.');
    if (!response.ok) throw new Error('Backup indisponível. Verifique a conexão e a configuração da API.');
    return response.json();
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setStatus('');
    try { await action(); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Não foi possível concluir.'); }
    finally { setBusy(false); }
  }

  return <details className="card">
    <summary>Backup</summary>
    <div className="stack">
      <button className="secondary" disabled={busy} onClick={() => void run(async () => {
        const snapshot = await workoutRepository.backup();
        const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'treino-backup.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      })}>Baixar backup local</button>
      <label>Restaurar de arquivo<input type="file" accept=".json,application/json" disabled={busy} onChange={event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file) return;
        void run(async () => {
          if (file.size > 16 * 1024 * 1024) throw new Error('O backup local deve ter até 16 MB.');
          await workoutRepository.restore(readBackup(JSON.parse(await file.text())));
          setStatus('Backup restaurado neste aparelho.');
        });
      }} /></label>
      {api && <>
        <label>Chave do backup remoto<input type="password" autoComplete="off" value={key} onChange={event => {
          setRemote(undefined);
          setKey(event.target.value);
        }} /></label>
        <button className="secondary" disabled={busy || !key} onClick={() => void run(async () => {
          const current = await request<Remote>();
          setRemote(current);
          setStatus(current.savedAt ? `Último backup: ${new Date(current.savedAt).toLocaleString('pt-BR')}` : 'Ainda não existe backup remoto.');
        })}>Consultar backup remoto</button>
        {remote && <>
          <button className="secondary" disabled={busy} onClick={() => {
            if (remote.revision && !window.confirm('Substituir o backup remoto por uma cópia dos dados deste aparelho?')) return;
            void run(async () => {
              const snapshot = await workoutRepository.backup();
              if (!snapshot.programs.length && !snapshot.sessions.length) throw new Error('Não há dados locais para enviar.');
              const next = await request<Pick<Remote, 'revision' | 'savedAt'>>({ revision: remote.revision, snapshot });
              setRemote({ ...next, snapshot });
              setStatus('Backup enviado.');
            });
          }}>Enviar backup remoto</button>
          {remote.snapshot && <button className="secondary" disabled={busy} onClick={() => void run(async () => {
            await workoutRepository.restore(readBackup(remote.snapshot));
            setStatus('Backup restaurado neste aparelho.');
          })}>Restaurar neste aparelho</button>}
        </>}
      </>}
      {status && <p role="status">{status}</p>}
    </div>
  </details>;
}
