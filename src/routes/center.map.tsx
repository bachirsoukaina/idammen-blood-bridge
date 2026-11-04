import { useCallback, useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { centerApi } from '@/api/centerApi';
import type { Donneur } from '@/api/models';
import { errorMessage } from '@/lib/errors';
import { RoleGuard } from '@/components/role-guard';
import { SiteHeader } from '@/components/site-header';
import { MapView } from '@/components/map/map-view';
import { CenterNav } from './center.dashboard';

export const Route = createFileRoute('/center/map')({
  head: () => ({ meta: [{ title: 'Carte des donneurs — Idammen' }] }),
  component: () => (
    <RoleGuard role="CENTRE">
      <CenterMapPage />
    </RoleGuard>
  ),
});

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--border, #e5e0df)',
  borderRadius: 10,
  padding: 20,
};

function CenterMapPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState('');
  const [center, setCenter] = useState<Awaited<ReturnType<typeof centerApi.me>> | null>(null);
  const [donors, setDonors] = useState<Donneur[]>([]);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [c, list] = await Promise.all([centerApi.me(), centerApi.nearby()]);
      setCenter(c);
      setDonors(list);
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

  return (
    <>
      <SiteHeader />
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 20 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{t('map')}</h1>
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

        {state === 'ready' && center && (
          <>
            <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>{t('mapIntro')}</p>
            <MapView
              large
              center={[center.latitude, center.longitude]}
              zoom={11}
              markers={[
                { latitude: center.latitude, longitude: center.longitude, label: center.nom, detail: center.adresse, kind: 'center' },
                ...donors.map((d) => ({
                  latitude: d.latitude,
                  longitude: d.longitude,
                  label: d.nom,
                  detail: `${d.groupeSanguin} · ${d.statutEligibilite === 'NON_ELIGIBLE' ? t('notEligible') : t('eligible')}`,
                  kind: d.statutEligibilite === 'NON_ELIGIBLE' ? ('ineligible' as const) : ('eligible' as const),
                })),
              ]}
            />
            <section style={{ ...card, display: 'grid', gap: 8 }}>
              {donors.map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', fontSize: 14, borderBottom: '1px solid var(--border, #eee)', paddingBottom: 6 }}>
                  <strong>{d.nom}</strong>
                  <span>
                    {d.groupeSanguin} · {d.telephone}
                  </span>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}
