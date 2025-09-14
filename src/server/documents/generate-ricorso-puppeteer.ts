import puppeteer from 'puppeteer'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { Ricorso316Data } from './ricorso-316'

/**
 * Generate a PDF document for "RICORSO EX ART. 316 E SS. C.P.C." using Puppeteer and LLM
 * Returns a Buffer containing the PDF data
 */
export async function generateRicorso316PDFWithLLM(data: Ricorso316Data): Promise<Buffer> {
  // First, generate the content using LLM (o3-pro/GPT-4)
  const llmContent = await generateRicorsoContentWithLLM(data)
  
  // Then convert to PDF using Puppeteer
  return await generatePDFFromHTML(llmContent)
}

/**
 * Generate ricorso content using LLM
 */
async function generateRicorsoContentWithLLM(data: Ricorso316Data): Promise<string> {
  const prompt = `Genera un ricorso legale professionale ex art. 316 e ss. c.p.c. con i seguenti dati:

TRIBUNALE: ${data.courtName}
${data.courtAddress ? `INDIRIZZO: ${data.courtAddress}` : ''}

RICORRENTE:
- Nome: ${data.ricorrente.fullName}
${data.ricorrente.taxCode ? `- Codice Fiscale: ${data.ricorrente.taxCode}` : ''}
${data.ricorrente.address ? `- Indirizzo: ${data.ricorrente.address}${data.ricorrente.cap ? `, ${data.ricorrente.cap}` : ''}${data.ricorrente.city ? ` ${data.ricorrente.city}` : ''}` : ''}
${data.ricorrente.pec ? `- PEC: ${data.ricorrente.pec}` : ''}

RESISTENTE:
- Nome/Ragione sociale: ${data.resistente.fullName}
${data.resistente.taxCode ? `- CF/P.IVA: ${data.resistente.taxCode}` : ''}
${data.resistente.address ? `- Indirizzo: ${data.resistente.address}${data.resistente.cap ? `, ${data.resistente.cap}` : ''}${data.resistente.city ? ` ${data.resistente.city}` : ''}` : ''}
${data.resistente.pec ? `- PEC: ${data.resistente.pec}` : ''}

OGGETTO: ${data.oggetto}

FATTI: ${data.facts}

${data.legalReasons ? `RAGIONI LEGALI: ${data.legalReasons}` : ''}

RICHIESTE: ${data.requests}

${data.attachments && data.attachments.length > 0 ? `ALLEGATI:\n${data.attachments.map((a, i) => `${i + 1}) ${a}`).join('\n')}` : ''}

Genera un documento legale formale e professionale in HTML, strutturato con:
1. Intestazione del tribunale centrata
2. Sezioni chiaramente definite (PARTI, OGGETTO, IN FATTO, IN DIRITTO, CONCLUSIONI, ALLEGATI)
3. Formattazione appropriata per un documento legale
4. Linguaggio tecnico-legale appropriato
5. Struttura conforme alla prassi italiana

Rispondi SOLO con il contenuto HTML del documento, senza tag <html>, <head> o <body>.`

  try {
    const { text } = await generateText({
      model: openai('o3'),
      messages: [
        {
          role: 'system',
          content: 'Sei un avvocato esperto in diritto processuale civile italiano. Genera documenti legali professionali e tecnicamente accurati.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    })

    return text
  } catch (error) {
    console.error('LLM generation failed, using fallback:', error)
    // Fallback to basic template if LLM fails
    return generateFallbackRicorsoHTML(data)
  }
}

/**
 * Convert HTML content to PDF using Puppeteer
 */
async function generatePDFFromHTML(htmlContent: string): Promise<Buffer> {
  let browser
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    })
    
    const page = await browser.newPage()
    
    // Create complete HTML document with professional styling
    const completeHTML = `
      <!DOCTYPE html>
      <html lang="it">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ricorso ex art. 316 c.p.c.</title>
          <style>
            @page {
              margin: 2cm;
              size: A4;
            }
            
            body {
              font-family: 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.5;
              color: #000;
              margin: 0;
              padding: 0;
              background: white;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            
            .tribunal-name {
              font-size: 14pt;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 10px;
            }
            
            .tribunal-address {
              font-size: 11pt;
              margin-bottom: 20px;
            }
            
            .section-title {
              font-size: 13pt;
              font-weight: bold;
              text-transform: uppercase;
              margin: 25px 0 15px 0;
              text-decoration: underline;
            }
            
            .party-info {
              margin-bottom: 20px;
            }
            
            .party-name {
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .party-details {
              margin-left: 20px;
              margin-bottom: 3px;
            }
            
            .content-paragraph {
              text-align: justify;
              margin-bottom: 15px;
            }
            
            .signature-section {
              margin-top: 40px;
              text-align: right;
            }
            
            .signature-line {
              margin-top: 20px;
              border-bottom: 1px solid #000;
              width: 200px;
              margin-left: auto;
            }
            
            .attachments-list {
              margin-left: 20px;
            }
            
            .attachments-list li {
              margin-bottom: 5px;
            }
            
            h1, h2, h3 {
              page-break-after: avoid;
            }
            
            .no-break {
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `
    
    await page.setContent(completeHTML, {
      waitUntil: 'networkidle0'
    })
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '2cm',
        bottom: '2cm',
        left: '2cm',
        right: '2cm'
      },
      preferCSSPageSize: true
    })
    
    return Buffer.from(pdf)
  } catch (error) {
    console.error('Puppeteer PDF generation failed:', error)
    throw new Error('Failed to generate PDF with Puppeteer')
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Fallback HTML template if LLM generation fails
 */
function generateFallbackRicorsoHTML(data: Ricorso316Data): string {
  return `
    <div class="header">
      <div class="tribunal-name">${data.courtName}</div>
      ${data.courtAddress ? `<div class="tribunal-address">${data.courtAddress}</div>` : ''}
    </div>

    <div class="section-title">RICORSO EX ART. 316 E SS. C.P.C.</div>

    <div class="section-title">PARTI</div>
    
    <div class="party-info">
      <div class="party-name">RICORRENTE: ${data.ricorrente.fullName}</div>
      ${data.ricorrente.taxCode ? `<div class="party-details">Codice Fiscale: ${data.ricorrente.taxCode}</div>` : ''}
      ${data.ricorrente.address ? `<div class="party-details">Indirizzo: ${data.ricorrente.address}${data.ricorrente.cap ? `, ${data.ricorrente.cap}` : ''}${data.ricorrente.city ? ` ${data.ricorrente.city}` : ''}</div>` : ''}
      ${data.ricorrente.pec ? `<div class="party-details">PEC: ${data.ricorrente.pec}</div>` : ''}
    </div>

    <div class="party-info">
      <div class="party-name">RESISTENTE: ${data.resistente.fullName}</div>
      ${data.resistente.taxCode ? `<div class="party-details">Codice Fiscale/P.IVA: ${data.resistente.taxCode}</div>` : ''}
      ${data.resistente.address ? `<div class="party-details">Indirizzo: ${data.resistente.address}${data.resistente.cap ? `, ${data.resistente.cap}` : ''}${data.resistente.city ? ` ${data.resistente.city}` : ''}</div>` : ''}
      ${data.resistente.pec ? `<div class="party-details">PEC: ${data.resistente.pec}</div>` : ''}
    </div>

    <div class="section-title">OGGETTO</div>
    <div class="content-paragraph">${data.oggetto}</div>

    <div class="section-title">IN FATTO</div>
    <div class="content-paragraph">${data.facts}</div>

    <div class="section-title">IN DIRITTO</div>
    <div class="content-paragraph">
      ${data.legalReasons || 'Il ricorrente si riporta ai principi di diritto applicabili, anche ai sensi degli artt. 316 e ss. c.p.c. (rito semplificato), oltre alla normativa speciale pertinente.'}
    </div>

    <div class="section-title">CONCLUSIONI</div>
    <div class="content-paragraph">${data.requests}</div>

    <div class="section-title">ALLEGATI</div>
    ${data.attachments && data.attachments.length > 0 
      ? `<ul class="attachments-list">${data.attachments.map((a, i) => `<li>${i + 1}) ${a}</li>`).join('')}</ul>`
      : '<div class="content-paragraph">- Nessun allegato indicato</div>'
    }

    ${data.placeAndDate || data.signatureName ? `
      <div class="signature-section">
        ${data.placeAndDate ? `<div>${data.placeAndDate}</div>` : ''}
        ${data.signatureName ? `
          <div style="margin-top: 30px;">
            <div>Firma</div>
            <div class="signature-line"></div>
            <div style="margin-top: 5px; font-weight: bold;">${data.signatureName}</div>
          </div>
        ` : ''}
      </div>
    ` : ''}
  `
}
