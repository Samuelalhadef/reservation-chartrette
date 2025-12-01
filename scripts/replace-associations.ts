import { db } from '../src/lib/db';
import { associations, users, reservations } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

const newAssociations = [
  {
    name: "ADAC (Arts et Culture)",
    description: "Association d'arts et de culture",
    contactName: "Anny Dardenne (Présidente)",
    contactPhone: "06 75 29 66 31",
    contactEmail: "adac77@orange.fr",
    status: 'active' as const,
  },
  {
    name: "Amuse Danse",
    description: "Association de danse",
    contactName: "Bruno Caminade (Président)",
    contactPhone: "06 67 65 37 43",
    contactEmail: "amuse.danse77590@gmail.com",
    status: 'active' as const,
  },
  {
    name: "Chorale Odyssée",
    description: "Chorale",
    contactName: "Sandrine Poitout (Présidente)",
    contactPhone: "06 22 45 20 50",
    contactEmail: "odyss.ct77@gmail.com",
    status: 'active' as const,
  },
  {
    name: "Compagnie Tidcat Théâtre",
    description: "Compagnie de théâtre",
    contactName: "Laurent Cattaert (Professeur)",
    contactPhone: "06 52 62 58 78",
    contactEmail: "compagnie.tidcat@gmail.com",
    status: 'active' as const,
  },
  {
    name: "FAL - Loisirs Arts Créatifs",
    description: "Atelier de loisirs créatifs",
    contactName: "Catherine Micaelli",
    contactPhone: "06 74 03 85 86",
    contactEmail: "Cath.micaelli@gmail.com",
    status: 'active' as const,
  },
  {
    name: "FAL - Club Photo Images Passion",
    description: "Club de photographie",
    contactName: "Marie Jo Boquet",
    contactPhone: "06 89 29 23 93",
    contactEmail: "majoboq@gmail.com",
    status: 'active' as const,
  },
  {
    name: "Paroles de Corps (Danse)",
    description: "Association de danse",
    contactName: "Céline François",
    contactPhone: "06 75 72 42 61",
    contactEmail: "parolesdecorps@yahoo.com",
    status: 'active' as const,
  },
  {
    name: "Amis de Dance Maniac (Tango)",
    description: "Association de danse tango",
    contactName: "Elie Florentin (Président)",
    contactPhone: "Non indiqué",
    contactEmail: "amisdedancemaniac@gmail.com",
    status: 'active' as const,
  },
  {
    name: "Atelier d'expression « Osez »",
    description: "Atelier d'expression",
    contactName: "Gérard Chambre / Isabelle Halliday",
    contactPhone: "06 17 78 68 15",
    contactEmail: "Non indiqué",
    status: 'active' as const,
  },
  {
    name: "Tennis Club de Chartrettes",
    description: "Club de tennis",
    contactName: "Pascal Verrecchia (Président)",
    contactPhone: "06 72 13 68 82",
    contactEmail: "verrecchiapascal@yahoo.fr",
    status: 'active' as const,
  },
  {
    name: "ASC - Basket Ball",
    description: "Club de basket-ball",
    contactName: "Vincent Levrier (Président)",
    contactPhone: "06 14 74 95 95",
    contactEmail: "aschartrettesbasket@gmail.com",
    status: 'active' as const,
  },
  {
    name: "Club Nautique de Chartrettes",
    description: "Club nautique",
    contactName: "Martin Delacour (Président)",
    contactPhone: "06 77 600 800",
    contactEmail: "cncssm@gmail.com",
    status: 'active' as const,
  },
  {
    name: "Le CLAP (Légende Auto Passion)",
    description: "Club automobile",
    contactName: "Philippe Mourault (Président)",
    contactPhone: "06 80 18 26 99",
    contactEmail: "contact@clap-asso.net",
    status: 'active' as const,
  },
  {
    name: "Judo-Jujitsu Club",
    description: "Club de judo et jujitsu",
    contactName: "Marine Doudoux (Présidente)",
    contactPhone: "07 66 09 31 23",
    contactEmail: "dojo.jjcc@gmail.com",
    status: 'active' as const,
  },
  {
    name: "FAL - Fitness / Zumba",
    description: "Cours de fitness et zumba",
    contactName: "Valérie Rubio",
    contactPhone: "06 33 33 85 94",
    contactEmail: "maryse.poitevin@wanadoo.fr",
    status: 'active' as const,
  },
  {
    name: "FAL - Yoga",
    description: "Cours de yoga",
    contactName: "Maryse Poitevin",
    contactPhone: "01 60 59 17 20",
    contactEmail: "maryse.poitevin@wanadoo.fr",
    status: 'active' as const,
  },
  {
    name: "FAL - Marche Nordique",
    description: "Club de marche nordique",
    contactName: "Marie-Jo Boquet",
    contactPhone: "06 89 29 23 93",
    contactEmail: "majoboq@gmail.com",
    status: 'active' as const,
  },
  {
    name: "Karaté Club",
    description: "Club de karaté",
    contactName: "Patrice Diot (Professeur)",
    contactPhone: "06 26 50 44 29",
    contactEmail: "karatechartrettes@orange.fr",
    status: 'active' as const,
  },
  {
    name: "Pétanque",
    description: "Club de pétanque",
    contactName: "Brigitte Sirou",
    contactPhone: "06 20 07 83 13",
    contactEmail: "Non indiqué",
    status: 'active' as const,
  },
  {
    name: "77ASAC (Danse rock/swing)",
    description: "Association de danse rock et swing",
    contactName: "Catherine Chatelain (Présidente)",
    contactPhone: "06 58 72 85 42",
    contactEmail: "77asac@gmail.com",
    status: 'active' as const,
  },
  {
    name: "Badminton",
    description: "Club de badminton",
    contactName: "Pierre Jarras",
    contactPhone: "01 60 66 39 67",
    contactEmail: "Non indiqué",
    status: 'active' as const,
  },
  {
    name: "Gym Vitalité Dynamisme (GVD)",
    description: "Club de gymnastique",
    contactName: "Annie Viratelle (Présidente)",
    contactPhone: "06 17 68 47 38",
    contactEmail: "gvdchartrettes@gmail.com",
    status: 'active' as const,
  },
  {
    name: "SEL Fleur de Seine",
    description: "Système d'échange local",
    contactName: "Annie Mejane",
    contactPhone: "06 83 33 24 57",
    contactEmail: "selfleurdeseine@gmail.com",
    status: 'active' as const,
  },
  {
    name: "Cercle du Joyeux Automne (CJA)",
    description: "Club du troisième âge",
    contactName: "Nicole Blain (Présidente)",
    contactPhone: "06 30 31 37 04",
    contactEmail: "nicole.blain@sfr.fr",
    status: 'active' as const,
  },
  {
    name: "AAPEC (Parents d'élèves)",
    description: "Association de parents d'élèves",
    contactName: "Non spécifié",
    contactPhone: "Non indiqué",
    contactEmail: "aapec.chartrettes@gmail.com",
    status: 'active' as const,
  },
  {
    name: "La Mémoire Combattante",
    description: "Association d'anciens combattants",
    contactName: "Yves Barberon (Président)",
    contactPhone: "Non indiqué",
    contactEmail: "yves.barberon0534@orange.fr",
    status: 'active' as const,
  },
  {
    name: "Le Carapate (Pédibus)",
    description: "Pédibus scolaire",
    contactName: "Contact via AAPEC",
    contactPhone: "Non indiqué",
    contactEmail: "carapatte.aapec@gmail.com",
    status: 'active' as const,
  },
  {
    name: "Comité des Fêtes",
    description: "Comité des fêtes",
    contactName: "Florence Lair (Présidente)",
    contactPhone: "06 32 95 51 86",
    contactEmail: "cdfchartrettes77@gmail.com",
    status: 'active' as const,
  },
  {
    name: "Comité de Jumelage",
    description: "Comité de jumelage",
    contactName: "Jean-Marc Olsson (Président)",
    contactPhone: "06 37 51 85 39",
    contactEmail: "contact@chartrettes-jumelage.com",
    status: 'active' as const,
  },
  {
    name: "Association Communale de Chasse",
    description: "Association de chasse",
    contactName: "Didier Salducci (Président)",
    contactPhone: "06 76 46 28 42",
    contactEmail: "didiersalducci@hotmail.fr",
    status: 'active' as const,
  },
  {
    name: "Les Potagers d'Enfer",
    description: "Association de jardinage",
    contactName: "Claire Bouley (Présidente)",
    contactPhone: "06 50 56 95 81",
    contactEmail: "claire.rigny@gmail.com",
    status: 'active' as const,
  },
  {
    name: "GASF (Amis des Abeilles)",
    description: "Association de protection des abeilles",
    contactName: "Monique Chauveau (Présidente)",
    contactPhone: "06 66 73 30 47",
    contactEmail: "lesamisdesabeilles@orange.fr",
    status: 'active' as const,
  },
  {
    name: "Le Furet Chartrettois",
    description: "Journal local",
    contactName: "Erich Genet (Président)",
    contactPhone: "06 65 08 78 56",
    contactEmail: "furet.chartrettois@yahoo.fr",
    status: 'active' as const,
  },
  {
    name: "APPVE (Protection vallées)",
    description: "Association de protection de l'environnement",
    contactName: "Florence Thieble (Présidente)",
    contactPhone: "06 58 26 69 79",
    contactEmail: "chartrettesparadis@gmail.com",
    status: 'active' as const,
  },
  {
    name: "Association Le Grand Barbeau",
    description: "Association environnementale",
    contactName: "Jean Dey (Président)",
    contactPhone: "06 80 47 23 58",
    contactEmail: "jeandey77@yahoo.fr",
    status: 'active' as const,
  },
  {
    name: "Chartrettes Nature Environnement",
    description: "Association de protection de la nature",
    contactName: "Alain Meffre (Président)",
    contactPhone: "01 60 69 64 16",
    contactEmail: "chartrettesnature@free.fr",
    status: 'active' as const,
  },
  {
    name: "Sauvage par Nature",
    description: "Association de protection de la nature",
    contactName: "Michel Zyssman (Secrétaire)",
    contactPhone: "06 09 63 12 79",
    contactEmail: "sauvageparnature@mailo.fr",
    status: 'active' as const,
  },
  // Ajouter les associations spéciales pour le système
  {
    name: "Mairie de Chartrettes",
    description: "Administration municipale",
    contactName: "Mairie de Chartrettes",
    contactPhone: "01 60 69 60 01",
    contactEmail: "contact@chartrettes.fr",
    status: 'active' as const,
  },
  {
    name: "Particuliers",
    description: "Association virtuelle pour les réservations des particuliers",
    contactName: "Mairie de Chartrettes",
    contactPhone: "01 60 69 60 01",
    contactEmail: "contact@chartrettes.fr",
    status: 'active' as const,
  },
];

async function replaceAssociations() {
  try {
    console.log('🔄 Remplacement des associations...');

    // 1. Supprimer toutes les réservations existantes (pour éviter les contraintes de clé étrangère)
    console.log('📝 Suppression des réservations existantes...');
    await db.delete(reservations);
    console.log('✅ Réservations supprimées');

    // 2. Détacher tous les utilisateurs de leurs associations (sauf les admins et particuliers)
    console.log('📝 Détachement des utilisateurs des associations...');
    const allUsers = await db.select().from(users);
    for (const user of allUsers) {
      if (user.role !== 'admin' && user.role !== 'particulier' && user.associationId) {
        await db.update(users).set({ associationId: null }).where(eq(users.id, user.id));
      }
    }
    console.log('✅ Utilisateurs détachés');

    // 3. Supprimer toutes les anciennes associations
    console.log('📝 Suppression des anciennes associations...');
    await db.delete(associations);
    console.log('✅ Anciennes associations supprimées');

    // 4. Insérer les nouvelles associations
    console.log('📝 Insertion des nouvelles associations...');
    for (const assoc of newAssociations) {
      await db.insert(associations).values(assoc);
      console.log(`✅ Association créée: ${assoc.name}`);
    }

    console.log('\n✅ Migration terminée avec succès!');
    console.log(`📊 ${newAssociations.length} associations créées`);
    console.log('\n⚠️  IMPORTANT:');
    console.log('   - Toutes les réservations ont été supprimées');
    console.log('   - Les utilisateurs (sauf admin et particuliers) doivent choisir une nouvelle association');
    console.log('   - Les particuliers conservent leur rôle');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  }
}

// Exécuter le script
replaceAssociations()
  .then(() => {
    console.log('✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
