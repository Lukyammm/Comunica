/* =========================
   Helpers
========================= */
function _sh(name){ return SpreadsheetApp.getActive().getSheetByName(name); }
function _vals(name){ return _sh(name).getDataRange().getValues(); }
function _uuid(){ return Utilities.getUuid(); }
function _now(){ return new Date(); }
function _startOfDay(date){
  const d = new Date(date || _now());
  d.setHours(0,0,0,0);
  return d;
}
function _fmt(date){
  if (!date) return '';
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}
function _isTrue(value){
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  return ['true','1','sim','yes','ativo'].includes(normalized);
}
function _configValue(key, defaultValue){
  const sh = SpreadsheetApp.getActive().getSheetByName('CONFIG_GERAL');
  if (!sh) return defaultValue;
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++){
    if (String(data[i][0]).trim().toUpperCase() === String(key).trim().toUpperCase()){
      return data[i][1] !== '' && data[i][1] !== null ? data[i][1] : defaultValue;
    }
  }
  return defaultValue;
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Central de Comunicação Hospitalar')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function validarRamal(ramal) {
  const data = _vals('CONFIG_RAMAL');
  for (let i=1;i<data.length;i++){
    if (String(data[i][0]) === String(ramal) && _isTrue(data[i][3])){
      return { ramal: String(data[i][0]), setor: data[i][1]||'', funcao: data[i][2]||'' };
    }
  }
  return null;
}

function ehPlantao(ramal){
  const admDefault = _configValue('DEFAULT_ADM_RAMAL', '2077');
  if (String(ramal) === String(admDefault)) return true;

  const data = _vals('USUARIOS_PLANTAO');
  for (let i=1;i<data.length;i++){
    if (String(data[i][0]) === String(ramal) && _isTrue(data[i][2])) return true;
  }
  return false;
}

/* =========================
   ADMIN
========================= */
function obterMonitorAdmin(){
  const now = _now();
  const todayStart = _startOfDay(now).getTime();
  const seisHorasMs = 6 * 60 * 60 * 1000;

  const protocolos = _vals('SEPSE_PROTOCOLOS');
  const eventos = _vals('SEPSE_EVENTOS');

  let sepseAbertos = 0;
  let pendentes6h = 0;
  const confirmados6h = new Set();

  for (let i=1;i<eventos.length;i++){
    if (eventos[i][2] === 'CONFIRMACAO_6H'){
      confirmados6h.add(eventos[i][1]);
    }
  }

  for (let i=1;i<protocolos.length;i++){
    const status = protocolos[i][6];
    if (status === 'ABERTO'){
      sepseAbertos++;
      const abertura = new Date(protocolos[i][8]).getTime();
      if (abertura && (now.getTime() - abertura >= seisHorasMs) && !confirmados6h.has(protocolos[i][0])){
        pendentes6h++;
      }
    }
  }

  let ligacoesHoje = 0;
  const setoresComContato = new Set();
  for (let i=1;i<eventos.length;i++){
    const tipo = eventos[i][2];
    const data = new Date(eventos[i][5]).getTime();
    if (tipo === 'LIGACAO' && data >= todayStart){
      ligacoesHoje++;
      if (eventos[i][3]) setoresComContato.add(String(eventos[i][3]));
    }
  }

  const setores = _vals('CONFIG_SETORES_SEPSE');
  let setoresSemContato = 0;
  for (let i=1;i<setores.length;i++){
    const ativo = _isTrue(setores[i][3]);
    const exigeContato = _isTrue(setores[i][4]);
    if (ativo && exigeContato){
      const nome = String(setores[i][1]);
      if (!setoresComContato.has(nome)) setoresSemContato++;
    }
  }

  const ramais = _vals('CONFIG_RAMAL');
  let ramaisAtivos = 0;
  let ramaisInativos = 0;
  for (let i=1;i<ramais.length;i++){
    if (_isTrue(ramais[i][3])) ramaisAtivos++;
    else ramaisInativos++;
  }

  return {
    sepseAbertos,
    pendentes6h,
    ligacoesHoje,
    setoresSemContato,
    ramaisAtivos,
    ramaisInativos,
    atualizadoEm: _fmt(now),
    resumo: 'Atualizado automaticamente'
  };
}

function listarRamaisAdmin(){
  const data = _vals('CONFIG_RAMAL');
  const out = [];
  for (let i=1;i<data.length;i++){
    out.push({
      ramal: data[i][0],
      setor: data[i][1],
      funcao: data[i][2],
      ativo: _isTrue(data[i][3]),
      observacoes: data[i][4] || ''
    });
  }
  return out;
}

function salvarRamalAdmin(payload){
  const sh = _sh('CONFIG_RAMAL');
  const data = sh.getDataRange().getValues();
  const ramal = String(payload.ramal || '').trim();
  if (!ramal) return false;
  for (let i=1;i<data.length;i++){
    if (String(data[i][0]) === ramal){
      sh.getRange(i+1,2).setValue(payload.setor || '');
      sh.getRange(i+1,3).setValue(payload.funcao || '');
      sh.getRange(i+1,4).setValue(payload.ativo ? true : false);
      sh.getRange(i+1,5).setValue(payload.observacoes || '');
      return true;
    }
  }
  sh.appendRow([ramal, payload.setor || '', payload.funcao || '', payload.ativo ? true : false, payload.observacoes || '']);
  return true;
}

function atualizarStatusRamalAdmin(ramal, ativo){
  const sh = _sh('CONFIG_RAMAL');
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++){
    if (String(data[i][0]) === String(ramal)){
      sh.getRange(i+1,4).setValue(_isTrue(ativo));
      return true;
    }
  }
  return false;
}

function listarPlantaoAdmin(){
  const data = _vals('USUARIOS_PLANTAO');
  const out = [];
  for (let i=1;i<data.length;i++){
    out.push({
      ramal: data[i][0],
      nome: data[i][1],
      ativo: _isTrue(data[i][2]),
      atualizadoEm: ''
    });
  }
  return out;
}

function salvarPlantaoAdmin(payload){
  const sh = _sh('USUARIOS_PLANTAO');
  const data = sh.getDataRange().getValues();
  const ramal = String(payload.ramal || '').trim();
  if (!ramal) return false;
  for (let i=1;i<data.length;i++){
    if (String(data[i][0]) === ramal){
      sh.getRange(i+1,2).setValue(payload.nome || '');
      sh.getRange(i+1,3).setValue(payload.ativo ? true : false);
      return true;
    }
  }
  sh.appendRow([ramal, payload.nome || '', payload.ativo ? true : false]);
  return true;
}

function atualizarStatusPlantaoAdmin(ramal, ativo){
  const sh = _sh('USUARIOS_PLANTAO');
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++){
    if (String(data[i][0]) === String(ramal)){
      sh.getRange(i+1,3).setValue(_isTrue(ativo));
      return true;
    }
  }
  return false;
}

function listarSetoresAdmin(){
  const data = _vals('CONFIG_SETORES_SEPSE');
  const out = [];
  for (let i=1;i<data.length;i++){
    out.push({
      id: data[i][0],
      nome: data[i][1],
      tipo: data[i][2],
      ativo: _isTrue(data[i][3]),
      exigeContato: _isTrue(data[i][4])
    });
  }
  return out;
}

function salvarSetorAdmin(payload){
  const sh = _sh('CONFIG_SETORES_SEPSE');
  const data = sh.getDataRange().getValues();
  const id = String(payload.id || '').trim();
  if (!id) return false;
  for (let i=1;i<data.length;i++){
    if (String(data[i][0]) === id){
      sh.getRange(i+1,2).setValue(payload.nome || '');
      sh.getRange(i+1,3).setValue(payload.tipo || '');
      sh.getRange(i+1,4).setValue(payload.ativo ? true : false);
      sh.getRange(i+1,5).setValue(payload.exigeContato ? true : false);
      return true;
    }
  }
  sh.appendRow([id, payload.nome || '', payload.tipo || '', payload.ativo ? true : false, payload.exigeContato ? true : false]);
  return true;
}

function atualizarStatusSetorAdmin(id, ativo){
  const sh = _sh('CONFIG_SETORES_SEPSE');
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++){
    if (String(data[i][0]) === String(id)){
      sh.getRange(i+1,4).setValue(_isTrue(ativo));
      return true;
    }
  }
  return false;
}

function listarConfigGeralAdmin(){
  const data = _vals('CONFIG_GERAL');
  const out = [];
  for (let i=1;i<data.length;i++){
    out.push({
      chave: data[i][0],
      valor: data[i][1],
      descricao: data[i][2]
    });
  }
  return out;
}

function salvarConfigGeralAdmin(payload){
  const sh = _sh('CONFIG_GERAL');
  const data = sh.getDataRange().getValues();
  const chave = String(payload.chave || '').trim();
  if (!chave) return false;
  for (let i=1;i<data.length;i++){
    if (String(data[i][0]).trim().toUpperCase() === chave.toUpperCase()){
      sh.getRange(i+1,2).setValue(payload.valor || '');
      sh.getRange(i+1,3).setValue(payload.descricao || '');
      return true;
    }
  }
  sh.appendRow([chave, payload.valor || '', payload.descricao || '']);
  return true;
}

function obterSaudeSistema(){
  const eventos = _vals('SEPSE_EVENTOS');
  const notifs = _vals('NOTIFICACOES_LOG');
  const logs = _vals('LOG_SISTEMA');
  let ultimoEvento = '';
  let ultimaNotificacao = '';
  let ultimoErro = '';

  if (eventos.length > 1){
    const last = eventos[eventos.length-1][5];
    ultimoEvento = last ? _fmt(last) : '';
  }
  if (notifs.length > 1){
    const last = notifs[notifs.length-1][4];
    ultimaNotificacao = last ? _fmt(last) : '';
  }
  for (let i=logs.length-1;i>=1;i--){
    if (String(logs[i][1]).toUpperCase() === 'ERRO'){
      ultimoErro = `${_fmt(logs[i][0])} · ${logs[i][3]}`;
      break;
    }
  }

  return {
    ultimoEvento: ultimoEvento || 'Sem eventos',
    ultimaNotificacao: ultimaNotificacao || 'Sem notificações',
    ultimoErro: ultimoErro || 'Sem erros',
    status: 'Sistema funcionando normalmente'
  };
}

/* =========================
   Config
========================= */
function listarSetoresSepseAtivos(){
  const data = _vals('CONFIG_SETORES_SEPSE');
  const out = [];
  for (let i=1;i<data.length;i++){
    if (_isTrue(data[i][3])){
      out.push({
        id: data[i][0],
        nome: data[i][1],
        tipo: data[i][2],
        exigeContato: _isTrue(data[i][4])
      });
    }
  }
  return out;
}

/* =========================
   SOLICITAÇÕES GERAIS
========================= */
function criarSolicitacaoGeral(payload){
  const id = _uuid();
  const tipo = String(payload.tipo || '').toUpperCase();
  _sh('SOLICITACOES_GERAIS').appendRow([
    id,
    tipo,
    payload.nomeSolicitante || payload.setor || '',
    payload.setor || '',
    String(payload.ramal || ''),
    _now(),
    'ABERTO',
    payload.prioridade || 'NORMAL',
    payload.observacao || ''
  ]);

  if (tipo === 'OBITO'){
    _sh('OBITO').appendRow([
      id,
      payload.leito || '',
      payload.clinica || '',
      payload.dataObito || '',
      payload.prontuario || '',
      payload.paciente || ''
    ]);
  }
  if (tipo === 'INTERCONSULTA'){
    _sh('INTERCONSULTA').appendRow([
      id,
      payload.prontuario || '',
      payload.clinica || '',
      payload.paciente || '',
      payload.especialidade || ''
    ]);
  }
  if (tipo === 'EXAMES'){
    _sh('EXAMES').appendRow([
      id,
      payload.prontuario || '',
      payload.paciente || '',
      payload.exame || '',
      payload.dataSolicitacao || '',
      payload.solicitante || ''
    ]);
  }

  return id;
}

function listarSolicitacoesPorRamal(ramal){
  const data = _vals('SOLICITACOES_GERAIS');
  const out = [];
  for (let i=1;i<data.length;i++){
    if (String(data[i][4]) === String(ramal)){
      out.push({
        id: data[i][0],
        tipo: data[i][1],
        nomeSolicitante: data[i][2],
        setor: data[i][3],
        ramal: data[i][4],
        abertura: data[i][5],
        status: data[i][6],
        prioridade: data[i][7],
        observacao: data[i][8]
      });
    }
  }
  return out;
}

function listarSolicitacoesParaPlantao(filtros){
  const data = _vals('SOLICITACOES_GERAIS');
  const out = [];
  for (let i=1;i<data.length;i++){
    out.push({
      id: data[i][0],
      tipo: data[i][1],
      nomeSolicitante: data[i][2],
      setor: data[i][3],
      ramal: data[i][4],
      abertura: data[i][5],
      status: data[i][6],
      prioridade: data[i][7],
      observacao: data[i][8]
    });
  }

  if (filtros){
    let filtered = out;
    if (filtros.status && filtros.status !== 'TODOS'){
      filtered = filtered.filter(x => String(x.status) === String(filtros.status));
    }
    if (filtros.tipo && filtros.tipo !== 'TODOS'){
      filtered = filtered.filter(x => String(x.tipo) === String(filtros.tipo));
    }
    return filtered;
  }
  return out;
}

function obterSolicitacaoDetalhe(idSolicitacao){
  const data = _vals('SOLICITACOES_GERAIS');
  let base = null;
  for (let i=1;i<data.length;i++){
    if (data[i][0] === idSolicitacao){
      base = {
        id: data[i][0],
        tipo: data[i][1],
        nomeSolicitante: data[i][2],
        setor: data[i][3],
        ramal: data[i][4],
        abertura: data[i][5],
        status: data[i][6],
        prioridade: data[i][7],
        observacao: data[i][8]
      };
      break;
    }
  }
  if (!base) return null;

  if (base.tipo === 'OBITO'){
    const rows = _vals('OBITO');
    for (let i=1;i<rows.length;i++){
      if (rows[i][0] === idSolicitacao){
        base.detalhe = {
          leito: rows[i][1],
          clinica: rows[i][2],
          dataObito: rows[i][3],
          prontuario: rows[i][4],
          paciente: rows[i][5]
        };
        break;
      }
    }
  }

  if (base.tipo === 'INTERCONSULTA'){
    const rows = _vals('INTERCONSULTA');
    for (let i=1;i<rows.length;i++){
      if (rows[i][0] === idSolicitacao){
        base.detalhe = {
          prontuario: rows[i][1],
          clinica: rows[i][2],
          paciente: rows[i][3],
          especialidade: rows[i][4]
        };
        break;
      }
    }
  }

  if (base.tipo === 'EXAMES'){
    const rows = _vals('EXAMES');
    for (let i=1;i<rows.length;i++){
      if (rows[i][0] === idSolicitacao){
        base.detalhe = {
          prontuario: rows[i][1],
          paciente: rows[i][2],
          exame: rows[i][3],
          dataSolicitacao: rows[i][4],
          solicitante: rows[i][5]
        };
        break;
      }
    }
  }

  return base;
}

/* =========================
   SEPSE - CRUD
========================= */
function criarProtocoloSepse(payload){
  const id = _uuid();
  _sh('SEPSE_PROTOCOLOS').appendRow([
    id,
    payload.paciente || '',
    payload.prontuario || '',
    payload.leito || '',
    payload.unidade || '',
    payload.medico || '',
    'ABERTO',
    'CRITICA',
    _now(),
    '',
    payload.observacao || ''
  ]);

  registrarEventoSepse(id,'ABERTURA', payload.setor || 'SOLICITANTE', payload.ramal, `Protocolo de sepse aberto por ${payload.setor||'SOLICITANTE'}`);
  return id;
}

function registrarEventoSepse(idProtocolo, tipo, setor, ramal, descricao){
  _sh('SEPSE_EVENTOS').appendRow([
    _uuid(),
    idProtocolo,
    tipo,
    setor || '',
    String(ramal||''),
    _now(),
    descricao || ''
  ]);
  // log de notificação pro plantão (você pode plugar envio real depois)
  _sh('NOTIFICACOES_LOG').appendRow([_uuid(), tipo, 'PLANTAO', idProtocolo, _now(), 'ENVIADO']);
  return true;
}

function obterProtocoloSepse(idProtocolo){
  const sh = _sh('SEPSE_PROTOCOLOS');
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++){
    if (data[i][0] === idProtocolo){
      return {
        id: data[i][0],
        paciente: data[i][1],
        prontuario: data[i][2],
        leito: data[i][3],
        unidade: data[i][4],
        medico: data[i][5],
        status: data[i][6],
        prioridade: data[i][7],
        abertura: data[i][8],
        encerramento: data[i][9],
        observacao: data[i][10]
      };
    }
  }
  return null;
}

function listarSepseParaPlantao(filtros){
  const data = _vals('SEPSE_PROTOCOLOS');
  const out = [];
  for (let i=1;i<data.length;i++){
    const row = {
      id: data[i][0],
      paciente: data[i][1],
      prontuario: data[i][2],
      leito: data[i][3],
      unidade: data[i][4],
      medico: data[i][5],
      status: data[i][6],
      prioridade: data[i][7],
      abertura: data[i][8],
      encerramento: data[i][9],
      observacao: data[i][10]
    };
    out.push(row);
  }

  if (filtros){
    if (filtros.status && filtros.status !== 'TODOS'){
      return out.filter(x => String(x.status) === String(filtros.status));
    }
  }
  return out;
}

function listarSepsePorRamal(ramal){
  // “Meus” protocolos: baseado no primeiro evento ABERTURA do ramal
  const ev = _vals('SEPSE_EVENTOS');
  const mine = new Set();
  for (let i=1;i<ev.length;i++){
    if (ev[i][2] === 'ABERTURA' && String(ev[i][4]) === String(ramal)){
      mine.add(ev[i][1]);
    }
  }
  const prot = _vals('SEPSE_PROTOCOLOS');
  const out = [];
  for (let i=1;i<prot.length;i++){
    if (mine.has(prot[i][0])){
      out.push({
        id: prot[i][0],
        paciente: prot[i][1],
        prontuario: prot[i][2],
        leito: prot[i][3],
        unidade: prot[i][4],
        medico: prot[i][5],
        status: prot[i][6],
        prioridade: prot[i][7],
        abertura: prot[i][8],
        encerramento: prot[i][9]
      });
    }
  }
  return out;
}

function carregarTimelineSepse(idProtocolo){
  const data = _vals('SEPSE_EVENTOS');
  const out = [];
  for (let i=1;i<data.length;i++){
    if (data[i][1] === idProtocolo){
      out.push({
        id_evento: data[i][0],
        id_protocolo: data[i][1],
        tipo: data[i][2],
        setor: data[i][3],
        ramal: data[i][4],
        data_hora: data[i][5],
        descricao: data[i][6]
      });
    }
  }
  // ordenar por data/hora
  out.sort((a,b)=> new Date(a.data_hora) - new Date(b.data_hora));
  return out;
}

/* =========================
   SEPSE - Ações
========================= */
function registrarLigacaoSepse(idProtocolo, setorDestino, ramal, resultado, observacao){
  const desc = `Ligação para ${setorDestino} (${resultado})` + (observacao ? ` - ${observacao}` : '');
  return registrarEventoSepse(idProtocolo,'LIGACAO', setorDestino, ramal, desc);
}

function confirmarSepse6h(idProtocolo, ramal){
  return registrarEventoSepse(idProtocolo,'CONFIRMACAO_6H','PLANTAO', ramal, 'Confirmação do protocolo após 6 horas');
}

function solicitarCancelamentoSepse(idProtocolo, ramal){
  return registrarEventoSepse(idProtocolo,'SOLICITACAO_CANCELAMENTO','SOLICITANTE', ramal, 'Solicitação de cancelamento do protocolo');
}

function confirmarCancelamentoSepse(idProtocolo, ramal){
  const sh = _sh('SEPSE_PROTOCOLOS');
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++){
    if (data[i][0] === idProtocolo){
      sh.getRange(i+1, 7).setValue('CANCELADO');     // status_atual
      sh.getRange(i+1,10).setValue(_now());          // data_hora_encerramento
      break;
    }
  }
  return registrarEventoSepse(idProtocolo,'CANCELADO','PLANTAO', ramal, 'Protocolo cancelado pelo Plantão Administrativo');
}

function concluirSepse(idProtocolo, ramal){
  const sh = _sh('SEPSE_PROTOCOLOS');
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++){
    if (data[i][0] === idProtocolo){
      sh.getRange(i+1, 7).setValue('CONCLUIDO');
      sh.getRange(i+1,10).setValue(_now());
      break;
    }
  }
  return registrarEventoSepse(idProtocolo,'CONCLUIDO','PLANTAO', ramal, 'Protocolo de sepse concluído');
}
