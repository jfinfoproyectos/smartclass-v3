import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ScrollRestorer } from "@/components/ScrollRestorer";
import { ThemeInitializer } from "@/components/theme/ThemeInitializer";
import NextTopLoader from "nextjs-toploader";
import { getAvailableThemes } from "@/app/actions/themes";
import { getVisualSettingsAction } from "@/app/actions/settings";
import { NetworkStatus } from "@/components/NetworkStatus";


export const metadata: Metadata = {
  title: "SmartClass",
  description: "Plataforma educativa inteligente",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [themes, visualSettings] = await Promise.all([
    getAvailableThemes(),
    getVisualSettingsAction()
  ]);

  const isForced = !visualSettings.allowThemeColorChange;
  const forcedTheme = isForced && visualSettings.themeColor && visualSettings.themeColor !== "zinc"
    ? themes.find(t => t.id === visualSettings.themeColor) 
    : null;

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Chakra+Petch:wght@400;600;700&family=Cinzel:wght@400;700&family=Comfortaa:wght@400;700&family=DM+Sans:wght@400;500;700&family=Fira+Code:wght@400;600&family=Inter:wght@400;500;600;700&family=Lato:wght@400;700&family=Lora:wght@400;600;700&family=Montserrat:wght@400;600;700&family=Nunito:wght@400;600;700&family=Orbitron:wght@400;700;900&family=Outfit:wght@300;400;500;600;700;800;900&family=Oxanium:wght@400;600;700&family=Patrick+Hand&family=Plus+Jakarta+Sans:wght@400;600;700&family=Poppins:wght@400;600;700&family=Quicksand:wght@400;600;700&family=Rajdhani:wght@400;600;700&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />
        {isForced && forcedTheme ? (
          <style 
            id="smartclass-dynamic-theme" 
            dangerouslySetInnerHTML={{ __html: forcedTheme.cssContent }} 
          />
        ) : (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    var css = localStorage.getItem("smartclass-theme-css-v2");
                    if (css) {
                      var style = document.createElement("style");
                      style.id = "smartclass-dynamic-theme";
                      style.innerHTML = css;
                      document.head.appendChild(style);
                    }
                  } catch (e) {}
                })();
              `,
            }}
          />
        )}
      </head>
      <body className="overflow-x-hidden max-w-full min-h-screen">
        <NextTopLoader 
          color="var(--primary, #3b82f6)" 
          initialPosition={0.08} 
          crawlSpeed={200} 
          height={3} 
          crawl={true} 
          showSpinner={false} 
          easing="ease" 
          speed={200} 
          shadow="0 0 10px var(--primary, #3b82f6),0 0 5px var(--primary, #3b82f6)"
          zIndex={999999}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme={visualSettings.themeMode === "DARK" ? "dark" : visualSettings.themeMode === "LIGHT" ? "light" : "light"}
          enableSystem={visualSettings.themeMode === "STUDENT"}
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <ThemeInitializer />
            <ScrollRestorer />
          </Suspense>
          {children}
          <NetworkStatus />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
