import React from 'react';
import { Cpu, FileCode2, Info, Radio, ShieldAlert, Terminal } from 'lucide-react';
import SectionTitle from '@/components/sv/SectionTitle';
import Panel from '@/components/sv/Panel';
import StatusPill from '@/components/sv/StatusPill';
import { MESSAGE, SERVICE_UUID, TELEMETRY_CHAR_UUID, ENERGY_CHAR_UUID, COMMAND_CHAR_UUID } from '@/lib/ble/protocol';

const FRAME_ROWS = [
  ['0', '1', '0x53', 'Magic "S"'],
  ['1', '1', '0x56', 'Magic "V"'],
  ['2', '1', '1', 'Versão do protocolo'],
  ['3', '1', '0x01–0x14', 'Tipo da mensagem'],
  ['4', '1', '0–255', 'Sequência (detecção de duplicados)'],
  ['5', '1', '0–64', 'Tamanho do payload'],
  ['6', 'n', 'payload', 'Campos little-endian'],
  ['6+n', '1', 'CRC-8', 'Poly 0x07, init 0x00, sobre 0..5+n'],
];

const MESSAGES = [
  [MESSAGE.TELEMETRY, 'TELEMETRY', 'steps u32 · bpm u8 · spo2 u8 · temp×100 i16 · battery u8 · flags u8 · quality u8', 'Notificação'],
  [MESSAGE.ENERGY, 'ENERGY', 'power_uw u32 · voltage_mv u16 · current_ma i16 · energy_uwh u32 · battery u8', 'Notificação'],
  [MESSAGE.PRESSURE, 'PRESSURE', '6 × zone u8 (heelL, midL, foreL, heelR, midR, foreR) · load_g u16', 'Notificação'],
  [MESSAGE.DEVICE_INFO, 'DEVICE_INFO', 'fw major/minor/patch u8 ×3 · protocol u8 · sensor flags u8 · battery u8', 'Notificação'],
  [MESSAGE.ERROR, 'ERROR', 'code u8 · mensagem ASCII', 'Notificação'],
  [MESSAGE.CMD_START, 'CMD_START', 'kind u8 (0 = caminhada, 1 = corrida)', 'Escrita'],
  [MESSAGE.CMD_STOP, 'CMD_STOP', '—', 'Escrita'],
  [MESSAGE.CMD_CALIBRATE, 'CMD_CALIBRATE', '—', 'Escrita'],
  [MESSAGE.CMD_SOS_TEST, 'CMD_SOS_TEST', '—', 'Escrita'],
  [MESSAGE.CMD_SET_RATE, 'CMD_SET_RATE', 'rate_hz u8', 'Escrita'],
];

const FLAGS = [
  ['bit 0', 'IMU', 'Acelerômetro + giroscópio'],
  ['bit 1', 'PPG', 'Sensor óptico (BPM / SpO₂)'],
  ['bit 2', 'TEMP', 'Termômetro de contato'],
  ['bit 3', 'PIEZO', 'Piezoelétrico (pressão + energia)'],
  ['bit 4', 'FSR', 'Matriz plantar (6 zonas)'],
  ['bit 5', 'GNSS', 'Módulo de localização auxiliar'],
];

const FIRMWARE = `// StepVolt firmware reference — ESP32 (Arduino core, NimBLE)
#include <NimBLEDevice.h>

static const char* SVC  = "7a1c0001-6b4e-4f6d-9a2b-5c3d7e8f9a01";
static const char* TELE = "7a1c0002-6b4e-4f6d-9a2b-5c3d7e8f9a01";
static const char* ENER = "7a1c0003-6b4e-4f6d-9a2b-5c3d7e8f9a01";
static const char* CMD  = "7a1c0004-6b4e-4f6d-9a2b-5c3d7e8f9a01";

NimBLECharacteristic* teleChar;
NimBLECharacteristic* enerChar;
uint8_t seq = 0;

uint8_t crc8(const uint8_t* data, size_t len) {
  uint8_t crc = 0x00;
  for (size_t i = 0; i < len; ++i) {
    crc ^= data[i];
    for (uint8_t b = 0; b < 8; ++b)
      crc = (crc & 0x80) ? (uint8_t)((crc << 1) ^ 0x07) : (uint8_t)(crc << 1);
  }
  return crc;
}

size_t buildFrame(uint8_t* out, uint8_t type, const uint8_t* payload, uint8_t len) {
  out[0] = 0x53; out[1] = 0x56; out[2] = 1; out[3] = type;
  out[4] = ++seq; out[5] = len;
  memcpy(out + 6, payload, len);
  out[6 + len] = crc8(out, 6 + len);
  return 7 + len;
}

void publishTelemetry(uint32_t steps, uint8_t bpm, uint8_t spo2,
                      int16_t tempCx100, uint8_t battery, uint8_t flags) {
  uint8_t p[11];
  memcpy(p, &steps, 4);
  p[4] = bpm; p[5] = spo2;
  memcpy(p + 6, &tempCx100, 2);
  p[8] = battery; p[9] = flags; p[10] = 2; // quality: 2 = alta
  uint8_t frame[18];
  size_t n = buildFrame(frame, 0x01, p, sizeof(p));
  teleChar->setValue(frame, n);
  teleChar->notify();
}

void publishEnergy(uint32_t powerUw, uint16_t voltageMv, int16_t currentMa,
                   uint32_t energyUwh, uint8_t battery) {
  uint8_t p[13];
  memcpy(p, &powerUw, 4);
  memcpy(p + 4, &voltageMv, 2);
  memcpy(p + 6, &currentMa, 2);
  memcpy(p + 8, &energyUwh, 4);
  p[12] = battery;
  uint8_t frame[20];
  size_t n = buildFrame(frame, 0x02, p, sizeof(p));
  enerChar->setValue(frame, n);
  enerChar->notify();
}

// setup(): NimBLEDevice::init("StepVolt-Shoe-01");
// server->createService(SVC); teleChar->setNotifyProperty(true);
// enerChar->setNotifyProperty(true); cmdChar->setWriteProperty(true);
// advertising->setName("StepVolt-Shoe-01"); advertising->start();`;

const STATUS = {
  done: [
    'Onboarding completo com consentimentos, metas e diagnóstico',
    'Web Bluetooth real com CRC, deduplicação, watchdog e reconexão progressiva',
    'Command Center com cartões reorganizáveis, gráficos expansíveis e alertas',
    'Sessão ao vivo com pausa, GPS opcional e persistência da atividade',
    'Saúde com filtros por período, lacunas, limites e exportações CSV/PDF',
    'Energy Lab com reactor, potência × consumo, eficiência e autonomia estimada',
    'Biomecânica com mapa plantar, assimetria e evolução por sessão',
    'Assistente de IA com autorização, limite diário e fontes declaradas',
    'Metas, calendário de consistência, conquistas e desafios',
    'Comunidade com feed, curtidas, comentários, busca, bloqueio e denúncia',
    'Segurança com SOS cancelável, estados explícitos e contatos',
    'Perfil com privacidade, consentimentos, exportação/importação e exclusão',
  ],
  partial: [
    'Firmware ESP32: especificação completa e referência de código; o binário não é entregue por este ambiente',
    'Detecção de quedas: configuração e registro de eventos prontos; o algoritmo roda no firmware',
    'Envio automático de alertas: sem provedor de SMS/telefonia integrado, o app assume o estado “tentativa” e oferece ligação direta',
    'Sincronização offline: gravações são feitas direto no backend; fila local com retentativa não está implementada',
  ],
  limits: [
    'Web Bluetooth exige Chrome/Edge em HTTPS e não existe no iOS Safari',
    'RSSI só é exposto em navegadores com watchAdvertisements',
    'Distância sem GPS é estimada por passos × comprimento de passada',
    'Dados de um operador ficam isolados por identificador local; não há login obrigatório nesta versão',
    'Nenhuma leitura é diagnóstica e a autonomia energética não foi comprovada experimentalmente',
  ],
};

export default function Docs() {
  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Documentação técnica"
        title="Protocolo BLE e limites"
        description="Especificação versionada entre o aplicativo e o firmware ESP32, com o estado real da implementação."
        right={<StatusPill tone="info" dot={false}>protocolo v1.0</StatusPill>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Identificadores GATT" subtitle="serviço e características" className="lg:col-span-2">
          <div className="space-y-1.5 font-mono text-[10px]">
            {[
              ['Serviço', SERVICE_UUID],
              ['Telemetria (notify)', TELEMETRY_CHAR_UUID],
              ['Energia (notify)', ENERGY_CHAR_UUID],
              ['Comando (write)', COMMAND_CHAR_UUID],
              ['Nome anunciado', 'StepVolt-Shoe-…'],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            O aplicativo valida magic, tamanho e CRC antes de aceitar qualquer quadro. Sequências repetidas são descartadas e o watchdog marca o enlace como “sinal perdido” após 8 s sem pacotes.
          </p>
        </Panel>

        <Panel title="Estrutura do quadro" subtitle="todos os campos little-endian">
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[9px]">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="pb-1 text-left">off</th>
                  <th className="pb-1 text-left">size</th>
                  <th className="pb-1 text-left">valor</th>
                  <th className="pb-1 text-left">campo</th>
                </tr>
              </thead>
              <tbody>
                {FRAME_ROWS.map((r) => (
                  <tr key={r[0]} className="border-t border-border/50">
                    <td className="py-1 text-primary">{r[0]}</td>
                    <td className="py-1 text-muted-foreground">{r[1]}</td>
                    <td className="py-1 text-foreground/80">{r[2]}</td>
                    <td className="py-1 text-muted-foreground">{r[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="Mensagens" subtitle="tipo, payload e direção">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[9.5px]">
            <thead>
              <tr className="text-muted-foreground">
                <th className="pb-2">tipo</th>
                <th className="pb-2">nome</th>
                <th className="pb-2">payload</th>
                <th className="pb-2">direção</th>
              </tr>
            </thead>
            <tbody>
              {MESSAGES.map((m) => (
                <tr key={m[0]} className="border-t border-border/50">
                  <td className="py-1.5 pr-3 text-primary">0x{Number(m[0]).toString(16).padStart(2, '0')}</td>
                  <td className="py-1.5 pr-3 text-foreground">{m[1]}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{m[2]}</td>
                  <td className="py-1.5 text-muted-foreground">{m[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {FLAGS.map((f) => (
            <div key={f[0]} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1">
              <span className="font-mono text-[8.5px] text-primary">{f[0]}</span>
              <span className="font-mono text-[9px] text-foreground">{f[1]}</span>
              <span className="truncate text-[9.5px] text-muted-foreground">{f[2]}</span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Firmware de referência" subtitle="ESP32 + NimBLE · envie estes quadros" right={<Cpu className="h-3.5 w-3.5 text-muted-foreground" />}>
          <pre className="max-h-[420px] overflow-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-[9.5px] leading-relaxed text-foreground/85">
            {FIRMWARE}
          </pre>
        </Panel>

        <div className="space-y-4">
          <Panel title="Configuração do ESP32" subtitle="passo a passo" right={<Terminal className="h-3.5 w-3.5 text-muted-foreground" />}>
            <ol className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {[
                'Instale o Arduino IDE e o pacote de placas ESP32 (Board Manager).',
                'Adicione a biblioteca NimBLE-Arduino em Library Manager.',
                'Configure o nome anunciado como StepVolt-Shoe-01 (ou o seu identificador).',
                'Crie o serviço e as três características com UUIDs desta página.',
                'Publique TELEMETRY a 1 Hz, ENERGY junto da leitura do piezo e PRESSURE ao fim de cada passada.',
                'Envie DEVICE_INFO ao conectar, informando versão de firmware e bits de sensores.',
                'Implemente os comandos de escrita (start/stop/calibrar/teste/taxa) e responda com ERROR quando inválidos.',
                'Sirva o app em HTTPS: Web Bluetooth só funciona em contexto seguro.',
              ].map((step, i) => (
                <li key={step} className="flex gap-2">
                  <span className="font-mono text-[9px] text-primary">{String(i + 1).padStart(2, '0')}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Contrato com o backend" subtitle="entidades Base44 usadas como fonte remota">
            <div className="grid gap-1.5 sm:grid-cols-2">
              {[
                ['StepVoltProfile', 'preferências, metas, consentimentos'],
                ['Activity', 'sessões com amostras e rota'],
                ['Measurement', 'BPM, SpO₂, temperatura'],
                ['EnergyLog', 'potência, energia, tensão'],
                ['ShoeDevice / DeviceEvent', 'pareamentos e eventos do enlace'],
                ['Goal / Achievement', 'progressão'],
                ['Post / Comment / Challenge', 'comunidade'],
                ['EmergencyContact / SafetyEvent', 'segurança'],
              ].map(([name, use]) => (
                <div key={name} className="rounded-md border border-border/60 px-2 py-1.5">
                  <p className="font-mono text-[9.5px] text-foreground">{name}</p>
                  <p className="text-[9.5px] text-muted-foreground">{use}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 font-mono text-[9px] leading-relaxed text-muted-foreground">
              Assistente: POST na função stepvoltIntelligence com {'{ question, context }'} — contexto agregado, sem identificadores.
            </p>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Implementado" subtitle="verificado nesta versão">
          <ul className="space-y-1.5">
            {STATUS.done.map((s) => (
              <li key={s} className="flex gap-1.5 text-[10.5px] leading-snug text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-success" /> {s}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Parcial" subtitle="depende de hardware ou provedor">
          <ul className="space-y-1.5">
            {STATUS.partial.map((s) => (
              <li key={s} className="flex gap-1.5 text-[10.5px] leading-snug text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-energy" /> {s}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Limitações conhecidas" subtitle="declaradas, não escondidas">
          <ul className="space-y-1.5">
            {STATUS.limits.map((s) => (
              <li key={s} className="flex gap-1.5 text-[10.5px] leading-snug text-muted-foreground">
                <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-destructive/80" /> {s}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Próximos passos técnicos" subtitle="ordem sugerida de evolução">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Radio, title: 'Fila offline', text: 'Persistência local com retentativa e resolução de conflitos por carimbo de tempo.' },
            { icon: FileCode2, title: 'Assinatura de pacotes', text: 'Adicionar nonce e HMAC ao protocolo para impedir injeção de telemetria.' },
            { icon: Cpu, title: 'Calibração assistida', text: 'Rotina guiada de 20 passos para calibrar FSRs por operador.' },
            { icon: ShieldAlert, title: 'Canal de emergência', text: 'Integrar provedor de SMS com confirmação real de entrega.' },
          ].map((i) => (
            <div key={i.title} className="sv-panel-tight p-3">
              <i.icon className="h-4 w-4 text-primary" />
              <p className="mt-1.5 text-[11.5px] font-medium text-foreground">{i.title}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{i.text}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}