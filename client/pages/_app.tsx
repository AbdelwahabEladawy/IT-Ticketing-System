import type { AppProps } from "next/app";
import "../styles/globals.css";

import i18n from "../i18n";
import { LOCALE_STORAGE_KEY } from "../i18n";
import { getCurrentUser, User } from "../utils/auth";
import { startPresence, stopPresence } from "../utils/presence";
import { applyDocumentLanguage, type AppLocale } from "../utils/locale";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { I18nextProvider, useTranslation } from "react-i18next";



function AppInner({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { t } = useTranslation();
  const localeSyncedRef = useRef(false);


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
        <span className="sr-only">
          {t("common.loading")}
        </span>
      </div>
    );
  }

  return <Component {...pageProps} />;
}


export default function App(props: AppProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <AppInner {...props} />
    </I18nextProvider>
  );
}
