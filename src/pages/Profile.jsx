import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bluetooth, Download, FileJson, Globe2, KeyRound, Moon, RefreshCcw, ShieldCheck, Sun, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/store';
import SectionTitle from '@/components/sv/SectionTitle';
import Panel from '@/components/sv/Panel';
import StatusPill from '@/components/sv/StatusPill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { fmtDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const BACKUP_TABLES = [
  'shoe_devices',
  'activities',
  'measurements',
  'energy_logs',
  'device_events',
  'health_notes',
  'safety_events',
  'emergency_contacts',
  'goals',
  'achievements',
  'challenges',
  'challenge_participants',
  'posts',
  'post_likes',
  'comments',
  'reports',
];

export default function Profile() {
  const { profile, patchProfile, operatorId, online, ble, demoMode, setDemoMode } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    birth_year: profile?.birth_year || 1994,
    height_cm: profile?.height_cm || 174,
    weight_kg: profile?.weight_kg || 71,
    sex: profile?.sex || 'undisclosed',
  });
  const [devices, setDevices] = useState([]);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name || '',
        birth_year: profile.birth_year || 1994,
        height_cm: profile.height_cm || 174,
        weight_kg: profile.weight_kg || 71,
        sex: profile.sex || 'undisclosed',
      });
    }
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!operatorId || !supabase) {
      setDevices([]);
      return;
    }

    let cancelled = false;

    const loadDevices = async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('shoe_devices')
          .select('*')
          .eq('operator_id', operatorId)
          .order('last_seen', { ascending: false })
          .limit(5);

        if (queryError) throw queryError;
        if (!cancelled) setDevices(data ?? []);
      } catch (err) {
        if (!cancelled) {
          setDevices([]);
          setError(err?.message || 'Falha ao carregar dispositivos.');
        }
      }
    };

    loadDevices();

    return () => {
      cancelled = true;
    };
  }, [operatorId, ble.status]);

  const save = async () => {
    await patchProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const exportAll = async () => {
    if (!operatorId || !supabase) {
      setError('Autenticação ou conexão com Supabase indisponível.');
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const payload = {
        app: 'StepVolt',
        version: 2,
        exported_at: new Date().toISOString(),
        profile: null,
        data: {},
      };

      const { data: profileData, error: profileError } = await supabase
        .from('stepvolt_profiles')
        .select('*')
        .eq('operator_id', operatorId)
        .maybeSingle();

      if (profileError) throw profileError;
      payload.profile = profileData;

      for (const table of BACKUP_TABLES) {
        const rows = [];
        const pageSize = 1000;
        let offset = 0;

        while (true) {
          const { data, error: queryError } = await supabase
            .from(table)
            .select('*')
            .eq('operator_id', operatorId)
            .range(offset, offset + pageSize - 1);

          if (queryError) {
            throw new Error(`Falha ao exportar ${table}: ${queryError.message}`);
          }

          const batch = data ?? [];
          rows.push(...batch);

          if (batch.length < pageSize) break;
          offset += pageSize;
        }

        payload.data[table] = rows;
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = `stepvolt-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMessage('Backup exportado com os registros próprios das 17 tabelas.');
    } catch (err) {
      setError(err?.message || 'Falha ao exportar dados.');
    }
  };

  const importBackup = () => {
    if (fileRef.current) fileRef.current.value = '';
    setError(
      'Importação temporariamente desativada. A restauração precisa validar os IDs e relacionamentos antes de gravar os dados.'
    );
  };

  const eraseAll = async () => {
    setError(
      'Limpeza temporariamente desativada. Ela será habilitada após a criação de uma operação transacional no banco.'
    );
  };

  const toggle = (key) => (
    <Switch checked={Boolean(profile?.[key])} onCheckedChange={(v) => patchProfile({ [key]: v })} />
  );

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Conta e privacidade"
        title="Perfil"
        description="Preferências, consentimentos e controle total sobre os dados deste operador."
        right={<StatusPill tone={online ? 'connected' : 'warning'}>{online ? 'sincronizado' : 'offline'}</StatusPill>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Perfil pessoal" subtitle="usado nos cálculos de passada e metas" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="pname">Nome de exibição</Label>
              <Input id="pname" value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pbirth">Ano de nascimento</Label>
              <Input id="pbirth" type="number" value={form.birth_year} onChange={(e) => setForm((f) => ({ ...f, birth_year: Number(e.target.value) }))} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="psex">Sexo</Label>
              <select id="psex" value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))} className="mt-1.5 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="undisclosed">Prefiro não informar</option>
                <option value="female">Feminino</option>
                <option value="male">Masculino</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div>
              <Label htmlFor="ph">Altura (cm)</Label>
              <Input id="ph" type="number" value={form.height_cm} onChange={(e) => setForm((f) => ({ ...f, height_cm: Number(e.target.value) }))} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pw">Massa (kg)</Label>
              <Input id="pw" type="number" value={form.weight_kg} onChange={(e) => setForm((f) => ({ ...f, weight_kg: Number(e.target.value) }))} className="mt-1.5" />
            </div>
          </div>
          <Button size="sm" className="mt-3" onClick={save}>{saved ? 'Perfil salvo' : 'Salvar perfil'}</Button>

          <div className="mt-4 grid gap-2 border-t border-border/60 pt-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-2.5 py-2">
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {profile?.theme === 'light' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />} Tema
              </span>
              <div className="flex gap-1">
                {['dark', 'light'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => patchProfile({ theme: t })}
                    className={cn('rounded px-2 py-0.5 font-mono text-[9px] uppercase', profile?.theme === t ? 'bg-primary/15 text-primary' : 'text-muted-foreground')}
                  >
                    {t === 'dark' ? 'escuro' : 'claro'}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border/60 px-2.5 py-2 text-[11px] text-muted-foreground">
              Reduzir animações
              <Switch checked={Boolean(profile?.reduced_motion)} onCheckedChange={(v) => patchProfile({ reduced_motion: v })} />
            </label>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Privacidade" subtitle="tudo privado por padrão">
            <div className="space-y-2">
              {[
                ['public_profile', 'Perfil público', 'Permite que outros vejam seu nome no feed.'],
                ['share_routes', 'Compartilhar rotas', 'Rotas nunca são publicadas sem esta autorização.'],
                ['share_health', 'Compartilhar saúde', 'BPM e SpO₂ permanecem privados por padrão.'],
              ].map(([key, label, hint]) => (
                <div key={key} className="rounded-lg border border-border/60 px-2.5 py-2">
                  <label className="flex items-center justify-between text-[11.5px] text-foreground">
                    {label}
                    {toggle(key)}
                  </label>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{hint}</p>
                </div>
              ))}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Globe2 className="mr-1.5 h-3.5 w-3.5" /> Política de privacidade
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto border-border bg-card">
                  <DialogHeader>
                    <DialogTitle className="text-sm uppercase tracking-[0.14em]">Política de privacidade</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-[11.5px] leading-relaxed text-muted-foreground">
                    <p><span className="text-foreground">Quais dados tratamos:</span> métricas biométricas recebidas do tênis (BPM, SpO₂, temperatura de contato), pressão plantar, energia gerada, sessões de atividade, localização quando você ativa a rota, e suas preferências.</p>
                    <p><span className="text-foreground">Onde ficam:</span> os registros ficam vinculados à conta autenticada pelo Supabase. O identificador interno da conta controla o acesso aos dados. A exportação gera um arquivo JSON com os registros próprios da conta.</p>
                    <p><span className="text-foreground">Compartilhamento:</span> apenas publicações que você criar com visibilidade pública ou para seguidores. Saúde e rotas não são publicadas automaticamente em nenhuma hipótese.</p>
                    <p><span className="text-foreground">Assistente de IA:</span> recebe um resumo agregado dos seus números (sem identificadores) somente após autorização explícita.</p>
                    <p><span className="text-foreground">Exclusão:</span> a opção de apagar dados remove os registros deste operador e reinicia a configuração inicial.</p>
                    <p><span className="text-foreground">Limites:</span> dados vestíveis não são dispositivo médico. Nenhuma leitura aqui constitui diagnóstico.</p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Panel>

          <Panel title="Consentimentos" subtitle="revogáveis em um toque">
            {[
              ['consent_health', 'Dados biométricos'],
              ['consent_location', 'Localização'],
              ['consent_ai', 'Análise por IA'],
              ['notify_alerts', 'Alertas de limites'],
              ['notify_achievements', 'Conquistas'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between border-b border-border/50 py-1.5 text-[11px] text-muted-foreground last:border-0">
                {label}
                {toggle(key)}
              </label>
            ))}
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Sessão e segurança" subtitle="contexto técnico deste operador">
          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground"><KeyRound className="h-3 w-3" /> Identificador</span>
              <span className="font-mono text-[9px] text-foreground">{operatorId ? `${operatorId.slice(0, 14)}…` : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Última sincronização</span>
              <span className="num text-foreground">{profile?.updated_at ? fmtDateTime(profile.updated_at) : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Modo de demonstração</span>
              <Switch checked={demoMode} onCheckedChange={setDemoMode} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Enlace BLE</span>
              <span className="num text-foreground">{ble.status}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate('/onboarding')}>
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Refazer configuração inicial
          </Button>
        </Panel>

        <Panel title="Dispositivos" subtitle="tênis vinculados">
          {devices.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Nenhum tênis vinculado a este operador.</p>
          ) : (
            <div className="space-y-1.5">
              {devices.map((d) => (
                <div key={d.id} className="rounded-md border border-border/60 px-2 py-1.5">
                  <p className="text-[11.5px] text-foreground">{d.name}</p>
                  <p className="font-mono text-[9px] text-muted-foreground">
                    fw {d.firmware_version || '—'} · {d.battery_pct ?? '—'}% · {fmtDateTime(d.last_seen)}
                  </p>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate('/dispositivo')}>
            <Bluetooth className="mr-1.5 h-3.5 w-3.5" /> Gerenciar no dispositivo
          </Button>
        </Panel>

        <Panel title="Seus dados" subtitle="exportar, importar ou apagar">
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={exportAll}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar backup JSON
            </Button>
            <Button disabled variant="outline" size="sm" className="w-full justify-start" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Importar backup validado
            </Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importBackup} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled variant="outline" size="sm" className="w-full justify-start text-destructive hover:text-destructive">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Apagar dados e reiniciar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-border bg-card">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-destructive" /> Apagar todos os registros?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground">
                    Sessões, medições, energia, metas, conquistas, contatos e publicações deste operador serão removidos.
                    Não há como desfazer. Exporte um backup antes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={eraseAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Apagar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {message && <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-snug text-success"><ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" /> {message}</p>}
          {error && <p className="mt-2 font-mono text-[9px] text-destructive">{error}</p>}
          <p className="mt-2 flex items-start gap-1.5 font-mono text-[8.5px] leading-relaxed text-muted-foreground">
            <FileJson className="mt-0.5 h-3 w-3 shrink-0" /> A exportação inclui os registros próprios das tabelas do usuário. Importação e limpeza estão temporariamente desativadas durante a migração.
          </p>
        </Panel>
      </div>
    </div>
  );
}