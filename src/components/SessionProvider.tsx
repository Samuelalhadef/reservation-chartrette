'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import type { Session } from 'next-auth';

interface Props {
  children: ReactNode;
  /**
   * Session initiale fournie par le serveur (getServerSession). Permet à
   * useSession() d'avoir la session dès le premier rendu client, sans attendre
   * un fetch /api/auth/session — sinon la Navbar (qui masque tant que session
   * est null) n'apparaît qu'après rechargement.
   */
  session?: Session | null;
}

export default function SessionProvider({ children, session }: Props) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
