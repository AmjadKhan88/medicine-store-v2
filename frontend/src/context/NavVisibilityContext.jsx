import { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'medistore_nav_visibility';

/* ── Items that can NEVER be hidden (core navigation) ── */
export const ALWAYS_VISIBLE_NAV = [
  '/app',
  '/app/subscription',
  '/app/settings',
  '/app/expiry-alerts',
  '/app/ai-assistant',
];

const NavVisibilityContext = createContext(null);

export function NavVisibilityProvider({ children }) {
  const [visibility, setVisibility] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch { return {}; }
  });

  /* ── true by default — only false if explicitly set ── */
  const isVisible = useCallback((to) => {
    if (ALWAYS_VISIBLE_NAV.includes(to)) return true;
    return visibility[to] !== false;
  }, [visibility]);

  const toggle = useCallback((to) => {
    if (ALWAYS_VISIBLE_NAV.includes(to)) return;
    setVisibility(prev => {
      const next = { ...prev, [to]: prev[to] === false ? true : false };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setGroupVisible = useCallback((paths, value) => {
    setVisibility(prev => {
      const next = { ...prev };
      paths.forEach(to => {
        if (!ALWAYS_VISIBLE_NAV.includes(to)) next[to] = value;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setVisibility({});
  }, []);

  const hiddenCount = Object.values(visibility).filter(v => v === false).length;

  return (
    <NavVisibilityContext.Provider value={{
      isVisible, toggle, setGroupVisible, reset, hiddenCount, visibility,
    }}>
      {children}
    </NavVisibilityContext.Provider>
  );
}

export const useNavVisibility = () => {
  const ctx = useContext(NavVisibilityContext);
  if (!ctx) throw new Error('useNavVisibility must be used inside NavVisibilityProvider');
  return ctx;
};
