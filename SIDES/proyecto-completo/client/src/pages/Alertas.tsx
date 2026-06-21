import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Plus, CheckCircle, Clock, Bell, Eye, Edit, Trash, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type AlertaForm = {
  adultoMayorId: number | undefined;
  tipoAlerta: "falta_medicacion" | "salud_critica" | "abandono" | "abuso_economico" | "abuso_psicologico" | "abuso_fisico" | "otro";
  prioridad: "baja" | "media" | "alta" | "critica";
  titulo: string;
  descripcion: string;
};

const initialForm: AlertaForm = {
  adultoMayorId: undefined,
  tipoAlerta: "otro",
  prioridad: "media",
  titulo: "",
  descripcion: "",
};

export default function Alertas() {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [alertaView, setAlertaView] = useState<any>(null);
  
  const [form, setForm] = useState<AlertaForm>(initialForm);
  const [resolverOpen, setResolverOpen] = useState(false);
  const [alertaSeleccionada, setAlertaSeleccionada] = useState<number | null>(null);
  const [resolucionForm, setResolucionForm] = useState({
    responsableAtencion: "",
    observacionesResolucion: "",
  });

  const { data: alertas, isLoading } = trpc.alertas.list.useQuery();
  const { data: adultosMayores } = trpc.adultosMayores.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.alertas.create.useMutation({
    onSuccess: () => {
      toast.success("Alerta creada exitosamente");
      utils.alertas.list.invalidate();
      utils.alertas.listPendientes.invalidate();
      utils.dashboard.stats.invalidate();
      setOpen(false);
      setForm(initialForm);
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear alerta");
    },
  });

  const updateMutation = trpc.alertas.update.useMutation({
    onSuccess: () => {
      toast.success("Alerta actualizada exitosamente");
      utils.alertas.list.invalidate();
      utils.alertas.listPendientes.invalidate();
      utils.dashboard.stats.invalidate();
      setResolverOpen(false);
      setAlertaSeleccionada(null);
      setResolucionForm({ responsableAtencion: "", observacionesResolucion: "" });
      
      if (editingId) {
        setOpen(false);
        setEditingId(null);
        setForm(initialForm);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar alerta");
    },
  });

  const deleteMutation = trpc.alertas.delete.useMutation({
    onSuccess: () => {
      toast.success("Alerta eliminada correctamente");
      utils.alertas.list.invalidate();
      utils.alertas.listPendientes.invalidate();
      utils.dashboard.stats.invalidate();
      setOpen(false);
      setViewMode(false);
      setAlertaView(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar alerta");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adultoMayorId) {
      toast.error("Debe seleccionar un adulto mayor");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form } as any);
    } else {
      createMutation.mutate(form as any);
    }
  };

  const handleResolver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertaSeleccionada) return;
    
    updateMutation.mutate({
      id: alertaSeleccionada,
      estado: "resuelta",
      fechaResolucion: new Date(),
      ...resolucionForm,
    });
  };

  const handleCambiarEstado = (alertaId: number, estado: "pendiente" | "en_atencion" | "resuelta") => {
    let responsableAtencion: string | undefined = undefined;

    if (estado === "en_atencion") {
      const nombreResponsable = prompt("Por favor, ingrese el nombre del responsable de la atención:");
      
      if (nombreResponsable === null) return; // Si cancela el prompt, detenemos la ejecución
      
      if (nombreResponsable.trim() === "") {
        toast.error("Debe ingresar un responsable para cambiar el estado a 'En Atención'");
        return;
      }
      
      responsableAtencion = nombreResponsable.trim();
    }

    updateMutation.mutate({ 
      id: alertaId, 
      estado, 
      responsableAtencion 
    } as any);
  };

  const handleVerDetalles = (alerta: any) => {
    setAlertaView(alerta);
    setViewMode(true);
    setOpen(true);
  };

  const handleEditarOriginal = () => {
    if (!alertaView) return;
    setForm({
      adultoMayorId: alertaView.adultoMayorId,
      tipoAlerta: alertaView.tipoAlerta,
      prioridad: alertaView.prioridad,
      titulo: alertaView.titulo,
      descripcion: alertaView.descripcion,
    });
    setEditingId(alertaView.id);
    setViewMode(false);
  };

  const handleEliminarAlerta = () => {
    if (!alertaView) return;
    if (confirm("🚨 ¿Estás seguro de que deseas eliminar esta alerta por completo? Esta acción no se puede deshacer.")) {
      deleteMutation.mutate({ id: alertaView.id });
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "critica": return "bg-red-500 text-white hover:bg-red-500";
      case "alta": return "bg-orange-500 text-white hover:bg-orange-500";
      case "media": return "bg-yellow-500 text-slate-900 hover:bg-yellow-500";
      default: return "bg-blue-500 text-white hover:bg-blue-500";
    }
  };

  const getPrioridadBorder = (prioridad: string) => {
    switch (prioridad) {
      case "critica": return "border-l-4 border-l-red-500";
      case "alta": return "border-l-4 border-l-orange-500";
      case "media": return "border-l-4 border-l-yellow-500";
      default: return "border-l-4 border-l-blue-500";
    }
  };

  const getTipoAlertaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      falta_medicacion: "Falta de Medicación",
      salud_critica: "Salud Crítica",
      abandono: "Abandono",
      abuso_economico: "Abuso Económico",
      abuso_psicologico: "Abuso Psicológico",
      abuso_fisico: "Abuso Físico",
      otro: "Otro"
    };
    return labels[tipo] || tipo;
  };

  const alertasPendientes = alertas?.filter(a => a.estado === "pendiente" || a.estado === "en_atencion") || [];
  const alertasResueltas = alertas?.filter(a => a.estado === "resuelta") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
<h1 className="text-3xl font-bold tracking-tight text-purple-950 flex items-center gap-2">
  <Bell className="h-8 w-8 text-[#5B2D8E]" />
  Alertas
</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de casos críticos y situaciones de vulnerabilidad
          </p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setForm(initialForm);
            setEditingId(null);
            setViewMode(false);
            setAlertaView(null);
          }
        }}>
         <Button className="bg-[#5B2D8E] hover:bg-[#4a2473] text-white" onClick={() => { setForm(initialForm); setEditingId(null); setViewMode(false); setOpen(true); }}>
  <Plus className="h-4 w-4 mr-2" />
  Nueva Alerta
</Button>
          
          <DialogContent className="sm:max-w-[95vw] w-[95vw] max-h-[95vh] overflow-y-auto p-6">
            {viewMode && alertaView ? (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <DialogTitle className="text-3xl font-bold text-red-900 flex items-center gap-2">
                      <AlertCircle className="h-8 w-8" />
                      {alertaView.titulo}
                    </DialogTitle>
                    <DialogDescription className="text-lg mt-1 text-slate-600">
                      Registro de situación de vulnerabilidad
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={`text-sm px-4 py-1 ${getPrioridadColor(alertaView.prioridad)}`}>
                      PRIORIDAD {alertaView.prioridad.toUpperCase()}
                    </Badge>
                    <Badge variant={alertaView.estado === "resuelta" ? "default" : "secondary"} className={`text-sm px-4 py-1 ${alertaView.estado === "resuelta" ? "bg-green-600 text-white" : ""}`}>
                      {alertaView.estado.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                  <div className="space-y-6">
                    <section>
                      <h3 className="font-bold text-lg text-slate-800 border-b-2 border-slate-100 pb-2 mb-3">Datos del Afectado</h3>
                      <div className="grid grid-cols-1 gap-4 bg-slate-50 p-4 rounded-md border">
                        {(() => {
                          const am = adultosMayores?.find(a => a.id === alertaView.adultoMayorId);
                          return am ? (
                            <>
                              <div className="grid gap-1"><Label className="text-slate-500">Nombre Completo</Label><p className="font-semibold">{am.nombre} {am.apellido}</p></div>
                              <div className="grid gap-1"><Label className="text-slate-500">DNI</Label><p className="font-semibold">{am.dni}</p></div>
                              <div className="grid gap-1"><Label className="text-slate-500">N° Legajo / Expediente</Label><p className="font-semibold">{am.numeroLegajo} {am.expediente ? `(${am.expediente})` : ""}</p></div>
                              <div className="grid gap-1"><Label className="text-slate-500">Domicilio</Label><p className="font-semibold">{am.domicilio} - {am.barrio}</p></div>
                            </>
                          ) : <p className="text-muted-foreground">Datos del adulto mayor no encontrados.</p>;
                        })()}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section>
                      <h3 className="font-bold text-lg text-slate-800 border-b-2 border-slate-100 pb-2 mb-3">Detalles de la Alerta</h3>
                      <div className="grid grid-cols-2 gap-y-4 text-sm">
                        <p><span className="font-semibold text-slate-500 block mb-1">Tipo de Situación:</span><Badge variant="outline">{getTipoAlertaLabel(alertaView.tipoAlerta)}</Badge></p>
                        <p><span className="font-semibold text-slate-500 block mb-1">Fecha de Detección:</span>{new Date(alertaView.fechaDeteccion).toLocaleString('es-AR')}</p>
                      </div>
                      <div className="mt-4">
                        <span className="font-semibold text-slate-500 block mb-2">Descripción del hecho:</span>
                        <div className="bg-red-50/50 p-4 rounded-md border border-red-100 whitespace-pre-wrap text-slate-700">
                          {alertaView.descripcion}
                        </div>
                      </div>
                    </section>
                  </div>
                </div>

                {alertaView.estado === "resuelta" && (
                  <div className="mt-8 border-t pt-6">
                    <h3 className="font-bold text-xl text-green-800 flex items-center gap-2 mb-4">
                      <CheckCircle className="h-6 w-6" /> Detalles de Resolución
                    </h3>
                    <div className="bg-green-50 p-6 rounded-md border border-green-200 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="col-span-1">
                        <p><span className="font-semibold text-slate-500 block">Responsable de Atención:</span> {alertaView.responsableAtencion}</p>
                        <p className="mt-4"><span className="font-semibold text-slate-500 block">Fecha Resolución:</span> {alertaView.fechaResolucion ? new Date(alertaView.fechaResolucion).toLocaleString('es-AR') : "--"}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="font-semibold text-slate-500 block mb-2">Observaciones y medidas tomadas:</span>
                        <p className="text-slate-700 whitespace-pre-wrap">{alertaView.observacionesResolucion}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-6 border-t pt-4">
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-blue-500 text-blue-700 hover:bg-blue-50" onClick={handleEditarOriginal}>
                      <Edit className="h-4 w-4 mr-2" /> Editar Alerta
                    </Button>
                    <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={handleEliminarAlerta}>
                      <Trash className="h-4 w-4 mr-2" /> Eliminar Registro
                    </Button>
                  </div>
                  <Button variant="secondary" onClick={() => setOpen(false)}>Cerrar Registro</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <DialogHeader className="shrink-0">
                  <DialogTitle className="text-2xl font-bold text-slate-800">
                    {editingId ? "Editar Alerta de Vulnerabilidad" : "Nueva Alerta de Vulnerabilidad"}
                  </DialogTitle>
                  <DialogDescription className="text-base text-slate-500 mt-2">
                    Registre un caso crítico que requiere intervención y seguimiento inmediato.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-6 border-t pt-6">
                  <div className="grid gap-2">
                    <Label htmlFor="adultoMayorId" className="font-bold text-slate-700">Titular Afectado *</Label>
                    <Select
                      value={form.adultoMayorId?.toString() || ""}
                      onValueChange={(value) => setForm({ ...form, adultoMayorId: Number(value) })}
                    >
                      <SelectTrigger className="h-12 text-lg">
                        <SelectValue placeholder="Seleccione o busque un adulto mayor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {adultosMayores?.map((am) => (
                          <SelectItem key={am.id} value={am.id.toString()}>
                            {am.nombre} {am.apellido} (DNI: {am.dni}) - Legajo: {am.numeroLegajo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="tipoAlerta" className="font-bold text-slate-700">Categoría de la Situación *</Label>
                      <Select
                        value={form.tipoAlerta}
                        onValueChange={(value: any) => setForm({ ...form, tipoAlerta: value })}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="falta_medicacion">Falta de Medicación</SelectItem>
                          <SelectItem value="salud_critica">Salud Crítica</SelectItem>
                          <SelectItem value="abandono">Abandono</SelectItem>
                          <SelectItem value="abuso_economico">Abuso Económico</SelectItem>
                          <SelectItem value="abuso_psicologico">Abuso Psicológico</SelectItem>
                          <SelectItem value="abuso_fisico">Abuso Físico</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="prioridad" className="font-bold text-slate-700">Nivel de Prioridad *</Label>
                      <Select
                        value={form.prioridad}
                        onValueChange={(value: any) => setForm({ ...form, prioridad: value })}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baja">Baja (Seguimiento regular)</SelectItem>
                          <SelectItem value="media">Media (Requiere visita pronto)</SelectItem>
                          <SelectItem value="alta">Alta (Intervención urgente)</SelectItem>
                          <SelectItem value="critica">Crítica (Riesgo de vida / Delito)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="titulo" className="font-bold text-slate-700">Título o Resumen Breve *</Label>
                    <Input
                      id="titulo"
                      placeholder="Ej: Vecinos denuncian abandono de persona..."
                      className="h-12 text-base"
                      value={form.titulo}
                      onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="descripcion" className="font-bold text-slate-700">Descripción detallada de los hechos *</Label>
                    <Textarea
                      id="descripcion"
                      placeholder="Detalle de forma objetiva todo lo observado, denunciado o manifestado por el titular..."
                      className="min-h-[200px] text-base resize-none p-4"
                      value={form.descripcion}
                      onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <DialogFooter className="mt-6 border-t pt-6">
                  <Button variant="outline" type="button" onClick={() => {
                    if (editingId && alertaView) {
                      setViewMode(true);
                      setEditingId(null);
                    } else {
                      setOpen(false);
                    }
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white">
                    {editingId ? "Actualizar Alerta" : "Registrar Alerta"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="pendientes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pendientes" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendientes ({alertasPendientes.length})
          </TabsTrigger>
          <TabsTrigger value="resueltas" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Resueltas ({alertasResueltas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes" className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : alertasPendientes.length > 0 ? (
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-[110px]">Prioridad</TableHead>
                      <TableHead className="w-[120px]">Estado</TableHead>
                      <TableHead>Título / Residente</TableHead>
                      <TableHead className="w-[160px]">Categoría</TableHead>
                      <TableHead className="w-[150px]">Responsable</TableHead>
                      <TableHead className="w-[140px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertasPendientes.map((alerta) => {
                      const adultoMayor = adultosMayores?.find(am => am.id === alerta.adultoMayorId);
                      return (
                        <TableRow key={alerta.id} className={`hover:bg-muted/30 transition-colors ${getPrioridadBorder(alerta.prioridad)}`}>
                          <TableCell>
                            <Badge className={`${getPrioridadColor(alerta.prioridad)} font-semibold w-24 justify-center capitalize`}>
                              {alerta.prioridad}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={alerta.estado === "en_atencion" ? "default" : "secondary"} className="w-24 justify-center">
                              {alerta.estado === "en_atencion" ? "En Atención" : "Pendiente"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm text-slate-800 line-clamp-1">{alerta.titulo}</span>
                              <span className="text-xs text-muted-foreground">
                                {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido} (Leg: ${adultoMayor.numeroLegajo})` : "Titular no encontrado"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {getTipoAlertaLabel(alerta.tipoAlerta)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-slate-700 font-medium">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span>{alerta.responsableAtencion || <span className="text-xs text-muted-foreground font-normal italic">Sin asignar</span>}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleVerDetalles(alerta)} title="Ver Detalles">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {alerta.estado === "pendiente" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                  onClick={() => handleCambiarEstado(alerta.id, "en_atencion")}
                                >
                                  Atender
                                </Button>
                              )}
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => {
                                  setAlertaSeleccionada(alerta.id);
                                  setResolverOpen(true);
                                }}
                              >
                                Resolver
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <p className="text-muted-foreground font-medium">No hay alertas pendientes en este momento.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resueltas" className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : alertasResueltas.length > 0 ? (
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-[110px]">Prioridad</TableHead>
                      <TableHead className="w-[120px]">Estado</TableHead>
                      <TableHead>Título / Residente</TableHead>
                      <TableHead className="w-[160px]">Categoría</TableHead>
                      <TableHead className="w-[180px]">Resuelto Por</TableHead>
                      <TableHead className="w-[100px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertasResueltas.map((alerta) => {
                      const adultoMayor = adultosMayores?.find(am => am.id === alerta.adultoMayorId);
                      return (
                        <TableRow key={alerta.id} className="hover:bg-muted/30 transition-colors opacity-85">
                          <TableCell>
                            <Badge className={`${getPrioridadColor(alerta.prioridad)} font-semibold w-24 justify-center capitalize`}>
                              {alerta.prioridad}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-600 text-white w-24 justify-center">Resuelta</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm text-slate-700 line-clamp-1">{alerta.titulo}</span>
                              <span className="text-xs text-muted-foreground">
                                {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido}` : "Titular no encontrado"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {getTipoAlertaLabel(alerta.tipoAlerta)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-green-800">{alerta.responsableAtencion || "Anónimo"}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {alerta.fechaResolucion ? new Date(alerta.fechaResolucion).toLocaleDateString('es-AR') : ""}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleVerDetalles(alerta)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <p className="text-muted-foreground font-medium">No hay alertas resueltas en el historial.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL PARA RESOLVER ALERTA */}
      <Dialog open={resolverOpen} onOpenChange={setResolverOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleResolver}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5"/> Resolver Alerta
              </DialogTitle>
              <DialogDescription>
                Deje constancia de la intervención realizada para cerrar el caso.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="responsableAtencion" className="font-bold">Profesional a cargo *</Label>
                <Input
                  id="responsableAtencion"
                  placeholder="Nombre del trabajador social o interviniente..."
                  value={resolucionForm.responsableAtencion}
                  onChange={(e) => setResolucionForm({ ...resolucionForm, responsableAtencion: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="observacionesResolucion" className="font-bold">Informe de Resolución *</Label>
                <Textarea
                  id="observacionesResolucion"
                  placeholder="Detalle las medidas tomadas, derivaciones realizadas y la situación actual..."
                  value={resolucionForm.observacionesResolucion}
                  onChange={(e) => setResolucionForm({ ...resolucionForm, observacionesResolucion: e.target.value })}
                  rows={6}
                  className="resize-none"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setResolverOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={updateMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                Guardar Resolución
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}