import { useCallback, useEffect, useState } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { centerApi } from '@/api/centerApi';
import { requestApi } from '@/api/requestApi';
import type { DemandeDon, StockSang } from '@/api/models';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { lowStockRows } from '@/lib/stock';
import { RoleGuard } from '@/components/role-guard';
import { SiteHeader } from '@/components/site-header';

export const Route = createFileRoute('/center/dashboard')({
  head: () => ({ meta: [{ title: 'Tableau de bord — Idammen' }] }),
  component: () => (
    <RoleGuard role="CENTRE">
      <CenterDashboardPage />
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

function CenterNav() {
  const { t } = useTranslation();
  const links = [
    ['/center/dashboard', t('dashboard')],
    ['/center/stock', t('stock')],
    ['/center/requests', t('requests')],
    ['/center/responses', t('responses')],
    ['/center/map', t('map')],
    ['/center/stats', t('stats')],
  ];
  return (
    <nav aria-label={t('centerSpace')} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 14, fontWeight: 700 }}>
      {links.map(([to, label]) => (
        <Link key={to} to={to} activeProps={{ style: { color: 'var(--primary)', textDecoration: 'underline' } }} style={{ color: 'var(--muted-foreground)' }}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

function isExpired(r: DemandeDon) {
  return r.statut === 'EXPIREE' || new Date(r.dateExpiration).getTime() < Date.now();
}

export { CenterNav };

function CenterDashboardPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState('');
  const [center, setCenter] = useState<Awaited<ReturnType<typeof centerApi.me>> | null>(null);
  const [stock, setStock] = useState<StockSang[]>([]);
  const [requests, setRequests] = useState<DemandeDon[]>([]);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [c, s, r] = await Promise.all([centerApi.me(), centerApi.stock(), requestApi.list()]);
      setCenter(c);
      setStock(s);
      setRequests(r);
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

  const low = lowStockRows(stock);
  const active = requests.filter((r) => !isExpired(r));

  return (
    <>
      <SiteHeader />
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 20 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{center?.nom ?? t('centerSpace')}</h1>
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
            <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>{t('centerIntro')}</p>

            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <section style={card}>
                <div style={{ fontSize: 32, fontWeight: 900, color: low.length ? '#c0392b' : '#2e7d5b' }}>{low.length}</div>
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{t('lowStock')}</div>
                <Link to="/center/stock" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14, display: 'inline-block', marginTop: 8 }}>
                  {t('stock')} →
                </Link>
              </section>
              <section style={card}>
                <div style={{ fontSize: 32, fontWeight: 900 }}>{active.length}</div>
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{t('ACTIVE')}</div>
                <Link to="/center/requests" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14, display: 'inline-block', marginTop: 8 }}>
                  {t('requests')} →
                </Link>
              </section>
              <section style={card}>
                <div style={{ fontSize: 32, fontWeight: 900 }}>{stock.reduce((n, s) => n + s.quantitePoches, 0)}</div>
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                  {t('bags', { count: stock.reduce((n, s) => n + s.quantitePoches, 0) })}
                </div>
                <Link to="/center/stats" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14, display: 'inline-block', marginTop: 8 }}>
                  {t('stats')} →
                </Link>
              </section>
            </div>

            {low.length > 0 && (
              <section style={{ ...card, borderInlineStart: '5px solid #c0392b' }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{t('lowStock')}</h2>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
                  {low.map((s) => (
                    <li key={s.id}>
                      <strong>{s.groupeSanguin}</strong> — {s.quantitePoches} / {t('threshold')} {s.seuilAlerte}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section style={card}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>{t('requests')}</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                {active.length === 0 && <p style={{ color: 'var(--muted-foreground)' }}>{t('empty')}</p>}
                {active.map((r) => (
                  <div
                    key={r.id}
                    style={{ border: '1px solid var(--border, #e5e0df)', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}
                  >
                    <span>
                      <strong>{r.groupeSanguinDemande}</strong> · {r.quantiteNecessaire} ·{' '}
                      <span style={{ color: urgenceColor[r.urgence], fontWeight: 800 }}>{t(r.urgence, r.urgence)}</span>
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{t('expiration', { date: formatDateTime(r.dateExpiration) })}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
