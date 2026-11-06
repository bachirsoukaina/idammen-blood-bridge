# Données de test BloodLink (SCRUM-71)

Générées par un seul script, reproductible (même graine = mêmes données) :

```bash
npm run seed          # 600 donneurs
npm run seed -- 2000  # entre 500 et 2000 donneurs
```

| Fichier                        | Pour                    | Contenu                                  |
| ------------------------------ | ----------------------- | ---------------------------------------- |
| `src/api/seed-data.json`       | Mode mock du frontend   | Tout, dans le format de l'API            |
| `seed/sql/donor-service.sql`   | Base du donor-service   | Table `donneur`                          |
| `seed/sql/center-service.sql`  | Base du center-service  | Tables `centre`, `stock_sang`            |
| `seed/sql/request-service.sql` | Base du request-service | Tables `demande_don`, `don` (historique) |
| `seed/sql/loyalty-service.sql` | Base du loyalty-service | Table `points_donneur`                   |

## Ce qui est généré

- **8 centres de transfusion** : CNTS Rabat et CRTS de Casablanca, Fès, Marrakech, Tanger, Agadir, Oujda, Meknès.
- **600 donneurs** fictifs, avec des noms marocains, surtout autour de Casablanca (40 %) et Rabat (25 %).
- **Groupes sanguins** selon des proportions approximatives au Maroc : O+ 40 %, A+ 30 %, B+ 14 %, O- 5 %, A- 4 %, AB+ 4 %, B- 2 %, AB- 1 %.
- **Historique des dons** sur 24 mois, en respectant le délai minimum entre deux dons (60 jours pour les hommes, 90 pour les femmes) : certains donneurs sont éligibles, d'autres non.
- **Stock** par centre et par groupe, avec des seuils d'alerte proportionnels à la taille du centre ; certains groupes sont sous le seuil.
- **Demandes urgentes** pour les groupes sous le seuil, et **réponses** de donneurs compatibles et éligibles.

## Avant de charger les SQL dans le backend

- Les noms de tables et de colonnes suivent la convention Spring/JPA par défaut (`groupeSanguin` → `groupe_sanguin`). **Vérifiez-les avec vos entités.**
- Les groupes sanguins sont écrits comme les constantes Java du request-service (`A_POSITIF`, `O_NEGATIF`…).
- Valeurs de référence à confirmer : proportions des groupes, délais entre deux dons, seuils des niveaux de fidélité.
- Toutes les personnes sont fictives : e-mails en `@example.ma`, numéros de téléphone aléatoires. Les adresses des centres sont à vérifier avant tout usage public.
