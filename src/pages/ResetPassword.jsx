import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

export default function ResetPassword() {
  const {
    session,
    authChecked,
    isLoadingAuth,
    isPasswordRecovery,
  } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    if (!authChecked || isLoadingAuth) return;

    setValidSession(Boolean(session && isPasswordRecovery));

    if (!session || !isPasswordRecovery) {
      setError(
        "Acesse esta página pelo link de recuperação enviado ao seu e-mail."
      );
    }
  }, [authChecked, isLoadingAuth, session, isPasswordRecovery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (newPassword.length < 8) {
      setError("A senha deve conter pelo menos 8 caracteres.");
      return;
    }

    if (!supabase || !validSession || !isPasswordRecovery) {
      setError("Sessão de recuperação inválida ou expirada. Solicite um novo link.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) throw signOutError;

      setValidSession(false);
      setUpdated(true);
    } catch (err) {
      setError(err.message || "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked || isLoadingAuth) {
    return (
      <AuthLayout
        icon={Lock}
        title="Validando link"
        subtitle="Aguarde enquanto verificamos sua recuperação de senha."
      >
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </AuthLayout>
    );
  }

  if (updated) {
    return (
      <AuthLayout
        icon={Lock}
        title="Senha atualizada"
        subtitle="Sua senha foi alterada com sucesso."
        footer={
          <Link to="/login" className="text-primary font-medium hover:underline">
            Voltar ao login
          </Link>
        }
      >
        <p className="text-sm text-center text-foreground">
          Agora você pode entrar usando sua nova senha.
        </p>
      </AuthLayout>
    );
  }

  if (!validSession) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="Link inválido"
        subtitle="Não foi possível validar o link de recuperação."
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            Solicitar novo link
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          {error || "Abra esta página pelo link enviado ao seu e-mail."}
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title="Nova senha"
      subtitle="Informe sua nova senha abaixo."
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="Pelo menos 8 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 h-12"
              minLength={8}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repita sua senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              minLength={8}
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Atualizando...
            </>
          ) : (
            "Redefinir senha"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
