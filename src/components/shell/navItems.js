import {
  Radar,
  Footprints,
  HeartPulse,
  Zap,
  ScanLine,
  Bluetooth,
  Sparkles,
  Target,
  Users,
  ShieldAlert,
  FileCode2,
  UserRound,
  Map as MapIcon,
} from 'lucide-react';

export const NAV_GROUPS = [
  {
    label: 'Operação',
    items: [
      { to: '/', label: 'Command Center', icon: Radar },
      { to: '/atividade', label: 'Atividade', icon: Footprints },
      { to: '/mapa', label: 'Traçado', icon: MapIcon },
      { to: '/saude', label: 'Saúde', icon: HeartPulse },
      { to: '/energia', label: 'Energia', icon: Zap },
    ],
  },
  {
    label: 'Laboratórios',
    items: [
      { to: '/biomecanica', label: 'Biomecânica', icon: ScanLine },
      { to: '/dispositivo', label: 'Dispositivo', icon: Bluetooth },
      { to: '/inteligencia', label: 'Inteligência', icon: Sparkles },
    ],
  },
  {
    label: 'Progresso',
    items: [
      { to: '/metas', label: 'Metas', icon: Target },
      { to: '/comunidade', label: 'Comunidade', icon: Users },
      { to: '/seguranca', label: 'Segurança', icon: ShieldAlert },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/protocolo', label: 'Protocolo BLE', icon: FileCode2 },
      { to: '/perfil', label: 'Perfil', icon: UserRound },
    ],
  },
];

export const MOBILE_ITEMS = [
  { to: '/', label: 'Command', icon: Radar },
  { to: '/atividade', label: 'Atividade', icon: Footprints },
  { to: '/mapa', label: 'Mapa', icon: MapIcon },
  { to: '/saude', label: 'Saúde', icon: HeartPulse },
  { to: '/energia', label: 'Energia', icon: Zap },
];