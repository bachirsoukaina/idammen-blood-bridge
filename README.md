# BloodLink / Idammen — Frontend

Interface web de BloodLink : espace **donneur** (profil, éligibilité, alertes, fidélité) et portail **centre de transfusion** (stock sanguin, demandes urgentes, réponses des donneurs, carte, statistiques).

Membre 4 (frontend) — projet SCRUM sur Jira.

## Technologies

| Rôle                    | Outil                                                       |
| ----------------------- | ----------------------------------------------------------- |
| Interface               | React 19 + TypeScript                                       |
| Build et serveur de dev | Vite                                                        |
| Navigation              | TanStack Router (une page = un fichier dans `src/routes/`)  |
| Styles                  | Tailwind CSS 4 + `src/styles.css`                           |
| Langues                 | react-i18next : français, arabe (RTL), tamazight (tifinagh) |
| Carte                   | Leaflet / OpenStreetMap                                     |
| Graphiques              | Recharts                                                    |
| Formulaires             | react-hook-form + Zod                                       |
| Tests                   | Vitest + Testing Library                                    |
| Production              | Nginx (image Docker non root)                               |

## Démarrer en local

Prérequis : Node.js 20 ou plus.

```bash
npm install --legacy-peer-deps
cp .env.example .env
npm run dev
```

Ouvrir http://localhost:5173 (le port 8080 est réservé à l'API Gateway).

### Mode mock ou mode réel

| Variable        | Valeur                  | Effet                                                                                                    |
| --------------- | ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `VITE_USE_MOCK` | `true` (défaut)         | API simulée en mémoire, comptes de démonstration. Un rechargement de page remet les données à zéro.      |
| `VITE_USE_MOCK` | `false`                 | Toutes les requêtes partent vers la gateway. Le bloc de démonstration disparaît de la page de connexion. |
| `VITE_API_URL`  | `http://localhost:8080` | Adresse de l'API Gateway                                                                                 |

Comptes de démonstration (mode mock) : toute adresse e-mail avec un mot de passe de 8 caractères ou plus ouvre l'espace donneur ; `centre@example.ma` ouvre le portail centre.

## Commandes

| Commande          | Rôle                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| `npm run dev`     | Serveur de développement                                                                           |
| `npm run build`   | Vérification TypeScript puis site statique dans `dist/`                                            |
| `npm run preview` | Sert `dist/` en local (port 4173)                                                                  |
| `npm test`        | Tests automatiques                                                                                 |
| `npm run lint`    | ESLint + Prettier                                                                                  |
| `npm run e2e`     | Tests de bout en bout Playwright, en mode mock (première fois : `npx playwright install chromium`) |
| `npm run seed`    | Régénère les données de test (`seed/README.md`)                                                    |

## Docker (SCRUM-98)

Image multi-stage : Node compile le site, puis Nginx le sert seul.

```bash
docker build -t bloodlink-frontend .
docker run -p 5173:8080 bloodlink-frontend
```

Ouvrir http://localhost:5173. Par défaut l'image est construite en **mode réel**. Pour une démo sans backend :

```bash
docker build --build-arg VITE_USE_MOCK=true -t bloodlink-frontend:demo .
```

Bloc à ajouter au `docker-compose.yml` de l'équipe :

```yaml
frontend:
  build:
    context: ./frontend
    args:
      VITE_USE_MOCK: "false"
      VITE_API_URL: http://localhost:8080
  environment:
    API_ORIGIN: http://localhost:8080
  ports:
    - "5173:8080"
  depends_on:
    - api-gateway
```

Le navigateur appelle la gateway directement : elle doit autoriser l'origine `http://localhost:5173` (CORS).

### Sécurité de l'image (DevSecOps)

- Nginx tourne sans les droits root (`nginx-unprivileged`, utilisateur 101).
- Le code source et Node ne sont pas dans l'image finale, seulement `dist/`.
- En-têtes de sécurité : `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- La CSP n'autorise les appels réseau que vers l'origine de la page et `API_ORIGIN`.
- Les fichiers cachés (`.env`, `.git`) sont refusés (403) ; la version de Nginx n'est pas affichée.
- Sonde de santé : `GET /healthz`, utilisée par le `HEALTHCHECK` Docker.

## Organisation du code

| Dossier           | Contenu                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/api/`        | Un fichier par service (`authApi`, `donorApi`, `requestApi`, `centerApi`, `loyaltyApi`), client HTTP avec JWT, mock |
| `src/routes/`     | Les pages (`donor.*`, `center.*`, `login`, `register`, `index`)                                                     |
| `src/components/` | En-tête, mise en page commune (`app-shell`), garde de rôle, carte, composants shadcn (`ui/`)                        |
| `src/i18n/`       | `fr.json`, `ar.json`, `zgh.json`                                                                                    |
| `src/lib/`        | Formatage des dates (Africa/Casablanca), niveaux de stock, erreurs                                                  |
| `docker/`         | Configuration Nginx                                                                                                 |

## Sécurité côté navigateur

- Le JWT est stocké dans `localStorage` (clé `bloodlink_token`) et envoyé en `Authorization: Bearer`.
- Chaque page donneur ou centre est protégée par `RoleGuard` : sans jeton, retour à `/login` ; avec le mauvais rôle, retour à l'accueil du bon rôle.
- La session est vérifiée toutes les 30 secondes et à chaque réponse `401` : un jeton expiré déconnecte l'utilisateur.
