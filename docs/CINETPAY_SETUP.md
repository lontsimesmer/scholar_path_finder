# Configuration CinetPay

Ce document explique comment configurer `CinetPay` pour ce dépôt.

Il couvre :

- les variables requises
- où les récupérer
- où les stocker
- comment les configurer localement
- comment les configurer sur un projet Supabase distant
- comment vérifier que l’intégration fonctionne

## Variables Requises

Ces secrets sont requis par le parcours de checkout côté serveur :

- `CINETPAY_API_KEY`
- `CINETPAY_SITE_ID`
- `CINETPAY_SECRET_KEY`
- `SITE_URL`

Variables optionnelles mais utiles :

- `CINETPAY_CONSULTATION_AMOUNT_XAF`
- `CINETPAY_USD_REFERENCE`
- `CINETPAY_TEST_MODE`
- `CINETPAY_TEST_AMOUNT_XAF`
- `CINETPAY_TEST_ALLOWED_EMAILS`

## Où Les Récupérer

### Compte marchand CinetPay

Récupérer ces valeurs dans le back-office marchand `CinetPay` :

- `CINETPAY_API_KEY`
- `CINETPAY_SITE_ID`
- `CINETPAY_SECRET_KEY`

Chemin :

1. Se connecter au compte marchand `CinetPay`.
2. Ouvrir le menu `Integrations`.
3. Copier :
   - `APIKEY`
   - `SITEID`
   - `Secret Key`

Documentation officielle utile :

- prérequis : `https://docs.cinetpay.com/api/1.0-fr/introduction/prerequis`
- secret HMAC webhook : `https://docs.cinetpay.com/api/1.0-fr/checkout/hmac`

### URL de l’application

`SITE_URL` est l’URL de base de votre application.

Exemples :

- frontend local uniquement : `http://127.0.0.1:8080`
- local avec tunnel public : `https://xxxx.ngrok-free.app`
- production : `https://powerprestation.com`

Important :

- les liens de paiement sortants sont générés depuis `SITE_URL`
- le webhook doit être accessible publiquement pour recevoir les notifications CinetPay réelles

## Où Les Stocker

Ne pas stocker les secrets `CINETPAY_*` dans un fichier `.env` frontend.

Pour ce dépôt :

- les variables `VITE_*` vont dans `.env` (cible distante par défaut) ou `.env.local` (override local pour la stack Supabase locale)
- `CINETPAY_*` et `SITE_URL` vont dans l’environnement secret des `Supabase Functions`

Le bon emplacement pour les secrets de paiement est donc :

- les secrets Supabase locaux
- ou les secrets du projet Supabase distant

## Configuration Locale

### 1. Démarrer le backend local

```bash
npm run db:supabase:start
```

### 2. Définir les secrets Supabase locaux

Utiliser la CLI Supabase depuis la racine du dépôt :

```bash
npx supabase secrets set \
  CINETPAY_API_KEY="your_api_key" \
  CINETPAY_SITE_ID="your_site_id" \
  CINETPAY_SECRET_KEY="your_secret_key" \
  SITE_URL="http://127.0.0.1:8080"
```

### 3. Mode test local optionnel

Pour un mode de test plus sûr avec paiement réel :

```bash
npx supabase secrets set \
  CINETPAY_TEST_MODE="true" \
  CINETPAY_TEST_AMOUNT_XAF="500" \
  CINETPAY_TEST_ALLOWED_EMAILS="admin@powerprestation.com"
```

Valeurs de production explicites optionnelles :

```bash
npx supabase secrets set \
  CINETPAY_CONSULTATION_AMOUNT_XAF="15625" \
  CINETPAY_USD_REFERENCE="25"
```

### 4. Redémarrer les fonctions si nécessaire

Si la stack locale tournait déjà, la redémarrer après changement des secrets :

```bash
npm run db:supabase:stop
npm run db:supabase:start
```

## Configuration Distante

Pour un projet Supabase hébergé, utiliser le `project ref`.

Exemple :

```bash
npx supabase secrets set \
  --project-ref your-project-ref \
  CINETPAY_API_KEY="your_api_key" \
  CINETPAY_SITE_ID="your_site_id" \
  CINETPAY_SECRET_KEY="your_secret_key" \
  SITE_URL="https://your-domain.com"
```

Mode test distant optionnel :

```bash
npx supabase secrets set \
  --project-ref your-project-ref \
  CINETPAY_TEST_MODE="true" \
  CINETPAY_TEST_AMOUNT_XAF="500" \
  CINETPAY_TEST_ALLOWED_EMAILS="admin@powerprestation.com"
```

## Valeurs Recommandées

### Mode production normal

```env
CINETPAY_CONSULTATION_AMOUNT_XAF=15625
CINETPAY_USD_REFERENCE=25
```

### Mode test réel plus sûr

```env
CINETPAY_TEST_MODE=true
CINETPAY_TEST_AMOUNT_XAF=500
CINETPAY_TEST_ALLOWED_EMAILS=admin@powerprestation.com,toubi.prestation@gmail.com
```

Comportement du mode test :

- seuls les emails autorisés peuvent démarrer un paiement
- le montant facturé devient `CINETPAY_TEST_AMOUNT_XAF`
- le backend refuse la création du paiement si la liste autorisée ou le montant de test manque

## Notes Webhook et URL de Retour

Ce dépôt fournit déjà :

- `cinetpay-webhook`
- `cinetpay-return`

Important :

- `return_url` doit être accessible et répondre correctement
- `notify_url` doit être publiquement accessible pour recevoir les webhooks réels
- en test local sans tunnel, le retour navigateur peut fonctionner, mais le webhook ne sera pas livré par CinetPay

Documentation CinetPay utile :

- initialisation : `https://docs.cinetpay.com/api/1.0-fr/checkout/initialisation`
- notification : `https://docs.cinetpay.com/api/1.0-en/checkout/notification`
- URL de retour : `https://docs.cinetpay.com/api/1.0-fr/checkout/retour`
- vérification transaction : `https://docs.cinetpay.com/api/1.0-fr/checkout/verification`

## Vérifier la Configuration

### Vérification de base

Confirmer que :

- le projet Supabase local ou distant possède les secrets requis
- `SITE_URL` correspond à l’URL réelle de l’application
- le frontend peut ouvrir le checkout normalement

### Vérifications applicatives

Tester ce parcours :

1. créer ou utiliser un compte étudiant
2. soumettre le parcours contact/procédure
3. ouvrir le checkout
4. démarrer un paiement `CinetPay`
5. confirmer que la redirection ouvre la page CinetPay
6. confirmer que le navigateur revient sur `/payment-success`

### Vérifications webhook

Si une URL publique est utilisée :

1. déclencher un paiement
2. confirmer que `cinetpay-webhook` est appelé
3. confirmer que `payment_transactions.local_status` est mis à jour

## Erreurs Fréquentes

- placer les secrets `CINETPAY_*` dans `.env.local`
- oublier `SITE_URL`
- utiliser une URL locale non publique pour tester les webhooks
- activer `CINETPAY_TEST_MODE` sans `CINETPAY_TEST_AMOUNT_XAF`
- activer `CINETPAY_TEST_MODE` sans `CINETPAY_TEST_ALLOWED_EMAILS`
- tester avec un email non autorisé alors que le mode test est actif

## Références du Dépôt

- configuration : [supabase/config.toml](../supabase/config.toml)
- guide backend local : [LOCAL_DATABASES.md](./LOCAL_DATABASES.md)
- guide de test : [TESTING.md](./TESTING.md)
- fonction checkout : [create-cinetpay-payment/index.ts](../supabase/functions/create-cinetpay-payment/index.ts)
- fonction webhook : [cinetpay-webhook/index.ts](../supabase/functions/cinetpay-webhook/index.ts)
- fonction retour : [cinetpay-return/index.ts](../supabase/functions/cinetpay-return/index.ts)
