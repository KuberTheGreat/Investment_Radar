import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

declare module "next-auth" {
  interface Session {
    backendToken?: string;
    user: {
      id?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string;
    userId?: string;
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && account.id_token) {
        // We just signed in with Google, let's sync to the backend
        try {
          const res = await fetch(`${API_BASE}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: account.id_token }),
          });
          if (res.ok) {
            const data = await res.json();
            token.backendToken = data.access_token;
            token.userId = data.user_id;
          } else {
            console.error("Failed to sync with backend", await res.text());
          }
        } catch (e) {
          console.error("Error communicating with backend auth", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.backendToken = token.backendToken as string;
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
