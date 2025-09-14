import { redirect } from 'next/navigation'
import { ChatPageClient } from './chat-page-client'
import { db } from '~/server/db'
import { createClient } from '~/utils/supabase/server'
import type { ChatMessage } from '~/server/api/routers/chat'
import { api } from '~/trpc/server'

interface PageProps {
  searchParams: Promise<{ chatId?: string }>
}

export default async function ChatPage({ searchParams }: PageProps) {
  const params = await searchParams
  const chatId = params.chatId

  // Get authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const cases = await api.case.getAll()

  if(cases.length > 0) {
    redirect('/dashboard')
  }

  if(cases.length === 0) {
    //get chats
    const chats = await api.chat.getAll()
    for (const chat of chats) {
      if(!chat.completed && chat.id !== chatId) {
        //redirect to chat page
        redirect(`/chat?chatId=${chat.id}`)
      }
    }
  }

  // Fetch chat data with progress
  let chat = await db.chat.findFirst({
    where: { 
      id: chatId,
      user_id: user.id,
    },
    include: {
      case: {
        include: {
          tasks: true,
          documents: true,
        },
      }
    },
  })

  if (!chat) {
    //create a new chat
    chat = await db.chat.create({
      data: {
        user_id: user.id,
        initial_message: '',
        chat_history: [],
        progress: {
          caseTypeSelected: false,
          factsCollected: false,
          partiesCollected: false,
          evidenceCollected: false,
          procedureConfirmed: false,
          currentFocus: 'Identifying the type of case (movable property or sanctions)',
        },
        completed: false,
      },
      include: {
        case: true
      },
    })
  }

  // Parse progress data
  const progress = chat.progress && typeof chat.progress === 'object' 
    ? chat.progress as {
        caseTypeSelected: boolean
        factsCollected: boolean
        partiesCollected: boolean
        evidenceCollected: boolean
        procedureConfirmed: boolean
        currentFocus: string
      }
    : {
        caseTypeSelected: false,
        factsCollected: false,
        partiesCollected: false,
        evidenceCollected: false,
        procedureConfirmed: false,
        currentFocus: 'Identifying the type of case (movable property or sanctions)',
      }

  // Parse chat history
  const messages = Array.isArray(chat.chat_history) 
    ? chat.chat_history as ChatMessage[]
    : []

  return (
    <ChatPageClient 
      chatId={chatId ?? chat.id}
      initialChat={{
        id: chat.id,
        initial_message: chat.initial_message,
        completed: chat.completed,
        case: chat.case,
      }}
      initialMessages={messages}
      initialProgress={progress}
    />
  )
} 