import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';

export default function UserNotRegisteredError() {
  return (
    <AuthLayout
      icon={ShieldAlert}
      title="Acesso restrito"
      subtitle="Esta conta ainda não tem acesso ao VitalStep."
      footer={<Link to="/login" className="font-medium text-primary hover:underline">Voltar ao login</Link>}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        Confira se você entrou com a conta correta. Se precisar de acesso, entre em contato com o administrador do aplicativo.
      </p>
    </AuthLayout>
  );
}
