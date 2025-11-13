# Réservation Chartrettes

Application de gestion et réservation de salles pour les associations de Chartrettes.

## Fonctionnalités

### Authentification
- Inscription/Connexion avec email/mot de passe
- Connexion avec Google OAuth
- Sélection d'association lors de l'inscription
- Demande d'ajout d'association (validation admin requise)

### Utilisateurs
- Dashboard avec calendrier de réservation
- Réservation de salles par créneaux horaires
- Vue "Mes réservations" (en attente/validées/refusées/passées)
- Annulation de réservations
- Notifications email automatiques

### Administrateurs
- Dashboard avec statistiques et graphiques
- Gestion des demandes de réservation (approve/reject)
- Gestion des associations (CRUD)
- Gestion des salles (CRUD)
- Blocage manuel de dates/créneaux
- Export PDF/Excel des plannings
- Système de statistiques avancé

## Stack Technique

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB avec Mongoose
- **Authentification**: NextAuth.js
- **Email**: NodeMailer
- **Charts**: Chart.js / React-Chartjs-2

## Installation

1. Clonez le repository
```bash
git clone <repo-url>
cd reservation-chartrettes
```

2. Installez les dépendances
```bash
npm install
```

3. Configurez les variables d'environnement

Créez un fichier `.env.local` à la racine du projet :

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/reservation-chartrettes
# ou MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/reservation-chartrettes

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre-secret-key-changez-ceci-en-production

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=votre-google-client-id
GOOGLE_CLIENT_SECRET=votre-google-client-secret

# Email Configuration
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=votre-email@gmail.com
EMAIL_SERVER_PASSWORD=votre-app-password
EMAIL_FROM=noreply@reservation-chartrettes.fr
```

### Configuration de MongoDB

#### Option 1: MongoDB Local
```bash
# Installation MongoDB (exemple pour Windows)
# Téléchargez et installez MongoDB Community Edition depuis mongodb.com

# Démarrez MongoDB
mongod
```

#### Option 2: MongoDB Atlas (Cloud - Recommandé)
1. Créez un compte sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Créez un cluster gratuit
3. Créez un utilisateur de base de données
4. Autorisez votre IP
5. Récupérez la connexion string et ajoutez-la dans `.env.local`

### Configuration Google OAuth (Optionnel)

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet
3. Activez l'API Google+
4. Créez des identifiants OAuth 2.0
5. Ajoutez `http://localhost:3000/api/auth/callback/google` comme URL de redirection
6. Copiez le Client ID et Client Secret dans `.env.local`

### Configuration Email (NodeMailer avec Gmail)

1. Activez la validation en 2 étapes sur votre compte Gmail
2. Générez un mot de passe d'application : [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Utilisez ce mot de passe dans `EMAIL_SERVER_PASSWORD`

## Démarrage

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Structure du Projet

```
reservation-chartrettes/
├── src/
│   ├── app/                      # Pages Next.js App Router
│   │   ├── api/                  # API Routes
│   │   │   ├── auth/            # Authentification
│   │   │   ├── associations/    # Gestion associations
│   │   │   ├── rooms/           # Gestion salles
│   │   │   └── reservations/    # Gestion réservations
│   │   ├── auth/                # Pages d'authentification
│   │   ├── dashboard/           # Dashboard utilisateur
│   │   └── admin/               # Interface administrateur
│   ├── components/              # Composants React réutilisables
│   ├── lib/                     # Utilitaires et helpers
│   │   ├── mongodb.ts          # Connexion MongoDB
│   │   ├── auth.ts             # Configuration NextAuth
│   │   ├── email.ts            # Système email
│   │   └── utils.ts            # Fonctions utilitaires
│   ├── models/                 # Modèles Mongoose
│   │   ├── User.ts
│   │   ├── Association.ts
│   │   ├── Room.ts
│   │   └── Reservation.ts
│   └── types/                  # Types TypeScript
├── public/                     # Fichiers statiques
├── .env.local                 # Variables d'environnement (à créer)
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## Modèles de Données

### User
- name, email, password
- role: 'user' | 'admin'
- associationId (référence à Association)

### Association
- name, description
- status: 'active' | 'inactive' | 'pending'
- contact: name, email, phone

### Room
- name, description, capacity, surface
- equipment (liste d'équipements)
- images, rules
- defaultTimeSlots (horaires par défaut)
- blockedDates (dates bloquées par admin)
- isActive

### Reservation
- userId, roomId, associationId
- date, timeSlots (créneaux horaires)
- reason, estimatedParticipants, requiredEquipment
- status: 'pending' | 'approved' | 'rejected' | 'cancelled'
- adminComment, reviewedBy, reviewedAt

## Prochaines Étapes de Développement

1. ✅ Configuration du projet et authentification
2. ✅ Modèles de base de données
3. ✅ Pages d'inscription/connexion avec sélection d'association
4. 🚧 Dashboard utilisateur et système de réservation
5. 🔜 Interface admin avec statistiques
6. 🔜 Système de notifications email
7. 🔜 Prévention des conflits de réservation
8. 🔜 Export PDF/Excel des plannings
9. 🔜 Mode sombre complet
10. 🔜 Tests et déploiement

## Contribution

Ce projet est en développement actif. Les contributions sont les bienvenues !

## License

MIT
