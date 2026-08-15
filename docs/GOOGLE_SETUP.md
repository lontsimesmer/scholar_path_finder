# Configuration Google (Search Console + Business Profile)

Ce document explique comment déclarer le site auprès de Google après le déploiement, pour que le travail SEO du code (métadonnées, sitemap, JSON-LD, hreflang, pré-rendu) se traduise en trafic réel.

Il couvre :

- Google Search Console : indexation, sitemap, suivi des performances
- Google Business Profile : présence locale sur Google Maps et le pack local
- Bing Webmaster Tools : équivalent Microsoft, à faire en même temps
- Actions récurrentes à prévoir chaque mois

Prérequis :

- Le site est déployé et accessible sur `https://www.powerprestation.com` (ou l'origine définie par `VITE_SITE_URL`).
- Le sitemap est publié à `/sitemap.xml`.
- L'accès admin au registrar DNS du domaine `powerprestation.com`.
- Un compte Google — idéalement un compte pro dédié à l'entreprise, pas un compte personnel.

## 1. Google Search Console

Search Console est l'interface qui permet de savoir comment Google voit le site : quelles pages sont indexées, quelles requêtes ramènent du trafic, quelles erreurs bloquent l'indexation. Sans elle, on avance à l'aveugle.

### Ajouter la propriété

1. Ouvrir https://search.google.com/search-console/ et se connecter avec le compte Google qui gérera le site.
2. Cliquer sur `Ajouter une propriété`.
3. Choisir le type `Domaine` (et non `Préfixe de l'URL`). Le type `Domaine` couvre `http`, `https`, `www` et tous les sous-domaines d'un coup.
4. Saisir `powerprestation.com` (sans `https://` ni `www.`).
5. Google renvoie une chaîne de vérification à ajouter en enregistrement `TXT` à la racine du domaine, par exemple :

   ```text
   google-site-verification=abcXYZ123...
   ```

6. Dans l'admin DNS du registrar (Cloudflare, OVH, GoDaddy, Namecheap...) :
   - créer un enregistrement `TXT` sur `@` (racine du domaine),
   - coller la valeur `google-site-verification=...`,
   - TTL par défaut suffit.
7. Attendre 1 à 15 minutes que la propagation DNS se fasse, puis revenir dans Search Console et cliquer `Vérifier`.
8. Ne pas supprimer l'enregistrement TXT ensuite : Google revérifie régulièrement.

### Soumettre le sitemap

Une fois la propriété validée :

1. Menu latéral `Sitemaps`.
2. Dans le champ `Ajouter un sitemap`, coller `sitemap.xml` (Google préfixe automatiquement avec le domaine).
3. Cliquer `Envoyer`. Google devrait le lire dans l'heure et afficher `Réussi` avec le nombre d'URLs découvertes (10 statiques + les articles de blog publiés).

Le sitemap est régénéré à chaque `npm run build` par `scripts/generate-sitemap.mjs`, il n'y a rien à mettre à jour manuellement quand des articles sont publiés — il suffit de redéployer.

### Forcer l'indexation des pages clés

Pour éviter d'attendre le crawl naturel (qui peut prendre plusieurs semaines sur un domaine neuf) :

1. Menu `Inspection de l'URL` en haut de l'écran.
2. Coller `https://www.powerprestation.com/fr` → `Entrée`.
3. Attendre le résultat (« URL absente de l'index » au début), puis cliquer `Demander une indexation`. Google la met en file prioritaire (24-72h).
4. Répéter pour :
   - `https://www.powerprestation.com/en`
   - `https://www.powerprestation.com/fr/blog`
   - `https://www.powerprestation.com/en/blog`
   - chaque nouvel article publié dans les premières semaines

Limite : environ 10 demandes d'indexation par jour et par propriété.

### Ce qu'on peut faire après validation

- `Performances` : impressions, clics, CTR et position moyenne par requête. Premier signal de trafic à partir de la semaine 2.
- `Pages` : liste des URLs indexées, exclues et pourquoi. Utile pour repérer les 404 ou les pages bloquées par erreur.
- `Améliorations` : Google détecte automatiquement les rich results éligibles depuis les JSON-LD (`FAQPage`, `Article`, `LocalBusiness`) et signale les erreurs.
- `Statistiques d'exploration` : fréquence de crawl. Si Google ralentit, c'est souvent un signe de contenu jugé peu utile.

## 2. Google Business Profile

Business Profile (ex-Google My Business) fait apparaître le cabinet dans Google Maps et dans le pack local (les 3 fiches avec carte en haut des résultats). Pour un cabinet basé à Yaoundé, c'est souvent la source de trafic la plus rentable — un chercheur qui tape « consultant études étranger Yaoundé » veut un cabinet local, pas un article de blog.

### Créer la fiche

1. Ouvrir https://www.google.com/business/ et se connecter.
2. Chercher `Power Prestation` : si Google a déjà créé une fiche automatiquement (à partir d'un signalement utilisateur ou d'un annuaire), la revendiquer. Sinon, cliquer `Ajouter votre entreprise à Google`.
3. Renseigner :
   - **Nom** : `Power Prestation`
   - **Catégorie principale** : `Consultant en éducation` (elle existe dans le référentiel Google)
   - **Catégories secondaires** : `Cabinet de conseil`, `Service d'immigration`
   - **Adresse** : `FOUDA, derrière le FNE, Yaoundé, Cameroun` (celle du footer du site)
   - **Zone desservie** : Cameroun (ajouter les pays limitrophes si vous les couvrez : Tchad, RCA, Gabon, Congo)
   - **Téléphone** : `+237 674 819 411`
   - **Site web** : `https://www.powerprestation.com/fr`
   - **Horaires** : ceux réels du cabinet, à mettre à jour lors des jours fériés

### Vérifier la fiche

Google demande de prouver que l'entreprise existe physiquement. Trois options possibles selon ce que Google propose :

- **Carte postale** : Google envoie une carte avec un code à l'adresse renseignée. Délai typique 5-14 jours au Cameroun.
- **Téléphone / SMS** : code envoyé au numéro renseigné. Immédiat quand c'est disponible.
- **Vidéo** : Google demande une vidéo continue montrant l'extérieur du cabinet (avec le nom visible), l'intérieur, et un objet permettant de dater la vidéo (un journal du jour, par exemple). Validation humaine sous 5 jours.

Tant que la fiche n'est pas vérifiée, elle n'apparaît pas dans les résultats Google.

### Actions à faire dès la vérification

- **Photos** : uploader 5 à 10 photos (façade, intérieur du cabinet, équipe, sessions de consultation, diplômes/certifications). C'est le premier facteur de conversion sur Maps.
- **Description** (750 caractères max) : placer naturellement les mots-clés cibles :
  - `études à l'étranger`
  - `bourses d'études`
  - `visa étudiant`
  - `Yaoundé`, `Cameroun`
  - `sélection universitaire`, `mobilité académique`
- **Produits / Services** : ajouter chaque prestation (Sélection universitaire, Dossier de bourse, Visa étudiant, Placement stage) avec un prix indicatif si possible.
- **Publications** : poster 1 à 2 fois par mois (nouveaux articles blog, événements, témoignages étudiants). Chaque publication est un signal de fraîcheur pour Google.
- **Q&R** : anticiper les questions fréquentes (« combien coûte une consultation ? », « quels pays couvrez-vous ? ») et y répondre à l'avance depuis le compte de l'entreprise.

### Avis Google

C'est le levier de classement local numéro 1. Objectif réaliste : 20 avis avec note ≥ 4.7 dans les 6 premiers mois.

- Générer le lien court d'avis depuis Business Profile → `Obtenir plus d'avis` → copier l'URL du type `https://g.page/r/xxxxxxx/review`.
- Envoyer ce lien par email/WhatsApp à chaque étudiant satisfait, 1 à 2 semaines après la fin de la prestation (quand ils viennent de recevoir leur admission ou leur visa).
- Répondre à **chaque** avis (positif ou négatif) sous 48h. Les réponses aux avis sont visibles et pèsent dans le ranking local.

## 3. Bing Webmaster Tools

Bing représente une part de trafic non négligeable (≈ 5-10 % selon les pays), et surtout, Yandex + DuckDuckGo utilisent son index. C'est 10 minutes de setup en plus.

1. Ouvrir https://www.bing.com/webmasters/.
2. `Add a site` → choisir `Import from Google Search Console`. Bing lit directement la liste des propriétés vérifiées côté Google, plus besoin de re-prouver la propriété DNS.
3. Sélectionner `powerprestation.com`.
4. Vérifier que le sitemap est bien importé (menu `Sitemaps`), sinon soumettre `https://www.powerprestation.com/sitemap.xml` manuellement.

## 4. Actions récurrentes

Une fois tout en place, la maintenance mensuelle :

- **Search Console** : ouvrir `Performances`, regarder les requêtes en croissance et celles où on est en position 8-15 (potentiel de gain rapide en travaillant le contenu ciblé). Vérifier `Pages > Non indexées` pour attraper les erreurs.
- **Business Profile** : publier 1 à 2 posts (article blog, cas étudiant), répondre aux avis reçus, ajouter les nouvelles photos.
- **Nouveaux articles de blog** : rebuild + redeploy suffit à mettre le sitemap à jour et à pré-rendre l'article dans les deux langues. Aller demander l'indexation manuelle dans Search Console pour accélérer le crawl.
- **Trimestriellement** : réviser la description Business Profile et les catégories si l'offre évolue.

## Ordre chronologique recommandé

1. Déploiement du site (les commits SEO doivent être en production).
2. Search Console → ajout de la propriété + soumission du sitemap (jour 1, ~30 minutes).
3. Business Profile → création de la fiche + demande de vérification (jour 1, la validation elle-même prend 5-14 jours).
4. Bing Webmaster Tools → import depuis Search Console (jour 1, ~5 minutes).
5. Semaine 2 : première mesure de trafic dans Search Console. Les impressions arrivent avant les clics.
6. Mois 1 : la fiche Business Profile est vérifiée, on peut commencer à collecter des avis et publier.
7. Mois 3 : premiers effets visibles sur les positions Google. À partir de là, la trajectoire dépend surtout du rythme de publication d'articles et d'obtention d'avis.

## Ressources utiles

- Documentation Search Console : https://support.google.com/webmasters
- Documentation Business Profile : https://support.google.com/business
- Guide sitemaps Google : https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- Guide hreflang : https://developers.google.com/search/docs/specialty/international/localized-versions
- Testeur de rich results (pour valider les JSON-LD) : https://search.google.com/test/rich-results
