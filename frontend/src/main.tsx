import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./state/AuthContext";
import { DataProvider } from "./state/DataContext";
import { BetSlipProvider } from "./state/BetSlipContext";
import { ToastProvider } from "./state/ToastContext";
import "./styles/theme.css";
import "./styles/pages.css";
import "./styles/fantasy.css";
import "./styles/game.css";
import "./styles/admin.css";
import "./styles/bookmaker.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <BetSlipProvider>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </BetSlipProvider>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  </React.StrictMode>
);
