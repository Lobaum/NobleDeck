import React from 'react';
import './App.css';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { ProductModal } from './components/ProductModal';
import { TournamentModal } from './components/TournamentModal';
import { AuthModal } from './components/AuthModal';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { TournamentsPage } from './pages/TournamentsPage';
import { DashboardPage } from './pages/DashboardPage';
import { AboutPage } from './pages/AboutPage';
import { AdminPage } from './pages/AdminPage';
import { ThemeProvider } from './context/ThemeContext';

const AppContent: React.FC = () => {
  const { currentTab, toastMessage, toastConfirm, closeToastConfirm } = useApp();

  return (
    <>
      <Navbar />

      <main className="main-content">
        {currentTab === 'home' && <HomePage />}
        {currentTab === 'products' && <ProductsPage />}
        {currentTab === 'tournaments' && <TournamentsPage />}
        {currentTab === 'about' && <AboutPage />}
        {currentTab === 'dashboard' && <DashboardPage />}
        {currentTab === 'admin' && <AdminPage />}
      </main>

      <Footer />

      {/* Modais */}
      <CartDrawer />
      <ProductModal />
      <TournamentModal />
      <AuthModal />

      {/* Notificação Padrão */}
      {toastMessage && !toastConfirm && (
        <div className="noble-toast" role="alert">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Toast de Confirmação Interativo */}
      {toastConfirm && (
        <div className="noble-toast noble-toast-confirm" role="dialog" aria-modal="true">
          <span style={{ lineHeight: '1.4' }}>{toastConfirm.message}</span>
          <div className="noble-toast-confirm-actions">
            <button
              type="button"
              className="noble-toast-btn-cancel"
              onClick={closeToastConfirm}
            >
              {toastConfirm.cancelText || 'Cancelar'}
            </button>
            <button
              type="button"
              className="noble-toast-btn-confirm"
              onClick={() => {
                const action = toastConfirm.onConfirm;
                closeToastConfirm();
                action();
              }}
            >
              {toastConfirm.confirmText || 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
