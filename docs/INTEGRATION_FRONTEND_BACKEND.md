# BloodLink / Idammen — Guide d'intégration frontend ↔ backend

**Pour :** Membre 1 (gateway, sécurité, donor-service), Membre 2 (request-service, matching, Kafka), Membre 3 (center, notification, loyalty).
**Écrit par :** Membre 4 (frontend), à partir du code du frontend (`frontend/src/api/`).
**Objectif :** que le frontend fonctionne en mode réel (`VITE_USE_MOCK=false`) sans modifier les écrans.

Ce document décrit **exactement** ce que le frontend envoie et attend : routes, méthodes, rôles, corps JSON, codes HTTP, format du JWT, CORS. Tout ce qui est marqué **« à décider »** doit être tranché en équipe avant l'intégration.

---

## 1. Résumé en une page

| Sujet            | Ce que le frontend fait aujourd'hui                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| Adresse de l'API | Un seul point d'entrée : la gateway, `VITE_API_URL` (défaut `http://localhost:8080`)                 |
| Authentification | `POST /auth/login` et `POST /auth/register` renvoient `{ "token": "<JWT>" }`                         |
| Jeton            | Stocké dans `localStorage` (clé `bloodlink_token`), envoyé en `Authorization: Bearer <JWT>`          |
| Rôles            | `DONNEUR`, `CENTRE` (`ADMIN` prévu) ; lus dans le JWT                                                |
| Format           | JSON, `Content-Type: application/json`, dates ISO 8601                                               |
| Erreurs          | `401` → déconnexion automatique ; autre code non 2xx → message générique « Une erreur est survenue » |
| Origine du front | `http://localhost:5173` (dev et conteneur Docker) → **CORS obligatoire sur la gateway**              |
| Routes appelées  | **22** (liste complète en section 5)                                                                 |

Le frontend ne connaît **que la gateway**. Il n'appelle jamais directement un microservice, ni le matching-service, ni Kafka.

---

## 2. Lancer le frontend contre le backend

```bash
cd frontend
npm install --legacy-peer-deps
```

Créer `frontend/.env` :

```env
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8080
```

```bash
npm run dev
```

Le frontend est sur http://localhost:5173. Avec `VITE_USE_MOCK=false`, les boutons de démonstration disparaissent et toutes les requêtes partent vers la gateway.

Avec Docker (voir `frontend/README.md`) :

```bash
docker build --build-arg VITE_USE_MOCK=false --build-arg VITE_API_URL=http://localhost:8080 -t bloodlink-frontend .
docker run -p 5173:8080 -e API_ORIGIN=http://localhost:8080 bloodlink-frontend
```

`API_ORIGIN` doit être l'adresse de la gateway vue par le **navigateur** : la politique de sécurité du site (CSP) bloque tout appel vers une autre origine.

---

## 3. Authentification et JWT (Membre 1)

### 3.1 Contenu du JWT attendu

Le frontend décode la partie centrale du jeton (base64url) et lit **trois champs** :

```json
{
  "sub": "42",
  "role": "DONNEUR",
  "exp": 1794000000
}
```

| Champ      | Type                             | Obligatoire | Utilisation dans le front                                                                                                                   |
| ---------- | -------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `sub`      | chaîne                           | oui         | Identifiant de l'utilisateur                                                                                                                |
| `role`     | `DONNEUR` \| `CENTRE` \| `ADMIN` | oui         | Redirection après connexion, gardes de pages                                                                                                |
| `exp`      | nombre (secondes Unix)           | oui         | Déconnexion automatique à l'expiration                                                                                                      |
| `roles`    | tableau                          | non         | Accepté à la place de `role` : le front prend `roles[0]`                                                                                    |
| `centreId` | nombre                           | proposé     | Pour un compte CENTRE : le centre de ce membre du personnel. Le front ne le lit pas, mais les services en ont besoin pour `/api/centers/me` |

Code côté front : `frontend/src/api/session.ts` (`decodeToken`, `isTokenExpired`).

Si le jeton est illisible, si le rôle n'est pas dans la liste ou si `exp` manque, **le front refuse le jeton** et reste déconnecté.

### 3.2 `POST /auth/register` — inscription d'un donneur

Public. Corps envoyé :

```json
{
  "nom": "Salma Bennani",
  "email": "salma.bennani@exemple.ma",
  "telephone": "+212 661 23 45 67",
  "password": "motdepasse2026",
  "groupeSanguin": "A-",
  "sexe": "F",
  "dateNaissance": "1998-03-21",
  "poids": 58,
  "latitude": 33.5731,
  "longitude": -7.5898
}
```

Réponse attendue : `200` ou `201` avec `{ "token": "<JWT rôle DONNEUR>" }`. Le front connecte directement le donneur.

Règles déjà vérifiées par le front (le backend doit **les revérifier**, le front n'est jamais une barrière de sécurité) :

| Champ                   | Règle                                                                            |
| ----------------------- | -------------------------------------------------------------------------------- |
| `nom`                   | 2 à 100 caractères                                                               |
| `email`                 | e-mail valide, 255 caractères max                                                |
| `telephone`             | mobile marocain : `+212 6…`, `+212 7…`, `06…` ou `07…` (regex : `^(?:\+212[\s-]? | 0)[67](?:[\s-]?\d){8}$`) |
| `password`              | 8 à 128 caractères                                                               |
| `groupeSanguin`         | `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`                                 |
| `sexe`                  | `M` ou `F` (nécessaire au calcul de l'éligibilité)                               |
| `dateNaissance`         | `YYYY-MM-DD`, âge entre 18 et 65 ans (valeur de référence à confirmer)           |
| `poids`                 | 50 kg minimum (valeur de référence à confirmer)                                  |
| `latitude`, `longitude` | coordonnées de la ville choisie dans la liste                                    |

Erreurs : e-mail déjà utilisé → `409` ; données invalides → `400`. Le front affiche aujourd'hui un message générique dans les deux cas.

### 3.3 `POST /auth/login` — connexion (donneur et centre)

Public. Corps :

```json
{ "email": "crts.casablanca@sante.gov.ma", "password": "********" }
```

Réponse : `{ "token": "<JWT>" }`. Le rôle du jeton décide de la page d'arrivée :

| `role`    | Page                |
| --------- | ------------------- |
| `DONNEUR` | `/donor/profile`    |
| `CENTRE`  | `/center/dashboard` |

Mauvais identifiants → `401`.

L'onglet « Centre de transfusion » de la page de connexion ne change **rien** à la requête : c'est le backend qui décide du rôle.

### 3.4 Comptes des centres — **à décider**

Un centre **ne doit pas pouvoir s'inscrire seul** : le front ne propose l'inscription qu'aux donneurs et affiche « Les comptes des centres sont créés par l'administrateur BloodLink ». Il manque donc dans le backlog :

- une table des comptes du personnel (e-mail, mot de passe haché, rôle `CENTRE`, `centreId`) ;
- un moyen de les créer (script SQL de départ, ou écran administrateur plus tard).

**Proposition :** les comptes sont dans le même service que l'authentification (donor-service ou un module auth de la gateway), avec un rôle et un `centreId`. Les fichiers `frontend/seed/sql/` peuvent servir de base pour les créer.

### 3.5 Ce que la gateway doit faire avec le JWT

1. Vérifier la signature et l'expiration sur toutes les routes sauf `/auth/**` et `/api/public/**`.
2. Renvoyer `401` si le jeton est absent, invalide ou expiré (le front déconnecte alors l'utilisateur).
3. Renvoyer `403` si le rôle n'a pas le droit d'appeler la route (exemple : un DONNEUR sur `/api/centers/me`).
4. Transmettre l'identité aux services, par exemple dans des en-têtes `X-User-Id`, `X-User-Role`, `X-Centre-Id`. Les routes `/me` du front reposent entièrement là-dessus : **le front n'envoie jamais d'identifiant de donneur ou de centre dans l'URL**. Un utilisateur ne peut ainsi pas lire les données d'un autre.

---

## 4. Règles communes à toutes les routes

### 4.1 Requête

```http
GET /api/donors/me HTTP/1.1
Host: localhost:8080
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json
```

### 4.2 Codes HTTP

| Code                              | Effet dans le front                                         |
| --------------------------------- | ----------------------------------------------------------- |
| `200`, `201`                      | Lecture du JSON                                             |
| `204`                             | Accepté, pas de corps lu                                    |
| `401`                             | Le jeton est supprimé, l'utilisateur est renvoyé à `/login` |
| `400`, `403`, `404`, `409`, `5xx` | Message « Une erreur est survenue. Réessayez. »             |

**Proposition :** renvoyer les erreurs sous la forme `{ "code": "EMAIL_DEJA_UTILISE", "message": "..." }`. Le front pourra alors afficher un message précis et traduit.

### 4.3 Formats

| Donnée                         | Format attendu                                                      | Exemple                                                                    |
| ------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Date seule                     | `YYYY-MM-DD` (`LocalDate`)                                          | `"2026-06-12"`                                                             |
| Date et heure                  | ISO 8601 ; de préférence avec fuseau (`OffsetDateTime` / `Instant`) | `"2026-11-10T14:00:00Z"`                                                   |
| Date envoyée par un formulaire | `YYYY-MM-DDTHH:mm`, **sans fuseau**, heure du Maroc                 | `"2026-11-10T14:00"` → à lire comme `LocalDateTime` en `Africa/Casablanca` |
| Identifiants                   | nombres                                                             | `42`                                                                       |
| Coordonnées                    | nombres décimaux                                                    | `33.5731`                                                                  |

Le front affiche toutes les dates au format `JJ/MM/AAAA` dans le fuseau `Africa/Casablanca`.

### 4.4 Groupes sanguins — **à décider**

Le front utilise partout `"A+"`, `"O-"`… Le request-service (Sprint 1) utilise l'enum Java `A_POSITIF`, `O_NEGATIF`… Deux solutions :

**Solution A (recommandée), côté backend :** garder les constantes Java, mais les sérialiser en `"A+"` dans le JSON. Rien à changer dans la base ni dans les événements Kafka.

```java
public enum GroupeSanguin {
    A_POSITIF("A+"), A_NEGATIF("A-"), B_POSITIF("B+"), B_NEGATIF("B-"),
    AB_POSITIF("AB+"), AB_NEGATIF("AB-"), O_POSITIF("O+"), O_NEGATIF("O-");

    private final String label;

    GroupeSanguin(String label) { this.label = label; }

    @JsonValue
    public String getLabel() { return label; }

    @JsonCreator
    public static GroupeSanguin fromLabel(String value) {
        for (GroupeSanguin g : values()) {
            if (g.label.equals(value) || g.name().equals(value)) return g;
        }
        throw new IllegalArgumentException("Groupe sanguin inconnu : " + value);
    }
}
```

**Solution B, côté frontend :** un fichier de traduction dans `src/api/` qui convertit `"A+"` ↔ `"A_POSITIF"` à l'aller et au retour. Le Membre 4 peut l'écrire en une demi-journée une fois les DTO définitifs connus.

Le même choix vaut pour l'urgence (voir 5.3).

---

## 5. Toutes les routes appelées par le frontend

Le rôle indiqué est celui que la gateway doit exiger. « Public » veut dire sans jeton.

### 5.1 Tableau récapitulatif et routage proposé pour la gateway

| #   | Méthode et route                          | Rôle    | Service proposé                        | Écran                                  |
| --- | ----------------------------------------- | ------- | -------------------------------------- | -------------------------------------- |
| 1   | `POST /auth/register`                     | Public  | donor-service (ou auth)                | Inscription                            |
| 2   | `POST /auth/login`                        | Public  | donor-service (ou auth)                | Connexion                              |
| 3   | `GET /api/donors/me`                      | DONNEUR | donor-service                          | Profil, alertes                        |
| 4   | `PUT /api/donors/me`                      | DONNEUR | donor-service                          | Profil                                 |
| 5   | `GET /api/donors/me/eligibility`          | DONNEUR | donor-service                          | Profil (compte à rebours)              |
| 6   | `GET /api/donors/me/donations`            | DONNEUR | **request-service**                    | Profil (historique)                    |
| 7   | `GET /api/donors/me/alerts`               | DONNEUR | **request-service**                    | Mes alertes                            |
| 8   | `POST /api/requests/{id}/respond`         | DONNEUR | request-service                        | Mes alertes                            |
| 9   | `GET /api/requests`                       | CENTRE  | request-service                        | Tableau de bord, demandes, réponses    |
| 10  | `POST /api/requests`                      | CENTRE  | request-service                        | Demandes urgentes                      |
| 11  | `GET /api/requests/{id}/responses`        | CENTRE  | request-service                        | Réponses des donneurs, tableau de bord |
| 12  | `POST /api/donations/{id}/validate`       | CENTRE  | request-service                        | Réponses des donneurs                  |
| 13  | `GET /api/centers/me`                     | CENTRE  | center-service                         | Tableau de bord, carte                 |
| 14  | `PUT /api/centers/me`                     | CENTRE  | center-service                         | (prévu, pas encore d'écran)            |
| 15  | `GET /api/centers/me/stock`               | CENTRE  | center-service                         | Tableau de bord, stock                 |
| 16  | `PUT /api/centers/me/stock/{id}`          | CENTRE  | center-service                         | Stock (seuil d'alerte)                 |
| 17  | `GET /api/centers/me/nearby-donors`       | CENTRE  | center-service → donor-service (Feign) | Carte des donneurs                     |
| 18  | `GET /api/centers/me/stats`               | CENTRE  | center-service (+ request-service)     | Statistiques                           |
| 19  | `GET /api/public/reserves`                | Public  | center-service                         | Accueil, page Réserves, profil donneur |
| 20  | `GET /api/loyalty/me`                     | DONNEUR | loyalty-service                        | Ma fidélité                            |
| 21  | `GET /api/loyalty/rewards`                | DONNEUR | loyalty-service                        | Ma fidélité                            |
| 22  | `POST /api/loyalty/rewards/{id}/exchange` | DONNEUR | loyalty-service                        | Ma fidélité                            |

**Ordre des règles dans la gateway :** les routes 6 et 7 commencent par `/api/donors/me/` mais vont au **request-service** (c'est lui qui connaît les dons et les demandes). Elles doivent être déclarées **avant** la règle générale `/api/donors/**`.

Exemple pour Spring Cloud Gateway (`application.yml`) :

```yaml
spring:
  cloud:
    gateway:
      routes:
        # 1. Routes particulières d'abord
        - id: donor-alerts-and-donations
          uri: lb://REQUEST-SERVICE
          predicates:
            - Path=/api/donors/me/alerts,/api/donors/me/donations
        # 2. Puis les règles générales
        - id: auth
          uri: lb://DONOR-SERVICE
          predicates:
            - Path=/auth/**
        - id: donors
          uri: lb://DONOR-SERVICE
          predicates:
            - Path=/api/donors/**
        - id: requests
          uri: lb://REQUEST-SERVICE
          predicates:
            - Path=/api/requests/**,/api/donations/**
        - id: centers
          uri: lb://CENTER-SERVICE
          predicates:
            - Path=/api/centers/**,/api/public/**
        - id: loyalty
          uri: lb://LOYALTY-SERVICE
          predicates:
            - Path=/api/loyalty/**
```

Les noms `lb://…` doivent correspondre aux noms enregistrés dans Eureka (`spring.application.name`).

### 5.2 Donneur — donor-service (Membre 1)

#### `GET /api/donors/me`

```json
{
  "id": 1,
  "nom": "Youssef El Amrani",
  "email": "youssef@example.ma",
  "telephone": "+212 612 34 56 78",
  "groupeSanguin": "O+",
  "sexe": "M",
  "dateNaissance": "1995-04-17",
  "poids": 74,
  "latitude": 33.5831,
  "longitude": -7.5998,
  "dateDernierDon": "2026-06-12",
  "statutEligibilite": "ELIGIBLE",
  "ville": "Casablanca"
}
```

| Champ               | Obligatoire           | Remarque                                                                                                                                            |
| ------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `statutEligibilite` | oui                   | `ELIGIBLE` ou `NON_ELIGIBLE`                                                                                                                        |
| `dateDernierDon`    | oui, peut être `null` | `null` = n'a jamais donné                                                                                                                           |
| `sexe`              | recommandé            | `M` / `F`                                                                                                                                           |
| `ville`             | non                   | Affichée sur la carte de donneur. Valeurs reconnues et traduites : `Casablanca`, `Rabat`, `Marrakech`, `Fes`, `Tanger`, `Agadir`, `Oujda`, `Meknes` |

**Données sensibles :** ce service ne doit renvoyer **que** les données du donneur connecté (identité lue dans le JWT, jamais dans l'URL). Le téléphone et la date de naissance sont des données personnelles (loi 09-08, CNDP) : à chiffrer au repos (SCRUM-102).

#### `PUT /api/donors/me`

Même corps que l'inscription, **sans** `password`. Réponse : le donneur mis à jour (même format que `GET`).

#### `GET /api/donors/me/eligibility`

```json
{ "eligible": false, "dateEligibilite": "2026-08-11" }
```

`dateEligibilite` = date à partir de laquelle le donneur peut de nouveau donner (date du dernier don + délai). Le front en déduit le compte à rebours « Prochain don possible dans N jours ». Délais de référence : **60 jours pour un homme, 90 pour une femme** (à confirmer avec le professeur). Si le donneur n'a jamais donné : `eligible: true`.

L'éligibilité doit être **recalculée après chaque don validé** (événement Kafka `don-valide`, SCRUM-73).

### 5.3 Demandes et dons — request-service (Membre 2)

#### Objet « demande » attendu par le front

```json
{
  "id": 1,
  "centreId": 1,
  "groupeSanguinDemande": "O+",
  "quantiteNecessaire": 12,
  "urgence": "CRITIQUE",
  "statut": "ACTIVE",
  "dateCreation": "2026-11-06T08:15:00Z",
  "dateExpiration": "2026-11-10T18:00:00Z",
  "centre": {
    "id": 1,
    "nom": "Centre Régional de Transfusion Sanguine de Casablanca",
    "adresse": "Quartier des Hôpitaux, Casablanca",
    "latitude": 33.5779,
    "longitude": -7.6185,
    "telephone": "+212 522 10 30 40"
  },
  "reponse": "CONFIRME"
}
```

| Champ            | Obligatoire                          | Valeurs                                                                               |
| ---------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| `urgence`        | oui                                  | `NORMALE`, `URGENTE`, `CRITIQUE`                                                      |
| `statut`         | oui                                  | `ACTIVE`, `EXPIREE` (d'autres valeurs sont affichées telles quelles)                  |
| `dateExpiration` | oui                                  | Le front grise une demande expirée et cache les boutons de réponse                    |
| `centre`         | **oui pour `/api/donors/me/alerts`** | Le donneur voit le nom, l'adresse et la distance du centre. Voir ci-dessous           |
| `reponse`        | non                                  | Pour les alertes du donneur : sa réponse s'il a déjà répondu (`CONFIRME` / `DECLINE`) |

**Écarts avec le request-service actuel (rapport du Sprint 1) — à aligner :**

| Front (contrat)                         | request-service actuel                     | Proposition                                                                                                                     |
| --------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `groupeSanguinDemande: "A+"`            | `GroupeSanguin.A_POSITIF`                  | `@JsonValue` (section 4.4)                                                                                                      |
| `urgence: NORMALE / URGENTE / CRITIQUE` | `niveauUrgence: NORMAL / ELEVE / CRITIQUE` | Renommer dans le DTO REST, ou adaptateur front                                                                                  |
| `quantiteNecessaire`                    | `quantiteRequise`                          | `@JsonProperty("quantiteNecessaire")` dans le DTO                                                                               |
| `dateExpiration`                        | absent                                     | **À ajouter** : sans date limite, une demande urgente ne se termine jamais. SCRUM-79 (expiration automatique) en a besoin       |
| `statut: ACTIVE / EXPIREE`              | statuts différents                         | Publier la liste réelle pour que le front les traduise                                                                          |
| `centre` (objet)                        | seulement `centreId`                       | Le request-service peut appeler le center-service (OpenFeign) ou recopier nom/adresse/coordonnées dans la demande à sa création |

Exemple de DTO REST aligné, sans toucher à l'entité :

```java
public record DemandeResponse(
        Long id,
        Long centreId,
        @JsonProperty("groupeSanguinDemande") GroupeSanguin groupeSanguin,
        @JsonProperty("quantiteNecessaire") int quantiteRequise,
        @JsonProperty("urgence") String urgence,        // NORMALE | URGENTE | CRITIQUE
        String statut,                                   // ACTIVE | EXPIREE
        OffsetDateTime dateCreation,
        OffsetDateTime dateExpiration,
        CentreResume centre,                             // id, nom, adresse, latitude, longitude, telephone
        String reponse                                   // null pour le centre
) {}
```

#### `GET /api/requests` (CENTRE)

Les demandes **du centre connecté uniquement** (actives et expirées), les plus récentes d'abord. Tableau d'objets « demande ».

#### `POST /api/requests` (CENTRE)

```json
{
  "groupeSanguinDemande": "AB+",
  "quantiteNecessaire": 3,
  "urgence": "CRITIQUE",
  "dateExpiration": "2026-11-10T14:00"
}
```

`centreId` n'est **pas** envoyé : le backend le prend dans le JWT. Réponse : la demande créée (`201`). Le service publie ensuite l'événement Kafka `demande-creee`.

Règles du front : quantité entière de 1 à 10 000 ; `dateExpiration` dans le futur.

#### `GET /api/donors/me/alerts` (DONNEUR)

Les demandes **actives** pour lesquelles le donneur a été sélectionné par le matching (événement `donneurs-trouves`). Tableau d'objets « demande », avec `centre` rempli et `reponse` si le donneur a déjà répondu.

En mode mock, le front reproduit le matching : groupe compatible, demande active, centre à moins de 60 km. En mode réel, **c'est le matching-service qui décide** ; le front affiche simplement la liste reçue.

#### `POST /api/requests/{id}/respond` (DONNEUR)

```json
{ "reponse": "CONFIRME" }
```

Valeurs : `CONFIRME` ou `DECLINE`. Réponse : la demande, avec `reponse` mis à jour. Refuser (`400` ou `409`) si la demande est expirée ou si ce donneur n'a pas été notifié pour cette demande.

Effet attendu : pour `CONFIRME`, un `Don` au statut `PLANIFIE` est créé pour ce donneur et cette demande.

#### `GET /api/requests/{id}/responses` (CENTRE)

Les donneurs notifiés pour une demande **de ce centre** et leur réponse :

```json
[
  {
    "donneur": {
      "id": 57,
      "nom": "Mehdi Ouchen",
      "telephone": "+212 661 22 33 44",
      "groupeSanguin": "O+",
      "statutEligibilite": "ELIGIBLE"
    },
    "reponse": "CONFIRME",
    "don": {
      "id": 100012,
      "donneurId": 57,
      "centreId": 1,
      "demandeId": 1,
      "quantite": 1,
      "datePrelevement": "2026-11-06T09:00:00Z",
      "statut": "PLANIFIE"
    }
  }
]
```

| Champ        | Valeurs                               |
| ------------ | ------------------------------------- |
| `reponse`    | `CONFIRME`, `DECLINE`, `SANS_REPONSE` |
| `don.statut` | `PLANIFIE`, `VALIDE`, `ANNULE`        |

Le bouton « Valider le don » n'apparaît que si `reponse = CONFIRME` et `don.statut ≠ VALIDE`. Le centre n'a besoin que du nom, du téléphone et du groupe du donneur : **ne pas renvoyer** la date de naissance, l'e-mail ni les coordonnées GPS ici (minimisation des données).

#### `POST /api/donations/{id}/validate` (CENTRE)

Pas de corps. `{id}` = `don.id`. Réponse : le don au statut `VALIDE`.

Refuser si le don n'appartient pas au centre connecté, si la réponse n'est pas `CONFIRME` ou si le don est déjà validé.

Effets attendus (événement Kafka `don-valide`) — c'est le cœur du « cycle complet » à montrer en démo :

| Service              | Effet                                                         | Vu dans le front                                 |
| -------------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| center-service       | Stock du groupe + 1 poche                                     | Tableau de bord, page Stock                      |
| donor-service        | `dateDernierDon` = aujourd'hui, `statutEligibilite` recalculé | Profil : « Prochain don possible dans 60 jours » |
| loyalty-service      | + points, niveau recalculé                                    | Ma fidélité                                      |
| notification-service | Message de confirmation au donneur                            | (e-mail/SMS simulé)                              |

#### `GET /api/donors/me/donations` (DONNEUR)

Historique des dons du donneur connecté :

```json
[
  {
    "id": 3,
    "donneurId": 1,
    "centreId": 1,
    "demandeId": 0,
    "quantite": 1,
    "datePrelevement": "2026-06-12",
    "statut": "VALIDE",
    "centre": {
      "id": 1,
      "nom": "Centre Régional de Transfusion Sanguine de Casablanca",
      "adresse": "Quartier des Hôpitaux, Casablanca",
      "latitude": 33.5779,
      "longitude": -7.6185,
      "telephone": "+212 522 10 30 40"
    }
  }
]
```

`centre.nom` est affiché ; sans `centre`, le front affiche `#centreId`. `demandeId` peut être `0` ou `null` pour un don spontané.

### 5.4 Centres et stock — center-service (Membre 3)

#### `GET /api/centers/me` (CENTRE)

```json
{
  "id": 1,
  "nom": "Centre Régional de Transfusion Sanguine de Casablanca",
  "adresse": "Quartier des Hôpitaux, Casablanca",
  "latitude": 33.5779,
  "longitude": -7.6185,
  "telephone": "+212 522 10 30 40",
  "ville": "Casablanca",
  "region": "Casablanca-Settat"
}
```

`ville` et `region` sont facultatifs (`ville` est utilisé sur la page publique, avec les mêmes valeurs qu'en 5.2).

#### `PUT /api/centers/me` (CENTRE)

Même objet. Prévu dans la couche API, pas encore d'écran.

#### `GET /api/centers/me/stock` (CENTRE)

Une ligne par groupe sanguin (8 lignes) :

```json
[
  {
    "id": 1,
    "centreId": 1,
    "groupeSanguin": "O+",
    "quantitePoches": 47,
    "seuilAlerte": 48,
    "dateMAJ": "2026-11-06T08:00:00Z"
  }
]
```

Le front calcule lui-même le niveau affiché :

| Niveau    | Condition                          |
| --------- | ---------------------------------- |
| Critique  | `quantitePoches ≤ seuilAlerte / 2` |
| Bas       | `quantitePoches ≤ seuilAlerte`     |
| Suffisant | au-dessus du seuil                 |

(Le seuil « moitié du seuil d'alerte » est un choix d'affichage, pas une règle médicale.)

#### `PUT /api/centers/me/stock/{id}` (CENTRE)

```json
{ "seuilAlerte": 30 }
```

Entier de 0 à 10 000. Réponse : la ligne de stock mise à jour. **Le front n'envoie jamais la quantité** : elle ne change que par un don validé (`don-valide`), ce qui garantit la traçabilité. Refuser si la ligne n'appartient pas au centre connecté.

#### `GET /api/centers/me/nearby-donors` (CENTRE)

Donneurs autour du centre, pour la carte :

```json
[
  {
    "id": 57,
    "nom": "Mehdi Ouchen",
    "groupeSanguin": "O+",
    "telephone": "+212 661 22 33 44",
    "latitude": 33.58,
    "longitude": -7.61,
    "statutEligibilite": "ELIGIBLE"
  }
]
```

Rayon utilisé par le mock : **15 km** (à décider). Ici, le center-service n'a pas les donneurs : il peut appeler le donor-service avec **OpenFeign** (`GET /internal/donors/nearby?lat=…&lng=…&radiusKm=15`). C'est un deuxième exemple de **communication synchrone** à montrer au professeur, en plus du matching → donor.

**Données sensibles :** coordonnées GPS précises + nom + téléphone. À discuter : arrondir les coordonnées (environ 500 m) pour la carte et tracer chaque consultation dans l'audit trail (SCRUM-109).

#### `GET /api/centers/me/stats` (CENTRE)

```json
{
  "monthly": [
    { "month": 5, "dons": 31 },
    { "month": 6, "dons": 34 },
    { "month": 7, "dons": 29 },
    { "month": 8, "dons": 27 },
    { "month": 9, "dons": 24 },
    { "month": 10, "dons": 28 }
  ],
  "stock": [
    {
      "id": 1,
      "centreId": 1,
      "groupeSanguin": "O+",
      "quantitePoches": 47,
      "seuilAlerte": 48,
      "dateMAJ": "2026-11-06T08:00:00Z"
    }
  ]
}
```

`monthly` : dons **validés** du centre sur les 6 derniers mois complets, du plus ancien au plus récent, `month` de 1 à 12 (le front affiche le nom du mois dans la langue choisie). Les dons sont dans le request-service : le center-service peut les compter à partir de l'événement `don-valide`, ou appeler le request-service. **À décider.**

#### `GET /api/public/reserves` (Public) — **nouvelle route**

Utilisée sans connexion par la page d'accueil, la page « Réserves de sang » et le profil donneur (centres proches). **Aucune donnée personnelle.**

```json
[
  {
    "centre": {
      "id": 1,
      "nom": "Centre Régional de Transfusion Sanguine de Casablanca",
      "adresse": "Quartier des Hôpitaux, Casablanca",
      "latitude": 33.5779,
      "longitude": -7.6185,
      "telephone": "+212 522 10 30 40",
      "ville": "Casablanca",
      "region": "Casablanca-Settat"
    },
    "stock": [
      { "groupeSanguin": "O+", "quantitePoches": 47, "seuilAlerte": 48 },
      { "groupeSanguin": "A+", "quantitePoches": 26, "seuilAlerte": 38 }
    ]
  }
]
```

Une entrée par centre, 8 groupes par centre. Route sans authentification : la gateway doit la laisser passer et **limiter le débit** (rate limiting, SCRUM-104). Elle peut être mise en cache quelques minutes.

### 5.5 Fidélité — loyalty-service (Membre 3)

#### `GET /api/loyalty/me` (DONNEUR)

```json
{
  "id": 1,
  "donneurId": 1,
  "pointsActuels": 350,
  "niveau": "Or",
  "nombreDonsTotal": 5,
  "progression": 0,
  "prochainNiveau": "Platine",
  "pointsProchainNiveau": 500
}
```

| Champ                                    | Obligatoire | Remarque                                                                              |
| ---------------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `pointsActuels`                          | oui         | Points disponibles (après échanges)                                                   |
| `niveau`                                 | oui         | Affiché tel quel. Valeurs utilisées par le mock : `Bronze`, `Argent`, `Or`, `Platine` |
| `nombreDonsTotal`                        | oui         |                                                                                       |
| `progression`                            | non         | 0 à 100, barre vers le niveau suivant                                                 |
| `prochainNiveau`, `pointsProchainNiveau` | non         | « N points avant Platine »                                                            |

Valeurs de référence du mock (à confirmer) : **100 points par don validé** ; niveaux selon les points cumulés : Bronze 0, Argent 200, Or 500, Platine 1000.

#### `GET /api/loyalty/rewards` (DONNEUR)

```json
[
  {
    "id": 1,
    "nom": "Bilan santé",
    "description": "Un bilan de santé chez un partenaire.",
    "coutPoints": 250,
    "type": "SANTE",
    "stockDisponible": 8,
    "translationKey": "reward1"
  }
]
```

`translationKey` est facultatif : s'il est présent et connu du front (`reward1`, `reward2`, `reward3`), le nom et la description sont traduits ; sinon `nom` et `description` sont affichés tels quels.

#### `POST /api/loyalty/rewards/{id}/exchange` (DONNEUR)

Pas de corps. Réponse :

```json
{
  "id": 1,
  "donneurId": 1,
  "recompenseId": 3,
  "dateEchange": "2026-11-06T10:00:00Z",
  "statut": "DISPONIBLE",
  "codeUtilisation": "IDA-3F611D81"
}
```

Le front affiche `codeUtilisation` et retire `coutPoints` du solde affiché. Refuser (`400`/`409`) si les points sont insuffisants ou le stock épuisé. Le code doit être **à usage unique** et généré côté serveur de façon imprévisible (`SecureRandom`).

---

## 6. CORS (gateway, Membre 1)

Le navigateur bloque toute requête si la gateway n'autorise pas l'origine du front.

```yaml
spring:
  cloud:
    gateway:
      globalcors:
        cors-configurations:
          "[/**]":
            allowedOrigins:
              - "http://localhost:5173"
            allowedMethods: [GET, POST, PUT, DELETE, OPTIONS]
            allowedHeaders: [Authorization, Content-Type]
            maxAge: 3600
```

Ne pas mettre `allowedOrigins: "*"` : c'est une faille classique signalée par les outils d'analyse de sécurité.

---

## 7. Communication synchrone et asynchrone visible dans le front

Pour la soutenance, le professeur demande de montrer les deux modes. Voici où on les voit depuis l'interface :

| Action dans le front             | Synchrone (REST / Feign)                                                               | Asynchrone (Kafka)                                             |
| -------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Le centre publie une demande     | `POST /api/requests` → réponse immédiate                                               | `demande-creee` → matching → `donneurs-trouves` → notification |
| Le donneur ouvre « Mes alertes » | `GET /api/donors/me/alerts`                                                            | Les alertes existent grâce à `donneurs-trouves`                |
| Le centre valide un don          | `POST /api/donations/{id}/validate`                                                    | `don-valide` → stock, éligibilité, points, notification        |
| Le centre ouvre la carte         | `GET /api/centers/me/nearby-donors` → center-service **appelle** donor-service (Feign) | —                                                              |

**Proposition pour rendre l'asynchrone visible :** ajouter un flux **SSE** (Server-Sent Events, cité dans le cours comme communication asynchrone) côté notification-service, `GET /api/notifications/stream`, qui pousse les événements au tableau de bord du centre (« 12 donneurs trouvés », « Don validé »). Le front peut l'afficher en direct. **À décider** selon le temps disponible.

---

## 8. Données de test (SCRUM-71)

Le script `frontend/scripts/generate-seed.mjs` (`npm run seed`) génère, avec une graine fixe :

- 8 centres (CNTS Rabat, CRTS Casablanca, Fès, Marrakech, Tanger, Agadir, Oujda, Meknès) ;
- 600 donneurs fictifs (500 à 2000), surtout autour de Casablanca et Rabat ;
- 24 mois d'historique de dons, le stock et les seuils, des demandes et des réponses.

Fichiers prêts à charger : `frontend/seed/sql/donor-service.sql`, `center-service.sql`, `request-service.sql`, `loyalty-service.sql`. **Chaque membre doit vérifier les noms de tables et de colonnes** avec ses entités avant de les charger (convention Spring/JPA par défaut). Détails : `frontend/seed/README.md`.

---

## 9. Ce que le front a déjà côté sécurité (SCRUM-111)

| Mesure                                                                                                       | Où                                         |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Chaque page donneur ou centre est protégée par le rôle du JWT ; mauvais rôle → renvoi vers son propre espace | `src/components/role-guard.tsx`            |
| Jeton expiré ou réponse `401` → déconnexion                                                                  | `src/api/client.ts`, `src/api/session.ts`  |
| Vérification de la session toutes les 30 secondes                                                            | `role-guard.tsx`                           |
| Le front n'envoie jamais d'identifiant d'utilisateur dans l'URL (routes `/me`)                               | `src/api/*.ts`                             |
| Validation des formulaires (Zod)                                                                             | `src/api/validation.ts`                    |
| Image Docker Nginx non root, CSP, `X-Frame-Options`, `nosniff`                                               | `Dockerfile`, `docker/nginx.conf.template` |
| QR code de la carte de donneur : numéro de donneur seulement                                                 | `src/components/donor/donor-card.tsx`      |

Limites à connaître :

- Le JWT est dans `localStorage`, donc lisible par un script en cas de faille XSS. La CSP stricte réduit ce risque. Alternative plus sûre, à discuter : cookie `HttpOnly` posé par la gateway.
- Le front vérifie le rôle **pour l'affichage**. La vraie protection est dans la gateway et les services.

---

## 10. Checklist d'intégration par membre

### Membre 1 — gateway, sécurité, donor-service

- [ ] JWT avec `sub`, `role` (`DONNEUR`/`CENTRE`), `exp`, et `centreId` pour les centres (3.1)
- [ ] `POST /auth/register` et `POST /auth/login` renvoient `{ "token": … }` (3.2, 3.3)
- [ ] Comptes CENTRE créés par un script ou un administrateur (3.4)
- [ ] Gateway : vérification du JWT, `401`/`403`, en-têtes d'identité vers les services (3.5)
- [ ] Routage dans l'ordre de la section 5.1 (alertes et dons du donneur vers request-service)
- [ ] CORS pour `http://localhost:5173` (6)
- [ ] `GET/PUT /api/donors/me`, `GET /api/donors/me/eligibility` avec `sexe` et délais (5.2)
- [ ] Recalcul de l'éligibilité sur `don-valide`

### Membre 2 — request-service, matching

- [ ] Choix A ou B pour les groupes sanguins et l'urgence (4.4, 5.3)
- [ ] `dateExpiration` dans les demandes + expiration automatique
- [ ] `centre` rempli dans les demandes envoyées au donneur
- [ ] Routes 6 à 12 de la section 5.1
- [ ] Création d'un `Don` `PLANIFIE` à la confirmation, publication de `don-valide` à la validation

### Membre 3 — center, notification, loyalty

- [ ] Routes 13 à 22 de la section 5.1, dont la nouvelle route publique `GET /api/public/reserves`
- [ ] Stock + 1 sur `don-valide` ; la quantité n'est jamais modifiable par l'API
- [ ] Points + niveau sur `don-valide`
- [ ] Statistiques mensuelles (`monthly`) : source des dons à décider (5.4)
- [ ] Optionnel : flux SSE de notifications pour le tableau de bord (7)

### Membre 4 — frontend

- [ ] Adapter `src/api/` si la solution B est choisie pour les noms (4.4)
- [ ] Afficher les messages d'erreur précis quand le backend renverra `{ code, message }`
- [ ] Tester chaque écran en `VITE_USE_MOCK=false` et lancer les tests de bout en bout contre docker-compose (SCRUM-101)

---

## 11. Où regarder dans le code du frontend

| Fichier                                                                               | Contenu                                                                          |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/api/client.ts`                                                                   | Client HTTP : URL de base, en-tête `Authorization`, gestion du `401`             |
| `src/api/session.ts`                                                                  | Lecture du JWT, expiration, page d'accueil selon le rôle                         |
| `src/api/models.ts`                                                                   | Types TypeScript de tous les objets JSON de ce document                          |
| `src/api/validation.ts`                                                               | Règles de validation des formulaires                                             |
| `src/api/authApi.ts`, `donorApi.ts`, `requestApi.ts`, `centerApi.ts`, `loyaltyApi.ts` | Une fonction par route, avec la version mock et la version réelle côte à côte    |
| `src/api/mock.ts`                                                                     | Le comportement attendu du backend, simulé : bon modèle pour écrire les services |
| `e2e/parcours.spec.ts`                                                                | Le parcours complet testé automatiquement (7 tests)                              |
