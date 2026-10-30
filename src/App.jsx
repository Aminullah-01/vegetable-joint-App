import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, CartProvider, ToastProvider } from './context';
import { AppRoutes } from './routes';
import {
  ErrorBoundary,
  SessionExpiredModal,
  OfflineBanner,
} from './components';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <OfflineBanner />
              <AppRoutes />
              <SessionExpiredModal />
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
