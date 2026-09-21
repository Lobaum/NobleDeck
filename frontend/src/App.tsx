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
import { ThemeProvider } from './context/ThemeContext';

const AppContent: React.FC = () => {
  const { currentTab, toastMessage } = useApp();

  return (
    <>
      <Navbar />

      <main className="main-content">
        {currentTab === 'home' && <HomePage />}
        {currentTab === 'products' && <ProductsPage />}
        {currentTab === 'tournaments' && <TournamentsPage />}
        {currentTab === 'about' && <AboutPage />}
        {currentTab === 'dashboard' && <DashboardPage />}
      </main>

      <Footer />

      {/* Modais */}
      <CartDrawer />
      <ProductModal />
      <TournamentModal />
      <AuthModal />

      {/* Notificação */}
      {toastMessage && (
        <div className="noble-toast" role="alert">
          <span>{toastMessage}</span>
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
