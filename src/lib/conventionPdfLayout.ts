import { jsPDF } from 'jspdf';

/**
 * Mise en page commune aux conventions PDF (ponctuelle et annuelle).
 *
 * Habillage « Élégant municipal » : en-tête à blason, filet double, titres en
 * petites capitales espacées, encadrés à filet fin. Les deux générateurs
 * partagent ce module pour que les documents restent identiques au pixel près
 * — le texte est déjà mutualisé dans conventionText.ts.
 *
 * Palette alignée sur le design system du site : primary = bleu ardoise,
 * accent = teal. jsPDF n'embarque qu'Helvetica (encodage WinAnsi) : pas de
 * flèches ni de guillemets exotiques dans les libellés, ils sortiraient en
 * « ! ».
 */

export const PAGE_W = 210;
export const PAGE_H = 297;
export const MARGIN = 18;
export const CONTENT_W = PAGE_W - MARGIN * 2;
/** Hauteur réservée au pied de page : le contenu ne descend jamais plus bas. */
const FOOTER_H = 14;

type RGB = [number, number, number];

export const PRIMARY: RGB = [30, 58, 95]; // primary-700 — bleu ardoise
export const PRIMARY_LIGHT: RGB = [232, 240, 253]; // primary-50
export const ACCENT: RGB = [5, 150, 105]; // accent-600 — teal
export const ACCENT_LIGHT: RGB = [236, 253, 245];
export const SLATE_900: RGB = [15, 23, 42];
export const SLATE_600: RGB = [71, 85, 105];
export const SLATE_400: RGB = [148, 163, 184];
export const SLATE_300: RGB = [203, 213, 225];
export const SLATE_100: RGB = [241, 245, 249];
export const SLATE_50: RGB = [248, 250, 252];
export const AMBER_50: RGB = [255, 251, 235];
export const AMBER_700: RGB = [180, 83, 9];

export function fmtShortDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR');
}

export function fmtLongDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Identité de la mairie affichée dans l'en-tête et le pied de page. */
export interface LetterheadSettings {
  mairieName: string;
  mairieAddressLine1: string;
  mairieAddressLine2: string;
  mairiePhone: string;
  conventionYear: string;
}

export interface LetterheadOptions {
  /** Blason de la commune en data URL (public/image/logo.jpg). Facultatif. */
  logo?: string | null;
  settings: LetterheadSettings;
  /** Titre du document, centré sous le filet. */
  title: string;
  /** Sur-titre discret au-dessus du titre (ex. « Réservation ponctuelle »). */
  eyebrow?: string;
  /** Lignes du bloc de référence, alignées à droite de l'en-tête. */
  reference?: string[];
}

export interface SignatureBlock {
  /** « Pour la Ville de CHARTRETTES » / « Pour l'occupant ». */
  heading: string;
  /** Lignes d'identité sous le titre du cadre. */
  lines: string[];
  /** Signature en data URL, si elle existe. */
  signature?: string | null;
  /** Mention affichée en bas du cadre (date de signature ou de validation). */
  caption?: string | null;
  /** Mention de repli quand aucune signature n'est présente. */
  placeholder?: string;
  /** Cadre mis en avant (bordure accent) — utilisé pour l'occupant. */
  highlighted?: boolean;
}

export interface TableColumn {
  header: string;
  /** Largeur en fraction de la largeur utile (la somme doit valoir 1). */
  width: number;
  align?: 'left' | 'right';
}

/**
 * Fabrique un document et l'ensemble des primitives de dessin partageant le
 * même curseur vertical.
 */
export function createConventionDoc() {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const setColor = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: RGB) => pdf.setDrawColor(c[0], c[1], c[2]);

  /** Marge basse effective : le pied de page ne doit jamais être recouvert. */
  const bottomLimit = () => PAGE_H - FOOTER_H;

  const newPage = () => {
    pdf.addPage();
    y = MARGIN;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit()) newPage();
  };

  /**
   * Texte en petites capitales espacées — l'allure « acte administratif ».
   * charSpace est un réglage par appel : rien à réinitialiser ensuite.
   */
  const smallCaps = (
    text: string,
    x: number,
    yPos: number,
    size: number,
    color: RGB,
    align: 'left' | 'center' = 'left'
  ) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(size);
    setColor(color);
    pdf.text(text.toUpperCase(), x, yPos, { charSpace: 0.5, align });
  };

  /* ---------------------------------------------------------------------- */
  /*  En-tête                                                               */
  /* ---------------------------------------------------------------------- */

  const letterhead = ({ logo, settings, title, eyebrow, reference }: LetterheadOptions) => {
    const top = 14;
    const blasonW = 20;
    let textX = MARGIN;

    if (logo) {
      try {
        // Le blason est carré : on le pose sur la marge, aligné avec le bloc texte.
        pdf.addImage(logo, 'JPEG', MARGIN, top - 2, blasonW, blasonW, undefined, 'FAST');
        textX = MARGIN + blasonW + 5;
      } catch {
        // Blason illisible : l'en-tête reste purement typographique.
      }
    }

    smallCaps('République Française', textX, top + 3, 7.5, SLATE_400);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    setColor(PRIMARY);
    pdf.text(settings.mairieName.replace(/^LA\s+/i, ''), textX, top + 9.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    setColor(SLATE_600);
    pdf.text(
      `${settings.mairieAddressLine1} — ${settings.mairieAddressLine2}`,
      textX,
      top + 14
    );
    pdf.text(`Tél. ${settings.mairiePhone}`, textX, top + 17.6);

    if (reference && reference.length > 0) {
      pdf.setFontSize(7.5);
      setColor(SLATE_400);
      reference.forEach((line, i) => {
        pdf.text(line, PAGE_W - MARGIN, top + 3 + i * 3.8, { align: 'right' });
      });
    }

    // Filet double : trait épais primary + filet fin accent, séparés de 1 mm.
    const ruleY = top + blasonW + 3;
    setFill(PRIMARY);
    pdf.rect(MARGIN, ruleY, CONTENT_W, 0.7, 'F');
    setFill(ACCENT);
    pdf.rect(MARGIN, ruleY + 1.3, CONTENT_W, 0.25, 'F');

    y = ruleY + 9;

    if (eyebrow) {
      smallCaps(eyebrow, PAGE_W / 2, y, 7.5, ACCENT, 'center');
      y += 6;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12.5);
    setColor(PRIMARY);
    const titleLines = pdf.splitTextToSize(title, CONTENT_W - 20);
    titleLines.forEach((line: string, i: number) => {
      pdf.text(line, PAGE_W / 2, y + i * 5.6, { align: 'center' });
    });
    y += titleLines.length * 5.6 + 1.5;

    // Petit filet d'accent centré sous le titre.
    setFill(ACCENT);
    pdf.rect(PAGE_W / 2 - 12, y, 24, 0.5, 'F');
    y += 8;
  };

  /* ---------------------------------------------------------------------- */
  /*  Titres et corps de texte                                              */
  /* ---------------------------------------------------------------------- */

  /** TITRE 1 / TITRE 2 / TITRE 3 : petites capitales + filet pleine largeur. */
  const sectionTitle = (text: string) => {
    ensureSpace(14);
    y += 2;
    setFill(ACCENT);
    pdf.rect(MARGIN, y - 3, 2.5, 2.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    setColor(PRIMARY);
    pdf.text(text.toUpperCase(), MARGIN + 5, y, { charSpace: 0.35 });
    y += 1.8;
    setFill(SLATE_300);
    pdf.rect(MARGIN, y, CONTENT_W, 0.2, 'F');
    y += 5.5;
  };

  const paragraph = (text: string, options: { indent?: number } = {}) => {
    const indent = options.indent ?? 0;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.8);
    setColor(SLATE_600);
    const lines = pdf.splitTextToSize(text, CONTENT_W - indent);
    for (const line of lines) {
      ensureSpace(4.4);
      pdf.text(line, MARGIN + indent, y);
      y += 4.2;
    }
    y += 1.6;
  };

  const articleTitle = (text: string) => {
    ensureSpace(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    setColor(SLATE_900);
    pdf.text(text, MARGIN, y);
    y += 4.6;
  };

  const bullets = (items: string[]) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.8);
    for (const item of items) {
      const lines = pdf.splitTextToSize(item, CONTENT_W - 6);
      ensureSpace(lines.length * 4.2 + 1);
      // Puce ronde pleine, plus soignée qu'un « • » de la police.
      setFill(ACCENT);
      pdf.circle(MARGIN + 1.6, y - 1.1, 0.7, 'F');
      setColor(SLATE_600);
      pdf.text(lines, MARGIN + 5, y);
      y += lines.length * 4.2 + 1.2;
    }
    y += 1.5;
  };

  /* ---------------------------------------------------------------------- */
  /*  Encadrés                                                              */
  /* ---------------------------------------------------------------------- */

  /** Les deux parties contractantes, côte à côte. */
  const parties = (
    left: { heading: string; title: string; lines: string[] },
    right: { heading: string; title: string; lines: string[] }
  ) => {
    const halfW = (CONTENT_W - 6) / 2;

    // Hauteur mesurée sur le contenu réel : le titre (corps 9) et les lignes
    // d'identité (corps 7,8) n'ont ni la même taille ni le même interligne, et
    // un nom d'association un peu long passe sur deux lignes.
    const measure = (party: { title: string; lines: string[] }) => {
      pdf.setFontSize(9);
      const titleLines = pdf.splitTextToSize(party.title, halfW - 7).length;
      pdf.setFontSize(7.8);
      const bodyLines = party.lines.reduce(
        (total, line) => total + pdf.splitTextToSize(line, halfW - 7).length,
        0
      );
      return 13 + titleLines * 4 + bodyLines * 3.9;
    };
    const boxH = Math.max(measure(left), measure(right));
    ensureSpace(boxH + 6);

    const drawParty = (
      party: { heading: string; title: string; lines: string[] },
      x: number,
      tint: RGB
    ) => {
      setFill(tint);
      setDraw(SLATE_300);
      pdf.setLineWidth(0.2);
      pdf.rect(x, y, halfW, boxH, 'FD');
      // Liseré de couleur sur le bord gauche, comme un onglet d'acte.
      setFill(PRIMARY);
      pdf.rect(x, y, 1, boxH, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      setColor(ACCENT);
      pdf.text(party.heading.toUpperCase(), x + 4, y + 5, { charSpace: 0.4 });

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      setColor(PRIMARY);
      const titleLines = pdf.splitTextToSize(party.title, halfW - 7);
      pdf.text(titleLines, x + 4, y + 10);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.8);
      setColor(SLATE_600);
      let lineY = y + 10 + titleLines.length * 4;
      for (const line of party.lines) {
        const wrapped = pdf.splitTextToSize(line, halfW - 7);
        pdf.text(wrapped, x + 4, lineY);
        lineY += wrapped.length * 3.9;
      }
    };

    drawParty(left, MARGIN, SLATE_50);
    drawParty(right, MARGIN + halfW + 6, PRIMARY_LIGHT);
    y += boxH + 6;
  };

  /** Encadré « objet » : fond teinté accent, titre en capitales. */
  const highlightBox = (heading: string, lines: string[]) => {
    pdf.setFontSize(8.8);
    const wrapped = lines.flatMap((line) => pdf.splitTextToSize(line, CONTENT_W - 10) as string[]);
    const boxH = 10 + wrapped.length * 4.2;
    ensureSpace(boxH + 5);

    setFill(ACCENT_LIGHT);
    setDraw(ACCENT);
    pdf.setLineWidth(0.3);
    pdf.rect(MARGIN, y, CONTENT_W, boxH, 'FD');
    pdf.setLineWidth(0.2);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    setColor(ACCENT);
    pdf.text(heading.toUpperCase(), MARGIN + 5, y + 5.5, { charSpace: 0.4 });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.8);
    setColor(SLATE_900);
    pdf.text(wrapped, MARGIN + 5, y + 10.5);
    y += boxH + 5;
  };

  /** Encadré d'avertissement (ambre). */
  const notice = (heading: string, text: string) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const lines = pdf.splitTextToSize(text, CONTENT_W - 10);
    const boxH = 10 + lines.length * 3.9;
    ensureSpace(boxH + 5);

    setFill(AMBER_50);
    pdf.rect(MARGIN, y, CONTENT_W, boxH, 'F');
    setFill(AMBER_700);
    pdf.rect(MARGIN, y, 1.2, boxH, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    setColor(AMBER_700);
    pdf.text(heading.toUpperCase(), MARGIN + 5, y + 5.5, { charSpace: 0.4 });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    setColor(SLATE_600);
    pdf.text(lines, MARGIN + 5, y + 10);
    y += boxH + 5;
  };

  /** Tableau à en-tête plein, filets fins et lignes alternées. */
  const table = (columns: TableColumn[], rows: string[][]) => {
    const widths = columns.map((column) => column.width * CONTENT_W);
    const xs = widths.reduce<number[]>((acc, width, i) => {
      acc.push(i === 0 ? MARGIN : acc[i - 1] + widths[i - 1]);
      return acc;
    }, []);
    const rowH = 6.6;

    const drawHeader = () => {
      setFill(PRIMARY);
      pdf.rect(MARGIN, y, CONTENT_W, rowH, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.4);
      pdf.setTextColor(255, 255, 255);
      columns.forEach((column, i) => {
        const x = column.align === 'right' ? xs[i] + widths[i] - 2.5 : xs[i] + 2.5;
        pdf.text(column.header.toUpperCase(), x, y + 4.4, {
          align: column.align === 'right' ? 'right' : 'left',
          charSpace: 0.25,
        });
      });
      y += rowH;
    };

    ensureSpace(rowH * 3);
    drawHeader();

    rows.forEach((row, index) => {
      if (y + rowH > bottomLimit()) {
        newPage();
        drawHeader();
      }
      if (index % 2 === 1) {
        setFill(SLATE_50);
        pdf.rect(MARGIN, y, CONTENT_W, rowH, 'F');
      }
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.8);
      setColor(SLATE_900);
      row.forEach((cell, i) => {
        const [line] = pdf.splitTextToSize(cell, widths[i] - 5);
        const x = columns[i].align === 'right' ? xs[i] + widths[i] - 2.5 : xs[i] + 2.5;
        pdf.text(line ?? '', x, y + 4.4, {
          align: columns[i].align === 'right' ? 'right' : 'left',
        });
      });
      setFill(SLATE_300);
      pdf.rect(MARGIN, y + rowH - 0.15, CONTENT_W, 0.15, 'F');
      y += rowH;
    });

    y += 5;
  };

  /* ---------------------------------------------------------------------- */
  /*  Signatures                                                            */
  /* ---------------------------------------------------------------------- */

  /** Insère une signature dans le cadre en conservant ses proportions. */
  const placeSignature = (dataUrl: string, boxX: number, boxY: number, boxW: number, boxH: number) => {
    const maxW = boxW - 14;
    const maxH = 18;
    let drawW = maxW;
    let drawH = maxH;
    try {
      const props = pdf.getImageProperties(dataUrl);
      const scale = Math.min(maxW / props.width, maxH / props.height);
      drawW = props.width * scale;
      drawH = props.height * scale;
    } catch {
      // proportions inconnues : on remplit le cadre maximal
    }
    pdf.addImage(
      dataUrl,
      'PNG',
      boxX + (boxW - drawW) / 2,
      boxY + boxH - drawH - 7,
      drawW,
      drawH,
      undefined,
      'FAST'
    );
  };

  const signatures = (place: string, left: SignatureBlock, right: SignatureBlock) => {
    // 52 mm : de quoi loger jusqu'a trois lignes d'identite au-dessus de
    // l'image de signature sans que les deux se chevauchent.
    const boxH = 52;
    ensureSpace(boxH + 16);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.8);
    setColor(SLATE_900);
    pdf.text(place, MARGIN, y);
    y += 7;

    const boxW = (CONTENT_W - 8) / 2;

    const drawBlock = (block: SignatureBlock, x: number) => {
      setFill([255, 255, 255]);
      setDraw(block.highlighted ? ACCENT : SLATE_300);
      pdf.setLineWidth(block.highlighted ? 0.4 : 0.2);
      pdf.rect(x, y, boxW, boxH, 'FD');
      pdf.setLineWidth(0.2);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      setColor(block.highlighted ? ACCENT : PRIMARY);
      pdf.text(block.heading.toUpperCase(), x + 4, y + 5.5, { charSpace: 0.35 });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setColor(SLATE_900);
      let lineY = y + 11;
      block.lines.forEach((line, index) => {
        const wrapped = pdf.splitTextToSize(line, boxW - 8);
        setColor(index === 0 ? SLATE_900 : SLATE_600);
        pdf.text(wrapped, x + 4, lineY);
        lineY += wrapped.length * 3.9;
      });

      let signed = false;
      try {
        if (block.signature && block.signature.startsWith('data:image/')) {
          placeSignature(block.signature, x, y, boxW, boxH);
          signed = true;
        }
      } catch {
        // signature illisible : on retombe sur la mention manuelle
      }

      // Ligne de signature pointillée, sous l'image.
      setDraw(SLATE_300);
      pdf.setLineDashPattern([0.8, 0.8], 0);
      pdf.line(x + 6, y + boxH - 6, x + boxW - 6, y + boxH - 6);
      pdf.setLineDashPattern([], 0);

      pdf.setFontSize(6.6);
      if (signed && block.caption) {
        setColor(block.highlighted ? ACCENT : PRIMARY);
        pdf.text(block.caption, x + boxW / 2, y + boxH - 2, { align: 'center' });
      } else if (!signed) {
        setColor(SLATE_400);
        pdf.text(block.placeholder ?? 'Signature', x + boxW / 2, y + boxH - 2, { align: 'center' });
      }
    };

    drawBlock(left, MARGIN);
    drawBlock(right, MARGIN + boxW + 8);
    y += boxH + 6;
  };

  /* ---------------------------------------------------------------------- */
  /*  Pied de page                                                          */
  /* ---------------------------------------------------------------------- */

  /** À appeler en dernier : numérote toutes les pages une fois le total connu. */
  const footer = (label: string) => {
    const total = pdf.getNumberOfPages();
    for (let page = 1; page <= total; page++) {
      pdf.setPage(page);
      setFill(SLATE_300);
      pdf.rect(MARGIN, PAGE_H - 11, CONTENT_W, 0.2, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.8);
      setColor(SLATE_400);
      pdf.text(label, MARGIN, PAGE_H - 7);
      pdf.text(`Page ${page} sur ${total}`, PAGE_W - MARGIN, PAGE_H - 7, { align: 'right' });
    }
  };

  return {
    pdf,
    get y() {
      return y;
    },
    set y(value: number) {
      y = value;
    },
    ensureSpace,
    letterhead,
    sectionTitle,
    articleTitle,
    paragraph,
    bullets,
    parties,
    highlightBox,
    notice,
    table,
    signatures,
    footer,
  };
}

export type ConventionDoc = ReturnType<typeof createConventionDoc>;
