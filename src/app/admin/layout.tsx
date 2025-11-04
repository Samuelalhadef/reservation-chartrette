import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import SessionProvider from '@/components/SessionProvider';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions) as any;

  if (!session || !session.user) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="py-6">{children}</main>
      </div>
    </SessionProvider>
  );
}
