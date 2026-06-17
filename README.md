# Power Prestation

Power Prestation est une application web React + TypeScript dédiée au conseil en mobilité académique. Elle combine un site marketing multilingue, un parcours de capture de leads, un espace étudiant authentifié, un paiement CinetPay pensé d’abord pour le Cameroun et un back-office administrateur basé sur Supabase.

## Fonctionnalités Principales

- Page publique pour les services, témoignages, FAQ, blog et contact.
- Interface bilingue avec traductions françaises et anglaises.
- Création de lead et création de compte depuis le parcours public d’acquisition.
- Dashboard étudiant avec validation du profil, soumission privée de procédure et dépôt de documents.
- Paiement CinetPay avec vérification serveur et réconciliation par webhook.
- CRM administrateur et gestion du blog bilingue.
- Edge Functions Supabase pour les leads, paiements, vérifications et automatisations de relance.

## Stack Technique

- Vite
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui + Radix UI
- Supabase
- Vitest + Testing Library

## Gestionnaire de Paquets

Utiliser uniquement `npm` dans ce dépôt. `package-lock.json` est la source de vérité.

## Installation Locale

1. Installer les dépendances :

```bash
npm install
```

2. Démarrer la stack Supabase locale :

```bash
npm run db:supabase:start
```

3. Appliquer la baseline Flyway :

```bash
npm run db:flyway:migrate
```

4. Pointer le frontend vers la stack Supabase locale :

```bash
npm run env:supabase:local
```

5. Démarrer l’application :

```bash
npm run dev
```

Le serveur Vite tourne sur `http://localhost:8080`.

Pour revenir aux valeurs `.env` par défaut :

```bash
npm run env:supabase:remote
```

## Commandes Disponibles

- `npm run dev` : démarre le serveur local de développement.
- `npm run build` : génère le bundle de production dans `dist/`.
- `npm run preview` : prévisualise le build de production localement.
- `npm run lint` : lance ESLint.
- `npm run test` : lance Vitest une fois.
- `npm run test:watch` : lance Vitest en mode watch.
- `npm run db:supabase:start` : démarre la stack Supabase locale.
- `npm run db:supabase:status` : affiche le statut et les URLs Supabase locales.
- `npm run db:supabase:stop` : arrête la stack Supabase locale.
- `npm run db:supabase:seed` : charge les données de démonstration depuis `supabase/seed.sql`.
- `npm run db:flyway:migrate` : applique la baseline Flyway sur la base locale.
- `npm run db:flyway:info` : affiche l’état des migrations Flyway.
- `npm run db:flyway:validate` : valide l’ensemble des migrations Flyway.
- `npm run env:supabase:local` : copie les variables frontend locales dans `.env.local`.
- `npm run env:supabase:remote` : désactive `.env.local` pour revenir à `.env`.

## Backend Local Officiel

Ce dépôt utilise un seul mode backend local officiel : la stack Supabase CLI.

Elle inclut :

- Auth locale
- API REST locale
- Edge Functions locales
- Studio local
- Mailpit local
- Postgres Supabase local

Important :

- il n’existe plus de stack PostgreSQL simple séparée dans ce dépôt
- pour exécuter le projet localement de bout en bout, utiliser Supabase CLI avec les commandes Flyway ci-dessus
- la stack locale est configurée dans `supabase/config.toml`

## Structure du Projet

- `src/pages` : écrans de route comme `Index`, `Login`, `Dashboard`, `StartProcedure`, `Checkout` et `PaymentSuccess`.
- `src/components` : sections du site, composants métier et blocs applicatifs partagés.
- `src/components/ui` : primitives shadcn/ui et wrappers locaux.
- `src/components/admin` : interfaces réservées à l’administration.
- `src/lib` : logique frontend partagée pour profils, procédures, sanitisation et logs.
- `src/i18n` : fournisseur de langue et fichiers de traduction.
- `src/integrations/supabase` : client Supabase frontend et types générés.
- `supabase/functions` : Edge Functions utilisées par les parcours leads, paiements et automatisations.
- `supabase/migrations` : migrations SQL Flyway pour le schéma et les règles de sécurité. La baseline actuelle est `V1__baseline.sql`.
- `docs` : guides d’onboarding, architecture, environnement local, production et tests.

## Notes Supabase

- Les identifiants frontend viennent de `.env` ou `.env.local` via `VITE_SUPABASE_*`.
- Les secrets serveur comme `SUPABASE_SERVICE_ROLE_KEY` restent dans l’environnement des fonctions Supabase.
- Les Edge Functions liées au paiement sont configurées dans `supabase/config.toml`.
- La stack Supabase locale démarre depuis la racine du dépôt avec `npm run db:supabase:start`.
- Le versionnage du schéma est géré par Flyway depuis `supabase/migrations/V1__baseline.sql`.
- Les commandes Flyway utilisent le binaire local `flyway` s’il est disponible, sinon l’image Docker `flyway/flyway`.

Secrets CinetPay requis côté serveur :

- `CINETPAY_API_KEY`
- `CINETPAY_SITE_ID`
- `CINETPAY_SECRET_KEY`
- `SITE_URL`

Configuration CinetPay optionnelle :

- `CINETPAY_CONSULTATION_AMOUNT_XAF` : montant de production en XAF, défaut `15625`
- `CINETPAY_USD_REFERENCE` : référence USD informative, défaut `25`
- `CINETPAY_TEST_MODE` : mettre `true` pour verrouiller le paiement en mode test
- `CINETPAY_TEST_AMOUNT_XAF` : requis si le mode test est activé
- `CINETPAY_TEST_ALLOWED_EMAILS` : liste d’emails autorisés, séparés par des virgules, requise en mode test

Vérification contact Brevo optionnelle :

- `CONTACT_VERIFICATION_ENABLED=false` : interrupteur global de vérification par code
- `CONTACT_EMAIL_VERIFICATION_ENABLED=false` : exige un code email quand l’interrupteur global est actif
- `CONTACT_SMS_VERIFICATION_ENABLED=false` : exige un code SMS quand l’interrupteur global est actif
- `CONTACT_VERIFICATION_CODE_SECRET` : requis dès que la vérification personnalisée est active
- `CONTACT_VERIFICATION_CODE_TTL_MINUTES=10`
- `CONTACT_VERIFICATION_MAX_ATTEMPTS=5`
- `CONTACT_VERIFICATION_RESEND_COOLDOWN_SECONDS=60`
- `BREVO_API_KEY`
- `BREVO_EMAIL_SENDER`
- `BREVO_EMAIL_SENDER_NAME` optionnel
- `BREVO_SMS_SENDER`
- `BREVO_SANDBOX_MODE=false` : header sandbox email Brevo optionnel

`cinetpay-webhook` doit être accessible depuis Internet pour recevoir les notifications réelles. En développement local, utiliser un tunnel si un test webhook de bout en bout est nécessaire.

## Documentation Complémentaire

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) : vue d’ensemble de l’architecture et ordre de lecture recommandé.
- [CINETPAY_SETUP.md](docs/CINETPAY_SETUP.md) : configuration des secrets CinetPay en local et à distance.
- [DEVELOP_CHANGES.md](docs/DEVELOP_CHANGES.md) : résumé des corrections et durcissements appliqués sur `develop`.
- [FLOWS.md](docs/FLOWS.md) : parcours produit réel, du formulaire public au dossier étudiant payé.
- [LOCAL_DATABASES.md](docs/LOCAL_DATABASES.md) : workflow Supabase local officiel.
- [SUPABASE_PRODUCTION.md](docs/SUPABASE_PRODUCTION.md) : configuration production complète Supabase, Flyway, auth, secrets, fonctions et vérifications de mise en ligne.
- [TESTING.md](docs/TESTING.md) : commandes de test, état de couverture et stratégie de validation recommandée.
