import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { stripe } from "~/utils/stripe";
import { env } from "~/env";

export const userRouter = createTRPCRouter({
  // Get current user data
  getCurrent: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.user.id },
        select: {
          id: true,
          email: true,
          created_at: true,
          updated_at: true,
        }
      });
      
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      
      return user;
    }),

  // Create user record after Supabase signup (called from frontend)
  createUserRecord: publicProcedure
    .input(z.object({
      userId: z.string(),
      email: z.string().email(),
      caseSummary: z.string().min(1).optional(),
      timezone: z.string().default('UTC'),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { userId, email, caseSummary, timezone } = input;
        
        // Check if user already exists
        const existingUser = await ctx.db.user.findUnique({
          where: { id: userId }
        });
        
        if (existingUser) {
          // User already exists, just return existing data
          const existingChat = await ctx.db.chat.findFirst({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' }
          });
          
          return {
            success: true,
            userId: existingUser.id,
            chatId: existingChat?.id,
          };
        }
        
        // Create user record in our database
        const user = await ctx.db.user.create({
          data: {
            id: userId,
            email,
          }
        });
        
        // Create initial chat session
        let chatSession = null;
        
        if (caseSummary) {
          chatSession = await ctx.db.chat.create({
            data: {
              user_id: user.id,
              initial_message: caseSummary,
              chat_history: [], // Empty history - client will send the first message
              progress: {
                caseTypeSelected: false,
                factsCollected: false,
                partiesCollected: false,
                evidenceCollected: false,
                procedureConfirmed: false,
                currentFocus: 'Identifying the type of case (movable property or sanctions)',
              },
            }
          });
        } else {
          // Create empty chat if no product info provided
          chatSession = await ctx.db.chat.create({
            data: {
              user_id: user.id,
              chat_history: [],
              progress: {
                caseTypeSelected: false,
                factsCollected: false,
                partiesCollected: false,
                evidenceCollected: false,
                procedureConfirmed: false,
                currentFocus: 'Identifying the type of case (movable property or sanctions)',
              },
            }
          });
        }
        
        return {
          success: true,
          userId: user.id,
          chatId: chatSession?.id,
        };
      } catch (error) {
        console.error('Error creating user record:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user record",
        });
      }
    }),
});
