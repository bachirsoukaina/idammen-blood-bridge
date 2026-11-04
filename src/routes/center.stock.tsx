import { useCallback, useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { centerApi } from '@/api/centerApi';
import type { StockSang } from '@/api/models';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { RoleGuard } from '@/components/role-guard';
import { SiteHeader } from '@/components/site-header';
import { CenterNav, lowStockRows } from './center.dashboard';

export const Route = createFileRoute('/center/stock')({
  head: () => ({ meta: [{ title: 'Stock sanguin — Idammen' }] }),
  component: () => (
    <RoleGuard role="CENTRE">
      <CenterStockPage />
    </RoleGuard>
  ),
});

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--border, #e5e0df)',
  borderRadius: 10,
  padding: 20,
};

function CenterStockPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState('');
  const [stock, setStock] = useState<StockSang[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const list = await centerApi.stock();
      setStock(list);
      setDraft(Object.fromEntries(list.map((s) => [s.id, String(s.seuilAlerte)])));
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

  async function save(row: StockSang) {
    setBusyId(row.id);
    try {
      const updated = await centerApi.updateStock(row.id, { seuilAlerte: Number(draft[row.id]) });
      setStock((list) => list.map((s) => (s.id === row.id ? { ...updated, groupeSanguin: updated.groupeSanguin ?? row.groupeSanguin } : s)));
      toast.success(t('saved'));
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
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{t('stock')}</h1>
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
          <div style={{ display: 'grid', gap: 12 }}>
            <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>{t('centerIntro')}</p>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
              {stock.map((s) => {
                const low = s.quantitePoches <= s.seuilAlerte;
                return (
                  <section key={s.id} style={{ ...card, borderInlineStart: `5px solid ${low ? '#c0392b' : '#2e7d5b'}`, display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 20 }}>{s.groupeSanguin}</strong>
                      {low && <span style={{ background: '#c0392b', color: '#fff', borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 800 }}>{t('lowStock')}</span>}
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 900 }}>{s.quantitePoches}</div>
                    <small style={{ color: 'var(--muted-foreground)' }}>{formatDateTime(s.dateMAJ)}</small>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void save(s);
                      }}
                      style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                    >
                      <label htmlFor={`seuil-${s.id}`} style={{ fontSize: 13 }}>
                        {t('threshold')}
                      </label>
                      <input
                        id={`seuil-${s.id}`}
                        type="number"
                        min={0}
                        value={draft[s.id] ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                        style={{ width: 80, padding: '6px 8px', border: '1px solid var(--border, #ccc)', borderRadius: 6 }}
                      />
                      <button
                        type="submit"
                        disabled={busyId === s.id || Number(draft[s.id]) === s.seuilAlerte}
                        style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', border: 0, borderRadius: 6, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                      >
                        {t('save')}
                      </button>
                    </form>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
export { lowStockRows as _lowStockRows };
