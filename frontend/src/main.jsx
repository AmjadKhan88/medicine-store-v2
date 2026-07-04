import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SubscriptionProvider } from './context/SubscriptionContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { OfflineBanner, UpdateBanner, InstallBanner } from './Components/PWAInstallBanner';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <NotificationProvider>
            <App />
            <Toaster position="top-right" toastOptions={{
              style: { borderRadius: '10px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '14px' },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }} />
            <OfflineBanner />
            <UpdateBanner />
            <InstallBanner />
          </NotificationProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

