import { Suspense } from "react";
import { AdminPageContent } from "@/components/admin/AdminPageContent";

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-alpine/60">Loading admin…</div>}>
      <AdminPageContent />
    </Suspense>
  );
}
