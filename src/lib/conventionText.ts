/**
 * Texte canonique des conventions de mise à disposition des locaux municipaux.
 *
 * Source : convention papier « Convention de mise à disposition d'équipements
 * sportifs municipaux à titre précaire et révocable » de la mairie de
 * Chartrettes (TITRE 1 / TITRE 2 / TITRE 3), transposée telle quelle pour que
 * le document signé en ligne et le PDF généré aient exactement la même
 * structure et la même valeur que la version papier.
 *
 * Ce module est l'unique source de vérité : le modal de signature (JSX) et le
 * générateur PDF (jsPDF) le consomment tous les deux, ce qui évite qu'un des
 * deux dérive à la prochaine mise à jour du texte.
 */

/**
 * Délai minimum, en jours, entre la demande et la date réservée. Aligné sur la
 * règle appliquée par l'application (API + calendrier) : toute demande passe
 * par le logiciel de réservation au moins 10 jours avant.
 */
export const RESERVATION_NOTICE_DAYS = 10;

/** Caution demandée par clé programmable, en euros (cf. règlement d'utilisation). */
export const KEY_DEPOSIT_EUR = 54;

/** Sous-ensemble des paramètres mairie nécessaire à la rédaction du texte. */
export interface ConventionTextSettings {
  mayorName: string;
  mayorTitle: string;
  mairieName: string;
  mairieAddressLine1: string;
  mairieAddressLine2: string;
  mairiePhone: string;
  conventionYear: string;
}

export interface ConventionArticle {
  title: string;
  /** Paragraphes rédigés, affichés dans l'ordre. */
  paragraphs?: string[];
  /** Phrase d'amorce de la liste à puces (« L'occupant s'engage à : »). */
  bulletsIntro?: string;
  bullets?: string[];
}

export interface ConventionSection {
  /** Ex. « TITRE 1 – LES ENGAGEMENTS DE LA VILLE DE CHARTRETTES ». */
  title: string;
  articles: ConventionArticle[];
}

/** Titre du document, tel qu'imprimé en tête de la convention papier. */
export function conventionTitle(cfg: ConventionTextSettings, kind: 'annuelle' | 'ponctuelle'): string {
  return kind === 'annuelle'
    ? `Convention de mise à disposition de locaux municipaux à titre précaire et révocable pour l'année ${cfg.conventionYear}`
    : `Convention de mise à disposition ponctuelle d'un local municipal à titre précaire et révocable — saison ${cfg.conventionYear}`;
}

/** Chapeau du document (avant « Entre : … Et : … »). */
export function conventionPreamble(cfg: ConventionTextSettings): string[] {
  return [
    "Cette convention a pour objectif de définir les modalités de mise à disposition des locaux municipaux de la commune de Chartrettes.",
    "Selon le type d'utilisateur (associations non chartrettoises, comités et fédérations, sociétés privées, particuliers, clubs professionnels…) et la nature des activités (sports, loisirs, autres), les créneaux mis à disposition pourront être facturés en référence à la grille de tarifs en vigueur prise par délibération.",
  ];
}

/** Objet de la convention, commun aux deux variantes. */
export function conventionObject(kind: 'annuelle' | 'ponctuelle'): string {
  return kind === 'annuelle'
    ? "La présente convention a pour objet la mise à disposition des locaux, installations et matériels décrits en annexe, dans les conditions énoncées ci-après."
    : "La présente convention a pour objet la mise à disposition ponctuelle d'un local municipal et de son matériel, pour le créneau précisé ci-dessus, dans les conditions énoncées ci-après.";
}

/* -------------------------------------------------------------------------- */
/*  Articles communs aux deux conventions (TITRE 2 et TITRE 3)                 */
/* -------------------------------------------------------------------------- */

function engagementsOccupant(kind: 'annuelle' | 'ponctuelle'): ConventionArticle[] {
  const locaux = kind === 'annuelle' ? 'les locaux' : 'le local';
  return [
    {
      title: 'Article 1 – Nature des activités autorisées',
      paragraphs: [
        `Les activités sont de nature sportive, culturelle ou associative, ou liées à l'organisation desdites activités, compatibles avec la nature ${locaux} et des équipements mis à disposition, leurs aménagements et les règles qui y sont attachées en matière de sécurité publique. Les activités doivent se dérouler en la présence et sous la surveillance effective d'un responsable désigné, agissant pour le compte de l'occupant.`,
      ],
    },
    {
      title: "Article 2 – Obligations de l'occupant",
      bulletsIntro: "L'occupant s'engage à :",
      bullets: [
        'Signer la convention',
        "Se conformer au règlement d'utilisation des locaux municipaux",
        'Se conformer aux interventions de la ville de CHARTRETTES',
        "Utiliser les locaux municipaux au profit de ses adhérents et/ou élèves et conformément à son objet",
        "Assumer la responsabilité des équipements et du matériel mis à disposition pendant leur utilisation, et réparer ou remplacer à ses frais les dommages pouvant survenir sur ces biens",
        "Ne pas concéder l'usage des locaux dont il bénéficie en vertu de la présente convention à un tiers",
        "Ne permettre l'entrée dans les bâtiments qu'en présence de la personne identifiée comme responsable de l'activité ; cette dernière, ou tout autre responsable, devra rester jusqu'au départ du dernier utilisateur",
        "Vérifier, avant son départ, la fermeture des accès à l'établissement (portes, fenêtres…) et veiller à l'extinction des lumières et à la fermeture des robinets des fluides",
        "Mettre tout en œuvre pour que ses activités ne troublent pas le déroulement des activités qui pourraient se dérouler dans les installations attenantes",
        'Respecter la configuration des installations et la position des équipements',
        "Après utilisation, ranger son matériel à l'endroit prévu à cet effet et laisser les locaux en bon état de propreté, en ayant fait un bon usage de la consommation des énergies",
        "Informer par écrit la ville de Chartrettes de l'installation de tout panneau publicitaire ou matériel (tente, barnum…) afin d'obtenir un accord préalable",
      ],
    },
    {
      title: 'Article 3 – Sécurité et accès au public',
      paragraphs: [
        "L'occupant déclare disposer de toutes les autorisations administratives nécessaires pour ses activités et s'engage à les exercer dans le respect des lois et réglementations en vigueur, notamment à l'égard du Code du sport.",
        "Aucun équipement ne doit rester ouvert la nuit. Tout problème constaté au cours des séances doit être signalé à la Ville de CHARTRETTES ; en cas d'urgence technique, l'astreinte municipale est joignable au 06 23 26 95 99.",
        "Toute dégradation volontaire ou involontaire des équipements et installations (carreaux ou portes cassés, extincteur percuté, vol de matériel…) sera systématiquement facturée par la Ville de CHARTRETTES à l'occupant.",
      ],
      bulletsIntro: "Avant l'utilisation des locaux, l'occupant :",
      bullets: [
        "Reconnaît avoir pris connaissance des consignes générales de sécurité, s'engage à les respecter et à les appliquer",
        "S'engage à maintenir libres et accessibles en permanence les issues de secours et les cheminements qui y conduisent",
        'Prévient sans délai les services de secours et la collectivité en cas de sinistre',
        "S'engage à avoir informé les services de secours et les autorités de la tenue d'une manifestation si nécessaire",
        "S'engage à respecter le nombre de pratiquants et de personnes extérieures pouvant être accueillis simultanément, qui ne pourra dépasser les effectifs définis par la Commission de Sécurité et figurant sur le registre de sécurité",
      ],
    },
    {
      title: 'Article 4 – Assurance',
      paragraphs: [
        "L'occupant reconnaît avoir souscrit une police d'assurance en dommages aux biens pour l'occupation des locaux ainsi qu'une assurance en responsabilité civile pour la pratique de ces activités. Un double de l'attestation d'assurance sera remis par l'occupant à la ville de CHARTRETTES chaque année.",
        "La ville de CHARTRETTES ne pourra en aucun cas être tenue pour responsable des vols et dégradations survenant sur le matériel de l'occupant ou sur les effets personnels des utilisateurs.",
        "L'occupant renonce à tout recours contre la ville de CHARTRETTES en matière de responsabilité civile à l'occasion de tout accident dont serait victime un utilisateur.",
      ],
    },
    {
      title: "Article 5 – L'accès aux salles",
      paragraphs: [
        "L'accès aux salles est régi par un dispositif de clés programmables. Une seule clé est nécessaire pour accéder à l'ensemble des salles attribuées.",
        `Chaque clé est nominative et son détenteur est responsable de son utilisation. Une caution de ${KEY_DEPOSIT_EUR} € par clé est demandée par chèque à l'ordre du Trésor Public et encaissée ; son montant est restitué en même temps que la clé. Toute perte doit être signalée immédiatement aux services municipaux afin de procéder à la désactivation de la clé, et entraîne la remise d'un nouveau chèque de caution.`,
        kind === 'annuelle'
          ? "Pour les programmations annuelles, les clés sont programmées en début d'année scolaire, en fonction de la plage horaire de l'activité concernée (avec un quart d'heure de battement avant et après). La programmation est effective un mois au maximum : chaque détenteur doit se rendre à la tour de chargement située à côté de la mairie au moins une fois par mois."
          : "La programmation de la clé est effective pour la seule durée d'utilisation prévue par la présente convention.",
        `En dehors des demandes hebdomadaires, chaque demande doit être effectuée ${RESERVATION_NOTICE_DAYS} jours à l'avance. En dehors de ce délai, les demandes seront honorées en fonction des disponibilités du service.`,
        "L'utilisateur communiquera à la Mairie de Chartrettes, au moment de la réservation, le nom de la personne ayant accès à la salle pour l'attribution de la clé.",
      ],
    },
    {
      title: "Article 6 – Contrat d'engagement républicain (pour les associations)",
      paragraphs: [
        "Conformément au décret n°2021-1947 du 31 décembre 2021, l'association reconnaît souscrire au contrat d'engagement républicain et en accepter les modalités de mise en œuvre : respect des lois de la République, liberté de conscience, liberté des membres, égalité et non-discrimination, fraternité et prévention de la violence, respect de la dignité de la personne humaine et respect des symboles de la République.",
      ],
    },
  ];
}

function dispositionsDiverses(): ConventionArticle[] {
  return [
    {
      title: 'Article 1 – Modification',
      paragraphs: [
        "La présente convention pourra être modifiée en cours d'exécution, sur l'initiative de l'une ou l'autre des parties, par voie d'avenant avec l'accord des deux parties ; chaque avenant sera alors soumis aux mêmes procédures d'adoption que la présente convention.",
      ],
    },
    {
      title: 'Article 2 – Résiliation',
      paragraphs: [
        "La convention, en tant que contrat administratif d'occupation du domaine public, est résiliable à tout moment par la ville de CHARTRETTES sans que l'occupant puisse se prévaloir d'un droit à indemnité. Elle pourra être résiliée par l'une ou l'autre des parties en cas de non-respect d'une ou plusieurs clauses prévues dans la présente convention.",
        "Elle pourra être résiliée avant l'arrivée à son terme, soit sur demande de la collectivité, soit sur demande de l'occupant. La résiliation se fera par courrier recommandé avec accusé de réception.",
      ],
    },
    {
      title: 'Article 3 – Contrôle de la collectivité',
      paragraphs: [
        "Le contrôle de la bonne utilisation des installations sera assuré par un représentant de la ville de CHARTRETTES.",
      ],
    },
    {
      title: 'Article 4 – Règlement des litiges',
      paragraphs: [
        "Les parties s'engagent à rechercher, en cas de litige sur l'interprétation ou sur l'application de la présente convention, toute voie amiable de règlement.",
        "S'agissant d'une convention comportant usage de dépendance du domaine public, tout litige qui n'aura pas pu trouver de règlement amiable relève de la compétence du tribunal administratif de Melun.",
      ],
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*  Conventions complètes                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Détail concret de ce qui est réservé, injecté dans l'article « Durée » pour
 * que la convention porte noir sur blanc la salle, les jours et la période.
 */
export interface YearlyConventionScope {
  /** « du 8 septembre 2025 au 10 juillet 2026 ». */
  periodLabel?: string | null;
  /** « Gymnase (Lundi 18:00 - 21:00) », une entrée par créneau. */
  slotLabels?: string[];
}

/** Convention ANNUELLE : mise à disposition régulière sur toute la saison. */
export function buildYearlyConventionSections(
  cfg: ConventionTextSettings,
  scope: YearlyConventionScope = {}
): ConventionSection[] {
  const dureeParagraphs = [
    scope.periodLabel
      ? `La présente convention, et ses annexes, est conclue et acceptée pour la période ${scope.periodLabel} inclus (saison ${cfg.conventionYear}), selon les créneaux attribués ci-dessous et rappelés en annexe.`
      : `La présente convention, et ses annexes, est conclue et acceptée pour la saison ${cfg.conventionYear}, selon les créneaux attribués en annexe de la convention.`,
  ];
  if (scope.slotLabels && scope.slotLabels.length > 0) {
    dureeParagraphs.push(
      `Salles et créneaux réservés : ${scope.slotLabels.join(' ; ')} (hors vacances scolaires et jours fériés).`
    );
  }
  dureeParagraphs.push(
    "Elle est à renouveler à chaque nouvelle année scolaire : les créneaux attribués pour une saison ne sont pas garantis pour la saison suivante."
  );

  return [
    {
      title: 'TITRE 1 – LES ENGAGEMENTS DE LA VILLE DE CHARTRETTES',
      articles: [
        {
          title: 'Article 1 – Durée',
          paragraphs: dureeParagraphs,
        },
        {
          title: 'Article 2 – Conditions de mise à disposition – redevance',
          paragraphs: [
            "La mise à disposition est effectuée à titre précaire, révocable et gracieux, conformément à l'article L. 2125-1 du Code Général de la Propriété des Personnes Publiques.",
            "Elle est GRATUITE pour les associations chartrettoises, pour l'ensemble des salles attribuées annuellement par la présente convention. Les autres utilisateurs sont facturés selon la grille de tarifs en vigueur prise par délibération.",
            "En l'absence de signature de la convention, l'occupation des lieux est INTERDITE. L'occupation est également INTERDITE en dehors des jours et créneaux alloués par la présente convention.",
            "Par le terme « locaux municipaux » il faut entendre les terrains et salles dédiés à la pratique de l'activité, mais également les installations liées et intégrées aux équipements : vestiaires, sanitaires, stockage, espaces de réception (hall), salle de réunion, bureaux, infirmerie.",
            `Toute demande de créneau ponctuel complémentaire devra faire l'objet d'une demande VIA LE LOGICIEL DE RÉSERVATION DES SALLES MUNICIPALES, au minimum ${RESERVATION_NOTICE_DAYS} jours avant la date souhaitée.`,
            `Il en sera de même pour toute mise à disposition relevant de l'organisation d'un événement : la demande devra être transmise à la ville de CHARTRETTES au minimum ${RESERVATION_NOTICE_DAYS} jours avant la date de l'événement, via le site de réservation des salles.`,
            "La collectivité se réserve le droit de modifier, en cas de besoin, les créneaux de mise à disposition dans le cas d'une organisation d'événements à son initiative. Dans ce cas, l'occupant sera informé de cette modification dans les meilleurs délais.",
          ],
        },
      ],
    },
    {
      title: "TITRE 2 – LES ENGAGEMENTS DE L'OCCUPANT",
      articles: engagementsOccupant('annuelle'),
    },
    {
      title: 'TITRE 3 – DISPOSITIONS DIVERSES',
      articles: dispositionsDiverses(),
    },
  ];
}

/** Ce qui est réservé, repris tel quel dans l'article « Durée ». */
export interface PunctualConventionScope {
  roomName?: string | null;
  /** « mardi 14 octobre 2025 ». */
  dateLabel?: string | null;
  /** « 18:00 - 21:00 ». */
  hoursLabel?: string | null;
}

/** Convention PONCTUELLE : un créneau unique, réservé via le logiciel. */
export function buildPunctualConventionSections(
  cfg: ConventionTextSettings,
  scope: PunctualConventionScope = {}
): ConventionSection[] {
  const objet =
    scope.roomName && scope.dateLabel && scope.hoursLabel
      ? `Salle réservée : ${scope.roomName}. Date : le ${scope.dateLabel}. Créneau horaire : ${scope.hoursLabel}.`
      : null;

  return [
    {
      title: 'TITRE 1 – LES ENGAGEMENTS DE LA VILLE DE CHARTRETTES',
      articles: [
        {
          title: 'Article 1 – Durée',
          paragraphs: [
            objet ||
              `La présente convention est conclue et acceptée pour le seul créneau précisé ci-dessus, au titre de la saison ${cfg.conventionYear}.`,
            `La présente convention est conclue pour ce seul créneau, au titre de la saison ${cfg.conventionYear}, et prend fin à l'issue de celui-ci.`,
            `La demande a été transmise via le logiciel de réservation des salles municipales, au minimum ${RESERVATION_NOTICE_DAYS} jours avant la date réservée, délai nécessaire à son instruction par la commune.`,
          ],
        },
        {
          title: 'Article 2 – Conditions de mise à disposition – redevance',
          paragraphs: [
            "La mise à disposition est effectuée à titre précaire et révocable, conformément à l'article L. 2125-1 du Code Général de la Propriété des Personnes Publiques. Elle est consentie à titre gracieux ou onéreux selon la grille de tarifs en vigueur prise par délibération.",
            "En l'absence de signature de la convention, l'occupation des lieux est INTERDITE. L'occupation est également INTERDITE en dehors du jour et du créneau alloués par la présente convention.",
            "Le local est mis à disposition avec les installations qui lui sont liées : vestiaires, sanitaires, stockage, espaces de réception (hall). Les équipements présents sont mis à disposition en l'état et doivent être restitués propres et intacts.",
            "La collectivité se réserve le droit de modifier ou d'annuler la mise à disposition en cas d'organisation d'un événement à son initiative ou pour tout motif d'intérêt général. Dans ce cas, l'occupant sera informé dans les meilleurs délais.",
          ],
        },
      ],
    },
    {
      title: "TITRE 2 – LES ENGAGEMENTS DE L'OCCUPANT",
      articles: engagementsOccupant('ponctuelle'),
    },
    {
      title: 'TITRE 3 – DISPOSITIONS DIVERSES',
      articles: dispositionsDiverses(),
    },
  ];
}

/** Encart « IMPORTANT » affiché en fin de convention. */
export function conventionImportantNotice(kind: 'annuelle' | 'ponctuelle'): string {
  return kind === 'annuelle'
    ? `En l'absence de signature de la présente convention, l'occupation des locaux est interdite. La convention couvre les créneaux réguliers de la saison : toute demande complémentaire ou tout événement exceptionnel doit être déposé sur le logiciel de réservation au minimum ${RESERVATION_NOTICE_DAYS} jours à l'avance.`
    : `En l'absence de signature de la présente convention, la réservation ne peut être validée. La mise à disposition est strictement limitée au créneau réservé, demandé au minimum ${RESERVATION_NOTICE_DAYS} jours à l'avance.`;
}
