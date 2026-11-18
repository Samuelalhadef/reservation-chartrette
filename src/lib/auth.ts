import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const [user] = await db
          .select()
          .from(users)
          .where(sql`lower(${users.email}) = ${credentials.email.trim().toLowerCase()}`)
          .limit(1);

        if (!user || !user.password) {
          throw new Error('Invalid email or password');
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error('Veuillez vérifier votre email avant de vous connecter. Vérifiez votre boîte mail pour le code de vérification.');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          associationId: user.associationId || undefined,
          image: user.image || undefined,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (account?.provider === 'google') {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email!))
          .limit(1);

        if (!existingUser) {
          // For Google OAuth, user must complete signup with association selection
          return `/auth/complete-profile?email=${encodeURIComponent(user.email!)}&name=${encodeURIComponent(user.name!)}&image=${encodeURIComponent(user.image!)}`;
        }

        // Update user info from Google
        const [updatedUser] = await db
          .update(users)
          .set({
            name: user.name || existingUser.name,
            image: user.image || existingUser.image,
            emailVerified: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning();

        user.id = updatedUser.id;
        (user as any).role = updatedUser.role;
        (user as any).associationId = updatedUser.associationId;
      }

      return true;
    },
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.associationId = (user as any).associationId;
      }

      // Rôle et association relus en base (jamais depuis le navigateur : les
      // données de `update()` viennent du client et permettaient de se donner
      // le rôle admin). Rafraîchis à la demande et au plus toutes les 5 min,
      // pour qu'un compte rétrogradé perde ses droits sans attendre 30 jours.
      const now = Date.now();
      const stale = !token.refreshedAt || now - (token.refreshedAt as number) > 5 * 60 * 1000;
      if (token.id && !user && (trigger === 'update' || stale)) {
        void session; // les données envoyées par le client sont ignorées
        try {
          const [fresh] = await db
            .select({ role: users.role, associationId: users.associationId, name: users.name })
            .from(users)
            .where(eq(users.id, token.id as string))
            .limit(1);
          if (fresh) {
            token.role = fresh.role;
            token.associationId = fresh.associationId;
            if (fresh.name) token.name = fresh.name;
          } else {
            // Compte supprimé : plus aucun droit.
            token.role = 'user';
            token.associationId = null;
          }
          token.refreshedAt = now;
        } catch (error) {
          console.error('Rafraîchissement de la session impossible:', error);
        }
      } else if (user) {
        token.refreshedAt = now;
      }

      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).associationId = token.associationId;
      }

      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
