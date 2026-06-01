import { jsPDF } from 'jspdf';

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
  /** Paramètres personnalisables (maire, mairie, année). */
  settings?: Partial<YearlyConventionPdfSettings>;
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
  mayorName: 'Pascal Gros',
  mayorTitle: 'Le Maire',
  mairieName: 'LA MAIRIE DE CHARTRETTES',
  mairieAddressLine1: '37 rue Georges Clemenceau',
  mairieAddressLine2: '77590 CHARTRETTES',
  mairiePhone: '01.60.69.65.01',
  conventionYear: '2025-2026',
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Palette (alignée sur le générateur ponctuel)
const PRIMARY: [number, number, number] = [30, 58, 95];
const ACCENT: [number, number, number] = [5, 150, 105];
const SLATE_900: [number, number, number] = [15, 23, 42];
const SLATE_600: [number, number, number] = [71, 85, 105];
const SLATE_300: [number, number, number] = [203, 213, 225];
const SLATE_100: [number, number, number] = [241, 245, 249];
const AMBER_50: [number, number, number] = [255, 251, 235];
const AMBER_700: [number, number, number] = [180, 83, 9];

function fmtShortDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR');
}

/**
 * Génère le PDF complet de la convention annuelle d'une association.
 */
export function generateYearlyConventionPDF(data: YearlyConventionPdfData): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;
  const cfg: YearlyConventionPdfSettings = { ...DEFAULT_PDF_SETTINGS, ...(data.settings || {}) };

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      pdf.addPage();
      y = MARGIN;
    }
  };

  // -------------- En-tête --------------
  pdf.setFillColor(...PRIMARY);
  pdf.rect(0, 0, PAGE_W, 34, 'F');
  pdf.setFillColor(...ACCENT);
  pdf.rect(0, 34, PAGE_W, 1.5, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Convention de mise à disposition', MARGIN, 16);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Salle municipale — Commune de Chartrettes', MARGIN, 23);
  pdf.setFontSize(8);
  pdf.text(`Convention annuelle — Saison ${cfg.conventionYear}`, MARGIN, 29);

  y = 44;

  pdf.setTextColor(...SLATE_600);
  pdf.setFontSize(8);
  pdf.text(`Document généré le ${fmtShortDate(new Date())}`, PAGE_W - MARGIN, 16, { align: 'right' });
  pdf.text(`Signée le ${fmtShortDate(data.signedAt)}`, PAGE_W - MARGIN, 21, { align: 'right' });

  // -------------- Parties contractantes --------------
  pdf.setTextColor(...SLATE_900);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('PARTIES CONTRACTANTES', MARGIN, y);
  y += 5;

  const partyBoxH = 38;
  const halfW = (CONTENT_W - 5) / 2;

  // Mairie (gauche)
  pdf.setDrawColor(...SLATE_300);
  pdf.setFillColor(...SLATE_100);
  pdf.roundedRect(MARGIN, y, halfW, partyBoxH, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...PRIMARY);
  pdf.text('ENTRE :', MARGIN + 3, y + 5);
  pdf.setTextColor(...SLATE_900);
  pdf.text(cfg.mairieName, MARGIN + 3, y + 11);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...SLATE_600);
  pdf.text(cfg.mairieAddressLine1, MARGIN + 3, y + 16);
  pdf.text(cfg.mairieAddressLine2, MARGIN + 3, y + 20);
  pdf.text(cfg.mairiePhone, MARGIN + 3, y + 24);
  pdf.text(`Représentée par ${cfg.mayorTitle.toLowerCase()},`, MARGIN + 3, y + 30);
  pdf.text(cfg.mayorName, MARGIN + 3, y + 34);

  // Association (droite)
  const rightX = MARGIN + halfW + 5;
  pdf.setFillColor(232, 240, 253);
  pdf.setDrawColor(...PRIMARY);
  pdf.roundedRect(rightX, y, halfW, partyBoxH, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...PRIMARY);
  pdf.text('ET :', rightX + 3, y + 5);

  pdf.setTextColor(...SLATE_900);
  pdf.setFontSize(9);
  let occY = y + 11;
  pdf.text(`L'association : ${data.association.name}`, rightX + 3, occY);
  occY += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...SLATE_600);
  if (data.association.address) {
    const lines = pdf.splitTextToSize(`Siège : ${data.association.address}`, halfW - 6);
    pdf.text(lines, rightX + 3, occY);
    occY += lines.length * 4;
  }
  if (data.association.presidentName) {
    pdf.text(`Représentée par : ${data.association.presidentName}`, rightX + 3, occY);
    occY += 4;
  }
  if (data.association.email) {
    pdf.text(`Email : ${data.association.email}`, rightX + 3, occY);
    occY += 4;
  }
  if (data.association.phone) {
    pdf.text(`Tél : ${data.association.phone}`, rightX + 3, occY);
  }

  y += partyBoxH + 5;

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.setTextColor(...SLATE_600);
  pdf.text("Désignée ci-après « l'occupant ».", MARGIN, y);
  y += 8;

  // -------------- Objet --------------
  ensureSpace(26);
  pdf.setFillColor(236, 253, 245);
  pdf.setDrawColor(...ACCENT);
  pdf.roundedRect(MARGIN, y, CONTENT_W, 22, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...ACCENT);
  pdf.text('OBJET — MISE À DISPOSITION ANNUELLE', MARGIN + 4, y + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...SLATE_900);
  const objLines = pdf.splitTextToSize(
    `La présente convention règle la mise à disposition régulière de salles municipales au profit de l'association, pour ses activités habituelles durant la saison ${cfg.conventionYear}, selon le planning convenu avec la commune.`,
    CONTENT_W - 8
  );
  pdf.text(objLines, MARGIN + 4, y + 12);
  y += 28;

  // -------------- Helpers articles --------------
  const drawTitle = (text: string) => {
    ensureSpace(10);
    pdf.setFillColor(...PRIMARY);
    pdf.roundedRect(MARGIN, y, CONTENT_W, 7, 1.5, 1.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text(text, MARGIN + 3, y + 5);
    y += 10;
  };

  const drawArticle = (title: string, body: string) => {
    ensureSpace(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(...SLATE_900);
    pdf.text(title, MARGIN, y);
    y += 4.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...SLATE_600);
    const lines = pdf.splitTextToSize(body, CONTENT_W);
    ensureSpace(lines.length * 4.2 + 3);
    pdf.text(lines, MARGIN, y);
    y += lines.length * 4.2 + 4;
  };

  const drawBulletList = (items: string[]) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...SLATE_600);
    for (const item of items) {
      const wrapped = pdf.splitTextToSize(`• ${item}`, CONTENT_W - 4);
      ensureSpace(wrapped.length * 4.2 + 1);
      pdf.text(wrapped, MARGIN + 2, y);
      y += wrapped.length * 4.2 + 1;
    }
    y += 2;
  };

  // -------------- TITRE 1 --------------
  drawTitle('TITRE 1 — ENGAGEMENTS DE LA VILLE');
  drawArticle(
    'Article 1 — Mise à disposition',
    `La mise à disposition est consentie à titre précaire, révocable et gracieux (article L.2125-1 du Code Général de la Propriété des Personnes Publiques) pour les créneaux réguliers convenus durant la saison ${cfg.conventionYear}.`
  );
  drawArticle(
    'Article 2 — Équipements',
    "Les équipements présents (mobilier, sanitaires, vestiaires, matériel) sont mis à disposition en l'état et doivent être restitués propres et intacts après chaque utilisation."
  );

  // -------------- TITRE 2 --------------
  drawTitle("TITRE 2 — ENGAGEMENTS DE L'OCCUPANT");

  ensureSpace(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(...SLATE_900);
  pdf.text('Article 1 — Obligations', MARGIN, y);
  y += 4.5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...SLATE_600);
  pdf.text("L'association s'engage à :", MARGIN, y);
  y += 4.5;
  drawBulletList([
    'Respecter le règlement intérieur des salles utilisées',
    "Utiliser les salles uniquement pour les activités déclarées",
    'Assurer la surveillance des participants pendant toute la durée des créneaux',
    "Ne pas concéder l'usage des salles à un tiers",
    'Vérifier la fermeture des accès et l\'extinction des lumières en partant',
    'Laisser les locaux propres et signaler tout dégât',
    'Respecter le planning convenu et prévenir la commune en cas de non-utilisation',
  ]);

  drawArticle(
    'Article 2 — Assurance',
    "L'association déclare disposer d'une assurance responsabilité civile couvrant l'ensemble de ses activités dans les salles mises à disposition."
  );
  drawArticle(
    'Article 3 — Responsabilité',
    "L'association assume la responsabilité des dommages causés aux locaux et au matériel pendant la durée de la mise à disposition."
  );
  drawArticle(
    'Article 4 — Engagement républicain',
    "Conformément au décret n°2021-1947, l'association s'engage à respecter les principes de la République : laïcité, liberté de conscience, égalité, non-discrimination, dignité humaine."
  );

  // -------------- Encart attention --------------
  ensureSpace(18);
  pdf.setFillColor(...AMBER_50);
  pdf.setDrawColor(...AMBER_700);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(MARGIN, y, CONTENT_W, 14, 1.5, 1.5, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...AMBER_700);
  pdf.text('IMPORTANT', MARGIN + 3, y + 5);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...SLATE_600);
  const importantLines = pdf.splitTextToSize(
    "La présente convention vaut pour l'ensemble des réservations régulières de la saison. Toute manifestation exceptionnelle fait l'objet d'une convention ponctuelle spécifique.",
    CONTENT_W - 6
  );
  pdf.text(importantLines, MARGIN + 3, y + 10);
  pdf.setLineWidth(0.2);
  y += 18;

  // -------------- Signatures --------------
  ensureSpace(70);
  y += 4;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...SLATE_900);
  pdf.text(`Fait à Chartrettes, le ${fmtShortDate(data.signedAt)}.`, MARGIN, y);
  y += 8;

  const sigBoxW = (CONTENT_W - 8) / 2;
  const sigBoxH = 50;

  // Mairie (gauche)
  pdf.setDrawColor(...SLATE_300);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(MARGIN, y, sigBoxW, sigBoxH, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...PRIMARY);
  pdf.text('Pour la Mairie', MARGIN + 3, y + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...SLATE_600);
  pdf.text(cfg.mayorTitle, MARGIN + 3, y + 11);
  pdf.text(cfg.mayorName, MARGIN + 3, y + 16);

  let mairieSigned = false;
  try {
    if (data.mairieSignature && data.mairieSignature.startsWith('data:image/')) {
      const imgW = sigBoxW - 12;
      const imgH = 22;
      pdf.addImage(data.mairieSignature, 'PNG', MARGIN + 6, y + sigBoxH - imgH - 5, imgW, imgH, undefined, 'FAST');
      mairieSigned = true;
    }
  } catch (e) {
    // image invalide → mention manuelle
  }

  if (mairieSigned) {
    pdf.setFontSize(7);
    pdf.setTextColor(...PRIMARY);
    const valDate = data.mairieValidatedAt ?? data.signedAt;
    pdf.text(`Validée le ${fmtShortDate(valDate)}`, MARGIN + sigBoxW / 2, y + sigBoxH - 1, { align: 'center' });
  } else {
    pdf.setFontSize(7);
    pdf.setTextColor(...SLATE_300);
    pdf.text('— Signature manuelle —', MARGIN + sigBoxW / 2, y + sigBoxH - 4, { align: 'center' });
  }

  // Occupant (droite)
  const rX = MARGIN + sigBoxW + 8;
  pdf.setDrawColor(...ACCENT);
  pdf.setLineWidth(0.5);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(rX, y, sigBoxW, sigBoxH, 2, 2, 'FD');
  pdf.setLineWidth(0.2);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...ACCENT);
  pdf.text("L'occupant", rX + 3, y + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...SLATE_900);
  pdf.text(data.association.name, rX + 3, y + 11);
  if (data.association.presidentName) {
    pdf.setTextColor(...SLATE_600);
    pdf.text(data.association.presidentName, rX + 3, y + 15);
  }

  try {
    if (data.signature && data.signature.startsWith('data:image/')) {
      const imgW = sigBoxW - 12;
      const imgH = 22;
      pdf.addImage(data.signature, 'PNG', rX + 6, y + sigBoxH - imgH - 5, imgW, imgH, undefined, 'FAST');
    }
  } catch (e) {
    // ignore
  }

  pdf.setFontSize(7);
  pdf.setTextColor(...ACCENT);
  pdf.text(`Signée électroniquement le ${fmtShortDate(data.signedAt)}`, rX + sigBoxW / 2, y + sigBoxH - 1, { align: 'center' });

  y += sigBoxH + 6;

  // -------------- Pied de page --------------
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...SLATE_600);
    pdf.text(`${cfg.mairieName} — Convention annuelle (saison ${cfg.conventionYear})`, MARGIN, PAGE_H - 8);
    pdf.text(`Page ${i} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
  }

  return pdf;
}
