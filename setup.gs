function setupSistemaCompleto() {
  const ss = SpreadsheetApp.getActive();
  const abas = {};

  function criarAba(nome, colunas) {
    let sh = ss.getSheetByName(nome);
    if (!sh) {
      sh = ss.insertSheet(nome);
    } else {
      sh.clear();
    }
    sh.getRange(1, 1, 1, colunas.length).setValues([colunas]);
    sh.setFrozenRows(1);
    abas[nome] = sh;
  }

  /* =====================================================
     CONFIGURAÇÕES BÁSICAS
  ===================================================== */

  criarAba('CONFIG_RAMAL', [
    'ramal', 'setor', 'funcao', 'ativo', 'observacoes'
  ]);

  criarAba('USUARIOS_PLANTAO', [
    'ramal', 'nome', 'ativo'
  ]);

  criarAba('CONFIG_GERAL', [
    'chave', 'valor', 'descricao'
  ]);

  criarAba('CONFIG_SETORES_SEPSE', [
    'id_setor', 'nome_setor', 'tipo', 'ativo', 'exige_contato'
  ]);

  criarAba('CONFIG_STATUS', [
    'tipo_modulo', 'status', 'ordem', 'cor', 'final'
  ]);

  criarAba('CONFIG_ALERTAS', [
    'tipo_evento', 'tempo_limite_min', 'nivel', 'ativo'
  ]);

  /* =====================================================
     SOLICITAÇÕES GERAIS
  ===================================================== */

  criarAba('SOLICITACOES_GERAIS', [
    'id', 'tipo', 'nome_solicitante', 'setor', 'ramal',
    'data_hora_abertura', 'status_atual', 'prioridade', 'observacao_atual'
  ]);

  criarAba('OBITO', [
    'id_solicitacao', 'leito', 'clinica',
    'data_obito', 'prontuario', 'nome_paciente'
  ]);

  criarAba('INTERCONSULTA', [
    'id_solicitacao', 'prontuario', 'clinica',
    'nome_paciente', 'especialidade'
  ]);

  criarAba('EXAMES', [
    'id_solicitacao', 'prontuario', 'nome_paciente',
    'exame', 'data_solicitacao', 'solicitante'
  ]);

  /* =====================================================
     SEPSE
  ===================================================== */

  criarAba('SEPSE_PROTOCOLOS', [
    'id_protocolo', 'paciente', 'prontuario', 'leito', 'unidade',
    'medico_responsavel', 'status_atual', 'prioridade',
    'data_hora_abertura', 'data_hora_encerramento', 'observacao_atual'
  ]);

  criarAba('SEPSE_EVENTOS', [
    'id_evento', 'id_protocolo', 'tipo_evento',
    'setor', 'ramal', 'data_hora', 'descricao_humana'
  ]);

  criarAba('SEPSE_HISTORICO_EDICOES', [
    'id', 'id_protocolo', 'campo_editado',
    'valor_anterior', 'valor_novo', 'ramal', 'data_hora'
  ]);

  /* =====================================================
     NOTIFICAÇÕES / LOGS
  ===================================================== */

  criarAba('NOTIFICACOES_LOG', [
    'id', 'tipo', 'destinatario', 'id_referencia',
    'data_hora', 'status_envio'
  ]);

  criarAba('LOG_SISTEMA', [
    'data_hora', 'nivel', 'origem', 'mensagem'
  ]);

  /* =====================================================
     DADOS INICIAIS (PRONTOS PRA USO)
  ===================================================== */

  abas.CONFIG_RAMAL.getRange(2,1,1,5).setValues([
    ['2077','Plantão Administrativo','Administrador',true,'Ramal ADM padrão (editável)']
  ]);

  abas.USUARIOS_PLANTAO.getRange(2,1,1,3).setValues([
    ['2077','Plantão ADM padrão',true]
  ]);

  abas.CONFIG_GERAL.getRange(2,1,1,3).setValues([
    ['DEFAULT_ADM_RAMAL','2077','Ramal padrão com poderes de Plantão (pode ser alterado)']
  ]);

  abas.CONFIG_STATUS.getRange(2,1,7,5).setValues([
    ['GERAL','ABERTO',1,'#1976d2',false],
    ['GERAL','EM ANDAMENTO',2,'#f9a825',false],
    ['GERAL','CONCLUIDO',3,'#2e7d32',true],
    ['GERAL','CANCELADO',4,'#c62828',true],
    ['SEPSE','ABERTO',1,'#c62828',false],
    ['SEPSE','CONCLUIDO',2,'#2e7d32',true],
    ['SEPSE','CANCELADO',3,'#424242',true]
  ]);

  abas.CONFIG_SETORES_SEPSE.getRange(2,1,5,5).setValues([
    ['NAC','NAC','administrativo',true,true],
    ['LAB','Laboratório','apoio',true,true],
    ['FARM','Farmácia','apoio',true,true],
    ['RX','Radiologia','apoio',true,true],
    ['UTI','UTI','clinico',true,true]
  ]);

  abas.CONFIG_ALERTAS.getRange(2,1,5,4).setValues([
    ['CONFIRMACAO_6H',360,'critico',true],
    ['LIGACAO',30,'alerta',true],
    ['ABERTURA',0,'info',true],
    ['CANCELAMENTO',0,'critico',true],
    ['ENCERRAMENTO',0,'info',true]
  ]);

  SpreadsheetApp.getUi().alert(
    'Sistema inicializado com sucesso.\n\n' +
    'Todas as abas foram criadas e configuradas.'
  );
}
