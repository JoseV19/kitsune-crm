import { OrganizationProvider } from "@/lib/contexts/organization-context";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  return (
    <OrganizationProvider slug={domain}>
      {children}
    </OrganizationProvider>
  );
}
