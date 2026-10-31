import React, { useEffect, useState } from 'react';
import { Flag, Heart, MessageCircle, Send, ShieldOff, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtDistance, fmtDuration, fmtEnergy, fmtInt } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function PostCard({ post, operatorId, authorName, onChanged, onBlock, onReport }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [error, setError] = useState('');

  const mine = post.operator_id === operatorId;

  useEffect(() => {
    let alive = true;

    const loadLike = async () => {
      if (!operatorId || !supabase) return;

      const { data, error } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('operator_id', operatorId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar curtida:', error);
        return;
      }

      if (alive) setLiked(Boolean(data));
    };

    loadLike();

    return () => {
      alive = false;
    };
  }, [post.id, operatorId]);

  const refreshPost = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('likes, comments_count')
      .eq('id', post.id)
      .single();

    if (error) throw error;

    onChanged?.({ ...post, ...data });
  };

  const toggleLike = async () => {
    if (busy || !operatorId || !supabase) return;

    setBusy(true);
    setError('');

    try {
      if (liked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('operator_id', operatorId);

        if (error) throw error;
        setLiked(false);
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: post.id,
            operator_id: operatorId,
          });

        if (error && error.code !== '23505') throw error;
        setLiked(true);
      }

      await refreshPost();
    } catch (error) {
      console.error('Erro ao atualizar curtida:', error);
      setError(error?.message || 'Não foi possível atualizar a curtida.');
    } finally {
      setBusy(false);
    }
  };

  const openComments = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (!nextOpen || !supabase) return;

    setCommentsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
      setError(error?.message || 'Não foi possível carregar os comentários.');
    } finally {
      setCommentsLoading(false);
    }
  };

  const addComment = async () => {
    if (!text.trim() || !operatorId || !supabase || busy) return;

    setBusy(true);
    setError('');

    try {
      const { data: created, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          operator_id: operatorId,
          author_name: authorName || 'Operador',
          body: text.trim(),
        })
        .select('*')
        .single();

      if (error) throw error;

      setComments((prev) => [...prev, created]);
      setText('');
      await refreshPost();
    } catch (error) {
      console.error('Erro ao publicar comentário:', error);
      setError(error?.message || 'Não foi possível publicar o comentário.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="sv-panel p-3.5">
      <header className="flex items-start gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-secondary/60 font-mono text-[10px] uppercase text-primary">
          {(post.author_name || 'OP').slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-foreground">{post.author_name}</p>
          <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
            {post.visibility === 'private' ? 'privado' : post.visibility === 'followers' ? 'seguidores' : 'público'} ·{' '}
            {post.activity_kind || 'nota'}
          </p>
        </div>
        {!mine && (
          <div className="flex gap-1">
            <button type="button" title="Denunciar" onClick={() => onReport?.(post)} className="rounded p-1 text-muted-foreground hover:text-energy">
              <Flag className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="Bloquear autor" onClick={() => onBlock?.(post.author_name)} className="rounded p-1 text-muted-foreground hover:text-destructive">
              <ShieldOff className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </header>

      <p className="mt-2 text-[12px] leading-relaxed text-foreground/90">{post.body}</p>

      {(post.distance_m || post.duration_s || post.energy_mwh) && (
        <div className="mt-2 flex flex-wrap gap-3 font-mono text-[9.5px] text-muted-foreground">
          {post.distance_m ? <span className="text-foreground">{fmtDistance(post.distance_m)}</span> : null}
          {post.duration_s ? <span className="text-foreground">{fmtDuration(post.duration_s)}</span> : null}
          {post.steps ? <span className="text-foreground">{fmtInt(post.steps)} passos</span> : null}
          {post.energy_mwh ? (
            <span className="flex items-center gap-1 text-energy">
              <Zap className="h-3 w-3" /> {fmtEnergy(post.energy_mwh).value} {fmtEnergy(post.energy_mwh).unit}
            </span>
          ) : null}
        </div>
      )}

      <footer className="mt-2.5 flex items-center gap-3 border-t border-border/60 pt-2">
        <button
          type="button"
          onClick={toggleLike}
          disabled={busy || !operatorId}
          className={cn('flex items-center gap-1 font-mono text-[10px] disabled:opacity-50', liked ? 'text-destructive' : 'text-muted-foreground hover:text-foreground')}
        >
          <Heart className={cn('h-3.5 w-3.5', liked && 'fill-current')} /> {post.likes || 0}
        </button>
        <button type="button" onClick={openComments} className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground">
          <MessageCircle className="h-3.5 w-3.5" /> {post.comments_count || 0}
        </button>
      </footer>

      {open && (
        <div className="mt-2 space-y-1.5">
          {commentsLoading && (
            <p className="font-mono text-[9px] text-muted-foreground">Carregando comentários...</p>
          )}

          {!commentsLoading && comments.length === 0 && (
            <p className="font-mono text-[9px] text-muted-foreground">Sem comentários ainda.</p>
          )}

          {comments.map((c) => (
            <div key={c.id} className="rounded-md border border-border/50 px-2 py-1">
              <p className="text-[10.5px] text-foreground/90">{c.body}</p>
              <p className="font-mono text-[8px] text-muted-foreground">{c.author_name}</p>
            </div>
          ))}

          <div className="flex gap-1.5">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Comentar…" className="h-8 text-[11px]" maxLength={280} />
            <Button size="sm" onClick={addComment} disabled={!text.trim() || busy || !operatorId} className="h-8 px-2">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-[10px] text-destructive">{error}</p>
      )}
    </article>
  );
}
