import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-50 px-4 py-8 pb-[env(safe-area-inset-bottom)]">
      <div className="mb-6 w-full max-w-md text-center sm:mb-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white">
          PS
        </div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">The Pour Stop</h1>
        <p className="mt-1 text-sm text-slate-500">Inventory Management System</p>
      </div>
      <LoginForm />
    </div>
  );
}
