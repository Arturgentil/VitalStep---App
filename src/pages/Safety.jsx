import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, MapPin, Phone, PhoneCall, Plus, ShieldAlert, ShieldCheck, Trash2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useApp } from '@/lib/store';
import SectionTitle from '@/components/sv/SectionTitle';
import Panel from '@/components/sv/Panel';
import StatusPill from '@/components/sv/StatusPill';
import EmptyState from '@/components/sv/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { MESSAGE } from '@/lib/ble/protocol';
import { fmtDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATE_LABEL = {
  detected: { label: 'detectado', tone: 'warning' },
  cancelled: { label: 'cancelado', tone: 'idle' },
  attempted: { label: 'tentativa de envio', tone: 'warning' },
  delivered: { label: 'entrega confirmada', tone: 'connected' },
  failed: { label: 'falha no envio', tone: 'error' },
};

export default function Safety() {
  const { operatorId, profile, patchProfile, sendCommand } = useApp();
  const [contacts, setContacts] = useState([]);
  const [events, setEvents] = useState([]);
  const [draft, setDraft] = useState({ name: '', phone: '', relation: '', notify_on_fall: true });
  const [countdown, setCountdown] = useState(null);
  const [kind, setKind] = useState('sos');
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [message, setMessage] = useState(null);
  const timer = useRef(null);

  const load = async () => {
    if (!operatorId) return;
    const [c, e] = await Promise.all([
      base44.entities.EmergencyContact.filter({ operator_id: operatorId }),
      base44.entities.SafetyEvent.filter({ operator_id: operatorId }, { sort: '-occurred_at', limit: 20 }),
    ]);
    setContacts(c || []);
    setEvents(e.items || []);
  };

  useEffect(() => {
    load().catch(() => {});
  }, [operatorId]);

  useEffect(() => () => clearInterval(timer.current), []);

  const arm = (eventKind) => {
    setKind(eventKind);
    setCountdown(10);
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCountdown((v) => {
        if (v === null) return null;
        if (v <= 1) {
          clearInterval(timer.current);
          confirmSend(eventKind);
          return null;
        }
        return v - 1;
      });
    }, 1000);
  };

  const cancel = async () => {
    clearInterval(timer.current);
    setCountdown(null);
    if (operatorId) {
      const created = await base44.entities.SafetyEvent.create({
        operator_id: operatorId,
        kind: kind === 'test' ? 'test' : kind === 'fall' ? 'fall_suspected' : 'sos',
        state: 'cancelled',
        occurred_at: new Date().toISOString(),
        note: 'Cancelado pelo operador durante a contagem regressiva.',
      });
      setEvents((prev) => [created, ...prev]);
    }
    setMessage('Alerta cancelado antes do envio.');
    setTimeout(() => setMessage(null), 2600);
  };

  const confirmSend = async (eventKind) => {
    if (!operatorId) return;
    let coords = null;
    if (navigator.geolocation) {
      coords = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 8000 },
        );
      });
    }
    const primary = contacts.find((c) => c.primary) || contacts[0];
    const created = await base44.entities.SafetyEvent.create({
      operator_id: operatorId,
      kind: eventKind === 'test' ? 'test' : eventKind === 'fall' ? 'fall_suspected' : 'sos',
      state: 'attempted',
      occurred_at: new Date().toISOString(),
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      contact_name: primary?.name || null,
      note:
        eventKind === 'test'
          ? 'Teste de funcionamento — nenhuma mensagem real foi enviada.'
          : 'Nenhum canal automatizado de SMS está configurado nesta versão; o evento foi registrado para acionamento manual.',
    });
    setEvents((prev) => [created, ...prev]);
    setLocation(coords);
    setMessage(
      eventKind === 'test'
        ? 'Teste concluído: contagem, registro e localização funcionaram. Nenhum alerta real foi enviado.'
        : 'Evento registrado. Nenhuma mensagem automática foi enviada — use o contato abaixo para ligar agora.',
    );
  };

  const addContact = async () => {
    if (!draft.name.trim() || !draft.phone.trim() || !operatorId) return;
    const created = await base44.entities.EmergencyContact.create({
      operator_id: operatorId,
      ...draft,
      primary: contacts.length === 0,
    });
    setContacts((prev) => [...prev, created]);
    setDraft({ name: '', phone: '', relation: '', notify_on_fall: true });
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalização indisponível neste navegador.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationError(null);
      },
      (err) => setLocationError(err.message || 'Permissão negada.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const primary = contacts.find((c) => c.primary) || contacts[0];

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Segurança"
        title="Segurança e emergência"
        description="Estados explícitos entre detecção, tentativa de envio e entrega confirmada. Nesta versão não há canal automatizado de SMS: nada é exibido como entregue sem confirmação real."
        right={<StatusPill tone="idle" dot={false}>{profile?.fall_detection ? 'queda ativa' : 'queda desativada'}</StatusPill>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel title="SOS manual" subtitle="contagem regressiva cancelável" grid>
          {countdown !== null ? (
            <div className="flex flex-col items-center py-6">
              <p className="hud-label">enviando em</p>
              <p className="num text-6xl font-bold text-destructive">{countdown}</p>
              <p className="mt-2 max-w-xs text-center text-[11px] text-muted-foreground">
                {kind === 'test' ? 'Teste: nenhum alerta real será enviado.' : 'Ao confirmar, o evento é registrado e sua localização é capturada se autorizada.'}
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={cancel}>
                  <X className="mr-1.5 h-4 w-4" /> Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    clearInterval(timer.current);
                    setCountdown(null);
                    confirmSend(kind);
                  }}
                >
                  <ShieldAlert className="mr-1.5 h-4 w-4" /> Confirmar agora
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <button
                type="button"
                onClick={() => arm('sos')}
                className="relative grid h-32 w-32 place-items-center rounded-full border-2 border-destructive/60 bg-destructive/10 text-destructive transition-transform hover:scale-105 active:scale-95"
              >
                <span className="absolute inset-0 rounded-full border border-destructive/30 anim-pulse-soft" />
                <ShieldAlert className="h-9 w-9" />
                <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em]">sos</span>
              </button>
              <div className="mt-4 grid w-full grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => arm('test')}>
                  Testar sem enviar
                </Button>
                <Button variant="outline" size="sm" onClick={shareLocation}>
                  <MapPin className="mr-1.5 h-3.5 w-3.5" /> Localização
                </Button>
              </div>
              {location && (
                <p className="mt-2 font-mono text-[9px] text-muted-foreground">
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </p>
              )}
              {locationError && <p className="mt-2 font-mono text-[9px] text-destructive">{locationError}</p>}
            </div>
          )}
          {message && (
            <p className="mt-2 flex items-start gap-1.5 rounded-md border border-primary/30 bg-primary/[0.06] px-2 py-1.5 text-[10.5px] leading-snug text-muted-foreground">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" /> {message}
            </p>
          )}
        </Panel>

        <Panel title="Detecção de quedas" subtitle="configuração aplicada ao firmware">
          <div className="space-y-3">
            <label className="flex items-center justify-between text-[11.5px]">
              <span className="text-muted-foreground">Detecção automática</span>
              <Switch
                checked={Boolean(profile?.fall_detection)}
                onCheckedChange={(v) => patchProfile({ fall_detection: v })}
              />
            </label>
            <div>
              <p className="hud-label mb-1">sensibilidade</p>
              <div className="flex gap-1">
                {['low', 'medium', 'high'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patchProfile({ fall_sensitivity: s })}
                    className={cn(
                      'flex-1 rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em]',
                      profile?.fall_sensitivity === s ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground',
                    )}
                  >
                    {s === 'low' ? 'baixa' : s === 'medium' ? 'média' : 'alta'}
                  </button>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={async () => {
                try {
                  await sendCommand(MESSAGE.CMD_SOS_TEST, {});
                  setMessage('Comando de teste enviado ao firmware.');
                  setTimeout(() => setMessage(null), 2600);
                } catch (err) {
                  setMessage(err?.message || 'Nenhum dispositivo conectado para receber o comando.');
                }
              }}
            >
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Enviar teste ao firmware
            </Button>
            <p className="font-mono text-[9px] leading-relaxed text-muted-foreground">
              A detecção real depende do firmware analisar a IMU. O aplicativo apenas registra o que o dispositivo reporta —
              não classifica quedas por conta própria.
            </p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Contatos de emergência" subtitle="usados no acionamento manual" className="lg:col-span-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Nome" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="h-9" />
            <Input placeholder="Telefone com DDI" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} className="h-9" />
            <Input placeholder="Relação (ex.: irmã)" value={draft.relation} onChange={(e) => setDraft((d) => ({ ...d, relation: e.target.value }))} className="h-9" />
            <Button size="sm" onClick={addContact} disabled={!draft.name.trim() || !draft.phone.trim()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar contato
            </Button>
          </div>
          <div className="mt-3 space-y-1.5">
            {contacts.length === 0 && <p className="text-[11px] text-muted-foreground">Nenhum contato cadastrado. Sem contato não há como acionar ajuda manualmente.</p>}
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-md border border-border/60 px-2.5 py-2">
                <ShieldCheck className={cn('h-3.5 w-3.5', c.primary ? 'text-success' : 'text-muted-foreground')} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] text-foreground">{c.name} {c.primary && <span className="font-mono text-[8px] uppercase text-success">principal</span>}</p>
                  <p className="font-mono text-[9px] text-muted-foreground">{c.phone} · {c.relation || 'contato'}</p>
                </div>
                <a href={`tel:${c.phone}`} className="rounded p-1 text-primary hover:text-foreground" aria-label={`Ligar para ${c.name}`}>
                  <PhoneCall className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={async () => { await base44.entities.EmergencyContact.delete(c.id); setContacts((p) => p.filter((x) => x.id !== c.id)); }}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          {primary && (
            <a href={`tel:${primary.phone}`} className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/[0.07] py-2 text-[11.5px] text-destructive">
              <Phone className="h-3.5 w-3.5" /> Ligar para {primary.name} agora
            </a>
          )}
        </Panel>

        <Panel title="Estados do alerta" subtitle="o que cada um significa">
          <ul className="space-y-1.5">
            {[
              ['detectado', 'O firmware ou o operador identificou um evento.'],
              ['cancelado', 'A contagem regressiva foi interrompida.'],
              ['tentativa de envio', 'Evento registrado e localização capturada; nenhum canal entregou mensagem.'],
              ['entrega confirmada', 'Só aparece com confirmação de um provedor de mensagens.'],
              ['falha no envio', 'O canal recusou ou não respondeu.'],
            ].map(([label, desc]) => (
              <li key={label} className="rounded-md border border-border/60 px-2 py-1.5">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-primary">{label}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{desc}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Registro de eventos" subtitle="histórico persistente">
        {events.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="Nenhum evento registrado" description="Cancele um teste ou acione o SOS para criar o primeiro registro." />
        ) : (
          <div className="space-y-1.5">
            {events.map((e) => {
              const meta = STATE_LABEL[e.state] || STATE_LABEL.detected;
              return (
                <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 px-2.5 py-2">
                  <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{e.kind}</span>
                  <span className="text-[10.5px] text-muted-foreground">{e.note}</span>
                  <span className="ml-auto font-mono text-[9px] text-muted-foreground">{fmtDateTime(e.occurred_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}