import { Loader2, MapPin, Package } from "lucide-react";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { getCities, type City } from "@/api";
import { useCreateOrderMutation } from "@/features/orders/hooks";
import { useQuote } from "@/features/orders/useQuote";
import { cityCenter } from "@/features/orders/cityCenters";
import type { LatLng } from "@/features/orders/components/LocationPicker";
import type { CreateShipmentInput, QuoteInput } from "@/features/orders/createSchemas";
import { PACKAGE_TYPES, PAYMENT_METHODS, SERVICES, WEIGHT_TIERS, enumLabel } from "@/features/orders/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { formatAppCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

// Leaflet + the picker load only on this route, keeping the main bundle lean.
const LocationPicker = lazy(() => import("@/features/orders/components/LocationPicker"));

type Props = {
  onSuccess?: () => void;
  onClose?: () => void;
  variant?: "modal" | "page";
};

const PRIMARY = "#2563eb";
const DROP_COLOR = "#059669";

export function CreateOrderForm({ onSuccess, onClose, variant = "page" }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { auth } = useAuth();
  const createMutation = useCreateOrderMutation();

  const [cities, setCities] = useState<City[]>([]);

  // Package
  const [pkgType, setPkgType] = useState<string>("");
  const [weightTier, setWeightTier] = useState<string>("");
  const [description, setDescription] = useState("");
  const [declaredValue, setDeclaredValue] = useState("");

  // Pickup
  const [pickupCity, setPickupCity] = useState("");
  const [pickupArea, setPickupArea] = useState("");
  const [pickupStreet, setPickupStreet] = useState("");
  const [pickupPin, setPickupPin] = useState<LatLng | null>(null);

  // Dropoff
  const [dropCity, setDropCity] = useState("");
  const [dropArea, setDropArea] = useState("");
  const [dropStreet, setDropStreet] = useState("");
  const [dropPin, setDropPin] = useState<LatLng | null>(null);

  // Receiver + options
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [service, setService] = useState("standard");
  const [scheduledFor, setScheduledFor] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    void getCities().then(setCities).catch(() => setCities([]));
  }, []);

  // Default pickup city to the sender's home city once cities load.
  useEffect(() => {
    if (!pickupCity && auth?.user.cityId && cities.some((c) => c.id === auth.user.cityId)) {
      setPickupCity(auth.user.cityId);
    }
  }, [auth?.user.cityId, cities, pickupCity]);

  const scheduledOk = service !== "scheduled" || !!scheduledFor;

  // Build the quote payload only when the API's required fields are all present.
  const quoteInput: QuoteInput | null = useMemo(() => {
    if (!pickupCity || !pickupArea || !pickupPin) return null;
    if (!dropCity || !dropArea || !dropPin) return null;
    if (!pkgType || !weightTier || !service) return null;
    if (!scheduledOk) return null;
    return {
      pickup: {
        city: pickupCity,
        area: pickupArea,
        ...(pickupStreet ? { street: pickupStreet } : {}),
        location: pickupPin,
      },
      dropoff: {
        city: dropCity,
        area: dropArea,
        ...(dropStreet ? { street: dropStreet } : {}),
        location: dropPin,
      },
      package: {
        type: pkgType as QuoteInput["package"]["type"],
        weightTier: weightTier as QuoteInput["package"]["weightTier"],
        ...(description ? { description } : {}),
        ...(declaredValue && Number.isFinite(Number(declaredValue))
          ? { declaredValue: Number(declaredValue) }
          : {}),
      },
      service: service as QuoteInput["service"],
      ...(service === "scheduled" && scheduledFor ? { scheduledFor: new Date(scheduledFor).toISOString() } : {}),
    };
  }, [
    pickupCity, pickupArea, pickupStreet, pickupPin,
    dropCity, dropArea, dropStreet, dropPin,
    pkgType, weightTier, description, declaredValue, service, scheduledFor, scheduledOk,
  ]);

  const quote = useQuote(quoteInput);

  /** Returns a localized reason when submit must be blocked, or null when ready. */
  function submitBlockReason(): string | null {
    if (!pickupCity || !pickupArea) return t("orders.create.missingPickupAddress");
    if (!pickupPin) return t("orders.create.missingPickupPin");
    if (!dropCity || !dropArea) return t("orders.create.missingDropoffAddress");
    if (!dropPin) return t("orders.create.missingDropoffPin");
    if (!pkgType || !weightTier) return t("orders.create.missingPackage");
    if (service === "scheduled" && !scheduledFor) return t("orders.create.fixErrors");
    if (!quoteInput) return t("orders.create.quoteHintIncomplete");
    if (quote.isFetching) return t("orders.create.quoteLoading");
    if (quote.isError) {
      return quote.error instanceof Error ? quote.error.message : t("orders.create.missingQuote");
    }
    if (!quote.data) return t("orders.create.missingQuote");
    if (!receiverName.trim() || receiverPhone.trim().length < 5) return t("orders.create.fixErrors");
    if (!acceptTerms) return t("toasts.acceptTermsPlace", { defaultValue: "Please accept the terms." });
    return null;
  }

  const blockReason = submitBlockReason();
  const canSubmit = blockReason === null && !createMutation.isPending;

  async function submit() {
    const blocked = submitBlockReason();
    if (blocked) {
      toast.error(blocked);
      return;
    }
    if (!quoteInput || !quote.data) {
      toast.error(t("orders.create.missingQuote"));
      return;
    }
    const payload: CreateShipmentInput = {
      ...quoteInput,
      receiver: { name: receiverName.trim(), phone: receiverPhone.trim() },
      paymentMethod: paymentMethod as CreateShipmentInput["paymentMethod"],
    };
    try {
      await createMutation.mutateAsync(payload);
      toast.success(t("orders.create.success"));
      onSuccess?.();
      onClose?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("orders.create.submitFailed");
      toast.error(msg || t("orders.create.submitFailed"));
    }
  }

  const mapFallback = (
    <div className="flex h-[280px] w-full items-center justify-center rounded-xl border bg-muted/40 text-sm text-muted-foreground">
      <Loader2 className="me-2 h-4 w-4 animate-spin" /> {t("orders.create.mapLoading")}
    </div>
  );

  return (
    <div className={cn("space-y-6", variant === "page" && "max-w-3xl")}>
      {/* Package */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Package className="h-4 w-4 text-primary" /> {t("orders.create.sectionPackage")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pkgType">{t("orders.create.packageType")}</Label>
            <NativeSelect id="pkgType" value={pkgType} onChange={(e) => setPkgType(e.target.value)}>
              <option value="">{t("orders.create.selectPackageType")}</option>
              {PACKAGE_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{enumLabel(PACKAGE_TYPES, o.value, lang)}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weightTier">{t("orders.create.weightTier")}</Label>
            <NativeSelect id="weightTier" value={weightTier} onChange={(e) => setWeightTier(e.target.value)}>
              <option value="">{t("orders.create.selectWeight")}</option>
              {WEIGHT_TIERS.map((o) => (
                <option key={o.value} value={o.value}>{enumLabel(WEIGHT_TIERS, o.value, lang)}</option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="description">{t("orders.create.description")}</Label>
            <Input
              id="description"
              value={description}
              placeholder={t("orders.create.descriptionPlaceholder")}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="declaredValue">{t("orders.create.declaredValue")}</Label>
            <Input
              id="declaredValue"
              type="number"
              inputMode="numeric"
              min={0}
              value={declaredValue}
              onChange={(e) => setDeclaredValue(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Pickup */}
      <AddressSection
        title={t("orders.create.sectionPickup")}
        cities={cities}
        city={pickupCity}
        onCity={setPickupCity}
        area={pickupArea}
        onArea={setPickupArea}
        street={pickupStreet}
        onStreet={setPickupStreet}
        pin={pickupPin}
        onPin={setPickupPin}
        mapLabel={t("orders.create.pickupLocation")}
        markerColor={PRIMARY}
        mapFallback={mapFallback}
        idPrefix="pickup"
      />

      {/* Dropoff */}
      <AddressSection
        title={t("orders.create.sectionDropoff")}
        cities={cities}
        city={dropCity}
        onCity={setDropCity}
        area={dropArea}
        onArea={setDropArea}
        street={dropStreet}
        onStreet={setDropStreet}
        pin={dropPin}
        onPin={setDropPin}
        mapLabel={t("orders.create.dropoffLocation")}
        markerColor={DROP_COLOR}
        mapFallback={mapFallback}
        idPrefix="dropoff"
      />

      {/* Receiver */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t("orders.create.sectionReceiver")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="receiverName">{t("orders.create.receiverName")}</Label>
            <Input id="receiverName" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receiverPhone">{t("orders.create.receiverPhone")}</Label>
            <Input id="receiverPhone" inputMode="tel" value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Service & payment */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t("orders.create.sectionOptions")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="service">{t("orders.create.service")}</Label>
            <NativeSelect id="service" value={service} onChange={(e) => setService(e.target.value)}>
              {SERVICES.map((o) => (
                <option key={o.value} value={o.value}>{enumLabel(SERVICES, o.value, lang)}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paymentMethod">{t("orders.create.paymentMethod")}</Label>
            <NativeSelect id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((o) => (
                <option key={o.value} value={o.value}>{enumLabel(PAYMENT_METHODS, o.value, lang)}</option>
              ))}
            </NativeSelect>
          </div>
        </div>
        {service === "scheduled" ? (
          <div className="space-y-1.5">
            <Label htmlFor="scheduledFor">{t("orders.create.scheduledFor")}</Label>
            <Input id="scheduledFor" type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </div>
        ) : null}
      </section>

      {/* Live quote */}
      <Card className="border-primary/20">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 font-medium">
            <MapPin className="h-4 w-4 text-primary" /> {t("orders.create.quoteTitle")}
            {quote.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          </div>
          {!quoteInput ? (
            <p className="text-sm text-muted-foreground">{t("orders.create.quoteHintIncomplete")}</p>
          ) : quote.isError ? (
            <p className="text-sm text-destructive">
              {quote.error instanceof Error ? quote.error.message : t("toasts.requestFailed")}
            </p>
          ) : quote.data ? (
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between">
                <span className="text-muted-foreground">{t("orders.create.quoteEta")}</span>
                <span>{t("orders.create.quoteEtaValue", { minutes: quote.data.etaMinutes })}</span>
              </li>
              <li className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>{t("orders.create.quoteTotal")}</span>
                <span className="text-primary">{formatAppCurrency(quote.data.pricing.total, lang)}</span>
              </li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("orders.create.quoteLoading")}</p>
          )}
        </CardContent>
      </Card>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-input"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
        />
        <span>{t("orders.create.acceptTerms")}</span>
      </label>

      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        {onClose ? (
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("actions.cancel", { defaultValue: "Cancel" })}
          </Button>
        ) : null}
        <Button
          type="button"
          className={cn(!canSubmit && "opacity-60")}
          disabled={createMutation.isPending}
          onClick={() => void submit()}
        >
          {createMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
          {createMutation.isPending ? t("orders.create.submitting") : t("orders.create.submit")}
        </Button>
      </div>
    </div>
  );
}

type AddressSectionProps = {
  title: string;
  cities: City[];
  city: string;
  onCity: (v: string) => void;
  area: string;
  onArea: (v: string) => void;
  street: string;
  onStreet: (v: string) => void;
  pin: LatLng | null;
  onPin: (v: LatLng) => void;
  mapLabel: string;
  markerColor: string;
  mapFallback: React.ReactNode;
  idPrefix: string;
};

function AddressSection(props: AddressSectionProps) {
  const { t } = useTranslation();
  const center = cityCenter(props.city);
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">{props.title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${props.idPrefix}City`}>{t("orders.create.city")}</Label>
          <NativeSelect id={`${props.idPrefix}City`} value={props.city} onChange={(e) => props.onCity(e.target.value)}>
            <option value="">{t("orders.create.selectCity")}</option>
            {props.cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${props.idPrefix}Area`}>{t("orders.create.area")}</Label>
          <Input
            id={`${props.idPrefix}Area`}
            value={props.area}
            placeholder={t("orders.create.areaPlaceholder")}
            onChange={(e) => props.onArea(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${props.idPrefix}Street`}>{t("orders.create.street")}</Label>
        <Input id={`${props.idPrefix}Street`} value={props.street} onChange={(e) => props.onStreet(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>{props.mapLabel}</Label>
        <Suspense fallback={props.mapFallback}>
          <LocationPicker
            value={props.pin}
            onChange={props.onPin}
            center={center}
            ariaLabel={props.mapLabel}
            markerColor={props.markerColor}
          />
        </Suspense>
        <p className="text-xs text-muted-foreground">
          {props.pin
            ? t("orders.create.pinSet", { lat: props.pin.lat.toFixed(5), lng: props.pin.lng.toFixed(5) })
            : t("orders.create.pinNotSet")}
        </p>
      </div>
    </section>
  );
}
