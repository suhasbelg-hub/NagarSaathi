import AppRouter from "@/components/app-router";
import { DemoProvider } from "@/components/demo-store";

export default function CatchAllPage() {
  return (
    <DemoProvider>
      <AppRouter />
    </DemoProvider>
  );
}
