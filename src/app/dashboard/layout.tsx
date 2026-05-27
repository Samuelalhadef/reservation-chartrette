import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import SessionProvider from '@/components/SessionProvider';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <SessionProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-primary-950">
        <Navbar />
        <main className="py-6 animate-fade-in">{children}</main>
      </div>
    </SessionProvider>
  );
}
