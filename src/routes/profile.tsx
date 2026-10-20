import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { SettingsView } from "@/components/dashboard/settings-view";
import { ProtectedRoute } from "@/components/auth/protected-route";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile Settings — ProCaptioner" },
      {
        name: "description",
        content: "Manage your ProCaptioner account, personal details, and preferences.",
      },
    ],
  }),
  component: ProfilePage,
});

export function ProfilePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout activeTab="settings">
        <SettingsView />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
