"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) {
        try {
          const data = (await res.json()) as { error?: string };
          setError(data.error || "Неверный пароль");
        } catch {
          setError("Неверный пароль");
        }
        setLoading(false);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-stroke/20 bg-white/85 p-8 shadow-plate backdrop-blur-xl dark:border-white/20 dark:bg-black/50">
        <h1 className="font-display text-3xl uppercase tracking-[0.06em] text-zinc-900 dark:text-white">
          Админка
        </h1>
        <form onSubmit={onSubmit} className="mt-8 space-y-4" autoComplete="on">
          {/*
            Chrome/Google Passwords часто не предлагают сохранить пароль, если в форме только поле password
            и вход идёт через fetch. Добавляем «логин» для менеджера паролей (не уходит на сервер).
          */}
          <label className="sr-only" htmlFor="admin-login-username">
            Логин
          </label>
          <input
            id="admin-login-username"
            name="username"
            type="text"
            autoComplete="username"
            defaultValue="admin"
            tabIndex={-1}
            readOnly
            className="sr-only"
            aria-hidden
          />
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-white">
            Пароль
            <div className="mt-2 flex gap-2">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-[48px] min-w-0 flex-1 rounded-full border-2 border-zinc-300 bg-white px-5 py-3 text-base text-zinc-900 outline-none focus:border-accent dark:border-white/20 dark:bg-black/40 dark:text-white dark:shadow-plate dark:backdrop-blur-md"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                className="shrink-0 rounded-full border-2 border-zinc-300 bg-zinc-100 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-800 transition hover:border-accent dark:border-white/20 dark:bg-black/45 dark:text-white dark:shadow-plate dark:backdrop-blur-md"
              >
                {showPassword ? "Скрыть" : "Показать"}
              </button>
            </div>
          </label>
          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <button
            type="submit"
            disabled={loading || !password}
            className="flex min-h-[48px] w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold uppercase tracking-[0.1em] text-white shadow-lg shadow-accent/35 ring-1 ring-white/25 hover:bg-[#ff2a2a] disabled:opacity-50 dark:ring-white/15"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
