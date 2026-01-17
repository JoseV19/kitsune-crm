import { redirect } from "next/navigation";

export default async function TenantRootPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  redirect(`/${domain}/dashboard`);
}
