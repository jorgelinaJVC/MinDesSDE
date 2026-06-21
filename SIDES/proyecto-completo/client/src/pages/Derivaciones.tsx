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
import { Scale, Plus, Edit } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type DerivacionForm = {
  adultoMayorId: number | undefined;
  fechaDerivacion: string;
  motivo: string;
  juzgado: string;
  numeroExpediente: string;
  fiscalia: string;
  documentacionAdjunta: string;
  observaciones: string;
  responsable: string;
};

const initialForm: DerivacionForm = {
  adultoMayorId: undefined,
  fechaDerivacion: new Date().toISOString().split('T')[0],
  motivo: "",
  juzgado: "",
  numeroExpediente: "",
  fiscalia: "",
  documentacionAdjunta: "",
  observaciones: "",
  responsable: "",
};

export default function Derivaciones() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<DerivacionForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    estadoDerivacion: "iniciada",
    numeroExpediente: "",
    fiscalia: "",
    documentacionAdjunta: "",
    observaciones: "",
  });

  const { data: derivaciones, isLoading } = trpc.derivaciones.list.useQuery();
  const { data: adultosMayores } = trpc.adultosMayores.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.derivaciones.create.useMutation({
    onSuccess: () => {
      toast.success("Derivación registrada exitosamente");
      utils.derivaciones.list.invalidate();
      setOpen(false);
      setForm(initialForm);
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar derivación");
    },
  });

  const updateMutation = trpc.derivaciones.update.useMutation({
    onSuccess: () => {
      toast.success("Derivación actualizada exitosamente");
      utils.derivaciones.list.invalidate();
      setEditOpen(false);
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar derivación");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adultoMayorId) {
      toast.error("Debe seleccionar un adulto mayor");
      return;
    }

    // Pasamos de forma segura los parámetros esperados por el Router de tRPC
    createMutation.mutate({
      adultoMayorId: form.adultoMayorId,
      fechaDerivacion: form.fechaDerivacion, // Pasamos el string ISO o literal que infiera el router de backend
      motivo: form.motivo,
      juzgado: form.juzgado,
      numeroExpediente: form.numeroExpediente || undefined,
      fiscalia: form.fiscalia || undefined,
      documentacionAdjunta: form.documentacionAdjunta || undefined,
      observaciones: form.observaciones || undefined,
      responsable: form.responsable || user?.name || "Usuario",
    });
  };

  const handleEdit = (derivacion: any) => {
    setEditingId(derivacion.id);
    setEditForm({
      estadoDerivacion: derivacion.estadoDerivacion || "iniciada",
      numeroExpediente: derivacion.numeroExpediente || "",
      fiscalia: derivacion.fiscalia || "",
      documentacionAdjunta: derivacion.documentacionAdjunta || "",
      observaciones: derivacion.observaciones || "",
    });
    setEditOpen(true);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    updateMutation.mutate({
      id: editingId,
      estadoDerivacion: editForm.estadoDerivacion as any,
      numeroExpediente: editForm.numeroExpediente || undefined,
      fiscalia: editForm.fiscalia || undefined,
      documentacionAdjunta: editForm.documentacionAdjunta || undefined,
      observaciones: editForm.observaciones || undefined,
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "iniciada": return "bg-blue-600 hover:bg-blue-700 text-white";
      case "en_tramite": return "bg-amber-500 hover:bg-amber-600 text-white";
      case "finalizada": return "bg-emerald-600 hover:bg-emerald-700 text-white";
      case "archivada": return "bg-zinc-500 hover:bg-zinc-600 text-white";
      default: return "bg-blue-600 text-white";
    }
  };

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      iniciada: "Iniciada",
      en_tramite: "En Trámite",
      finalizada: "Finalizada",
      archivada: "Archivada"
    };
    return labels[estado] || estado;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#5B2D8E]">Derivaciones Judiciales</h1>
          <p className="text-muted-foreground mt-1">
            Registro y seguimiento de casos derivados a la Justicia
          </p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setForm(initialForm);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#5B2D8E] hover:bg-[#4a2473] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Derivación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-[#5B2D8E]">Nueva Derivación Judicial</DialogTitle>
                <DialogDescription>
                  Registre una nueva derivación de caso a la Justicia
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="grid gap-2">
                  <Label htmlFor="adultoMayorId">Adulto Mayor *</Label>
                  <Select
                    value={form.adultoMayorId?.toString() || ""}
                    onValueChange={(value) => setForm({ ...form, adultoMayorId: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un adulto mayor" />
                    </SelectTrigger>
                    <SelectContent>
                      {adultosMayores?.map((am) => (
                        <SelectItem key={am.id} value={am.id.toString()}>
                          {am.nombre} {am.apellido}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fechaDerivacion">Fecha Derivación *</Label>
                    <Input
                      id="fechaDerivacion"
                      type="date"
                      value={form.fechaDerivacion}
                      onChange={(e) => setForm({ ...form, fechaDerivacion: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="responsable">Responsable</Label>
                    <Input
                      id="responsable"
                      placeholder={user?.name || "Nombre del responsable"}
                      value={form.responsable}
                      onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="motivo">Motivo de Derivación *</Label>
                  <Textarea
                    id="motivo"
                    placeholder="Detalle los motivos e informes de la derivación..."
                    value={form.motivo}
                    onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="juzgado">Juzgado *</Label>
                    <Input
                      id="juzgado"
                      placeholder="Ej: Juzgado de Familia N° 2"
                      value={form.juzgado}
                      onChange={(e) => setForm({ ...form, juzgado: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="numeroExpediente">Número Expediente</Label>
                    <Input
                      id="numeroExpediente"
                      placeholder="Ej: EXP-12345/2026"
                      value={form.numeroExpediente}
                      onChange={(e) => setForm({ ...form, numeroExpediente: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="fiscalia">Fiscalía</Label>
                  <Input
                    id="fiscalia"
                    placeholder="Ej: Fiscalía de Instrucción N° 1"
                    value={form.fiscalia}
                    onChange={(e) => setForm({ ...form, fiscalia: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="documentacionAdjunta">Documentación Adjunta</Label>
                  <Input
                    id="documentacionAdjunta"
                    value={form.documentacionAdjunta}
                    onChange={(e) => setForm({ ...form, documentacionAdjunta: e.target.value })}
                    placeholder="Ej: Denuncias, reportes socioambientales, etc."
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    value={form.observaciones}
                    onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="submit" className="bg-[#5B2D8E] hover:bg-[#4a2473] text-white" disabled={createMutation.isPending}>
                  Registrar Derivación
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="tabla" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="tabla">Vista Tabla</TabsTrigger>
          <TabsTrigger value="tarjetas">Vista Tarjetas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tabla" className="mt-4">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : derivaciones && derivaciones.length > 0 ? (
            <Card className="border-zinc-200 shadow-sm">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50/70">
                      <TableHead className="font-semibold text-zinc-700">Adulto Mayor</TableHead>
                      <TableHead className="font-semibold text-zinc-700">Fecha Derivación</TableHead>
                      <TableHead className="font-semibold text-zinc-700">Juzgado</TableHead>
                      <TableHead className="font-semibold text-zinc-700">Expediente</TableHead>
                      <TableHead className="font-semibold text-zinc-700">Estado</TableHead>
                      <TableHead className="font-semibold text-zinc-700 text-right pr-6">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivaciones.map((derivacion) => {
                      const adultoMayor = adultosMayores?.find(am => am.id === derivacion.adultoMayorId);
                      return (
                        <TableRow key={derivacion.id} className="hover:bg-zinc-50/50">
                          <TableCell className="font-medium text-zinc-900">
                            {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido}` : "N/A"}
                          </TableCell>
                          <TableCell>{derivacion.fechaDerivacion ? new Date(derivacion.fechaDerivacion).toLocaleDateString('es-AR') : "N/A"}</TableCell>
                          <TableCell>{derivacion.juzgado || "N/A"}</TableCell>
                          <TableCell>{derivacion.numeroExpediente || "N/A"}</TableCell>
                          <TableCell>
                            <Badge className={`${getEstadoColor(derivacion.estadoDerivacion)} border-none shadow-none`}>
                              {getEstadoLabel(derivacion.estadoDerivacion)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#5B2D8E] hover:text-[#4a2473] hover:bg-purple-50"
                              onClick={() => handleEdit(derivacion)}
                            >
                              <Edit className="h-4 w-4" />
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
            <Card className="border-dashed border-2 py-12">
              <CardContent className="flex flex-col items-center justify-center">
                <Scale className="h-12 w-12 text-zinc-300 mb-4" />
                <p className="text-zinc-500 font-medium">No hay derivaciones registradas</p>
                <Button className="mt-4 bg-[#5B2D8E] hover:bg-[#4a2473] text-white" onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera derivación
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tarjetas" className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : derivaciones && derivaciones.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {derivaciones.map((derivacion) => {
                const adultoMayor = adultosMayores?.find(am => am.id === derivacion.adultoMayorId);
                return (
                  <Card key={derivacion.id} className="hover:shadow-md transition-shadow border-zinc-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900">
                            <Scale className="h-4 w-4 text-[#5B2D8E]" />
                            Derivación Judicial
                          </CardTitle>
                          <CardDescription className="mt-1 font-medium text-[#5B2D8E]">
                            {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido}` : "N/A"}
                          </CardDescription>
                        </div>
                        <Badge className={`${getEstadoColor(derivacion.estadoDerivacion)} border-none shadow-none shrink-0`}>
                          {getEstadoLabel(derivacion.estadoDerivacion)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-zinc-600">
                        <p><strong className="text-zinc-800">Fecha:</strong> {derivacion.fechaDerivacion ? new Date(derivacion.fechaDerivacion).toLocaleDateString('es-AR') : "N/A"}</p>
                        <p><strong className="text-zinc-800">Juzgado:</strong> {derivacion.juzgado || "N/A"}</p>
                        <p><strong className="text-zinc-800">Expediente:</strong> {derivacion.numeroExpediente || "N/A"}</p>
                        <p><strong className="text-zinc-800">Fiscalía:</strong> {derivacion.fiscalia || "N/A"}</p>
                        {derivacion.motivo && (
                          <div className="pt-1">
                            <p><strong className="text-zinc-800">Motivo:</strong></p>
                            <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{derivacion.motivo}</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(derivacion)}
                          className="w-full border-zinc-200 hover:bg-purple-50 hover:text-[#5B2D8E] transition-colors"
                        >
                          <Edit className="h-4 w-4 mr-1.5" />
                          Actualizar Caso
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed border-2 py-12">
              <CardContent className="flex flex-col items-center justify-center">
                <Scale className="h-12 w-12 text-zinc-300 mb-4" />
                <p className="text-zinc-500 font-medium">No hay derivaciones registradas</p>
                <Button className="mt-4 bg-[#5B2D8E] hover:bg-[#4a2473] text-white" onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera derivación
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de edición */}
      <Dialog open={editOpen} onOpenChange={(isOpen) => {
        setEditOpen(isOpen);
        if (!isOpen) setEditingId(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleUpdateSubmit}>
            <DialogHeader>
              <DialogTitle className="text-[#5B2D8E]">Actualizar Derivación</DialogTitle>
              <DialogDescription>
                Modifique el estado y detalles de la derivación judicial
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="estadoDerivacion">Estado Derivación *</Label>
                <Select
                  value={editForm.estadoDerivacion}
                  onValueChange={(value) => setEditForm({ ...editForm, estadoDerivacion: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iniciada">Iniciada</SelectItem>
                    <SelectItem value="en_tramite">En Trámite</SelectItem>
                    <SelectItem value="finalizada">Finalizada</SelectItem>
                    <SelectItem value="archivada">Archivada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="editNumeroExpediente">Número Expediente</Label>
                  <Input
                    id="editNumeroExpediente"
                    value={editForm.numeroExpediente}
                    onChange={(e) => setEditForm({ ...editForm, numeroExpediente: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editFiscalia">Fiscalía</Label>
                  <Input
                    id="editFiscalia"
                    value={editForm.fiscalia}
                    onChange={(e) => setEditForm({ ...editForm, fiscalia: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editDocumentacionAdjunta">Documentación Adjunta</Label>
                <Input
                  id="editDocumentacionAdjunta"
                  value={editForm.documentacionAdjunta}
                  onChange={(e) => setEditForm({ ...editForm, documentacionAdjunta: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editObservaciones">Observaciones</Label>
                <Textarea
                  id="editObservaciones"
                  value={editForm.observaciones}
                  onChange={(e) => setEditForm({ ...editForm, observaciones: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" className="bg-[#5B2D8E] hover:bg-[#4a2473] text-white" disabled={updateMutation.isPending}>
                Actualizar Derivación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}