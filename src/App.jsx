import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, CartProvider } from './context';
import { AppRoutes } from './routes';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
