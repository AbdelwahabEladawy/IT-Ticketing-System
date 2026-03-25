import type { AppProps } from "next/app";
import "../styles/globals.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getCurrentUser, User } from "../utils/auth";
import { startPresence, stopPresence } from "../utils/presence";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        startPresence();
      } else {
        stopPresence();
      }

      // Redirect to login if not authenticated and not on public pages
      const publicPages = ["/login", "/signup"];
      if (!currentUser && !publicPages.includes(router.pathname)) {
        router.push("/login");
      }
    };

    init();
    return () => {
      stopPresence();
    };
  }, [router.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <Component {...pageProps} />;
}
