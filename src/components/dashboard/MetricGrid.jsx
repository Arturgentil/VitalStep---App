import React, { useEffect, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import MetricCard from '@/components/sv/MetricCard';
import { cn } from '@/lib/utils';

const KEY = 'stepvolt.card_order';

export default function MetricGrid({ cards }) {
  const keys = cards.map((c) => c.key);
  const [order, setOrder] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || '[]');
      return [...stored.filter((k) => keys.includes(k)), ...keys.filter((k) => !stored.includes(k))];
    } catch {
      return keys;
    }
  });

  useEffect(() => {
    setOrder((prev) => [...prev.filter((k) => keys.includes(k)), ...keys.filter((k) => !prev.includes(k))]);
  }, [cards.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const byKey = Object.fromEntries(cards.map((c) => [c.key, c]));

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const next = Array.from(order);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setOrder(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="metric-cards" direction="horizontal">
        {(dropProvided) => (
          <div
            ref={dropProvided.innerRef}
            {...dropProvided.droppableProps}
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-3"
          >
            {order.map((key, index) => {
              const card = byKey[key];
              if (!card) return null;
              return (
                <Draggable key={key} draggableId={key} index={index}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className={cn('group/card relative', snapshot.isDragging && 'z-10 opacity-95')}
                    >
                      <MetricCard {...card} />
                      <GripVertical className="absolute right-1.5 bottom-1.5 h-3 w-3 cursor-grab text-muted-foreground/0 transition-colors group-hover/card:text-muted-foreground/60" />
                    </div>
                  )}
                </Draggable>
              );
            })}
            {dropProvided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}