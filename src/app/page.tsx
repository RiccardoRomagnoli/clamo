import { redirect } from 'next/navigation'
import { createClient } from '~/utils/supabase/server'
import { api } from '~/trpc/server'
import ClamoLandingClient from './page-client'

export default async function ClamoLanding() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Redirect to dashboard if user already has cases
    const cases = await api.case.getAll()
    if (cases.length > 0) {
      redirect('/dashboard')
    }

    // Otherwise, continue any incomplete discovery chat
    const chats = await api.chat.getAll()
    for (const chat of chats) {
      if (!chat.completed) {
        redirect(`/chat?chatId=${chat.id}`)
      }
    }
  }

  return <ClamoLandingClient />
}