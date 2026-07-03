import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white">
          PS
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">The Pour Stop</h1>
        <p className="mt-1 text-sm text-slate-500">Inventory Management System</p>
      </div>
      <LoginForm />
    </div>
  );
}
