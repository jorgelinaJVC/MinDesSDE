import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function VisitasReportes() {
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroAdultoMayor, setFiltroAdultoMayor] = useState<string>("todos");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>("");

  const { data: seguimientos, isLoading } = trpc.seguimientos.list.useQuery();
  const { data: adultosMayores } = trpc.adultosMayores.list.useQuery();

  const tiposSegumiento = [
    { value: "visita", label: "Visita" },
    { value: "reporte_vulnerabilidad", label: "Reporte de Vulnerabilidad" },
    { value: "control_medico", label: "Control Médico" },
    { value: "entrevista_social", label: "Entrevista Social" },
    { value: "otro", label: "Otro" },
  ];

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "visita": return "bg-blue-500";
      case "reporte_vulnerabilidad": return "bg-red-500";
      case "control_medico": return "bg-green-500";
      case "entrevista_social": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      visita: "Visita",
      reporte_vulnerabilidad: "Reporte de Vulnerabilidad",
      control_medico: "Control Médico",
      entrevista_social: "Entrevista Social",
      otro: "Otro"
    };
    return labels[tipo] || tipo;
  };

  // Filtrar seguimientos
  const seguimientosFiltrados = useMemo(() => {
    if (!seguimientos) return [];

    return seguimientos.filter((seg) => {
      // Filtro por tipo
      if (filtroTipo !== "todos" && seg.tipoSeguimiento !== filtroTipo) {
        return false;
      }

      // Filtro por adulto mayor
      if (filtroAdultoMayor !== "todos" && seg.adultoMayorId !== Number(filtroAdultoMayor)) {
        return false;
      }

      // Filtro por fecha desde
      if (filtroFechaDesde) {
        const fechaSeg = new Date(seg.fecha);
        const fechaDesde = new Date(filtroFechaDesde);
        if (fechaSeg < fechaDesde) {
          return false;
        }
      }

      // Filtro por fecha hasta
      if (filtroFechaHasta) {
        const fechaSeg = new Date(seg.fecha);
        const fechaHasta = new Date(filtroFechaHasta);
        if (fechaSeg > fechaHasta) {
          return false;
        }
      }

      return true;
    });
  }, [seguimientos, filtroTipo, filtroAdultoMayor, filtroFechaDesde, filtroFechaHasta]);

  const handleDescargarReporte = () => {
    // Crear contenido del reporte
    let contenido = "REPORTE DE VISITAS Y SEGUIMIENTOS\n";
    contenido += "=====================================\n\n";
    contenido += `Fecha de generación: ${new Date().toLocaleString('es-AR')}\n`;
    contenido += `Total de registros: ${seguimientosFiltrados.length}\n\n`;

    seguimientosFiltrados.forEach((seg) => {
      const adultoMayor = adultosMayores?.find(am => am.id === seg.adultoMayorId);
      contenido += `\n---\n`;
      contenido += `Adulto Mayor: ${adultoMayor?.nombre} ${adultoMayor?.apellido}\n`;
      contenido += `Legajo: ${adultoMayor?.numeroLegajo}\n`;
      contenido += `Tipo: ${getTipoLabel(seg.tipoSeguimiento)}\n`;
      contenido += `Fecha: ${new Date(seg.fecha).toLocaleDateString('es-AR')}\n`;
      contenido += `Responsable: ${seg.responsable}\n`;
      contenido += `Descripción: ${seg.descripcion}\n`;
      if (seg.observaciones) {
        contenido += `Observaciones: ${seg.observaciones}\n`;
      }
    });

    // Descargar como archivo de texto
    const elemento = document.createElement("a");
    elemento.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(contenido));
    elemento.setAttribute("download", `reporte_visitas_${new Date().toISOString().split('T')[0]}.txt`);
    elemento.style.display = "none";
    document.body.appendChild(elemento);
    elemento.click();
    document.body.removeChild(elemento);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
<h1 className="text-3xl font-bold tracking-tight text-purple-950 flex items-center gap-2">
  <FileText className="h-8 w-8 text-[#5B2D8E]" />
  Visitas y Reportes
</h1>
          <p className="text-muted-foreground mt-2">
            Listado consolidado de seguimientos y reportes
          </p>
        </div>
       <Button className="bg-[#5B2D8E] hover:bg-[#4a2473] text-white" onClick={handleDescargarReporte} disabled={seguimientosFiltrados.length === 0}>
  <Download className="h-4 w-4 mr-2" />
  Descargar Reporte
</Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="filtroTipo">Tipo de Seguimiento</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {tiposSegumiento.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filtroAdultoMayor">Adulto Mayor</Label>
              <Select value={filtroAdultoMayor} onValueChange={setFiltroAdultoMayor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {adultosMayores?.map((am) => (
                    <SelectItem key={am.id} value={am.id.toString()}>
                      {am.nombre} {am.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filtroFechaDesde">Desde</Label>
              <Input
                id="filtroFechaDesde"
                type="date"
                value={filtroFechaDesde}
                onChange={(e) => setFiltroFechaDesde(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filtroFechaHasta">Hasta</Label>
              <Input
                id="filtroFechaHasta"
                type="date"
                value={filtroFechaHasta}
                onChange={(e) => setFiltroFechaHasta(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listado de seguimientos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Resultados ({seguimientosFiltrados.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : seguimientosFiltrados.length > 0 ? (
          <div className="space-y-3">
            {seguimientosFiltrados.map((seguimiento) => {
              const adultoMayor = adultosMayores?.find(am => am.id === seguimiento.adultoMayorId);
              return (
                <Card key={seguimiento.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getTipoColor(seguimiento.tipoSeguimiento)}>
                            {getTipoLabel(seguimiento.tipoSeguimiento)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(seguimiento.fecha).toLocaleDateString('es-AR')}
                          </span>
                        </div>
                        <CardTitle className="text-lg">
                          {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido}` : "N/A"}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {adultoMayor ? `Legajo: ${adultoMayor.numeroLegajo} | DNI: ${adultoMayor.dni}` : ""}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold mb-1">Descripción:</p>
                        <p className="text-sm text-muted-foreground">{seguimiento.descripcion}</p>
                      </div>
                      {seguimiento.observaciones && (
                        <div>
                          <p className="text-sm font-semibold mb-1">Observaciones:</p>
                          <p className="text-sm text-muted-foreground">{seguimiento.observaciones}</p>
                        </div>
                      )}
                      <div className="pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          Responsable: {seguimiento.responsable}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay registros que coincidan con los filtros</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
