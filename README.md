# Idammen Blood Bridge

Tu es développeur frontend senior et designer. Génère le frontend complet de la plateforme MAROCAINE "Idammen" (nom technique du projet : BloodLink), qui met en relation centres de transfusion sanguine et donneurs de sang. "Idammen" signifie "sang" en tamazight. Un seul prompt couvre toutes les pages : fais-les toutes maintenant, proprement, pour qu'on n'ait pas à tout refaire plus tard.

STACK

- React + Vite, React Router, react-i18next, react-leaflet (tuiles OpenStreetMap), recharts.

- JavaScript de préférence. Pas de Supabase, pas de backend intégré, pas d'authentification Lovable.

- Build statique (servi plus tard par Nginx), avec fallback vers index.html pour React Router.

IDENTITÉ VISUELLE (page d'accueil créative, fière de la culture amazighe marocaine)

- Marque : "Idammen" en grand, écrit en tifinagh ⵉⴷⴰⵎⵎⴻⵏ ET en lettres latines "Idammen", avec "BloodLink" en petit dessous. Le logo : une goutte de sang rouge contenant la lettre tifinagh ⵣ (yaz).

- Palette : rouge sang #c0392b et #922b21, fond crème #fdf6f5, accents inspirés des tapis berbères et du zellige : bleu indigo #1f3a5f, ocre #d9a441, vert #2e7d5b. Le rouge reste la couleur dominante.

- Motifs géométriques amazighs (losanges, triangles, lignes des tapis Beni Ourain et Azilal) en SVG, utilisés en bordures de sections et en filigrane discret, jamais en fond chargé.

- Page d'accueil publique (route /) avec ces sections :

  1. Hero : "Idammen" en très grand (tifinagh + latin), phrase d'accroche traduite, deux boutons ("Devenir donneur" vers /register, "Espace centre" vers /login), une goutte animée discrètement.

  2. Bandeau de chiffres (données fictives) : centres partenaires, donneurs inscrits, poches collectées ce mois.

  3. "Comment ça marche" en 4 étapes : alerte ciblée, je me présente au centre, le centre valide mon don, je gagne des points.

  4. Villes couvertes : Casablanca, Rabat, Marrakech, Fès, Tanger, Agadir sur une petite carte Leaflet du Maroc.

  5. Compatibilité des groupes sanguins (mini tableau clair).

  6. Pied de page avec le sélecteur de langue et les liens utiles.

- Phrases d'accroche : FR "Donner son sang, donner la vie." AR "دمك حياة". Pour le tamazight, mets Idammen en tifinagh et prépare les autres clés.

LANGUES (dès le départ)

- 3 langues : Français (par défaut), العربية (RTL : dir="rtl" sur toute l'interface, mise en page inversée), Tamazight en tifinagh (code zgh).

- Sélecteur de langue dans la barre de navigation, choix mémorisé.

- AUCUN texte en dur : tout passe par t("clé"), avec 3 fichiers fr.json, ar.json, zgh.json remplis complètement.

- Polices Google Fonts : Cairo (arabe), Noto Sans Tifinagh (tamazight), avec polices de secours.

- Les groupes sanguins restent en caractères latins (A+, A-, B+, B-, AB+, AB-, O+, O-).

CONTEXTE MAROC

Téléphones +212 6XX XX XX XX ou 07XX XX XX XX ; dates JJ/MM/AAAA ; fuseau Africa/Casablanca. Données fictives réalistes : noms marocains (Youssef El Amrani, Fatima Zahra Benali, Karim Bouzid...), centres fictifs dans les villes citées, vraies coordonnées GPS de ces villes.

ARCHITECTURE BACKEND (déjà décidée, ne rien inventer en dehors)

Microservices Spring Boot derrière une api-gateway unique : toutes les requêtes vont à VITE_API_URL (défaut http://localhost:8080).

Services : donor-service (profil, éligibilité, documents), center-service (centres, stock), request-service (demandes urgentes, réponses, dons), loyalty-service (points, niveaux, récompenses), notification-service (alertes). Le matching-service est interne : le frontend ne l'appelle jamais.

Auth : JWT. POST /auth/register et POST /auth/login renvoient un token, stocké côté client et envoyé dans "Authorization: Bearer <token>" par un intercepteur HTTP central. Rôles : DONNEUR, CENTRE, ADMIN. Après connexion : DONNEUR vers son espace donneur, CENTRE vers son dashboard.

COUCHE API (règle cruciale)

Dossier src/api/ avec un fichier par service (authApi, donorApi, centerApi, requestApi, loyaltyApi) et un client HTTP central. Les composants n'appellent JAMAIS fetch directement. VITE_USE_MOCK=true : les fonctions renvoient des données fictives ; à false, elles appellent les vraies routes. Passer du mock au vrai backend ne doit demander aucune modification des pages. États de chargement, d'erreur et liste vide partout.

MODÈLE DE DONNÉES (noms de champs exacts)

- Donneur : id, nom, email, telephone, groupeSanguin, dateNaissance, poids, latitude, longitude, dateDernierDon, statutEligibilite

- Centre : id, nom, adresse, latitude, longitude, telephone

- StockSang : id, centreId, groupeSanguin, quantitePoches, seuilAlerte, dateMAJ

- DemandeDon : id, centreId, groupeSanguinDemande, quantiteNecessaire, urgence, statut (dont EXPIREE), dateCreation, dateExpiration

- Don : id, donneurId, centreId, demandeId, quantite, datePrelevement, statut (PLANIFIE / VALIDE / ANNULE)

- PointsDonneur : id, donneurId, pointsActuels, niveau, nombreDonsTotal

- Recompense : id, nom, description, coutPoints, type, stockDisponible

- EchangeRecompense : id, donneurId, recompenseId, dateEchange, statut, codeUtilisation

Réponse du donneur à une alerte : CONFIRME ou DECLINE. Niveaux de fidélité : afficher le niveau reçu de l'API (Bronze, Argent, Or, éventuellement Platine), sans fixer le nombre de niveaux en dur.

PAGES DONNEUR (rôle DONNEUR)

1. Inscription (nom, email, téléphone, mot de passe, groupe sanguin, date de naissance, poids, localisation, avec validation des champs) et connexion.

2. Profil : consulter et modifier. Badge d'éligibilité avec la date à partir de laquelle le donneur redevient éligible. Tableau de l'historique des dons.

3. Alertes reçues : demandes urgentes qui le concernent (centre, groupe, urgence, expiration), boutons "Je suis disponible" / "Je décline" (CONFIRME / DECLINE).

4. Fidélité : points, niveau, barre de progression, catalogue de récompenses, bouton d'échange qui affiche le code à usage unique.

5. (Optionnel) Mes documents : dépôt et liste de PDF/images.

PAGES CENTRE (rôle CENTRE)

1. Dashboard : stock par groupe sanguin, alerte rouge si quantitePoches < seuilAlerte, seuil modifiable.

2. Demandes urgentes : formulaire (groupe sanguin, quantité, urgence, date d'expiration) et liste avec statut.

3. Suivi d'une demande : donneurs notifiés avec leur réponse (confirmé / décliné / sans réponse) et bouton "Valider le don" sur chaque donneur ayant confirmé (le don passe à VALIDE ; seul le personnel du centre peut le faire).

4. Carte Leaflet : le centre et les donneurs proches, marqueurs verts (éligible) ou gris (non éligible), popup avec nom et groupe.

5. Statistiques : graphique des dons par mois et graphique du stock par groupe sanguin.

SÉCURITÉ FRONTEND

- Guards de routes par rôle : un DONNEUR ne peut jamais ouvrir une page centre, et inversement (redirection vers sa page d'accueil).

- Déconnexion automatique et redirection vers /login quand le JWT expire ou qu'une réponse 401 arrive.

- Ne jamais afficher de données d'un autre utilisateur : uniquement les routes "me", l'identité vient du token.

- Aucun secret ni URL en dur : variables d'environnement.

ENDPOINTS (via la gateway, proposition à confirmer avec le backend)

Auth : POST /auth/register, POST /auth/login

Donneur : GET et PUT /api/donors/me, GET /api/donors/me/eligibility, GET /api/donors/me/donations, GET /api/donors/me/alerts, POST /api/requests/{id}/respond (corps : {reponse})

Fidélité : GET /api/loyalty/me, GET /api/loyalty/rewards, POST /api/loyalty/rewards/{id}/exchange

Centre : GET et PUT /api/centers/me, GET /api/centers/me/stock, PUT /api/centers/me/stock/{id}, POST /api/requests, GET /api/requests, GET /api/requests/{id}/responses, POST /api/donations/{id}/validate, GET /api/centers/me/nearby-donors, GET /api/centers/me/stats

DESIGN

Responsive (mobile d'abord), accessible, élégant, avec des animations légères et sobres. Barre de navigation adaptée au rôle, avec le logo goutte + ⵣ et le nom Idammen.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ca76a1ac-10cc-5d9f-b885-b4bc7ae3beb9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
