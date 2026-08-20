# Guide de l'administrateur — Réservation Chartrettes

> Fiche explicative complète de la plateforme de réservation des salles municipales.
> Destinée à l'administrateur (mairie / animateur culturel).

---

## 1. À quoi sert le site ?

La plateforme permet aux **associations** et aux **particuliers** de Chartrettes (et extérieurs) de **réserver en ligne les salles municipales** (bâtiments et salles), de **signer les conventions** de mise à disposition, et de **suivre l'état de leur demande**.

De votre côté (administrateur), vous **validez ou refusez** les demandes, **gérez les tarifs**, **suivez les paiements**, **signez les conventions au nom du maire**, et **consultez les statistiques** d'utilisation des salles.

Trois grands types d'utilisateurs :

| Rôle | Qui | Ce qu'il peut faire |
|------|-----|---------------------|
| **Particulier** | Un habitant ou un extérieur | Réserver en son nom propre. Bénéficie du tarif « Chartrettois » s'il habite la commune. |
| **Association (user)** | Un membre d'association | Réserver au nom de son ou ses associations. Peut avoir une convention annuelle. |
| **Administrateur (admin)** | Vous / la mairie | Accès total : validation, tarifs, statistiques, conventions, gestion des comptes. |

---

## 2. Comment se connecter à l'espace admin

1. Connectez-vous normalement sur la page d'accueil (email + mot de passe, ou compte Google).
2. Comme votre compte a le rôle **admin**, un accès **« Administration »** apparaît dans le menu.
3. Toutes les pages d'administration commencent par `/admin`.

> ⚠️ Seuls les comptes ayant le rôle **admin** peuvent accéder à ces pages. Un utilisateur normal qui tente d'y accéder est automatiquement redirigé.

---

## 3. Le tableau de bord admin (`/admin`)

C'est votre **page d'accueil administrateur**. Elle affiche en un coup d'œil :

- **Les chiffres clés** : nombre total de réservations, salles actives, utilisateurs inscrits, taux d'acceptation.
- **Les alertes à traiter** :
  - Réservations **en attente** de validation.
  - Demandes d'**association** en attente.
- **Des graphiques** : salles les plus réservées, associations les plus actives, répartition par statut.
- **Un filtre de période** : semaine / mois / année / tout.

👉 Commencez toujours votre journée ici : les alertes vous indiquent ce qui demande votre attention.

---

## 4. Gérer les réservations (`/admin/reservations`)

C'est **l'écran le plus important au quotidien**.

### Ce que vous pouvez faire

- **Filtrer** par statut : en attente / approuvées / refusées / toutes.
- **Basculer** entre la vue **liste** et la vue **calendrier**.
- **Approuver** une réservation (vous pouvez ajouter un commentaire).
- **Refuser** une réservation (un **motif est obligatoire**).
- **Gérer le paiement** (voir §5).

### Les statuts d'une réservation

| Statut | Signification |
|--------|---------------|
| **En attente** (`pending`) | Nouvelle demande, à traiter. |
| **Approuvée** (`approved`) | Vous avez validé. Le demandeur reçoit un email. |
| **Refusée** (`rejected`) | Vous avez refusé (avec motif). Email envoyé. |
| **Annulée** (`cancelled`) | Annulée par le demandeur ou par vous. |
| **En attente de paiement** (`awaiting_payment`) | Validée mais paiement non encore réglé. |

### Réservations annuelles

Une réservation annuelle (ex : « tous les mardis de 19h à 21h ») génère **une réservation par semaine** (jusqu'à ~52). L'écran les regroupe et vous permet **d'approuver ou refuser tout le groupe d'un coup**.

> 📧 À chaque approbation ou refus, le demandeur reçoit **automatiquement un email** avec votre commentaire éventuel.

---

## 5. Suivre les paiements

Depuis la fiche d'une réservation, le bouton **paiement** ouvre une fenêtre où vous renseignez :

- **Le statut** : en attente / chèque déposé / payé / remboursé.
- **Le moyen** : chèque, espèces…
- **La référence** (ex : numéro de chèque).
- **Le montant** et la **caution**.
- Des **notes** libres.

Chaque validation est **tracée** (qui a validé, quand). Cela vous permet de savoir à tout moment quelles réservations sont réglées.

---

## 6. Gérer les tarifs (`/admin/pricing`)

Vous fixez les tarifs **salle par salle**. Pour chaque salle :

- **Salle payante ou gratuite** (interrupteur). Si gratuite → prix toujours à 0.
- **Trois niveaux de tarifs**, chacun selon le type de demandeur :
  - **Chartrettois** (habite la commune),
  - **Association**,
  - **Extérieur**.
- **Trois durées** de tarification :
  - **Journée complète** (à partir de 8h de réservation),
  - **Demi-journée** (entre 4h et 7h),
  - **Horaire** (moins de 4h → prix × nombre d'heures).
- **La caution** (montant du dépôt de garantie).

> Le site **calcule automatiquement** le bon prix au moment de la réservation, selon la durée choisie et le profil du demandeur. Vous n'avez rien à calculer.

---

## 7. Gérer les utilisateurs (`/admin/users`)

- **Liste complète** des comptes inscrits.
- **Filtres** : par rôle (admin / association / particulier) et par localisation (Chartrettes ou non).
- **Recherche** par nom ou email.
- Pour chaque compte : nom, email, rôle, date d'inscription, association rattachée, email vérifié ou non, résident Chartrettes ou non.
- **Supprimer** un compte (sauf les comptes admin, protégés).

---

## 8. Gérer les conventions (`/admin/conventions`)

Deux types de conventions existent :

### a) Conventions ponctuelles (une par réservation)

Le demandeur **signe à la main** (signature numérique) au moment de réserver. Vous retrouvez ici la signature, l'horodatage et le lien vers la réservation.

### b) Conventions annuelles (une par association)

Pour les associations qui réservent toute l'année :

1. Le représentant de l'association **signe** sa convention annuelle.
2. Vous la **validez** : le site **ajoute la signature du maire** et **envoie le PDF final par email**.
3. La convention passe alors au statut **« validée »**.

### Les paramètres de convention (à vérifier une fois)

Toujours sur cette page, vous pouvez modifier les informations officielles utilisées dans **tous** les PDF de convention :

- Nom et titre du maire,
- Nom officiel de la mairie,
- Adresse (2 lignes) et téléphone,
- **Année / saison** de convention (ex : `2025-2026`).

> ✅ Pensez à mettre à jour l'**année de convention** à chaque nouvelle saison.

---

## 9. Consulter les statistiques des salles (`/admin/room-stats`)

- **Top 10 des salles** les plus réservées (heures cumulées + nombre de réservations).
- **Détail par salle** : quelles associations réservent, sur quels créneaux.
- **Filtre par année**.
- Graphiques + possibilité d'**export**.

Utile pour les bilans annuels et pour justifier l'occupation des salles.

---

## 10. Comment fonctionne une réservation côté utilisateur

Pour bien accompagner les usagers, voici leur parcours :

1. **Inscription** (3 étapes) : infos de base → profil (association ou particulier) → **vérification de l'email** par un code à 6 chiffres (valable 15 min). Tant que l'email n'est pas vérifié, le compte est bloqué.
2. **Choix de la salle** : bâtiment → salle → calendrier.
3. **Choix du créneau** : grille horaire de 8h à 22h. Les créneaux **déjà pris** ou **bloqués** sont grisés → pas de conflit possible.
4. **Détails** : motif, nombre de participants, équipements souhaités.
5. **Prix** affiché automatiquement (avec caution).
6. **Signature de la convention** (ponctuelle, ou annuelle si réservation à l'année).
7. **Envoi** → la demande arrive chez vous en statut **« en attente »**.

L'usager suit ensuite l'état de sa demande dans son espace, reçoit les emails, et peut **annuler** tant que la demande est en attente.

---

## 11. Les emails envoyés automatiquement

Le site envoie des emails sans intervention de votre part :

- **Inscription** : code de vérification de l'email.
- **Réservation reçue** : confirmation au demandeur.
- **Réservation approuvée / refusée** : avec votre commentaire ou motif.
- **Demande d'association** : soumission, acceptation, refus.
- **Convention annuelle validée** : PDF envoyé à la mairie.
- **Mot de passe oublié** : lien de réinitialisation.

> L'expéditeur est l'adresse **animateur.culturel@mairie-chartrettes.fr**.

---

## 12. Ce que les usagers peuvent aussi faire (RGPD & profil)

- **Modifier leur profil** (adresse, résidence Chartrettes…).
- **Retrouver leurs conventions signées** et les télécharger en PDF.
- **Exporter toutes leurs données** (fichier ZIP) — droit RGPD.
- **Supprimer leur compte** (action irréversible).

Le site propose aussi des pages publiques : **Aide** (guide en 12 sections), **Règlement**, **Confidentialité**, **Mentions légales**, et un **formulaire de contact** qui vous écrit directement.

---

## 13. Bonnes pratiques d'administration

- 🔎 **Chaque jour** : vérifiez les alertes du tableau de bord (`/admin`).
- ✅ **Validez rapidement** les réservations : l'usager attend l'email.
- 📝 **Refus** : indiquez toujours un **motif clair** (il est envoyé à l'usager).
- 💶 **Paiements** : mettez à jour le statut dès réception du chèque/espèces.
- 📅 **Chaque nouvelle saison** : mettez à jour l'**année de convention** et vérifiez les **tarifs**.
- 🏢 **Retirer une salle/bâtiment** : préférez le **désactiver** (le rendre inactif) plutôt que le supprimer — c'est réversible et cela préserve l'historique.
- 👥 **Comptes admin** : ne peuvent pas être supprimés depuis l'interface (sécurité).

---

## 14. Récapitulatif des pages d'administration

| Page | Adresse | À quoi ça sert |
|------|---------|----------------|
| Tableau de bord | `/admin` | Vue d'ensemble + alertes |
| Réservations | `/admin/reservations` | Valider / refuser / paiements |
| Utilisateurs | `/admin/users` | Gérer les comptes |
| Tarifs | `/admin/pricing` | Fixer les prix par salle |
| Statistiques salles | `/admin/room-stats` | Occupation, bilans |
| Conventions | `/admin/conventions` | Signer, valider, paramètres officiels |

---

*Document généré comme aide-mémoire administrateur. Les fonctionnalités décrites correspondent à la version actuelle de la plateforme.*
