import { Outlet, Route, Routes } from "react-router-dom";
import { Header, Footer } from "./components/Layout";
import { RequireAuth, RequireStaff, ScrollToTop } from "./components/ProtectedRoute";
import { Home } from "./pages/Home";
import { SportsPage, LiveSports, Esports, VirtualSports } from "./pages/Sports";
import { Casino, LiveCasino, Slots, InstantGames } from "./pages/Casino";
import { Promotions, Tournaments } from "./pages/Promotions";
import { SearchPage } from "./pages/Search";
import { GamePage } from "./pages/game/GamePage";
import { Login, Register, ForgotPassword } from "./pages/Auth";
import { AccountLayout } from "./pages/account/AccountLayout";
import { AccountOverview } from "./pages/account/Overview";
import { AccountProfile } from "./pages/account/Profile";
import { AccountWallet } from "./pages/account/Wallet";
import { AccountDeposit } from "./pages/account/Deposit";
import { AccountBets } from "./pages/account/Bets";
import { AccountActivity } from "./pages/account/Activity";
import { AccountNotifications } from "./pages/account/Notifications";
import { AccountSecurity } from "./pages/account/Security";
import { AccountReferrals } from "./pages/account/Referrals";
import { AccountResponsible } from "./pages/account/Responsible";
import { SupportPage } from "./pages/Support";
import { HelpPage } from "./pages/Help";
import { StaticPage } from "./pages/StaticPage";
import { NotFound } from "./pages/NotFound";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/Dashboard";
import { AdminNetworkPage } from "./pages/admin/Network";
import { AdminAccountsPage } from "./pages/admin/Accounts";
import { AdminRolesPage } from "./pages/admin/Roles";
import { AdminGamesPage } from "./pages/admin/Games";
import { AdminContentPage } from "./pages/admin/Content";
import { AdminCreditsPage } from "./pages/admin/Credits";
import { AdminSupportPage } from "./pages/admin/Support";
import { AdminTransfersPage } from "./pages/admin/Transfers";
import { AdminSecurityPage } from "./pages/admin/Security";
import { AdminAuditPage } from "./pages/admin/Audit";
import { AdminSettingsPage } from "./pages/admin/Settings";
import { AdminDepositsPage } from "./pages/admin/Deposits";
import { AdminSystemPage } from "./pages/admin/System";

function PublicLayout() {
  return (
    <div className="bookmaker">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header />
      <main className="site-main" id="main-content" tabIndex={-1}><Outlet /></main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="/sports" element={<SportsPage mode="all" />} />
          <Route path="/live" element={<LiveSports />} />
          <Route path="/esports" element={<Esports />} />
          <Route path="/virtuals" element={<VirtualSports />} />
          <Route path="/casino" element={<Casino />} />
          <Route path="/live-casino" element={<LiveCasino />} />
          <Route path="/slots" element={<Slots />} />
          <Route path="/instant" element={<InstantGames />} />
          <Route path="/promotions" element={<Promotions />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/game/:id" element={<GamePage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/help/:slug" element={<HelpPage />} />
          <Route path="/support" element={<RequireAuth><SupportPage /></RequireAuth>} />
          <Route path="/about" element={<StaticPage slug="about" />} />
          <Route path="/terms" element={<StaticPage slug="terms" />} />
          <Route path="/privacy" element={<StaticPage slug="privacy" />} />
          <Route path="/responsible-gaming" element={<StaticPage slug="responsible-gaming" />} />
          <Route path="/bonus-terms" element={<StaticPage slug="bonus-terms" />} />
          <Route path="/cookies" element={<StaticPage slug="cookies" />} />
          <Route path="/aml" element={<StaticPage slug="aml" />} />
          <Route path="/affiliates" element={<StaticPage slug="affiliates" />} />
          <Route path="/account" element={<RequireAuth><AccountLayout /></RequireAuth>}>
            <Route index element={<AccountOverview />} />
            <Route path="profile" element={<AccountProfile />} />
            <Route path="wallet" element={<AccountWallet />} />
            <Route path="deposit" element={<AccountDeposit />} />
            <Route path="bets" element={<AccountBets />} />
            <Route path="activity" element={<AccountActivity />} />
            <Route path="notifications" element={<AccountNotifications />} />
            <Route path="security" element={<AccountSecurity />} />
            <Route path="referrals" element={<AccountReferrals />} />
            <Route path="responsible" element={<AccountResponsible />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/admin" element={<RequireStaff><AdminLayout /></RequireStaff>}>
          <Route index element={<AdminDashboard />} />
          <Route path="network" element={<AdminNetworkPage />} />
          <Route path="accounts" element={<AdminAccountsPage />} />
          <Route path="roles" element={<RequireStaff master><AdminRolesPage /></RequireStaff>} />
          <Route path="games" element={<AdminGamesPage />} />
          <Route path="content" element={<AdminContentPage />} />
          <Route path="credits" element={<AdminCreditsPage />} />
          <Route path="deposits" element={<RequireStaff master><AdminDepositsPage /></RequireStaff>} />
          <Route path="support" element={<AdminSupportPage />} />
          <Route path="transfers" element={<AdminTransfersPage />} />
          <Route path="security" element={<AdminSecurityPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
          <Route path="settings" element={<RequireStaff master><AdminSettingsPage /></RequireStaff>} />
          <Route path="system" element={<AdminSystemPage />} />
        </Route>
      </Routes>
    </>
  );
}
