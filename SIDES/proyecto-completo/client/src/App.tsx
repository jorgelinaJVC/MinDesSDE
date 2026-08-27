import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Geriatricos from "./pages/Geriatricos";
import AdultosMayores from "./pages/AdultosMayores";
import Alertas from "./pages/Alertas";
import Derivaciones from "./pages/Derivaciones";
import Seguimientos from "./pages/Seguimientos";
import VisitasReportes from "./pages/VisitasReportes";
import Home from "./pages/Home";
import Usuarios from "./pages/Usuarios";

function Router() {
  return (
    <Switch>
      {/* 🌐 RUTA PÚBLICA: La pantalla de Login (Va suelta, sin barra lateral) */}
      <Route path="/login" component={Home} />

      {/* 🔒 RUTAS PROTEGIDAS: Todas las que van dentro de la estructura con menú lateral */}
      <Route path="/">
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      
      <Route path="/geriatricos">
        <DashboardLayout>
          <Geriatricos />
        </DashboardLayout>
      </Route>

      <Route path="/adultos-mayores">
        <DashboardLayout>
          <AdultosMayores />
        </DashboardLayout>
      </Route>

      <Route path="/alertas">
        <DashboardLayout>
          <Alertas />
        </DashboardLayout>
      </Route>

      <Route path="/derivaciones">
        <DashboardLayout>
          <Derivaciones />
        </DashboardLayout>
      </Route>

      <Route path="/seguimientos">
        <DashboardLayout>
          <Seguimientos />
        </DashboardLayout>
      </Route>

      <Route path="/visitas-reportes">
        <DashboardLayout>
          <VisitasReportes />
        </DashboardLayout>
      </Route>

<Route path="/usuarios">
  <DashboardLayout>
    <Usuarios />
  </DashboardLayout>
</Route>

      {/* 404: Si no coincide con ninguna de las anteriores */}
      <Route path="/404">
        <NotFound />
      </Route>
      
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;