import SessionProvider from '@/components/SessionProvider';
import Navbar from '@/components/Navbar';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <Navbar />
      {children}
    </SessionProvider>
  );
}
