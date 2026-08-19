import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import AppSidebar from "../AppSidebar";
import DataToolbar from "../DataToolbar";
import MobileNav from "../MobileNav";
import ShareImportHandler from "../ShareImportHandler";
import { Button } from "../ui";

/**
The page chrome every cluster shares: header, mobile nav, sidebar, and the
main content column `children` renders into.
*/
export default function AppLayout({
  onNavigate,
  onReopenSplash,
  children,
}: {
  onNavigate: (id: string) => void;
  onReopenSplash: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <ShareImportHandler />
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
          <div className="mr-auto">
            <h1 className="text-base font-semibold tracking-tight">
              {t("app.header.title", "Home Buy Planner")}
            </h1>
          </div>
          <Button variant="ghost" size="sm" onClick={onReopenSplash}>
            {t("app.header.about", "About this tool")}
          </Button>
          <DataToolbar />
        </div>
      </header>
      <MobileNav onNavigate={onNavigate} />

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 md:grid-cols-[280px_1fr]">
        <AppSidebar onNavigate={onNavigate} />
        <main className="min-w-0 space-y-12">
          {children}

          <footer className="border-t border-slate-200 pt-6 text-xs text-slate-400">
            {t(
              "app.footer",
              "Your numbers are saved in this browser only. Use Export to keep a backup.",
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}
