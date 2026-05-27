# Déploiement sur Portainer (TrueNAS)

Cette application est une app **Next.js 15** avec un **serveur custom (Socket.IO)** et une base de données **Turso (libSQL) distante**. Aucune base locale ni volume n'est nécessaire.

Fichiers fournis :
- `Dockerfile` — build multi-étapes (image finale légère, utilisateur non-root).
- `docker-compose.yml` — la stack à utiliser dans Portainer.
- `.env.example` — la liste des variables à renseigner.

---

## Option A — Portainer construit l'image depuis Git (recommandé)

1. Poussez le projet sur un dépôt Git accessible par le TrueNAS (GitHub/Gitea…).
   > ⚠️ `package-lock.json` est dans `.gitignore`. Le `Dockerfile` retombe
   > automatiquement sur `npm install` s'il est absent, mais pour des builds
   > **reproductibles**, il est conseillé de le committer
   > (`git add -f package-lock.json`).
2. Portainer → **Stacks** → **Add stack**.
3. Nom : `reservation-chartrettes`.
4. **Build method : Repository**.
   - Repository URL : l'URL de votre dépôt.
   - Reference : `refs/heads/main`.
   - Compose path : `docker-compose.yml`.
5. Section **Environment variables** : ajoutez toutes les variables de
   `.env.example` (TURSO_*, NEXTAUTH_*, EMAIL_*, `APP_PORT`, etc.).
6. **Deploy the stack**. Portainer clone le dépôt, construit l'image via le
   `Dockerfile` et démarre le conteneur.

## Option B — Coller le compose dans l'éditeur web

Identique à l'option A, mais en choisissant **Web editor** et en collant le
contenu de `docker-compose.yml`. Portainer doit pouvoir accéder au contexte de
build (le dépôt) : si ce n'est pas le cas, préférez l'option A ou l'option C.

## Option C — Image pré-construite (sans build par Portainer)

Si vous préférez construire l'image vous-même :

```bash
# Sur une machine avec Docker (ou le TrueNAS via SSH)
docker build -t reservation-chartrettes:latest .
# (optionnel) pousser vers un registre :
# docker tag reservation-chartrettes:latest registry.local/reservation-chartrettes:latest
# docker push registry.local/reservation-chartrettes:latest
```

Puis dans `docker-compose.yml` : commentez la section `build:` et décommentez
la ligne `image:`.

---

## Variables d'environnement importantes

| Variable | Rôle |
|---|---|
| `APP_PORT` | Port exposé sur le TrueNAS (défaut 3000). Le conteneur écoute toujours sur 3000 en interne. |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Connexion à la base Turso. **Obligatoire** en production. |
| `NEXTAUTH_URL` | URL publique **exacte** de l'app (avec le bon schéma http/https et le bon port/domaine). Indispensable pour que la connexion fonctionne. |
| `NEXTAUTH_SECRET` | Secret de session. Générer avec `openssl rand -base64 32`. |
| `GOOGLE_CLIENT_ID/SECRET` | Connexion Google (optionnel). Pensez à ajouter `NEXTAUTH_URL/api/auth/callback/google` dans la console Google. |
| `EMAIL_*` | Envoi des e-mails (réinitialisation de mot de passe, etc.). |

---

## Accès & reverse proxy

- Accès direct : `http://IP_TRUENAS:APP_PORT`.
- Derrière un reverse proxy (Traefik / Nginx Proxy Manager) : faites pointer le
  domaine vers le port publié, et mettez **`NEXTAUTH_URL` = l'URL publique
  finale** (ex. `https://reservation.mondomaine.fr`). Le WebSocket Socket.IO
  passe par le même hôte/port : assurez-vous que le proxy autorise l'upgrade
  WebSocket (`Upgrade`/`Connection` headers).

## Mise à jour

Re-déployez la stack avec l'option **« Pull and redeploy »** (ou re-buildez
l'image). Aucune migration de base n'est lancée par le conteneur : la base
Turso est gérée séparément (`npm run db:push` depuis un poste de dev si besoin).
