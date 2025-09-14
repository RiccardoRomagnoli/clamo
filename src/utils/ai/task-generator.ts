import { generateObject, generateText } from 'ai'
import { perplexity } from '@ai-sdk/perplexity'
import { db } from '~/server/db'
import { LISTA_GIUDICI } from '~/utils/giudici-pace'
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'

type CaseType = 'BENI_MOBILI' | 'SANZIONI_AMMINISTRATIVE'

const LEGAL_CONTEXT = `
Difendersi senza avvocato davanti al Giudice di Pace (beni mobili e sanzioni amministrative).

Limiti difesa personale:
- Valore causa ≤ 1.100€ oppure autorizzazione del Giudice.

Controversie su beni mobili (art. 316 c.p.c. – riforma Cartabia):
1) Ricorso ex art. 316 c.p.c. con: Ufficio competente; dati parti (CF e residenza); fatti; richieste; valore causa; domicilio comunicazioni.
2) Notifica del ricorso: UNEP/messo; termini: almeno 40 giorni liberi prima udienza (60 se estero).
3) Iscrizione a ruolo: originale notificato; copia; Nota di Iscrizione a Ruolo; fascicolo con prove; ricevuta contributo unificato; eventuale marca da bollo.
Competenza: luogo di residenza del convenuto o luogo in cui è sorta l'obbligazione.

Opposizioni a sanzioni amministrative (L. 689/1981; D.Lgs. 150/2011):
1) Verifica termini: 30 giorni dalla notifica per ricorso al GdP (alternativo al Prefetto, 60 giorni).
2) Ricorso: dati ricorrente; estremi verbale/ordinanza; motivi specifici; richieste; domicilio comunicazioni nel comune del GdP.
3) Deposito: originale firmato; 3 copie ricorso; originale verbale + copie; copie allegati; documento identità; ricevuta contributo unificato.
Competenza: luogo della violazione.

Costi indicativi e modalità di pagamento:
- Contributo unificato: 43€ (≤ 1.033€) – importi superiori secondo scaglioni.
  * Pagamento online: https://pst.giustizia.it/PST/
  * Bonifico: IBAN IT45R0100003245348008120501 (Banca d'Italia - Sezione di Tesoreria Provinciale dello Stato)
  * Causale: "Contributo unificato - [numero causa se disponibile]"
- Marca da bollo: 27€ (se > 1.033€) - acquistabile presso tabaccherie o online su https://www.agenziaentrate.gov.it/
- Notifica UNEP/messi: ~30-100€
  * UNEP online: https://unep.giustizia.it/
  * Messi notificatori: contattare l'albo del tribunale competente
- Diritti di cancelleria: 8€ per ricorsi > 1.033€ (ove previsti).

Consigli pratici: verifica competenza; conserva originali; ricevute pagamenti; rispetta termini; prepara riassunto fatti e allegati.
`

type CourtInfo = {
  name: string
  address?: string
  phone?: string
  email?: string
  rawBlock: string
}

function parseCourts(md: string): CourtInfo[] {
  const blocks = md.split('\n---\n')
  const items: CourtInfo[] = []
  for (const block of blocks) {
    const lines = block.split('\n')
    const titleLine = lines.find(l => l.startsWith('## '))
    if (!titleLine) continue
    const name = titleLine.replace(/^##\s+/, '').trim()
    const address = lines.find(l => l.startsWith('**📍 Indirizzo:**'))?.replace('**📍 Indirizzo:**', '').trim()
    const phone = lines.find(l => l.startsWith('**📞 Telefono:**'))?.replace('**📞 Telefono:**', '').trim()
    const email = lines.find(l => l.startsWith('**📧 Email:**'))?.replace('**📧 Email:**', '').trim()
    items.push({ name, address, phone, email, rawBlock: block })
  }
  return items
}

const COURTS = parseCourts(LISTA_GIUDICI)

function normalize(str: string) {
  return (str || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Z\s]/g, '')
    .trim()
}

export function findCourtByCity(city: string | null | undefined): CourtInfo | null {
  if (!city) return null
  const n = normalize(city)
  let best: CourtInfo | null = null
  let bestScore = 0
  for (const c of COURTS) {
    const nameN = normalize(c.name)
    if (nameN.includes(n)) {
      const score = n.length / nameN.length
      if (score > bestScore) {
        best = c
        bestScore = score
      }
    }
  }
  return best
}

async function llmFindNearestCourt(hint: string): Promise<CourtInfo | null> {
  try {
    if (!process.env.PERPLEXITY_API_KEY) return null
    const { object: text } = await generateObject({
      model: perplexity('sonar-deep-research'),
      schema: z.object({
        name: z.string(),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
      }),
      messages: [
        {
          role: 'system',
          content: 'Dato l\'elenco completo dei Giudici di Pace in Italia (markdown), restituisci SOLO un JSON con le chiavi: name, address, phone, email per l\'ufficio più pertinente/ vicino alla località indicata. Non aggiungere altro testo.'
        },
        {
          role: 'user',
          content: [
            'ELENCO UFFICI:',
            LISTA_GIUDICI,
            '',
            `Località utente: ${hint}`,
            '',
            'Restituisci un singolo JSON con le chiavi richieste.'
          ].join('\n')
        }
      ],
      temperature: 0.1,
    })
    if (!text || !text.name) return null

    const exact = COURTS.find(c => c.name.toLowerCase() === String(text.name).toLowerCase())
    if (exact) return exact
    const fuzzy = COURTS.find(c => c.name.toLowerCase().includes(String(text.name).toLowerCase()))
    if (fuzzy) return fuzzy

    return {
      name: text.name,
      address: text.address,
      phone: text.phone,
      email: text.email,
      rawBlock: text.name,
    }
  } catch (e) {
    console.warn('llmFindNearestCourt failed', e)
    return null
  }
}

type CaseData = {
  requestedRelief?: string | null
  disputeValue?: number | null
  notificationDate?: string | null
  parties?: {
    claimant?: Record<string, unknown>
    defendant?: Record<string, unknown>
  }
  violationLocation?: {
    city?: string
  }
}

function cityFromParties(parties?: CaseData['parties']): string | null {
  const defCity = (parties?.defendant as any)?.city || (parties?.defendant as any)?.residenza || (parties?.defendant as any)?.comune
  if (typeof defCity === 'string' && defCity) return defCity
  const claCity = (parties?.claimant as any)?.city || (parties?.claimant as any)?.residenza || (parties?.claimant as any)?.comune
  return typeof claCity === 'string' && claCity ? claCity : null
}

function selectCompetentCourt(caseType: CaseType, data: CaseData): CourtInfo | null {
  if (caseType === 'SANZIONI_AMMINISTRATIVE') {
    const city = data.violationLocation?.city || null
    return findCourtByCity(city)
  }
  const city = cityFromParties(data.parties)
  return findCourtByCity(city)
}

function baseCaseTasks(caseType: CaseType, court: CourtInfo | null, data: CaseData) {
  const courtLine = court ? `${court.name}${court.address ? `, ${court.address}` : ''}` : 'Giudice di Pace competente (da confermare)'
  const courtPhone = court?.phone ? ` (Tel: ${court.phone})` : ''
  const courtEmail = court?.email ? ` (Email: ${court.email})` : ''
  
  if (caseType === 'SANZIONI_AMMINISTRATIVE') {
    return [
      {
        title: 'Verifica termini di opposizione (30 giorni)',
        description: 'Calcola il termine di 30 giorni dalla notifica del verbale/ordinanza. Se oltre il termine, valuta altre opzioni. Conserva busta e ricevute di notifica.',
        order: 0,
        metadata: { 
          checklist: ['Individua data notifica', 'Conserva busta/ricevute', 'Annota scadenza 30 giorni'],
          costs: {},
          detailed_instructions: [
            '1. Cerca la data di notifica sulla busta o ricevuta di ritorno',
            '2. Calcola 30 giorni dalla data di notifica (non contare i giorni festivi)',
            '3. Annota la scadenza su un calendario',
            '4. Se sei oltre il termine, consulta un avvocato per valutare alternative'
          ]
        },
      },
      {
        title: 'Redigere il ricorso con motivi specifici',
        description: `Redigi ricorso con dati anagrafici completi, estremi del verbale, motivi specifici e richieste. Indica domicilio per comunicazioni nel Comune del ${courtLine}.`,
        order: 1,
        metadata: { 
          checklist: ['Dati ricorrente', 'Estremi verbale', 'Motivi specifici', 'Richiesta annullamento', 'Domicilio comunicazioni'],
          costs: {},
          court_info: {
            name: court?.name,
            address: court?.address,
            phone: court?.phone,
            email: court?.email
          },
          detailed_instructions: [
            '1. Intestazione: "Al Giudice di Pace di [città]"',
            '2. Dati ricorrente: Nome, Cognome, CF, indirizzo completo',
            '3. Contro: Ente che ha emesso la multa',
            '4. Oggetto: Opposizione a verbale n. [numero] del [data]',
            '5. Motivi: Specifica perché contesti la multa (vizio procedurale, errore di fatto, ecc.)',
            '6. Richieste: "Si chiede l\'annullamento del verbale"',
            '7. Domicilio: Indirizzo nel comune del tribunale per ricevere comunicazioni'
          ]
        },
      },
      {
        title: 'Preparare gli allegati e le copie',
        description: 'Prepara: originale del verbale, documento identità, prove (foto/testimonianze), 3 copie del ricorso e degli allegati, indice fascicolo.',
        order: 2,
        metadata: { 
          checklist: ['Originale verbale', 'Documento identità', 'Prove a sostegno', '3 copie ricorso e allegati', 'Indice fascicolo'],
          costs: {},
          detailed_instructions: [
            '1. Raccogli l\'originale del verbale di accertamento',
            '2. Fotocopia del documento d\'identità',
            '3. Eventuali prove: foto del luogo, testimonianze scritte, ricevute',
            '4. Fai 3 copie complete del ricorso',
            '5. Fai 3 copie di tutti gli allegati',
            '6. Prepara un indice del fascicolo numerando le pagine'
          ]
        },
      },
      {
        title: 'Pagamento contributo unificato',
        description: 'Paga il contributo unificato in base al valore (es. 43€ ≤ 1.033€). Conserva la ricevuta per il deposito.',
        order: 3,
        metadata: { 
          checklist: ['Verifica scaglione', 'Esegui pagamento', 'Conserva ricevuta'],
          costs: { contributo_unificato: '≥43€' },
          payment_info: {
            online_url: 'https://pst.giustizia.it/PST/',
            iban: 'IT45R0100003245348008120501',
            beneficiary: 'Banca d\'Italia - Sezione di Tesoreria Provinciale dello Stato',
            causale: 'Contributo unificato - opposizione sanzione amministrativa'
          },
          detailed_instructions: [
            '1. Vai su https://pst.giustizia.it/PST/ per pagamento online',
            '2. Oppure fai bonifico su IBAN: IT45R0100003245348008120501',
            '3. Causale: "Contributo unificato - opposizione sanzione amministrativa"',
            '4. Importo: 43€ se la multa è ≤ 1.033€',
            '5. Conserva la ricevuta di pagamento (necessaria per il deposito)'
          ]
        },
      },
      {
        title: 'Deposito in Cancelleria',
        description: `Deposita presso la Cancelleria del ${courtLine}${courtPhone}${courtEmail}: originale firmato, copie, allegati, contributo unificato, Nota di Iscrizione a Ruolo.`,
        order: 4,
        metadata: { 
          checklist: ['Originale firmato', '3 copie', 'Allegati', 'Ricevuta CU', 'Nota Iscrizione a Ruolo'],
          location: courtLine,
          court_info: {
            name: court?.name,
            address: court?.address,
            phone: court?.phone,
            email: court?.email
          },
          detailed_instructions: [
            `1. Vai presso ${courtLine}${courtPhone}`,
            '2. Porta: ricorso originale firmato, 3 copie, allegati, ricevuta contributo unificato',
            '3. Compila la Nota di Iscrizione a Ruolo (modulo disponibile in cancelleria)',
            '4. Consegna tutto al cancelliere',
            '5. Richiedi ricevuta di deposito con numero di ruolo'
          ]
        },
      },
      {
        title: `Notifica all'ente del ricorso e della data`,
        description: `Dopo fissazione udienza, notifica ricorso e decreto all'ente accertatore tramite UNEP. Conserva prova di notifica.`,
        order: 5,
        metadata: { 
          checklist: ['Ritirare decreto', 'Richiedere notifica UNEP', 'Conservare relata'],
          costs: { notifica: '30-100€' },
          notification_info: {
            unep_url: 'https://unep.giustizia.it/',
            alternative: 'Messi notificatori dell\'albo del tribunale'
          },
          detailed_instructions: [
            '1. Attendi che il tribunale fissi l\'udienza e rilasci il decreto',
            '2. Ritira il decreto dalla cancelleria',
            '3. Vai su https://unep.giustizia.it/ per richiedere la notifica online',
            '4. Allega: ricorso, decreto di fissazione udienza',
            '5. Paga le spese di notifica (circa 30-100€)',
            '6. Conserva la relata di notifica come prova'
          ]
        },
      },
    ]
  }
  
  return [
    {
      title: 'Redigere il ricorso ex art. 316 c.p.c.',
      description: `Prepara ricorso con Ufficio competente (${courtLine}), dati parti (CF/residenza), esposizione fatti, richieste, valore causa, domicilio comunicazioni.`,
      order: 0,
      metadata: { 
        checklist: ['Ufficio competente', 'Dati parti con CF', 'Fatti dettagliati', 'Richieste', 'Valore causa', 'Domicilio comunicazioni'],
        court_info: {
          name: court?.name,
          address: court?.address,
          phone: court?.phone,
          email: court?.email
        },
        detailed_instructions: [
          '1. Intestazione: "Al Giudice di Pace di [città]"',
          '2. Ricorrente: i tuoi dati completi (nome, CF, indirizzo)',
          '3. Convenuto: dati della controparte (nome/ragione sociale, CF/P.IVA, indirizzo)',
          '4. Esposizione dei fatti: cronologia dettagliata della controversia',
          '5. Richieste: cosa vuoi ottenere (risarcimento, restituzione, ecc.)',
          '6. Valore della causa in euro',
          '7. Domicilio per comunicazioni nel comune del tribunale'
        ]
      },
    },
    {
      title: 'Notifica del ricorso alla controparte',
      description: 'Richiedi notifica tramite UNEP/messo. Rispetta il termine: almeno 40 giorni liberi prima dell\'udienza (60 se all\'estero).',
      order: 1,
      metadata: { 
        checklist: ['UNEP/messo notificatore', 'Termini 40/60 giorni', 'Conserva relata'],
        costs: { notifica: '30-100€' },
        notification_info: {
          unep_url: 'https://unep.giustizia.it/',
          alternative: 'Messi notificatori dell\'albo del tribunale'
        },
        detailed_instructions: [
          '1. Vai su https://unep.giustizia.it/ per notifica online',
          '2. Oppure contatta un messo dell\'albo del tribunale',
          '3. Fornisci: ricorso + dati completi del convenuto',
          '4. Verifica che ci siano almeno 40 giorni liberi prima dell\'udienza',
          '5. Se il convenuto è all\'estero: servono 60 giorni liberi',
          '6. Conserva la relata di notifica (prova dell\'avvenuta notifica)'
        ]
      },
    },
    {
      title: 'Iscrizione a ruolo presso Cancelleria',
      description: `Deposita al ${courtLine}${courtPhone}${courtEmail}: originale notificato, copia, Nota di Iscrizione a Ruolo, fascicolo di parte (prove indicizzate), ricevuta contributo unificato.`,
      order: 2,
      metadata: { 
        checklist: ['Originale notificato', 'Copia ricorso', 'N.I.R.', 'Indice fascicolo', 'Ricevuta CU'],
        costs: { contributo_unificato: '≥43€', marca_da_bollo: '27€ se >1.033€' },
        court_info: {
          name: court?.name,
          address: court?.address,
          phone: court?.phone,
          email: court?.email
        },
        payment_info: {
          online_url: 'https://pst.giustizia.it/PST/',
          iban: 'IT45R0100003245348008120501',
          beneficiary: 'Banca d\'Italia - Sezione di Tesoreria Provinciale dello Stato',
          causale: 'Contributo unificato - ricorso art. 316 c.p.c.'
        },
        detailed_instructions: [
          `1. Vai presso ${courtLine}${courtPhone}`,
          '2. Porta: ricorso originale con relata di notifica, copia, fascicolo con prove',
          '3. Paga contributo unificato (43€ se ≤1.033€) su https://pst.giustizia.it/PST/',
          '4. Se causa >1.033€: acquista marca da bollo da 27€',
          '5. Compila Nota di Iscrizione a Ruolo',
          '6. Consegna tutto e richiedi numero di ruolo'
        ]
      },
    },
    {
      title: 'Preparazione per l\'udienza',
      description: 'Prepara un breve riassunto dei fatti, organizza originali e copie, pianifica eventuali testimoni. Presentati puntualmente.',
      order: 3,
      metadata: { 
        checklist: ['Riassunto', 'Originali+copie', 'Testimoni', 'Appuntamento udienza'],
        detailed_instructions: [
          '1. Prepara un riassunto di 1-2 pagine dei fatti principali',
          '2. Organizza tutti i documenti: originali + copie per il giudice',
          '3. Se hai testimoni: avvisali della data e dell\'orario',
          '4. Arriva 15 minuti prima dell\'orario fissato',
          '5. Porta documento d\'identità e codice fiscale',
          '6. Vesti in modo formale e rispettoso'
        ]
      },
    },
  ]
}

const GeneratedTasksSchema = z.object({
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().default(0),
    checklist: z.array(z.string()).optional(),
    detailed_instructions: z.array(z.string()).optional(),
    due_by: z.string().nullable().optional(),
    payment_info: z.object({
      online_url: z.string().optional(),
      iban: z.string().optional(),
      beneficiary: z.string().optional(),
      causale: z.string().optional(),
    }).optional(),
    court_info: z.object({
      name: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    }).optional(),
    notification_info: z.object({
      unep_url: z.string().optional(),
      alternative: z.string().optional(),
    }).optional(),
  })).min(3).max(8),
})

// Utility function to convert text to structured object using GPT-4o
async function textToObject<T>(text: string, schema: z.ZodSchema<T>, context: string): Promise<T> {
  const { object } = await generateObject({
    model: openai('gpt-4.1'),
    schema,
    messages: [
      {
        role: 'system',
        content: 'Convert the text to a structured format based on the schema.',
      },
      {
        role: 'user',
        content: `Context: ${context}\n\nText: ${text}`,
      },
    ],
  })
  return object
}

function buildCasePrompt(params: {
  caseType: CaseType
  summary?: string | null
  court?: CourtInfo | null
  requestedRelief?: string | null
  disputeValue?: number | null
  parties?: any
  notificationDate?: string | null
}) {
  const parts: string[] = []
  
  // Case type specific context
  if (params.caseType === 'SANZIONI_AMMINISTRATIVE') {
    parts.push('CASO: OPPOSIZIONE A SANZIONE AMMINISTRATIVA')
    parts.push('PROCEDURA: Ricorso al Giudice di Pace entro 30 giorni dalla notifica')
    parts.push('DOCUMENTI ESSENZIALI: Verbale originale, prova notifica, ricevute pagamento contributo')
    if (params.notificationDate) {
      const notifDate = new Date(params.notificationDate)
      const deadline = new Date(notifDate)
      deadline.setDate(deadline.getDate() + 30)
      parts.push(`SCADENZA CRITICA: ${deadline.toLocaleDateString('it-IT')} (30 giorni dalla notifica del ${notifDate.toLocaleDateString('it-IT')})`)
    }
  } else {
    parts.push('CASO: CONTROVERSIA SU BENI MOBILI')
    parts.push('PROCEDURA: Ricorso ex art. 316 c.p.c. al Giudice di Pace')
    parts.push('LIMITE AUTODIFESA: €1.100 (verifica che il valore non superi questo limite)')
    parts.push('DOCUMENTI ESSENZIALI: Contratti, fatture, ricevute, diffida preventiva')
  }
  
  parts.push('\nDATI DEL CASO:')
  parts.push('================')
  
  if (params.court) {
    parts.push(`TRIBUNALE COMPETENTE: ${params.court.name}`)
    if (params.court.address) parts.push(`INDIRIZZO: ${params.court.address}`)
  } else {
    parts.push('TRIBUNALE: Giudice di Pace (da confermare territorio competente)')
  }
  
  if (params.disputeValue != null) {
    parts.push(`VALORE CONTROVERSIA: €${params.disputeValue}`)
    if (params.disputeValue > 1100) {
      parts.push('⚠️ ATTENZIONE: Valore superiore a €1.100 - serve avvocato')
    }
  }
  
  if (params.parties?.claimant) {
    parts.push(`\nRICORRENTE:`)
    parts.push(`- Nome: ${params.parties.claimant.fullName || 'Da completare'}`)
    if (params.parties.claimant.taxCode) parts.push(`- CF: ${params.parties.claimant.taxCode}`)
    if (params.parties.claimant.address) parts.push(`- Indirizzo: ${params.parties.claimant.address}`)
    if (params.parties.claimant.city) parts.push(`- Città: ${params.parties.claimant.city} ${params.parties.claimant.cap || ''}`)
  }
  
  if (params.parties?.defendant) {
    parts.push(`\nRESISTENTE/CONVENUTO:`)
    parts.push(`- Nome/Ragione sociale: ${params.parties.defendant.fullName || 'Da completare'}`)
    if (params.parties.defendant.taxCode) parts.push(`- CF/P.IVA: ${params.parties.defendant.taxCode}`)
    if (params.parties.defendant.address) parts.push(`- Indirizzo: ${params.parties.defendant.address}`)
    if (params.parties.defendant.city) parts.push(`- Città: ${params.parties.defendant.city} ${params.parties.defendant.cap || ''}`)
  }
  
  if (params.summary) {
    parts.push(`\nFATTI:`)
    parts.push(params.summary)
  }
  
  if (params.requestedRelief) {
    parts.push(`\nRICHIESTE:`)
    parts.push(params.requestedRelief)
  }
  
  parts.push('\nLINEE GUIDA PROCEDURALI:')
  parts.push('========================')
  parts.push(LEGAL_CONTEXT)
  
  parts.push('\nREQUISITI PER LE ATTIVITÀ:')
  parts.push('- Ogni attività deve specificare ESATTAMENTE dove andare e cosa fare')
  parts.push('- Indicare TUTTI i documenti necessari e il numero di copie')
  parts.push('- Specificare TUTTI i costi (contributo unificato, marche da bollo, notifiche)')
  parts.push('- Includere SEMPRE i termini temporali (es. "entro 10 giorni da...")')
  parts.push('- Usare linguaggio SEMPLICE e DIRETTO ("tu", "vai", "porta")')
  
  return parts.join('\n')
}

async function generateCaseTasksAI(params: {
  caseType: CaseType
  summary?: string | null
  court?: CourtInfo | null
  requestedRelief?: string | null
  disputeValue?: number | null
  parties?: any
  notificationDate?: string | null
}): Promise<z.infer<typeof GeneratedTasksSchema>> {
  const prompt = buildCasePrompt(params)
  
  try {
    // Step 1: Generate text with detailed task descriptions
    const systemPrompt = `Sei un assistente legale esperto nel Giudice di Pace italiano.
Genera 5-7 attività procedurali DETTAGLIATE e PRATICHE per una persona che si difende da sola.
Ogni attività deve includere:
- Un titolo breve e chiaro
- Una descrizione dettagliata con istruzioni passo-passo
- Una checklist di azioni specifiche da completare
- Date limite se rilevanti (formato: "entro X giorni da Y")

Usa linguaggio semplice, evita tecnicismi. Parla direttamente all'utente usando "tu".
Per ogni attività, specifica ESATTAMENTE:
- Dove andare (indirizzo/ufficio)
- Cosa portare (documenti, copie, pagamenti)
- Quanto costa (contributi, marche da bollo)
- Quali moduli compilare`

    const { text } = await generateText({
      model: perplexity('sonar-deep-research'),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Genera attività legali per questo caso:\n\n${prompt}`,
        },
      ],
      temperature: 0.7,
    })

    // Step 2: Convert text response to structured object
    const structuredTasks = await textToObject(
      text,
      GeneratedTasksSchema,
      'Converti le attività legali suggerite in formato strutturato JSON con array "tasks"'
    )

    return structuredTasks
  } catch (error) {
    console.error('AI generation failed, using fallback tasks:', error)
    // Fallback to base tasks
    const baseTasks = baseCaseTasks(params.caseType, params.court, {
      requestedRelief: params.requestedRelief,
      disputeValue: params.disputeValue,
      notificationDate: params.notificationDate,
      parties: params.parties || {},
      violationLocation: {},
    })
    
    return {
      tasks: baseTasks.map((t, index) => ({
        title: t.title,
        description: t.description,
        order: (t as any).order ?? index,
        checklist: (t.metadata as any)?.checklist || [],
        detailed_instructions: (t.metadata as any)?.detailed_instructions || [],
        due_by: null,
        payment_info: (t.metadata as any)?.payment_info,
        court_info: (t.metadata as any)?.court_info,
        notification_info: (t.metadata as any)?.notification_info,
      }))
    }
  }
}

export async function createInitialTasksForCase(
  caseId: string,
  numTasks = 5
): Promise<void> {
  const c = await db.case.findUnique({ where: { id: caseId } })
  if (!c) throw new Error(`Case not found: ${caseId}`)

  // Step 1: Create placeholder tasks with "generating" status immediately
  const placeholderTaskIds: string[] = []
  try {
    for (let i = 0; i < numTasks; i++) {
      const task = await db.task.create({
        data: {
          case_id: caseId,
          title: `Generating task ${i + 1}...`,
          description: 'Please wait while we generate personalized tasks for your case.',
          status: 'generating',
          metadata: {},
        },
      })
      placeholderTaskIds.push(task.id)
    }
  } catch (error) {
    console.error('Failed to create placeholder tasks:', error)
    throw error
  }

  // Step 2: Generate the actual tasks content
  try {
    const data = (c.data || {}) as any as {
      requestedRelief?: string | null
      disputeValue?: number | null
      notificationDate?: string | null
      parties?: {
        claimant?: Record<string, unknown>
        defendant?: Record<string, unknown>
      }
      violationLocation?: { city?: string }
    }

    // Hint for LLM selection
    const hint = (c.type === 'SANZIONI_AMMINISTRATIVE')
      ? (data.violationLocation?.city || '')
      : (cityFromParties(data.parties) || '')

    let court: CourtInfo | null = null
    if (hint) {
      court = await llmFindNearestCourt(hint)
    }
    if (!court) {
      court = selectCompetentCourt(c.type as CaseType, data)
    }

    const generated = await generateCaseTasksAI({
      caseType: c.type as CaseType,
      summary: c.summary,
      court,
      requestedRelief: data.requestedRelief ?? null,
      disputeValue: data.disputeValue ?? null,
      parties: data.parties,
      notificationDate: data.notificationDate ?? null,
    })

    const tasks = generated.tasks.slice(0, numTasks)

    // Step 3: Update placeholder tasks with generated content
    await db.$transaction(
      tasks.map((t, index) => {
        const taskStatus = (t.order ?? index) === 0 ? 'active' : 'pending'
        const metadata = {
          checklist: t.checklist ?? [],
          detailed_instructions: t.detailed_instructions ?? [],
          due_by: t.due_by ?? null,
          payment_info: t.payment_info,
          court_info: t.court_info,
          notification_info: t.notification_info,
          court: court ? { name: court.name, address: court.address } : undefined,
        }
        
        if (index < placeholderTaskIds.length) {
          return db.task.update({
            where: { id: placeholderTaskIds[index] },
            data: {
              title: t.title,
              description: t.description,
              status: taskStatus,
              order_index: t.order ?? index,
              metadata,
            },
          })
        }
        // If we have more generated tasks than placeholders (shouldn't happen)
        return db.task.create({
          data: {
            case_id: caseId,
            title: t.title,
            description: t.description,
            status: taskStatus,
            order_index: t.order ?? index,
            metadata,
          },
        })
      })
    )

    // Delete any extra placeholder tasks if we generated fewer than expected
    if (tasks.length < placeholderTaskIds.length) {
      const tasksToDelete = placeholderTaskIds.slice(tasks.length)
      await db.task.deleteMany({
        where: { id: { in: tasksToDelete } }
      })
    }
  } catch (error) {
    console.error('Failed to generate tasks, marking as error:', error)
    // Mark all placeholder tasks as error if generation fails
    await db.$transaction(
      placeholderTaskIds.map(id => 
        db.task.update({
          where: { id },
          data: {
            title: 'Task generation failed',
            description: 'There was an error generating tasks. Please try again or contact support.',
            status: 'error',
            metadata: { error: String(error) },
          },
        })
      )
    )
    throw error
  }
}


