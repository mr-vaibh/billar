import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { Receipt } from 'lucide-react';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-7 w-7 text-primary" />
            <span className="text-2xl font-bold tracking-tight">Billar</span>
          </div>
          <span className="text-xs bg-destructive/10 text-destructive font-medium px-2 py-0.5 rounded">Super Admin</span>
          <p className="text-sm text-muted-foreground">Admin portal sign in</p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
