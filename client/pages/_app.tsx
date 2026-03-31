import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser } from '../utils/auth';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser) {
        localeSyncedRef.current = false;
      } else if (!localeSyncedRef.current) {
        localeSyncedRef.current = true;
        if (currentUser.preferredLocale) {
          const loc: AppLocale =
            currentUser.preferredLocale === "ar" ? "ar" : "en";
          await i18n.changeLanguage(loc);
          if (typeof window !== "undefined") {
            localStorage.setItem(LOCALE_STORAGE_KEY, loc);
          }
          applyDocumentLanguage(loc);
        } else {
          const stored = (typeof window !== "undefined"
            ? localStorage.getItem(LOCALE_STORAGE_KEY)
            : null) as AppLocale | null;
          const lng: AppLocale = stored === "ar" ? "ar" : "en";
          await i18n.changeLanguage(lng);
          applyDocumentLanguage(lng);
        }
      }

      setLoading(false);
      if (currentUser) {
        startPresence();
      } else {
        stopPresence();
      }

      // Redirect to login if not authenticated and not on public pages
      const publicPages = ['/login', '/signup'];
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
        <span className="sr-only">
          {clientMounted ? t("common.loading") : "Loading..."}
        </span>
      </div>
    );
  }

  return <Component {...pageProps} />;
}

