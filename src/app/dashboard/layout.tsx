import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { getRoleFromUser } from "@/features/auth/services/authService";
import { CreditsModal } from "@/components/CreditsModal";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { CodeThemeSelector } from "@/components/theme/CodeThemeSelector";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Footer } from "@/components/Footer";
import { ProfileCompletionCheck } from "@/components/profile/ProfileCompletionCheck";
import { getAvailableThemes } from "@/app/actions/themes";
import { getVisualSettingsAction } from "@/app/actions/settings";
import { ThemeEnforcer } from "@/components/theme/ThemeEnforcer";
import { PWARegister } from "@/components/PWARegister";
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

  const showModeToggle = true;
  const showThemeSelector = true;

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
      <SidebarInset className="h-svh overflow-hidden flex flex-col bg-background">
        {/* Top Header Bar matching AppIdentity height (h-12), background and bottom border */}
        <header className="shrink-0 sticky top-0 z-40 flex h-12 w-full items-center bg-background/80 backdrop-blur-xl border-b border-border/80 transition-all shadow-none">
          <div className="flex h-full w-full items-center justify-between px-3 sm:px-4">
            <div className="flex items-center gap-2.5">
              <SidebarTrigger className="h-8 w-8 rounded-lg border border-border hover:bg-muted/60 transition-all" />
              
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold">
                <Sparkles className="w-3 h-3" />
                <span>SmartClass Engine</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Desktop Header Action Bar */}
              <div className="hidden md:flex items-center gap-0.5 bg-muted/60 dark:bg-muted/30 p-0.5 rounded-xl border border-border/70 shadow-2xs backdrop-blur-md">
                {showThemeSelector && <ThemeSelector themes={themes} />}
                <CodeThemeSelector />
                {showModeToggle && <ModeToggle />}
                <div className="h-3.5 w-[1px] bg-border/80 mx-0.5" />
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
          <div className="flex-1 flex flex-col p-0.5 sm:p-1.5 min-h-0 overflow-y-auto">
            {children}
          </div>
        </div>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
