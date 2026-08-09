import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { getRoleFromUser } from "@/features/auth/services/authService";
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
import { MobileSettingsMenu } from "@/components/MobileSettingsMenu";
import { Sparkles } from "lucide-react";

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

  const role = session ? getRoleFromUser(session.user) : null;
  const isStaff = role === "teacher" || role === "admin";
  const showModeToggle = visualSettings.themeMode === "STUDENT" || isStaff;
  const showThemeSelector = visualSettings.allowThemeColorChange || isStaff;

  return (
    <SidebarProvider defaultOpen={true}>
      <PWARegister />
      <ThemeEnforcer 
        themeMode={visualSettings.themeMode} 
        themeColor={visualSettings.themeColor}
        allowThemeColorChange={visualSettings.allowThemeColorChange}
      />
      <ProfileCompletionCheck />
      
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden flex flex-col bg-background">
        {/* Top Header Bar matching AppIdentity height (h-16), background and bottom border */}
        <header className="shrink-0 sticky top-0 z-40 flex h-16 w-full items-center bg-background/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-all shadow-none">
          <div className="flex h-full w-full items-center justify-between px-3 sm:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-muted/60 transition-all" />
              
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>SmartClass Engine</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Desktop Header Action Bar */}
              <div className="hidden md:flex items-center gap-2 bg-muted/40 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-md">
                {showThemeSelector && <ThemeSelector themes={themes} />}
                {showModeToggle && <ModeToggle />}
                <PushNotificationToggle />
                <CreditsModal />
              </div>

              {/* Mobile Dropdown Settings Menu */}
              <div className="md:hidden">
                <MobileSettingsMenu 
                  themes={themes}
                  showThemeSelector={showThemeSelector}
                  showModeToggle={showModeToggle}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden relative">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,white,transparent)] pointer-events-none -z-10 opacity-60" />
          <div className="flex-1 flex flex-col p-2 sm:p-4 min-h-0 overflow-y-auto">
            {children}
          </div>
        </div>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
