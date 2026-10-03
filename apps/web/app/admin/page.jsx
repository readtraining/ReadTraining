import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata = { title: "Admin | Business account dashboard" };

// Admin side: business account dashboard. Standalone page (no site header/footer).
export default function AdminPage() {
  return (
    <div className="rt-home ad-page">
      <AdminDashboard />
    </div>
  );
}
