import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role?: string;
    associationId?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: string;
      associationId?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    associationId?: string;
  }
}
