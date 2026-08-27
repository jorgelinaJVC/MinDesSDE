import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Users, Building2, AlertTriangle, FileText, History, LayoutDashboard } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: alertasPendientes, isLoading: alertasLoading } = trpc.alertas.listPendientes.useQuery();
  const { data: seguimientos, isLoading: seguimientosLoading } = trpc.seguimientos.list.useQuery();
  const { data: adultosMayores } = trpc.adultosMayores.list.useQuery();

  const alertasCriticas = alertasPendientes?.filter(a => a.prioridad === "critica" || a.prioridad === "alta") || [];

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "critica": return "bg-red-500 text-white";
      case "alta": return "bg-orange-500 text-white";
      case "media": return "bg-yellow-500 text-white";
      default: return "bg-blue-500 text-white";
    }
  };

  const getTipoAlertaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      falta_medicacion: "Falta de Medicación",
      maltrato: "Maltrato",
      habilitacion_vencida: "Habilitación Vencida",
      salud_critica: "Salud Crítica",
      abandono: "Abandono",
      otro: "Otro"
    };
    return labels[tipo] || tipo;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-purple-950 flex items-center gap-2">
  <LayoutDashboard className="h-8 w-8 text-[#5B2D8E]" />
  Panel de Control
</h1>  
<p className="text-muted-foreground mt-2">
          Sistema de Gestión de Adultos Mayores - Santiago del Estero
        </p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adultos Mayores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalAdultosMayores || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Total de personas registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Residencias de Larga Estadia</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalGeriatricos || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Establecimientos activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.alertasPendientes || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Requieren atención
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casos Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{stats?.alertasCriticas || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Atención urgente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas críticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Alertas Críticas y de Alta Prioridad
          </CardTitle>
          <CardDescription>
            Casos que requieren atención inmediata
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alertasLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : alertasCriticas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay alertas críticas en este momento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertasCriticas.slice(0, 5).map((alerta) => (
                <div
                  key={alerta.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getPrioridadColor(alerta.prioridad)}>
                        {alerta.prioridad.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {getTipoAlertaLabel(alerta.tipoAlerta)}
                      </Badge>
                    </div>
                    <h4 className="font-semibold">{alerta.titulo}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {alerta.descripcion}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Detectada: {new Date(alerta.fechaDeteccion).toLocaleString('es-AR')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/alertas`)}
                  >
                    Ver Detalles
                  </Button>
                </div>
              ))}
              {alertasCriticas.length > 5 && (
                <Button
                  variant="link"
                  className="w-full"
                  onClick={() => setLocation("/alertas")}
                >
                  Ver todas las alertas ({alertasCriticas.length})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Últimos seguimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Últimos Seguimientos
          </CardTitle>
          <CardDescription>
            Visitas y reportes recientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {seguimientosLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : seguimientos && seguimientos.length > 0 ? (
            <div className="space-y-3">
              {seguimientos.slice(0, 5).map((seg) => {
                const adultoMayor = adultosMayores?.find(am => am.id === seg.adultoMayorId);
                return (
                  <div
                    key={seg.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {seg.tipoSeguimiento === "visita" ? "Visita" :
                           seg.tipoSeguimiento === "reporte_vulnerabilidad" ? "Reporte" :
                           seg.tipoSeguimiento === "control_medico" ? "Control" :
                           seg.tipoSeguimiento === "entrevista_social" ? "Entrevista" : "Otro"}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-sm">
                        {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido}` : "N/A"}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(seg.fecha).toLocaleDateString('es-AR')} - {seg.responsable}
                      </p>
                    </div>
                  </div>
                );
              })}
              {seguimientos.length > 5 && (
                <Button
                  variant="link"
                  className="w-full"
                  onClick={() => setLocation("/visitas-reportes")}
                >
                  Ver todos los seguimientos ({seguimientos.length})
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay seguimientos registrados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accesos rápidos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/adultos-mayores")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Adultos Mayores
            </CardTitle>
            <CardDescription>
              Gestionar legajos digitales y expedientes
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/geriatricos")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Residencias de Larga Estadia
            </CardTitle>
            <CardDescription>
              Administrar establecimientos y habilitaciones
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/visitas-reportes")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Visitas y Reportes
            </CardTitle>
            <CardDescription>
              Ver listado consolidado de seguimientos
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/derivaciones")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Derivaciones Judiciales
            </CardTitle>
            <CardDescription>
              Registrar y consultar derivaciones a la Justicia
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
