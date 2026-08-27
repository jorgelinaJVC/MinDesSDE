import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_TITLE } from "@/const";
import { ShieldCheck, UserCircle, Loader2, Lock, Mail } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

export default function Home() {
  const [, setLocation] = useLocation();
  
  // Estados locales para capturar lo que escribas en el formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isAuthenticated, loading, login } = useAuth({ redirectOnUnauthenticated: false });

  // 🛡️ EFECTO CORREGIDO PARA EVITAR EL BUCLE:
  useEffect(() => {
    const isExplicitLogin = window.location.pathname === "/login";

    if (!loading && isAuthenticated && !isExplicitLogin) {
      setLocation("/");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#5B2D8E] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    try {
      if (login) {
        await login(email, password);
        window.location.href = "/";
      }
    } catch (err: any) {
      console.error("Error en login front:", err);
      setLoginError(err?.message || "Ocurrió un error al intentar iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // 🎨 CAMBIO: Fondo general de la página con el morado institucional exacto
    <div className="min-h-screen bg-[#5B2D8E] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Encabezado Institucional */}
        {/* 🎨 CAMBIO: Ajustado el banner interno del login a la misma identidad */}
        <div className="bg-[#5B2D8E]/10 border-b border-purple-100 p-8 flex flex-col items-center justify-center text-center">
          <div className="h-20 w-20 bg-white rounded-2xl p-2 mb-4 shadow-md flex items-center justify-center overflow-hidden">
            <img 
              src="/logo-adultos.png" 
              alt="Logo SIDES" 
              className="h-full w-full object-contain" 
            />
          </div>
          {/* 🎨 CAMBIO: Texto a color oscuro para que contraste perfectamente sobre el nuevo header claro */}
          <h1 className="text-2xl font-black text-slate-800 mb-1">
            {APP_TITLE || "Adultos Mayores"}
          </h1>
          <p className="text-purple-900 font-medium text-xs tracking-wide uppercase">
            Sistema de Gestión Integral y Vulnerabilidad
          </p>
        </div>
        
        {/* Cuerpo del Login */}
        <div className="p-8 flex flex-col items-center">
          {/* 🎨 CAMBIO: Icono principal usando el morado corporativo */}
          <ShieldCheck className="h-12 w-12 text-[#5B2D8E] mb-2" />
          <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">Acceso Restringido</h2>
          <p className="text-slate-600 mb-6 text-sm text-center">
            Este sistema contiene información sensible y confidencial. Por favor, identifícate de forma segura para continuar.
          </p>

          {/* Formulario HTML interactivo */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            
            {/* Campo Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                {/* 🎨 CAMBIO: El focus ring ahora brilla con el morado correcto */}
                <input
                  type="email"
                  required
                  placeholder="ejemplo@ministerio.gob.ar"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 h-11 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5B2D8E] focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                {/* 🎨 CAMBIO: El focus ring ahora brilla con el morado correcto */}
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 h-11 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5B2D8E] focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            {/* Alerta de Error Dinámica */}
            {loginError && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs text-center font-medium">
                ⚠️ {loginError}
              </div>
            )}
            
            {/* Botón de envío */}
            {/* 🎨 CAMBIO: Botón estilizado con el color de marca e intensificado el hover */}
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#5B2D8E] hover:bg-[#482373] text-white h-12 text-base font-bold shadow-md transition-all mt-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <UserCircle className="mr-2 h-5 w-5" />
              )}
              {isSubmitting ? "Autenticando..." : "Ingresar al Sistema"}
            </Button>

          </form>
        </div>
        
      </div>
    </div>
  );
}