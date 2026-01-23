import { Authenticated, Unauthenticated } from "convex/react";
import { AdminPanel, AdminUIProvider } from "@/admin-ui";
import { LoginModal } from "@/admin-ui/components/LoginModal";
import { api } from "../convex/_generated/api";

export default function App() {
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
