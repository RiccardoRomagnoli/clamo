import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
// Replaced md-to-pdf and pdfkit with Puppeteer for better PDF generation

import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc'
import { S3_BUCKET_NAME, s3, generatePresignedDownloadUrl } from '~/utils/s3'
import { type Ricorso316Data } from '~/server/documents/ricorso-316'
import { generateRicorso316PDFWithLLM } from '~/server/documents/generate-ricorso-puppeteer'

const partySchema = z.object({
  fullName: z.string(),
  taxCode: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  cap: z.string().optional(),
  pec: z.string().optional(),
})

const ricorsoDataSchema = z.object({
  courtName: z.string(),
  courtAddress: z.string().optional(),
  ricorrente: partySchema,
  resistente: partySchema,
  oggetto: z.string(),
  facts: z.string(),
  legalReasons: z.string().optional(),
  requests: z.string(),
  attachments: z.array(z.string()).optional(),
  placeAndDate: z.string().optional(),
  signatureName: z.string().optional(),
})

export const documentRouter = createTRPCRouter({
  generateRicorso316: protectedProcedure
    .input(z.object({
      caseId: z.string().uuid(),
      taskId: z.string().uuid().optional(),
      data: ricorsoDataSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Ensure the case belongs to the user
      const c = await ctx.db.case.findFirst({
        where: { id: input.caseId, user_id: ctx.user.id },
        select: { id: true, data: true },
      })
      if (!c) throw new TRPCError({ code: 'NOT_FOUND', message: 'Case not found' })

      // Ensure task exists and belongs to the same case (if taskId provided)
      let t: { id: string; metadata: any } | null = null
      if (input.taskId) {
        t = await ctx.db.task.findFirst({
          where: { id: input.taskId, case_id: input.caseId },
          select: { id: true, metadata: true },
        })
        if (!t) throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
      }

      // Derive data from input or from case.data if available
      const caseData = (c.data ?? {}) as Record<string, unknown>
      const partiesRaw = caseData.parties
      const parties = partiesRaw && typeof partiesRaw === 'object' ? partiesRaw as Record<string, unknown> : {}
      
      // Type guard for party data
      const getPartyField = (party: unknown, field: string): string | undefined => {
        if (party && typeof party === 'object' && field in party) {
          const value = (party as Record<string, unknown>)[field]
          return typeof value === 'string' ? value : undefined
        }
        return undefined
      }
      
      const claimant = parties.claimant
      const defendant = parties.defendant

      const ricorsoData: Ricorso316Data = input.data ?? {
        courtName: 'Giudice di Pace competente',
        ricorrente: {
          fullName: getPartyField(claimant, 'fullName') ?? 'Ricorrente',
          address: getPartyField(claimant, 'address'),
          city: getPartyField(claimant, 'city'),
          cap: getPartyField(claimant, 'cap'),
          taxCode: getPartyField(claimant, 'taxCode'),
          pec: getPartyField(claimant, 'pec'),
        },
        resistente: {
          fullName: getPartyField(defendant, 'fullName') ?? 'Resistente',
          address: getPartyField(defendant, 'address'),
          city: getPartyField(defendant, 'city'),
          cap: getPartyField(defendant, 'cap'),
          taxCode: getPartyField(defendant, 'taxCode'),
          pec: getPartyField(defendant, 'pec'),
        },
        oggetto: 'Ricorso ex art. 316 e ss. c.p.c.',
        facts: typeof caseData.summary === 'string' ? caseData.summary : 'Esposizione dei fatti rilevanti.',
        requests: typeof caseData.requestedRelief === 'string' ? caseData.requestedRelief : 'Si chiede accoglimento del ricorso e le spese di lite.',
        attachments: [],
      }

      // Generate PDF using Puppeteer and LLM
      const fileBuffer = await generateRicorso316PDFWithLLM(ricorsoData)
        .catch((err: unknown) => {
          console.error('PDF generation error:', err)
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed generating PDF' })
        })

      if (!fileBuffer || fileBuffer.length === 0) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Empty PDF output' })
      }
      const sizeBytes = fileBuffer.byteLength
      const timestamp = Date.now()
      const fileName = `ricorso-316-${timestamp}.pdf`
      const s3Key = `users/${ctx.user.id}/cases/${input.caseId}/documents/${fileName}`

      // Upload to S3
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: 'application/pdf',
      }))

      // Create CaseDocument record
      const doc = await ctx.db.caseDocument.create({
        data: {
          case_id: input.caseId,
          file_name: fileName,
          content_type: 'application/pdf',
          size_bytes: sizeBytes,
          s3_key: s3Key,
          url: null,
          category: 'ricorso_316',
          metadata: {
            source: 'auto_generated',
            task_id: input.taskId || null,
          },
        },
      })

      // Attach to task (metadata linkage) if taskId provided
      if (input.taskId && t) {
        await ctx.db.task.update({
          where: { id: input.taskId },
          data: {
            metadata: {
              ...(t.metadata ? (t.metadata as Record<string, unknown>) : {}),
              linkedDocumentId: doc.id,
              linkedDocumentType: 'RICORSO_316',
              linkedDocumentS3Key: s3Key,
            },
          },
        })
      }

      return {
        documentId: doc.id,
        s3Key,
        sizeBytes,
        fileName,
      }
    }),

  // Get download URL for a document
  getDownloadUrl: protectedProcedure
    .input(z.object({
      documentId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the document and verify ownership
      const doc = await ctx.db.caseDocument.findFirst({
        where: { 
          id: input.documentId,
          case: {
            user_id: ctx.user.id
          }
        },
      })

      if (!doc) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Document not found or access denied' 
        })
      }

      // Generate presigned download URL
      const downloadUrl = await generatePresignedDownloadUrl(
        doc.s3_key,
        doc.file_name
      )

      return {
        downloadUrl,
        fileName: doc.file_name,
        contentType: doc.content_type,
        sizeBytes: doc.size_bytes,
      }
    }),

  // Get all documents for a case
  getCaseDocuments: protectedProcedure
    .input(z.object({
      caseId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify case ownership
      const caseExists = await ctx.db.case.findFirst({
        where: { 
          id: input.caseId,
          user_id: ctx.user.id
        },
      })

      if (!caseExists) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Case not found or access denied' 
        })
      }

      // Get all documents for the case
      const documents = await ctx.db.caseDocument.findMany({
        where: { case_id: input.caseId },
        orderBy: { created_at: 'desc' },
      })

      return documents
    }),
})


