# Guide de Test

Ce document explique comment les tests fonctionnent dans le dépôt et ce qui manque encore.

## État Actuel

Les tests automatisés sont configurés, mais la couverture actuelle reste faible.

Ce qui existe aujourd’hui :

- configuration Vitest dans [vitest.config.ts](../vitest.config.ts)
- setup Testing Library dans [src/test/setup.ts](../src/test/setup.ts)
- quelques tests ciblés dans `src/**/*.test.ts`

Important :

- les parcours métier critiques ne sont pas encore fortement couverts
- aucun seuil de couverture n’est imposé
- `lint` et `build` détectent actuellement plus de régressions que la suite de tests

## Commandes

Commandes qualité principales :

```bash
npm run lint
npm run test
npm run build
```

Si le changement dépend de Supabase local :

```bash
npm run db:supabase:start
npm run env:supabase:local
npm run dev
```

## Priorités de Test

Ordre recommandé pour ajouter une couverture utile :

1. `src/lib/student-profile.ts`
2. logique de procédure et de lead dans `src/lib`
3. guards de route et redirections dans `Dashboard`, `StartProcedure`, `Checkout` et `Login`
4. gestion des conflits de compte dans `Contact`
5. validation et états de soumission de `CinetpayPayment`
6. champs obligatoires du blog admin

Ces zones portent le risque métier le plus élevé et la logique conditionnelle la plus importante.

## Checklist de Régression Manuelle

Tant que la couverture automatisée reste limitée, valider manuellement ces parcours :

### Parcours étudiant

- créer un compte depuis le formulaire public de contact
- si la vérification contact est activée, valider la séquence code email puis code SMS avant connexion
- se connecter avec un compte existant et reprendre la procédure
- valider les champs du profil dans le dashboard
- soumettre la page privée de procédure
- reprendre le checkout quand le paiement est encore non payé

### Parcours paiement

- ouvrir le checkout uniquement avec une session authentifiée valide
- confirmer que la validation du profil est obligatoire avant paiement
- si les tests de paiement réel CinetPay sont activés, utiliser un email présent dans `CINETPAY_TEST_ALLOWED_EMAILS`
- démarrer un paiement CinetPay et vérifier la redirection
- vérifier l’état de la page de retour après le retour navigateur
- vérifier qu’un compte non autorisé est bloqué quand `CINETPAY_TEST_MODE=true`

### Parcours admin

- ouvrir `/admin/crm`
- modifier un profil étudiant
- demander une correction de profil
- créer, modifier, masquer et valider des articles de blog
- modifier le prix de consultation et vérifier son affichage dans le checkout

### Vérifications plateforme

- basculer FR / EN et vérifier les pages clés
- tester en largeur mobile pour dashboard, checkout et dialogues admin

## Emplacement Recommandé des Tests

- tests utilitaires : près des helpers ou dans `src/test`
- tests page/composant : près de la page ou du composant concerné
- nommage : `*.test.ts` ou `*.test.tsx`

Exemples :

- `src/lib/student-profile.test.ts`
- `src/pages/Checkout.test.tsx`
- `src/components/Contact.test.tsx`

## Stratégie Recommandée

Pour l’instant, traiter la qualité comme une barrière en 3 étapes :

1. `npm run lint`
2. `npm run test`
3. `npm run build`

Ajouter ensuite une validation manuelle ciblée sur la zone modifiée.

## Évaluation Honnête de la Couverture

Si un nouveau développeur demande si le projet dispose aujourd’hui d’une forte confiance automatisée, la réponse est non.

Le projet possède :

- un runner de tests fonctionnel
- une base de tests encore limitée
- un besoin réel de tests de parcours métier avant de considérer la couverture comme mature
