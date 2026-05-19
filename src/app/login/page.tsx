import { LoginForm } from '@/components/auth/LoginForm';
import { Receipt } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-7 w-7 text-primary" />
            <span className="text-2xl font-bold tracking-tight">Billar</span>
          </div>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
