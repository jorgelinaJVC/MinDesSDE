import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Plus, Edit, FileText, Trash, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type Familiar = { nombre: string; dni: string; vinculo: string; ocupacion: string; oficio: string; ingresos: string; };
type ResidenciaHijo = { nombre: string; dni: string; direccion: string; ocupacion: string; };

type AdultoMayorForm = {
  expediente: string;
  trabajadorSocial: string;
  fechaFicha: string;
  numeroLegajo: string;
  
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  sexo: "masculino" | "femenino" | "otro";
  telefono: string;
  textTelefono?: string;
  estadoCivil: string;
  domicilio: string;
  barrio: string;
  localidad: string;
  
  ocupacion: string;
  oficio: string;
  monto: string;
  beneficioSocial: string;
  cualBeneficio: string;
  asistenciaPrevisional: string;
  diaCobro: string;
  medioCobro: string;
  tarjetas: string;
  prestamos: string;
  
  apoderadoNombre: string;
  apoderadoEdad: string;
  apoderadoDni: string;
  apoderadoFechaNacimiento: string;
  apoderadoTelefono: string;
  apoderadoDomicilio: string;
  apoderadoBarrio: string;
  apoderadoVinculo: string;
  
  redFamiliar: Familiar[];
  residenciaHijos: ResidenciaHijo[];
  
  ubicacionVivienda: string;
  tenenciaVivienda: string;
  tipoVivienda: string;
  situacionHabitacionalPersonas: number | "";
  situacionHabitacionalHabitaciones: number | "";
  materialParedes: string;
  materialPisos: string;
  materialTechos: string;
  bano: string;
  cocina: string;
  servicioLuz: boolean;
  servicioAgua: boolean;
  servicioGas: boolean;
  
  obraSocial: string;
  numeroAfiliado: string;
  enfermedad: string;
  medicoCabecera: string;
  ultimaConsulta: string;
  sugerencia: string;
  
  estadoGeneral: "estable" | "requiere_atencion" | "critico";
  geriatricoId: number | undefined;
};

const initialForm: AdultoMayorForm = {
  expediente: "", trabajadorSocial: "", fechaFicha: new Date().toISOString().split('T')[0], numeroLegajo: "",
  nombre: "", apellido: "", dni: "", fechaNacimiento: "", sexo: "masculino", telefono: "", estadoCivil: "Soltera/o", domicilio: "", barrio: "", localidad: "",
  ocupacion: "", oficio: "", monto: "", beneficioSocial: "NO", cualBeneficio: "", asistenciaPrevisional: "No", diaCobro: "", medioCobro: "", tarjetas: "", prestamos: "",
  apoderadoNombre: "", apoderadoEdad: "", apoderadoDni: "", apoderadoFechaNacimiento: "", apoderadoTelefono: "", apoderadoDomicilio: "", apoderadoBarrio: "", apoderadoVinculo: "",
  redFamiliar: [], residenciaHijos: [],
  ubicacionVivienda: "Urbana", tenenciaVivienda: "", tipoVivienda: "", situacionHabitacionalPersonas: "", situacionHabitacionalHabitaciones: "", materialParedes: "", materialPisos: "", materialTechos: "", bano: "", cocina: "", servicioLuz: false, servicioAgua: false, servicioGas: false,
  obraSocial: "", numeroAfiliado: "", enfermedad: "", medicoCabecera: "", ultimaConsulta: "", sugerencia: "",
  estadoGeneral: "estable", geriatricoId: undefined,
};

const initialAmpliacion = {
  id: null as number | null,
  beneficioSocial: "NO", cualBeneficio: "", asistenciaPrevisional: "No", diaCobro: "", medioCobro: "", tarjetas: "NO", extensionANombreDe: "", prestamos: "", sugerencia: ""
};

export default function AdultosMayores() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState(false); 
  const [openAmpliacion, setOpenAmpliacion] = useState(false);
  
  const [form, setForm] = useState<AdultoMayorForm>(initialForm);
  const [ampliacion, setAmpliacion] = useState(initialAmpliacion);

  const { data: adultosMayores, isLoading } = trpc.adultosMayores.list.useQuery();
  const utils = trpc.useUtils();

  // ======= CONSULTA AUTOMÁTICA DEL HISTORIAL SEMESTRAL =======
  const { data: historialAmpliaciones, refetch: refetchHistorial } = trpc.ampliaciones.getByAdultoMayor.useQuery(
    { adultoMayorId: editingId ?? 0 },
    { enabled: !!editingId }
  );

  const createMutation = trpc.adultosMayores.create.useMutation({
    onSuccess: () => { toast.success("Ficha Social creada"); utils.adultosMayores.list.invalidate(); setOpen(false); setForm(initialForm); },
    onError: (error) => { toast.error(error.message || "Error al crear la ficha"); },
  });

  const updateMutation = trpc.adultosMayores.update.useMutation({
    onSuccess: () => { toast.success("Ficha Social actualizada"); utils.adultosMayores.list.invalidate(); setOpen(false); setForm(initialForm); setEditingId(null); },
    onError: (error) => { toast.error(error.message || "Error al actualizar la ficha"); },
  });

  // ======= MUTACIÓN PARA ELIMINAR FICHA PRINCIPAL COMPLETA =======
  const deleteMutation = trpc.adultosMayores.delete.useMutation({
    onSuccess: () => { toast.success("Ficha Social eliminada correctamente"); utils.adultosMayores.list.invalidate(); setOpen(false); setEditingId(null); setViewMode(false); },
    onError: (error) => { toast.error(error.message || "Error al eliminar la ficha"); },
  });

  const createAmpliacionMutation = trpc.ampliaciones.create.useMutation({
    onSuccess: () => {
      toast.success("¡Ampliación de Sugerencia guardada con éxito!");
      refetchHistorial();
      setOpenAmpliacion(false);
      setAmpliacion(initialAmpliacion);
    },
    onError: (error) => { toast.error(error.message || "Error al guardar la ampliación"); },
  });

  // ======= MUTACIONES NUEVAS PARA EDITAR Y ELIMINAR AMPLIACIONES =======
  const updateAmpliacionMutation = trpc.ampliaciones.update.useMutation({
    onSuccess: () => { toast.success("¡Ampliación modificada con éxito!"); refetchHistorial(); setOpenAmpliacion(false); setAmpliacion(initialAmpliacion); },
    onError: (error) => { toast.error(error.message || "Error al modificar la ampliación"); },
  });

  const deleteAmpliacionMutation = trpc.ampliaciones.delete.useMutation({
    onSuccess: () => { toast.success("Ampliación eliminada correctamente"); refetchHistorial(); },
    onError: (error) => { toast.error(error.message || "Error al eliminar la ampliación"); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numeroLegajo || !form.nombre || !form.apellido || !form.dni || !form.fechaNacimiento) {
      toast.error("Faltan datos obligatorios", { description: "Revisa la pestaña 'Solicitante'." });
      return; 
    }

    // 🚨 EL SALVAVIDAS ANTI-ZOD:
    const parseOptionalDate = (val: any) => {
      if (!val || val === "" || String(val).includes("1970-01-01")) return undefined;
      return new Date(val);
    };

    // 🎯 Objeto directo y limpio
    const payload = {
      numeroLegajo: form.numeroLegajo,
      expediente: form.numeroLegajo,
      trabajadorSocial: form.trabajadorSocial || "",
      fechaFicha: parseOptionalDate(form.fechaFicha),
      
      nombre: form.nombre,
      apellido: form.apellido,
      dni: form.dni,
      fechaNacimiento: new Date(form.fechaNacimiento),
      sexo: (form as any).sexo || "masculino",
      telefono: form.telefono || "",
      estadoCivil: form.estadoCivil || "Soltera/o",
      domicilio: form.domicilio || "",
      barrio: form.barrio || "",
      localidad: form.localidad || "",

      ocupacion: form.ocupacion || "",
      oficio: form.oficio || "",
      monto: form.monto || "",
      beneficioSocial: form.beneficioSocial || "NO",
      cualBeneficio: form.cualBeneficio || "",
      asistenciaPrevisional: form.asistenciaPrevisional || "No",
      diaCobro: form.diaCobro || "",
      medioCobro: form.medioCobro || "",
      tarjetas: form.tarjetas || "",
      prestamos: form.prestamos || "",

      apoderadoNombre: form.apoderadoNombre || "",
      apoderadoEdad: form.apoderadoEdad || "",
      apoderadoDni: form.apoderadoDni || "",
      apoderadoDomicilio: form.apoderadoDomicilio || "",
      apoderadoBarrio: form.apoderadoBarrio || "",
      apoderadoVinculo: form.apoderadoVinculo || "",

      redFamiliar: JSON.stringify(form.redFamiliar || []),
      residenciaHijos: JSON.stringify(form.residenciaHijos || []),

      ubicacionVivienda: form.ubicacionVivienda || "Urbana",
      tenenciaVivienda: form.tenenciaVivienda || "",
      tipoVivienda: form.tipoVivienda || "",
      situacionHabitacionalPersonas: form.situacionHabitacionalPersonas === "" ? undefined : Number(form.situacionHabitacionalPersonas),
      situacionHabitacionalHabitaciones: form.situacionHabitacionalHabitaciones === "" ? undefined : Number(form.situacionHabitacionalHabitaciones),
      
      materialParedes: form.materialParedes || "",
      materialPisos: form.materialPisos || "",
      materialTechos: form.materialTechos || "",
      bano: form.bano || "",
      cocina: form.cocina || "",
      servicioLuz: !!form.servicioLuz,
      servicioAgua: !!form.servicioAgua,
      servicioGas: !!form.servicioGas,

      obraSocial: form.obraSocial || "",
      numeroAfiliado: form.numeroAfiliado || "",
      enfermedad: form.enfermedad || "",
      medicoCabecera: form.medicoCabecera || "",
      ultimaConsulta: parseOptionalDate(form.ultimaConsulta),
      sugerencia: form.sugerencia || "",
      estadoGeneral: form.estadoGeneral || "estable",
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload } as any);
    } else {
      createMutation.mutate(payload as any);
    }
  };


  const handleGuardarAmpliacion = () => {
    if (!ampliacion.sugerencia.trim()) {
      toast.error("El campo 'Sugerencia' no puede estar vacío.");
      return;
    }

    const payload = {
      benefProgramaSocial: ampliacion.beneficioSocial === "SI",
      cualPrograma: ampliacion.cualBeneficio,
      asistPrevisional: ampliacion.asistenciaPrevisional,
      diaCobro: ampliacion.diaCobro,
      medioCobro: ampliacion.medioCobro,
      poseeTarjetas: ampliacion.tarjetas === "SI",
      extensionANombreDe: ampliacion.extensionANombreDe,
      prestamos: ampliacion.prestamos,
      sugerencia: ampliacion.sugerencia,
    };

    if (ampliacion.id) {
      updateAmpliacionMutation.mutate({ id: ampliacion.id, ...payload });
    } else {
      if (!editingId) {
        toast.error("Error: No se encontró el ID del Adulto Mayor.");
        return;
      }
      createAmpliacionMutation.mutate({
        adultoMayorId: editingId,
        expediente: form.numeroLegajo || form.expediente,
        trabajadorSocial: form.trabajadorSocial,
        ocupacion: form.ocupacion,
        oficio: form.oficio,
        ...payload
      });
    }
  };

  const handleEliminarFichaPrincipal = () => {
    if (!editingId) return;
    if (confirm("🚨 ¿Está seguro de que desea eliminar por completo esta Ficha Social? Esta acción dará de baja el registro primario.")) {
      deleteMutation.mutate({ id: editingId });
    }
  };

  const handleEliminarAmpliacion = (id: number) => {
    if (confirm("⚠️ ¿Desea eliminar este registro de ampliación semestral?")) {
      deleteAmpliacionMutation.mutate({ id });
    }
  };

  const handleEditarAmpliacion = (amp: any) => {
    setAmpliacion({
      id: amp.id,
      beneficioSocial: amp.benefProgramaSocial ? "SI" : "NO",
      cualBeneficio: amp.cualPrograma || "",
      asistenciaPrevisional: amp.asistPrevisional || "No",
      diaCobro: amp.diaCobro || "",
      medioCobro: amp.medioCobro || "",
      tarjetas: amp.poseeTarjetas ? "SI" : "NO",
      extensionANombreDe: amp.extensionANombreDe || "",
      prestamos: amp.prestamos || "",
      sugerencia: amp.sugerencia || ""
    });
    setOpenAmpliacion(true);
  };

  const helperDate = (d: any) => d ? new Date(d).toISOString().split('T')[0] : "";

  const handleEdit = (adulto: any) => {
    setEditingId(adulto.id);
    let redParsed = []; let hijosParsed = [];
    try { redParsed = adulto.redFamiliar ? JSON.parse(adulto.redFamiliar) : []; } catch (e) {}
    try { hijosParsed = adulto.residenciaHijos ? JSON.parse(adulto.residenciaHijos) : []; } catch (e) {}

    setForm({ 
      ...initialForm, ...adulto,
      fechaNacimiento: helperDate(adulto.fechaNacimiento),
      fechaFicha: helperDate(adulto.fechaFicha),
      apoderadoFechaNacimiento: helperDate(adulto.apoderadoFechaNacimiento),
      ultimaConsulta: helperDate(adulto.ultimaConsulta),
      redFamiliar: redParsed,
      residenciaHijos: hijosParsed
    });
    setViewMode(true); 
    setOpen(true);
  };

  const addFamiliar = () => setForm({ ...form, redFamiliar: [...form.redFamiliar, { nombre: "", dni: "", vinculo: "", ocupacion: "", oficio: "", ingresos: "" }] });
  const updateFamiliar = (index: number, field: keyof Familiar, value: string) => {
    const newRed = [...form.redFamiliar]; newRed[index][field] = value; setForm({ ...form, redFamiliar: newRed });
  };
  const removeFamiliar = (index: number) => setForm({ ...form, redFamiliar: form.redFamiliar.filter((_, i) => i !== index) });

  const addHijo = () => setForm({ ...form, residenciaHijos: [...form.residenciaHijos, { nombre: "", dni: "", direccion: "", ocupacion: "" }] });
  const updateHijo = (index: number, field: keyof ResidenciaHijo, value: string) => {
    const newHijos = [...form.residenciaHijos]; newHijos[index][field] = value; setForm({ ...form, residenciaHijos: newHijos });
  };
  const removeHijo = (index: number) => setForm({ ...form, residenciaHijos: form.residenciaHijos.filter((_, i) => i !== index) });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
         <h1 className="text-3xl font-bold tracking-tight text-purple-950 flex items-center gap-2">
  <Users className="h-8 w-8 text-[#5B2D8E]" />
  Adultos Mayores
</h1>
          <p className="text-muted-foreground mt-2">Gestión de expedientes e informes sociales</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) { setForm(initialForm); setEditingId(null); setViewMode(false); }
        }}>
          <Button className="bg-[#5B2D8E] hover:bg-[#4a2473] text-white" onClick={() => { setForm(initialForm); setEditingId(null); setViewMode(false); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nueva Ficha Social
          </Button>
          
          <DialogContent className="sm:max-w-[95vw] w-[95vw] h-[95vh] overflow-y-auto flex flex-col p-6">
            {viewMode ? (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <DialogTitle className="text-3xl font-bold text-[#5B2D8E]">
                      Ficha N° {form.numeroLegajo || form.expediente}
                    </DialogTitle>
                    <DialogDescription className="text-lg mt-1 text-slate-600">
                      {form.nombre} {form.apellido} | DNI: {form.dni}
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button type="button" variant="outline" className="border-[#5B2D8E] text-[#5B2D8E] hover:bg-[#5B2D8E] hover:text-white" onClick={() => setViewMode(false)}>
                      <Edit className="h-4 w-4 mr-2" /> Editar Ficha Original
                    </Button>
                    <Button 
                      type="button" 
                      className="bg-[#5B2D8E] hover:bg-[#4a2473] text-white"
                      onClick={() => { setAmpliacion(initialAmpliacion); setOpenAmpliacion(true); }}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Nueva Ampliación de Sugerencia
                    </Button>
                    <Button type="button" variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={handleEliminarFichaPrincipal}>
                      <Trash className="h-4 w-4 mr-2" /> Eliminar Ficha
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                  <div className="space-y-6">
                    <section>
                      <h3 className="font-bold text-lg text-slate-800 border-b-2 border-slate-100 pb-2 mb-3">Datos Personales y Domicilio</h3>
                      <div className="grid grid-cols-2 gap-y-3 text-sm">
                        <p><span className="font-semibold text-slate-500">Nacimiento:</span><br/>{form.fechaNacimiento}</p>
                        <p><span className="font-semibold text-slate-500">Teléfono:</span><br/>{form.telefono || "-"}</p>
                        <p><span className="font-semibold text-slate-500">Estado Civil:</span><br/>{form.estadoCivil || "-"}</p>
                        <p><span className="font-semibold text-slate-500">Domicilio:</span><br/>{form.domicilio || "-"}</p>
                        <p><span className="font-semibold text-slate-500">Barrio:</span><br/>{form.barrio || "-"}</p>
                        <p><span className="font-semibold text-slate-500">Localidad:</span><br/>{form.localidad || "-"}</p>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section>
                      <h3 className="font-bold text-lg text-slate-800 border-b-2 border-slate-100 pb-2 mb-3">Red Familiar de Apoyo</h3>
                      {form.redFamiliar && form.redFamiliar.length > 0 ? (
                        <ul className="space-y-2 text-sm">
                          {form.redFamiliar.map((fam: any, idx: number) => (
                            <li key={idx} className="bg-slate-50 p-3 rounded-md border border-slate-200">
                              <strong className="text-[#5B2D8E]">{fam.nombre}</strong> - DNI: {fam.dni} <br/>
                              <span className="text-slate-500">Vínculo: {fam.vinculo}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500 italic">No se registraron familiares.</p>
                      )}
                    </section>
                    
                    <section>
                      <h3 className="font-bold text-lg text-slate-800 border-b-2 border-slate-100 pb-2 mb-3">Datos del Expediente</h3>
                      <div className="grid grid-cols-2 gap-y-3 text-sm">
                        <p><span className="font-semibold text-slate-500">Trabajador/a Social:</span><br/>{form.trabajadorSocial || "-"}</p>
                        <p><span className="font-semibold text-slate-500">Fecha de Ficha:</span><br/>{form.fechaFicha || "-"}</p>
                      </div>
                    </section>
                  </div>
                </div>

                {/* ======= HISTORIAL VISUAL DE AMPLIACIONES SEMESTRALES ======= */}
                <div className="mt-8 border-t pt-6">
                  <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2 mb-4">
                    📝 Historial de Ampliaciones Semestrales (Ayuda Alimentaria)
                  </h3>
                  
                  {historialAmpliaciones && historialAmpliaciones.length > 0 ? (
                    <div className="space-y-4">
                      {historialAmpliaciones.map((amp: any) => (
                        <Card key={amp.id} className="border-l-4 border-l-[#5B2D8E] shadow-sm">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-center bg-slate-50 p-2 rounded text-xs text-slate-600 font-medium">
                              <span>📅 Fecha: {amp.fecha ? new Date(amp.fecha).toLocaleDateString() : "--"}</span>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-[#5B2D8E] hover:bg-purple-50" onClick={() => handleEditarAmpliacion(amp)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:bg-red-50" onClick={() => handleEliminarAmpliacion(amp.id)}>
                                  <Trash className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-b pb-2">
                              <div><span className="font-semibold text-slate-500">Prog. Social:</span> {amp.benefProgramaSocial ? `SÍ (${amp.cualPrograma || 'S/D'})` : 'NO'}</div>
                              <div><span className="font-semibold text-slate-500">Asist. Previsional:</span> {amp.asistPrevisional || '--'}</div>
                              <div><span className="font-semibold text-slate-500">Día/Medio Cobro:</span> {amp.diaCobro || '--'} ({amp.medioCobro || '--'})</div>
                              <div><span className="font-semibold text-slate-500">Tarjetas/Préstamos:</span> {amp.poseeTarjetas ? 'SÍ' : 'NO'} / {amp.prestamos || 'Ninguno'}</div>
                            </div>

                            <div className="pt-1">
                              <span className="font-bold text-sm text-slate-700 block mb-1">Sugerencia Semestral:</span>
                              <p className="text-sm text-slate-600 bg-amber-50/30 p-3 rounded border border-amber-100 whitespace-pre-wrap italic">
                                "{amp.sugerencia}"
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed text-slate-400 text-sm">
                      No se registran ampliaciones semestrales todavía para este titular.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar" : "Nueva"} Ficha Social</DialogTitle>
                  <DialogDescription>Complete los datos requeridos como en el documento original.</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="solicitante" className="mt-4">
                  <TabsList className="flex h-auto w-full flex-wrap p-1">
                    <TabsTrigger value="solicitante" className="flex-1 h-auto py-1.5 whitespace-normal">Solicitante</TabsTrigger>
                    <TabsTrigger value="apoderado" className="flex-1 h-auto py-1.5 whitespace-normal">Socio económico</TabsTrigger>
                    <TabsTrigger value="red" className="flex-1 h-auto py-1.5 whitespace-normal">Red Familiar</TabsTrigger>
                    <TabsTrigger value="vivienda" className="flex-1 h-auto py-1.5 whitespace-normal">Vivienda</TabsTrigger>
                    <TabsTrigger value="salud" className="flex-1 h-auto py-1.5 whitespace-normal">Salud y Cierre</TabsTrigger>
                  </TabsList>

                  <TabsContent value="solicitante" className="space-y-4 mt-4">
                    <div className="flex justify-end pb-4 border-b">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                          <Label className="whitespace-nowrap font-bold">Exp N° *</Label>
                          <Input className="h-8 font-medium" placeholder="Número manual único" value={form.numeroLegajo} onChange={(e) => setForm({ ...form, numeroLegajo: e.target.value })} required />
                        </div>
                        <div className="grid gap-2">
                          <Label className="whitespace-nowrap font-bold">T. Social</Label>
                          <Input className="h-8" value={form.trabajadorSocial} onChange={(e) => setForm({ ...form, trabajadorSocial: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                          <Label className="whitespace-nowrap font-bold">Fecha.</Label>
                          <Input className="h-8" type="date" value={form.fechaFicha} onChange={(e) => setForm({ ...form, fechaFicha: e.target.value })} />
                        </div>
                      </div>
                    </div>
                    <h3 className="text-lg font-medium pt-2 text-[#5B2D8E]">DATOS DEL SOLICITANTE</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Nombres *</Label>
                        <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                      </div>
                      <div className="grid gap-2">
                        <Label>Apellidos *</Label>
                        <Input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required />
                      </div>
                      <div className="grid gap-2">
                        <Label>D.N.I *</Label>
                        <Input value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} required />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div className="grid gap-2">
                        <Label>Fecha de Nacimiento *</Label>
                        <Input type="date" value={form.fechaNacimiento} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} required />
                      </div>
                      <div className="grid gap-2">
                        <Label>Teléfono</Label>
                        <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Estado Civil</Label>
                        <Select value={form.estadoCivil} onValueChange={(v) => setForm({ ...form, estadoCivil: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Soltera/o">Soltera/o</SelectItem>
                            <SelectItem value="Casada/o">Casada/o</SelectItem>
                            <SelectItem value="Separada/o">Separada/o</SelectItem>
                            <SelectItem value="Viuda/o">Viuda/o</SelectItem>
                            <SelectItem value="Unión de Hecho">Unión de Hecho</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div className="grid gap-2 col-span-1">
                        <Label>Domicilio</Label>
                        <Input value={form.domicilio} onChange={(e) => setForm({ ...form, domicilio: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Barrio</Label>
                        <Input value={form.barrio} onChange={(e) => setForm({ ...form, barrio: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Localidad</Label>
                        <Input value={form.localidad} onChange={(e) => setForm({ ...form, localidad: e.target.value })} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="apoderado" className="space-y-4 mt-4">
                    <h3 className="text-lg font-medium pt-2 text-[#5B2D8E]">DATOS SOCIOECONÓMICOS</h3>
                    <div className="grid grid-cols-4 gap-4 border-b pb-4">
                      <div className="grid gap-2"><Label>Ocupación</Label><Input value={form.ocupacion} onChange={(e) => setForm({ ...form, ocupacion: e.target.value })} /></div>
                      <div className="grid gap-2"><Label>Oficio</Label><Input value={form.oficio} onChange={(e) => setForm({ ...form, oficio: e.target.value })} /></div>
                      <div className="grid gap-2"><Label>Monto</Label><Input value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} /></div>
                      <div className="grid gap-2">
                        <Label>Beneficio De Prog. Social</Label>
                        <Select value={form.beneficioSocial} onValueChange={(v) => setForm({ ...form, beneficioSocial: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SI">SI</SelectItem><SelectItem value="NO">NO</SelectItem></SelectContent></Select>
                      </div>
                      <div className="grid gap-2 col-span-2"><Label>¿Cuál?</Label><Input value={form.cualBeneficio} onChange={(e) => setForm({ ...form, cualBeneficio: e.target.value })} disabled={form.beneficioSocial === 'NO'} /></div>
                      <div className="grid gap-2">
                        <Label>Asistencia Previsional</Label>
                        <Select value={form.asistenciaPrevisional} onValueChange={(v) => setForm({ ...form, asistenciaPrevisional: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Municipal">Municipal</SelectItem><SelectItem value="Provincial">Provincial</SelectItem><SelectItem value="Nacional">Nacional</SelectItem><SelectItem value="No">No</SelectItem></SelectContent></Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 border-b pb-4">
                      <div className="grid gap-2"><Label>Día de cobro</Label><Input value={form.diaCobro} onChange={(e) => setForm({ ...form, diaCobro: e.target.value })} /></div>
                      <div className="grid gap-2"><Label>Medio de cobro</Label><Input value={form.medioCobro} onChange={(e) => setForm({ ...form, medioCobro: e.target.value })} /></div>
                      <div className="grid gap-2"><Label>Posee Tarjetas</Label><Input value={form.tarjetas} onChange={(e) => setForm({ ...form, tarjetas: e.target.value })} /></div>
                      <div className="grid gap-2"><Label>Préstamos</Label><Input value={form.prestamos} onChange={(e) => setForm({ ...form, prestamos: e.target.value })} /></div>
                    </div>
                  </TabsContent>

                  <TabsContent value="red" className="space-y-6 mt-4">
                    <div>
                      <div className="flex justify-between items-center mb-2"><h3 className="text-lg font-medium text-[#5B2D8E]">Red Familiar</h3><Button type="button" variant="outline" size="sm" onClick={addFamiliar}><Plus className="h-4 w-4 mr-2"/> Agregar Familiar</Button></div>
                      <div className="border rounded-md">
                        <Table><TableHeader className="bg-slate-50"><TableRow><TableHead>Nombre</TableHead><TableHead>DNI</TableHead><TableHead>Vínculo</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
                          {form.redFamiliar.map((fam, idx) => (
                            <TableRow key={idx}>
                              <TableCell><Input value={fam.nombre} onChange={(e) => updateFamiliar(idx, 'nombre', e.target.value)} /></TableCell>
                              <TableCell><Input value={fam.dni} onChange={(e) => updateFamiliar(idx, 'dni', e.target.value)} /></TableCell>
                              <TableCell><Input value={fam.vinculo} onChange={(e) => updateFamiliar(idx, 'vinculo', e.target.value)} /></TableCell>
                              <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeFamiliar(idx)}><Trash className="h-4 w-4 text-red-500" /></Button></TableCell>
                            </TableRow>
                          ))}
                          {form.redFamiliar.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center py-4">Sin familiares</TableCell></TableRow>)}
                        </TableBody></Table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="vivienda" className="space-y-4 mt-4">
                    <h3 className="text-lg font-medium pt-2 text-[#5B2D8E]">SITUACIÓN DE LA VIVIENDA</h3>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <div className="grid gap-2"><Label>Situación tenencia</Label><Input value={form.tenenciaVivienda} onChange={(e) => setForm({ ...form, tenenciaVivienda: e.target.value })} /></div>
                        <div className="grid gap-2"><Label>Tipo de Vivienda</Label><Input value={form.tipoVivienda} onChange={(e) => setForm({ ...form, tipoVivienda: e.target.value })} /></div>
                      </div>
                      <div className="space-y-4 border-x px-4">
                        <div className="grid gap-2"><Label>Material paredes</Label><Input value={form.materialParedes} onChange={(e) => setForm({ ...form, materialParedes: e.target.value })} /></div>
                        <div className="grid gap-2"><Label>Material pisos</Label><Input value={form.materialPisos} onChange={(e) => setForm({ ...form, materialPisos: e.target.value })} /></div>
                      </div>
                      <div className="space-y-4">
                        <Label className="block font-bold">Situación Habitacional</Label>
                        <div className="grid gap-2"><Label>Cant. Personas</Label><Input type="number" value={form.situacionHabitacionalPersonas} onChange={(e) => setForm({ ...form, situacionHabitacionalPersonas: e.target.value === "" ? "" : Number(e.target.value) })} /></div>
                        <div className="grid gap-2"><Label>Cant. Habitaciones</Label><Input type="number" value={form.situacionHabitacionalHabitaciones} onChange={(e) => setForm({ ...form, situacionHabitacionalHabitaciones: e.target.value === "" ? "" : Number(e.target.value) })} /></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-6 pt-4 border-t mt-4">
                      <div className="grid gap-2"><Label>Material techos</Label><Input value={form.materialTechos} onChange={(e) => setForm({ ...form, materialTechos: e.target.value })} /></div>
                      <div className="grid gap-2"><Label>Baño</Label><Input value={form.bano} onChange={(e) => setForm({ ...form, bano: e.target.value })} /></div>
                      <div className="grid gap-2"><Label>Cocina</Label><Input value={form.cocina} onChange={(e) => setForm({ ...form, cocina: e.target.value })} /></div>
                      <div className="grid gap-2 border-l pl-4">
                        <Label className="block mb-2">Servicios básicos</Label>
                        <div className="flex items-center space-x-2 mb-2"><Checkbox id="luz" checked={form.servicioLuz} onCheckedChange={(c) => setForm({...form, servicioLuz: !!c})} /><Label htmlFor="luz">LUZ</Label></div>
                        <div className="flex items-center space-x-2 mb-2"><Checkbox id="agua" checked={form.servicioAgua} onCheckedChange={(c) => setForm({...form, servicioAgua: !!c})} /><Label htmlFor="agua">AGUA</Label></div>
                        <div className="flex items-center space-x-2"><Checkbox id="gas" checked={form.servicioGas} onCheckedChange={(c) => setForm({...form, servicioGas: !!c})} /><Label htmlFor="gas">GAS</Label></div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="salud" className="space-y-4 mt-4">
                    <h3 className="text-lg font-medium text-[#5B2D8E]">SITUACIÓN SANITARIA</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2"><Label>Obra Social</Label><Input value={form.obraSocial} onChange={(e) => setForm({ ...form, obraSocial: e.target.value })} /></div>
                      <div className="grid gap-2"><Label>Nº AFILIADO</Label><Input value={form.numeroAfiliado} onChange={(e) => setForm({ ...form, numeroAfiliado: e.target.value })} /></div>
                      <div className="grid gap-2 col-span-2"><Label>Enfermedad</Label><Input value={form.enfermedad} onChange={(e) => setForm({ ...form, enfermedad: e.target.value })} /></div>
                    </div>
                    <div className="pt-4 border-t mt-4">
                      <div className="grid gap-2"><Label className="text-lg font-medium text-[#5B2D8E] mb-2">Sugerencia:</Label><Textarea value={form.sugerencia} onChange={(e) => setForm({ ...form, sugerencia: e.target.value })} rows={8} /></div>
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter className="mt-6">
                  <Button type="submit" className="bg-[#5B2D8E] hover:bg-[#4a2473] text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingId ? "Actualizar Ficha" : "Guardar Ficha"}
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
        </TabsList>
        <TabsContent value="tabla" className="mt-4">
          {isLoading ? (<Skeleton className="h-96" />) : adultosMayores && adultosMayores.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Legajo</TableHead><TableHead>DNI</TableHead><TableHead>Edad</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {adultosMayores.map((adulto) => (
                      <TableRow key={adulto.id}>
                        <TableCell className="font-medium">{adulto.nombre} {adulto.apellido}</TableCell>
                        <TableCell>{adulto.expediente || adulto.numeroLegajo || "S/D"}</TableCell>
                        <TableCell>{adulto.dni}</TableCell>
                        <TableCell>
                          {(() => {
                            if (!adulto.fechaNacimiento) return "--";
                            const hoy = new Date(); const nacimiento = new Date(adulto.fechaNacimiento);
                            let edad = hoy.getFullYear() - nacimiento.getFullYear();
                            const mes = hoy.getMonth() - nacimiento.getMonth();
                            if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
                            return edad;
                          })()}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(adulto)} className="text-[#5B2D8E] border-[#5B2D8E] hover:bg-[#5B2D8E] hover:text-white"><FileText className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="flex flex-col items-center justify-center py-12"><Users className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">No hay fichas</p></CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ================= MODAL DE AMPLIACIÓN DE SUGERENCIA ================= */}
      <Dialog open={openAmpliacion} onOpenChange={setOpenAmpliacion}>
        <DialogContent className="sm:max-w-[90vw] w-[90vw] h-[95vh] overflow-y-auto flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center border-b pb-4">
              {ampliacion.id ? "MODIFICAR AMPLIACIÓN DE SUGERENCIA" : "NUEVA AMPLIACIÓN DE SUGERENCIA"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4 flex-1">
            <div className="flex justify-end">
              <div className="grid grid-cols-2 gap-4 w-full md:w-1/2">
                <div className="grid gap-2 text-right"><Label className="font-bold">Exp N°</Label><Input value={form.numeroLegajo || form.expediente} readOnly className="bg-slate-50" /></div>
                <div className="grid gap-2"><Label className="font-bold">Fecha</Label><Input type="date" defaultValue={new Date().toISOString().split('T')[0]} /></div>
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-800 uppercase underline">Solicitante</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-md border">
              <div className="grid gap-2 col-span-2"><Label>Nombre y Apellido</Label><Input value={`${form.nombre} ${form.apellido}`} readOnly /></div>
              <div className="grid gap-2"><Label>D.N.I</Label><Input value={form.dni} readOnly /></div>
              <div className="grid gap-2"><Label>Fecha de Nacimiento</Label><Input type="date" value={form.fechaNacimiento} readOnly /></div>
              <div className="grid gap-2"><Label>Estado Civil</Label><Input value={form.estadoCivil} readOnly /></div>
              <div className="grid gap-2 col-span-2"><Label>Domicilio</Label><Input value={form.domicilio} readOnly /></div>
              <div className="grid gap-2"><Label>Barrio</Label><Input value={form.barrio} readOnly /></div>
              <div className="grid gap-2"><Label>Localidad</Label><Input value={form.localidad} readOnly /></div>
              <div className="grid gap-2"><Label>Ocupación</Label><Input value={form.ocupacion} readOnly /></div>
              <div className="grid gap-2"><Label>Oficio</Label><Input value={form.oficio} readOnly /></div>
              <div className="grid gap-2"><Label>Monto</Label><Input value={form.monto} readOnly /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
              <div className="grid gap-2">
                <Label>Benef. De Prog. Social</Label>
                <Select value={ampliacion.beneficioSocial} onValueChange={(v) => setAmpliacion({...ampliacion, beneficioSocial: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="SI">SI</SelectItem><SelectItem value="NO">NO</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 col-span-2">
                <Label>¿Cuál?</Label>
                <Input value={ampliacion.cualBeneficio} onChange={(e) => setAmpliacion({...ampliacion, cualBeneficio: e.target.value})} disabled={ampliacion.beneficioSocial === "NO"} />
              </div>
              
              <div className="grid gap-2">
                <Label>Asist. Previsional</Label>
                <Select value={ampliacion.asistenciaPrevisional} onValueChange={(v) => setAmpliacion({...ampliacion, asistenciaPrevisional: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Municipal">Municipal</SelectItem><SelectItem value="Provincial">Provincial</SelectItem><SelectItem value="Nacional">Nacional</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Día de cobro</Label><Input value={ampliacion.diaCobro} onChange={(e) => setAmpliacion({...ampliacion, diaCobro: e.target.value})} /></div>
              <div className="grid gap-2"><Label>Medio de cobro</Label><Input value={ampliacion.medioCobro} onChange={(e) => setAmpliacion({...ampliacion, medioCobro: e.target.value})} /></div>

              <div className="grid gap-2">
                <Label>Posee Tarjetas</Label>
                <Select value={ampliacion.tarjetas} onValueChange={(v) => setAmpliacion({...ampliacion, tarjetas: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="SI">SI</SelectItem><SelectItem value="NO">NO</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Extensión a nombre de</Label><Input placeholder="Nombre..." value={ampliacion.extensionANombreDe} onChange={(e) => setAmpliacion({...ampliacion, extensionANombreDe: e.target.value})} disabled={ampliacion.tarjetas === "NO"} /></div>
              <div className="grid gap-2"><Label>Préstamos</Label><Input value={ampliacion.prestamos} onChange={(e) => setAmpliacion({...ampliacion, prestamos: e.target.value})} /></div>
            </div>

            <div className="grid gap-2 border-t pt-4 flex-1">
              <Label className="text-lg font-bold underline mb-2">Sugerencia:</Label>
              <Textarea 
                placeholder="Escriba la actualización de la sugerencia aquí..." 
                className="min-h-[200px] flex-1 text-base leading-relaxed p-4"
                value={ampliacion.sugerencia}
                onChange={(e) => setAmpliacion({...ampliacion, sugerencia: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button variant="outline" onClick={() => setOpenAmpliacion(false)}>Cancelar</Button>
            <Button className="bg-[#5B2D8E] hover:bg-[#4a2473] text-white" onClick={handleGuardarAmpliacion} disabled={updateAmpliacionMutation.isPending || createAmpliacionMutation.isPending}>
              {ampliacion.id ? "Modificar Registro" : "Guardar Registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}