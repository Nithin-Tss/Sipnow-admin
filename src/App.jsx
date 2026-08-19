import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Offers from "./pages/Offers";
import Promotions from "./pages/Promotions";
import Users from "./pages/Users";
import Stock from "./pages/Stock";
import ProviderMaps from "./pages/ProviderMaps";
import Catalogue from "./pages/Catalogue";
import Orders from "./pages/Orders";
import Reviews from "./pages/Reviews";
import Messages from "./pages/Messages";
import Account from "./pages/Account";
import Coupons from "./pages/Coupons";
import GiftCards from "./pages/GiftCards";
import Compare from "./pages/Compare";
import Stores from "./pages/Stores";

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="catalogue" element={<Catalogue />} />
            <Route path="offers" element={<Offers />} />
            <Route path="promotions" element={<Promotions />} />
            <Route path="users" element={<Users />} />
            <Route path="stock" element={<Stock />} />
            <Route path="provider-maps" element={<ProviderMaps />} />
            <Route path="orders" element={<Orders />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="gift-cards" element={<GiftCards />} />
            <Route path="stores" element={<Stores />} />
            <Route path="compare" element={<Compare />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="messages" element={<Messages />} />
            <Route path="account" element={<Account />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
