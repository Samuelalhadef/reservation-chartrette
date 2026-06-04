import { jsPDF } from 'jspdf';

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
   * dans ce cas elle s'affiche dans la case « Pour la Mairie ».
   */
  mairieSignature?: string | null;
  /** Date de validation par la mairie (affichée sous la signature du maire). */
  mairieValidatedAt?: Date | string | null;
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

/**
 * Insère une signature dans un cadre en préservant ses proportions
 * (centrée horizontalement, alignée en bas du cadre).
 */
function addSignatureImage(pdf: jsPDF, dataUrl: string, boxX: number, boxY: number, boxW: number, boxH: number) {
  const maxW = boxW - 12;
  const maxH = 22;
  let drawW = maxW;
  let drawH = maxH;
  try {
    const props = pdf.getImageProperties(dataUrl);
    const scale = Math.min(maxW / props.width, maxH / props.height);
    drawW = props.width * scale;
    drawH = props.height * scale;
  } catch {
    // proportions inconnues → cadre max
  }
  pdf.addImage(dataUrl, 'PNG', boxX + (boxW - drawW) / 2, boxY + boxH - drawH - 5, drawW, drawH, undefined, 'FAST');
}

// Palette
const PRIMARY: [number, number, number] = [30, 58, 95]; // primary-700
const ACCENT: [number, number, number] = [5, 150, 105]; // accent-600
const SLATE_900: [number, number, number] = [15, 23, 42];
const SLATE_600: [number, number, number] = [71, 85, 105];
const SLATE_300: [number, number, number] = [203, 213, 225];
const SLATE_100: [number, number, number] = [241, 245, 249];
const AMBER_50: [number, number, number] = [255, 251, 235];
const AMBER_700: [number, number, number] = [180, 83, 9];

function fmtDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtShortDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR');
}

function fmtTimeRange(slots: Array<{ start: string; end: string }>): string {
  if (!slots || slots.length === 0) return '—';
  const first = slots[0].start;
  const last = slots[slots.length - 1].end;
  return `${first} → ${last}`;
}

/**
 * Génère le PDF complet de la convention pour une réservation ponctuelle.
 */
export function generateReservationConventionPDF(data: ConventionPdfData): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;
  const cfg: ConventionPdfSettings = { ...DEFAULT_PDF_SETTINGS, ...(data.settings || {}) };

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      pdf.addPage();
      y = MARGIN;
    }
  };

  // -------------- En-tête (bandeau coloré) --------------
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
  pdf.text("Salle municipale — Commune de Chartrettes", MARGIN, 23);
  pdf.setFontSize(8);
  pdf.text(`Réservation ponctuelle — Saison ${cfg.conventionYear}`, MARGIN, 29);

  y = 44;

  // -------------- Référence + date --------------
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

  // Occupant (droite)
  const rightX = MARGIN + halfW + 5;
  pdf.setFillColor(232, 240, 253); // primary-50
  pdf.setDrawColor(...PRIMARY);
  pdf.roundedRect(rightX, y, halfW, partyBoxH, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...PRIMARY);
  pdf.text('ET :', rightX + 3, y + 5);

  pdf.setTextColor(...SLATE_900);
  pdf.setFontSize(9);
  let occupantY = y + 11;
  if (data.signer.type === 'association' && data.association) {
    pdf.text(`L'association : ${data.association.name}`, rightX + 3, occupantY);
    occupantY += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...SLATE_600);
    if (data.association.address) {
      const lines = pdf.splitTextToSize(`Siège : ${data.association.address}`, halfW - 6);
      pdf.text(lines, rightX + 3, occupantY);
      occupantY += lines.length * 4;
    }
    pdf.text(`Représentée par : ${data.signer.name}`, rightX + 3, occupantY);
    occupantY += 4;
    if (data.signer.email) {
      pdf.text(`Email : ${data.signer.email}`, rightX + 3, occupantY);
      occupantY += 4;
    }
    if (data.signer.phone) {
      pdf.text(`Tél : ${data.signer.phone}`, rightX + 3, occupantY);
    }
  } else {
    pdf.text(data.signer.name, rightX + 3, occupantY);
    occupantY += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...SLATE_600);
    if (data.signer.address) {
      const lines = pdf.splitTextToSize(`Adresse : ${data.signer.address}`, halfW - 6);
      pdf.text(lines, rightX + 3, occupantY);
      occupantY += lines.length * 4;
    }
    if (data.signer.email) {
      pdf.text(`Email : ${data.signer.email}`, rightX + 3, occupantY);
      occupantY += 4;
    }
    if (data.signer.phone) {
      pdf.text(`Tél : ${data.signer.phone}`, rightX + 3, occupantY);
    }
  }

  y += partyBoxH + 5;

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.setTextColor(...SLATE_600);
  pdf.text('Désigné ci-après « l\'occupant ».', MARGIN, y);
  y += 8;

  // -------------- Détails de la réservation --------------
  ensureSpace(38);
  pdf.setFillColor(236, 253, 245); // accent-50
  pdf.setDrawColor(...ACCENT);
  pdf.roundedRect(MARGIN, y, CONTENT_W, 32, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...ACCENT);
  pdf.text('OBJET — RÉSERVATION PONCTUELLE', MARGIN + 4, y + 6);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...SLATE_900);
  pdf.text(`Salle : `, MARGIN + 4, y + 13);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.reservation.roomName, MARGIN + 18, y + 13);

  pdf.setFont('helvetica', 'normal');
  pdf.text(`Date : `, MARGIN + 4, y + 19);
  pdf.setFont('helvetica', 'bold');
  pdf.text(fmtDate(data.reservation.date), MARGIN + 18, y + 19);

  pdf.setFont('helvetica', 'normal');
  pdf.text(`Créneau : `, MARGIN + 4, y + 25);
  pdf.setFont('helvetica', 'bold');
  pdf.text(fmtTimeRange(data.reservation.timeSlots), MARGIN + 22, y + 25);

  if (data.reservation.estimatedParticipants) {
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Participants : `, PAGE_W / 2, y + 25);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${data.reservation.estimatedParticipants} personnes`, PAGE_W / 2 + 25, y + 25);
  }

  if (data.reservation.reason) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...SLATE_600);
    const reasonLines = pdf.splitTextToSize(`Motif : ${data.reservation.reason}`, CONTENT_W - 8);
    pdf.text(reasonLines, MARGIN + 4, y + 30);
  }

  y += 38;

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
    'La mise à disposition est consentie à titre précaire, révocable et gracieux (article L.2125-1 du Code Général de la Propriété des Personnes Publiques) pour le créneau précisé ci-dessus uniquement.'
  );
  drawArticle(
    'Article 2 — Équipements',
    "Les équipements présents (mobilier, sanitaires, vestiaires, matériel sportif) sont mis à disposition en l'état et doivent être restitués propres et intacts."
  );

  // -------------- TITRE 2 --------------
  drawTitle("TITRE 2 — ENGAGEMENTS DE L'OCCUPANT");

  ensureSpace(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(...SLATE_900);
  pdf.text("Article 1 — Obligations", MARGIN, y);
  y += 4.5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...SLATE_600);
  pdf.text("L'occupant s'engage à :", MARGIN, y);
  y += 4.5;
  drawBulletList([
    "Respecter le règlement intérieur de la salle",
    "Utiliser la salle uniquement pour l'activité déclarée",
    "Assurer la surveillance des participants pendant toute la durée du créneau",
    "Ne pas concéder l'usage de la salle à un tiers",
    "Vérifier la fermeture des accès et l'extinction des lumières en partant",
    "Laisser les locaux propres et signaler tout dégât",
  ]);

  drawArticle(
    'Article 2 — Assurance',
    "L'occupant déclare disposer d'une assurance responsabilité civile couvrant l'activité organisée dans la salle."
  );
  drawArticle(
    'Article 3 — Responsabilité',
    "L'occupant assume la responsabilité des dommages causés aux locaux et au matériel pendant la durée de la mise à disposition."
  );
  drawArticle(
    'Article 4 — Engagement républicain',
    "Conformément au décret n°2021-1947, l'occupant s'engage à respecter les principes de la République : laïcité, liberté de conscience, égalité, non-discrimination, dignité humaine."
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
    "En l'absence de signature de la présente convention, la réservation ne peut être validée. La mise à disposition est strictement limitée au créneau réservé.",
    CONTENT_W - 6
  );
  pdf.text(importantLines, MARGIN + 3, y + 10);
  pdf.setLineWidth(0.2);
  y += 18;

  // -------------- Signature zone --------------
  ensureSpace(70);
  y += 4;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...SLATE_900);
  pdf.text(`Fait à Chartrettes, le ${fmtShortDate(data.signedAt)}.`, MARGIN, y);
  y += 8;

  const sigBoxW = (CONTENT_W - 8) / 2;
  const sigBoxH = 50;

  // Mairie (gauche) — non signée électroniquement
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

  // Signature du maire (si la convention a été validée par la mairie)
  let mairieSigned = false;
  try {
    if (data.mairieSignature && data.mairieSignature.startsWith('data:image/')) {
      addSignatureImage(pdf, data.mairieSignature, MARGIN, y, sigBoxW, sigBoxH);
      mairieSigned = true;
    }
  } catch (e) {
    // image invalide → on retombe sur la mention manuelle
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

  // Occupant (droite) — signature électronique
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
  pdf.text(data.signer.name, rX + 3, y + 11);
  if (data.association && data.signer.type === 'association') {
    pdf.setTextColor(...SLATE_600);
    const al = pdf.splitTextToSize(data.association.name, sigBoxW - 6);
    pdf.text(al, rX + 3, y + 15);
  }

  // Image signature au centre-bas de la box
  try {
    if (data.signature && data.signature.startsWith('data:image/')) {
      addSignatureImage(pdf, data.signature, rX, y, sigBoxW, sigBoxH);
    }
  } catch (e) {
    // Si l'image n'est pas valide, on l'ignore silencieusement
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
    pdf.text(`${cfg.mairieName} — Convention de mise à disposition (saison ${cfg.conventionYear})`, MARGIN, PAGE_H - 8);
    pdf.text(`Page ${i} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
  }

  return pdf;
}
