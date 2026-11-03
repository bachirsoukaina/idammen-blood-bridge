import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { authApi } from '@/api/authApi';
import { registerSchema } from '@/api/validation';
import { roleHome, saveToken } from '@/api/session';
import { cities, bloodGroups } from '@/api/models';
import { errorMessage } from '@/lib/errors';
import { AuthLayout } from '@/components/auth-layout';
import { SiteHeader } from '@/components/site-header';

export const Route = createFileRoute('/register')({
  head: () => ({
    meta: [
      { title: 'Devenir donneur — Idammen' },
      { name: 'description', content: 'Créez votre compte donneur Idammen et rejoignez la solidarité marocaine.' },
      { property: 'og:title', content: 'Devenir donneur — Idammen' },
      { property: 'og:description', content: 'Rejoignez les donneurs qui font battre le cœur du Maroc.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: RegisterPage,
});

type RegisterValues = {
  nom: string;
  email: string;
  telephone: string;
  password: string;
  groupeSanguin: string;
  dateNaissance: string;
  poids: string;
  latitude: string;
  longitude: string;
};

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const form = useForm<RegisterValues>({
    // Cast: le formulaire manipule des strings (inputs HTML), le schéma Zod
    // les convertit/valide (nombre, enum). Les deux types diffèrent volontairement.
    resolver: zodResolver(registerSchema) as unknown as Resolver<RegisterValues>,
    defaultValues: {
      nom: '',
      email: '',
      telephone: '',
      password: '',
      groupeSanguin: '',
      dateNaissance: '',
      poids: '',
      latitude: String(cities[0]?.latitude ?? ''),
      longitude: String(cities[0]?.longitude ?? ''),
    },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { token } = await authApi.register(values);
      saveToken(token);
      // Cast: the donor routes are not in the generated route tree yet.
      void navigate({ to: roleHome('DONNEUR') as '/', replace: true });
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  });

  return (
    <>
      <SiteHeader />
      <AuthLayout title={t('registerTitle')} description={t('registerDescription')}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>{t('register')}</h1>
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 6 }}>{t('registerDescription')}</p>
        <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 16, marginTop: 20 }}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="nom">{t('name')}</label>
              <input id="nom" autoComplete="name" {...form.register('nom')} />
              {errors.nom && <span className="field-error">{errors.nom.message}</span>}
            </div>
            <div className="field">
              <label htmlFor="email">{t('email')}</label>
              <input id="email" type="email" autoComplete="email" {...form.register('email')} />
              {errors.email && <span className="field-error">{errors.email.message}</span>}
            </div>
            <div className="field">
              <label htmlFor="telephone">{t('phone')}</label>
              <input id="telephone" type="tel" autoComplete="tel" placeholder="+212 6 12 34 56 78" {...form.register('telephone')} />
              {errors.telephone && <span className="field-error">{errors.telephone.message}</span>}
            </div>
            <div className="field">
              <label htmlFor="password">{t('password')}</label>
              <input id="password" type="password" autoComplete="new-password" {...form.register('password')} />
              {errors.password && <span className="field-error">{errors.password.message}</span>}
            </div>
            <div className="field">
              <label htmlFor="groupeSanguin">{t('bloodGroup')}</label>
              <select id="groupeSanguin" {...form.register('groupeSanguin')}>
                <option value="">—</option>
                {bloodGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {errors.groupeSanguin && <span className="field-error">{errors.groupeSanguin.message}</span>}
            </div>
            <div className="field">
              <label htmlFor="dateNaissance">{t('birthDate')}</label>
              <input id="dateNaissance" type="date" {...form.register('dateNaissance')} />
              {errors.dateNaissance && <span className="field-error">{errors.dateNaissance.message}</span>}
            </div>
            <div className="field">
              <label htmlFor="poids">{t('weight')}</label>
              <input id="poids" type="number" min={1} {...form.register('poids')} />
              {errors.poids && <span className="field-error">{errors.poids.message}</span>}
            </div>
            <div className="field">
              <label htmlFor="city">{t('city')}</label>
              <select
                id="city"
                onChange={(e) => {
                  const city = cities.find((c) => c.key === e.target.value);
                  if (city) {
                    form.setValue('latitude', String(city.latitude));
                    form.setValue('longitude', String(city.longitude));
                  }
                }}
              >
                {cities.map((c) => (
                  <option key={c.key} value={c.key}>{t(c.key)}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', border: 0, borderRadius: 6, padding: '12px 18px', fontWeight: 700, cursor: 'pointer' }}
          >
            {t('createAccount')}
          </button>
          <small style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>{t('consent')} · {t('demoHint')}</small>
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
            {t('hasAccount')}{' '}
            <a href="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>
              {t('login')}
            </a>
          </p>
        </form>
      </AuthLayout>
    </>
  );
}