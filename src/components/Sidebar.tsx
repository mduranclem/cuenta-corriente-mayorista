import type { ReactNode } from 'react';

type SidebarPage = 'dashboard' | 'clientes' | 'cuenta' | 'historial' | 'nuevo-cliente' | 'productos' | 'backup' | 'admin';

interface SidebarItem {
  id: SidebarPage;
  label: string;
  icon: ReactNode;
}

const items: SidebarItem[] = [
  { id: 'dashboard', label: 'Nueva factura', icon: <span className="text-lg">🧾</span> },
  { id: 'clientes', label: 'Clientes', icon: <span className="text-lg">👥</span> },
  { id: 'cuenta', label: 'Cuenta corriente', icon: <span className="text-lg">💳</span> },
  { id: 'historial', label: 'Historial', icon: <span className="text-lg">📜</span> },
  { id: 'nuevo-cliente', label: 'Nuevo cliente', icon: <span className="text-lg">➕</span> },
  { id: 'productos', label: 'Productos', icon: <span className="text-lg">🧵</span> },
  { id: 'admin', label: 'Administración', icon: <span className="text-lg">👑</span> },
  { id: 'backup', label: 'Respaldo', icon: <span className="text-lg">💾</span> },
];

interface SidebarProps {
  active: SidebarPage;
  onSelect: (id: SidebarPage) => void;
  currentUserData?: any;
}

export function Sidebar({ active, onSelect, currentUserData }: SidebarProps) {
  const filteredItems = items.filter(item =>
    item.id !== 'admin' || currentUserData?.rol === 'admin'
  );
  return (
    <>
      {/* Sidebar de escritorio */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-panel px-5 py-8 lg:flex">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-textSecondary">Gestión mayorista</p>
          <h1 className="mt-3 text-3xl font-semibold text-textPrimary">Cuenta corriente</h1>
        </div>
        <nav className="space-y-2">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-left text-sm transition ${
                active === item.id
                  ? 'bg-accent text-white shadow-lg shadow-accent/10'
                  : 'text-textSecondary hover:bg-border'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Navegación móvil (sidebar lateral) */}
      <div className="fixed top-0 left-0 z-50 h-full w-64 transform -translate-x-full transition-transform duration-300 bg-panel border-r border-border lg:hidden" id="mobile-sidebar">
        <div className="p-6">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-textSecondary">Gestión mayorista</p>
            <h1 className="mt-3 text-2xl font-semibold text-textPrimary">Cuenta corriente</h1>
          </div>
          <nav className="space-y-2">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  // Cerrar el sidebar después de seleccionar
                  const sidebar = document.getElementById('mobile-sidebar');
                  if (sidebar) sidebar.classList.add('-translate-x-full');
                }}
                className={`flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-left text-sm transition ${
                  active === item.id
                    ? 'bg-accent text-white shadow-lg shadow-accent/10'
                    : 'text-textSecondary hover:bg-border'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Botón hamburguesa para abrir sidebar móvil */}
      <button
        type="button"
        className="fixed top-4 left-4 z-50 rounded-3xl bg-panel p-3 shadow-lg border border-border lg:hidden"
        onClick={() => {
          const sidebar = document.getElementById('mobile-sidebar');
          if (sidebar) {
            sidebar.classList.toggle('-translate-x-full');
          }
        }}
      >
        <span className="text-lg">☰</span>
      </button>

      {/* Overlay para cerrar sidebar */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden opacity-0 pointer-events-none transition-opacity duration-300"
        id="sidebar-overlay"
        onClick={() => {
          const sidebar = document.getElementById('mobile-sidebar');
          const overlay = document.getElementById('sidebar-overlay');
          if (sidebar && overlay) {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('opacity-0', 'pointer-events-none');
          }
        }}
      ></div>
    </>
  );
}
