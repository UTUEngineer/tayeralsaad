import type { ColumnDef } from "@tanstack/react-table";
import type { OrderDTO } from "@/api";
import { Download, MoreHorizontal, Package } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AdminHeader } from "@/features/admin/components/AdminHeader";
import { ConfirmDialog } from "@/features/admin/components/ConfirmDialog";
import { DataTable, normalizeOrderStatus, orderStatusLabel, OrderStatusBadge } from "@/components/shared";
import { OrderQRCode } from "@/features/orders/components";
import { PermissionGate } from "@/features/admin/components/PermissionGate";
import { useOrders } from "@/features/admin/hooks/useOrders";
import i18n from "@/i18n/config";
import { formatAdminDateTime, formatAppCurrency } from "@/lib/utils";

const ADMIN_ORDER_STATUS_FILTERS = [
  "DRAFT",
  "PENDING",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
] as const;

function downloadOrdersCsv(orders: OrderDTO[]) {
  const headers = [
    "id",
    "trackingCode",
    "status",
    "price",
    "sender",
    "driver",
    "pickup",
    "dropoff",
    "city",
    "createdAt",
  ];
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...orders.map((o) =>
      [
        o.id,
        o.trackingCode,
        o.status,
        String(o.price),
        escape(o.sender.name),
        escape(o.driver?.name ?? ""),
        escape(o.pickupAddress),
        escape(o.dropAddress),
        escape(o.city.name),
        o.createdAt,
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tairalsaad-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminOrdersPage() {
  const { t, i18n } = useTranslation();
  const { rows: apiRows, loading, error, statusFilter, setStatusFilter, refresh } = useOrders();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("all");
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");
  const [selected, setSelected] = useState<OrderDTO | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderDTO | null>(null);

  const cities = useMemo(() => {
    const s = new Set<string>();
    apiRows.forEach((o) => s.add(o.city.name));
    return [...s].sort();
  }, [apiRows]);

  const filtered = useMemo(() => {
    let r = apiRows;
    if (q.trim()) {
      const low = q.toLowerCase();
      r = r.filter(
        (o) =>
          o.id.toLowerCase().includes(low) ||
          o.trackingCode.toLowerCase().includes(low) ||
          o.sender.name.toLowerCase().includes(low) ||
          (o.driver?.name.toLowerCase().includes(low) ?? false),
      );
    }
    if (city !== "all") r = r.filter((o) => o.city.name === city);
    const min = minAmt === "" ? null : Number(minAmt);
    const max = maxAmt === "" ? null : Number(maxAmt);
    if (min !== null && !Number.isNaN(min)) r = r.filter((o) => o.price >= min);
    if (max !== null && !Number.isNaN(max)) r = r.filter((o) => o.price <= max);
    return r;
  }, [apiRows, q, city, minAmt, maxAmt]);

  const columns = useMemo<ColumnDef<OrderDTO>[]>(
    () => [
      {
        accessorKey: "id",
        header: t("admin.ordersPage.columns.id"),
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.id.slice(0, 8)}…</span>,
      },
      { accessorKey: "trackingCode", header: t("admin.ordersPage.columns.tracking"), id: "trackingCode" },
      {
        accessorKey: "sender",
        header: t("admin.ordersPage.columns.sender"),
        id: "sender",
        // TODO: needs API population. Shipment docs don't embed sender/driver names,
        // so render an em-dash rather than a blank/placeholder when unpopulated.
        cell: ({ row }) => row.original.sender.name || t("admin.ordersPage.dash"),
      },
      {
        accessorKey: "driver",
        header: t("admin.ordersPage.columns.driver"),
        id: "driver",
        // TODO: needs API population (driver name not embedded on the shipment doc).
        cell: ({ row }) => row.original.driver?.name || t("admin.ordersPage.dash"),
      },
      {
        id: "route",
        header: t("admin.ordersPage.columns.route"),
        cell: ({ row }) => (
          <span
            className="max-w-[200px] truncate text-xs text-muted-foreground"
            title={`${row.original.pickupAddress} → ${row.original.dropAddress}`}
          >
            {t("admin.ordersPage.columns.routePattern", { city: row.original.city.name })}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("admin.ordersPage.columns.status"),
        id: "status",
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "price",
        header: t("admin.ordersPage.columns.amount"),
        id: "price",
        cell: ({ row }) => formatAppCurrency(row.original.price, i18n.language),
      },
      {
        accessorKey: "createdAt",
        header: t("admin.ordersPage.columns.created"),
        id: "createdAt",
        cell: ({ row }) => formatAdminDateTime(row.original.createdAt, i18n.language),
      },
      {
        id: "delivered",
        header: t("admin.ordersPage.columns.delivered"),
        cell: ({ row }) =>
          row.original.status === "DELIVERED"
            ? formatAdminDateTime(row.original.createdAt, i18n.language)
            : t("admin.ordersPage.dash"),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" type="button">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelected(row.original)}>
                {t("admin.ordersPage.actions.viewDetails")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success(i18n.t("toasts.reassignDemo"))}>
                {t("admin.ordersPage.actions.reassignDriver")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success(i18n.t("toasts.refundFlowDemo"))}>
                {t("admin.ordersPage.actions.issueRefund")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success(i18n.t("toasts.markDisputeDemo"))}>
                {t("admin.ordersPage.actions.markDispute")}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setCancelTarget(row.original)}>
                {t("admin.ordersPage.actions.cancelOrder")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableHiding: false,
      },
    ],
    [t, i18n.language],
  );

  return (
    <PermissionGate page="orders">
      <div className="space-y-6">
        <AdminHeader />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{t("admin.ordersPage.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("admin.ordersPage.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" type="button" onClick={() => void refresh()} disabled={loading}>
              {t("admin.ordersPage.refresh")}
            </Button>
            <Button type="button" className="gap-2" onClick={() => downloadOrdersCsv(filtered)} disabled={!filtered.length}>
              <Download className="h-4 w-4" />
              {t("admin.ordersPage.exportCsv")}
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder={t("admin.ordersPage.searchPlaceholder")}
            className="max-w-xs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <NativeSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-[160px]">
            <option value="all">{t("admin.ordersPage.allStatuses")}</option>
            {ADMIN_ORDER_STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {orderStatusLabel(normalizeOrderStatus(s))}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={city} onChange={(e) => setCity(e.target.value)} className="w-[180px]">
            <option value="all">{t("admin.ordersPage.allCities")}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
          <Input
            type="number"
            placeholder={t("admin.ordersPage.minAmount")}
            className="w-[120px]"
            value={minAmt}
            onChange={(e) => setMinAmt(e.target.value)}
          />
          <Input
            type="number"
            placeholder={t("admin.ordersPage.maxAmount")}
            className="w-[120px]"
            value={maxAmt}
            onChange={(e) => setMaxAmt(e.target.value)}
          />
        </div>

        {loading && !apiRows.length ? (
          <p className="text-sm text-muted-foreground">{t("admin.ordersPage.loading")}</p>
        ) : null}

        {!loading && !filtered.length ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 font-medium">{t("admin.ordersPage.emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("admin.ordersPage.emptyHint")}</p>
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} />
        )}

        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {selected ? t("admin.ordersPage.sheetTitle", { code: selected.trackingCode }) : ""}
              </SheetTitle>
            </SheetHeader>
            {selected ? (
              <div className="mt-6 space-y-4 text-sm">
                <div>
                  <p className="font-medium">{t("admin.ordersPage.timeline")}</p>
                  <ul className="mt-2 space-y-2 border-s-2 border-primary/30 ps-4">
                    <li>
                      {t("admin.ordersPage.timelineCreated", {
                        at: formatAdminDateTime(selected.createdAt, i18n.language),
                      })}
                    </li>
                    <li>
                      {t("admin.ordersPage.timelineStatus", {
                        status: orderStatusLabel(normalizeOrderStatus(selected.status)),
                      })}
                    </li>
                    <li>
                      {t("admin.ordersPage.timelinePayment", { payment: selected.paymentStatus })}
                    </li>
                  </ul>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                  {t("admin.ordersPage.mapPreview")}
                </div>
                <p>
                  <span className="text-muted-foreground">{t("admin.ordersPage.sender")}: </span>
                  {/* TODO: needs API population — name/phone not embedded on the shipment doc. */}
                  {selected.sender.name || selected.sender.phone
                    ? `${selected.sender.name || t("admin.ordersPage.dash")}${selected.sender.phone ? ` (${selected.sender.phone})` : ""}`
                    : t("admin.ordersPage.dash")}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("admin.ordersPage.driver")}: </span>
                  {/* TODO: needs API population — driver name/phone not embedded on the shipment doc. */}
                  {selected.driver && (selected.driver.name || selected.driver.phone)
                    ? `${selected.driver.name || t("admin.ordersPage.dash")}${selected.driver.phone ? ` (${selected.driver.phone})` : ""}`
                    : t("admin.ordersPage.dash")}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("admin.ordersPage.pickup")}: </span>
                  {selected.pickupAddress}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("admin.ordersPage.dropoff")}: </span>
                  {selected.dropAddress}
                </p>

                {/* QR Code & Thermal Print Label section */}
                <div className="pt-2">
                  <p className="font-medium mb-2">رمز الـ QR ومصادقة الطباعة</p>
                  <OrderQRCode
                    order={{
                      id: selected.id,
                      trackingCode: selected.trackingCode,
                      status: selected.status,
                      price: selected.price,
                      receiverName: selected.receiverName || "المستلم",
                      receiverPhone: selected.receiverPhone || "",
                      dropAddress: selected.dropAddress,
                      pickupAddress: selected.pickupAddress,
                      city: selected.city,
                      sender: selected.sender,
                    }}
                    size={160}
                  />
                </div>

                <p className="font-medium">{t("admin.ordersPage.communications")}</p>
                <p className="text-muted-foreground">{t("admin.ordersPage.chatPlaceholder")}</p>
              </div>
            ) : null}
          </SheetContent>
        </Sheet>

        <ConfirmDialog
          open={!!cancelTarget}
          onOpenChange={(o) => !o && setCancelTarget(null)}
          title={cancelTarget ? t("admin.ordersPage.cancelTitle", { code: cancelTarget.trackingCode }) : ""}
          description={t("admin.ordersPage.cancelDescription")}
          confirmLabel={t("admin.ordersPage.cancelConfirm")}
          variant="destructive"
          onConfirm={() => toast.success(i18n.t("toasts.orderCancelledDemo"))}
        />
      </div>
    </PermissionGate>
  );
}
