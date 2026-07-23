import { useState } from 'react';
import type { ReactNode } from 'react';

type SidebarPage = 'inicio' | 'dashboard' | 'clientes' | 'cuenta' | 'historial' | 'nuevo-cliente' | 'productos' | 'backup' | 'admin' | 'listas-precios' | 'auditoria' | 'presupuestos' | 'reportes';

interface SidebarItem {
  id: SidebarPage;
  label: string;
  icon: ReactNode;
}

const mainItems: SidebarItem[] = [
  { id: 'inicio',         label: 'Inicio',            icon: <span className="text-lg">🏠</span> },
  { id: 'dashboard',      label: 'Nueva factura',     icon: <span className="text-lg">🧾</span> },
  { id: 'presupuestos',   label: 'Presupuestos',      icon: <span className="text-lg">📋</span> },
  { id: 'clientes',       label: 'Clientes',          icon: <span className="text-lg">👥</span> },
  { id: 'historial',      label: 'Historial',         icon: <span className="text-lg">📜</span> },
  { id: 'productos',      label: 'Productos',         icon: <span className="text-lg">🧵</span> },
  { id: 'listas-precios', label: 'Listas de precios', icon: <span className="text-lg">🏷️</span> },
];

const secondaryItems: SidebarItem[] = [
  { id: 'reportes',  label: 'Reportes',       icon: <span className="text-lg">📊</span> },
  { id: 'admin',     label: 'Administración', icon: <span className="text-lg">⚙️</span> },
  { id: 'auditoria', label: 'Auditoría',      icon: <span className="text-lg">🛡️</span> },
  { id: 'backup',    label: 'Respaldo',       icon: <span className="text-lg">💾</span> },
];

interface SidebarProps {
  active: SidebarPage;
  onSelect: (id: SidebarPage) => void;
  currentUserData?: any;
}

function NavButton({ item, active, onSelect }: { item: SidebarItem; active: SidebarPage; onSelect: (id: SidebarPage) => void }) {
  return (
    <button
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
  );
}

export function Sidebar({ active, onSelect, currentUserData }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const isAdmin = currentUserData?.rol === 'admin';

  const handleSelect = (id: SidebarPage) => {
    onSelect(id);
    setOpen(false);
  };

  const navContent = (
    <>
      <nav className="space-y-1">
        {mainItems.map((item) => (
          <NavButton key={item.id} item={item} active={active} onSelect={handleSelect} />
        ))}
      </nav>
      <div className="mt-6 border-t border-border pt-4 space-y-1">
        {secondaryItems
          .filter(item => !['admin', 'reportes', 'backup'].includes(item.id) || isAdmin)
          .map((item) => (
            <NavButton key={item.id} item={item} active={active} onSelect={handleSelect} />
          ))}
      </div>
    </>
  );

  return (
    <>
      {/* Sidebar escritorio */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-panel px-5 py-8 lg:flex">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-textSecondary">Gestión mayorista</p>
          <h1 className="mt-3 text-3xl font-semibold text-textPrimary">Cuenta corriente</h1>
        </div>
        {navContent}
        <div className="mt-auto pt-6 text-center">
          <span className="text-xs text-textSecondary opacity-50">v0.3.0</span>
        </div>
      </aside>

      {/* Botón hamburguesa — solo mobile */}
      <button
        type="button"
        aria-label="Abrir menú"
        className="fixed top-4 left-4 z-50 flex items-center justify-center rounded-2xl bg-panel p-3 shadow-lg border border-border lg:hidden"
        onClick={() => setOpen(true)}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="5" x2="17" y2="5" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="15" x2="17" y2="15" />
        </svg>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer lateral mobile */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-panel border-r border-border flex flex-col px-5 py-8 transition-transform duration-300 lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-textSecondary">Gestión mayorista</p>
            <h1 className="mt-2 text-2xl font-semibold text-textPrimary">Cuenta corriente</h1>
          </div>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="rounded-xl p-2 text-textSecondary hover:bg-border transition"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="16" y2="16" />
              <line x1="16" y1="2" x2="2" y2="16" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {navContent}
        </div>
      </div>
    </>
  );
}
