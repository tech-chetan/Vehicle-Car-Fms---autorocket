// App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider, PAGE_KEYS } from './context/AuthContext';

// Pages
import Login from './pages/Login';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PurchaseCar = lazy(() => import('./pages/PurchaseCar'));
const VehicleOnEmi = lazy(() => import('./pages/VehicleOnEmi'));
const Challans = lazy(() => import('./pages/Challans'));
const Fastag = lazy(() => import('./pages/Fastag'));
const Insurance = lazy(() => import('./pages/Insurance'));
const CarRepair = lazy(() => import('./pages/CarRepair'));
const AccidentClaims = lazy(() => import('./pages/AccidentClaims'));
const VendorOffers = lazy(() => import('./pages/VendorOffers'));
const Approvals = lazy(() => import('./pages/Approvals'));
const DeliveryPlanning = lazy(() => import('./pages/DeliveryPlanning'));
const DeliveryOfCar = lazy(() => import('./pages/DeliveryOfCar'));
const Payment = lazy(() => import('./pages/Payment'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const DailyTrips = lazy(() => import('./pages/DailyTrips'));
const FuelEntries = lazy(() => import('./pages/FuelEntries'));
const VehicleReports = lazy(() => import('./pages/VehicleReports'));
const FlowChart = lazy(() => import('./pages/FlowChart'));

function AppRoutes() {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<Login />} />

      {/* Protected Application Routes inside Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.DASHBOARD}>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-car"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.PURCHASE_CAR}>
            <Layout>
              <PurchaseCar />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vehicle-emi"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.VEHICLE_EMI}>
            <Layout>
              <VehicleOnEmi />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vehicle-on-emi"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.VEHICLE_EMI}>
            <Layout>
              <VehicleOnEmi />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/challans"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.CHALLANS}>
            <Layout>
              <Challans />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-car/challans"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.CHALLANS}>
            <Layout>
              <Challans />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fastags"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.FASTAG}>
            <Layout>
              <Fastag />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-car/fastag"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.FASTAG}>
            <Layout>
              <Fastag />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fastag"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.FASTAG}>
            <Layout>
              <Fastag />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/insurance"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.INSURANCE}>
            <Layout>
              <Insurance />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/car-repair"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.CAR_REPAIR}>
            <Layout>
              <CarRepair />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/accident-claims"
        element={<Navigate to="/accident-claims/claim-of-accident" replace />}
      />
      <Route
        path="/accident-claims/claim-of-accident"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.ACCIDENT_CLAIMS}>
            <Layout>
              <AccidentClaims defaultStage="incident" />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/accident-claims/process-of-claim"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.ACCIDENT_CLAIMS}>
            <Layout>
              <AccidentClaims defaultStage="process" />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/accident-claims/claim-settlement"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.ACCIDENT_CLAIMS}>
            <Layout>
              <AccidentClaims defaultStage="settlement" />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor-offers"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.VENDOR_OFFERS}>
            <Layout>
              <VendorOffers />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/approvals"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.APPROVALS}>
            <Layout>
              <Approvals />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/delivery"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.DELIVERY}>
            <Layout>
              <DeliveryOfCar />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/delivery-planning"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.DELIVERY}>
            <Layout>
              <DeliveryOfCar />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.PAYMENT}>
            <Layout>
              <Payment />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/trips"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.TRIPS}>
            <Layout>
              <DailyTrips />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fuel"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.FUEL}>
            <Layout>
              <FuelEntries />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.REPORTS}>
            <Layout>
              <VehicleReports />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/flow"
        element={
          <ProtectedRoute pageKey={PAGE_KEYS.DASHBOARD}>
            <Layout>
              <FlowChart />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Admin Only Route */}
      <Route
        path="/users"
        element={
          <ProtectedRoute adminOnly={true}>
            <Layout>
              <UserManagement />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #d1fae5',
              borderRadius: '14px',
              fontSize: '13.5px',
              fontFamily: 'inherit',
              fontWeight: 600,
              padding: '12px 18px',
              boxShadow: '0 10px 25px rgba(5, 150, 105, 0.1)',
            },
            success: {
              iconTheme: { primary: '#059669', secondary: '#ffffff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
            },
          }}
        />
        <Suspense fallback={null}>
          <AppRoutes />
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
