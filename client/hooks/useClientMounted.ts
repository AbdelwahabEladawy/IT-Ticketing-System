import { useEffect, useState } from "react";

/** After first client paint; avoids i18n (localStorage) vs SSR text mismatch on hydration. */
export function useClientMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
