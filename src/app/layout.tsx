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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
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
      <body>
        <NextTopLoader 
          color="#3b82f6" 
          initialPosition={0.08} 
          crawlSpeed={200} 
          height={3} 
          crawl={true} 
          showSpinner={false} 
          easing="ease" 
          speed={200} 
          shadow="0 0 10px #3b82f6,0 0 5px #3b82f6"
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
