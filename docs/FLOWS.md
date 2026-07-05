# Parcours Produit Principaux

Ce document explique le parcours utilisateur réel sans obliger à lire tout le code.

## 1. Parcours d’Acquisition Public

Point d’entrée :

- formulaire de contact de la page d’accueil dans [Contact.tsx](../src/components/Contact.tsx)

Ce qui se passe :

1. le visiteur renseigne son nom, email, téléphone et message
2. si le visiteur n’est pas connecté, le formulaire demande aussi un mot de passe
3. le frontend appelle `submit-lead`
4. un `lead` est créé ou réutilisé dans `public.leads`

Résultats possibles :

- aucun compte existant : le backend crée le compte, le frontend connecte l’utilisateur puis le redirige vers le dashboard
- compte existant : le brouillon du formulaire est conservé et l’utilisateur est redirigé vers la connexion
- compte déjà connecté : le même email est réutilisé et le lead est rafraîchi de manière sûre

## 2. Gestion des Conflits de Compte

Si une personne possède déjà un compte et soumet à nouveau le formulaire public sans être connectée :

1. `submit-lead` détecte que le compte Auth existe déjà
2. le frontend ne connecte pas automatiquement cette personne pour des raisons de sécurité
3. l’utilisateur est redirigé vers `/login?redirect=/start-procedure`
4. après connexion, l’utilisateur reprend le parcours privé de procédure

Cela évite de prendre le contrôle d’un compte existant depuis un formulaire public.

## 3. Validation du Profil Étudiant

Page principale :

- [Dashboard.tsx](../src/pages/Dashboard.tsx)

Champs d’identité requis :

- prénom
- nom
- date de naissance

Règles :

- l’étudiant doit valider ces champs avant de continuer
- après validation, le profil devient définitif côté étudiant
- seul un administrateur peut le modifier, sauf si une correction est demandée

Si l’administrateur demande une correction :

1. l’administrateur rouvre le profil depuis [AdminCRM.tsx](../src/pages/AdminCRM.tsx)
2. un commentaire de correction est stocké
3. l’étudiant peut modifier à nouveau le profil
4. l’étudiant doit valider le profil une nouvelle fois

## 4. Soumission Privée de Procédure

Page principale :

- [StartProcedure.tsx](../src/pages/StartProcedure.tsx)

Règles d’accès :

- la page est privée
- les utilisateurs anonymes sont redirigés vers la connexion
- les utilisateurs avec un profil incomplet sont redirigés vers le dashboard

Ce qui se passe à la soumission :

1. la page charge le profil de l’utilisateur connecté
2. elle vérifie si un lead actionnable existe déjà
3. sinon, l’étudiant soumet téléphone + message de procédure
4. le frontend appelle `submit-lead`
5. le lead est créé ou réutilisé
6. l’étudiant est redirigé vers le checkout

Important :

- le numéro de téléphone est stocké dans `leads.phone` et `student_profiles.phone_number`
- si un lead existe déjà et que le paiement manque encore, la page ne demande pas une nouvelle soumission ; elle propose directement la reprise du paiement

## 5. Checkout et Paiement

Page principale :

- [Checkout.tsx](../src/pages/Checkout.tsx)

Règles avant paiement :

- l’utilisateur doit être authentifié
- l’utilisateur doit avoir un profil validé
- un `leadId` valide doit être présent

Prestataire de paiement :

- CinetPay est le parcours de paiement principal

Parcours backend :

1. le frontend appelle `create-cinetpay-payment`
2. le backend crée une ligne `payment_transactions`
3. le navigateur est redirigé vers CinetPay
4. CinetPay notifie le backend via `cinetpay-webhook`
5. le backend vérifie la transaction côté serveur
6. `leads.payment_status` est mis à jour

Important :

- la page de retour navigateur n’est pas la source de vérité
- la vérification serveur est la source de vérité

## 6. Paiement Non Terminé

Si la procédure est soumise mais que le paiement n’est pas terminé :

1. le lead reste dans un état actionnable non payé
2. le dashboard affiche un état “paiement requis”
3. `/start-procedure` affiche une reprise de paiement au lieu de demander une nouvelle soumission
4. l’étudiant peut reprendre le paiement plus tard

À ce stade :

- le lead existe
- le profil existe
- mais le dossier étudiant réel n’est pas encore actif

## 7. Activation du Dossier

Le dossier étudiant réel démarre seulement après confirmation du paiement.

Après paiement confirmé :

1. le lead est marqué payé
2. `ensureConsultationApplication` crée `student_applications` si nécessaire
3. l’étudiant apparaît dans le CRM admin comme dossier actif

Distinction produit :

- `lead` : acquisition et intention de paiement
- `student_profile` : identité et profil académique
- `student_application` : dossier actif payé

## 8. Réinitialisation du Mot de Passe

Point d'entrée :

- lien "Mot de passe oublié ?" sur l'onglet "Se connecter" de [Login.tsx](../src/pages/Login.tsx)
- redirige vers [ForgotPassword.tsx](../src/pages/ForgotPassword.tsx) via la route `/forgot-password`

Ce qui se passe :

1. l'utilisateur saisit son email
2. le frontend appelle l'Edge Function `send-password-reset` avec `{ email, redirectTo: <origin>/reset-password }`
3. quelle que soit la réponse (email inconnu, rate limit, erreur SMTP), l'UI affiche le même toast succès pour empêcher l'énumération d'emails
4. côté Edge Function :
   - rate-limit IP (20 requêtes / 30 min) puis rate-limit email (1 / 60s)
   - si Brevo configuré (`BREVO_API_KEY` + `BREVO_EMAIL_SENDER` en prod), appelle `supabase.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } })` avec la service role key. `generateLink` retourne l'URL PKCE sans envoyer d'email. L'Edge Function envoie ensuite le mail via Brevo avec le template FR intégré à la fonction
   - si Brevo non configuré (dev local), fallback sur `supabase.auth.resetPasswordForEmail(email, { redirectTo })` qui utilise le SMTP local et livre l'email dans Inbucket avec le template `supabase/templates/recovery.html`
5. l'utilisateur clique sur le lien et arrive sur [ResetPassword.tsx](../src/pages/ResetPassword.tsx) via `/reset-password?code=<pkce>`
6. la page appelle `supabase.auth.exchangeCodeForSession(code)` pour établir une session de recovery
7. si le code est invalide ou expiré, l'écran propose de redemander un lien
8. si la session est établie, l'utilisateur saisit un nouveau mot de passe (min 8 caractères, confirmation identique)
9. le frontend appelle `supabase.auth.updateUser({ password })`, puis `supabase.auth.signOut()` pour forcer une reconnexion propre
10. l'utilisateur est redirigé vers `/login` avec un toast de confirmation

Règles de sécurité :

- l'existence d'un email n'est jamais révélée par l'UI
- le code PKCE est à usage unique et le lien expire au bout de 10 minutes (`otp_expiry = 600` dans `supabase/config.toml`)
- redemander un nouveau lien invalide le précédent
- après reset, la session est fermée pour forcer une réauthentification propre
- double rate-limit côté Edge Function : IP (20 / 30 min) + email (1 / 60s), les deux persistés dans `edge_request_events` via `enforceRequestRateLimit`
- l'Edge Function utilise `verify_jwt = false` (aucune session requise pour un mot de passe oublié) mais exige la service role key en interne pour appeler `admin.generateLink`

Configuration requise :

- `supabase/config.toml` : `/reset-password` dans `additional_redirect_urls`, `[auth.email]` avec `otp_expiry` et `max_frequency`, et `[functions.send-password-reset] verify_jwt = false`
- `supabase/templates/recovery.html` : template local pour le fallback Inbucket
- `supabase/functions/send-password-reset/index.ts` : contient une copie FR du HTML pour la prod (indépendante des templates Auth Supabase, ce qui débloque le Free tier)
- côté projet Supabase distant : secrets `BREVO_API_KEY`, `BREVO_EMAIL_SENDER`, `SITE_URL` (voir [SUPABASE_PRODUCTION.md](./SUPABASE_PRODUCTION.md))

## 9. Ordre de Lecture Recommandé

1. [README.md](../README.md)
2. [ARCHITECTURE.md](./ARCHITECTURE.md)
3. [FLOWS.md](./FLOWS.md)
4. [Contact.tsx](../src/components/Contact.tsx)
5. [Dashboard.tsx](../src/pages/Dashboard.tsx)
6. [StartProcedure.tsx](../src/pages/StartProcedure.tsx)
7. [Checkout.tsx](../src/pages/Checkout.tsx)
8. `supabase/functions/submit-lead`
9. `supabase/functions/create-cinetpay-payment`
10. `supabase/functions/cinetpay-webhook`
