import { ManagerLayoutShell } from "@/components/layout/ManagerLayoutShell";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ManagerLayoutShell>{children}</ManagerLayoutShell>;
}
