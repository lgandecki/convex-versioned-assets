import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { AdminPanel, AdminUIProvider } from "@/admin-ui";
import { LoginModal } from "@/admin-ui/components/LoginModal";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/admin")({
  component: AdminRoute,
});

function AdminRoute() {
  return (
    <AdminUIProvider api={api}>
      <Authenticated>
        <AdminPanel />
      </Authenticated>
      <Unauthenticated>
        <LoginModal open={true} />
      </Unauthenticated>
    </AdminUIProvider>
  );
}
