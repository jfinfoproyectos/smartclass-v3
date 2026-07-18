import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { CreditsModal } from "@/components/CreditsModal";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Footer } from "@/components/Footer";
import { ProfileCompletionCheck } from "@/components/profile/ProfileCompletionCheck";
import { getAvailableThemes } from "@/app/actions/themes";
import { getVisualSettingsAction } from "@/app/actions/settings";
import { ThemeEnforcer } from "@/components/theme/ThemeEnforcer";
import { PWARegister } from "@/components/PWARegister";
import { PushNotificationToggle } from "@/components/notification/PushNotificationToggle";


export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/");
  }

  const [themes, visualSettings] = await Promise.all([
    getAvailableThemes(),
    getVisualSettingsAction()
  ]);

  const showModeToggle = visualSettings.themeMode === "STUDENT";
  const showThemeSelector = visualSettings.allowThemeColorChange;

  return (

    <SidebarProvider defaultOpen={false}>
      <PWARegister />
      <ThemeEnforcer 
        themeMode={visualSettings.themeMode} 
        themeColor={visualSettings.themeColor}
        allowThemeColorChange={visualSettings.allowThemeColorChange}
      />
      <ProfileCompletionCheck />
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden flex flex-col">
        <header className="shrink-0 sticky top-0 z-40 flex h-16 w-full items-center gap-2 bg-background text-foreground border-b group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 transition-all">
          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              {showThemeSelector && <ThemeSelector themes={themes} />}
              {showModeToggle && <ModeToggle />}
              <PushNotificationToggle />
              <CreditsModal />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col overflow-hidden relative">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,white,transparent)] pointer-events-none -z-10" />
          <div className="flex-1 flex flex-col p-2 sm:p-4 min-h-0 overflow-y-auto">
            {children}
          </div>
        </div>
        <Footer />
      </SidebarInset>
    </SidebarProvider>

  );
}
