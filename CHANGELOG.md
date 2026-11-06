# Changelog

## Unreleased

- **Ferramentas de desenvolvimento.** A devDependency `n8n-workflow` sobe de 2.16.0 para 2.46.5, a versão estável que o n8n 2.46.6 usa. O `peerDependencies` continua `*`, e nada muda no pacote publicado.

## 2.5.0

- **Correção de rota (API v1).** *Update* e *Remove* em lote de Deal Product agora chamam `PATCH /deals/{id}/deal_products/batch/update` e `DELETE /deals/{id}/deal_products/batch/destroy` com `{ deal_products: [{ id }] }`, como na documentação oficial da RD. Antes o node chamava `PUT` e `DELETE .../batch`. O *Update* em lote envia só `id`, `amount` e `price` por linha. Nomes e tipos de parâmetro não mudam (AD-007).
- **Três operações novas em Deal Product (API v1).** *Add One* (`POST /deals/{id}/deal_products`), *Update One* (`PUT .../deal_products/{id}`) e *Remove One* (`DELETE .../deal_products/{id}`). Toda chamada leva timeout de 30 s.
- **Campos novos na API v1.** Contato: `legal_bases` (Create e Update). Negociação: `distribution_settings.owner` (Create).
- **Campos novos na API v2.** Contato: `social_profiles` e `legal_bases`. Campo personalizado: `application_scope`, `product_ids`, `calculation_action`, `editable_on_deal`, `display_rules` e `required_rules`. Negociação: `distribution_settings`. Empresa: `address` e `follower_ids`. Todos opcionais; sem preencher, o corpo é o da 2.4.0.
- **Fora desta versão.** `GET /token/check` como operação: a credencial já valida o token nessa rota.

## 2.4.0

- **Campos de ID em lista pesquisável (node version 2).** Em node novo, os campos de ID de contato, negócio, empresa, tarefa, funil, etapa, produto, origem, campanha, motivo de perda, campo personalizado, time, usuário e webhook mostram a lista da conta, com busca, e aceitam colar o ID. Contatos e negócios enviam o texto da busca à RD.
- **Workflows salvos não mudam.** O node passa a ter `version: [1, 2]` com `defaultVersion` 2. Workflows salvos guardam a version 1 e continuam com os campos em texto, enviando a mesma requisição da 2.3.2.
- **Migração para o `@n8n/node-cli` 0.55.5.** Build e lint passam a usar `n8n-node build` e `n8n-node lint`. O `gulp` saiu, e os ícones são copiados pelo próprio build.
- **Correção do lint.** Foram corrigidos os 121 erros do lint oficial: descrições com ponto final, texto padrão das listas dinâmicas, `any` explícito trocado por tipos reais e a categoria do arquivo `.node.json`.
- **Trigger registra o erro.** Ao remover um webhook que falha, o trigger registra o aviso no log e segue removendo os outros, em vez de engolir o erro.
- **Timeout de 30 s** em toda requisição à RD.
- **Testes e CI.** O pacote ganha testes automatizados (`npm test`) e um workflow de CI que roda lint, testes e build em todo Pull Request.
