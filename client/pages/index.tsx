import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser } from '../utils/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      const user = await getCurrentUser();
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    };
    redirect();
  }, []);

  return null;
}

