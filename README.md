# Bolsa SaaS Pro

## O que vem pronto
- Dashboard público com cotação, gráfico e notícias
- Login com Supabase no frontend
- Assinatura com Stripe Checkout
- Favoritos, comparação de ativos e tema claro/escuro
- Ações dos EUA e Brasil (`PETR4` vira `PETR4.SA`)

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

Abra:
```text
http://localhost:3000
```

## O que configurar

### 1. Finnhub
Preencha `FINNHUB_API_KEY` no `.env`.

### 2. Stripe
Preencha:
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`

### 3. Supabase
Preencha:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Próximos passos para produção
- salvar favoritos e carteira no banco
- validar assinatura no backend
- criar webhook do Stripe
- proteger rotas premium no servidor
- deploy no Render ou Railway
- conectar domínio próprio
