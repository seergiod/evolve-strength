import { useState, useMemo } from "react";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Dumbbell, Mail, Lock, User, Eye, EyeOff, ArrowRight, Flame, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { checkPassword, emailSchema, usernameSchema } from "@/lib/validation";

export const Route = createFileRoute("/")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "GYMBROS — Entrenar es más divertido juntos" },
      { name: "description", content: "Red social fitness: rutinas, ranking, chat y quedadas para entrenar." },
    ],
  }),
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const pwCheck = useMemo(() => checkPassword(password), [password]);
  const emailOk = useMemo(() => emailSchema.safeParse(email).success, [email]);
  const usernameOk = useMemo(() => usernameSchema.safeParse(username).success, [username]);

  const canSubmit =
    mode === "signin"
      ? emailOk && password.length >= 1
      : emailOk && pwCheck.valid && usernameOk;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Revisa los campos marcados en rojo");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) {
          const msg = /invalid login/i.test(error.message)
            ? "Email o contraseña incorrectos"
            : error.message;
          toast.error(msg);
          return;
        }
        toast.success("¡Bienvenido de vuelta!");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await signUp(email, password, username);
        if (error) {
          const msg = /already registered/i.test(error.message)
            ? "Ese email ya está registrado"
            : error.message;
          toast.error(msg);
          return;
        }
        toast.success("¡Cuenta creada! Revisa tu email para confirmar.", {
          description: "Te hemos enviado un enlace de confirmación.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center px-4 py-10 overflow-hidden">
      {/* Animated neon orbs background */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, oklch(0.85 0.18 200 / 0.18), transparent 70%)" }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, oklch(0.65 0.25 295 / 0.18), transparent 70%)" }}
        animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0.9, 0.2, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent glow-cyan">
            <Dumbbell className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-display">
              <span className="text-gradient">GYMBROS</span>
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-[0.25em] uppercase">Training Social App</p>
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-7">
          <div className="flex rounded-2xl bg-background/50 p-1 mb-6">
            <button
              type="button"
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                mode === "signin" ? "bg-primary text-primary-foreground glow-cyan" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMode("signin")}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                mode === "signup" ? "bg-accent text-accent-foreground glow-violet" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMode("signup")}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === "signup" && (
              <Field
                label="Nombre de usuario"
                icon={<User className="h-4 w-4" />}
                value={username}
                onChange={setUsername}
                placeholder="ironbro2024"
                error={username.length > 0 && !usernameOk ? "3-20 chars · letras, números, _" : null}
                ok={usernameOk}
                required
              />
            )}

            <Field
              type="email"
              label="Email"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={setEmail}
              placeholder="tu@email.com"
              error={email.length > 0 && !emailOk ? "Email no válido" : null}
              ok={emailOk}
              required
            />

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pl-10 pr-10 bg-input/60 border-border rounded-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === "signup" && password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-1 pt-1"
                >
                  <RuleRow ok={pwCheck.length} text="Al menos 8 caracteres" />
                  <RuleRow ok={pwCheck.upper} text="Una letra mayúscula" />
                  <RuleRow ok={pwCheck.digit} text="Un número" />
                </motion.div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 glow-cyan rounded-xl mt-2 disabled:opacity-50 disabled:glow-cyan"
            >
              {loading ? "Cargando..." : mode === "signin" ? "Entrar" : "Crear cuenta"}
              {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
            </Button>
          </form>

          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <Flame className="h-4 w-4 text-accent" />
            <span>Entrena. Registra. Domina.</span>
          </div>
        </div>
      </motion.div>
    </main>
  );
}

function Field({
  label, icon, value, onChange, placeholder, type = "text", error, ok, required,
}: {
  label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; error: string | null; ok: boolean; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`h-12 pl-10 pr-10 bg-input/60 rounded-xl transition-colors ${
            error ? "border-destructive" : value && ok ? "border-primary/60" : "border-border"
          }`}
        />
        {value.length > 0 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {ok ? <Check className="h-4 w-4 text-primary" /> : <X className="h-4 w-4 text-destructive" />}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function RuleRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs transition-colors ${ok ? "text-primary" : "text-muted-foreground"}`}>
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{text}</span>
    </div>
  );
}
