import { Loader2, MapPin, MessageCircle, Package, Phone, Star, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { OrderStatusBadge } from "@/components/shared";
import { OrderQRCode } from "@/features/orders/components";
import { useCancelOrderMutation, useRateOrderMutation, useSenderOrderQuery } from "@/features/orders/hooks";
import type { OrderDetail } from "@/features/orders/schemas";
import i18n from "@/i18n/config";
import { cn } from "@/lib/utils";

const TIMELINE_STATUSES = ["PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"] as const;

const ORDER_RANK: Record<string, number> = {
  DRAFT: 0,
  PENDING: 1,
  ASSIGNED: 2,
  PICKED_UP: 3,
  IN_TRANSIT: 4,
  DELIVERED: 5,
  CANCELLED: -1,
};

function rank(s: string) {
  return ORDER_RANK[s] ?? 0;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatSheetDateTime(iso: string, lng: string): string {
  const locale = lng.toLowerCase().startsWith("ar") ? "ar-IQ" : "en-IQ";
  return new Date(iso).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    numberingSystem: "latn",
  });
}

type Props = {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
};

export function OrderDetailSheet({ orderId, open, onOpenChange, onUpdated }: Props) {
  const { t, i18n } = useTranslation();
  const { data, isLoading: loading, isError } = useSenderOrderQuery(orderId, open);

  useEffect(() => {
    if (isError) toast.error(i18n.t("toasts.orderLoadError"));
  }, [isError, i18n]);
  const order: OrderDetail | null = data?.order ?? null;

  const cancelMutation = useCancelOrderMutation();
  const rateMutation = useRateOrderMutation();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (order) {
      setRating(order.rating ?? 0);
      setComment(order.reviewComment ?? "");
    }
  }, [order]);

  const canCancel = order && ["PENDING", "ASSIGNED", "DRAFT"].includes(order.status);
  const showMap = order && ["PICKED_UP", "IN_TRANSIT"].includes(order.status);
  const canRate = order && order.status === "DELIVERED" && order.rating == null;

  async function onCancel() {
    if (!order) return;
    try {
      await cancelMutation.mutateAsync(order.id);
      onUpdated?.();
      onOpenChange(false);
    } catch {
      /* toast in hook */
    }
  }

  async function onRate() {
    if (!order || rating < 1) {
      toast.error(i18n.t("toasts.selectStarRating"));
      return;
    }
    try {
      await rateMutation.mutateAsync({ orderId: order.id, rating, comment });
      onUpdated?.();
    } catch {
      /* toast in hook */
    }
  }

  const extras = (order?.extras ?? null) as Record<string, unknown> | null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl md:max-w-2xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" aria-hidden />
            {t("orders.detailSheet.title")}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            </div>
          ) : !order ? (
            <p className="text-muted-foreground">{t("orders.detailSheet.noOrderSelected")}</p>
          ) : (
            <div className="space-y-6 pb-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-lg font-semibold text-primary">{order.trackingCode}</p>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="text-sm text-muted-foreground">{formatSheetDateTime(order.createdAt, i18n.language)}</p>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold">{t("orders.detailSheet.timelineTitle")}</h3>
                <div className="relative space-y-0 ps-4">
                  <div className="absolute bottom-2 start-[7px] top-2 w-px bg-border" aria-hidden />
                  {TIMELINE_STATUSES.map((stepStatus) => {
                    const done = order.status !== "CANCELLED" && rank(order.status) >= rank(stepStatus);
                    const log = order.statusHistory?.find((h) => h.status === stepStatus);
                    const label = t(`orders.detailSheet.timeline.events.${stepStatus}`);
                    return (
                      <div key={stepStatus} className="relative flex gap-3 pb-6 last:pb-0">
                        <div
                          className={cn(
                            "relative z-10 mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 bg-card",
                            done ? "border-primary bg-primary" : "border-muted-foreground/40",
                          )}
                        />
                        <div>
                          <p className={cn("text-sm font-medium", done ? "text-foreground" : "text-muted-foreground")}>
                            {label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log
                              ? formatSheetDateTime(log.createdAt, i18n.language)
                              : done
                                ? t("orders.detailSheet.timeline.dash")
                                : t("orders.detailSheet.timeline.pending")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {order.status === "CANCELLED" ? (
                    <p className="text-sm font-medium text-destructive">{t("orders.detailSheet.timeline.cancelledNotice")}</p>
                  ) : null}
                </div>
              </div>

              {showMap ? (
                <Card className="overflow-hidden border-dashed shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MapPin className="h-4 w-4" aria-hidden />
                      {t("orders.detailSheet.map.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="flex h-44 items-center justify-center bg-muted/50 text-sm text-muted-foreground">
                      {t("orders.detailSheet.map.body")}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {order.driver ? (
                <Card className="shadow-sm">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      {order.driver.avatarUrl ? (
                        <img
                          src={order.driver.avatarUrl}
                          alt={t("orders.detailSheet.driver.avatarAlt")}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                          {initials(order.driver.name)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{order.driver.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("orders.detailSheet.driver.rating", { rating: "4.9" })}
                        </p>
                        {order.driver.vehicleInfo ? (
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Truck className="h-3 w-3 shrink-0" aria-hidden />
                            {order.driver.vehicleInfo}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:ms-auto">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`sms:${order.driver.phone}`} aria-label={t("orders.detailSheet.driver.chatAria")}>
                          <MessageCircle className="h-4 w-4" aria-hidden />
                          {t("orders.detailSheet.driver.chat")}
                        </a>
                      </Button>
                      <Button size="sm" className="bg-[#2563eb] hover:bg-[#2563eb]/90" asChild>
                        <a href={`tel:${order.driver.phone}`} aria-label={t("orders.detailSheet.driver.callAria")}>
                          <Phone className="h-4 w-4" aria-hidden />
                          {t("orders.detailSheet.driver.call")}
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">{t("orders.detailSheet.package.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">{t("orders.detailSheet.package.type")}: </span>
                    {t(`driver.activeDelivery.packageTypes.${order.packageType}`, {
                      defaultValue: order.packageType,
                    })}
                  </p>
                  {extras?.description ? (
                    <p>
                      <span className="text-muted-foreground">{t("orders.detailSheet.package.description")}: </span>
                      {String(extras.description)}
                    </p>
                  ) : null}
                  {extras?.categoryLabel ? (
                    <p>
                      <span className="text-muted-foreground">{t("orders.detailSheet.package.category")}: </span>
                      {String(extras.categoryLabel)}
                    </p>
                  ) : null}
                  <p>
                    <span className="text-muted-foreground">{t("orders.detailSheet.package.pickup")}: </span>
                    {order.pickupAddress}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t("orders.detailSheet.package.delivery")}: </span>
                    {order.dropAddress}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t("orders.detailSheet.package.recipient")}: </span>
                    {order.receiverName} · {order.receiverPhone}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t("orders.detailSheet.package.destination")}: </span>
                    {order.city.name}
                  </p>
                  {order.deliveryWindow ? (
                    <p>
                      <span className="text-muted-foreground">{t("orders.detailSheet.package.window")}: </span>
                      {order.deliveryWindow}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              {/* Order QR Code & Thermal Label Actions */}
              <Card className="shadow-sm border-dashed border-primary/30 bg-primary/5 dark:bg-slate-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>رمز الـ QR ومصادقة الشحنة</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <OrderQRCode order={order} size={160} />
                </CardContent>
              </Card>

              {canCancel ? (
                <div className="flex justify-end">
                  <Button variant="destructive" disabled={cancelMutation.isPending} onClick={() => void onCancel()}>
                    {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                    {t("orders.detailSheet.cancelOrder")}
                  </Button>
                </div>
              ) : null}

              {canRate ? (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">{t("orders.detailSheet.rating.title")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={cn("rounded p-1", rating >= n ? "text-amber-500" : "text-muted-foreground")}
                          onClick={() => setRating(n)}
                          aria-label={t("orders.detailSheet.rating.starLabel", { count: n })}
                        >
                          <Star className="h-8 w-8 fill-current" aria-hidden />
                        </button>
                      ))}
                    </div>
                    <div>
                      <Label htmlFor="rev">{t("orders.detailSheet.rating.commentLabel")}</Label>
                      <Textarea
                        id="rev"
                        className="mt-1.5"
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                    </div>
                    <Button
                      className="bg-[#2563eb] hover:bg-[#2563eb]/90"
                      disabled={rateMutation.isPending}
                      onClick={() => void onRate()}
                    >
                      {rateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                      {t("orders.detailSheet.rating.submit")}
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
