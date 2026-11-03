import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';

import { useSession } from '@/hooks/use-session';
import { clearSession, roleHome } from '@/api/session';
import { Brand } from './logo';
import { LanguageSelect } from './language-select';

export function SiteHeader() {
  const { t } = useTranslation();
  const session = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const logout = () => {
    clearSession();
    setOpen(false);
    void navigate({ to: '/', replace: true });
  };

  return (
    <header className="site-header">
      <div className="container-id" style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 24 }}>
        <Link to="/" aria-label="Idammen">
          <Brand />
        </Link>
        <nav aria-label="Principal" style={{ display: 'flex', gap: 22, flex: 1 }}>
          <Link to="/" className="nav-link" activeProps={{ 'data-status': 'active' }}>
            {t('home')}
          </Link>
          <Link to="/" hash="how" className="nav-link">
            {t('how')}
          </Link>
          <Link to="/" hash="centers" className="nav-link">
            {t('centers')}
          </Link>
          <Link to="/" hash="compat" className="nav-link">
            {t('compatibility')}
          </Link>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LanguageSelect />
          {session ? (
            <>
              <Link to={roleHome(session.role)} className="nav-link" style={{ fontWeight: 700 }}>
                {session.role === 'CENTRE' ? t('centerSpace') : t('donorSpace')}
              </Link>
              <button type="button" className="nav-link" onClick={logout}>
                {t('logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                {t('login')}
              </Link>
              <Link to="/register" className="nav-link" style={{ fontWeight: 700 }}>
                {t('register')}
              </Link>
            </>
          )}
          <button
            type="button"
            aria-label={t('menu')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            style={{ background: 'none', border: 0, color: 'var(--primary)', cursor: 'pointer' }}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-nav" aria-label={t('menu')}>
          <Link to="/" onClick={() => setOpen(false)}>
            {t('home')}
          </Link>
          <Link to="/" hash="how" onClick={() => setOpen(false)}>
            {t('how')}
          </Link>
          {session ? (
            <>
              <Link to={roleHome(session.role)} onClick={() => setOpen(false)}>
                {session.role === 'CENTRE' ? t('centerSpace') : t('donorSpace')}
              </Link>
              <button type="button" onClick={logout}>
                {t('logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}>
                {t('login')}
              </Link>
              <Link to="/register" onClick={() => setOpen(false)}>
                {t('register')}
              </Link>
            </>
          )}
          <LanguageSelect />
        </nav>
      )}
    </header>
  );
}
