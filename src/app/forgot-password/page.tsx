import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Receipt } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-7 w-7 text-primary" />
            <span className="text-2xl font-bold tracking-tight">Billar</span>
          </div>
          <p className="text-sm text-muted-foreground">Reset your password</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
