import React, { useEffect, useMemo, useState } from 'react';
import { Search, Send, ShieldCheck, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/store';
import useTelemetryData from '@/hooks/useTelemetryData';
import SectionTitle from '@/components/sv/SectionTitle';
import Panel from '@/components/sv/Panel';
import PostCard from '@/components/community/PostCard';
import EmptyState from '@/components/sv/EmptyState';
import StatusPill from '@/components/sv/StatusPill';
import DemoNotice from '@/components/sv/DemoNotice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fmtDate } from '@/lib/format';

const BLOCK_KEY = 'stepvolt.blocked_authors';

export default function Community() {
  const { operatorId, profile, demoMode } = useApp();
  const { activities, demo } = useTelemetryData();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [activityId, setActivityId] = useState('');
  const [blocked, setBlocked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BLOCK_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [feedback, setFeedback] = useState(null);

  const load = async (isAlive = () => true) => {
    if (demoMode || !operatorId || !supabase) {
      if (isAlive()) {
        setPosts([]);
        setLoading(false);
      }
      return;
    }

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) throw error;

    if (isAlive()) {
      setPosts(data || []);
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;

    load(() => alive).catch((error) => {
      console.error('Erro ao carregar comunidade:', error);
      if (alive) {
        setPosts([]);
        setLoading(false);
        setFeedback('Não foi possível carregar as publicações.');
      }
    });

    return () => {
      alive = false;
    };
  }, [operatorId, demoMode]);

  const visible = useMemo(
    () =>
      posts
        .filter((p) => p.operator_id === operatorId || p.visibility === 'public')
        .filter((p) => !blocked.includes(p.author_name))
        .filter((p) => (search ? `${p.author_name} ${p.body}`.toLowerCase().includes(search.toLowerCase()) : true)),
    [posts, operatorId, blocked, search],
  );

  const publish = async () => {
    if (!body.trim() || !operatorId || demoMode || !supabase) return;

    const source = activities.find((a) => a.id === activityId);

    try {
      const { data: created, error } = await supabase
        .from('posts')
        .insert({
          operator_id: operatorId,
          author_name: profile?.display_name || 'Operador',
          title: source?.title || 'Publicação',
          body: body.trim(),
          activity_kind: source?.kind || 'note',
          distance_m: source?.distance_m ?? null,
          duration_s: source?.duration_s ?? null,
          steps: source?.steps ?? null,
          energy_mwh: source?.energy_mwh ?? null,
          visibility,
        })
        .select('*')
        .single();

      if (error) throw error;

      setPosts((prev) => [created, ...prev]);
      setBody('');
      setActivityId('');
      setFeedback('Publicação criada.');
      setTimeout(() => setFeedback(null), 2400);
    } catch (error) {
      console.error('Erro ao publicar:', error);
      setFeedback(error?.message || 'Não foi possível publicar.');
    }
  };

  const block = (author) => {
    const next = Array.from(new Set([...blocked, author]));
    setBlocked(next);
    localStorage.setItem(BLOCK_KEY, JSON.stringify(next));
    setFeedback(`Autor bloqueado: ${author}. As publicações dele ficam ocultas neste dispositivo.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const report = async (post) => {
    if (!operatorId || !supabase || demoMode) return;

    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          operator_id: operatorId,
          post_id: post.id,
          reason: 'conteúdo inadequado',
          detail: `Autor: ${post.author_name || 'Desconhecido'}`,
        });

      if (error) throw error;

      setFeedback('Denúncia registrada para moderação.');
      setTimeout(() => setFeedback(null), 2600);
    } catch (error) {
      console.error('Erro ao denunciar publicação:', error);
      setFeedback(error?.message || 'Não foi possível registrar a denúncia.');
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="StepVolt Community"
        title="Comunidade"
        description="Feed de atividades com privacidade por padrão. Saúde, rotas e localização nunca são publicadas automaticamente."
        right={<StatusPill tone={profile?.public_profile ? 'info' : 'idle'} dot={false}>{profile?.public_profile ? 'perfil público' : 'perfil privado'}</StatusPill>}
      />

      {demo && <DemoNotice />}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <Panel title="Publicar" subtitle="visibilidade escolhida por você">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escreva sobre a sessão de hoje…"
              className="min-h-[80px] text-xs"
              maxLength={400}
            />
            <div className="mt-2 space-y-2">
              <select
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
              >
                <option value="">Sem anexar sessão</option>
                {activities.slice(0, 8).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title || a.kind} · {fmtDate(a.started_at)}
                  </option>
                ))}
              </select>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
              >
                <option value="private">Somente eu (privado)</option>
                <option value="followers">Seguidores</option>
                <option value="public">Público</option>
              </select>
            </div>
            <Button size="sm" className="mt-2 w-full" onClick={publish} disabled={!body.trim()}>
              <Send className="mr-1.5 h-3.5 w-3.5" /> Publicar
            </Button>
            <p className="mt-2 flex items-start gap-1.5 font-mono text-[8.5px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              Ao anexar uma sessão, apenas distância, duração, passos e energia são compartilhados. Rotas e dados de saúde ficam de fora.
            </p>
            {feedback && <p className="mt-2 font-mono text-[9px] text-success">{feedback}</p>}
          </Panel>

          <Panel title="Busca e privacidade" subtitle="controles locais">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar autor ou texto" className="h-9 pl-7 text-[11px]" />
            </div>
            <div className="mt-3">
              <p className="hud-label mb-1.5">autores bloqueados</p>
              {blocked.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Nenhum bloqueio ativo.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {blocked.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        const next = blocked.filter((x) => x !== b);
                        setBlocked(next);
                        localStorage.setItem(BLOCK_KEY, JSON.stringify(next));
                      }}
                      className="rounded-full border border-border px-2 py-0.5 font-mono text-[9px] text-muted-foreground hover:text-foreground"
                    >
                      {b} ✕
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </div>

        <Panel title="Feed" subtitle={`${visible.length} publicações visíveis`} right={<Users className="h-3.5 w-3.5 text-muted-foreground" />}>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-secondary/50" />
              ))}
            </div>
          ) : visible.length ? (
            <div className="space-y-2.5">
              {visible.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  operatorId={operatorId}
                  authorName={profile?.display_name}
                  onChanged={(next) => setPosts((prev) => prev.map((x) => (x.id === next.id ? next : x)))}
                  onBlock={block}
                  onReport={report}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="Feed vazio"
              description="Nenhuma publicação visível com os filtros atuais. Publique a primeira sessão ou limpe a busca."
            />
          )}
        </Panel>
      </div>
    </div>
  );
}