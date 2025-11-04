# Migration de MongoDB vers Turso (SQLite)

## Résumé de la migration

Votre application a été migrée avec succès de MongoDB/Mongoose vers Turso (libSQL) avec Drizzle ORM.

## Ce qui a été fait

### 1. Installation des dépendances
- ✅ Désinstallé: `mongodb`, `mongoose`
- ✅ Installé: `@libsql/client`, `drizzle-orm`, `drizzle-kit`

### 2. Configuration de la base de données
- ✅ Créé le schéma SQL avec Drizzle ORM: `src/lib/db/schema.ts`
- ✅ Créé le fichier de connexion: `src/lib/db/index.ts`
- ✅ Créé la configuration Drizzle: `drizzle.config.ts`
- ✅ Mis à jour les variables d'environnement dans `.env` et `.env.local`

### 3. Variables d'environnement
Les variables suivantes ont été ajoutées:
```
TURSO_DATABASE_URL=libsql://mairie-chartrettes-samsam.aws-eu-west-1.turso.io
TURSO_AUTH_TOKEN=votre_token
```

### 4. Schéma de base de données
Toutes les tables ont été créées avec succès:
- ✅ `users` - Utilisateurs
- ✅ `associations` - Associations
- ✅ `rooms` - Salles
- ✅ `reservations` - Réservations

### 5. Tests
- ✅ Connexion à Turso testée avec succès
- ✅ Toutes les tables créées et accessibles
- ✅ Serveur de développement démarre correctement

## Commandes NPM disponibles

```bash
# Générer les migrations SQL
npm run db:generate

# Pousser le schéma vers la base de données
npm run db:push

# Ouvrir l'interface Drizzle Studio
npm run db:studio
```

## Test de connexion

Un script de test est disponible:
```bash
npx tsx scripts/test-db-connection.ts
```

## Structure des fichiers créés

```
src/
  lib/
    db/
      schema.ts       # Définition des tables SQL
      index.ts        # Connexion à la base de données
    mongodb.ts        # Fichier maintenu pour rétrocompatibilité (deprecated)
scripts/
  test-db-connection.ts  # Script de test de la connexion
drizzle.config.ts     # Configuration Drizzle Kit
```

## Utilisation dans votre code

### Import du client de base de données
```typescript
import { db } from '@/lib/db';
import { users, associations, rooms, reservations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
```

### Exemples de requêtes

#### Sélectionner des données
```typescript
// Tous les utilisateurs
const allUsers = await db.select().from(users);

// Utilisateur par email
const user = await db.select()
  .from(users)
  .where(eq(users.email, 'email@example.com'))
  .limit(1);
```

#### Insérer des données
```typescript
const newUser = await db.insert(users).values({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user',
}).returning();
```

#### Mettre à jour des données
```typescript
await db.update(users)
  .set({ name: 'Jane Doe' })
  .where(eq(users.id, userId));
```

#### Supprimer des données
```typescript
await db.delete(users)
  .where(eq(users.id, userId));
```

## Prochaines étapes

### Routes API à mettre à jour
Vous devrez mettre à jour les routes API suivantes pour utiliser Drizzle au lieu de Mongoose:
- `src/app/api/auth/signup/route.ts`
- `src/app/api/associations/route.ts`
- `src/app/api/rooms/route.ts`
- `src/app/api/reservations/route.ts`
- `src/app/api/reservations/[id]/route.ts`
- `src/app/api/admin/stats/route.ts`
- `src/app/api/admin/seed-test-data/route.ts`
- `src/lib/auth.ts`

### Différences clés entre Mongoose et Drizzle

| Mongoose | Drizzle |
|----------|---------|
| `Model.find()` | `db.select().from(table)` |
| `Model.findById(id)` | `db.select().from(table).where(eq(table.id, id))` |
| `Model.create(data)` | `db.insert(table).values(data)` |
| `Model.findByIdAndUpdate()` | `db.update(table).set(data).where(eq(table.id, id))` |
| `Model.findByIdAndDelete()` | `db.delete(table).where(eq(table.id, id))` |
| `new ObjectId()` | `crypto.randomUUID()` (UUID v4) |

## Migration des données existantes

Si vous avez des données dans MongoDB que vous voulez migrer, vous devrez:
1. Exporter les données de MongoDB
2. Transformer le format (ObjectId → UUID, dates, etc.)
3. Importer dans Turso

## Ressources

- [Documentation Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Documentation Turso](https://docs.turso.tech/)
- [Documentation libSQL](https://github.com/tursodatabase/libsql-client-ts)

## Support

Pour tester votre connexion à tout moment:
```bash
npx tsx scripts/test-db-connection.ts
```

Pour voir vos données avec une interface graphique:
```bash
npm run db:studio
```
