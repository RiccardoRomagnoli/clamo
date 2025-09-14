import { cookies } from "next/headers";
import { NextAuthOptions } from "next-auth";
import { type Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "~/utils/supabase/server";

/**
 * Extended session type that includes user ID
 */
interface ExtendedSession extends Session {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

/**
 * Authentication options for NextAuth
 * This is a compatibility layer that allows using getServerSession from next-auth
 * with Supabase authentication
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Supabase",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize() {
        // This is a placeholder - actual auth is handled by Supabase
        return null;
      }
    })
  ],
  callbacks: {
    async session({ session }): Promise<ExtendedSession> {
      // Get the user from Supabase
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const extendedSession = session as ExtendedSession;

      if (user && extendedSession.user) {
        extendedSession.user.id = user.id;
        extendedSession.user.email = user.email;
        // Additional profile data could be fetched here if needed
      }

      return extendedSession;
    },
  },
};

/**
 * Gets the server session using the Supabase client
 * This is a compatibility function to work with imports from next-auth
 */
export async function getServerSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  // Create a session object compatible with NextAuth format
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
    }
  };
} 