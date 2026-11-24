import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useData } from "../state/DataContext";

const TITLES: Record<string, string> = {
  "/": "Sportsbook & casino",
  "/sports": "Sportsbook",
  "/live": "Live betting",
  "/esports": "Esports",
  "/virtuals": "Virtual sports",
  "/casino": "Casino lobby",
  "/instant": "Instant games",
  "/slots": "Slots",
  "/live-casino": "Live casino",
  "/promotions": "Promotions",
  "/tournaments": "Tournaments",
  "/search": "Search",
  "/help": "Help centre",
  "/support": "Support",
  "/about": "About",
  "/terms": "Terms",
  "/privacy": "Privacy",
  "/responsible-gaming": "Responsible gaming",
  "/bonus-terms": "Bonus terms",
  "/cookies": "Cookies",
  "/aml": "AML & KYC",
  "/affiliates": "Affiliates",
  "/login": "Sign in",
  "/register": "Create account",
  "/forgot-password": "Account recovery",
  "/account": "Player dashboard",
  "/account/profile": "Profile",
  "/account/wallet": "Coin wallet",
  "/account/deposit": "Add coins",
  "/account/bets": "My bets",
  "/account/activity": "Game activity",
  "/account/notifications": "Notifications",
  "/account/security": "Security",
  "/account/referrals": "Referrals",
  "/account/responsible": "Responsible gaming",
  "/admin": "Control room",
  "/admin/network": "Network hierarchy",
  "/admin/accounts": "Accounts",
  "/admin/deposits": "Deposit review",
  "/admin/games": "Game catalogue",
  "/admin/content": "Content & promos",
  "/admin/credits": "Credit activity",
  "/admin/support": "Support desk",
  "/admin/transfers": "Transfers",
  "/admin/security": "Security centre",
  "/admin/audit": "Audit trail",
  "/admin/settings": "Configuration",
  "/admin/system": "System health"
};

export function PageTitle() {
  const { pathname } = useLocation();
  const { gamesById } = useData();
  useEffect(() => {
    const gameName = pathname.startsWith("/game/") ? gamesById.get(pathname.slice("/game/".length))?.name : null;
    const base = gameName
      || TITLES[pathname]
      || (pathname.startsWith("/help/") ? "Help centre" : null)
      || (pathname.startsWith("/game/") ? "Game" : null)
      || (pathname.startsWith("/admin") ? "Control room" : "Page");
    document.title = `${base} · 19xbet365`;
  }, [pathname, gamesById]);
  return null;
}
