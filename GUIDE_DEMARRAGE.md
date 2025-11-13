# Guide de Démarrage - Réservation Chartrettes

## Ce qui a été créé

Votre application de réservation de salles est maintenant prête avec les fonctionnalités suivantes :

### Authentification complète
- Inscription/Connexion avec email et mot de passe
- Connexion avec Google OAuth
- Sélection obligatoire d'association lors de l'inscription
- Demande d'ajout d'association (avec validation admin)

### Interface utilisateur
- Dashboard principal avec statistiques personnelles
- Calendrier interactif de réservation avec sélection de créneaux horaires
- Vue "Mes réservations" avec filtres par statut
- Notifications visuelles et emails automatiques

### Interface administrateur
- Dashboard avec statistiques avancées et graphiques
- Gestion des demandes de réservation (approve/reject avec commentaire)
- Statistiques en temps réel :
  - Taux d'occupation par salle
  - Top 10 des associations actives
  - Répartition par statut
  - Taux d'acceptation global

### Système de notifications email
- Confirmation de demande reçue
- Notification d'approbation (avec commentaire admin optionnel)
- Notification de refus (avec motif obligatoire)

## Configuration requise pour démarrer

### 1. Configuration MongoDB

Vous avez deux options :

#### Option A : MongoDB Atlas (Cloud - Recommandé pour démarrage rapide)

1. Allez sur https://www.mongodb.com/cloud/atlas
2. Créez un compte gratuit
3. Créez un cluster gratuit (M0)
4. Créez un utilisateur de base de données :
   - Username: `reservation_admin`
   - Password: choisissez un mot de passe sécurisé
5. Network Access : Ajoutez `0.0.0.0/0` (pour autoriser toutes les IP en développement)
6. Récupérez votre connection string :
   ```
   mongodb+srv://reservation_admin:<password>@cluster0.xxxxx.mongodb.net/reservation-chartrettes?retryWrites=true&w=majority
   ```

7. Mettez à jour `.env.local` :
   ```env
   MONGODB_URI=mongodb+srv://reservation_admin:VOTRE_MOT_DE_PASSE@cluster0.xxxxx.mongodb.net/reservation-chartrettes?retryWrites=true&w=majority
   ```

#### Option B : MongoDB Local

1. Téléchargez MongoDB Community Server : https://www.mongodb.com/try/download/community
2. Installez et démarrez MongoDB
3. Dans `.env.local`, utilisez :
   ```env
   MONGODB_URI=mongodb://localhost:27017/reservation-chartrettes
   ```

### 2. Configuration NextAuth

Générez une clé secrète sécurisée :

```bash
# Sur Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Sur Linux/Mac
openssl rand -base64 32
```

Mettez à jour dans `.env.local` :
```env
NEXTAUTH_SECRET=votre-clé-secrète-générée
NEXTAUTH_URL=http://localhost:3000
```

### 3. Configuration Email (NodeMailer avec Gmail)

#### Étapes détaillées :

1. **Activez la validation en 2 étapes sur Gmail** :
   - Allez sur https://myaccount.google.com/security
   - Activez "Validation en deux étapes"

2. **Créez un mot de passe d'application** :
   - Allez sur https://myaccount.google.com/apppasswords
   - Sélectionnez "Autre (nom personnalisé)"
   - Entrez "Reservation Chartrettes"
   - Copiez le mot de passe de 16 caractères généré

3. **Mettez à jour `.env.local`** :
```env
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=votre-email@gmail.com
EMAIL_SERVER_PASSWORD=le-mot-de-passe-d-application-16-caracteres
EMAIL_FROM=noreply@reservation-chartrettes.fr
```

### 4. Configuration Google OAuth (Optionnel)

1. Allez sur https://console.cloud.google.com/
2. Créez un nouveau projet "Reservation Chartrettes"
3. Activez l'API "Google+ API"
4. Créez des identifiants OAuth 2.0 :
   - Type : Application Web
   - Origines autorisées : `http://localhost:3000`
   - URI de redirection : `http://localhost:3000/api/auth/callback/google`
5. Copiez le Client ID et Client Secret dans `.env.local` :

```env
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret
```

## Démarrage de l'application

### 1. Vérifiez que les dépendances sont installées

```bash
npm install
```

### 2. Vérifiez votre fichier `.env.local`

Assurez-vous que toutes les variables sont remplies :

```env
# MongoDB
MONGODB_URI=mongodb+srv://... ou mongodb://localhost:27017/reservation-chartrettes

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre-secret-genere

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=votre-google-client-id
GOOGLE_CLIENT_SECRET=votre-google-client-secret

# Email
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=votre-email@gmail.com
EMAIL_SERVER_PASSWORD=votre-mot-de-passe-application
EMAIL_FROM=noreply@reservation-chartrettes.fr
```

### 3. Lancez le serveur de développement

```bash
npm run dev
```

L'application sera accessible sur : http://localhost:3000

## Premiers pas

### 1. Créer un administrateur

Pour créer le premier compte administrateur, vous devez :

1. Créez d'abord une association directement dans MongoDB :

```javascript
// Connectez-vous à MongoDB (via MongoDB Compass ou mongosh)
// et exécutez :

db.associations.insertOne({
  name: "Administration Chartrettes",
  description: "Association administrative",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

2. Inscrivez-vous normalement via l'interface : http://localhost:3000/auth/signup
3. Sélectionnez l'association "Administration Chartrettes"
4. Une fois inscrit, changez manuellement le rôle dans MongoDB :

```javascript
db.users.updateOne(
  { email: "votre-email@example.com" },
  { $set: { role: "admin" } }
)
```

5. Déconnectez-vous et reconnectez-vous pour que les changements prennent effet

### 2. Ajouter des salles

1. Connectez-vous en tant qu'admin
2. Allez dans MongoDB et ajoutez des salles :

```javascript
db.rooms.insertMany([
  {
    name: "Salle Principale",
    description: "Grande salle pour événements",
    capacity: 100,
    surface: 150,
    equipment: [
      { name: "Vidéoprojecteur", available: true },
      { name: "Système audio", available: true },
      { name: "WiFi", available: true }
    ],
    defaultTimeSlots: { start: "08:00", end: "22:00" },
    blockedDates: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Salle de Réunion",
    description: "Petite salle pour réunions",
    capacity: 20,
    surface: 40,
    equipment: [
      { name: "Tableau blanc", available: true },
      { name: "WiFi", available: true }
    ],
    defaultTimeSlots: { start: "08:00", end: "20:00" },
    blockedDates: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
])
```

### 3. Ajouter des associations

En tant qu'admin, vous pouvez ajouter des associations directement dans MongoDB :

```javascript
db.associations.insertMany([
  {
    name: "Club de Sport",
    description: "Association sportive locale",
    status: "active",
    contactName: "Jean Dupont",
    contactEmail: "contact@clubsport.fr",
    contactPhone: "0123456789",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Association Culturelle",
    description: "Promotion de la culture locale",
    status: "active",
    contactName: "Marie Martin",
    contactEmail: "contact@culture.fr",
    contactPhone: "0987654321",
    createdAt: new Date(),
    updatedAt: new Date()
  }
])
```

## Structure des pages

### Pages publiques
- `/` - Page d'accueil
- `/auth/signin` - Connexion
- `/auth/signup` - Inscription

### Pages utilisateur (requiert connexion)
- `/dashboard` - Dashboard principal
- `/dashboard/reservations` - Liste des réservations
- `/dashboard/new-reservation` - Nouvelle réservation

### Pages admin (requiert rôle admin)
- `/admin` - Dashboard admin avec statistiques
- `/admin/reservations` - Gestion des demandes de réservation

## Prochaines étapes de développement

Les fonctionnalités suivantes sont prêtes à être implémentées :

1. **Gestion complète des salles (CRUD)** - Interface admin
2. **Gestion des associations** - Valider/Refuser les demandes
3. **Calendrier visuel avancé** - Vue mensuelle avec FullCalendar
4. **Export PDF/Excel** - Des plannings et statistiques
5. **Rappels automatiques** - Email 48h avant la réservation
6. **Mode sombre complet** - Toggle dans la navbar
7. **Système de pénalités** - Annulations tardives
8. **Historique des actions admin** - Logs d'audit

## Dépannage

### Problème : "Cannot connect to MongoDB"
- Vérifiez que MongoDB est démarré (si local)
- Vérifiez votre MONGODB_URI dans `.env.local`
- Vérifiez votre connexion Internet (si Atlas)
- Vérifiez les autorisations Network Access dans Atlas

### Problème : "Error sending email"
- Vérifiez vos identifiants Gmail
- Assurez-vous d'utiliser un mot de passe d'application
- Vérifiez que la validation en 2 étapes est activée

### Problème : "NextAuth error"
- Vérifiez NEXTAUTH_SECRET est défini
- Vérifiez NEXTAUTH_URL correspond à votre URL locale

### Problème : Page blanche ou erreur
- Consultez la console du navigateur (F12)
- Consultez les logs du terminal
- Vérifiez que toutes les dépendances sont installées

## Support et Ressources

- **Documentation Next.js** : https://nextjs.org/docs
- **Documentation NextAuth.js** : https://next-auth.js.org
- **Documentation MongoDB** : https://www.mongodb.com/docs
- **Documentation Tailwind CSS** : https://tailwindcss.com/docs

Bon développement ! 🚀
