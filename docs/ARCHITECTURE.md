# Vue d’Ensemble de l’Architecture

Ce document est le chemin le plus rapide pour comprendre l’organisation de l’application après `README.md`.

## Forme Générale

Le projet a 3 couches principales :

- `src/` : frontend React
- `supabase/functions/` : actions métier serveur et handlers paiement/webhook
- `supabase/migrations/` : structure de base de données Flyway et règles de sécurité

L’application n’est pas un dashboard générique. C’est un produit de gestion de procédure étudiant avec un parcours public d’acquisition, un parcours étudiant authentifié et un back-office administrateur.

## Structure Frontend

Dossiers frontend principaux :

- `src/pages` : écrans de route
- `src/components` : sections de page et composants métier
- `src/components/ui` : primitives shadcn/ui locales
- `src/lib` : helpers métier et logique partagée
- `src/i18n` : fournisseur de langue et traductions
- `src/integrations/supabase` : client Supabase frontend

Le point d’entrée des routes est [App.tsx](../src/App.tsx). Le lire en premier.

## Parcours Utilisateur Principaux

### 1. Parcours marketing public

- Page d’accueil : [Index.tsx](../src/pages/Index.tsx)
- Sections principales : `Hero`, `Services`, `About`, `HowItWorks`, `Testimonials`, `FAQ`, `Contact`
- Formulaire public de contact : [Contact.tsx](../src/components/Contact.tsx)

Ce parcours crée un lead, peut créer automatiquement un compte et redirige l’utilisateur vers le parcours étudiant.

### 2. Compte étudiant et profil

- Connexion / inscription : [Login.tsx](../src/pages/Login.tsx)
- Dashboard étudiant : [Dashboard.tsx](../src/pages/Dashboard.tsx)
- Étape privée de soumission : [StartProcedure.tsx](../src/pages/StartProcedure.tsx)

Règle importante :

- l’étudiant doit valider ses champs d’identité avant de continuer la procédure
- une fois validé, seul un administrateur peut modifier le profil, sauf si l’administrateur le rouvre pour correction

La logique partagée de profil est dans [student-profile.ts](../src/lib/student-profile.ts).

### 3. Paiement

- Page checkout : [Checkout.tsx](../src/pages/Checkout.tsx)
- Composant paiement : [CinetpayPayment.tsx](../src/components/checkout/CinetpayPayment.tsx)
- Page de retour : [PaymentSuccess.tsx](../src/pages/PaymentSuccess.tsx)

Le parcours de paiement principal est CinetPay. Le backend est la source de vérité pour confirmer un paiement.

### 4. Administration

- Accueil admin : [AdminDashboard.tsx](../src/pages/AdminDashboard.tsx)
- CRM : [AdminCRM.tsx](../src/pages/AdminCRM.tsx)
- Back-office blog : [AdminBlog.tsx](../src/pages/AdminBlog.tsx)

## Structure Backend

Edge Functions principales :

- `submit-lead` : crée ou réutilise les leads et gère les conflits de création de compte
- `get-student-procedure-status` : résout l’état lead/paiement actuel de l’étudiant connecté
- `create-cinetpay-payment` : initialise les transactions CinetPay
- `cinetpay-webhook` : reçoit les notifications serveur de paiement
- `get-cinetpay-payment-status` : réconcilie l’état du paiement après le retour navigateur
- `send-follow-ups` : automatisation de relance et réactivation des leads

Les helpers backend partagés sont dans `supabase/functions/_shared`.

## Modèle de Données Principal

Tables clés :

- `leads` : acquisition publique et état d’intention de paiement
- `student_profiles` : identité et profil académique étudiant
- `student_applications` : dossier étudiant actif après paiement confirmé
- `student_documents` : fichiers déposés par les étudiants
- `payment_transactions` : suivi des transactions CinetPay
- `admins` : contrôle d’accès administrateur
- `blog_categories` / `blog_posts` : contenu public du blog

## Ordre de Lecture Recommandé

1. [README.md](../README.md)
2. [ARCHITECTURE.md](./ARCHITECTURE.md)
3. [FLOWS.md](./FLOWS.md)
4. [LOCAL_DATABASES.md](./LOCAL_DATABASES.md)
5. [DEVELOP_CHANGES.md](./DEVELOP_CHANGES.md)
6. [App.tsx](../src/App.tsx)
7. `src/pages/`
8. `supabase/functions/`
9. `supabase/migrations/`
