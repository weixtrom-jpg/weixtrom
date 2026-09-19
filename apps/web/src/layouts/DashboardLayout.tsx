import { type ReactNode } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  roleName: string;
  navItems: NavItem[];
}

export function DashboardLayout({ children, roleName, navItems }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-muted">
      {/* Top bar */}
      <header className="bg-brand-navy text-white h-14 flex items-center px-4 lg:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">WEIXTROM</span>
          <span className="text-blue-300 text-sm hidden sm:inline">| {roleName}</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <button className="text-blue-200 hover:text-white text-sm">Notificaciones</button>
          <button className="text-blue-200 hover:text-white text-sm">Mi perfil</button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - desktop */}
        <aside className="hidden lg:block w-60 bg-white border-r border-surface-border min-h-[calc(100vh-3.5rem)] p-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded-btn text-sm text-text-primary hover:bg-surface-muted transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>

      {/* Bottom nav - mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-surface-border h-16 flex items-center justify-around px-2 z-50">
        {navItems.slice(0, 5).map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 text-xs text-text-secondary min-w-[44px] min-h-[44px] justify-center"
          >
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
