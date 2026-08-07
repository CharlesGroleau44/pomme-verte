// app/admin/layout.tsx
import Sidebar from './Sidebar';
import NavMobile from './NavMobile';
import TopBarMobile from './TopBarMobile';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-pomme-cream">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBarMobile />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>
      <NavMobile />
    </div>
  );
}
