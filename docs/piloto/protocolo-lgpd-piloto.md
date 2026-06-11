# Protocolo LGPD — piloto

> Referência: `docs/plano-piloto.md` §2.3. Fluxo B2B2C: cliente final do escritório envia extrato bancário.

## Papéis

| Papel | Quem | Responsabilidade |
|---|---|---|
| **Controlador** | Escritório contábil | Relação com cliente final; base legal; encaminhar opt-in |
| **Operador** | Extrato Pronto | Processar extratos conforme instruções do escritório; segurança técnica |

## Base legal (piloto)

A definir com assessoria jurídica antes do kick-off. Hipótese: execução de contrato entre escritório e cliente + legítimo interesse do escritório na prestação contábil, com opt-in explícito para canal digital.

## Opt-in cliente final

Escritório encaminha mensagem padrão (adaptar conforme necessário):

---

*[Nome do escritório] utiliza a ferramenta Extrato Pronto para receber seus extratos bancários de forma segura.*

*Ao enviar extratos para [WhatsApp / e-mail], você autoriza o processamento desses documentos exclusivamente para fins contábeis do seu CNPJ.*

*Seus dados não são compartilhados com outros escritórios. Para revogar, responda PARAR ou solicite ao escritório.*

---

## Retenção

| Dado | Retenção piloto | Pós-piloto |
|---|---|---|
| Extratos e transações convertidas | Durante piloto + 90 dias | Delete on request |
| Eval set anonimizado | Indefinido (sem PII) | OK |
| Logs operacionais | 30 dias | Sem conteúdo de extrato |

## Anonimização (eval set)

Antes de incluir extrato no eval set:

1. Remover CNPJ, razão social, nomes de titulares
2. Remover/agregar números de conta (substituir por ID interno)
3. Manter layout, estrutura de transações e valores relativos
4. Revisão manual antes de adicionar ao set

## Segurança técnica

- [ ] RLS multi-tenant (escritório A ≠ escritório B)
- [ ] Criptografia em trânsito (TLS)
- [ ] Nunca persistir senha de PDF
- [ ] Nunca logar conteúdo de extrato em plain text
- [ ] Acesso ao painel autenticado por escritório

## Incidentes

Registrar em tabela interna: data, escopo, ação, notificação ao controlador (escritório).
