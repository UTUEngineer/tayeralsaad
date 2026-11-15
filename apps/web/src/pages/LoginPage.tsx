import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Package } from "lucide-react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/context/AuthContext";
import {
  createLoginFormSchema,
  createRegisterFormSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from "@/features/auth/formSchemas";
import { useLogin, useRegister } from "@/features/auth/hooks";
import { getCities, type City } from "@/lib/api/cities";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function AuthLoginForm() {
  const { t, i18n } = useTranslation();
  const loginMutation = useLogin();
  const schema = useMemo(() => createLoginFormSchema(t), [t, i18n.language]);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "", password: "" },
    mode: "onSubmit",
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((data) => {
        loginMutation.mutate({ phone: data.phone, password: data.password });
      })}
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="auth-login-phone">{t("auth.phoneOrEmail")}</Label>
        <Input
          id="auth-login-phone"
          autoComplete="username"
          placeholder={t("auth.phoneOrEmailPlaceholder")}
          aria-invalid={!!form.formState.errors.phone}
          aria-describedby={form.formState.errors.phone ? "auth-login-phone-err" : undefined}
          {...form.register("phone")}
        />
        {form.formState.errors.phone ? (
          <p id="auth-login-phone-err" className="text-sm text-destructive">
            {form.formState.errors.phone.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-login-password">{t("auth.password")}</Label>
        <Input
          id="auth-login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!form.formState.errors.password}
          aria-describedby={form.formState.errors.password ? "auth-login-password-err" : undefined}
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p id="auth-login-password-err" className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>
      {loginMutation.isError && loginMutation.error instanceof Error ? (
        <Alert variant="destructive">
          <AlertDescription>{loginMutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
        {loginMutation.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {t("auth.signIn")}
      </Button>

      <div className="mt-4 pt-4 border-t border-border/60">
        <p className="text-xs font-medium text-center text-muted-foreground mb-2">
          تسجيل دخول سريع للتجربة (Quick Demo Login)
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8 px-1 border-primary/40 hover:bg-primary/10 hover:text-primary font-semibold"
            disabled={loginMutation.isPending}
            onClick={() => {
              form.setValue("phone", "admin@tayralsaad.iq");
              form.setValue("password", "admin123456");
              loginMutation.mutate({ phone: "admin@tayralsaad.iq", password: "admin123456" });
            }}
          >
            🛡️ أدمن (Admin)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8 px-1 border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-600 font-semibold"
            disabled={loginMutation.isPending}
            onClick={() => {
              form.setValue("phone", "+964772222201");
              form.setValue("password", "driver1234");
              loginMutation.mutate({ phone: "+964772222201", password: "driver1234" });
            }}
          >
            🚗 سائق (Driver)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8 px-1 border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 font-semibold"
            disabled={loginMutation.isPending}
            onClick={() => {
              form.setValue("phone", "+964771111101");
              form.setValue("password", "sender1234");
              loginMutation.mutate({ phone: "+964771111101", password: "sender1234" });
            }}
          >
            📦 مرسل (Sender)
          </Button>
        </div>
      </div>
    </form>
  );
}

function AuthRegisterForm({ cities }: { cities: City[] }) {
  const { t, i18n } = useTranslation();
  const registerMutation = useRegister();
  const schema = useMemo(() => createRegisterFormSchema(t), [t, i18n.language]);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      password: "",
      role: "SENDER",
      cityId: "",
    },
    mode: "onSubmit",
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((data) => {
        registerMutation.mutate({
          name: data.name,
          phone: data.phone,
          password: data.password,
          role: data.role,
          cityId: data.cityId && data.cityId.length > 0 ? data.cityId : null,
        });
      })}
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="auth-reg-name">{t("auth.fullName")}</Label>
        <Input
          id="auth-reg-name"
          autoComplete="name"
          aria-invalid={!!form.formState.errors.name}
          aria-describedby={form.formState.errors.name ? "auth-reg-name-err" : undefined}
          {...form.register("name")}
        />
        {form.formState.errors.name ? (
          <p id="auth-reg-name-err" className="text-sm text-destructive">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-reg-phone">{t("auth.phone")}</Label>
        <Input
          id="auth-reg-phone"
          autoComplete="tel"
          aria-invalid={!!form.formState.errors.phone}
          aria-describedby={form.formState.errors.phone ? "auth-reg-phone-err" : undefined}
          {...form.register("phone")}
        />
        {form.formState.errors.phone ? (
          <p id="auth-reg-phone-err" className="text-sm text-destructive">
            {form.formState.errors.phone.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-reg-password">{t("auth.password")}</Label>
        <Input
          id="auth-reg-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!form.formState.errors.password}
          aria-describedby={form.formState.errors.password ? "auth-reg-password-err" : undefined}
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p id="auth-reg-password-err" className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-reg-role">{t("auth.role")}</Label>
        <NativeSelect id="auth-reg-role" {...form.register("role")}>
          <option value="SENDER">{t("auth.roleSender")}</option>
          <option value="DRIVER">{t("auth.roleDriver")}</option>
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-reg-city">{t("auth.cityOptional")}</Label>
        <NativeSelect id="auth-reg-city" {...form.register("cityId")}>
          <option value="">{t("auth.selectCity")}</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}, {c.country}
            </option>
          ))}
        </NativeSelect>
      </div>
      {registerMutation.isError && registerMutation.error instanceof Error ? (
        <Alert variant="destructive">
          <AlertDescription>{registerMutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button className="w-full" type="submit" disabled={registerMutation.isPending}>
        {registerMutation.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {t("auth.createAccount")}
      </Button>
    </form>
  );
}

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { auth } = useAuth();

  useEffect(() => {
    if (auth?.accessToken) {
      navigate("/dashboard", { replace: true });
    }
  }, [auth?.accessToken, navigate]);

  const [cities, setCities] = useState<City[]>([]);
  const [tab, setTab] = useState<"login" | "register">("login");

  useEffect(() => {
    void getCities().then(setCities).catch(() => setCities([]));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-background to-[hsl(35_38%_92%)]">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-10">
        <div className="flex justify-end">
          <LanguageSwitcher id="login-lang" showLabel={false} className="w-auto min-w-[10rem]" />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-border">
            <Package className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">{t("app.name")}</h1>
          <p className="text-pretty text-sm text-muted-foreground">{t("app.tagline")}</p>
        </div>

        <Card className="border-secondary/60 shadow-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">{t("auth.welcomeBack")}</CardTitle>
            <CardDescription>{t("auth.cardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-secondary/70">
                <TabsTrigger value="login">{t("auth.signInTab")}</TabsTrigger>
                <TabsTrigger value="register">{t("auth.registerTab")}</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="space-y-4 pt-2 outline-none">
                {tab === "login" ? <AuthLoginForm key={i18n.language} /> : null}
              </TabsContent>
              <TabsContent value="register" className="space-y-4 pt-2 outline-none">
                {tab === "register" ? <AuthRegisterForm key={i18n.language} cities={cities} /> : null}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">
          {t("track.receiverPrompt")}{" "}
          <Link to="/track" className="font-semibold text-primary underline-offset-4 hover:underline">
            {t("track.openTracking")}
          </Link>
        </p>
      </div>
    </div>
  );
}
