# Supabase Local

Ce dépôt prend en charge un seul mode backend local officiel : la stack Supabase CLI.

Utilisez-la pour reproduire le comportement réel du projet en local :

- Auth
- API REST
- Edge Functions
- Studio
- Mailpit
- Postgres géré par Supabase
- Schéma géré par Flyway
- chargement optionnel des données de seed

## Commandes

Commandes wrapper du dépôt :

```bash
npm run db:supabase:start
npm run db:supabase:status
npm run db:supabase:stop
npm run db:flyway:migrate
npm run db:flyway:info
npm run db:flyway:validate
npm run db:supabase:seed
```

Équivalents CLI directs :

```bash
npx supabase start
npx supabase status
npx supabase stop
flyway migrate
flyway info
flyway validate
```

Le wrapper Supabase utilise [scripts/local-supabase.ps1](../scripts/local-supabase.ps1).
Les commandes Flyway sont encapsulées par [scripts/flyway.ps1](../scripts/flyway.ps1) et utilisent la CLI Flyway locale si disponible, sinon Docker.

## Endpoints Locaux Actuels

- URL API : `http://127.0.0.1:15421`
- URL DB : `postgresql://postgres:postgres@127.0.0.1:15422/postgres`
- Studio : `http://127.0.0.1:15423`
- Mailpit : `http://127.0.0.1:15424`

Ces ports viennent de [supabase/config.toml](../supabase/config.toml).

## Environnement Frontend

Pour pointer l’application React vers la stack Supabase locale :

```bash
npm run env:supabase:local
```

Cette commande copie `.env.supabase.local.example` vers `.env.local`, que Vite lit en développement local.

Commandes utiles :

```bash
npm run env:supabase:status
npm run env:supabase:remote
```

Notes :

- `.env.local` surcharge `.env`
- redémarrer `npm run dev` après un changement d’environnement
- `.env.local` est local uniquement et ne doit pas être commité

## Versionnage du Schéma

Le versionnage de la base est géré par Flyway depuis [supabase/migrations/V1__baseline.sql](../supabase/migrations/V1__baseline.sql).

Appliquer le schéma après démarrage de Supabase local :

```bash
npm run db:flyway:migrate
```

## Données de Seed

`npm run db:supabase:seed` charge les données de démonstration depuis `supabase/seed.sql` après application du schéma.

Cela inclut notamment :

- compte admin : `admin@powerprestation.com`
- mot de passe admin : `AdminPower123!`
- comptes étudiants de démonstration
- profils étudiants de démonstration
- dossiers étudiants de démonstration
- articles de blog de démonstration

## Notes Paiement

Les tests locaux CinetPay dépendent toujours des secrets backend dans l’environnement des fonctions Supabase :

- `CINETPAY_API_KEY`
- `CINETPAY_SITE_ID`
- `CINETPAY_SECRET_KEY`
- `SITE_URL`

Mode de test réel recommandé :

- `CINETPAY_TEST_MODE=true`
- `CINETPAY_TEST_AMOUNT_XAF=<petit montant multiple de 5>`
- `CINETPAY_TEST_ALLOWED_EMAILS=<comptes de test séparés par des virgules>`
- `CINETPAY_CONSULTATION_AMOUNT_XAF` optionnel pour rendre le montant de production explicite

Comportement :

- quand `CINETPAY_TEST_MODE=true`, seuls les emails autorisés peuvent créer un checkout CinetPay
- le montant facturé devient `CINETPAY_TEST_AMOUNT_XAF`
- le backend refuse la création de checkout si la liste autorisée ou le montant de test manque

`cinetpay-webhook` ne peut pas être appelé par CinetPay si l’environnement local est seulement accessible sur `127.0.0.1`. Utiliser un tunnel pour tester les webhooks réels. Sans tunnel, l’application peut quand même réconcilier le paiement après le retour navigateur vers `/payment-success`.

## Notes Vérification Contact

Le dépôt inclut un parcours de vérification email/SMS via Brevo, désactivé par défaut.

Secrets et interrupteurs serveur :

- `CONTACT_VERIFICATION_ENABLED=false`
- `CONTACT_EMAIL_VERIFICATION_ENABLED=false`
- `CONTACT_SMS_VERIFICATION_ENABLED=false`
- `CONTACT_VERIFICATION_CODE_SECRET=<requis une fois activé>`
- `CONTACT_VERIFICATION_CODE_TTL_MINUTES=10`
- `CONTACT_VERIFICATION_MAX_ATTEMPTS=5`
- `CONTACT_VERIFICATION_RESEND_COOLDOWN_SECONDS=60`
- `BREVO_API_KEY`
- `BREVO_EMAIL_SENDER`
- `BREVO_EMAIL_SENDER_NAME` optionnel
- `BREVO_SMS_SENDER`
- `BREVO_SANDBOX_MODE=true` optionnel pour valider les requêtes email Brevo sans les envoyer

Comportement :

- quand `CONTACT_VERIFICATION_ENABLED=false`, le parcours actuel de création de compte et de connexion ne change pas
- quand il est activé, le formulaire public peut exiger un code email, SMS ou les deux
- la page de connexion détecte une vérification en attente et redirige vers `/verify-contact` avant d’ouvrir le portail

## Simplification Importante

Le dépôt ne fournit plus de stack de développement PostgreSQL + Adminer séparée.

Pour comprendre, tester ou exécuter l’application localement, utiliser uniquement la stack Supabase CLI.
