"use server";

import { redirect } from "next/navigation";
import { createClient } from "~/utils/supabase/server";
import { api } from '~/trpc/server'
import { CasesDashboardClient } from './cases-dashboard-client'

/**
 * Main dashboard page that redirects to the appropriate dashboard based on user role
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect to the appropriate dashboard based on user role
  if (!user) {
    redirect("/");
  }

  const cases = await api.case.getAll()

  if(cases.length === 0) {
    const chats = await api.chat.getAll()
    for (const chat of chats) {
      if(!chat.completed) {
        redirect(`/chat?chatId=${chat.id}`)
      }
    }
  }

  const userData = await api.user.getCurrent()

  return <CasesDashboardClient cases={cases} userData={userData} />
}
