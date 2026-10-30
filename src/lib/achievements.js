export const ACHIEVEMENT_CATALOG = [
  {
    key: 'first_session',
    title: 'Primeiro passo',
    description: 'Registre a primeira sessão de atividade.',
    tier: 'bronze',
    metric: 'activities',
    threshold: 1,
  },
  {
    key: 'ten_sessions',
    title: 'Rotina em curso',
    description: 'Dez sessões registradas na plataforma.',
    tier: 'silver',
    metric: 'activities',
    threshold: 10,
  },
  {
    key: 'distance_25k',
    title: '25 km percorridos',
    description: 'Distância acumulada de 25 quilômetros.',
    tier: 'silver',
    metric: 'distance_m',
    threshold: 25000,
  },
  {
    key: 'energy_500',
    title: 'Coletor de energia',
    description: '500 mWh gerados pelo movimento.',
    tier: 'bronze',
    metric: 'energy_mwh',
    threshold: 500,
  },
  {
    key: 'streak_5',
    title: 'Cinco dias seguidos',
    description: 'Consistência de cinco dias consecutivos.',
    tier: 'gold',
    metric: 'streak_days',
    threshold: 5,
  },
  {
    key: 'steps_100k',
    title: 'Cem mil passos',
    description: '100.000 passos acumulados nas sessões.',
    tier: 'gold',
    metric: 'steps',
    threshold: 100000,
  },
];

export function achievementProgress(stats) {
  return ACHIEVEMENT_CATALOG.map((item) => {
    const value =
      item.metric === 'activities'
        ? stats.activities
        : item.metric === 'distance_m'
          ? stats.distance_m
          : item.metric === 'energy_mwh'
            ? stats.energy_mwh
            : item.metric === 'streak_days'
              ? stats.streak_days
              : stats.steps;
    return { ...item, progress: Math.round(value || 0) };
  });
}