import { jsPDF } from 'jspdf';
import {
  buildYearlyConventionSections,
  conventionImportantNotice,
  conventionObject,
  conventionTitle,
} from '@/lib/conventionText';
import type { ConventionSchedule } from '@/lib/conventionSlots';
import { createConventionDoc, fmtLongDate, fmtShortDate } from '@/lib/conventionPdfLayout';

/**
 * Données nécessaires pour générer le PDF de la convention ANNUELLE d'une
 * association (mise à disposition régulière pour la saison).
 *
 * Pendant clé de generateReservationConventionPDF, mais pour une convention
 * annuelle : pas de date/créneau unique, l'objet couvre toute la saison.
 */
export interface YearlyConventionPdfData {
  association: {
    name: string;
    address?: string;
    presidentName?: string;
    email?: string;
    phone?: string;
  };
  /** Signature de l'association (data:image/png;base64,...) */
  signature: string;
  signedAt: Date | string;
  /** Signature du maire — présente uniquement quand la convention est validée. */
  mairieSignature?: string | null;
  mairieValidatedAt?: Date | string | null;
  /** Blason de la commune (data URL) affiché en tête du document. */
  logo?: string | null;
  /** Paramètres personnalisables (maire, mairie, année). */
  settings?: Partial<YearlyConventionPdfSettings>;
  /**
   * Créneaux effectivement réservés (salle, jour, horaires, période). Ils
   * alimentent l'article « Durée » et le tableau d'annexe, pour que la
   * convention dise noir sur blanc ce qui est réservé et sur quelle période.
   */
  schedule?: ConventionSchedule | null;
}

export interface YearlyConventionPdfSettings {
  mayorName: string;
  mayorTitle: string;
  mairieName: string;
  mairieAddressLine1: string;
  mairieAddressLine2: string;
  mairiePhone: string;
  conventionYear: string;
}

const DEFAULT_PDF_SETTINGS: YearlyConventionPdfSettings = {
  mayorName: 'Fabrice Bargeault',
  mayorTitle: 'Le Maire',
  mairieName: 'LA MAIRIE DE CHARTRETTES',
  mairieAddressLine1: '37 rue Georges Clemenceau',
  mairieAddressLine2: '77590 CHARTRETTES',
  mairiePhone: '01.60.69.65.01',
  conventionYear: '2025-2026',
};

/**
 * Génère le PDF complet de la convention annuelle d'une association.
 */
export function generateYearlyConventionPDF(data: YearlyConventionPdfData): jsPDF {
  const cfg: YearlyConventionPdfSettings = { ...DEFAULT_PDF_SETTINGS, ...(data.settings || {}) };
  const schedule = data.schedule ?? null;
  const slotLabels = (schedule?.slots || []).map(
    (slot) => `${slot.roomName} (${slot.dayLabel} ${slot.hoursLabel})`
  );
  const sections = buildYearlyConventionSections(cfg, {
    periodLabel: schedule?.periodLabel ?? null,
    slotLabels,
  });

  const doc = createConventionDoc();

  // -------------- En-tête à blason --------------
  doc.letterhead({
    logo: data.logo,
    settings: cfg,
    eyebrow: `Convention annuelle — saison ${cfg.conventionYear}`,
    title: conventionTitle(cfg, 'annuelle'),
    reference: [
      `Document généré le ${fmtShortDate(new Date())}`,
      `Signée le ${fmtShortDate(data.signedAt)}`,
      data.mairieValidatedAt ? `Validée le ${fmtShortDate(data.mairieValidatedAt)}` : '',
    ].filter(Boolean),
  });

  // -------------- Parties contractantes --------------
  const occupantLines = [
    data.association.address ? `Siège social : ${data.association.address}` : '',
    data.association.presidentName ? `Représentée par : ${data.association.presidentName}` : '',
    data.association.email ? `Courriel : ${data.association.email}` : '',
    data.association.phone ? `Téléphone : ${data.association.phone}` : '',
    "Désignée ci-après « l'occupant »",
  ].filter(Boolean);

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
      title: `L'association ${data.association.name}`,
      lines: occupantLines,
    }
  );

  // -------------- Objet --------------
  doc.highlightBox('Objet de la convention', [conventionObject('annuelle')]);

  // -------------- Créneaux attribués --------------
  // Reprend le tableau (Jour / Horaires / Installation) de la convention papier.
  if (schedule && schedule.slots.length > 0) {
    doc.sectionTitle('Créneaux attribués');
    doc.paragraph(
      `Période ${schedule.periodLabel} inclus, hors vacances scolaires et jours fériés.`
    );
    doc.table(
      [
        { header: 'Installation', width: 0.3 },
        { header: 'Jour', width: 0.14 },
        { header: 'Horaires', width: 0.2 },
        { header: 'Période', width: 0.26 },
        { header: 'Séances', width: 0.1, align: 'right' },
      ],
      schedule.slots.map((slot) => [
        slot.roomName,
        slot.dayLabel,
        slot.hoursLabel,
        `${fmtShortDate(slot.firstDate)} au ${fmtShortDate(slot.lastDate)}`,
        String(slot.occurrences),
      ])
    );
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

  doc.notice('Important', conventionImportantNotice('annuelle'));

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
      lines: [data.association.name, data.association.presidentName || 'Le Président'].filter(
        Boolean
      ),
      signature: data.signature,
      caption: `Signée électroniquement le ${fmtShortDate(data.signedAt)}`,
      highlighted: true,
    }
  );

  doc.footer(`${cfg.mairieName} — Convention annuelle, saison ${cfg.conventionYear}`);

  return doc.pdf;
}
