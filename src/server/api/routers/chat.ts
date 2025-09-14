/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { CoreMessage, generateText, generateObject, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { after } from 'next/server';
import { createInitialTasksForCase } from '~/utils/ai/task-generator';
import { generatePresignedUploadUrl, S3_BUCKET_NAME, s3 } from '~/utils/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';


// Message schema
const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  id: z.string().optional(),
});

// TypeScript type for messages
export type ChatMessage = z.infer<typeof messageSchema>;

// Case extraction schema for structured output
const caseExtractionSchema = z.object({
  caseType: z.enum(['BENI_MOBILI', 'SANZIONI_AMMINISTRATIVE']).describe('Type of legal proceeding identified'),
  title: z.string().nullable().describe('Brief case title'),
  summary: z.string().describe('Clear summary of relevant facts'),
  disputeValue: z.number().nullable().describe('Value of the dispute, if available'),
  notificationDate: z.string().nullable().describe('Notification date of act/sanction in ISO format if provided'),
  requestedRelief: z.string().nullable().describe('What is being requested from the judge'),
  parties: z.object({
    claimant: z.record(z.any()).optional(),
    defendant: z.record(z.any()).optional(),
  }).optional(),
  documentsSuggested: z.array(z.object({
    category: z.string(),
    note: z.string().optional(),
  })).default([]),
});

// Progress tracking schema for legal case discovery
const progressSchema = z.object({
  caseTypeSelected: z.boolean().default(false),
  factsCollected: z.boolean().default(false),
  partiesCollected: z.boolean().default(false),
  evidenceCollected: z.boolean().default(false),
  procedureConfirmed: z.boolean().default(false),
  currentFocus: z.string().default('Identifying the type of case (movable property or sanctions)'),
});

// Tool schemas for progress tracking & file requests
const markCaseTypeSelectedSchema = z.object({ caseType: z.enum(['BENI_MOBILI', 'SANZIONI_AMMINISTRATIVE']) })
const markFactsCollectedSchema = z.object({ summary: z.string() })
const markPartiesCollectedSchema = z.object({
  claimant: z.record(z.any()).optional(),
  defendant: z.record(z.any()).optional(),
})
const requestDocumentSchema = z.object({
  category: z.string().describe('Document category (e.g., contract, receipt, ticket, photo, expert report, communications)'),
  reason: z.string().describe('Why it is needed and how to obtain it'),
})
const markEvidenceCollectedSchema = z.object({ note: z.string().optional() })
const markProcedureConfirmedSchema = z.object({ confirmed: z.boolean().default(true) })

// System prompt for legal case discovery
const SYSTEM_PROMPT = `You are a legal assistant helping the user prepare a case for the Giudice di Page court WITHOUT a lawyer (limit: €1,100 for self-representation).
Objective: conduct a conversational interview to gather ALL necessary information and documents to identify whether this is:
- BENI_MOBILI (disputes over goods/services) or
- SANZIONI_AMMINISTRATIVE (opposition to fines/administrative orders).

CRITICAL DATA TO COLLECT:

For BENI MOBILI (goods/services):
1. Complete party data: Full name, tax code (CF), address, city, CAP, PEC email (if available)
2. Exact dispute value in euros (must be ≤ €1,100 for self-representation)
3. Detailed facts: dates, locations, sequence of events
4. Documents: contracts, invoices, receipts, photos, correspondence, expert reports
5. Prior attempts: letters of formal notice (diffida), mediation attempts
6. Specific requests: refund, replacement, compensation, contract termination

For SANZIONI AMMINISTRATIVE (fines):
1. Verbale details: number, date, notifying authority
2. Notification date (CRITICAL for 30-day deadline)
3. Infraction location and circumstances
4. Opposition grounds: procedural errors, factual errors, missing signage, etc.
5. Supporting evidence: photos, calibration certificates, witnesses
6. Your complete data: name, tax code, residence

CONVERSATION FLOW:
1) Identify case type and verify value is within €1,100 limit
2) Collect YOUR complete data (name, surname, tax code, full address with city and CAP)
3) Collect COUNTERPARTY data (name/company, tax code/VAT, address if known)
4) Gather detailed facts with specific dates and locations
5) Request and acknowledge uploaded documents
6) Confirm all data and explain next procedural steps

Rules:
- Ask ONE question at a time, be specific and clear
- For addresses, always ask for: street, number, city, CAP
- For dates, ask for exact day/month/year
- When a document is needed, use the requestDocument tool
- Acknowledge uploaded documents and extract relevant information
- Remind about deadlines: 30 days for sanctions, reasonable time for goods disputes
- Do not provide legal evaluations; focus on collecting procedural information

IMPORTANT Tool Usage Rules:
- Use the progress tracking tools when you have gathered sufficient information for each step
- Call markCaseTypeSelected when you have identified whether it's BENI_MOBILI or SANZIONI_AMMINISTRATIVE and understand the dispute value
- Call markFactsCollected when you have gathered what happened, when it occurred, where it took place, and the sequence of events
- Call markPartiesCollected when you have collected names, addresses, and roles of all parties involved (claimant and defendant)
- Call markEvidenceCollected when you have identified available documents, requested necessary uploads, and confirmed what evidence exists
- Call markProcedureConfirmed when you have explained the legal process, deadlines, and next steps, and the user understands how to proceed
- Call requestDocument whenever you need the user to provide a specific document, specifying its category and why it's needed
- If you move on to a new step in the conversation, use the appropriate tool to mark the previous step as complete

{{PROGRESS_CONTEXT}}
`

// Helper to get the next focus area based on progress
function getNextFocus(progress: z.infer<typeof progressSchema>): string {
  if (!progress.caseTypeSelected) return 'Identifying the type of case (movable property or sanctions)';
  if (!progress.factsCollected) return 'Gathering main facts (what/who/when/where)';
  if (!progress.partiesCollected) return 'Collecting party information (you and counterparty)';
  if (!progress.evidenceCollected) return 'Collecting useful documents/evidence';
  if (!progress.procedureConfirmed) return 'Confirming the procedure and next steps';
  return 'Creating the case file and tasks';
}

// Extract structured case data when complete
async function extractCaseData(messages: ChatMessage[]): Promise<z.infer<typeof caseExtractionSchema>> {
  const conversation = messages
    .filter(m => m.role !== 'system')
    .map(m => `${m.role}: ${m.content}`)
    .join('\n\n');

  try {
    const { object } = await generateObject({
      model: openai('gpt-4.1'),
      schema: caseExtractionSchema,
      messages: [
        {
          role: 'system',
          content: `Extract structured case data for the Giudice di Page court from the conversation. Identify case type, summary, value, parties, notification date (if present) and suggested documents.`,
        },
        {
          role: 'user',
          content: `Extract case data from the following conversation:\n\n${conversation}`,
        },
      ],
      temperature: 0.1,
    });

    return object;
  } catch (error) {
    console.error('Error extracting case data:', error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: 'Failed to extract structured case data',
    });
  }
}

// Helper function to generate progress context string
function generateProgressContext(progress: z.infer<typeof progressSchema>): string {
  const steps = [
    { name: 'Tipo di causa', completed: progress.caseTypeSelected },
    { name: 'Fatti principali', completed: progress.factsCollected },
    { name: 'Parti coinvolte', completed: progress.partiesCollected },
    { name: 'Prove/documenti', completed: progress.evidenceCollected },
    { name: 'Procedura confermata', completed: progress.procedureConfirmed },
  ];

  const progressLines = steps.map((step, index) => 
    `${index + 1}. ${step.name}: ${step.completed ? '✓ Completed' : '○ Not completed yet'}`
  ).join('\n');

  return `Current status:
${progressLines}

Current focus: ${progress.currentFocus}`;
}

export const chatRouter = createTRPCRouter({
  // Get chat by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async (opts: any) => {
      const { ctx, input } = opts
      const chat = await ctx.db.chat.findFirst({
        where: { 
          id: input.id,
          user_id: ctx.user.id,
        },
        include: {},
      });

      if (!chat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      return chat;
    }),

  // Get all chats for the current user
  getAll: protectedProcedure.query(async (opts: any) => {
    const { ctx } = opts
    return ctx.db.chat.findMany({
      where: { user_id: ctx.user.id },
      include: {},
      orderBy: { created_at: "desc" },
    });
  }),

  // Create a new chat session
  create: protectedProcedure
    .input(z.object({}))
    .mutation(async (opts: any) => {
      const { ctx } = opts
      try {
        const chat = await ctx.db.chat.create({
          data: {
            user_id: ctx.user.id,
            progress: {
              caseTypeSelected: false,
              factsCollected: false,
              partiesCollected: false,
              evidenceCollected: false,
              procedureConfirmed: false,
              currentFocus: 'Identifying the type of case (movable property or sanctions)',
            },
          },
          include: {},
        });

        return chat;
      } catch (error) {
        console.error('Error creating chat:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create chat",
        });
      }
    }),

    // Send a message and get AI response
  sendMessage: protectedProcedure
    .input(z.object({
      chatId: z.string().uuid(),
      message: z.string(),
    }))
    .mutation(async (opts: any) => {
      const { ctx, input } = opts
      try {
        // First verify the chat belongs to the user
        const chat = await ctx.db.chat.findFirst({
          where: { 
            id: input.chatId,
            user_id: ctx.user.id,
          },
          include: {},
        });

        if (!chat) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Chat not found",
          });
        }

        const messages = chat.chat_history as Array<ChatMessage>;
        const currentProgress = (chat.progress as z.infer<typeof progressSchema>) || {
          caseTypeSelected: false,
          factsCollected: false,
          partiesCollected: false,
          evidenceCollected: false,
          procedureConfirmed: false,
          currentFocus: 'Identifying the type of case (movable property or sanctions)',
        };

        const enhancedMessages: ChatMessage[] = [...messages, {
          role: 'user',
          content: input.message,
          id: Date.now().toString()
        }];
        
        // Generate progress context and replace placeholder in system prompt
        const progressContext = generateProgressContext(currentProgress);
        const systemPromptWithProgress = SYSTEM_PROMPT.replace('{{PROGRESS_CONTEXT}}', progressContext);

        console.log('enhancedMessages', enhancedMessages);
        
        // Add system prompt with progress context
        const messagesWithSystem = [
          { role: 'system', content: systemPromptWithProgress } as CoreMessage,
          ...enhancedMessages
        ];

        // Create a mutable progress object to track updates
        const updatedProgress = { ...currentProgress };
        
        // Define tools for progress tracking
        const tools = {
          markCaseTypeSelected: tool({
            description: 'Mark the identified case type (BENI_MOBILI or SANZIONI_AMMINISTRATIVE).',
            parameters: markCaseTypeSelectedSchema,
            execute: async (params: z.infer<typeof markCaseTypeSelectedSchema>) => {
              const { caseType } = params
              updatedProgress.caseTypeSelected = true
              updatedProgress.currentFocus = getNextFocus(updatedProgress)
              return { success: true, caseType }
            },
          }),
          markFactsCollected: tool({
            description: 'Mark that sufficient main facts have been collected.',
            parameters: markFactsCollectedSchema,
            execute: async (params: z.infer<typeof markFactsCollectedSchema>) => {
              const { summary } = params
              updatedProgress.factsCollected = true
              updatedProgress.currentFocus = getNextFocus(updatedProgress)
              return { success: true, summary }
            },
          }),
          markPartiesCollected: tool({
            description: 'Mark party data (claimant/defendant) as collected.',
            parameters: markPartiesCollectedSchema,
            execute: async (params: z.infer<typeof markPartiesCollectedSchema>) => {
              const { claimant, defendant } = params
              updatedProgress.partiesCollected = true
              updatedProgress.currentFocus = getNextFocus(updatedProgress)
              return { success: true, claimant, defendant }
            },
          }),
          requestDocument: tool({
            description: 'Request a document from the user, specifying category and reason (will show an upload prompt).',
            parameters: requestDocumentSchema,
            execute: async (params: z.infer<typeof requestDocumentSchema>) => {
              const { category, reason } = params
              // The client can react to this by prompting a file upload UI
              return { requested: true, category, reason }
            },
          }),
          markEvidenceCollected: tool({
            description: 'Mark document collection as sufficient to proceed.',
            parameters: markEvidenceCollectedSchema,
            execute: async (params: z.infer<typeof markEvidenceCollectedSchema>) => {
              const { note } = params
              updatedProgress.evidenceCollected = true
              updatedProgress.currentFocus = getNextFocus(updatedProgress)
              return { success: true, note }
            },
          }),
          markProcedureConfirmed: tool({
            description: 'Confirm that the procedure has been explained and understood. The chat can conclude.',
            parameters: markProcedureConfirmedSchema,
            execute: async (params: z.infer<typeof markProcedureConfirmedSchema>) => {
              const { confirmed } = params
              updatedProgress.procedureConfirmed = confirmed
              updatedProgress.currentFocus = 'Creating case and tasks'
              return { success: true }
            },
          }),
        };
        
        const { text, toolCalls } = await generateText({
          model: openai('gpt-4.1'),
          messages: messagesWithSystem,
          tools,
          temperature: 0.7,
          maxTokens: 500,
          maxSteps: 3,
        });

        console.log('Tool calls:', toolCalls);
        console.log('Updated progress:', updatedProgress);
        
        // Create new message array
        const newMessages = [
          ...messages,
          { role: 'user' as const, content: input.message, id: Date.now().toString() },
          { role: 'assistant' as const, content: text, id: (Date.now() + 1).toString() },
        ];

        if (updatedProgress.procedureConfirmed && !chat.completed) {
          try {
            // Extract structured case data
            const caseData = await extractCaseData(newMessages)

            // Create case record
            const createdCase = await ctx.db.case.create({
              data: {
                user_id: ctx.user.id,
                type: caseData.caseType,
                title: caseData.title || (caseData.caseType === 'BENI_MOBILI' ? 'Movable property dispute' : 'Opposition to sanction'),
                summary: caseData.summary || null,
                data: {
                  requestedRelief: caseData.requestedRelief,
                  disputeValue: caseData.disputeValue,
                  notificationDate: caseData.notificationDate,
                  parties: caseData.parties,
                  documentsSuggested: caseData.documentsSuggested,
                },
                stage: 'preparation',
              },
            })

            // Update chat with case link, completion status, and progress
            await ctx.db.chat.update({
              where: { id: input.chatId },
              data: {
                chat_history: newMessages,
                completed: true,
                case_id: createdCase.id,
                progress: updatedProgress,
              },
            });

            // Retroactively link any existing chat documents to the case
            // Check if there are any documents uploaded during this chat that aren't linked to a case yet
            const chatMessages = newMessages as Array<{ attachments?: Array<{ s3Key: string; fileName: string; contentType: string; sizeBytes: number; category?: string }> }>
            const attachmentsFromChat: Array<{ s3Key: string; fileName: string; contentType: string; sizeBytes: number; category?: string }> = []
            
            chatMessages.forEach(message => {
              if (message.attachments) {
                attachmentsFromChat.push(...message.attachments)
              }
            })

            // Create CaseDocument records for any attachments that don't already have them
            for (const attachment of attachmentsFromChat) {
              // Check if this document is already linked to the case
              const existingDoc = await ctx.db.caseDocument.findFirst({
                where: {
                  case_id: createdCase.id,
                  s3_key: attachment.s3Key,
                }
              })

              if (!existingDoc) {
                try {
                  await ctx.db.caseDocument.create({
                    data: {
                      case_id: createdCase.id,
                      file_name: attachment.fileName,
                      content_type: attachment.contentType,
                      size_bytes: attachment.sizeBytes,
                      s3_key: attachment.s3Key,
                      url: null,
                      category: attachment.category || 'chat_upload',
                      metadata: {
                        source: 'chat_upload_retroactive',
                        chat_id: input.chatId,
                        linked_on_case_creation: new Date().toISOString(),
                      },
                    },
                  })
                } catch (error) {
                  console.error('Failed to retroactively link document:', error)
                  // Continue with other documents even if one fails
                }
              }
            }

            // Generate initial tasks for the case
            after(async () => {
              console.log(`Generating initial tasks for case ${createdCase.id} in background`);
              try {
                await createInitialTasksForCase(createdCase.id)
              } catch (error) {
                console.error(`Failed to generate initial tasks for case ${createdCase.id}:`, error);
              }
            });
          } catch (error) {
            console.error('Error creating case from chat:', error);
            // Continue without product creation but still save progress
            await ctx.db.chat.update({
              where: { id: input.chatId },
              data: {
                chat_history: newMessages,
                progress: updatedProgress,
              },
            });
          }
        } else {
          // Update chat history and progress
          await ctx.db.chat.update({
            where: { id: input.chatId },
            data: {
              chat_history: newMessages,
              progress: updatedProgress,
            },
          });
        }

        return {
          response: text,
          messages: newMessages,
          progress: updatedProgress,
          completed: updatedProgress.procedureConfirmed,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Error sending message:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send message",
        });
      }
    }),

  // Generate presigned URL for document upload
  getUploadUrl: protectedProcedure
    .input(z.object({
      chatId: z.string().uuid(),
      fileName: z.string(),
      contentType: z.string(),
      category: z.string().optional(),
    }))
    .mutation(async (opts: any) => {
      const { ctx, input } = opts

      // Verify chat ownership
      const chat = await ctx.db.chat.findFirst({
        where: { 
          id: input.chatId,
          user_id: ctx.user.id,
        },
      });

      if (!chat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      // Generate unique S3 key
      const timestamp = Date.now();
      const safeFileName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const s3Key = `users/${ctx.user.id}/chats/${input.chatId}/documents/${timestamp}-${safeFileName}`;

      // Generate presigned upload URL
      const uploadUrl = await generatePresignedUploadUrl(
        s3Key,
        input.contentType
      );

      return {
        uploadUrl,
        s3Key,
        fileName: input.fileName,
      };
    }),

  // Attach uploaded document to chat
  attachDocument: protectedProcedure
    .input(z.object({
      chatId: z.string().uuid(),
      s3Key: z.string(),
      fileName: z.string(),
      contentType: z.string(),
      sizeBytes: z.number(),
      category: z.string().optional(),
    }))
    .mutation(async (opts: any) => {
      const { ctx, input } = opts

      // Verify chat ownership
      const chat = await ctx.db.chat.findFirst({
        where: { 
          id: input.chatId,
          user_id: ctx.user.id,
        },
      });

      if (!chat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      // If chat has a case, create a CaseDocument record
      let documentId = null;
      if (chat.case_id) {
        const doc = await ctx.db.caseDocument.create({
          data: {
            case_id: chat.case_id,
            file_name: input.fileName,
            content_type: input.contentType,
            size_bytes: input.sizeBytes,
            s3_key: input.s3Key,
            url: null,
            category: input.category || 'chat_upload',
            metadata: {
              source: 'chat_upload',
              chat_id: input.chatId,
              upload_timestamp: new Date().toISOString(),
            },
          },
        });
        documentId = doc.id;
      }

      // Update chat history with document reference
      const messages = chat.chat_history as Array<ChatMessage>;
      const documentMessage = {
        role: 'system' as const,
        content: `[Document uploaded: ${input.fileName}${input.category ? ` - Category: ${input.category}` : ''}]`,
        id: Date.now().toString(),
        metadata: {
          type: 'document_upload',
          fileName: input.fileName,
          s3Key: input.s3Key,
          contentType: input.contentType,
          sizeBytes: input.sizeBytes,
          category: input.category,
          documentId,
        }
      };

      const updatedMessages = [...messages, documentMessage];

      await ctx.db.chat.update({
        where: { id: input.chatId },
        data: {
          chat_history: updatedMessages,
        },
      });

      return {
        success: true,
        documentId,
        message: `Document "${input.fileName}" uploaded successfully`,
      };
    }),

  // Upload document through server (fallback for CORS issues)
  uploadDocument: protectedProcedure
    .input(z.object({
      chatId: z.string().uuid(),
      fileName: z.string(),
      contentType: z.string(),
      fileBase64: z.string(),
      category: z.string().optional(),
    }))
    .mutation(async (opts: any) => {
      const { ctx, input } = opts

      // Verify chat ownership
      const chat = await ctx.db.chat.findFirst({
        where: { 
          id: input.chatId,
          user_id: ctx.user.id,
        },
      });

      if (!chat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      // Convert base64 to buffer
      const fileBuffer = Buffer.from(input.fileBase64, 'base64');
      const sizeBytes = fileBuffer.length;

      // Generate unique S3 key
      const timestamp = Date.now();
      const safeFileName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const s3Key = `users/${ctx.user.id}/chats/${input.chatId}/documents/${timestamp}-${safeFileName}`;

      // Upload to S3
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: input.contentType,
      }));

      // If chat has a case, create a CaseDocument record
      let documentId = null;
      if (chat.case_id) {
        const doc = await ctx.db.caseDocument.create({
          data: {
            case_id: chat.case_id,
            file_name: input.fileName,
            content_type: input.contentType,
            size_bytes: sizeBytes,
            s3_key: s3Key,
            url: null,
            category: input.category || 'chat_upload',
            metadata: {
              source: 'chat_upload_server',
              chat_id: input.chatId,
              upload_timestamp: new Date().toISOString(),
            },
          },
        });
        documentId = doc.id;
      }

      // Update chat history with document reference
      const messages = chat.chat_history as Array<ChatMessage>;
      const documentMessage = {
        role: 'system' as const,
        content: `[Document uploaded: ${input.fileName}${input.category ? ` - Category: ${input.category}` : ''}]`,
        id: Date.now().toString(),
        metadata: {
          type: 'document_upload',
          fileName: input.fileName,
          s3Key,
          contentType: input.contentType,
          sizeBytes,
          category: input.category,
          documentId,
        }
      };

      const updatedMessages = [...messages, documentMessage];

      await ctx.db.chat.update({
        where: { id: input.chatId },
        data: {
          chat_history: updatedMessages,
        },
      });

      return {
        success: true,
        documentId,
        s3Key,
        message: `Document "${input.fileName}" uploaded successfully`,
      };
    }),
}); 