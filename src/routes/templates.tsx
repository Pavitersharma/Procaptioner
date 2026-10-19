import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { TemplatesView } from "@/components/dashboard/templates-view";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Caption Templates — ProCaptioner" },
      {
        name: "description",
        content: "Browse all 30+ cinematic, viral shorts, podcast, and editorial caption templates.",
      },
    ],
  }),
  component: TemplatesPage,
});

export function TemplatesPage() {
  return (
    <DashboardLayout activeTab="templates">
      <TemplatesView />
    </DashboardLayout>
  );
}
