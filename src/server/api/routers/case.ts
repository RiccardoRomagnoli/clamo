import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc'
import { generatePresignedUploadUrl } from '~/utils/s3'
import { createInitialTasksForCase } from '~/utils/ai/task-generator'

export const caseRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.case.findMany({
      where: { user_id: ctx.user.id },
      include: {
        tasks: true,
        documents: true,
      },
      orderBy: { created_at: 'desc' },
    })
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.case.findFirst({
        where: { id: input.id, user_id: ctx.user.id },
        include: { tasks: true, documents: true },
      })
      if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Case not found' })
      return item
    }),

  createUploadUrl: protectedProcedure
    .input(z.object({
      caseId: z.string().uuid().optional(),
      fileName: z.string(),
      contentType: z.string(),
      category: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // If caseId provided, ensure ownership
      if (input.caseId) {
        const c = await ctx.db.case.findFirst({ where: { id: input.caseId, user_id: ctx.user.id } })
        if (!c) throw new TRPCError({ code: 'NOT_FOUND', message: 'Case not found' })
      }

      const s3Key = `users/${ctx.user.id}/cases/${input.caseId ?? 'unassigned'}/${Date.now()}_${input.fileName}`
      const uploadUrl = await generatePresignedUploadUrl(s3Key, input.contentType)
      return { s3Key, uploadUrl }
    }),

  attachDocument: protectedProcedure
    .input(z.object({
      caseId: z.string().uuid(),
      fileName: z.string(),
      contentType: z.string(),
      sizeBytes: z.number(),
      s3Key: z.string(),
      url: z.string().optional(),
      category: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const c = await ctx.db.case.findFirst({ where: { id: input.caseId, user_id: ctx.user.id } })
      if (!c) throw new TRPCError({ code: 'NOT_FOUND', message: 'Case not found' })

      const doc = await ctx.db.caseDocument.create({
        data: {
          case_id: input.caseId,
          file_name: input.fileName,
          content_type: input.contentType,
          size_bytes: input.sizeBytes,
          s3_key: input.s3Key,
          url: input.url ?? null,
          category: input.category ?? null,
          metadata: input.metadata ?? {},
        },
      })

      return doc
    }),

  // Test endpoint to regenerate tasks for a case (for development/testing)
  regenerateTasks: protectedProcedure
    .input(z.object({
      caseId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify case ownership
      const c = await ctx.db.case.findFirst({ 
        where: { 
          id: input.caseId, 
          user_id: ctx.user.id 
        } 
      })
      
      if (!c) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Case not found' 
        })
      }

      try {
        // Delete existing tasks (optional - you might want to keep them)
        await ctx.db.task.deleteMany({
          where: { case_id: input.caseId }
        })

        // Generate new tasks
        await createInitialTasksForCase(input.caseId)

        // Fetch and return the updated case with new tasks
        const updatedCase = await ctx.db.case.findFirst({
          where: { id: input.caseId },
          include: { tasks: true }
        })

        return {
          success: true,
          message: 'Tasks regenerated successfully',
          case: updatedCase
        }
      } catch (error) {
        console.error('Error regenerating tasks:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to regenerate tasks'
        })
      }
    }),
})


