import { useCallback, useEffect, useState } from 'react';
import { Link, createFileRoute, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { requestApi } from '@/api/requestApi';
import type { DonorResponse } from '@/api/models';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { RoleGuard } from '@/components/role-guard';
import { SiteHeader } from '@/components/site-header';
import { CenterNav } from './center.dashboard';

export const Route = createFileRoute('/center/responses')({
  validateSearch: (search: Record<string, unknown>) => ({
    request: Number(search.request) || 0,
  }),
  head: () => ({ meta: [{ title: 'Réponses des donneurs — Idammen' }] }),
  component: () => (
    <RoleGuard role="CENTRE">
      <CenterResponsesPage />
    </RoleGuard>
  ),
});

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--border, #e5e0df)',
  borderRadius: 10,
  padding: 20,
};

const reponseColor: Record<string, string> = {
  CONFIRME: '#2e7d5b',
  DECLINE: 'var(--muted-foreground)',
  SANS_REPONSE: '#d9a441',
};

function CenterResponsesPage() {
  const { t } = useTranslation();
  const { request: requestId } = useSearch({ from: '/center/responses' });
  const [state, setState] = useState<'loading' | 'error' | 'ready' | 'empty'>('loading');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<DonorResponse[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!requestId) {
      setState('empty');
      return;
    }
    setState('loading');
    try {
      setRows(await requestApi.responses(requestId));
      setState('ready');
    } catch (e) {
      setError(errorMessage(e, t));
      setState('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function validate(donId: number) {
    setBusyId(donId);
    try {
      await requestApi.validate(donId);
      setRows((list) => list.map((r) => (r.don.id === donId ? { ...r, don: { ...r.don, statut: 'VALIDE' } } : r)));
      toast.success(t('donationValidated'));
    } catch (e) {
      toast.error(errorMessage(e, t));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <SiteHeader />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 20 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{t('responses')}</h1>
          <CenterNav />
        </div>

        {requestId === 0 && (
          <div style={card}>
            <p style={{ marginTop: 0 }}>{t('empty')}</p>
            <Link to="/center/requests" style={{ color: 'var(--primary)', fontWeight: 700 }}>
              {t('backRequests')}
            </Link>
          </div>
        )}

        {requestId > 0 && state === 'loading' && <p role="status">{t('loading')}</p>}

        {state === 'error' && (
          <div style={{ ...card, borderColor: 'var(--primary)' }} role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => void load()} style={{ marginTop: 10, fontWeight: 700, cursor: 'pointer' }}>
              {t('retry')}
            </button>
          </div>
        )}

        {state === 'ready' && (
          <>
            <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>
              {t('responseIntro')} — {t('request')} #{requestId}
            </p>
            <Link to="/center/requests" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14, justifySelf: 'start' }}>
              ← {t('backRequests')}
            </Link>
            <div style={{ display: 'grid', gap: 12 }}>
              {rows.map((r) => (
                <article key={r.don.id} style={{ ...card, borderInlineStart: `5px solid ${reponseColor[r.reponse] ?? '#999'}`, display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 16 }}>{r.donneur.nom}</strong>
                    <span style={{ color: reponseColor[r.reponse], fontWeight: 800, fontSize: 13 }}>{t(r.reponse, r.reponse)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 14 }}>
                    <span>
                      {t('bloodGroup')} : <strong>{r.donneur.groupeSanguin}</strong>
                    </span>
                    <span>
                      {t('phone')} : <strong>{r.donneur.telephone}</strong>
                    </span>
                    <span>
                      {t('status')} : <strong>{t(r.don.statut, r.don.statut)}</strong>
                    </span>
                  </div>
                  {r.don.statut !== 'VALIDE' && r.reponse === 'CONFIRME' ? (
                    <button
                      type="button"
                      disabled={busyId === r.don.id}
                      onClick={() => void validate(r.don.id)}
                      style={{ background: '#2e7d5b', color: '#fff', border: 0, borderRadius: 6, padding: '10px 16px', fontWeight: 700, cursor: 'pointer', justifySelf: 'start' }}
                    >
                      {t('validateDonation')}
                    </button>
                  ) : (
                    r.don.statut === 'VALIDE' && <span style={{ color: '#2e7d5b', fontWeight: 700, fontSize: 14 }}>{t('VALIDE')}</span>
                  )}
                  <small style={{ color: 'var(--muted-foreground)' }}>{formatDateTime(r.don.datePrelevement)}</small>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
