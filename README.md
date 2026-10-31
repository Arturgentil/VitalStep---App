# VitalStep: Biometric Platform

Plataforma biométrica premium para tênis inteligente com ESP32: saúde, biomecânica, atividade física e energia gerada pelo movimento. Construída em React + Vite + Tailwind, com autenticação e dados no Supabase e assistente de IA no Base44.

## Executar

```bash
npm install
npm run dev     # frontend local com Supabase hospedado
npm run build   # bundle de produção em dist/
```

O aplicativo usa cadastro e login pelo Supabase. Cada usuário acessa os registros associados à sua conta.

## Configuração e publicação no Cloudflare

Defina `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BASE44_APP_ID` e `VITE_CARTO_API_KEY` no `.env` local ou nas variáveis de build. Use somente a chave pública do Supabase no frontend. Arquivos `.env` são ignorados pelo Git.

O mapa usa o estilo escuro da CARTO com dados do OpenStreetMap. Configure a chave de Basemaps da CARTO em `VITE_CARTO_API_KEY` antes do build. Essa chave é enviada pelo navegador para carregar os mapas e fica incluída no bundle público; mantenha seu valor fora dos arquivos versionados.

O site usa Cloudflare Pages, com saída em `dist/` e configuração em `wrangler.jsonc`. As Pages Functions encaminham as chamadas de IA e analytics ao Base44. Somente `/api/*` passa por Functions; as telas e os arquivos estáticos são servidos diretamente pelo Pages.

Antes do deploy:

- Aplique as migrations do Supabase, incluindo `20261031000000_rename_vitalstep_profiles.sql` em instalações existentes.
- Publique a função `vitalstepIntelligence` no app Base44 configurado.
- No Supabase Auth, configure o Site URL como `https://vitalstepapp.com.br` e permita os redirects `https://vitalstepapp.com.br/login` e `https://vitalstepapp.com.br/reset-password`. Para testar pelo endereço temporário, permita também `https://vitalstep.pages.dev/login` e `https://vitalstep.pages.dev/reset-password`. Para o aplicativo Android, permita também `vitalstep://auth/callback?next=%2Flogin` e `vitalstep://auth/callback?next=%2Freset-password`, incluindo o parâmetro `next` enviado pelo app.
- Use `https://vitalstepapp.com.br` como Site URL de produção. Mantenha `https://vitalstep.pages.dev` nos redirects permitidos para os testes no endereço temporário.
- Confirme acesso de edição a Workers & Pages na conta Cloudflare do domínio e ao DNS. A conta de publicação é `6503ed69bce9a3f954a4e684236d6be0`.

```bash
npm run build
npx wrangler pages dev dist
```

Depois da validação local, crie o projeto Pages uma vez e publique os arquivos:

```bash
CLOUDFLARE_ACCOUNT_ID=6503ed69bce9a3f954a4e684236d6be0 npx wrangler pages project create vitalstep --production-branch main
CLOUDFLARE_ACCOUNT_ID=6503ed69bce9a3f954a4e684236d6be0 npx wrangler pages deploy dist --project-name vitalstep --branch main --commit-dirty=true
```

Em Custom domains do projeto Pages, associe `vitalstepapp.com.br` e verifique o DNS e o certificado HTTPS. O domínio precisa estar na mesma conta Cloudflare do projeto Pages. O deploy por upload direto publica os arquivos locais e não depende de um push para o GitHub.

## Módulos

| Rota | Módulo | Função |
| --- | --- | --- |
| `/onboarding` | Primeiro acesso | conceito, consentimentos, perfil, metas, descoberta BLE e relatório inicial |
| `/` | Command Center | núcleo VitalStep, métricas com unidade/qualidade/horário, gráficos e alertas |
| `/atividade` | Performance Engine | sessão ao vivo, pausa, GPS opcional, histórico |
| `/atividade/:id` | Resumo | comparação, trecho a trecho, rota, exportações GPX/CSV/PDF |
| `/saude` | Biometric Intelligence | séries temporais, médias, lacunas, limites, observações e relatórios |
| `/energia` | Energy Lab | Energy Reactor, potência × consumo, eficiência e autonomia estimada |
| `/biomecanica` | Biomechanics Lab | Footprint Intelligence, assimetria, evolução e relatório de marcha |
| `/dispositivo` | Smart Shoe | descoberta BLE, comandos, diagnóstico, telemetria e eventos |
| `/inteligencia` | VitalStep Intelligence | assistente com autorização, fontes declaradas e limite diário |
| `/metas` | Progressão | metas, consistência, conquistas e desafios |
| `/comunidade` | Community | feed, curtidas, comentários, busca, bloqueio e denúncia |
| `/seguranca` | Safety | SOS cancelável, detecção de quedas, contatos e registro de eventos |
| `/protocolo` | Docs | especificação BLE v1.0, firmware de referência, estado real e limitações |
| `/perfil` | Conta | privacidade, consentimentos, tema, backup, importação e exclusão |

## Camadas

- `src/lib/ble/protocol.js` — quadro versionado, CRC-8, parser incremental e decodificação tipada.
- `src/lib/ble/VitalStepBLE.js`: transporte independente da UI: descoberta, reconexão progressiva, watchdog, deduplicação por sequência.
- `src/lib/store.jsx` — estado global (perfil, modo demonstração, enlace, telemetria viva).
- `src/lib/demo/demoData.js` — conjunto sintético isolado; nunca é gravado no banco.
- `src/lib/metrics.js` — agregações puras (séries diárias, tendência, lacunas, assimetria).
- `src/lib/exports.js` — CSV, GPX, JSON e PDF.
- `supabase/migrations/*`: estrutura, permissões e políticas do banco de dados.
- `base44/entities/*`: definições de entidades exportadas do Base44.
- `base44/functions/vitalstepIntelligence/entry.ts`: assistente com contexto agregado e limitado.

## Protocolo BLE (resumo)

Serviço `7a1c0001-…`, telemetria `…0002`, energia `…0003`, comando `…0004`. Quadro: `53 56 versão tipo seq tamanho payload CRC-8`. Tipos `0x01` TELEMETRY, `0x02` ENERGY, `0x03` PRESSURE, `0x04` DEVICE_INFO, `0x05` ERROR, `0x10–0x14` comandos. Especificação completa, tabela de campos e firmware de referência em `/protocolo`.

## Ícones e identidade visual

`assets/logo.png` é a matriz transparente da logo compacta. Os ícones e as telas de abertura usam o fundo `#06080E`.

Para regenerar os recursos de Android, iOS e web:

```bash
npm run assets:generate
```

Depois de alterar os ícones web, atualize o bundle copiado para os projetos nativos:

```bash
npm run build
npx cap copy
```

O script usa `@capacitor/assets` para os recursos nativos e gera favicon, Apple touch icon e ícones PWA a partir da mesma matriz. Também exporta o símbolo transparente e a imagem de compartilhamento em `public/brand/`. A versão PWA com máscara inclui margem adicional para recortes circulares.

## Limitações declaradas

- Web Bluetooth requer Chrome/Edge em HTTPS (indisponível no iOS Safari).
- Detecção de quedas depende do firmware; o app registra eventos e estados, não classifica por conta própria.
- Sem provedor de SMS integrado, alertas ficam em “tentativa de envio” e oferecem ligação direta ao contato.
- Distância sem GPS é estimada por passos × comprimento de passada.
- Nenhuma leitura é diagnóstica; autonomia energética não foi comprovada experimentalmente.
