# 📘 Central de Comunicação Hospitalar

### WebApp (Google Apps Script + Google Sheets + HTML/CSS/JS)

## 1. Visão geral do sistema

A **Central de Comunicação Hospitalar** é um **WebApp institucional** criado para organizar, registrar e rastrear solicitações e comunicações operacionais do hospital, com foco especial no **Protocolo de Sepse**, que funciona como um **mini-sistema crítico** dentro da aplicação.

O sistema foi projetado para:

* funcionar em **plantão real** (celular na mão, pessoas cansadas),
* reduzir erro humano,
* transformar **ligações telefônicas em dados rastreáveis**,
* permitir **auditoria posterior**,
* e separar claramente **quem solicita** de **quem administra**.

Não é um ERP.
Não é apenas um formulário.
É uma **central operacional**.

---

## 2. Princípios de funcionamento

### 2.1 Identificação por ramal

* O sistema **não usa login com senha**.
* O acesso é feito por **ramal**.
* Cada ramal está associado a um **setor** e uma **função**.
* Isso reflete a realidade hospitalar (telefone/ramal já é identidade).

### 2.2 Papéis (roles)

O sistema distingue **identidade** de **permissão**.

* Todo mundo entra como **usuário**.
* Apenas ramais cadastrados como **Plantão Administrativo** têm poderes administrativos.

Isso é controlado exclusivamente por planilhas, não por código fixo.

---

## 3. Tipos de usuários

### Usuário comum

* Abre solicitações.
* Abre Protocolo Sepse.
* Vê apenas:

  * o que ele mesmo abriu,
  * status simplificado,
  * andamento básico.

### Plantão Administrativo (ADM)

* Vê **todas** as solicitações.
* Administra o Protocolo Sepse.
* Registra ligações.
* Confirma eventos (ex: 6 horas).
* Cancela ou conclui protocolos.
* Acessa o **Painel do Plantão**.

---

## 4. Módulos do sistema

### 4.1 Solicitações gerais

Módulos simples, com fluxo direto:

* Declaração de Óbito
* Interconsulta
* Exames

Esses módulos compartilham:

* identificação do solicitante,
* data/hora automáticas,
* status,
* prioridade,
* observações.

---

### 4.2 Protocolo Sepse (módulo crítico)

O **Protocolo Sepse** não é um formulário grande.
Ele é um **diário operacional baseado em eventos**.

Tudo que acontece vira um **evento na timeline**, por exemplo:

* abertura do protocolo,
* ligação para setor X,
* ligação sem contato,
* confirmação após 6h,
* solicitação de cancelamento,
* cancelamento confirmado,
* conclusão.

#### Características principais:

* Timeline vertical em linguagem humana.
* Múltiplas ligações para o mesmo setor são permitidas.
* Datas e horas são automáticas.
* Status é controlado manualmente pelo Plantão.
* Histórico nunca é apagado.

---

## 5. Arquitetura técnica

### Backend

* Google Apps Script (`Code.gs`)
* Responsável por:

  * regras de negócio,
  * gravação em planilhas,
  * controle de permissões,
  * criação de eventos,
  * auditoria.

### Frontend

* Arquivo único `index.html`
* Contém:

  * HTML
  * CSS (Apple-style + glassmorphism)
  * JavaScript puro
* Interface adaptada automaticamente ao papel do usuário.

### Banco de dados

* Google Sheets
* Cada aba tem **responsabilidade única**.
* Nunca editar dados manualmente em produção.

---

# 📊 Estrutura das abas da planilha

## 1. `CONFIG_RAMAL`

Cadastro de todos os ramais que podem usar o sistema.

**Função:**
Identificar quem é o usuário.

**Colunas:**

* `ramal` – identificador único
* `setor` – setor de origem
* `funcao` – função (ex: enfermagem, administrativo)
* `ativo` – TRUE/FALSE
* `observacoes`

---

## 2. `USUARIOS_PLANTAO`

Define quem tem **poder administrativo**.

**Função:**
Determinar quem é ADM (Plantão).

**Colunas:**

* `ramal`
* `nome`
* `ativo`

> Se o ramal estiver aqui e ativo → é Plantão Administrativo.

---

## 3. `CONFIG_SETORES_SEPSE`

Lista os setores que podem ser acionados no Protocolo Sepse.

**Função:**
Permitir configuração sem mexer no código.

**Colunas:**

* `id_setor`
* `nome_setor` (LAB, NAC, UTI, etc.)
* `tipo` (clínico, apoio, administrativo)
* `ativo`
* `exige_contato`

---

## 4. `CONFIG_STATUS`

Status possíveis para solicitações e sepse.

**Função:**
Padronização e controle visual.

**Colunas:**

* `tipo_modulo` (GERAL / SEPSE)
* `status`
* `ordem`
* `cor`
* `final` (TRUE/FALSE)

---

## 5. `CONFIG_ALERTAS`

Define eventos que devem gerar alerta.

**Função:**
Cobrança de prazos (ex: 6h).

**Colunas:**

* `tipo_evento`
* `tempo_limite_min`
* `nivel`
* `ativo`

---

## 6. `SOLICITACOES_GERAIS`

Registro principal de solicitações comuns.

**Função:**
Painel e rastreabilidade básica.

**Colunas:**

* `id`
* `tipo`
* `nome_solicitante`
* `setor`
* `ramal`
* `data_hora_abertura`
* `status_atual`
* `prioridade`
* `observacao_atual`

---

## 7. `OBITO`

Detalhes específicos de declaração de óbito.

**Colunas:**

* `id_solicitacao`
* `leito`
* `clinica`
* `data_obito`
* `prontuario`
* `nome_paciente`

---

## 8. `INTERCONSULTA`

**Colunas:**

* `id_solicitacao`
* `prontuario`
* `clinica`
* `nome_paciente`
* `especialidade`

---

## 9. `EXAMES`

**Colunas:**

* `id_solicitacao`
* `prontuario`
* `nome_paciente`
* `exame`
* `data_solicitacao`
* `solicitante`

---

## 🔴 10. `SEPSE_PROTOCOLOS`

Tabela principal do Protocolo Sepse.

**Função:**
Guardar o **estado atual**.

**Colunas:**

* `id_protocolo`
* `paciente`
* `prontuario`
* `leito`
* `unidade`
* `medico_responsavel`
* `status_atual`
* `prioridade`
* `data_hora_abertura`
* `data_hora_encerramento`
* `observacao_atual`

---

## 🔴 11. `SEPSE_EVENTOS`

Timeline completa do sepse.

**Função:**
Registro imutável de tudo que aconteceu.

**Colunas:**

* `id_evento`
* `id_protocolo`
* `tipo_evento`
* `setor`
* `ramal`
* `data_hora`
* `descricao_humana`

---

## 🔴 12. `SEPSE_HISTORICO_EDICOES`

Auditoria de edições.

**Função:**
Saber quem mudou o quê e quando.

**Colunas:**

* `id`
* `id_protocolo`
* `campo_editado`
* `valor_anterior`
* `valor_novo`
* `ramal`
* `data_hora`

---

## 13. `NOTIFICACOES_LOG`

Log de notificações enviadas.

**Função:**
Provar que o sistema avisou.

**Colunas:**

* `id`
* `tipo`
* `destinatario`
* `id_referencia`
* `data_hora`
* `status_envio`

---

## 14. `LOG_SISTEMA` (opcional)

Erros e eventos técnicos.

**Função:**
Manutenção e debug.

---

# ⚠️ Regras importantes

* ❌ Nunca editar dados manualmente em produção.
* ❌ Nunca rodar o script de setup novamente após o sistema estar em uso.
* ✅ Toda ação deve passar pelo WebApp.
* ✅ Histórico nunca deve ser apagado.

---

## Conclusão

Este sistema foi pensado para **hospital real**, não para demonstração.
Ele privilegia:

* simplicidade para quem solicita,
* poder para quem administra,
* rastreabilidade para auditoria,
* e clareza em situações críticas.

Qualquer evolução futura (indicadores, BI, relatórios, integração) já está prevista pela arquitetura.
