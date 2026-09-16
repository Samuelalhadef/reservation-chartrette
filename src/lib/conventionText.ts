/**
 * Texte des conventions de mise à disposition des locaux municipaux.
 *
 * Source : convention papier « Convention de mise à disposition d'équipements
 * sportifs municipaux à titre précaire et révocable » de la mairie de
 * Chartrettes (TITRE 1 / TITRE 2 / TITRE 3).
 *
 * Le texte est un MODÈLE modifiable depuis l'administration (un par type de
 * convention). Les éléments propres à chaque réservation sont des variables
 * entre accolades ({salle}, {periode}…) remplacées au moment de l'affichage.
 * Les modèles par défaut ci-dessous servent tant qu'aucun texte n'a été
 * enregistré.
 *
 * Ce module est l'unique source de vérité : le modal de signature (JSX) et le
 * générateur PDF (jsPDF) consomment tous les deux renderConvention().
 */

/** Délai minimum, en jours, entre la demande et la date réservée. */
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

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export const CONVENTION_KINDS = [
  'association-ponctuelle',
  'association-annuelle',
  'particulier-ponctuelle',
  'particulier-annuelle',
] as const;
export type ConventionKind = (typeof CONVENTION_KINDS)[number];

export const CONVENTION_KIND_LABELS: Record<ConventionKind, string> = {
  'association-ponctuelle': 'Association — ponctuelle (gratuite)',
  'association-annuelle': 'Association — annuelle (gratuite)',
  'particulier-ponctuelle': 'Particulier — ponctuelle (payante)',
  'particulier-annuelle': 'Particulier — annuelle (payante)',
};

export function isConventionKind(value: unknown): value is ConventionKind {
  return typeof value === 'string' && (CONVENTION_KINDS as readonly string[]).includes(value);
}

export function isYearlyKind(kind: ConventionKind): boolean {
  return kind.endsWith('-annuelle');
}

/** Choisit le modèle selon le signataire. La mairie signe comme une association (gratuit). */
export function conventionKindFor(
  signerType: 'association' | 'particulier' | 'mairie',
  scope: 'ponctuelle' | 'annuelle'
): ConventionKind {
  return `${signerType === 'particulier' ? 'particulier' : 'association'}-${scope}`;
}

export interface ConventionArticle {
  title: string;
  /** Paragraphes rédigés, affichés dans l'ordre. */
  paragraphs: string[];
  /** Phrase d'amorce de la liste à puces (« L'occupant s'engage à : »). */
  bulletsIntro: string;
  bullets: string[];
}

export interface ConventionSection {
  /** Ex. « TITRE 1 – LES ENGAGEMENTS DE LA VILLE DE CHARTRETTES ». */
  title: string;
  articles: ConventionArticle[];
}

/** Modèle modifiable d'une convention (texte avec variables). */
export interface ConventionTemplate {
  title: string;
  /** Chapeau du document, avant les parties contractantes. */
  preamble: string[];
  object: string;
  sections: ConventionSection[];
  importantNotice: string;
}

export type ConventionTemplates = Record<ConventionKind, ConventionTemplate>;

/** Convention prête à afficher : variables remplacées. */
export type RenderedConvention = ConventionTemplate;

/* -------------------------------------------------------------------------- */
/*  Variables                                                                  */
/* -------------------------------------------------------------------------- */

export interface ConventionVariables {
  /** Saison, ex. « 2025-2026 » (toujours connue). */
  saison: string;
  /** Ponctuelle : salle, date et horaires du créneau. */
  salle?: string | null;
  date?: string | null;
  horaires?: string | null;
  /** Annuelle : « du 8 septembre 2025 au 10 juillet 2026 ». */
  periode?: string | null;
  /** Annuelle : « Gymnase (Lundi 18:00 - 21:00) ; … ». */
  creneaux?: string | null;
}

export const CONVENTION_PLACEHOLDERS: {
  key: keyof ConventionVariables;
  description: string;
  example: string;
  scope: 'toutes' | 'ponctuelle' | 'annuelle';
}[] = [
  { key: 'saison', description: 'Saison en cours', example: '2025-2026', scope: 'toutes' },
  { key: 'salle', description: 'Salle réservée', example: 'Gymnase', scope: 'ponctuelle' },
  { key: 'date', description: 'Date réservée', example: 'mardi 14 octobre 2025', scope: 'ponctuelle' },
  { key: 'horaires', description: 'Créneau horaire', example: '18:00 - 21:00', scope: 'ponctuelle' },
  {
    key: 'periode',
    description: 'Période de la convention',
    example: 'du 8 septembre 2025 au 10 juillet 2026',
    scope: 'annuelle',
  },
  {
    key: 'creneaux',
    description: 'Salles et créneaux réservés',
    example: 'Gymnase (Lundi 18:00 - 21:00)',
    scope: 'annuelle',
  },
];

const PLACEHOLDER_RE = /\{(saison|salle|date|horaires|periode|creneaux)\}/g;

/**
 * Remplace les variables. Retourne null si le texte utilise une variable
 * inconnue pour ce document (ex. {periode} sur une convention sans créneaux) :
 * le paragraphe concerné est alors omis plutôt qu'affiché à trous.
 */
function fill(text: string, vars: ConventionVariables): string | null {
  let missing = false;
  const result = text.replace(PLACEHOLDER_RE, (_, key: keyof ConventionVariables) => {
    const value = vars[key];
    if (value === null || value === undefined || value === '') {
      missing = true;
      return '';
    }
    return value;
  });
  return missing ? null : result;
}

const fillAll = (texts: string[], vars: ConventionVariables) =>
  texts.map((t) => fill(t, vars)).filter((t): t is string => t !== null);

/** Titres et encadrés : jamais omis, une variable absente est simplement vidée. */
const fillAlways = (text: string, vars: ConventionVariables) =>
  text.replace(PLACEHOLDER_RE, (_, key: keyof ConventionVariables) => vars[key] || '');

export function renderConvention(
  template: ConventionTemplate,
  vars: ConventionVariables
): RenderedConvention {
  return {
    title: fillAlways(template.title, vars),
    preamble: fillAll(template.preamble, vars),
    object: fillAlways(template.object, vars),
    sections: template.sections.map((section) => ({
      title: fillAlways(section.title, vars),
      articles: section.articles.map((article) => {
        const bullets = fillAll(article.bullets, vars);
        return {
          title: fillAlways(article.title, vars),
          paragraphs: fillAll(article.paragraphs, vars),
          bulletsIntro: bullets.length > 0 ? fillAlways(article.bulletsIntro, vars) : '',
          bullets,
        };
      }),
    })),
    importantNotice: fillAlways(template.importantNotice, vars),
  };
}

/* -------------------------------------------------------------------------- */
/*  Validation d'un modèle envoyé par l'administration                         */
/* -------------------------------------------------------------------------- */

const LIMITS = { text: 5000, list: 100, sections: 20, articles: 60 };

type Normalized = { ok: true; template: ConventionTemplate } | { ok: false; error: string };

export function normalizeConventionTemplate(input: unknown): Normalized {
  const obj = (input ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, LIMITS.text) : '');
  const list = (v: unknown) =>
    (Array.isArray(v) ? v : [])
      .map(str)
      .filter(Boolean)
      .slice(0, LIMITS.list);

  const title = str(obj.title);
  if (!title) return { ok: false, error: 'Le titre de la convention est obligatoire' };

  const rawSections = Array.isArray(obj.sections) ? obj.sections : [];
  if (rawSections.length === 0) {
    return { ok: false, error: 'La convention doit contenir au moins un titre (section)' };
  }
  if (rawSections.length > LIMITS.sections) {
    return { ok: false, error: `Maximum ${LIMITS.sections} sections` };
  }

  const sections: ConventionSection[] = [];
  for (const [i, raw] of rawSections.entries()) {
    const s = (raw ?? {}) as Record<string, unknown>;
    const sectionTitle = str(s.title);
    if (!sectionTitle) return { ok: false, error: `La section n°${i + 1} n'a pas de titre` };
    const rawArticles = Array.isArray(s.articles) ? s.articles : [];
    if (rawArticles.length > LIMITS.articles) {
      return { ok: false, error: `Maximum ${LIMITS.articles} articles par section` };
    }
    const articles: ConventionArticle[] = [];
    for (const [j, rawArticle] of rawArticles.entries()) {
      const a = (rawArticle ?? {}) as Record<string, unknown>;
      const articleTitle = str(a.title);
      if (!articleTitle) {
        return { ok: false, error: `L'article n°${j + 1} de « ${sectionTitle} » n'a pas de titre` };
      }
      articles.push({
        title: articleTitle,
        paragraphs: list(a.paragraphs),
        bulletsIntro: str(a.bulletsIntro),
        bullets: list(a.bullets),
      });
    }
    sections.push({ title: sectionTitle, articles });
  }

  return {
    ok: true,
    template: {
      title,
      preamble: list(obj.preamble),
      object: str(obj.object),
      sections,
      importantNotice: str(obj.importantNotice),
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Modèles par défaut                                                         */
/* -------------------------------------------------------------------------- */

type Occupant = 'association' | 'particulier';
type Scope = 'ponctuelle' | 'annuelle';

const PREAMBLE = [
  "Cette convention a pour objectif de définir les modalités de mise à disposition des locaux municipaux de la commune de Chartrettes.",
  "Selon le type d'utilisateur (associations non chartrettoises, comités et fédérations, sociétés privées, particuliers, clubs professionnels…) et la nature des activités (sports, loisirs, autres), les créneaux mis à disposition pourront être facturés en référence à la grille de tarifs en vigueur prise par délibération.",
];

function engagementsOccupant(occupant: Occupant, scope: Scope): ConventionArticle[] {
  const locaux = scope === 'annuelle' ? 'les locaux' : 'le local';
  const isAssoc = occupant === 'association';

  const articles: ConventionArticle[] = [
    {
      title: 'Article 1 – Nature des activités autorisées',
      paragraphs: [
        isAssoc
          ? `Les activités sont de nature sportive, culturelle ou associative, ou liées à l'organisation desdites activités, compatibles avec la nature ${locaux} et des équipements mis à disposition, leurs aménagements et les règles qui y sont attachées en matière de sécurité publique. Les activités doivent se dérouler en la présence et sous la surveillance effective d'un responsable désigné, agissant pour le compte de l'occupant.`
          : `Les activités sont celles déclarées lors de la réservation (réunion familiale, fête privée, activité de loisirs…). Elles doivent être compatibles avec la nature ${locaux} et des équipements mis à disposition, leurs aménagements et les règles qui y sont attachées en matière de sécurité publique. Elles se déroulent en la présence et sous la surveillance effective de l'occupant, signataire de la présente convention.`,
      ],
      bulletsIntro: '',
      bullets: [],
    },
    {
      title: "Article 2 – Obligations de l'occupant",
      paragraphs: [],
      bulletsIntro: "L'occupant s'engage à :",
      bullets: [
        'Signer la convention',
        ...(isAssoc ? [] : ['Régler le montant de la location, et le cas échéant la caution, selon les tarifs en vigueur']),
        "Se conformer au règlement d'utilisation des locaux municipaux",
        'Se conformer aux interventions de la ville de CHARTRETTES',
        isAssoc
          ? "Utiliser les locaux municipaux au profit de ses adhérents et/ou élèves et conformément à son objet"
          : "Utiliser les locaux municipaux conformément à l'usage déclaré lors de la réservation",
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
        isAssoc
          ? "L'occupant déclare disposer de toutes les autorisations administratives nécessaires pour ses activités et s'engage à les exercer dans le respect des lois et réglementations en vigueur, notamment à l'égard du Code du sport."
          : "L'occupant déclare disposer de toutes les autorisations administratives nécessaires pour ses activités et s'engage à les exercer dans le respect des lois et réglementations en vigueur.",
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
        isAssoc
          ? "L'occupant reconnaît avoir souscrit une police d'assurance en dommages aux biens pour l'occupation des locaux ainsi qu'une assurance en responsabilité civile pour la pratique de ces activités. Un double de l'attestation d'assurance sera remis par l'occupant à la ville de CHARTRETTES chaque année."
          : "L'occupant reconnaît avoir souscrit une assurance en responsabilité civile couvrant l'occupation des locaux et les activités organisées. Une attestation d'assurance sera remise par l'occupant à la ville de CHARTRETTES avant la date d'utilisation.",
        "La ville de CHARTRETTES ne pourra en aucun cas être tenue pour responsable des vols et dégradations survenant sur le matériel de l'occupant ou sur les effets personnels des utilisateurs.",
        "L'occupant renonce à tout recours contre la ville de CHARTRETTES en matière de responsabilité civile à l'occasion de tout accident dont serait victime un utilisateur.",
      ],
      bulletsIntro: '',
      bullets: [],
    },
    {
      title: "Article 5 – L'accès aux salles",
      paragraphs: [
        "L'accès aux salles est régi par un dispositif de clés programmables. Une seule clé est nécessaire pour accéder à l'ensemble des salles attribuées.",
        `Chaque clé est nominative et son détenteur est responsable de son utilisation. Une caution de ${KEY_DEPOSIT_EUR} € par clé est demandée par chèque à l'ordre du Trésor Public et encaissée ; son montant est restitué en même temps que la clé. Toute perte doit être signalée immédiatement aux services municipaux afin de procéder à la désactivation de la clé, et entraîne la remise d'un nouveau chèque de caution.`,
        scope === 'annuelle'
          ? "Pour les programmations annuelles, les clés sont programmées en début d'année scolaire, en fonction de la plage horaire de l'activité concernée (avec un quart d'heure de battement avant et après). La programmation est effective un mois au maximum : chaque détenteur doit se rendre à la tour de chargement située à côté de la mairie au moins une fois par mois."
          : "La programmation de la clé est effective pour la seule durée d'utilisation prévue par la présente convention.",
        `En dehors des demandes hebdomadaires, chaque demande doit être effectuée ${RESERVATION_NOTICE_DAYS} jours à l'avance. En dehors de ce délai, les demandes seront honorées en fonction des disponibilités du service.`,
        "L'utilisateur communiquera à la Mairie de Chartrettes, au moment de la réservation, le nom de la personne ayant accès à la salle pour l'attribution de la clé.",
      ],
      bulletsIntro: '',
      bullets: [],
    },
  ];

  if (isAssoc) {
    articles.push({
      title: "Article 6 – Contrat d'engagement républicain (pour les associations)",
      paragraphs: [
        "Conformément au décret n°2021-1947 du 31 décembre 2021, l'association reconnaît souscrire au contrat d'engagement républicain et en accepter les modalités de mise en œuvre : respect des lois de la République, liberté de conscience, liberté des membres, égalité et non-discrimination, fraternité et prévention de la violence, respect de la dignité de la personne humaine et respect des symboles de la République.",
      ],
      bulletsIntro: '',
      bullets: [],
    });
  }

  return articles;
}

function dispositionsDiverses(): ConventionArticle[] {
  const article = (title: string, paragraphs: string[]): ConventionArticle => ({
    title,
    paragraphs,
    bulletsIntro: '',
    bullets: [],
  });
  return [
    article('Article 1 – Modification', [
      "La présente convention pourra être modifiée en cours d'exécution, sur l'initiative de l'une ou l'autre des parties, par voie d'avenant avec l'accord des deux parties ; chaque avenant sera alors soumis aux mêmes procédures d'adoption que la présente convention.",
    ]),
    article('Article 2 – Résiliation', [
      "La convention, en tant que contrat administratif d'occupation du domaine public, est résiliable à tout moment par la ville de CHARTRETTES sans que l'occupant puisse se prévaloir d'un droit à indemnité. Elle pourra être résiliée par l'une ou l'autre des parties en cas de non-respect d'une ou plusieurs clauses prévues dans la présente convention.",
      "Elle pourra être résiliée avant l'arrivée à son terme, soit sur demande de la collectivité, soit sur demande de l'occupant. La résiliation se fera par courrier recommandé avec accusé de réception.",
    ]),
    article('Article 3 – Contrôle de la collectivité', [
      "Le contrôle de la bonne utilisation des installations sera assuré par un représentant de la ville de CHARTRETTES.",
    ]),
    article('Article 4 – Règlement des litiges', [
      "Les parties s'engagent à rechercher, en cas de litige sur l'interprétation ou sur l'application de la présente convention, toute voie amiable de règlement.",
      "S'agissant d'une convention comportant usage de dépendance du domaine public, tout litige qui n'aura pas pu trouver de règlement amiable relève de la compétence du tribunal administratif de Melun.",
    ]),
  ];
}

function engagementsVille(occupant: Occupant, scope: Scope): ConventionArticle[] {
  const isAssoc = occupant === 'association';

  if (scope === 'annuelle') {
    return [
      {
        title: 'Article 1 – Durée',
        paragraphs: [
          'La présente convention, et ses annexes, est conclue et acceptée pour la période {periode} inclus (saison {saison}), selon les créneaux attribués ci-dessous et rappelés en annexe.',
          'Salles et créneaux réservés : {creneaux} (hors vacances scolaires et jours fériés).',
          "Elle est à renouveler à chaque nouvelle année scolaire : les créneaux attribués pour une saison ne sont pas garantis pour la saison suivante.",
        ],
        bulletsIntro: '',
        bullets: [],
      },
      {
        title: 'Article 2 – Conditions de mise à disposition – redevance',
        paragraphs: [
          isAssoc
            ? "La mise à disposition est effectuée à titre précaire, révocable et gracieux, conformément à l'article L. 2125-1 du Code Général de la Propriété des Personnes Publiques."
            : "La mise à disposition est effectuée à titre précaire et révocable, conformément à l'article L. 2125-1 du Code Général de la Propriété des Personnes Publiques.",
          isAssoc
            ? "Elle est GRATUITE pour les associations chartrettoises, pour l'ensemble des salles attribuées annuellement par la présente convention. Les autres utilisateurs sont facturés selon la grille de tarifs en vigueur prise par délibération."
            : "Elle est consentie à titre ONÉREUX, selon la grille de tarifs en vigueur prise par délibération. Le montant dû pour les créneaux attribués est communiqué à l'occupant et doit être réglé selon les modalités fixées par la commune.",
          "En l'absence de signature de la convention, l'occupation des lieux est INTERDITE. L'occupation est également INTERDITE en dehors des jours et créneaux alloués par la présente convention.",
          "Par le terme « locaux municipaux » il faut entendre les terrains et salles dédiés à la pratique de l'activité, mais également les installations liées et intégrées aux équipements : vestiaires, sanitaires, stockage, espaces de réception (hall), salle de réunion, bureaux, infirmerie.",
          `Toute demande de créneau ponctuel complémentaire devra faire l'objet d'une demande VIA LE LOGICIEL DE RÉSERVATION DES SALLES MUNICIPALES, au minimum ${RESERVATION_NOTICE_DAYS} jours avant la date souhaitée.`,
          `Il en sera de même pour toute mise à disposition relevant de l'organisation d'un événement : la demande devra être transmise à la ville de CHARTRETTES au minimum ${RESERVATION_NOTICE_DAYS} jours avant la date de l'événement, via le site de réservation des salles.`,
          "La collectivité se réserve le droit de modifier, en cas de besoin, les créneaux de mise à disposition dans le cas d'une organisation d'événements à son initiative. Dans ce cas, l'occupant sera informé de cette modification dans les meilleurs délais.",
        ],
        bulletsIntro: '',
        bullets: [],
      },
    ];
  }

  return [
    {
      title: 'Article 1 – Durée',
      paragraphs: [
        'Salle réservée : {salle}. Date : le {date}. Créneau horaire : {horaires}.',
        "La présente convention est conclue pour ce seul créneau, au titre de la saison {saison}, et prend fin à l'issue de celui-ci.",
        `La demande a été transmise via le logiciel de réservation des salles municipales, au minimum ${RESERVATION_NOTICE_DAYS} jours avant la date réservée, délai nécessaire à son instruction par la commune.`,
      ],
      bulletsIntro: '',
      bullets: [],
    },
    {
      title: 'Article 2 – Conditions de mise à disposition – redevance',
      paragraphs: [
        isAssoc
          ? "La mise à disposition est effectuée à titre précaire et révocable, conformément à l'article L. 2125-1 du Code Général de la Propriété des Personnes Publiques. Elle est consentie à titre gracieux ou onéreux selon la grille de tarifs en vigueur prise par délibération."
          : "La mise à disposition est effectuée à titre précaire et révocable, conformément à l'article L. 2125-1 du Code Général de la Propriété des Personnes Publiques. Elle est consentie à titre ONÉREUX, selon la grille de tarifs en vigueur prise par délibération : le montant de la location et, le cas échéant, de la caution est indiqué lors de la réservation et doit être réglé avant la date d'utilisation.",
        "En l'absence de signature de la convention, l'occupation des lieux est INTERDITE. L'occupation est également INTERDITE en dehors du jour et du créneau alloués par la présente convention.",
        "Le local est mis à disposition avec les installations qui lui sont liées : vestiaires, sanitaires, stockage, espaces de réception (hall). Les équipements présents sont mis à disposition en l'état et doivent être restitués propres et intacts.",
        "La collectivité se réserve le droit de modifier ou d'annuler la mise à disposition en cas d'organisation d'un événement à son initiative ou pour tout motif d'intérêt général. Dans ce cas, l'occupant sera informé dans les meilleurs délais.",
      ],
      bulletsIntro: '',
      bullets: [],
    },
  ];
}

function defaultTemplate(occupant: Occupant, scope: Scope): ConventionTemplate {
  return {
    title:
      scope === 'annuelle'
        ? "Convention de mise à disposition de locaux municipaux à titre précaire et révocable pour l'année {saison}"
        : "Convention de mise à disposition ponctuelle d'un local municipal à titre précaire et révocable — saison {saison}",
    // La convention ponctuelle n'avait pas de chapeau : on garde ce rendu.
    preamble: scope === 'annuelle' ? [...PREAMBLE] : [],
    object:
      scope === 'annuelle'
        ? "La présente convention a pour objet la mise à disposition des locaux, installations et matériels décrits en annexe, dans les conditions énoncées ci-après."
        : "La présente convention a pour objet la mise à disposition ponctuelle d'un local municipal et de son matériel, pour le créneau précisé ci-dessus, dans les conditions énoncées ci-après.",
    sections: [
      { title: 'TITRE 1 – LES ENGAGEMENTS DE LA VILLE DE CHARTRETTES', articles: engagementsVille(occupant, scope) },
      { title: "TITRE 2 – LES ENGAGEMENTS DE L'OCCUPANT", articles: engagementsOccupant(occupant, scope) },
      { title: 'TITRE 3 – DISPOSITIONS DIVERSES', articles: dispositionsDiverses() },
    ],
    importantNotice:
      scope === 'annuelle'
        ? `En l'absence de signature de la présente convention, l'occupation des locaux est interdite. La convention couvre les créneaux réguliers de la saison : toute demande complémentaire ou tout événement exceptionnel doit être déposé sur le logiciel de réservation au minimum ${RESERVATION_NOTICE_DAYS} jours à l'avance.`
        : `En l'absence de signature de la présente convention, la réservation ne peut être validée. La mise à disposition est strictement limitée au créneau réservé, demandé au minimum ${RESERVATION_NOTICE_DAYS} jours à l'avance.`,
  };
}

export function getDefaultConventionTemplate(kind: ConventionKind): ConventionTemplate {
  const [occupant, scope] = kind.split('-') as [Occupant, Scope];
  return defaultTemplate(occupant, scope);
}

export function getDefaultConventionTemplates(): ConventionTemplates {
  return Object.fromEntries(
    CONVENTION_KINDS.map((kind) => [kind, getDefaultConventionTemplate(kind)])
  ) as ConventionTemplates;
}

/** Modèle à utiliser : celui fourni s'il existe, sinon le texte par défaut. */
export function pickConventionTemplate(
  templates: Partial<ConventionTemplates> | null | undefined,
  kind: ConventionKind
): ConventionTemplate {
  return templates?.[kind] ?? getDefaultConventionTemplate(kind);
}
