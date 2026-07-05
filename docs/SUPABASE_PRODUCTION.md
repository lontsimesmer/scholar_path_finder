# Configuration Supabase en Production

Ce document explique comment mettre le backend Supabase en production pour ce dépôt.

Il est écrit pour la structure réelle du projet :

- frontend React hébergé séparément
- projet Supabase comme backend de production
- Flyway comme source de vérité du schéma de base de données
- Edge Functions Supabase pour les leads, paiements, vérifications et automatisations

## Périmètre

Ce guide couvre :

- la création du projet Supabase de production
- la configuration frontend avec les bonnes variables publiques
- la configuration des secrets backend pour les Edge Functions
- l’application des migrations Flyway sur la base distante
- le déploiement des Edge Functions
- la configuration correcte de l’authentification
- la préparation des paiements et de la vérification contact optionnelle
- la validation finale de l’installation

Il ne couvre pas en détail :

- les spécificités de l’hébergeur frontend
- DNS, SMTP ou configuration du registrar
- les plateformes d’observabilité avancées hors Supabase

## Architecture de Production

Pour ce dépôt, la production est divisée en deux parties :

1. le frontend
   - construit depuis `src/`
   - utilise `VITE_SUPABASE_URL`
   - utilise `VITE_SUPABASE_PUBLISHABLE_KEY`

2. le backend
   - Supabase Postgres
   - Supabase Auth
   - Supabase Storage
   - Supabase Edge Functions
   - schéma géré par Flyway depuis `supabase/migrations/V1__baseline.sql`

Règle importante :

- la structure de base doit venir de Flyway
- ne pas modifier le schéma de production manuellement dans Studio sans documenter et répercuter le changement dans Flyway

## 1. Créer le Projet Supabase

Créer un nouveau projet Supabase pour la production.

Après création, conserver ces valeurs :

- `Project URL`
- `Publishable / anon key`
- `Project ref`
- `Database password`
- `Direct database connection details`

Elles seront nécessaires pour :

- les variables d’environnement frontend
- les commandes Supabase CLI
- les migrations Flyway distantes

## 2. Variables Frontend

Le frontend a uniquement besoin des valeurs Supabase publiques.

Définir ces variables dans la plateforme d’hébergement frontend :

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Ne jamais mettre de secrets serveur dans l’environnement frontend.

Ne pas exposer :

- `SUPABASE_SERVICE_ROLE_KEY`
- `CINETPAY_*`
- `BREVO_*`
- tout mot de passe privé de base de données

## 3. Secrets Backend

Tous les secrets backend doivent être stockés dans l’environnement secret du projet Supabase.

### Secrets principaux

Généralement nécessaires en production :

```env
SITE_URL=https://your-domain.com
ADMIN_NOTIFICATION_EMAIL=you@example.com
```

### Secrets paiement

Pour `CinetPay` :

```env
CINETPAY_API_KEY=...
CINETPAY_SITE_ID=...
CINETPAY_SECRET_KEY=...
CINETPAY_CONSULTATION_AMOUNT_XAF=15625
CINETPAY_USD_REFERENCE=25
```

Mode test optionnel :

```env
CINETPAY_TEST_MODE=true
CINETPAY_TEST_AMOUNT_XAF=500
CINETPAY_TEST_ALLOWED_EMAILS=admin@powerprestation.com
```

Documentation paiement détaillée :

- [CINETPAY_SETUP.md](./CINETPAY_SETUP.md)

### Secrets de vérification contact

Uniquement si la vérification par code email/SMS est souhaitée :

```env
CONTACT_VERIFICATION_ENABLED=false
CONTACT_EMAIL_VERIFICATION_ENABLED=false
CONTACT_SMS_VERIFICATION_ENABLED=false
CONTACT_VERIFICATION_CODE_SECRET=generate_a_long_random_secret
CONTACT_VERIFICATION_CODE_TTL_MINUTES=10
CONTACT_VERIFICATION_SESSION_TTL_MINUTES=60
CONTACT_VERIFICATION_MAX_ATTEMPTS=5
CONTACT_VERIFICATION_RESEND_COOLDOWN_SECONDS=60
BREVO_API_KEY=...
BREVO_EMAIL_SENDER=...
BREVO_EMAIL_SENDER_NAME=Power Prestation
BREVO_SMS_SENDER=...
BREVO_SANDBOX_MODE=false
```

Recommandation :

- garder la vérification contact désactivée tant que Brevo et le parcours UX ne sont pas entièrement testés

### Secrets email optionnels

Si les emails de bienvenue/admin reposent encore sur `Resend` dans votre environnement :

```env
RESEND_API_KEY=...
```

### Secrets SMS optionnels

Si un ancien parcours utilise encore `Twilio` :

```env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

## 4. Définir les Secrets de Production

Utiliser la CLI Supabase avec le `project ref` de production.

Exemple :

```bash
npx supabase secrets set \
  --project-ref your-project-ref \
  SITE_URL="https://your-domain.com" \
  ADMIN_NOTIFICATION_EMAIL="you@example.com" \
  CINETPAY_API_KEY="..." \
  CINETPAY_SITE_ID="..." \
  CINETPAY_SECRET_KEY="..."
```

Ajouter les autres secrets de la même manière.

Vous pouvez séparer ces valeurs en plusieurs commandes si c’est plus simple à gérer.

## 5. Configurer Supabase Auth

L’authentification de production doit correspondre au vrai domaine frontend.

Dans les paramètres Auth du dashboard Supabase, configurer :

- `Site URL`
  - exemple : `https://your-domain.com`
- URLs de redirection
  - inclure chaque origine frontend réelle qui doit s’authentifier
  - inclure explicitement `https://your-domain.com/reset-password` pour que le flux "mot de passe oublié" fonctionne (l'allowlist Supabase n'accepte pas de préfixe implicite)
  - inclure les domaines admin ou preview seulement si nécessaire

Pour ce dépôt, l’origine principale de production devrait normalement être la même valeur que `SITE_URL`.

Rester strict :

- ne pas laisser d’URLs de développement en production sauf besoin réel
- supprimer les domaines preview ou test obsolètes

### Template email de réinitialisation

Le fichier local `supabase/templates/recovery.html` sert de source de vérité pour l'email de réinitialisation en dev. En production, Supabase n'importe pas automatiquement les templates du `config.toml` : il faut recopier manuellement le contenu dans le dashboard.

Marche à suivre :

1. dans le dashboard Supabase, aller dans `Authentication → Emails → Templates → Reset Password`
2. remplacer le contenu HTML par le contenu de `supabase/templates/recovery.html`
3. mettre à jour le sujet en `Réinitialisez votre mot de passe — Power Prestation`
4. conserver la variable `{{ .ConfirmationURL }}` telle quelle : Supabase la remplace au moment de l'envoi par une URL PKCE qui redirige vers `${SITE_URL}/reset-password?code=...`
5. envoyer un test depuis le dashboard, cliquer sur le lien et vérifier l'atterrissage sur `/reset-password`

À chaque modification de `supabase/templates/recovery.html` dans le dépôt, refaire la même mise à jour côté dashboard prod.

SMTP requis : sans SMTP custom configuré, Supabase utilise son SMTP par défaut avec un quota strict et un domaine expéditeur `@supabase.io`. Pour un usage réel, configurer un SMTP custom (Brevo, Amazon SES, Postmark…) dans `Authentication → Emails → SMTP settings`.

### Expiration du lien et fréquence de renvoi

Le `supabase/config.toml` local fixe :

```toml
[auth.email]
otp_expiry = 600         # 10 minutes de validité du lien de réinitialisation
max_frequency = "1m"     # 60s minimum entre deux mails pour la même adresse
```

Ces valeurs ne sont **pas** poussées automatiquement en production. À reporter dans le dashboard :

- `Authentication → Email → Email OTP Expiration` : mettre `600` (secondes) — le défaut est `3600`
- `Authentication → Rate limits → Time-based token generation frequency` : mettre `60s` pour aligner sur `max_frequency = "1m"`

Ces limites protègent contre le spam et la force brute sans dégrader l'UX : le frontend `/forgot-password` affiche toujours le même toast succès, donc un utilisateur qui re-clique dans la fenêtre de 60s ne verra pas d'erreur mais aucun nouveau mail ne partira.

## 6. Appliquer Flyway sur la Base Distante

La source de vérité est :

- [supabase/migrations](../supabase/migrations) (baseline `V1__baseline.sql` puis migrations incrémentales)

Ne pas s’appuyer sur des modifications manuelles de schéma en production.

### Option A : utiliser le wrapper Flyway du dépôt

Définir ces variables d’environnement dans le shell avant d’exécuter Flyway :

```powershell
$env:FLYWAY_URL="jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
$env:FLYWAY_USER="postgres"
$env:FLYWAY_PASSWORD="your_database_password"
```

Puis lancer :

```bash
npm run db:flyway:validate
npm run db:flyway:migrate
npm run db:flyway:info
```

### Option B : utiliser votre installation Flyway directement

Pointer Flyway vers le même dossier de migrations :

- `supabase/migrations`

### Règles de migration production

- toujours lancer `validate` avant `migrate`
- ne pas charger les données de démonstration en production
- ne pas modifier la base manuellement puis oublier de reporter le changement dans Flyway

### Cas particulier : baseline d'une base existante (montée hors Flyway)

Si la base distante a été initialisée par un autre canal que Flyway — typiquement
via le MCP Supabase (`apply_migration`), via Studio, ou via `psql` direct — la
table `flyway_schema_history` n'existe pas. Dans cet état, lancer
`npm run db:flyway:migrate` échoue : Flyway voit une base non vide et refuse
d'appliquer la baseline V1 par dessus.

Pour réintégrer Flyway sans rejouer le schéma, baseliner la BD distante sur la
dernière version déjà appliquée, puis reprendre le flux normal pour les versions
suivantes.

Définir les variables comme pour une migration distante classique :

```powershell
$env:FLYWAY_URL="jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
$env:FLYWAY_USER="postgres"
$env:FLYWAY_PASSWORD="<database password>"
```

Puis baseliner sur la dernière version réellement présente dans la base. Exemple
si V1 et V2 ont été appliquées via MCP et que la prochaine sera V3 :

```bash
flyway -locations=filesystem:supabase/migrations `
       -url=$env:FLYWAY_URL -user=$env:FLYWAY_USER -password=$env:FLYWAY_PASSWORD `
       -schemas=public `
       baseline -baselineVersion=2 -baselineDescription="security_fixes"
```

Cette commande crée `flyway_schema_history` et y inscrit une entrée de baseline
pour la version 2. Aucune DDL n'est rejouée.

Vérifier ensuite :

```bash
npm run db:flyway:info
```

L'état attendu : V1 et V2 marquées `Baseline`/`Success`, V3+ en `Pending`.

À partir de là, le flux standard reprend pour les évolutions suivantes :

```bash
npm run db:flyway:validate
npm run db:flyway:migrate
```

Notes :

- `-baselineVersion` doit correspondre à la dernière migration **réellement
  présente** dans la base. Si seule V1 a été appliquée hors Flyway, baseliner sur
  `1`. Si V1 et V2 ont été appliquées hors Flyway, baseliner sur `2`.
- Cette opération est à faire **une seule fois par environnement**. Une fois
  baselinée, la base distante suit le flux Flyway normal.
- Tant que la base distante n'a pas été baselinée, les déploiements via
  `npm run deploy:prod` doivent passer `-SkipMigrate` pour éviter l'échec
  Flyway, comme indiqué au §12.

## 7. Déployer les Edge Functions

Déployer toutes les fonctions de production utilisées par le produit.

Au minimum, ce dépôt dépend de :

- `submit-lead`
- `get-student-procedure-status`
- `create-cinetpay-payment`
- `get-checkout-settings`
- `update-checkout-settings`
- `cinetpay-webhook`
- `cinetpay-return`
- `get-cinetpay-payment-status`
- `send-contact-verification-code`
- `verify-contact-verification-code`
- `get-contact-verification-status`
- `send-follow-ups`

Commandes de déploiement :

```bash
npx supabase functions deploy submit-lead --project-ref your-project-ref
npx supabase functions deploy get-student-procedure-status --project-ref your-project-ref
npx supabase functions deploy create-cinetpay-payment --project-ref your-project-ref
npx supabase functions deploy get-checkout-settings --project-ref your-project-ref
npx supabase functions deploy update-checkout-settings --project-ref your-project-ref
npx supabase functions deploy cinetpay-webhook --project-ref your-project-ref
npx supabase functions deploy cinetpay-return --project-ref your-project-ref
npx supabase functions deploy get-cinetpay-payment-status --project-ref your-project-ref
npx supabase functions deploy send-contact-verification-code --project-ref your-project-ref
npx supabase functions deploy verify-contact-verification-code --project-ref your-project-ref
npx supabase functions deploy get-contact-verification-status --project-ref your-project-ref
npx supabase functions deploy send-follow-ups --project-ref your-project-ref
```

Vous pourrez automatiser cela plus tard en CI si nécessaire.

## 8. Storage

La migration de production crée le bucket `student-documents` et ses policies.

Vérifier après migration :

- le bucket existe
- le bucket n’est pas public
- les étudiants accèdent seulement à leur propre dossier
- les administrateurs peuvent consulter les fichiers comme prévu

Ne pas rendre public le bucket des documents étudiants.

## 9. Accès Administrateur

L’accès administrateur est contrôlé par la table `public.admins`.

La baseline insère déjà :

- `toubi.prestation@gmail.com`
- `powerprestationint@gmail.com`
- `admin@powerprestation.com`

Avant mise en ligne :

- confirmer que les emails admin de production sont corrects
- retirer tout email admin qui ne doit pas rester actif

Vous pouvez gérer cela directement dans la table `admins` une fois la baseline appliquée, mais l’état attendu de production doit rester documenté.

## 10. Durcissement Production

### Requis

- utiliser des identifiants forts pour la base et le dashboard
- limiter les personnes ayant accès au projet Supabase
- conserver `SUPABASE_SERVICE_ROLE_KEY` uniquement dans des environnements secrets de confiance
- garder les secrets paiement et messagerie hors du code frontend
- utiliser `SITE_URL` avec le vrai domaine de production
- confirmer que les URLs webhook sont publiques et correctes

### Fortement recommandé

- configurer les headers de sécurité frontend au niveau hébergeur/CDN
- vérifier CSP, `frame-ancestors`, `nosniff` et `Referrer-Policy`
- surveiller les erreurs Edge Functions
- surveiller les échecs de webhooks paiement
- surveiller les abus ou throttling email/SMS

### À ne pas faire

- ne pas exécuter `supabase/seed.sql` en production
- ne pas commiter de secrets de production
- ne pas stocker de secrets backend dans `.env.local`
- ne pas activer accidentellement les modes test de vérification ou paiement en production

## 11. Checklist de Validation Production

Après configuration, valider cette checklist.

### Frontend

- le frontend utilise le `VITE_SUPABASE_URL` de production
- le frontend utilise la `VITE_SUPABASE_PUBLISHABLE_KEY` de production
- la page de connexion fonctionne sur le domaine de production

### Auth

- les redirections Auth reviennent vers le bon domaine de production
- la connexion étudiant fonctionne
- la connexion admin fonctionne
- `${SITE_URL}/reset-password` est dans les Redirect URLs
- le template email `Reset Password` est aligné sur `supabase/templates/recovery.html`
- un test bout en bout du "mot de passe oublié" passe : lien reçu, page `/reset-password`, mot de passe changé, reconnexion réussie

### Base de données

- `flyway_schema_history` existe
- Flyway indique que le schéma de production est à jour
- aucune donnée de démonstration n’a été chargée par erreur

### Parcours étudiant

- le formulaire public de contact se soumet correctement
- la création de compte fonctionne
- le dashboard charge
- la mise à jour du profil fonctionne
- la soumission de procédure fonctionne

### Parcours paiement

- le checkout s’ouvre
- la transaction CinetPay est créée
- le retour navigateur fonctionne
- le webhook est reçu en conditions réelles
- `payment_transactions` est mis à jour correctement
- le prix de consultation modifié dans l’admin est bien utilisé par CinetPay

### Parcours admin

- `/admin` est accessible uniquement aux emails admin
- le CRM charge
- les leads chargent
- les paiements chargent
- le prix de consultation peut être modifié

### Vérification contact optionnelle

Uniquement si activée :

- le code de vérification peut être envoyé
- le code de vérification peut être validé
- le throttling fonctionne
- aucun état de vérification arbitraire d’utilisateur n’est exposé publiquement

## 12. Ordre de Déploiement Suggéré

Ordre recommandé :

1. créer le projet Supabase de production
2. configurer les variables publiques frontend
3. configurer les secrets backend
4. configurer les URLs Auth
5. lancer Flyway `validate` puis `migrate`
6. déployer les Edge Functions
7. vérifier storage et accès admin
8. exécuter la checklist de validation manuelle
9. activer seulement ensuite les fonctionnalités optionnelles comme la vérification contact

## 13. Références Utiles du Dépôt

- [README.md](../README.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [LOCAL_DATABASES.md](./LOCAL_DATABASES.md)
- [TESTING.md](./TESTING.md)
- [CINETPAY_SETUP.md](./CINETPAY_SETUP.md)
- [supabase/config.toml](../supabase/config.toml)
- [scripts/flyway.ps1](../scripts/flyway.ps1)
