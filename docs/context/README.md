# Context for AI Agents

Bu papka **AI kodlash agentlari** (Claude Code, Codex, Cursor, Aider va boshqalar) uchun loyiha konteksti.

## Fayllar

| Fayl | Tavsif |
|---|---|
| [`user_profile.md`](./user_profile.md) | Foydalanuvchi kim, muloqot uslubi, scope bo'yicha pozitsiyasi |
| [`project_overview.md`](./project_overview.md) | Loyiha nima, scope, tech stack, deployment holati |
| [`business_rules.md`](./business_rules.md) | Barcha non-code product qoidalari (test modalari, auth, subscription, ...) |

## O'qish tartibi

1. **`../../../AGENTS.md`** — loyiha ildizida, agent ish qoidalari
2. **`project_overview.md`** — loyiha haqida umumiy tushuncha
3. **`business_rules.md`** — critical biznes qoidalar (buzilmas)
4. **`user_profile.md`** — foydalanuvchi bilan qanday muloqot qilish
5. **`../../../PLAN.md`** — to'liq PRD (1900+ qator)

## Boshqa agent tizimlari uchun

### Codex / OpenAI CLI
Bu fayllarni context sifatida attach qiling yoki system promptga qo'shing.

### Cursor
`.cursorrules` yoki `.cursor/rules/` ga import qiling.

### Aider
`--read` flag bilan kiritib ishlating.

### Claude Code
Avtomatik `AGENTS.md` va `PLAN.md` ni o'qiydi. Memory system alohida bor.

## Yangilash

Loyiha biznes qoidalari o'zgarsa:
1. `business_rules.md` ni yangilang
2. `PLAN.md` dagi tegishli bo'limni ham yangilang
3. `AGENTS.md` dagi summary ni ham sinxronlang
