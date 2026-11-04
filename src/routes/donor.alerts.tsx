import { useCallback, useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { donorApi } from '@/api/donorApi';
import { requestApi } from '@/api/requestApi';
import type { DemandeDon } from '@/api/models';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { RoleGuard } from '@/components/role-guard';
import { SiteHeader } from '@/components/site-header';

export const Route = createFileRoute('/donor/alerts')({
  head: () => ({ meta: [{ title: 'Mes alertes — Idammen' }] }),
  component: () => (
    <RoleGuard role="DONNEUR">
      <DonorAlertsPage />
    </RoleGuard>
  ),
});

const urgenceColor: Record<string, string> = {
  CRITIQUE: '#c0392b',
  URGENTE: '#d9a441',
  NORMALE: '#1f3a5f',
};

function isExpired(r: DemandeDon) {
  return r.statut === 'EXPIREE' || new Date(r.dateExpiration).getTime() < Date.now();
}

function DonorAlertsPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState('');
  const [alerts, setAlerts] = useState<DemandeDon[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      setAlerts(await donorApi.alerts());
      setState('ready');
    } catch (e) {
      setError(errorMessage(e, t));
      setState('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function answer(id: number, reponse: 'CONFIRME' | 'DECLINE') {
    setBusyId(id);
    try {
      const updated = await requestApi.respond(id, reponse);
      setAlerts((list) => list.map((a) => (a.id === id ? { ...a, reponse: updated.reponse ?? reponse } : a)));
      toast.success(
        reponse === 'CONFIRME'
          ? t('confirmedToast', 'Merci ! Votre disponibilité est confirmée.')
          : t('declinedToast', 'Réponse enregistrée.'),
      );
    } catch (e) {
      toast.error(errorMessage(e, t));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <SiteHeader />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>{t('myAlerts', 'Mes alertes')}</h1>
          <nav style={{ display: 'flex', gap: 12, fontSize: 14, fontWeight: 700 }}>
            <a href="/donor/profile" style={{ color: 'var(--primary)' }}>{t('profile', 'Profil')}</a>
            <a href="/donor/alerts" style={{ color: 'var(--primary)' }}>{t('alerts', 'Alertes')}</a>
          </nav>
        </div>

        {state === 'loading' && <p role="status">{t('loading', 'Chargement…')}</p>}

        {state === 'error' && (
          <div role="alert" style={{ border: '1px solid var(--primary)', borderRadius: 10, padding: 16 }}>
            <p>{error}</p>
            <button type="button" onClick={() => void load()} style={{ marginTop: 10, fontWeight: 700, cursor: 'pointer' }}>
              {t('retry', 'Réessayer')}
            </button>
          </div>
        )}

        {state === 'ready' && alerts.length === 0 && (
          <p style={{ color: 'var(--muted-foreground)' }}>
            {t('noAlerts', "Aucune alerte pour le moment. Vous serez notifié si une demande urgente vous concerne.")}
          </p>
        )}

        {state === 'ready' &&
          alerts.map((a) => {
            const expired = isExpired(a);
            const answered = Boolean(a.reponse);
            return (
              <article
                key={a.id}
                style={{
                  background: '#fff',
                  border: '1px solid var(--border, #e5e0df)',
                  borderInlineStart: `5px solid ${urgenceColor[a.urgence] ?? '#999'}`,
                  borderRadius: 10,
                  padding: 18,
                  display: 'grid',
                  gap: 10,
                  opacity: expired ? 0.65 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 17 }}>{a.centre?.nom ?? `#${a.centreId}`}</strong>
                  <span style={{ color: urgenceColor[a.urgence] ?? '#999', fontWeight: 800, fontSize: 13 }}>{a.urgence}</span>
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14 }}>
                  <span>
                    {t('bloodGroup')} : <strong>{a.groupeSanguinDemande}</strong>
                  </span>
                  <span>
                    {t('quantity', 'Quantité')} : <strong>{a.quantiteNecessaire}</strong>
                  </span>
                  <span>
                    {t('expiresOn', 'Expire le')} : <strong>{formatDateTime(a.dateExpiration)}</strong>
                  </span>
                </div>

                {expired ? (
                  <p style={{ fontSize: 14, fontWeight: 700 }}>{t('expired', 'Demande expirée')}</p>
                ) : answered ? (
                  <p style={{ fontSize: 14, fontWeight: 700, color: a.reponse === 'CONFIRME' ? '#2e7d5b' : 'var(--muted-foreground)' }}>
                    {a.reponse === 'CONFIRME'
                      ? t('youConfirmed', 'Vous avez confirmé votre disponibilité')
                      : t('youDeclined', 'Vous avez décliné')}
                  </p>
                ) : (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => void answer(a.id, 'CONFIRME')}
                      style={{ background: '#2e7d5b', color: '#fff', border: 0, borderRadius: 6, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {t('available', 'Je suis disponible')}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => void answer(a.id, 'DECLINE')}
                      style={{ background: '#fff', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 6, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {t('decline', 'Je décline')}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
      </main>
    </>
  );
}