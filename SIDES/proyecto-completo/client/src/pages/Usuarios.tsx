import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Shield, Mail, Key, Fingerprint, Eye, EyeOff, ArrowLeft, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

// Definimos una interfaz estricta basada en tu esquema de base de datos
interface Usuario {
  id: number;
  openId: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "user";
}

export default function Usuarios() {
  // 🔄 Estado para controlar qué vista mostrar: "lista" o "alta"
  const [vista, setVista] = useState<"lista" | "alta">("lista");

  // 📝 Estados del formulario de alta
  const [openId, setOpenId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"superadmin" | "admin" | "user">("admin");
  
  // Estado para controlar si se muestra o se oculta la contraseña
  const [showPassword, setShowPassword] = useState(false);

  // ✏️ Estados para controlar el modal flotante de edición con tipado correcto
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"superadmin" | "admin" | "user">("admin");

  // Limpieza preventiva al cambiar de vista
  useEffect(() => {
    setUsuarioEditando(null);
  }, [vista]);

  // 🔌 Consumo de tRPC: Traer la lista de usuarios
  const { data: listaUsuarios, refetch: recargarUsuarios, isLoading, error: errorQuery } = trpc.usuarios.list.useQuery(undefined, {
    enabled: vista === "lista",
  });

  useEffect(() => {
    if (errorQuery) {
      toast.error(errorQuery.message || "No se pudieron cargar los usuarios.");
    }
  }, [errorQuery]);

  // 🚀 Mutación para crear el usuario en el backend
  const createUserMutation = trpc.usuarios.create.useMutation({
    onSuccess: () => {
      toast.success("¡Usuario creado con éxito en el sistema!");
      setOpenId("");
      setName("");
      setEmail("");
      setPassword("");
      setRole("admin");
      
      recargarUsuarios();
      setVista("lista");
    },
    onError: (err) => {
      toast.error(err.message || "Error al crear el usuario.");
    },
  });

  // 💾 Mutación para guardar los datos modificados (mapeado exacto a tu router.ts)
  const updateUserMutation = trpc.usuarios.update.useMutation({
    onSuccess: () => {
      toast.success("¡Usuario actualizado correctamente!");
      setUsuarioEditando(null);
      recargarUsuarios();
    },
    onError: (err) => {
      toast.error(err.message || "Error al actualizar el usuario.");
    },
  });

  // 🗑️ Mutación para eliminar un usuario del sistema
  const deleteUserMutation = trpc.usuarios.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuario eliminado del sistema.");
      recargarUsuarios();
    },
    onError: (err) => {
      toast.error(err.message || "Error al eliminar el usuario.");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate({
      openId,
      name,
      email,
      password,
      role: role as any, 
    });
  };

  const handleAbrirEdicion = (user: Usuario) => {
    setUsuarioEditando(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
  };

  const handleSubmitEdicion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando) return;

    // Pasamos exactamente los campos requeridos por tu Zod Schema en routers.ts
    updateUserMutation.mutate({
      id: Number(usuarioEditando.id),
      openId: usuarioEditando.openId, 
      name: editName,
      email: editEmail,
      role: editRole,
    });
  };

  const handleEliminar = (id: number, nombre: string) => {
    if (confirm(`¿Estás seguro de que querés eliminar a ${nombre}? Esta acción no se puede deshacer.`)) {
      deleteUserMutation.mutate({ id: Number(id) });
    }
  };

  const isPending = createUserMutation.isPending;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6 px-4">
      {/* 🧭 Cabecera dinámica */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-purple-100 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-purple-950 flex items-center gap-2">
            {vista === "lista" ? (
              <>
                <Shield className="h-8 w-8 text-purple-700" />
                Gestión de Personal Institucional
              </>
            ) : (
              <>
                <UserPlus className="h-8 w-8 text-purple-700" />
                Alta de Personal Institucional
              </>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {vista === "lista" 
              ? "Listado y control de los operadores del sistema con acceso autorizado."
              : "Como Superadmin, podés dar de alta operadores."}
          </p>
        </div>

        <Button
          onClick={() => setVista(vista === "lista" ? "alta" : "lista")}
          className="bg-purple-700 hover:bg-purple-800 text-white font-medium shadow-sm"
        >
          {vista === "lista" ? (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Nuevo Operador
            </>
          ) : (
            <>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Listado
            </>
          )}
        </Button>
      </div>

      {/* 📋 VISTA 1: TABLA */}
      {vista === "lista" && (
        <div className="bg-white rounded-xl shadow-md border border-purple-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              Cargando el listado de personal...
            </div>
          ) : !listaUsuarios || listaUsuarios.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No hay operadores registrados en el sistema.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-purple-50/50 border-b border-purple-100 text-purple-950 text-xs uppercase tracking-wider font-semibold">
                    <th className="p-4">Nombre Completo</th>
                    <th className="p-4">DNI (ID Único)</th>
                    <th className="p-4">Correo Electrónico</th>
                    <th className="p-4">Rol Asignado</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50 text-slate-700 text-sm">
                  {listaUsuarios.map((user: any) => (
                    <tr key={user.id} className="hover:bg-purple-50/20 transition-colors">
                      <td className="p-4 font-medium text-slate-900">{user.name}</td>
                      <td className="p-4 font-mono text-xs">{user.openId}</td>
                      <td className="p-4">{user.email}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${
                          user.role === "superadmin" ? "bg-purple-100 text-purple-800 border border-purple-200" :
                          user.role === "admin" ? "bg-blue-100 text-blue-800 border border-blue-200" : 
                          "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          {user.role === "superadmin" ? "Superadmin" :
                           user.role === "admin" ? "Administrador" : "Consulta"}
                        </span>
                      </td>
                      <td className="p-4 text-center flex justify-center items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAbrirEdicion(user)}
                          className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminar(user.id, user.name)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ➕ VISTA 2: ALTA */}
      {vista === "alta" && (
        <div className="bg-white rounded-xl shadow-md border border-purple-100 p-6 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Nombre Completo</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Pérez" className="w-full px-4 h-10 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">DNI</label>
              <input type="text" required value={openId} onChange={(e) => setOpenId(e.target.value)} placeholder="40123456" className="w-full px-4 h-10 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Correo Electrónico</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operador@ministerio.gob.ar" className="w-full px-4 h-10 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Contraseña Inicial</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Definir contraseña" className="w-full pl-4 pr-12 h-10 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Rol</label>
              <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="superadmin">Superadmin</option>
                <option value="admin">Administrador</option>
                <option value="user">Usuario de Consulta</option>
              </select>
            </div>
            <Button type="submit" disabled={isPending} className="w-full bg-purple-700 hover:bg-purple-800 text-white h-11 mt-4">
              {isPending ? "Guardando..." : "Dar de Alta"}
            </Button>
          </form>
        </div>
      )}

      {/* 🪟 MODAL FLOTANTE (OVERLAY): EDICIÓN DE OPERADOR */}
      {usuarioEditando && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-purple-100 max-w-md w-full overflow-hidden">
            <div className="bg-purple-50 px-6 py-4 flex justify-between items-center border-b border-purple-100">
              <h2 className="text-lg font-bold text-purple-950">Modificar Datos de Operador</h2>
              <button type="button" onClick={() => setUsuarioEditando(null)} className="p-1 rounded-md text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitEdicion} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">DNI (No modificable)</label>
                <input type="text" disabled value={usuarioEditando.openId} className="w-full px-3 h-10 rounded-lg border border-slate-100 bg-slate-50 text-slate-400 text-sm cursor-not-allowed outline-none" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Nombre Completo</label>
                <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 h-10 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Correo Electrónico</label>
                <input type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full px-3 h-10 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Rol Asignado</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value as any)} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="superadmin">Superadmin</option>
                  <option value="admin">Administrador</option>
                  <option value="user">Consulta</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setUsuarioEditando(null)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending} className="flex-1 bg-purple-700 hover:bg-purple-800 text-white">
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}