import Link from "next/link";
import { CreateManagerForm } from "@/components/managers/CreateManagerForm";

export default function NewManagerPage() {
  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <Link
          href="/admin/managers"
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Managers
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Create Manager</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a new manager account. They will be able to sign in with these credentials.
        </p>
      </div>
      <CreateManagerForm />
    </div>
  );
}
