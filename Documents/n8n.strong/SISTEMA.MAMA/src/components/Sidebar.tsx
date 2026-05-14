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
    <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-white px-5 py-8 lg:flex">
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
                : 'text-textSecondary hover:bg-slate-50'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
