import { trpc } from "@/lib/trpc";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Plus, Edit, Trash, FileText, Check, X, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type GeriatricoForm = {
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  
  nombreSolicitante: string;
  dniSolicitante: string;
  nombreApoderado: string;
  dniApoderado: string;

  capacidad: number | "";
  estadoHabilitacion: string;
  fechaHabilitacion: string;
  fechaVencimientoHabilitacion: string;
  observaciones: string;

  reqNota: boolean;
  reqProyecto: boolean;
  reqDniSolicitante: boolean;
  reqDniApoderado: boolean;
  reqPlanos: boolean;
  reqEvacuacion: boolean;
  reqSeguro: boolean;
  reqComidaAfip: boolean;
  reqFotos: boolean;
};

const initialForm: GeriatricoForm = {
  nombre: "", direccion: "", telefono: "", email: "",
  nombreSolicitante: "", dniSolicitante: "", nombreApoderado: "", dniApoderado: "",
  capacidad: "", estadoHabilitacion: "en_tramite", fechaHabilitacion: "", fechaVencimientoHabilitacion: "", observaciones: "",
  reqNota: false, reqProyecto: false, reqDniSolicitante: false, reqDniApoderado: false, reqPlanos: false, reqEvacuacion: false, reqSeguro: false, reqComidaAfip: false, reqFotos: false,
};

export default function Geriatricos() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [form, setForm] = useState<GeriatricoForm>(initialForm);

  const { data: geriatricos, isLoading } = trpc.geriatricos.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.geriatricos.create.useMutation({
    onSuccess: () => {
      toast.success("Residencia creada exitosamente");
      utils.geriatricos.list.invalidate();
      setOpen(false);
      setForm(initialForm);
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear Residencia");
    },
  });

  const updateMutation = trpc.geriatricos.update.useMutation({
    onSuccess: () => {
      toast.success("Residencia actualizada exitosamente");
      utils.geriatricos.list.invalidate();
      setOpen(false);
      setForm(initialForm);
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar residencia");
    },
  });

  const deleteMutation = trpc.geriatricos.delete.useMutation({
    onSuccess: () => {
      toast.success("Residencia eliminada exitosamente");
      utils.geriatricos.list.invalidate();
      setOpen(false);
      setViewMode(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar residencia");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nombre || !form.direccion) {
      toast.error("El nombre y la dirección son obligatorios");
      return;
    }

    const payload = {
      ...form,
      capacidad: form.capacidad === "" ? undefined : Number(form.capacidad),
      fechaHabilitacion: form.fechaHabilitacion ? new Date(form.fechaHabilitacion) : undefined,
      fechaVencimientoHabilitacion: form.fechaVencimientoHabilitacion ? new Date(form.fechaVencimientoHabilitacion) : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload } as any);
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const handleEdit = (rawGeriatrico: any) => {
    const geriatrico = rawGeriatrico as any;
    setEditingId(geriatrico.id);
    setForm({
      ...initialForm,
      ...geriatrico,
      capacidad: geriatrico.capacidad || "",
      fechaHabilitacion: geriatrico.fechaHabilitacion ? new Date(geriatrico.fechaHabilitacion).toISOString().split('T')[0] : "",
      fechaVencimientoHabilitacion: geriatrico.fechaVencimientoHabilitacion ? new Date(geriatrico.fechaVencimientoHabilitacion).toISOString().split('T')[0] : "",
    });
    setViewMode(true); 
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("🚨 ¿Está seguro de eliminar por completo esta Residencia de Larga Estadia?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "vigente": return "bg-green-500 text-white";
      case "vencida": return "bg-red-500 text-white";
      case "en_tramite": return "bg-amber-500 text-white";
      case "suspendida": return "bg-slate-500 text-white";
      default: return "bg-blue-500 text-white";
    }
  };

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      vigente: "Vigente",
      vencida: "Vencida",
      en_tramite: "En Trámite",
      suspendida: "Suspendida"
    };
    return labels[estado] || estado;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
         <h1 className="text-3xl font-bold tracking-tight text-purple-950 flex items-center gap-2">
  <Building2 className="h-8 w-8 text-[#5B2D8E]" />
  Residencias de Larga Estadía
</h1>
          <p className="text-muted-foreground mt-2">
            Gestión de establecimientos, responsables y habilitaciones
          </p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) { setForm(initialForm); setEditingId(null); setViewMode(false); }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#5B2D8E] hover:bg-[#4a2473] text-white" onClick={() => { setForm(initialForm); setEditingId(null); setViewMode(false); }}>
  <Plus className="h-4 w-4 mr-2" />
  Nueva Residencia
</Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[95vw] w-[95vw] h-[95vh] overflow-y-auto flex flex-col p-6 bg-white">
            
            {viewMode ? (
              // ==========================================
              // MODO VISTA (Sólo Lectura)
              // ==========================================
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <DialogTitle className="text-3xl font-bold text-blue-900">
                      {form.nombre}
                    </DialogTitle>
                    <DialogDescription className="text-lg mt-2 text-slate-600 flex items-center gap-3">
                      <Badge className={getEstadoColor(form.estadoHabilitacion)}>
                        {getEstadoLabel(form.estadoHabilitacion)}
                      </Badge>
                      <span>| Capacidad: {form.capacidad || "0"} plazas</span>
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button type="button" variant="outline" className="border-blue-500 text-blue-700" onClick={() => setViewMode(false)}>
                      <Edit className="h-4 w-4 mr-2" /> Editar Residencia
                    </Button>
                    <Button type="button" variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(editingId!)}>
                      <Trash className="h-4 w-4 mr-2" /> Eliminar
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                  {/* COLUMNA IZQUIERDA */}
                  <div className="space-y-6">
                    <section>
                      <h3 className="font-bold text-lg text-slate-800 border-b-2 border-slate-100 pb-2 mb-3">Datos de la Institución</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                        <p><span className="font-semibold text-slate-500">Dirección:</span><br/>{form.direccion || "-"}</p>
                        <p><span className="font-semibold text-slate-500">Teléfono:</span><br/>{form.telefono || "-"}</p>
                        <p className="break-all"><span className="font-semibold text-slate-500">Email:</span><br/>{form.email || "-"}</p>
                        <p><span className="font-semibold text-slate-500">Capacidad Registrada:</span><br/>{form.capacidad || "0"} plazas</p>
                        <p><span className="font-semibold text-slate-500">Fecha de Habilitación:</span><br/>{form.fechaHabilitacion ? new Date(form.fechaHabilitacion).toLocaleDateString('es-AR') : "-"}</p>
                        <p><span className="font-semibold text-slate-500">Vencimiento:</span><br/>{form.fechaVencimientoHabilitacion ? new Date(form.fechaVencimientoHabilitacion).toLocaleDateString('es-AR') : "-"}</p>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-slate-100 text-sm">
                        <span className="font-semibold text-slate-500 block mb-2">Observaciones Generales:</span>
                        <div className="bg-slate-50 p-4 rounded-md border border-slate-200 text-slate-700 whitespace-pre-wrap min-h-[80px]">
                          {form.observaciones || <span className="italic opacity-60">Sin observaciones registradas.</span>}
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="font-bold text-lg text-slate-800 border-b-2 border-slate-100 pb-2 mb-3">Responsables Legales</h3>
                      <div className="bg-blue-50/50 p-4 rounded-md border border-blue-100 mb-4 text-sm">
                        <strong className="text-blue-800 block mb-2 text-base">Solicitante</strong>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                          <p><span className="font-semibold text-slate-500">Nombre:</span> {form.nombreSolicitante || "-"}</p>
                          <p><span className="font-semibold text-slate-500">DNI:</span> {form.dniSolicitante || "-"}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-md border border-slate-200 text-sm">
                        <strong className="text-slate-800 block mb-2 text-base">Apoderado Legal</strong>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                          <p><span className="font-semibold text-slate-500">Nombre:</span> {form.nombreApoderado || "-"}</p>
                          <p><span className="font-semibold text-slate-500">DNI:</span> {form.dniApoderado || "-"}</p>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* COLUMNA DERECHA */}
                  <div className="space-y-6">
                    <section>
                      <h3 className="font-bold text-lg text-slate-800 border-b-2 border-slate-100 pb-2 mb-3">Checklist de Documentación</h3>
                      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                        <ul className="space-y-4 text-sm">
                          <li className="flex items-center gap-3">
                            {form.reqNota ? <Check className="h-5 w-5 text-green-600 shrink-0"/> : <X className="h-5 w-5 text-slate-300 shrink-0"/>}
                            <span className={form.reqNota ? "text-slate-800 font-semibold" : "text-slate-500 line-through opacity-70"}>1. Nota solicitud al Sr. Ministro</span>
                          </li>
                          <li className="flex items-center gap-3">
                            {form.reqProyecto ? <Check className="h-5 w-5 text-green-600 shrink-0"/> : <X className="h-5 w-5 text-slate-300 shrink-0"/>}
                            <span className={form.reqProyecto ? "text-slate-800 font-semibold" : "text-slate-500 line-through opacity-70"}>2. Proyecto Institucional</span>
                          </li>
                          <li className="flex items-center gap-3">
                            {form.reqDniSolicitante ? <Check className="h-5 w-5 text-green-600 shrink-0"/> : <X className="h-5 w-5 text-slate-300 shrink-0"/>}
                            <span className={form.reqDniSolicitante ? "text-slate-800 font-semibold" : "text-slate-500 line-through opacity-70"}>3. Fotocopia de DNI de solicitante</span>
                          </li>
                          <li className="flex items-center gap-3">
                            {form.reqDniApoderado ? <Check className="h-5 w-5 text-green-600 shrink-0"/> : <X className="h-5 w-5 text-slate-300 shrink-0"/>}
                            <span className={form.reqDniApoderado ? "text-slate-800 font-semibold" : "text-slate-500 line-through opacity-70"}>4. Fotocopia del DNI Apoderado Legal</span>
                          </li>
                          <li className="flex items-center gap-3">
                            {form.reqPlanos ? <Check className="h-5 w-5 text-green-600 shrink-0"/> : <X className="h-5 w-5 text-slate-300 shrink-0"/>}
                            <span className={form.reqPlanos ? "text-slate-800 font-semibold" : "text-slate-500 line-through opacity-70"}>5. Planos del inmueble actualizados</span>
                          </li>
                          <li className="flex items-center gap-3">
                            {form.reqEvacuacion ? <Check className="h-5 w-5 text-green-600 shrink-0"/> : <X className="h-5 w-5 text-slate-300 shrink-0"/>}
                            <span className={form.reqEvacuacion ? "text-slate-800 font-semibold" : "text-slate-500 line-through opacity-70"}>6. Plan de evacuación por Bomberos y/o calidad de vida</span>
                          </li>
                          <li className="flex items-center gap-3">
                            {form.reqSeguro ? <Check className="h-5 w-5 text-green-600 shrink-0"/> : <X className="h-5 w-5 text-slate-300 shrink-0"/>}
                            <span className={form.reqSeguro ? "text-slate-800 font-semibold" : "text-slate-500 line-through opacity-70"}>7. Constancia de Cobertura de Seguro</span>
                          </li>
                          <li className="flex items-center gap-3">
                            {form.reqComidaAfip ? <Check className="h-5 w-5 text-green-600 shrink-0"/> : <X className="h-5 w-5 text-slate-300 shrink-0"/>}
                            <span className={form.reqComidaAfip ? "text-slate-800 font-semibold" : "text-slate-500 line-through opacity-70"}>8. En caso de Terciarizar comida, inscripción en AFIP</span>
                          </li>
                          <li className="flex items-center gap-3">
                            {form.reqFotos ? <Check className="h-5 w-5 text-green-600 shrink-0"/> : <X className="h-5 w-5 text-slate-300 shrink-0"/>}
                            <span className={form.reqFotos ? "text-slate-800 font-semibold" : "text-slate-500 line-through opacity-70"}>9. Fotos del Lugar</span>
                          </li>
                        </ul>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            ) : (
              // ==========================================
              // MODO FORMULARIO (Creación / Edición)
              // ==========================================
              <form onSubmit={handleSubmit} className="space-y-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-2xl font-semibold text-slate-900">
                    {editingId ? "Modificar Residencia" : "Nueva Residencia"}
                  </DialogTitle>
                  <DialogDescription className="text-base text-slate-500">
                    Complete los datos requeridos como en el documento original.
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="institucion" className="w-full mt-4">
                  <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100 p-1.5 rounded-lg h-auto">
                    <TabsTrigger value="institucion" className="py-2 text-base rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-600">
                      Institución
                    </TabsTrigger>
                    <TabsTrigger value="responsables" className="py-2 text-base rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-600">
                      Responsables
                    </TabsTrigger>
                    <TabsTrigger value="requisitos" className="py-2 text-base rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-600">
                      Checklist Requisitos
                    </TabsTrigger>
                  </TabsList>

                  {/* ====== PESTAÑA 1: INSTITUCIÓN ====== */}
                  <TabsContent value="institucion" className="space-y-6">
                    <div>
                      <h3 className="text-blue-700 font-semibold uppercase tracking-wide text-sm mb-4">DATOS DE LA INSTITUCIÓN</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="grid gap-2 col-span-2">
                          <Label>Nombre de la Institución *</Label>
                          <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                        </div>
                        <div className="grid gap-2">
                          <Label>Capacidad (Plazas)</Label>
                          <Input type="number" value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: e.target.value === "" ? "" : Number(e.target.value) })} />
                        </div>
                        
                        <div className="grid gap-2 col-span-3">
                          <Label>Dirección *</Label>
                          <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} required />
                        </div>

                        <div className="grid gap-2">
                          <Label>Teléfono</Label>
                          <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                        </div>
                        <div className="grid gap-2 col-span-2">
                          <Label>Email</Label>
                          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        </div>

                        <div className="grid gap-2">
                          <Label>Estado Habilitación</Label>
                          <Select value={form.estadoHabilitacion} onValueChange={(v) => setForm({ ...form, estadoHabilitacion: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vigente">Vigente</SelectItem>
                              <SelectItem value="en_tramite">En Trámite</SelectItem>
                              <SelectItem value="vencida">Vencida</SelectItem>
                              <SelectItem value="suspendida">Suspendida</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Fecha Habilitación</Label>
                          <Input type="date" value={form.fechaHabilitacion} onChange={(e) => setForm({ ...form, fechaHabilitacion: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                          <Label>Fecha Vencimiento</Label>
                          <Input type="date" value={form.fechaVencimientoHabilitacion} onChange={(e) => setForm({ ...form, fechaVencimientoHabilitacion: e.target.value })} />
                        </div>

                        <div className="grid gap-2 col-span-3 pt-2">
                          <Label>Observaciones Generales</Label>
                          <Textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={4} className="resize-none" />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ====== PESTAÑA 2: RESPONSABLES ====== */}
                  <TabsContent value="responsables" className="space-y-8">
                    <div>
                      <h3 className="text-blue-700 font-semibold uppercase tracking-wide text-sm mb-4">DATOS DEL SOLICITANTE</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="grid gap-2">
                          <Label>Nombre Completo</Label>
                          <Input value={form.nombreSolicitante} onChange={(e) => setForm({ ...form, nombreSolicitante: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                          <Label>D.N.I.</Label>
                          <Input value={form.dniSolicitante} onChange={(e) => setForm({ ...form, dniSolicitante: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-blue-700 font-semibold uppercase tracking-wide text-sm mb-4">DATOS DEL APODERADO LEGAL</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="grid gap-2">
                          <Label>Nombre Completo</Label>
                          <Input value={form.nombreApoderado} onChange={(e) => setForm({ ...form, nombreApoderado: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                          <Label>D.N.I.</Label>
                          <Input value={form.dniApoderado} onChange={(e) => setForm({ ...form, dniApoderado: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ====== PESTAÑA 3: CHECKLIST DE REQUISITOS ====== */}
                  <TabsContent value="requisitos" className="space-y-6">
                    <div>
                      <h3 className="text-blue-700 font-semibold uppercase tracking-wide text-sm mb-5">CHECKLIST DE HABILITACIÓN</h3>
                      
                      {/* Magia aquí: dividimos en 2 columnas (md:grid-cols-2) para que no se estire */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer shadow-sm">
                          <Checkbox checked={form.reqNota} onCheckedChange={(c) => setForm({...form, reqNota: !!c})} className="h-5 w-5 mt-0.5" />
                          <span className="text-sm font-medium leading-tight text-slate-700">1. Nota solicitud al Sr. Ministro de Desarrollo Social</span>
                        </label>
                        <label className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer shadow-sm">
                          <Checkbox checked={form.reqProyecto} onCheckedChange={(c) => setForm({...form, reqProyecto: !!c})} className="h-5 w-5 mt-0.5" />
                          <span className="text-sm font-medium leading-tight text-slate-700">2. Proyecto Institucional (asesoramiento modalidad gerontológica)</span>
                        </label>
                        <label className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer shadow-sm">
                          <Checkbox checked={form.reqDniSolicitante} onCheckedChange={(c) => setForm({...form, reqDniSolicitante: !!c})} className="h-5 w-5 mt-0.5" />
                          <span className="text-sm font-medium leading-tight text-slate-700">3. Fotocopia de DNI de solicitante</span>
                        </label>
                        <label className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer shadow-sm">
                          <Checkbox checked={form.reqDniApoderado} onCheckedChange={(c) => setForm({...form, reqDniApoderado: !!c})} className="h-5 w-5 mt-0.5" />
                          <span className="text-sm font-medium leading-tight text-slate-700">4. Fotocopia del DNI Apoderado Legal</span>
                        </label>
                        <label className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer shadow-sm">
                          <Checkbox checked={form.reqPlanos} onCheckedChange={(c) => setForm({...form, reqPlanos: !!c})} className="h-5 w-5 mt-0.5" />
                          <span className="text-sm font-medium leading-tight text-slate-700">5. Planos del inmueble actualizados</span>
                        </label>
                        <label className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer shadow-sm">
                          <Checkbox checked={form.reqEvacuacion} onCheckedChange={(c) => setForm({...form, reqEvacuacion: !!c})} className="h-5 w-5 mt-0.5" />
                          <span className="text-sm font-medium leading-tight text-slate-700">6. Plan de evacuación por Bomberos y/o calidad de vida del Municipio</span>
                        </label>
                        <label className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer shadow-sm">
                          <Checkbox checked={form.reqSeguro} onCheckedChange={(c) => setForm({...form, reqSeguro: !!c})} className="h-5 w-5 mt-0.5" />
                          <span className="text-sm font-medium leading-tight text-slate-700">7. Constancia de Cobertura de Seguro</span>
                        </label>
                        <label className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer shadow-sm">
                          <Checkbox checked={form.reqComidaAfip} onCheckedChange={(c) => setForm({...form, reqComidaAfip: !!c})} className="h-5 w-5 mt-0.5" />
                          <span className="text-sm font-medium leading-tight text-slate-700">8. En caso de Terciarizar la comida, inscripción en AFIP</span>
                        </label>
                        <label className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer shadow-sm md:col-span-2 lg:col-span-1">
                          <Checkbox checked={form.reqFotos} onCheckedChange={(c) => setForm({...form, reqFotos: !!c})} className="h-5 w-5 mt-0.5" />
                          <span className="text-sm font-medium leading-tight text-slate-700">9. Fotos del Lugar</span>
                        </label>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingId ? "Actualizar Residencia" : "Guardar Residencia"}
                  </Button>
                </DialogFooter>
              </form>
            )}

          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="tabla" className="w-full">
        <TabsList>
          <TabsTrigger value="tabla">Vista Tabla</TabsTrigger>
          <TabsTrigger value="tarjetas">Vista Tarjetas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tabla" className="mt-4">
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : geriatricos && geriatricos.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Capacidad</TableHead>
                      <TableHead>Habilitación</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {geriatricos.map((geriatrico: any) => (
                      <TableRow key={geriatrico.id}>
                        <TableCell className="font-medium">{geriatrico.nombre}</TableCell>
                        <TableCell>{geriatrico.nombreSolicitante || "N/A"}</TableCell>
                        <TableCell>{geriatrico.telefono || "N/A"}</TableCell>
                        <TableCell>{geriatrico.capacidad || "0"}</TableCell>
                        <TableCell>
                          <Badge className={getEstadoColor(geriatrico.estadoHabilitacion)}>
                            {getEstadoLabel(geriatrico.estadoHabilitacion)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {geriatrico.fechaVencimientoHabilitacion 
                            ? new Date(geriatrico.fechaVencimientoHabilitacion).toLocaleDateString('es-AR')
                            : "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(geriatrico)}>
                            <FileText className="h-4 w-4 text-blue-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-14 w-14 text-slate-300 mb-4" />
                <p className="text-slate-800 font-medium text-lg">No hay Residencias registradas</p>
                <Button onClick={() => { setForm(initialForm); setEditingId(null); setViewMode(false); setOpen(true); }} className="mt-4 bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera residencia
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
          ) : geriatricos && geriatricos.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {geriatricos.map((geriatrico: any) => (
                <Card key={geriatrico.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-2">
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          {geriatrico.nombre}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Solicitante: {geriatrico.nombreSolicitante || "Sin especificar"}
                        </CardDescription>
                      </div>
                      <Badge className={getEstadoColor(geriatrico.estadoHabilitacion)}>
                        {getEstadoLabel(geriatrico.estadoHabilitacion)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p><strong>Dirección:</strong> {geriatrico.direccion}</p>
                      <p><strong>Teléfono:</strong> {geriatrico.telefono || "N/A"}</p>
                      <p><strong>Capacidad:</strong> {geriatrico.capacidad || "0"} plazas</p>
                      {geriatrico.fechaVencimientoHabilitacion && (
                        <p><strong>Vencimiento:</strong> {new Date(geriatrico.fechaVencimientoHabilitacion).toLocaleDateString('es-AR')}</p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(geriatrico)} className="flex-1">
                        <FileText className="h-4 w-4 mr-1.5 text-blue-600" /> Ver Detalles
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(geriatrico.id)} className="text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-14 w-14 text-slate-300 mb-4" />
                <p className="text-slate-800 font-medium text-lg">No hay Residencias registradas</p>
                <Button onClick={() => { setForm(initialForm); setEditingId(null); setViewMode(false); setOpen(true); }} className="mt-4 bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera residencia
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}