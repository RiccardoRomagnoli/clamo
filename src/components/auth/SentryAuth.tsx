'use client'

import { useEffect } from "react";
import { supabase } from "~/utils/supabase/client";
import * as Sentry from '@sentry/nextjs'

export default function SentryAuth() {
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if(user) {
        Sentry.setUser({
          id: user?.id,
          email: user?.email,
        });
      }
    }
    getUser()
  }, [])

  return null
}