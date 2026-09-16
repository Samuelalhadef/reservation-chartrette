import { getDocumentProxy } from 'unpdf';

/**
 * Transforme un PDF de règlement en HTML éditable (titres, articles, listes,
 * paragraphes). Un PDF ne décrit que des morceaux de texte positionnés : la
 * structure est donc déduite de la taille des caractères, des écarts entre
 * lignes et de la forme des lignes (« Article 3 », « II - … », puces).
 * Les tableaux ne sont pas reconstitués : l'admin relit le résultat dans
 * l'éditeur avant d'enregistrer.
 */

interface Line {
  text: string;
  size: number;
  x: number;
  y: number;
  width: number;
  page: number;
  /** Position verticale relative sur la page (0 = haut, 1 = bas). */
  relY: number;
}

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  hasEOL?: boolean;
}

const BULLET_RE = /^([-–—•·▪●◦○■□➢➤►✓*]|\uf0b7|\uf0a7)\s*/;
const NUMBERED_RE = /^(\d{1,2}|[a-z])[).]\s+/;
const ARTICLE_RE = /^(article|art\.)\s*(\d+|premier|1er)\b/i;
const SECTION_RE = /^(titre|chapitre|section|partie)\s+[\divxlc]+\b|^[IVX]{1,5}\s*[-–—.)]\s+\S/i;

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function extractLines(data: Uint8Array): Promise<Line[]> {
  const pdf = await getDocumentProxy(data);
  const lines: Line[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const pageHeight = page.getViewport({ scale: 1 }).height || 842;
    const content = await page.getTextContent();
    let current: Line | null = null;

    const flush = () => {
      if (current && current.text.trim()) {
        current.text = current.text.replace(/\s+/g, ' ').trim();
        lines.push(current);
      }
      current = null;
    };

    for (const raw of content.items as TextItem[]) {
      if (typeof raw.str !== 'string') continue;
      const size = Math.abs(raw.transform[3]) || Math.abs(raw.transform[0]);
      const x = raw.transform[4];
      const y = raw.transform[5];

      // Même ligne si l'ordonnée est quasi identique (exposants, polices mixtes).
      const open = current as Line | null;
      if (open && Math.abs(open.y - y) > Math.max(2, size * 0.4)) flush();

      const target: Line = (current as Line | null) ?? {
        text: '', size: 0, x, y, width: 0, page: pageNumber, relY: 1 - y / pageHeight,
      };
      current = target;
      if (raw.str.trim()) {
        const gap = x - (target.x + target.width);
        if (target.text && gap > size * 0.15 && !target.text.endsWith(' ')) target.text += ' ';
        target.text += raw.str;
        target.size = Math.max(target.size, size);
        target.width = Math.max(target.width, x + raw.width - target.x);
      }
      if (raw.hasEOL) flush();
    }
    flush();
  }

  return lines;
}

/**
 * Retire numéros de page et en-têtes/pieds de page : lignes situées dans les
 * marges haute ou basse et répétées sur la plupart des pages.
 */
function removePageFurniture(lines: Line[]): Line[] {
  const inMargin = (line: Line) => line.relY < 0.08 || line.relY > 0.92;
  const keyOf = (line: Line) => line.text.replace(/\d+/g, '#').toLowerCase();
  const pageCount = new Set(lines.map(l => l.page)).size;
  const occurrences = new Map<string, Set<number>>();
  for (const line of lines.filter(inMargin)) {
    const key = keyOf(line);
    if (!occurrences.has(key)) occurrences.set(key, new Set());
    occurrences.get(key)!.add(line.page);
  }

  return lines.filter(line => {
    if (!inMargin(line)) return true;
    if (/^(page\s*)?\d+(\s*(\/|sur)\s*\d+)?$/i.test(line.text)) return false;
    return pageCount < 2 || occurrences.get(keyOf(line))!.size < Math.max(2, Math.ceil(pageCount * 0.6));
  });
}

/** Valeur la plus fréquente (arrondie au demi-point). */
function mode(values: number[]): number {
  const counts = new Map<number, number>();
  for (const value of values) {
    const rounded = Math.round(value * 2) / 2;
    counts.set(rounded, (counts.get(rounded) ?? 0) + 1);
  }
  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  return best ? best[0] : 0;
}

export async function pdfToReglementHtml(data: Uint8Array): Promise<string> {
  const lines = removePageFurniture(await extractLines(data));
  if (lines.length === 0) return '';

  // Taille du corps de texte = taille la plus fréquente, pondérée par la longueur.
  const bodySize = mode(lines.flatMap(line => Array<number>(Math.ceil(line.text.length / 10)).fill(line.size)));
  const isBody = (line: Line) => Math.abs(line.size - bodySize) < 0.5;
  // Interligne normal = écart le plus fréquent entre deux lignes de corps de texte.
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [above, below] = [lines[i - 1], lines[i]];
    if (above.page === below.page && isBody(above) && isBody(below) && above.y > below.y) {
      gaps.push(above.y - below.y);
    }
  }
  const lineGap = mode(gaps) || bodySize * 1.2;
  const rightEdge = Math.max(...lines.map(l => l.x + l.width));

  const blocks: string[] = [];
  let paragraph: string | null = null;
  let listItems: string[] = [];
  let listTag: 'ul' | 'ol' = 'ul';
  let listItemX = 0;
  let previous: Line | null = null;
  let previousHeading: { tag: 'h2' | 'h3'; text: string; size: number } | null = null;
  let lastLineOfHeading: Line | null = null;

  const closeParagraph = () => {
    if (paragraph) blocks.push(`<p>${escapeHtml(paragraph)}</p>`);
    paragraph = null;
  };
  const closeList = () => {
    if (listItems.length) {
      blocks.push(`<${listTag}>${listItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</${listTag}>`);
    }
    listItems = [];
  };
  const closeAll = () => {
    closeParagraph();
    closeList();
  };
  const pushHeading = (tag: 'h2' | 'h3', text: string, line: Line, continues: boolean) => {
    // Titre sur plusieurs lignes : même niveau, même taille, sans espacement.
    if (continues && previousHeading && previousHeading.tag === tag && Math.abs(previousHeading.size - line.size) < 0.5) {
      previousHeading.text = `${previousHeading.text} ${text}`;
      blocks[blocks.length - 1] = `<${tag}>${escapeHtml(previousHeading.text)}</${tag}>`;
      return;
    }
    closeAll();
    blocks.push(`<${tag}>${escapeHtml(text)}</${tag}>`);
    previousHeading = { tag, text, size: line.size };
  };
  const appendText = (base: string, addition: string) =>
    // Mot coupé en fin de ligne (« régle-\nment »).
    /[a-zà-ÿ]-$/i.test(base) && /^[a-zà-ÿ]/.test(addition)
      ? base.slice(0, -1) + addition
      : `${base} ${addition}`;

  for (const line of lines) {
    const text = line.text;
    const prev = previous as Line | null;
    const isShort = text.length < 120;
    const bigger = line.size >= bodySize * 1.25;
    const slightlyBigger = line.size >= bodySize * 1.08;
    const upperCase = text.length > 3 && text === text.toUpperCase() && /[A-ZÀ-Ý]{3}/.test(text);
    const isBullet = BULLET_RE.test(text) || NUMBERED_RE.test(text);

    const gap = prev && prev.page === line.page ? prev.y - line.y : lineGap * 2;
    const separated = gap > lineGap * 1.35;
    const previousEndedSentence = prev ? /[.:;!?»]$/.test(prev.text) : true;
    // Ligne précédente qui s'arrête avant la marge droite : fin de paragraphe.
    const previousWasShort = prev ? prev.x + prev.width < rightEdge * 0.85 : true;

    // (Cast : TypeScript ne voit pas les affectations faites dans pushHeading.)
    const openHeading = previousHeading as { tag: 'h2' | 'h3' } | null;
    const headingContinues = Boolean(openHeading) && prev !== null && prev === lastLineOfHeading && gap < line.size * 1.7;

    if (isShort && !isBullet && (SECTION_RE.test(text) || bigger)) {
      pushHeading('h2', text, line, headingContinues && !SECTION_RE.test(text));
      lastLineOfHeading = line;
    } else if (
      !isBullet &&
      (ARTICLE_RE.test(text) || (text.length < 70 && (slightlyBigger || upperCase) && separated) ||
        (headingContinues && openHeading?.tag === 'h3' && slightlyBigger))
    ) {
      pushHeading('h3', text, line, headingContinues && !ARTICLE_RE.test(text));
      lastLineOfHeading = line;
    } else if (isBullet) {
      closeParagraph();
      const tag = BULLET_RE.test(text) ? 'ul' : 'ol';
      if (listItems.length && tag !== listTag) closeList();
      listTag = tag;
      listItemX = line.x;
      listItems.push(text.replace(BULLET_RE, '').replace(NUMBERED_RE, ''));
    } else if (listItems.length && !separated && (line.x > listItemX + 2 || !previousWasShort)) {
      // Suite d'une puce sur la ligne suivante (en retrait, ou puce qui a
      // occupé toute la largeur).
      listItems[listItems.length - 1] = appendText(listItems[listItems.length - 1], text);
    } else if (paragraph && !separated && !(previousEndedSentence && previousWasShort)) {
      paragraph = appendText(paragraph, text);
    } else {
      closeAll();
      paragraph = text;
    }
    if (lastLineOfHeading !== line) previousHeading = null;
    previous = line;
  }
  closeAll();

  return blocks.join('\n');
}
