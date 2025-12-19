/* =========================
   Helpers
========================= */
function _sh(name){ return SpreadsheetApp.getActive().getSheetByName(name); }
function _vals(name){ return _sh(name).getDataRange().getValues(); }
function _uuid(){ return Utilities.getUuid(); }
function _now(){ return new Date(); }
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
