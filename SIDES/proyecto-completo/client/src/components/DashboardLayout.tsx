import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, Users, Building2, AlertCircle, Scale, History, FileText, UserPlus } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';

const menuItems = [
  { icon: LayoutDashboard, label: "Panel de Control", path: "/" },
  { icon: Users, label: "Adultos Mayores", path: "/adultos-mayores" },
  { icon: Building2, label: "Residencias de Larga Estadia", path: "/geriatricos" },
  { icon: AlertCircle, label: "Alertas", path: "/alertas" },
  { icon: History, label: "Seguimientos", path: "/seguimientos" },
  { icon: FileText, label: "Visitas y Reportes", path: "/visitas-reportes" },
  { icon: Scale, label: "Derivaciones", path: "/derivaciones" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [, setLocation] = useLocation();
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  
  const { isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: false });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!isAuthenticated) return null;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const handleLogoutDeSeguridad = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Error al limpiar sesión en servidor", e);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    }
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          // 🎨 CAMBIO: Agregamos el color morado corporativo como fondo general del Sidebar
          className="border-r-0 bg-[#5B2D8E]"
          disableTransition={isResizing}
        >
          {/* 🎨 CAMBIO: Ajustamos el Header del Sidebar con borde suave transparente */}
          <SidebarHeader className="h-16 justify-center border-b border-white/10 bg-[#5B2D8E]">
            <div className="flex items-center gap-3 pl-2 group-data-[collapsible=icon]:px-0 transition-all w-full">
              {isCollapsed ? (
                <div className="relative h-8 w-8 shrink-0 group mx-auto">
                  {/* 🎨 CAMBIO: Burbuja del logo blanca e integrada en modo colapsado */}
                  <div className="h-8 w-8 rounded-md bg-white flex items-center justify-center overflow-hidden border border-white/20">
                    <img
                      src="/logo-adultos.png"
                      className="h-full w-full object-contain scale-125"
                      alt="Logo"
                      onError={(e) => { e.currentTarget.style.display = 'none'; if(e.currentTarget.parentElement) e.currentTarget.parentElement.innerHTML = '💜'; }}
                    />
                  </div>
                  {/* 🎨 CAMBIO: El botón de expandir flotante se adapta en tonos claros */}
                  <button
                    onClick={toggleSidebar}
                    className="absolute inset-0 flex items-center justify-center bg-white rounded-md ring-1 ring-white/20 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                  >
                    <PanelLeft className="h-4 w-4 text-[#5B2D8E]" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    {/* 🎨 CAMBIO: Fondo blanco nítido para que resalte tu logo institucional */}
                    <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-white/20">
                      <img
                        src="/logo-adultos.png"
                        className="h-full w-full object-contain scale-125"
                        alt="Logo"
                        onError={(e) => { e.currentTarget.style.display = 'none'; if(e.currentTarget.parentElement) e.currentTarget.parentElement.innerHTML = '💜'; }}
                      />
                    </div>
                    {/* 🎨 CAMBIO: Letras del título del menú en color Blanco para contrastar */}
                    <span className="font-black tracking-wider text-sm text-white uppercase truncate">
                      Adultos Mayores
                    </span>
                  </div>
                  {/* 🎨 CAMBIO: Botón colapsar adaptado a hover transparente blanco */}
                  <button
                    onClick={toggleSidebar}
                    className="ml-auto h-8 w-8 flex items-center justify-center hover:bg-white/10 text-purple-200 hover:text-white rounded-lg transition-colors focus:outline-none shrink-0"
                  >
                    <PanelLeft className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </SidebarHeader>

          {/* 🎨 CAMBIO: El contenedor intermedio de scroll hereda el fondo exacto */}
          <SidebarContent className="gap-0 bg-[#5B2D8E]">
            <SidebarMenu className="px-2 py-3 space-y-1">
              {menuItems.map(item => {
                const isActive = location === item.path || (location === "/dashboard" && item.path === "/");
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      // 🎨 CAMBIO: Estilizado interactivo
                      // Si está activo: Fondo blanco semitransparente con letras blancas y más gruesas
                      // Si está inactivo: Letras púrpura claro con hover blanco sutil
                      className={`h-11 transition-all font-medium rounded-xl px-3 ${
                        isActive 
                          ? "bg-white/15 text-white font-bold hover:bg-white/20 hover:text-white" 
                          : "text-purple-100 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <item.icon
                        className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-purple-200 group-hover:text-white"}`}
                      />
                      <span className="text-sm tracking-wide">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* 👑 ACCESO EXCLUSIVO SUPERADMIN */}
              {user?.role === "superadmin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location === "/usuarios"}
                    onClick={() => setLocation("/usuarios")}
                    tooltip="Gestión de Personal"
                    // 🎨 CAMBIO: Adaptado el botón de superadmin a la misma línea visual premium
                    className={`h-11 transition-all font-medium rounded-xl px-3 ${
                      location === "/usuarios" 
                        ? "bg-white/15 text-white font-bold hover:bg-white/20 hover:text-white" 
                        : "text-purple-100 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <UserPlus className={`h-5 w-5 shrink-0 ${location === "/usuarios" ? "text-white" : "text-purple-200"}`} />
                    <span className="text-sm tracking-wide">Gestión de Personal</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarContent>

          {/* 🎨 CAMBIO: Footer inferior que contiene el avatar del operador actual */}
          <SidebarFooter className="p-3 border-t border-white/10 bg-[#5B2D8E]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* 🎨 CAMBIO: Hover sutil traslúcido para destacar la caja de usuario */}
                <button className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/10 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none border border-transparent">
                  {/* 🎨 CAMBIO: El avatar ahora es blanco nítido con texto morado oscuro adentro */}
                  <Avatar className="h-9 w-9 shrink-0 border border-white/20 bg-white text-[#5B2D8E]">
                    <AvatarFallback className="text-xs font-black bg-white text-[#5B2D8E]">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {/* 🎨 CAMBIO: Ajustado los textos del perfil a claro sobre el fondo oscuro */}
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-bold text-white truncate leading-none">
                      {user?.name || "Usuario del Sistema"}
                    </p>
                    <p className="text-xs text-purple-200 truncate mt-1.5 font-medium">
                      {user?.email || "cargando..."}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-purple-100 shadow-md" translate="no">
                <DropdownMenuItem
                  onClick={handleLogoutDeSeguridad}
                  className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span className="font-medium">Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        
        {/* 🎨 CAMBIO: La barra intermedia que permite estirar el ancho del Sidebar */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-white/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          // 🎨 CAMBIO: En móviles, la cabecera superior ahora adopta un tono estilizado
          <div className="flex border-b border-purple-100 h-14 items-center justify-between bg-white/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-[#5B2D8E] font-black uppercase text-sm">
                    {activeMenuItem?.label ?? "Adultos Mayores"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 bg-slate-50/30">{children}</main>
      </SidebarInset>
    </>
  );
}