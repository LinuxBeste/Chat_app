import { createContext, useContext, useState, type ReactNode } from "react";

export type NavView =
  | "chats"
  | "profile"
  | "files"
  | "groups"
  | "calls"
  | "notifications"
  | "communities"
  | "events"
  | "settings"
  | "admin"
  | "search";

interface NavContextValue {
  view: NavView;
  setView: (v: NavView) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<NavView>("chats");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  return (
    <NavContext.Provider value={{ view, setView, activeConversationId, setActiveConversationId }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx)
    return {
      view: "chats" as NavView,
      setView: () => {},
      activeConversationId: null,
      setActiveConversationId: () => {},
    };
  return ctx;
}
