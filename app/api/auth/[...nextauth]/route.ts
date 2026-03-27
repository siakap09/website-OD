import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Username/Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // 1. Find the user in your PostgreSQL database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) return null;

        // 2. Check Password (Includes a fallback for your plain-text HeidiSQL entry!)
        const isPasswordValid = 
          (await bcrypt.compare(credentials.password, user.passwordHash)) || 
          (credentials.password === user.passwordHash);

        if (!isPasswordValid) return null;

        // 3. Return the user data to be saved in the session
        return {
          id: user.id.toString(),
          email: user.email,
          role: user.role,
          branchName: user.branchName
        };
      }
    })
  ],
  callbacks: {
    // Put the role and branch into the secure token
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.branchName = (user as any).branchName;
      }
      return token;
    },
    // Pass the token data into the active session
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).branchName = token.branchName;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', // Tells NextAuth to use your custom page!
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };