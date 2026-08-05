import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BookUser,
  CreditCard,
  DollarSign,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  QrCode,
  RefreshCw,
  Settings,
  ShoppingBag,
  Star,
  Truck,
  Wallet,
} from "lucide-react";

import { getHealth, type HealthResponse } from "@/api";
import { env } from "@/config/env";
import { FEATURES } from "@/config/features";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationBell } from "@/components/sender/NotificationBell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { getAdminNavKeyFromPath } from "@/features/admin/adminShellPaths";
import { AdminNavLinks } from "@/features/admin/components/AdminNav";
import { AdminShellBreadcrumbs } from "@/features/admin/components/AdminShellBreadcrumbs";
import { OrderQRScannerModal } from "@/features/orders/components";
import { cn } from "@/lib/utils";

const API_HINT = env.VITE_API_URL;

function SenderNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );
  return (
    <nav className="flex flex-col gap-1">
      <NavLink to="/dashboard/sender" end className={linkClass} onClick={onNavigate}>
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        {t("nav.senderDashboard")}
      </NavLink>
      <NavLink to="/dashboard/sender/orders" className={linkClass} onClick={onNavigate}>
        <ShoppingBag className="h-4 w-4 shrink-0" />
        {t("nav.senderOrders")}
      </NavLink>
      <NavLink to="/dashboard/sender/create" className={linkClass} onClick={onNavigate}>
        <PlusCircle className="h-4 w-4 shrink-0" />
        {t("nav.senderCreate")}
      </NavLink>
      <NavLink to="/dashboard/sender/addresses" className={linkClass} onClick={onNavigate}>
        <BookUser className="h-4 w-4 shrink-0" />
        {t("nav.senderAddresses")}
      </NavLink>
      {FEATURES.paymentMethods ? (
        <NavLink to="/dashboard/sender/payments" className={linkClass} onClick={onNavigate}>
          <CreditCard className="h-4 w-4 shrink-0" />
          {t("nav.senderPayments")}
        </NavLink>
      ) : null}
      <NavLink to="/dashboard/sender/support" className={linkClass} onClick={onNavigate}>
        <HelpCircle className="h-4 w-4 shrink-0" />
        {t("nav.senderSupport")}
      </NavLink>
      <NavLink to="/dashboard/sender/settings" className={linkClass} onClick={onNavigate}>
        <Settings className="h-4 w-4 shrink-0" />
        {t("nav.senderSettings")}
      </NavLink>
    </nav>
  );
}

function DriverNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const tab = new URLSearchParams(search).get("tab") ?? "available";
  const onDriver = pathname === "/dashboard/driver";
  const dashActive = onDriver && !search.includes("tab=");
  const availableActive = onDriver && tab === "available" && search.includes("tab=");
  const activeTabActive = onDriver && tab === "active";
  const earningsTabActive = onDriver && tab === "earnings";

  const item = (active: boolean) =>
    cn(
      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <nav className="flex flex-col gap-1">
      <Link to="/dashboard/driver" className={item(dashActive)} onClick={onNavigate}>
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        {t("nav.driverDashboard")}
      </Link>
      <Link to="/dashboard/driver?tab=available" className={item(availableActive)} onClick={onNavigate}>
        <Package className="h-4 w-4 shrink-0" />
        {t("nav.driverAvailable")}
      </Link>
      <Link to="/dashboard/driver?tab=active" className={item(activeTabActive)} onClick={onNavigate}>
        <Truck className="h-4 w-4 shrink-0" />
        {t("nav.driverDeliveries")}
      </Link>
      <Link to="/dashboard/driver?tab=earnings" className={item(earningsTabActive)} onClick={onNavigate}>
        <DollarSign className="h-4 w-4 shrink-0" />
        {t("nav.driverEarnings")}
      </Link>
      <NavLink to="/dashboard/driver/vehicle" className={({ isActive }) => item(isActive)} onClick={onNavigate}>
        <Wallet className="h-4 w-4 shrink-0" />
        {t("nav.driverVehicle")}
      </NavLink>
      <NavLink to="/dashboard/driver/ratings" className={({ isActive }) => item(isActive)} onClick={onNavigate}>
        <Star className="h-4 w-4 shrink-0" />
        {t("nav.driverRatings")}
      </NavLink>
      <NavLink to="/dashboard/driver/support" className={({ isActive }) => item(isActive)} onClick={onNavigate}>
        <HelpCircle className="h-4 w-4 shrink-0" />
        {t("nav.driverSupport")}
      </NavLink>
      <NavLink to="/dashboard/driver/settings" className={({ isActive }) => item(isActive)} onClick={onNavigate}>
        <Settings className="h-4 w-4 shrink-0" />
        {t("nav.driverSettings")}
      </NavLink>
    </nav>
  );
}

function DashboardSidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    void getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }

  const contact = auth?.user.email?.trim() || auth?.user.phone;
  const dbOk = health?.ok && health.db === "up";
  const isAdmin = auth?.user.role === "ADMIN";

  const roleLabel =
    auth?.user.role === "ADMIN"
      ? t("admin.shell.roleLabelAdmin")
      : auth?.user.role === "DRIVER"
        ? t("dashboard.badgeDriver")
        : t("dashboard.badgeSender");

  return (
    <>
      <Link
        to="/dashboard"
        className="mb-6 flex items-center gap-2 font-semibold text-foreground"
        onClick={onNavigate}
      >
        <Package className="h-8 w-8 shrink-0 text-primary" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span>{t("app.name")}</span>
          {isAdmin ? <span className="text-xs font-normal text-muted-foreground">{t("admin.shell.brandSubtitle")}</span> : null}
        </span>
      </Link>
      {auth && isAdmin ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="mb-1 w-full space-y-3 rounded-lg border border-secondary/60 bg-secondary/30 p-3 text-start text-sm transition-colors hover:bg-secondary/45 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label={t("admin.shell.userMenuTriggerAria")}
            >
              <p className="font-medium leading-tight">{auth.user.name}</p>
              <p className="text-muted-foreground">{contact}</p>
              <Badge variant="secondary">{roleLabel}</Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[12rem]" align="start" sideOffset={6}>
            <DropdownMenuLabel className="font-normal">
              <p className="font-medium">{auth.user.name}</p>
              <p className="text-xs text-muted-foreground">{contact}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/dashboard/admin" onClick={() => onNavigate?.()} className="cursor-pointer">
                {t("admin.shell.userMenuProfile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/admin/settings" onClick={() => onNavigate?.()} className="cursor-pointer">
                {t("admin.shell.userMenuSettings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                onNavigate?.();
                signOut();
              }}
            >
              {t("admin.shell.userMenuSignOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : auth ? (
        <div className="space-y-3 rounded-lg border border-secondary/60 bg-secondary/30 p-3 text-sm">
          <p className="font-medium leading-tight">{auth.user.name}</p>
          <p className="text-muted-foreground">{contact}</p>
          <Badge variant="secondary">{roleLabel}</Badge>
        </div>
      ) : null}
      <Separator className="my-4" />
      {isAdmin ? (
        <div className="mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("admin.shell.sidebarSectionTitle")}
          </p>
        </div>
      ) : null}
      {auth?.user.role === "SENDER" ? <SenderNavLinks onNavigate={onNavigate} /> : null}
      {isAdmin ? <AdminNavLinks onNavigate={onNavigate} /> : null}
      {auth?.user.role === "DRIVER" ? <DriverNavLinks onNavigate={onNavigate} /> : null}
      <Separator className="my-4" />
      <LanguageSwitcher id="dashboard-lang-sidebar" className="max-w-full" />
      <Button
        variant="outline"
        className="mt-3 w-full justify-start gap-2"
        type="button"
        onClick={() => void getHealth().then(setHealth)}
      >
        <RefreshCw className="h-4 w-4 shrink-0" />
        {t("dashboard.pingApi")}
      </Button>
      {isAdmin ? null : (
        <Button variant="secondary" className="mt-2 w-full justify-start gap-2" type="button" onClick={() => signOut()}>
          <LogOut className="h-4 w-4 shrink-0" />
          {t("dashboard.signOut")}
        </Button>
      )}
      <div className="mt-auto pt-6 text-xs text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">{t("dashboard.system")}</p>
        <p className={dbOk ? "text-emerald-700" : "text-amber-800"}>
          {health ? (dbOk ? t("dashboard.dbConnected") : t("dashboard.dbCheck")) : t("dashboard.apiPending")}
        </p>
        {import.meta.env.DEV ? (
          <code className="mt-1 block break-all rounded bg-muted px-1 py-0.5 font-mono text-[0.65rem]">{API_HINT}</code>
        ) : null}
      </div>
    </>
  );
}

export function DashboardLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }

  const isSender = auth?.user.role === "SENDER";
  const isAdmin = auth?.user.role === "ADMIN";
  const sheetSide = i18n.language?.toLowerCase().startsWith("ar") ? "right" : "left";
  const adminNavKey = isAdmin ? getAdminNavKeyFromPath(location.pathname) : null;
  const adminNavLabel = adminNavKey ? t(`admin.nav.${adminNavKey}`) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-background to-[hsl(35_38%_92%)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-e border-border bg-card/90 p-4 shadow-sm md:flex">
          <div className="flex min-h-0 flex-1 flex-col">
            <DashboardSidebarBody />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-2 border-b border-border bg-card/80 px-4 py-3 md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label={t("dashboard.openMenu")}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={sheetSide} className="flex w-72 flex-col overflow-y-auto">
                {isAdmin ? (
                  <SheetHeader className="mb-4 space-y-1 text-start">
                    <SheetTitle>{t("admin.shell.mobileSheetTitle")}</SheetTitle>
                    <p className="text-sm text-muted-foreground">{t("admin.shell.mobileSheetDescription")}</p>
                  </SheetHeader>
                ) : null}
                <DashboardSidebarBody onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="flex min-w-0 flex-1 flex-col items-center text-center">
              <span className="font-semibold">{t("app.name")}</span>
              {isAdmin && adminNavLabel ? (
                <span className="max-w-full truncate text-xs text-muted-foreground">{adminNavLabel}</span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => setScannerOpen(true)}
                className="gap-1.5 text-xs rounded-lg"
                title="مسح رمز QR"
              >
                <QrCode className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">مسح QR</span>
              </Button>
              <LanguageSwitcher id="dashboard-lang-header" showLabel={false} className="min-w-[7rem]" />
              {isSender && FEATURES.notifications ? <NotificationBell /> : null}
              <Button size="sm" variant="secondary" type="button" onClick={() => signOut()}>
                {t("dashboard.signOutShort")}
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-8">
            <div className="mb-4 hidden justify-end items-center gap-3 md:flex">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => setScannerOpen(true)}
                className="gap-2 text-xs rounded-lg border-primary/20 hover:bg-primary/5 shadow-sm"
              >
                <QrCode className="h-4 w-4 text-primary" />
                <span>مسح رمز QR للشحنة</span>
              </Button>
              {isSender && FEATURES.notifications ? <NotificationBell /> : null}
            </div>
            {isAdmin ? <AdminShellBreadcrumbs /> : null}
            <Outlet />
          </main>
        </div>
      </div>

      {/* QR Code Scanner Modal */}
      <OrderQRScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
      />
    </div>
  );
}
