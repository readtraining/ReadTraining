import ProviderDashboard from "@/components/admin/ProviderDashboard";

export const metadata = { title: "Admin | Provider workspace" };

export default function AdminProviderPage() {
  return (
    <div className="rt-home ad-page">
      <ProviderDashboard />
    </div>
  );
}
