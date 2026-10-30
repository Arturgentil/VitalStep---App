import React, { useState } from 'react';
import { Flag, Heart, MessageCircle, Send, ShieldOff, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtDistance, fmtDuration, fmtEnergy, fmtInt } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function PostCard({ post, operatorId, authorName, onChanged, onBlock, onReport }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const liked = (post.liked_by || []).includes(operatorId);
  const mine = post.operator_id === operatorId;

  const toggleLike = async () => {
    const likedBy = liked
      ? (post.liked_by || []).filter((id) => id !== operatorId)
      : [...(post.liked_by || []), operatorId];
    await base44.entities.Post.update(post.id, { liked_by: likedBy, likes: likedBy.length });
    onChanged?.({ ...post, liked_by: likedBy, likes: likedBy.length });
  };

  const openComments = async () => {
    setOpen((v) => !v);
    if (!open) {
      const page = await base44.entities.Comment.filter({ post_id: post.id }, { sort: 'created_date', limit: 50 });
      setComments(page.items || []);
    }
  };

  const addComment = async () => {
    if (!text.trim()) return;
    const created = await base44.entities.Comment.create({
      post_id: post.id,
      operator_id: operatorId,
      author_name: authorName || 'Operador',
      body: text.trim(),
    });
    setComments((prev) => [...prev, created]);
    setText('');
    const count = (post.comments_count || 0) + 1;
    await base44.entities.Post.update(post.id, { comments_count: count });
    onChanged?.({ ...post, comments_count: count });
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
        <button type="button" onClick={toggleLike} className={cn('flex items-center gap-1 font-mono text-[10px]', liked ? 'text-destructive' : 'text-muted-foreground hover:text-foreground')}>
          <Heart className={cn('h-3.5 w-3.5', liked && 'fill-current')} /> {post.likes || 0}
        </button>
        <button type="button" onClick={openComments} className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground">
          <MessageCircle className="h-3.5 w-3.5" /> {post.comments_count || 0}
        </button>
      </footer>

      {open && (
        <div className="mt-2 space-y-1.5">
          {comments.length === 0 && <p className="font-mono text-[9px] text-muted-foreground">Sem comentários ainda.</p>}
          {comments.map((c) => (
            <div key={c.id} className="rounded-md border border-border/50 px-2 py-1">
              <p className="text-[10.5px] text-foreground/90">{c.body}</p>
              <p className="font-mono text-[8px] text-muted-foreground">{c.author_name}</p>
            </div>
          ))}
          <div className="flex gap-1.5">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Comentar…" className="h-8 text-[11px]" maxLength={280} />
            <Button size="sm" onClick={addComment} disabled={!text.trim()} className="h-8 px-2">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}