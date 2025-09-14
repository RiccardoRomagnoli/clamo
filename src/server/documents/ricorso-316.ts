export type Party = {
  fullName: string;
  taxCode?: string;
  address?: string;
  city?: string;
  cap?: string;
  pec?: string;
};

export type Ricorso316Data = {
  courtName: string; // es. "Giudice di Pace di Milano"
  courtAddress?: string;
  ricorrente: Party;
  resistente: Party; // controparte / ente
  oggetto: string; // es. "Ricorso ex art. 316 e ss. c.p.c."
  facts: string; // esposizione in fatto
  legalReasons?: string; // motivi in diritto (opzionale)
  requests: string; // conclusioni
  attachments?: string[]; // elenco documenti
  placeAndDate?: string; // es. "Milano, 10/09/2025"
  signatureName?: string; // nome ricorrente per firma
};

/**
 * Build a Markdown document for "RICORSO EX ART. 316 E SS. C.P.C."
 * keeping content concise and printable.
 */
export function generateRicorso316Markdown(data: Ricorso316Data): string {
  const {
    courtName,
    courtAddress,
    ricorrente,
    resistente,
    oggetto,
    facts,
    legalReasons,
    requests,
    attachments,
    placeAndDate,
    signatureName,
  } = data;

  const ricorrenteBlock = [
    `**Ricorrente**: ${ricorrente.fullName}`,
    ricorrente.taxCode ? `CF: ${ricorrente.taxCode}` : undefined,
    ricorrente.address ? `Indirizzo: ${ricorrente.address}${ricorrente.cap ? `, ${ricorrente.cap}` : ''}${ricorrente.city ? ` ${ricorrente.city}` : ''}` : undefined,
    ricorrente.pec ? `PEC: ${ricorrente.pec}` : undefined,
  ].filter(Boolean).join('\n\n');

  const resistenteBlock = [
    `**Resistente**: ${resistente.fullName}`,
    resistente.taxCode ? `CF/P.IVA: ${resistente.taxCode}` : undefined,
    resistente.address ? `Indirizzo: ${resistente.address}${resistente.cap ? `, ${resistente.cap}` : ''}${resistente.city ? ` ${resistente.city}` : ''}` : undefined,
    resistente.pec ? `PEC: ${resistente.pec}` : undefined,
  ].filter(Boolean).join('\n\n');

  const attachmentsMd = (attachments && attachments.length > 0)
    ? attachments.map((a, i) => `${i + 1}) ${a}`).join('\n')
    : '- Nessun allegato indicato';

  const headerCss = `
  .page-break { page-break-after: always; }
  .markdown-body { font-size: 12px; line-height: 1.4; }
  h1, h2, h3 { text-align: center; }
  `;

  // Front-matter with md-to-pdf options
  const fm = `---
document_title: Ricorso ex art. 316 c.p.c.
pdf_options:
  format: A4
  margin: 20mm 18mm
  printBackground: true
css: |-
  ${headerCss}
---`;

  return `${fm}

# RICORSO EX ART. 316 E SS. C.P.C.

${courtName}${courtAddress ? `\\n${courtAddress}` : ''}

## Parti

${ricorrenteBlock}

${resistenteBlock}

## Oggetto

${oggetto}

## In fatto

${facts}

## In diritto

${legalReasons ?? 'Il ricorrente si riporta ai principi di diritto applicabili, anche ai sensi degli artt. 316 e ss. c.p.c. (rito semplificato), oltre alla normativa speciale pertinente.'}

## Conclusioni

${requests}

## Allegati

${attachmentsMd}

${placeAndDate ? `\n\n${placeAndDate}` : ''}

${signatureName ? `\n\n**Firma**\n\n${signatureName}` : ''}
`;
}


