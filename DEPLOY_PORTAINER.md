# Déploiement — Portainer / TrueNAS via Tailscale + Cloudflare Tunnel

Cible : déployer l'app **Next.js 15 + Socket.IO** sur le serveur **TrueNAS SCALE**
(`192.168.1.4`, IP Tailscale `100.93.215.104`), exposée publiquement sur
**`https://chartrettes-reservation.mousequetaire.com`** via un **tunnel Cloudflare nommé**.

| Élément | Valeur |
|---|---|
| Port externe (LAN + Tailscale) | `8080` |
| Port interne du container | `3000` |
| Dataset DB (TrueNAS) | `/mnt/tank/reservation-chartrettes/db` |
| URL publique | `https://chartrettes-reservation.mousequetaire.com` |
| URL Tailscale | `http://100.93.215.104:8080` |
| URL LAN | `http://192.168.1.4:8080` |
| Portainer | `https://100.93.215.104:31015` |

---

## 0. Pré-requis

- [x] Stack Tailscale déjà déployée (✓ vu dans la doc serveur).
- [x] Portainer 2.39.1+ accessible.
- [x] Domaine `mousequetaire.com` géré par Cloudflare.
- [x] Code poussé sur un dépôt GitHub public.
- [x] SSH actif (`ssh root@100.93.215.104`).

---

## 1. Préparer le dataset SQLite sur le TrueNAS

Connecte-toi en SSH (depuis Tailscale ou LAN) :

```bash
ssh root@100.93.215.104
```

Crée le dossier de la base et donne-le à l'uid `1000` (l'utilisateur `node`
dans l'image Docker) :

```bash
mkdir -p /mnt/tank/reservation-chartrettes/db
chown -R 1000:1000 /mnt/tank/reservation-chartrettes/db
chmod 750 /mnt/tank/reservation-chartrettes/db
```

> 💡 Le fichier `app.db` y sera créé au premier démarrage. Active les snapshots
> ZFS sur le dataset `reservation-chartrettes` pour une stratégie de backup
> automatique.

---

## 2. Créer le réseau Docker partagé

Toujours en SSH sur le TrueNAS, **une fois** :

```bash
docker network create cloudflared-net
```

C'est ce réseau qui permet à `cloudflared` d'atteindre le container app par
DNS Docker (`reservation-chartrettes:3000`).

---

## 3. Générer les secrets

Sur ta machine de dev (ou via SSH) :

```bash
openssl rand -base64 32       # → NEXTAUTH_SECRET
```

Conserve la valeur, tu la colleras dans Portainer à l'étape suivante.

---

## 4. Exposer le site sur Internet — deux options

### Option A — Tunnel Cloudflare **nommé** ⭐ recommandé

URL stable, HTTPS valide servi par Cloudflare, survit aux redémarrages.

1. Va sur <https://one.dash.cloudflare.com/> → **Networks** → **Tunnels**
   → **Create a tunnel**.
2. Type : **Cloudflared**. Nom : `chartrettes-reservation`. Clique **Save tunnel**.
3. Sur l'écran suivant ("Install and run a connector"), choisis l'onglet
   **Docker** et **copie le token** affiché (chaîne longue qui commence par
   `eyJhIjoi…`). C'est ton **`TUNNEL_TOKEN`**.
4. Clique **Next**.
5. Onglet **Public Hostnames** → **Add a public hostname** :
   - **Subdomain** : `chartrettes-reservation`
   - **Domain** : `mousequetaire.com`
   - **Type** : `HTTP`
   - **URL** : `reservation-chartrettes:3000`
6. **Save hostname**. Cloudflare crée automatiquement le CNAME DNS pointant
   vers `<tunnel-id>.cfargotunnel.com` (gestion automatique, certificat SSL
   valide servi par Cloudflare).
7. Continue à l'étape 6 pour déployer le container `cloudflared`.

### Option B — CNAME vers un tunnel **temporaire** trycloudflare ⚠️

Si tu veux réutiliser le tunnel temporaire déjà actif
(`never-tracker-rod-facing.trycloudflare.com`) :

| Type | Nom | Cible | Proxy |
|---|---|---|---|
| `CNAME` | `chartrettes-reservation` | `never-tracker-rod-facing.trycloudflare.com` | **Proxied (orange)** |

> ⚠️ **Limites de cette approche** :
> - Le sous-domaine `trycloudflare.com` **change à chaque redémarrage**
>   de `cloudflared` → tu devras réécrire le CNAME à chaque fois.
> - Sans proxy Cloudflare (grey cloud), HTTPS échoue : le certificat servi
>   par trycloudflare ne correspond pas à `chartrettes-reservation.mousequetaire.com`
>   → laisse impérativement le proxy en **orange cloud** pour que Cloudflare
>   serve son propre certificat valide pour ton domaine.
> - Cloudflare peut refuser un CNAME vers `*.trycloudflare.com` selon le plan
>   (parfois bloqué pour des raisons d'abus). Si la création du record échoue,
>   bascule sur l'Option A (tunnel nommé, 5 min de plus, jamais à refaire).
>
> Cette option n'est valable qu'en dépannage rapide — l'Option A est nettement
> plus stable.

Si tu choisis **B**, tu peux **sauter l'étape 6** (le container `cloudflared`
de la stack `cloudflared-reservation` n'est pas nécessaire — tu utilises
celui qui héberge déjà le tunnel temporaire).

---

## 5. Déployer la stack "reservation-chartrettes" dans Portainer

Portainer → **Stacks** → **Add stack** :

- **Name** : `reservation-chartrettes`
- **Build method** : **Repository**
  - Repository URL : ton dépôt GitHub
  - Repository reference : `refs/heads/main`
  - Compose path : `docker-compose.yml`
- **Environment variables** (onglet plus bas) — colle :

| Clé | Valeur |
|---|---|
| `APP_PORT` | `8080` |
| `DB_HOST_PATH` | `/mnt/tank/reservation-chartrettes/db` |
| `TURSO_DATABASE_URL` | `file:/data/app.db` |
| `NEXTAUTH_URL` | `https://chartrettes-reservation.mousequetaire.com` |
| `NEXTAUTH_SECRET` | *(le résultat de `openssl rand -base64 32`)* |
| `GOOGLE_CLIENT_ID` | *(optionnel)* |
| `GOOGLE_CLIENT_SECRET` | *(optionnel)* |
| `EMAIL_SERVER_HOST` / `_PORT` / `_USER` / `_PASSWORD` | *(optionnel)* |
| `EMAIL_FROM` | *(optionnel)* |

Clique **Deploy the stack**. Portainer clone le dépôt, build l'image, démarre
le container. Au **premier démarrage** l'entrypoint exécute
`npx drizzle-kit push --force` pour créer toutes les tables dans
`/data/app.db`.

> 🔍 Suivre les logs : Portainer → Containers → `reservation-chartrettes`
> → Logs. Tu dois voir « ✅ Schéma initialisé. » puis « > Ready on
> http://localhost:3000 ».

---

## 6. Déployer la stack "cloudflared-reservation"

Portainer → **Stacks** → **Add stack** :

- **Name** : `cloudflared-reservation`
- **Build method** : **Web editor**
- Colle le contenu de [`docker-compose.cloudflared.yml`](./docker-compose.cloudflared.yml).
- **Environment variables** :

| Clé | Valeur |
|---|---|
| `TUNNEL_TOKEN` | *(le token copié à l'étape 4.3)* |

Clique **Deploy the stack**. Les logs doivent afficher « Registered tunnel
connection » 2-4 fois (une par data center).

---

## 7. Vérifier

| Chemin | URL attendue | Statut |
|---|---|---|
| Internet public | <https://chartrettes-reservation.mousequetaire.com> | Page d'accueil (split-screen) |
| Tailscale | <http://100.93.215.104:8080> | Idem |
| LAN domestique | <http://192.168.1.4:8080> | Idem |

> ⚠️ Si la connexion Google échoue après déploiement : dans la console Google
> Cloud, ajoute `https://chartrettes-reservation.mousequetaire.com/api/auth/callback/google`
> à la liste des **Authorized redirect URIs** du client OAuth.

---

## 8. Créer le premier compte administrateur

Depuis n'importe quel navigateur sur l'URL publique :

1. Clique **« Créer un compte »**.
2. Inscris-toi normalement (le 1er compte est un user standard).
3. Bascule en admin par SQL :

```bash
ssh root@100.93.215.104
docker exec -it reservation-chartrettes sh -c \
  "node -e \"
    const {createClient} = require('@libsql/client');
    const c = createClient({url:'file:/data/app.db'});
    c.execute({sql:'UPDATE users SET role = ? WHERE email = ?',args:['admin','TON_EMAIL']})
     .then(r => console.log('rows:', r.rowsAffected));
  \""
```

Remplace `TON_EMAIL` par ton email d'inscription.

---

## 9. Mises à jour

### Code (sans changement de schéma)

Portainer → Stack `reservation-chartrettes` → **Pull and redeploy**. Portainer
re-pull le repo, rebuild, redémarre. La base sur le volume `/data` n'est pas
touchée.

### Code + nouveau schéma DB

Après pull/redeploy, applique le nouveau schéma :

```bash
docker exec -it reservation-chartrettes sh -c "npx drizzle-kit push --force"
```

> ⚠️ `push --force` peut dropper des colonnes supprimées du schéma. Pour des
> changements destructifs, prévois un dump avant :
> `cp /mnt/tank/reservation-chartrettes/db/app.db /mnt/tank/backups/app-$(date +%F).db`.

---

## 10. Backup

Snapshot ZFS manuel :

```bash
zfs snapshot tank/reservation-chartrettes@manuel-$(date +%F-%H%M)
```

Ou planifier des snapshots auto via TrueNAS UI → **Data Protection** →
**Periodic Snapshot Tasks** sur le dataset `tank/reservation-chartrettes`.

Copie distante :

```bash
scp -i ~/.ssh/id_ed25519 \
  root@100.93.215.104:/mnt/tank/reservation-chartrettes/db/app.db \
  ./backup-app-$(date +%F).db
```

---

## 11. Dépannage rapide

| Symptôme | Cause probable | Solution |
|---|---|---|
| `permission denied` sur `/data/app.db` au boot | dataset pas chown vers uid 1000 | `chown -R 1000:1000 /mnt/tank/reservation-chartrettes/db` |
| Tunnel `chartrettes-reservation.mousequetaire.com` répond 502 | container app pas joignable | Vérifie que les 2 stacks sont sur `cloudflared-net` (`docker network inspect cloudflared-net`) |
| `NEXTAUTH_URL` mismatch (login boucle) | URL ≠ celle tapée dans le navigateur | Mets exactement la même URL publique (scheme + host, sans slash final) |
| WebSocket Socket.IO KO | Cloudflare Tunnel ne route pas l'upgrade | Dashboard Tunnel → Public Hostname → Additional settings → "HTTP2" ON (Cloudflare gère l'upgrade automatiquement) |
| Premier boot bloque sur drizzle-kit | `drizzle-kit` absent | Confirme qu'il est dans `dependencies` du `package.json` (pas devDeps) |
| `docker network create cloudflared-net` → already exists | Réseau déjà créé | Ignore l'erreur, c'est OK |
