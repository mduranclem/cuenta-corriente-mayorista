import type { ReactNode } from 'react';

type SidebarPage = 'dashboard' | 'clientes' | 'cuenta' | 'historial' | 'nuevo-cliente' | 'productos' | 'backup';

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
  { id: 'backup', label: 'Respaldo', icon: <span className="text-lg">💾</span> },
];

interface SidebarProps {
  active: SidebarPage;
  onSelect: (id: SidebarPage) => void;
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  return (
    <>
      {/* Sidebar de escritorio */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-panel px-5 py-8 lg:flex">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-textSecondary">Gestión mayorista</p>
          <h1 className="mt-3 text-3xl font-semibold text-textPrimary">Cuenta corriente</h1>
        </div>
        <nav className="space-y-2">
          {items.map((item) => (
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

      {/* Navegación móvil (bottom navigation) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-panel border-t border-border lg:hidden">
        <div className="flex justify-around px-2 py-2">
          {items.slice(0, 5).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex flex-col items-center gap-1 px-2 py-2 text-xs transition ${
                active === item.id
                  ? 'text-accent'
                  : 'text-textSecondary'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="truncate max-w-12">{item.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
        {/* Navegación secundaria si hay más de 5 items */}
        {items.length > 5 && (
          <div className="flex justify-center border-t border-border px-2 py-1">
            {items.slice(5).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`flex flex-col items-center gap-1 px-4 py-1 text-xs transition ${
                  active === item.id
                    ? 'text-accent'
                    : 'text-textSecondary'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
