import { useCallback, useEffect, useState } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { requestApi } from '@/api/requestApi';
import { requestSchema } from '@/api/validation';
import { bloodGroups, type DemandeDon } from '@/api/models';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { RoleGuard } from '@/components/role-guard';
import { SiteHeader } from '@/components/site-header';
import { CenterNav } from './center.dashboard';

export const Route = createFileRoute('/center/requests')({
  head: () => ({ meta: [{ title: 'Demandes urgentes — Idammen' }] }),
  component: () => (
    <RoleGuard role="CENTRE">
      <CenterRequestsPage />
    </RoleGuard>
  ),
});

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--border, #e5e0df)',
  borderRadius: 10,
  padding: 20,
};

const urgenceColor: Record<string, string> = {
  CRITIQUE: '#c0392b',
  URGENTE: '#d9a441',
  NORMALE: '#1f3a5f',
};

function isExpired(r: DemandeDon) {
  return r.statut === 'EXPIREE' || new Date(r.dateExpiration).getTime() < Date.now();
}

type RequestValues = {
  groupeSanguinDemande: string;
  quantiteNecessaire: string;
  urgence: string;
  dateExpiration: string;
};

function CenterRequestsPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<DemandeDon[]>([]);

  const form = useForm<RequestValues>({
    resolver: zodResolver(requestSchema) as unknown as Resolver<RequestValues>,
    defaultValues: { groupeSanguinDemande: 'O+', quantiteNecessaire: '5', urgence: 'URGENTE', dateExpiration: '' },
  });
  const errors = form.formState.errors;

  const load = useCallback(async () => {
    setState('loading');
    try {
      setRequests(await requestApi.list());
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

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const created = await requestApi.create(values);
      setRequests((list) => [created, ...list]);
      form.reset({ groupeSanguinDemande: 'O+', quantiteNecessaire: '5', urgence: 'URGENTE', dateExpiration: '' });
      toast.success(t('requestCreated'));
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  });

  return (
    <>
      <SiteHeader />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 20 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{t('requests')}</h1>
          <CenterNav />
        </div>

        {state === 'loading' && <p role="status">{t('loading')}</p>}

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
            <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>{t('requestIntro')}</p>

            <section style={card}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>{t('newRequest')}</h2>
              <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 16 }}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="groupeSanguinDemande">{t('bloodGroup')}</label>
                    <select id="groupeSanguinDemande" {...form.register('groupeSanguinDemande')}>
                      {bloodGroups.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    {errors.groupeSanguinDemande && <span className="field-error">{errors.groupeSanguinDemande.message}</span>}
                  </div>
                  <div className="field">
                    <label htmlFor="quantiteNecessaire">{t('quantity')}</label>
                    <input id="quantiteNecessaire" type="number" min={1} {...form.register('quantiteNecessaire')} />
                    {errors.quantiteNecessaire && <span className="field-error">{errors.quantiteNecessaire.message}</span>}
                  </div>
                  <div className="field">
                    <label htmlFor="urgence">{t('urgency')}</label>
                    <select id="urgence" {...form.register('urgence')}>
                      {(['NORMALE', 'URGENTE', 'CRITIQUE'] as const).map((u) => (
                        <option key={u} value={u}>{t(u, u)}</option>
                      ))}
                    </select>
                    {errors.urgence && <span className="field-error">{errors.urgence.message}</span>}
                  </div>
                  <div className="field">
                    <label htmlFor="dateExpiration">{t('expiryDate')}</label>
                    <input id="dateExpiration" type="datetime-local" {...form.register('dateExpiration')} />
                    {errors.dateExpiration && <span className="field-error">{errors.dateExpiration.message}</span>}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  style={{
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    border: 0,
                    borderRadius: 6,
                    padding: '12px 18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    justifySelf: 'start',
                  }}
                >
                  {t('publishRequest')}
                </button>
              </form>
            </section>

            <section style={card}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>{t('track')}</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {requests.length === 0 && <p style={{ color: 'var(--muted-foreground)' }}>{t('empty')}</p>}
                {requests.map((r) => {
                  const expired = isExpired(r);
                  return (
                    <article
                      key={r.id}
                      style={{
                        border: '1px solid var(--border, #e5e0df)',
                        borderInlineStart: `5px solid ${urgenceColor[r.urgence] ?? '#999'}`,
                        borderRadius: 10,
                        padding: 14,
                        display: 'grid',
                        gap: 8,
                        opacity: expired ? 0.65 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 16 }}>
                          {r.groupeSanguinDemande} · {t('bags', { count: r.quantiteNecessaire })}
                        </strong>
                        <span style={{ color: urgenceColor[r.urgence], fontWeight: 800, fontSize: 13 }}>{t(r.urgence, r.urgence)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted-foreground)' }}>
                        <span>{t(r.statut, r.statut)}</span>
                        <span>{expired ? t('EXPIREE', r.statut) : t('expiration', { date: formatDateTime(r.dateExpiration) })}</span>
                      </div>
                      {!expired && (
                        <Link
                          to="/center/responses"
                          search={{ request: r.id }}
                          style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}
                        >
                          {t('track')} →
                        </Link>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
