import { jsPDF } from 'jspdf';
import {
  buildPunctualConventionSections,
  conventionImportantNotice,
  conventionObject,
  conventionTitle,
} from '@/lib/conventionText';
import { createConventionDoc, fmtLongDate, fmtShortDate } from '@/lib/conventionPdfLayout';

/**
 * Données nécessaires pour générer le PDF de convention d'une réservation ponctuelle.
 * Toutes les valeurs sont optionnelles côté typing pour tolérer des données partielles
 * (vue admin avec moins d'infos signer, par exemple).
 */
export interface ConventionPdfData {
  // Signataire
  signer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    /** Type d'occupant : change le wording (asso / particulier / mairie) */
    type: 'association' | 'particulier' | 'mairie';
  };
  // Association (si signataire = représentant d'une asso)
  association?: {
    name: string;
    address?: string;
    presidentName?: string;
  };
  // Réservation
  reservation: {
    roomName: string;
    date: Date | string;
    timeSlots: Array<{ start: string; end: string }>;
    reason?: string;
    estimatedParticipants?: number;
  };
  // Signature en base64 (data:image/png;base64,...)
  signature: string;
  signedAt: Date | string;
  /**
   * Signature du maire en base64 (data:image/png;base64,...).
   * Présente uniquement quand la convention a été validée par l'administration :
   * dans ce cas elle s'affiche dans la case « Pour la Ville ».
   */
  mairieSignature?: string | null;
  /** Date de validation par la mairie (affichée sous la signature du maire). */
  mairieValidatedAt?: Date | string | null;
  /** Blason de la commune (data URL) affiché en tête du document. */
  logo?: string | null;
  // Paramètres personnalisables (maire, mairie, année). Si absent → defaults Chartrettes.
  settings?: Partial<ConventionPdfSettings>;
}

export interface ConventionPdfSettings {
  mayorName: string;
  mayorTitle: string;
  mairieName: string;
  mairieAddressLine1: string;
  mairieAddressLine2: string;
  mairiePhone: string;
  conventionYear: string;
}

const DEFAULT_PDF_SETTINGS: ConventionPdfSettings = {
  mayorName: 'Fabrice Bargeault',
  mayorTitle: 'Le Maire',
  mairieName: 'LA MAIRIE DE CHARTRETTES',
  mairieAddressLine1: '37 rue Georges Clemenceau',
  mairieAddressLine2: '77590 CHARTRETTES',
  mairiePhone: '01.60.69.65.01',
  conventionYear: '2025-2026',
};

/** Bornes du créneau réservé. Pas de flèche : absente de l'encodage jsPDF. */
function fmtTimeRange(slots: Array<{ start: string; end: string }>): string {
  if (!slots || slots.length === 0) return '—';
  return `${slots[0].start} - ${slots[slots.length - 1].end}`;
}

/**
 * Génère le PDF complet de la convention pour une réservation ponctuelle.
 */
export function generateReservationConventionPDF(data: ConventionPdfData): jsPDF {
  const cfg: ConventionPdfSettings = { ...DEFAULT_PDF_SETTINGS, ...(data.settings || {}) };
  const isAssoc = data.signer.type === 'association' && Boolean(data.association);
  const hoursLabel = fmtTimeRange(data.reservation.timeSlots);
  const sections = buildPunctualConventionSections(cfg, {
    roomName: data.reservation.roomName,
    dateLabel: fmtLongDate(data.reservation.date),
    hoursLabel,
  });

  const doc = createConventionDoc();

  // -------------- En-tête à blason --------------
  doc.letterhead({
    logo: data.logo,
    settings: cfg,
    eyebrow: `Réservation ponctuelle — saison ${cfg.conventionYear}`,
    title: conventionTitle(cfg, 'ponctuelle'),
    reference: [
      `Document généré le ${fmtShortDate(new Date())}`,
      `Signée le ${fmtShortDate(data.signedAt)}`,
      data.mairieValidatedAt ? `Validée le ${fmtShortDate(data.mairieValidatedAt)}` : '',
    ].filter(Boolean),
  });

  // -------------- Parties contractantes --------------
  const occupantLines = isAssoc
    ? [
        data.association?.address ? `Siège social : ${data.association.address}` : '',
        `Représentée par : ${data.signer.name}`,
        data.signer.email ? `Courriel : ${data.signer.email}` : '',
        data.signer.phone ? `Téléphone : ${data.signer.phone}` : '',
        "Désignée ci-après « l'occupant »",
      ]
    : [
        data.signer.address ? `Adresse : ${data.signer.address}` : '',
        data.signer.email ? `Courriel : ${data.signer.email}` : '',
        data.signer.phone ? `Téléphone : ${data.signer.phone}` : '',
        "Désigné ci-après « l'occupant »",
      ];

  doc.parties(
    {
      heading: 'Entre',
      title: cfg.mairieName,
      lines: [
        cfg.mairieAddressLine1,
        cfg.mairieAddressLine2,
        `Tél. ${cfg.mairiePhone}`,
        `Représentée par ${cfg.mayorTitle.toLowerCase()}, ${cfg.mayorName}`,
        "Désignée ci-après « la commune »",
      ],
    },
    {
      heading: 'Et',
      title: isAssoc ? `L'association ${data.association?.name}` : data.signer.name,
      lines: occupantLines.filter(Boolean),
    }
  );

  // -------------- Objet : ce qui est réservé --------------
  doc.highlightBox('Objet de la convention', [conventionObject('ponctuelle')]);

  doc.sectionTitle('Mise à disposition consentie');
  doc.table(
    [
      { header: 'Salle', width: 0.32 },
      { header: 'Date', width: 0.28 },
      { header: 'Créneau horaire', width: 0.22 },
      { header: 'Participants', width: 0.18, align: 'right' },
    ],
    [
      [
        data.reservation.roomName,
        fmtLongDate(data.reservation.date),
        hoursLabel,
        data.reservation.estimatedParticipants
          ? `${data.reservation.estimatedParticipants} personnes`
          : '—',
      ],
    ]
  );
  if (data.reservation.reason) {
    doc.paragraph(`Motif de la réservation : ${data.reservation.reason}`);
  }

  // -------------- Corps de la convention (texte canonique partagé) --------------
  for (const section of sections) {
    doc.sectionTitle(section.title);
    for (const article of section.articles) {
      doc.articleTitle(article.title);
      for (const text of article.paragraphs || []) doc.paragraph(text);
      if (article.bulletsIntro) doc.paragraph(article.bulletsIntro);
      if (article.bullets) doc.bullets(article.bullets);
    }
  }

  doc.notice('Important', conventionImportantNotice('ponctuelle'));

  // -------------- Signatures --------------
  doc.signatures(
    `Fait à Chartrettes, le ${fmtLongDate(data.signedAt)}.`,
    {
      heading: 'Pour la Ville de Chartrettes',
      lines: [cfg.mayorName, cfg.mayorTitle],
      signature: data.mairieSignature,
      caption: `Validée le ${fmtShortDate(data.mairieValidatedAt ?? data.signedAt)}`,
      placeholder: 'Signature et cachet',
    },
    {
      heading: "Pour l'occupant",
      lines: [data.signer.name, isAssoc ? data.association?.name || '' : ''].filter(Boolean),
      signature: data.signature,
      caption: `Signée électroniquement le ${fmtShortDate(data.signedAt)}`,
      highlighted: true,
    }
  );

  doc.footer(`${cfg.mairieName} — Convention de mise à disposition, saison ${cfg.conventionYear}`);

  return doc.pdf;
}
