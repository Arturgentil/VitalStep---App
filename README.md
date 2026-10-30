# StepVolt — Biometric Platform

Plataforma biométrica premium para tênis inteligente com ESP32: saúde, biomecânica, atividade física e energia gerada pelo movimento. Construída em React + Vite + Tailwind, com backend Base44 (entidades, funções e IA).

## Executar

```bash
npm install
npm run dev     # ambiente local
npm run build   # bundle de produção em dist/
```

O aplicativo é público: cada navegador gera um identificador de operador e todos os registros são vinculados a ele. Não é necessário login.

## Módulos

| Rota | Módulo | Função |
| --- | --- | --- |
| `/onboarding` | Primeiro acesso | conceito, consentimentos, perfil, metas, descoberta BLE e relatório inicial |
| `/` | Command Center | núcleo StepVolt, métricas com unidade/qualidade/horário, gráficos e alertas |
| `/atividade` | Performance Engine | sessão ao vivo, pausa, GPS opcional, histórico |
| `/atividade/:id` | Resumo | comparação, trecho a trecho, rota, exportações GPX/CSV/PDF |
| `/saude` | Biometric Intelligence | séries temporais, médias, lacunas, limites, observações e relatórios |
| `/energia` | Energy Lab | Energy Reactor, potência × consumo, eficiência e autonomia estimada |
| `/biomecanica` | Biomechanics Lab | Footprint Intelligence, assimetria, evolução e relatório de marcha |
| `/dispositivo` | Smart Shoe | descoberta BLE, comandos, diagnóstico, telemetria e eventos |
| `/inteligencia` | StepVolt Intelligence | assistente com autorização, fontes declaradas e limite diário |
| `/metas` | Progressão | metas, consistência, conquistas e desafios |
| `/comunidade` | Community | feed, curtidas, comentários, busca, bloqueio e denúncia |
| `/seguranca` | Safety | SOS cancelável, detecção de quedas, contatos e registro de eventos |
| `/protocolo` | Docs | especificação BLE v1.0, firmware de referência, estado real e limitações |
| `/perfil` | Conta | privacidade, consentimentos, tema, backup, importação e exclusão |

## Camadas

- `src/lib/ble/protocol.js` — quadro versionado, CRC-8, parser incremental e decodificação tipada.
- `src/lib/ble/StepVoltBLE.js` — transporte independente da UI: descoberta, reconexão progressiva, watchdog, deduplicação por sequência.
- `src/lib/store.jsx` — estado global (perfil, modo demonstração, enlace, telemetria viva).
- `src/lib/demo/demoData.js` — conjunto sintético isolado; nunca é gravado no banco.
- `src/lib/metrics.js` — agregações puras (séries diárias, tendência, lacunas, assimetria).
- `src/lib/exports.js` — CSV, GPX, JSON e PDF.
- `base44/entities/*` — persistência remota por operador.
- `base44/functions/stepvoltIntelligence/entry.ts` — assistente com contexto agregado e limitado.

## Protocolo BLE (resumo)

Serviço `7a1c0001-…`, telemetria `…0002`, energia `…0003`, comando `…0004`. Quadro: `53 56 versão tipo seq tamanho payload CRC-8`. Tipos `0x01` TELEMETRY, `0x02` ENERGY, `0x03` PRESSURE, `0x04` DEVICE_INFO, `0x05` ERROR, `0x10–0x14` comandos. Especificação completa, tabela de campos e firmware de referência em `/protocolo`.

## Limitações declaradas

- Web Bluetooth requer Chrome/Edge em HTTPS (indisponível no iOS Safari).
- Detecção de quedas depende do firmware; o app registra eventos e estados, não classifica por conta própria.
- Sem provedor de SMS integrado, alertas ficam em “tentativa de envio” e oferecem ligação direta ao contato.
- Distância sem GPS é estimada por passos × comprimento de passada.
- Nenhuma leitura é diagnóstica; autonomia energética não foi comprovada experimentalmente.