import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { associations } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

// Liste des associations par catégorie
const defaultAssociations = [
  // ARTS ET CULTURE
  {
    name: 'ASSOCIATION POUR LE DEVELOPPEMENT DES ARTS ET DE LA CULTURE (ADAC)',
    description: 'Musique, Éveil, Chant, Arts plastiques, Ateliers Récréatifs, Textile, Vannerie, Couture, Atelier écriture, Danse sensorielle, Ciné-Club, et Jeux du monde.',
    category: 'Arts et Culture',
    status: 'active' as const,
    contactName: 'Anny DARDENNE (Présidente)',
    contactEmail: 'adac77@orange.fr',
    contactPhone: '06 75 29 66 31',
  },
  {
    name: 'AMUSE DANSE',
    description: 'Transmet, fait vivre et partage les danses et musiques traditionnelles de nos régions au travers d\'ateliers et de bals.',
    category: 'Arts et Culture',
    status: 'active' as const,
    contactName: 'Bruno CAMINADE (Président), Maryse DHEURLE, Donatienne TERSIGUEL',
    contactEmail: 'amuse.danse77590@gmail.com',
    contactPhone: '06 67 65 37 43, 06.71.70.51.05 (Maryse DHEURLE), 06.08.05.67.22 (Donatienne TERSIGUEL)',
  },
  {
    name: 'CHORALE ODYSSÉE',
    description: 'Chant choral (adultes et jeunes à partir de 16 ans) avec un répertoire varié : classique, variétés, traditionnel, gospels, etc.',
    category: 'Arts et Culture',
    status: 'active' as const,
    contactName: 'Sandrine POITOUT (Présidente), Joëlle MAZMANIAN (Secrétaire)',
    contactEmail: 'odyss.ct77@gmail.com',
    contactPhone: '06 22 45 20 50 (Sandrine POITOUT), 06 37 31 09 83 (Joëlle MAZMANIAN)',
  },
  {
    name: 'COMPAGNIE TIDCAT',
    description: 'Pratique de l\'improvisation théâtrale pour les 16 ans et plus.',
    category: 'Arts et Culture',
    status: 'active' as const,
    contactName: 'Frédéric REIMERINGER',
    contactEmail: 'lacompagnietidcat@gmail.com',
    contactPhone: '06 14 62 48 95',
  },
  {
    name: 'FOYER D\'ANIMATION ET DE LOISIRS DE CHARTRETTES (FAL) - Loisir Créatif',
    description: 'Atelier d\'Arts Créatifs pour développer sa créativité.',
    category: 'Arts et Culture',
    status: 'active' as const,
    contactName: 'Catherine MICAELLI',
    contactEmail: 'Cath.micaelli@gmail.com',
    contactPhone: '06 74 03 85 86',
  },
  {
    name: 'ASSOCIATION PAROLES DE CORPS - ÉCOLE DE DANSE CONTEMPORAINE',
    description: 'Cours de Danse Contemporaine (enfants, ados, adultes), stages, ateliers chorégraphiques et ateliers adultes-enfants.',
    category: 'Arts et Culture',
    status: 'active' as const,
    contactName: 'Céline FRANÇOIS (Professeure / Contact pédagogique)',
    contactEmail: 'parolesdecorps@yahoo.com',
    contactPhone: '06.76.94.18.39 (Pédagogique), 06.75.72.42.61 (Administratif)',
  },
  {
    name: 'OSEZ',
    description: 'Prendre le micro et s\'exprimer ou chanter sur un thème donné.',
    category: 'Arts et Culture',
    status: 'active' as const,
    contactName: 'Gérard CHAMBRE (Créateur), Isabelle Halliday',
    contactEmail: null,
    contactPhone: '06 17 78 68 15 (Gérard CHAMBRE), 06 23 77 95 91 (Isabelle Halliday)',
  },

  // SPORTS ET LOISIRS
  {
    name: 'TENNIS CLUB DE CHARTRETTES',
    description: 'Pratique libre et entraînements de tennis pour adultes et enfants.',
    category: 'Sports et Loisirs',
    status: 'active' as const,
    contactName: 'Pascal VERRECCHIA (Président)',
    contactEmail: 'verrecchiapascal@yahoo.fr',
    contactPhone: '06 72 13 68 82',
  },
  {
    name: 'ASSOCIATION SPORTIVE DE CHARTRETTES (ASC) - BASKET BALL',
    description: 'Pratique du basket-ball.',
    category: 'Sports et Loisirs',
    status: 'active' as const,
    contactName: 'Vincent LEVRIER (Président), Cédric CHAUSSARD (Correspondant sportif)',
    contactEmail: 'aschartrettesbasket@gmail.com',
    contactPhone: '06.14.74.95.95 (Vincent LEVRIER), 06 85 91 80 12 (Cédric CHAUSSARD)',
  },
  {
    name: 'CLUB NAUTIQUE DE CHARTRETTES (CNC)',
    description: 'École de pagaie, canoë-kayak, stand up paddle, longe côte. Propose des cours, stages et de la location.',
    category: 'Sports et Loisirs',
    status: 'active' as const,
    contactName: null,
    contactEmail: 'cncssm@gmail.com',
    contactPhone: null,
  },
  {
    name: 'LE CLAP - CLUB LÉGENDE AUTO PASSION',
    description: 'Rassemble des propriétaires d\'automobiles de collection, de sport et d\'exception. Organise expositions, rallyes, balades touristiques et événements caritatifs.',
    category: 'Sports et Loisirs',
    status: 'active' as const,
    contactName: 'Philippe MOURAULT (Président)',
    contactEmail: 'contact@clap-asso.net',
    contactPhone: '+33 6 80 18 26 99',
  },
  {
    name: 'JUDO-JUJITSU CLUB DE CHARTRETTES (JJC)',
    description: 'Pratique du Judo et du Ju-Jitsu pour enfants, adolescents et adultes.',
    category: 'Sports et Loisirs',
    status: 'active' as const,
    contactName: 'Laurent BOQUET (Président)',
    contactEmail: 'jjclub.chartrettes@gmail.com',
    contactPhone: '06 60 76 81 50',
  },
  {
    name: 'FOYER D\'ANIMATION ET DE LOISIRS DE CHARTRETTES (FAL) - Marche Nordique et Randonnée',
    description: 'Marche nordique et randonnée pédestre (sorties le lundi, mardi, mercredi, vendredi, dimanche matin, samedi après-midi et un dimanche par mois).',
    category: 'Sports et Loisirs',
    status: 'active' as const,
    contactName: 'Marie-Jo BOQUET',
    contactEmail: null,
    contactPhone: '01.60.66.34.51, 06.89.29.23.49',
  },
  {
    name: 'FOYER D\'ANIMATION ET DE LOISIRS DE CHARTRETTES (FAL) - Karaté',
    description: 'Pratique du Karaté pour enfants, adolescents et adultes.',
    category: 'Sports et Loisirs',
    status: 'active' as const,
    contactName: 'Frédéric GOUEL (Professeur D.E)',
    contactEmail: 'gouelfrederic@yahoo.fr',
    contactPhone: '06 28 01 61 74',
  },
  {
    name: 'GYM VITALITE DYNAMISME (GVD) / FAL - Gymnastique',
    description: 'Cours de Piscine (Aquagym), Pilates, Gym Cardio Training, Renforcement Musculaire, Stretching, Gym Douce et Gym pour les Aînés.',
    category: 'Sports et Loisirs',
    status: 'active' as const,
    contactName: 'Maryse POITEVIN',
    contactEmail: 'maryse.poitevin@wanadoo.fr',
    contactPhone: '01 60 59 17 20',
  },

  // ÉDUCATION ET VIE SOCIALE
  {
    name: 'SYSTÈME D\'ÉCHANGE LOCAL FLEUR DE SEINE (SEL)',
    description: 'Crée des relations de bon voisinage et encourage la solidarité par l\'échange de savoirs, de services et d\'objets ("banque de temps").',
    category: 'Éducation et Vie Sociale',
    status: 'active' as const,
    contactName: 'Association à direction collégiale',
    contactEmail: 'selfleurdeseine@gmail.com',
    contactPhone: '06 83 06 31 86',
  },
  {
    name: 'CERCLE DU JOYEUX AUTOMNE (CJA)',
    description: 'Rencontres, jeux, sorties et voyages pour les seniors.',
    category: 'Éducation et Vie Sociale',
    status: 'active' as const,
    contactName: 'Jacky LE MOAL (Président), Maryse CHARDON (Vice-présidente)',
    contactEmail: null,
    contactPhone: '06 20 62 13 89',
  },
  {
    name: 'ASSOCIATION AUTONOME DES PARENTS D\'ÉLÈVES DE CHARTRETTES (AAPEC)',
    description: 'Relais entre le scolaire, le périscolaire et les parents (conseils d\'école, cantine). Organise des événements (kermesse, marché de Noël).',
    category: 'Éducation et Vie Sociale',
    status: 'active' as const,
    contactName: null,
    contactEmail: 'carapatte.aapec@gmail.com',
    contactPhone: null,
  },
  {
    name: 'ASSOCIATION "LA MÉMOIRE COMBATTANTE"',
    description: 'Participation aux cérémonies mémorielles et organisation de conférences, expositions et voyages sur la Mémoire de l\'Histoire.',
    category: 'Éducation et Vie Sociale',
    status: 'active' as const,
    contactName: 'Franck ROUSSELLE (Président)',
    contactEmail: 'franck.rousselle@sfr.fr',
    contactPhone: '06 20 40 18 96',
  },
  {
    name: 'COMITÉ DES FÊTES (CDF)',
    description: 'Participe à la vie locale en organisant des événements (Vide Grenier, Halloween, Marché de Noël, Carnaval, Fête de la Musique).',
    category: 'Éducation et Vie Sociale',
    status: 'active' as const,
    contactName: 'Florence LAIR (Présidente)',
    contactEmail: 'cdfchartrettes77@gmail.com',
    contactPhone: '06 32 95 51 86',
  },
  {
    name: 'COMITÉ DE JUMELAGE',
    description: 'Favorise les échanges scolaires, culturels, touristiques et sportifs avec les villes jumelles (Roscommon et Doña Mencía). Organise des cours d\'Espagnol et d\'Anglais.',
    category: 'Éducation et Vie Sociale',
    status: 'active' as const,
    contactName: 'Jean-Marc OLSSON (Président)',
    contactEmail: 'contact@chartrettes-jumelage.com',
    contactPhone: '06 37 51 85 39',
  },

  // HUMANITAIRE ET ENVIRONNEMENT
  {
    name: 'ASSOCIATION COMMUNALE DE CHASSE',
    description: 'Maîtrise des populations de gibiers et protection en prélevant les nuisibles. Organise la chasse en battue et en individuel.',
    category: 'Humanitaire et Environnement',
    status: 'active' as const,
    contactName: 'Didier SALDUCCI (Président)',
    contactEmail: 'didiersalducci@hotmail.fr',
    contactPhone: '06 76 46 28 42',
  },
  {
    name: 'GROUPEMENT DES AMIS DES ABEILLES DU VAL DE SEINE ET DE LA FORET DE FONTAINEBLEAU (GASF)',
    description: 'Protection des abeilles et autres pollinisateurs, sensibilisation au fleurissement mellifère et lutte contre le frelon asiatique. Ramassage gratuit d\'essaims d\'abeilles.',
    category: 'Humanitaire et Environnement',
    status: 'active' as const,
    contactName: 'Monique CHAUVEAU (Présidente)',
    contactEmail: 'lesamisdesabeilles@orange.fr',
    contactPhone: '06 66 73 30 47',
  },
  {
    name: 'LES POTAGERS D\'ENFER',
    description: 'Mise à disposition de parcelles pour les Chartrettois (jardins familiaux).',
    category: 'Humanitaire et Environnement',
    status: 'active' as const,
    contactName: 'Henri DUVANT (Président)',
    contactEmail: null,
    contactPhone: '06 88 56 16 36',
  },
  {
    name: 'LE FURET CHARTRETTOIS',
    description: 'Organisation de deux troc-livres par an.',
    category: 'Humanitaire et Environnement',
    status: 'active' as const,
    contactName: 'Erich GENET (Président)',
    contactEmail: 'furet.chartrettois@yahoo.fr',
    contactPhone: '06.65.08.78.56',
  },
  {
    name: 'ASSOCIATION DE PROTECTION DES PETITES VALLÉES DE L\'ÉCLUSE (APPVE)',
    description: 'Contribue à préserver la qualité de vie (environnementale, sanitaire et sociale) et agit pour réduire les nuisances sonores autour des "Petites Vallées".',
    category: 'Humanitaire et Environnement',
    status: 'active' as const,
    contactName: 'Florence THIEBLE (Présidente)',
    contactEmail: 'chartrettesparadis@gmail.com',
    contactPhone: '06 58 26 69 79',
  },
  {
    name: 'ASSOCIATION LE GRAND BARBEAU (PÊCHE)',
    description: 'Association de Pêche.',
    category: 'Humanitaire et Environnement',
    status: 'active' as const,
    contactName: 'Jean DEY (Président), Bernard BRUNEAU (Secrétaire)',
    contactEmail: 'legrandbarbeau@gmail.com',
    contactPhone: '06 80 47 23 58 (Jean DEY), 01 60 69 57 19 (Bernard BRUNEAU)',
  },
  {
    name: 'SAUVAGE PAR NATURE',
    description: 'Association de sensibilisation à la biodiversité et la protection de la nature.',
    category: 'Humanitaire et Environnement',
    status: 'active' as const,
    contactName: null,
    contactEmail: 'sauvageparnature@mailo.fr',
    contactPhone: '06 13 41 16 03',
  },
  {
    name: 'CHARTRETTES NATURE ENVIRONNEMENT',
    description: 'Association de protection de la nature et de l\'environnement.',
    category: 'Humanitaire et Environnement',
    status: 'active' as const,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
  },
];

export async function POST(req: NextRequest) {
  try {
    const createdAssociations = [];
    const skippedAssociations = [];
    let updatedCount = 0;

    for (const assoc of defaultAssociations) {
      // Vérifier si l'association existe déjà
      const existing = await db
        .select()
        .from(associations)
        .where(sql`lower(${associations.name}) = lower(${assoc.name})`)
        .limit(1);

      if (existing.length === 0) {
        // Créer l'association
        const [newAssoc] = await db
          .insert(associations)
          .values({
            name: assoc.name,
            description: assoc.description,
            status: assoc.status,
            contactName: assoc.contactName || null,
            contactEmail: assoc.contactEmail || null,
            contactPhone: assoc.contactPhone || null,
          })
          .returning();

        createdAssociations.push({
          name: newAssoc.name,
          category: assoc.category,
          status: newAssoc.status,
        });
      } else {
        // L'association existe déjà
        const needsUpdate =
          existing[0].status !== 'active' ||
          existing[0].contactName !== (assoc.contactName || null) ||
          existing[0].contactEmail !== (assoc.contactEmail || null) ||
          existing[0].contactPhone !== (assoc.contactPhone || null);

        if (needsUpdate) {
          // Mettre à jour les informations si nécessaire
          await db
            .update(associations)
            .set({
              status: 'active',
              contactName: assoc.contactName || null,
              contactEmail: assoc.contactEmail || null,
              contactPhone: assoc.contactPhone || null,
              updatedAt: new Date()
            })
            .where(sql`lower(${associations.name}) = lower(${assoc.name})`);
          updatedCount++;
        }

        skippedAssociations.push({
          name: assoc.name,
          category: assoc.category,
          reason: needsUpdate ? 'Mise à jour' : 'Déjà existante',
        });
      }
    }

    return NextResponse.json(
      {
        message: 'Initialisation des associations terminée',
        summary: {
          total: defaultAssociations.length,
          created: createdAssociations.length,
          skipped: skippedAssociations.length,
          updated: updatedCount,
        },
        details: {
          created: createdAssociations,
          skipped: skippedAssociations,
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Seed default associations error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
