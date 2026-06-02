-- Multi-association : un compte utilisateur peut être rattaché à plusieurs associations.
-- `users.association_id` reste l'association principale/par défaut ; cette table contient
-- l'ensemble des associations rattachées au compte (y compris la principale).
--
-- Appliquée automatiquement en production via `drizzle-kit push --force` (lit schema.ts).
-- Ce fichier sert de référence / application manuelle.

CREATE TABLE IF NOT EXISTS user_associations (
	user_id text NOT NULL,
	association_id text NOT NULL,
	created_at integer NOT NULL,
	PRIMARY KEY (user_id, association_id),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (association_id) REFERENCES associations(id) ON DELETE CASCADE
);

-- Rétro-remplissage : rattache les comptes existants à leur association principale.
INSERT OR IGNORE INTO user_associations (user_id, association_id, created_at)
SELECT id, association_id, strftime('%s','now') FROM users WHERE association_id IS NOT NULL;
