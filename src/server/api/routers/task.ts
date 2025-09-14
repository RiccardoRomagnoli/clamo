import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc'

export const taskRouter = createTRPCRouter({
  update: protectedProcedure
    .input(z.object({
      taskId: z.string().uuid(),
      status: z.enum(['pending', 'active', 'completed', 'not_relevant', 'generating', 'error']).optional(),
      notes: z.string().optional(),
      got_results: z.boolean().optional(),
      due_date: z.string().datetime().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.findFirst({
        where: { id: input.taskId },
        include: { case: true },
      })

      if (!task) throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
      if (task.case.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed to update this task' })
      }

      // If completing a task, check if we need to activate the next one
      let additionalUpdates: any[] = []
      if (input.status === 'completed' && task.status !== 'completed') {
        // Find the next pending task in order
        const nextTask = await ctx.db.task.findFirst({
          where: {
            case_id: task.case_id,
            status: 'pending',
            order_index: { gt: task.order_index ?? 0 }
          },
          orderBy: { order_index: 'asc' }
        })
        
        if (nextTask) {
          additionalUpdates.push(
            ctx.db.task.update({
              where: { id: nextTask.id },
              data: { status: 'active' }
            })
          )
        }
      }

      // Execute the main update and any additional updates in a transaction
      const [updated] = await ctx.db.$transaction([
        ctx.db.task.update({
          where: { id: input.taskId },
          data: {
            status: input.status ?? task.status,
            notes: input.notes ?? task.notes,
            got_results: typeof input.got_results === 'boolean' ? input.got_results : task.got_results,
            due_date: input.due_date ? new Date(input.due_date) : task.due_date,
          },
        }),
        ...additionalUpdates
      ])

      return updated
    }),
})


