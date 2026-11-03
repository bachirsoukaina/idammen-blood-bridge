import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { authApi } from '@/api/authApi';
import { loginSchema } from '@/api/validation';
import { decodeToken, roleHome, saveToken } from '@/api/session';
import { errorMessage } from '@/lib/errors';
import { AuthLayout } from '@/components/auth-layout';
import { SiteHeader } from '@/components/site-header';

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      { title: 'Connexion — Idammen' },
      { name: 'description', content: 'Connectez-vous à votre espace donneur ou centre de transfusion Idammen.' },
      { property: 'og:title', content: 'Connexion — Idammen' },
      { property: 'og:description', content: 'Connectez-vous pour continuer à faire la différence.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: LoginPage,
});

type LoginValues = { email: string; password: string };

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const enter = (token: string) => {
    saveToken(token);
    const role = decodeToken(token)?.role ?? 'DONNEUR';
    // Cast: the donor/center routes are not in the generated route tree yet.
    void navigate({ to: roleHome(role) as '/', replace: true });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { token } = await authApi.login(values);
      enter(token);
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  });

  const demo = async (role: 'DONNEUR' | 'CENTRE') => {
    try {
      const { token } = await authApi.demo(role);
      enter(token);
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };

  return (
    <>
      <SiteHeader />
      <AuthLayout title={t('welcome')} description={t('loginDescription')}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>{t('login')}</h1>
        <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 16, marginTop: 20 }}>
          <div className="field">
            <label htmlFor="email">{t('email')}</label>
            <input id="email" type="email" autoComplete="email" {...form.register('email')} />
            {form.formState.errors.email && <span className="field-error">{form.formState.errors.email.message}</span>}
          </div>
          <div className="field">
            <label htmlFor="password">{t('password')}</label>
            <input id="password" type="password" autoComplete="current-password" {...form.register('password')} />
            {form.formState.errors.password && <span className="field-error">{form.formState.errors.password.message}</span>}
          </div>
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', border: 0, borderRadius: 6, padding: '12px 18px', fontWeight: 700, cursor: 'pointer' }}
          >
            {t('login')}
          </button>
        </form>
        <p style={{ marginTop: 18, fontSize: 12, color: 'var(--muted-foreground)' }}>
          {t('noAccount')}{' '}
          <a href="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>
            {t('register')}
          </a>
        </p>
        <div style={{ marginTop: 26, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <span className="eyebrow">{t('demoLogin')}</span>
          <div className="auth-tabs">
            <button type="button" onClick={() => demo('DONNEUR')} style={{ border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 6, padding: 10, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>
              {t('donorRole')}
            </button>
            <button type="button" onClick={() => demo('CENTRE')} style={{ border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 6, padding: 10, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>
              {t('centerRole')}
            </button>
          </div>
          <small style={{ color: 'var(--muted-foreground)', fontSize: 10 }}>{t('demoHint')}</small>
        </div>
      </AuthLayout>
    </>
  );
}
