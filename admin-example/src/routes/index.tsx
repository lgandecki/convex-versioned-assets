import { createFileRoute } from "@tanstack/react-router";
import { AssetDemo } from "../components/AssetDemo";

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute() {
  return <AssetDemo />;
}
