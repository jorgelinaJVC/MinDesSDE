import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Plus, Edit, FileText, Trash, ClipboardList } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type SeguimientoForm = {
  adultoMayorId: number | undefined;
  tipoSeguimiento: "visita" | "reporte_vulnerabilidad" | "control_medico" | "entrevista_social" | "otro";
  fecha: string;
  descripcion: string;
  observaciones: string;
  responsable: string;
};

const initialForm: SeguimientoForm = {
  adultoMayorId: undefined,
  tipoSeguimiento: "visita",
  fecha: new Date().toISOString().split('T')[0],
  descripcion: "",
  observaciones: "",
  responsable: "",
};

export default function Seguimientos() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [form, setForm] = useState<SeguimientoForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterAdulto, setFilterAdulto] = useState<string>("todos");

  const { data: seguimientos, isLoading } = trpc.seguimientos.list.useQuery();
  const { data: adultosMayores } = trpc.adultosMayores.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.seguimientos.create.useMutation({
    onSuccess: () => {
      toast.success("Seguimiento registrado exitosamente");
      utils.seguimientos.list.invalidate();
      setOpen(false);
      setForm(initialForm);
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar seguimiento");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adultoMayorId) {
      toast.error("Debe seleccionar un adulto mayor");
      return;
    }
    
    const payload = {
      ...form,
      adultoMayorId: form.adultoMayorId,
      fecha: new Date(form.fecha),
      responsable: form.responsable || user?.name || "Usuario Administrador",
    };

    if (editingId) {
      toast.info("La actualización de seguimientos requiere habilitar el endpoint en el servidor.");
      setOpen(false);
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const handleEdit = (seguimiento: any) => {
    setEditingId(seguimiento.id);
    setForm({
      adultoMayorId: seguimiento.adultoMayorId,
      tipoSeguimiento: seguimiento.tipoSeguimiento,
      fecha: new Date(seguimiento.fecha).toISOString().split('T')[0],
      descripcion: seguimiento.descripcion || "",
      observaciones: seguimiento.observaciones || "",
      responsable: seguimiento.responsable || "",
    });
    setViewMode(true); 
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    toast.error("El borrado de seguimientos aún no está configurado en el servidor.");
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

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "visita": return "bg-blue-500";
      case "reporte_vulnerabilidad": return "bg-red-500";
      case "control_medico": return "bg-green-500";
      case "entrevista_social": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const filteredSeguimientos = seguimientos?.filter((seg) => {
    const tipoMatch = filterTipo === "todos" || seg.tipoSeguimiento === filterTipo;
    const adultoMatch = filterAdulto === "todos" || seg.adultoMayorId === Number(filterAdulto);
    return tipoMatch && adultoMatch;
  });

  const adultoMayorSeleccionado = adultosMayores?.find(am => am.id === form.adultoMayorId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-purple-950 flex items-center gap-2">
  <ClipboardList className="h-8 w-8 text-[#5B2D8E]" />
  Seguimientos
</h1>
 <p className="text-muted-foreground mt-2">
            Historial de visitas, reportes y controles
          </p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setForm(initialForm);
            setEditingId(null);
            setViewMode(false);
          }
        }}>
          <DialogTrigger asChild>
<Button className="bg-[#5B2D8E] hover:bg-[#4a2473] text-white" onClick={() => { setForm(initialForm); setEditingId(null); setViewMode(false); }}>
  <Plus className="h-4 w-4 mr-2" />
  Nuevo Seguimiento
</Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[90vh] overflow-y-auto p-6 bg-white">
            
            {viewMode ? (
              // ==========================================
              // MODO VISTA (Sólo Lectura)
              // ==========================================
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <DialogTitle className="text-3xl font-bold text-blue-900">
                      Registro de Seguimiento
                    </DialogTitle>
                    <DialogDescription className="text-lg mt-2 text-slate-600 flex items-center gap-3">
                      <Badge className={getTipoColor(form.tipoSeguimiento)}>
                        {getTipoLabel(form.tipoSeguimiento)}
                      </Badge>
                      <span>| Fecha: {new Date(form.fecha).toLocaleDateString('es-AR')}</span>
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button type="button" variant="outline" className="border-blue-500 text-blue-700" onClick={() => setViewMode(false)}>
                      <Edit className="h-4 w-4 mr-2" /> Editar Registro
                    </Button>
                    <Button type="button" variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(editingId!)}>
                      <Trash className="h-4 w-4 mr-2" /> Eliminar
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                  <section className="space-y-6">
                    <h3 className="font-bold text-lg text-slate-800 border-b-2 border-slate-100 pb-2">Datos Generales</h3>
                    <div className="grid grid-cols-1 gap-y-6 text-sm">
                      <div>
                        <span className="font-semibold text-slate-500 block mb-1">Adulto Mayor:</span>
                        <div className="bg-blue-50/50 p-3 rounded-md border border-blue-100">
                          {adultoMayorSeleccionado 
                            ? <span className="font-medium text-blue-900 text-base">{adultoMayorSeleccionado.nombre} {adultoMayorSeleccionado.apellido} <span className="text-blue-600/70 text-sm font-normal">(DNI: {adultoMayorSeleccionado.dni})</span></span>
                            : "S/D"
                          }
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500 block mb-1">Responsable del seguimiento:</span>
                        <p className="text-base text-slate-800">{form.responsable || "S/D"}</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h3 className="font-bold text-lg text-slate-800 border-b-2 border-slate-100 pb-2">Detalles</h3>
                    <div className="text-sm">
                      <span className="font-semibold text-slate-500 block mb-2">Descripción de lo actuado:</span>
                      <div className="bg-white p-4 rounded-md border border-slate-200 text-slate-700 whitespace-pre-wrap min-h-[100px] shadow-sm text-base">
                        {form.descripcion || <span className="italic opacity-60">Sin descripción.</span>}
                      </div>
                    </div>
                    <div className="text-sm mt-4">
                      <span className="font-semibold text-slate-500 block mb-2">Observaciones Adicionales:</span>
                      <div className="bg-slate-50 p-4 rounded-md border border-slate-200 text-slate-700 whitespace-pre-wrap min-h-[80px]">
                        {form.observaciones || <span className="italic opacity-60">Sin observaciones registradas.</span>}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              // ==========================================
              // MODO FORMULARIO (Creación / Edición)
              // ==========================================
              <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-6">
                <DialogHeader className="mb-4 border-b pb-4">
                  <DialogTitle className="text-2xl font-semibold text-slate-900">
                    {editingId ? "Modificar Seguimiento" : "Nuevo Seguimiento"}
                  </DialogTitle>
                  <DialogDescription className="text-base text-slate-500">
                    Registre una nueva visita, reporte o control.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  <h3 className="text-blue-700 font-semibold uppercase tracking-wide text-sm">DATOS DEL SEGUIMIENTO</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2 col-span-2 md:col-span-1">
                      <Label className="font-semibold text-slate-800">Adulto Mayor *</Label>
                      <Select
                        value={form.adultoMayorId?.toString() || ""}
                        onValueChange={(value) => setForm({ ...form, adultoMayorId: Number(value) })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Seleccione un adulto mayor" />
                        </SelectTrigger>
                        <SelectContent>
                          {adultosMayores?.map((am) => (
                            <SelectItem key={am.id} value={am.id.toString()}>
                              {am.nombre} {am.apellido} (DNI: {am.dni})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label className="font-semibold text-slate-800">Responsable</Label>
                      <Input
                        id="responsable"
                        className="h-11"
                        value={form.responsable || user?.name || "Usuario Administrador"}
                        onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <Label className="font-semibold text-slate-800">Tipo de Seguimiento *</Label>
                      <Select
                        value={form.tipoSeguimiento}
                        onValueChange={(value: any) => setForm({ ...form, tipoSeguimiento: value })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visita">Visita</SelectItem>
                          <SelectItem value="reporte_vulnerabilidad">Reporte de Vulnerabilidad</SelectItem>
                          <SelectItem value="control_medico">Control Médico</SelectItem>
                          <SelectItem value="entrevista_social">Entrevista Social</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label className="font-semibold text-slate-800">Fecha *</Label>
                      <Input
                        id="fecha"
                        type="date"
                        className="h-11"
                        value={form.fecha}
                        onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-2 pt-2 border-t mt-4">
                    <Label className="font-semibold text-slate-800 mt-4">Descripción del Seguimiento *</Label>
                    <Textarea
                      id="descripcion"
                      value={form.descripcion}
                      onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                      rows={5}
                      className="resize-none text-base p-3"
                      placeholder="Detalle aquí las acciones realizadas..."
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className="font-semibold text-slate-800">Observaciones (Opcional)</Label>
                    <Textarea
                      id="observaciones"
                      value={form.observaciones}
                      onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                      rows={3}
                      className="resize-none bg-slate-50 text-base p-3"
                    />
                  </div>
                </div>

                <DialogFooter className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 font-medium" disabled={createMutation.isPending}>
                    {editingId ? "Actualizar Seguimiento" : "Registrar Seguimiento"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="filterTipo">Filtrar por Tipo</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="visita">Visita</SelectItem>
                  <SelectItem value="reporte_vulnerabilidad">Reporte de Vulnerabilidad</SelectItem>
                  <SelectItem value="control_medico">Control Médico</SelectItem>
                  <SelectItem value="entrevista_social">Entrevista Social</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filterAdulto">Filtrar por Adulto Mayor</Label>
              <Select value={filterAdulto} onValueChange={setFilterAdulto}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los adultos</SelectItem>
                  {adultosMayores?.map((am) => (
                    <SelectItem key={am.id} value={am.id.toString()}>
                      {am.nombre} {am.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tabla" className="w-full">
        <TabsList>
          <TabsTrigger value="tabla">Vista Tabla</TabsTrigger>
          <TabsTrigger value="tarjetas">Vista Tarjetas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tabla" className="mt-4">
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : filteredSeguimientos && filteredSeguimientos.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Adulto Mayor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSeguimientos.map((seguimiento) => {
                      const adultoMayor = adultosMayores?.find(am => am.id === seguimiento.adultoMayorId);
                      return (
                        <TableRow key={seguimiento.id}>
                          <TableCell className="font-medium">
                            {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido}` : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge className={getTipoColor(seguimiento.tipoSeguimiento)}>
                              {getTipoLabel(seguimiento.tipoSeguimiento)}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(seguimiento.fecha).toLocaleDateString('es-AR')}</TableCell>
                          <TableCell>{seguimiento.responsable || "N/A"}</TableCell>
                          <TableCell className="max-w-xs truncate">{seguimiento.descripcion}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(seguimiento)}
                            >
                              <FileText className="h-4 w-4 text-blue-600" />
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
                <History className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">No hay seguimientos registrados</p>
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer seguimiento
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tarjetas" className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : filteredSeguimientos && filteredSeguimientos.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSeguimientos.map((seguimiento) => {
                const adultoMayor = adultosMayores?.find(am => am.id === seguimiento.adultoMayorId);
                return (
                  <Card key={seguimiento.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <History className="h-5 w-5 text-blue-600" />
                            {getTipoLabel(seguimiento.tipoSeguimiento)}
                          </CardTitle>
                          <CardDescription className="mt-2 text-slate-800 font-medium">
                            {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido}` : "N/A"}
                          </CardDescription>
                        </div>
                        <Badge className={getTipoColor(seguimiento.tipoSeguimiento)}>
                          {getTipoLabel(seguimiento.tipoSeguimiento)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <p><strong>Fecha:</strong> {new Date(seguimiento.fecha).toLocaleDateString('es-AR')}</p>
                        <p><strong>Responsable:</strong> {seguimiento.responsable || "N/A"}</p>
                        <div className="pt-2 border-t">
                          <p><strong>Descripción:</strong></p>
                          <p className="text-xs text-slate-600 line-clamp-3 mt-1 bg-slate-50 p-2 rounded">{seguimiento.descripcion}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(seguimiento)}
                          className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">No hay seguimientos registrados</p>
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer seguimiento
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}