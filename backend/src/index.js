const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Disk Persistence Configuration
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Default Seed Data
const defaultUsers = [
  { id: 1, name: 'Tiago (Admin)', email: 'tiago@launchlab.com', role: 'admin', canEdit: true },
  { id: 2, name: 'Mariana (Atendimento)', email: 'mariana@launchlab.com', role: 'user', canEdit: true },
  { id: 3, name: 'Carlos (Vendas)', email: 'carlos@launchlab.com', role: 'user', canEdit: false }
];

const defaultProperties = [
  {
    id: 1,
    name: 'Recanto das Serras (Casa Principal)',
    color: '#c25e38', // Terracota
    address: 'Av. das Palmeiras, 1000 - Suíte 101',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    itemsToBring: [
      'Documento de identidade com foto (RG ou CNH)',
      'Roupas de cama e banho (kit conforto)',
      'Medicamentos e itens de uso pessoal / higiene',
      'Comprovante de confirmação da reserva'
    ],
    rules: 'Proibido som alto após as 22h. Não é permitido fumar nas dependências internas.',
    contractTerms: 'TERMO DE LOCAÇÃO DE TEMPORADA:\nAo realizar a reserva, o hóspede declara estar ciente e de acordo com as regras de convivência, horários de check-in (14h) e check-out (11h) e se compromete a zelar pela conservação do imóvel e seus bens.',
    authorizedUsers: [1, 2, 3]
  },
  {
    id: 2,
    name: 'Chalé da Montanha',
    color: '#b45309', // Âmbar Terroso / Ocre
    address: 'Estrada do Vale, 450 - Chalé 02',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    itemsToBring: [
      'Documentos com foto',
      'Casacos e roupas de frio',
      'Itens de higiene pessoal'
    ],
    rules: 'Uso da lareira com supervisão. Respeitar o silêncio da vila de chalés.',
    contractTerms: 'TERMO DE LOCAÇÃO CHALÉ DA MONTANHA:\nO locatário compromete-se a respeitar o regulamento do condomínio e zelar pela lareira e instalações térmicas.',
    authorizedUsers: [1, 2]
  },
  {
    id: 3,
    name: 'Pousada Villa Verde',
    color: '#4d7c0f', // Verde Oliva / Sálvia
    address: 'Rua dos Pinhais, 88 - Suíte Master',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    itemsToBring: [
      'Documento com foto',
      'Roupas leves e repelente',
      'Toalhas extras para área externa'
    ],
    rules: 'Animais de estimação permitidos mediante prévio aviso. Horário da piscina até as 20h.',
    contractTerms: 'TERMO DE LOCAÇÃO VILLA VERDE:\nLocação de temporada sujeita às normas ambientais e preservação da área verde.',
    authorizedUsers: [1, 3]
  }
];


const today = new Date();
const formatDateStr = (d) => d.toISOString().split('T')[0];
const addDays = (d, days) => {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return formatDateStr(result);
};

const defaultReservations = [
  {
    id: 101,
    propertyId: 1,
    guestName: 'Ana Silva',
    phone: '(11) 98765-4321',
    email: 'ana.silva@email.com',
    cpf: '123.456.789-00',
    checkIn: addDays(today, 1),
    checkOut: addDays(today, 4),
    totalAmount: 1200.00,
    depositAmount: 400.00,
    balanceDue: 800.00,
    cleaningFee: 150.00,
    extraFees: 0.00,
    paymentStatus: 'parcial',
    salesRepId: 1,
    notes: 'Solicitou berço extra'
  },
  {
    id: 102,
    propertyId: 1,
    guestName: 'Roberto Oliveira',
    phone: '(21) 99887-6655',
    email: 'roberto.oliveira@email.com',
    cpf: '987.654.321-11',
    checkIn: addDays(today, 6),
    checkOut: addDays(today, 9),
    totalAmount: 1600.00,
    depositAmount: 1600.00,
    balanceDue: 0.00,
    cleaningFee: 150.00,
    extraFees: 50.00,
    paymentStatus: 'pago',
    salesRepId: 2,
    notes: 'Pagamento total realizado via Pix'
  }
];

// Initialize State
let users = defaultUsers;
let properties = defaultProperties;
let reservations = defaultReservations;

// Database Disk Storage Functions
function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (data.users) users = data.users;
      if (data.properties) properties = data.properties;
      if (data.reservations) reservations = data.reservations;
      console.log('📂 Banco de dados carregado com sucesso do disco (db.json)!');
    } catch (e) {
      console.error('⚠️ Erro ao ler db.json, inicializando com padrão:', e);
      saveDatabase();
    }
  } else {
    saveDatabase();
  }
}

function saveDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify({ users, properties, reservations }, null, 2), 'utf8');
    console.log('💾 Dados salvos com sucesso no banco de dados em disco (db.json)');
  } catch (e) {
    console.error('⚠️ Erro ao salvar dados no disco:', e);
  }
}

// Load database on start
initDatabase();

// Helper: Date Overlap Validator
function checkDateOverlap(propertyId, checkIn, checkOut, excludeReservationId = null) {
  const newIn = new Date(checkIn);
  const newOut = new Date(checkOut);

  return reservations.some(res => {
    if (res.propertyId !== Number(propertyId)) return false;
    if (excludeReservationId && res.id === Number(excludeReservationId)) return false;

    const existingIn = new Date(res.checkIn);
    const existingOut = new Date(res.checkOut);

    return newIn < existingOut && newOut > existingIn;
  });
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', app: 'HostHub Manager', database: 'persistent-disk', timestamp: new Date().toISOString() });
});

app.get('/api/users', (req, res) => {
  res.json(users);
});

app.get('/api/properties', (req, res) => {
  res.json(properties);
});

app.post('/api/properties', (req, res) => {
  const { name, color, address, checkInTime, checkOutTime, itemsToBring, rules, contractTerms, pixInfo } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome da propriedade é obrigatório' });

  const newProperty = {
    id: Date.now(),
    name,
    color: color || '#c25e38',
    address: address || '',
    checkInTime: checkInTime || '14:00',
    checkOutTime: checkOutTime || '11:00',
    itemsToBring: Array.isArray(itemsToBring) ? itemsToBring : (itemsToBring ? itemsToBring.split('\n').filter(Boolean) : []),
    rules: rules || '',
    contractTerms: contractTerms || '',
    pixInfo: pixInfo || '',
    authorizedUsers: [1, 2, 3]
  };

  properties.push(newProperty);
  saveDatabase();
  res.status(201).json(newProperty);
});

app.put('/api/properties/:id', (req, res) => {
  const { id } = req.params;
  const prop = properties.find(p => p.id === Number(id));
  if (!prop) return res.status(404).json({ error: 'Propriedade não encontrada' });

  const { name, color, address, checkInTime, checkOutTime, itemsToBring, rules, contractTerms, pixInfo } = req.body;
  if (name !== undefined) prop.name = name;
  if (color !== undefined) prop.color = color;
  if (address !== undefined) prop.address = address;
  if (checkInTime !== undefined) prop.checkInTime = checkInTime;
  if (checkOutTime !== undefined) prop.checkOutTime = checkOutTime;
  if (itemsToBring !== undefined) {
    prop.itemsToBring = Array.isArray(itemsToBring) ? itemsToBring : itemsToBring.split('\n').filter(Boolean);
  }
  if (rules !== undefined) prop.rules = rules;
  if (contractTerms !== undefined) prop.contractTerms = contractTerms;
  if (pixInfo !== undefined) prop.pixInfo = pixInfo;

  saveDatabase();
  res.json(prop);
});


app.delete('/api/properties/:id', (req, res) => {
  const { id } = req.params;
  if (properties.length <= 1) {
    return res.status(400).json({ error: 'Você precisa manter pelo menos 1 propriedade cadastrada no sistema.' });
  }
  properties = properties.filter(p => p.id !== Number(id));
  saveDatabase();
  res.json({ success: true, id: Number(id) });
});


app.get('/api/reservations', (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const decoratedReservations = reservations.map(res => {
    const prop = properties.find(p => p.id === res.propertyId);
    const salesRep = users.find(u => u.id === res.salesRepId);
    const isPast = new Date(res.checkIn) < todayStart;

    return {
      ...res,
      isPast,
      propertyName: prop ? prop.name : 'Propriedade',
      propertyColor: prop ? prop.color : '#6366f1',
      salesRepName: salesRep ? salesRep.name : 'Não informado'
    };
  });
  res.json(decoratedReservations);
});


app.post('/api/reservations', (req, res) => {
  const { 
    propertyId, guestName, phone, email, cpf, 
    checkIn, checkOut, totalAmount, depositAmount, 
    cleaningFee, extraFees, paymentStatus, salesRepId, notes 
  } = req.body;

  if (!propertyId || !guestName || !checkIn || !checkOut || !totalAmount) {
    return res.status(400).json({ error: 'Preencha os campos obrigatórios (Propriedade, Nome, Check-in, Check-out, Valor Total)' });
  }

  if (new Date(checkIn) >= new Date(checkOut)) {
    return res.status(400).json({ error: 'A data de check-out deve ser posterior à data de check-in' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (checkIn < todayStr) {
    return res.status(400).json({ error: 'Não é permitido realizar novas reservas em datas no passado.' });
  }


  const hasConflict = checkDateOverlap(propertyId, checkIn, checkOut);
  if (hasConflict) {
    return res.status(409).json({ 
      error: '⚠️ Não foi possível realizar a reserva: O período selecionado entra em conflito com outra reserva já existente nesta propriedade.' 
    });
  }

  const total = Number(totalAmount) || 0;
  const deposit = Number(depositAmount) || 0;
  const balance = Math.max(0, total - deposit);

  const newRes = {
    id: Date.now(),
    propertyId: Number(propertyId),
    guestName,
    phone: phone || '',
    email: email || '',
    cpf: cpf || '',
    checkIn,
    checkOut,
    totalAmount: total,
    depositAmount: deposit,
    balanceDue: balance,
    cleaningFee: Number(cleaningFee) || 0,
    extraFees: Number(extraFees) || 0,
    paymentStatus: paymentStatus || (balance === 0 ? 'pago' : deposit > 0 ? 'parcial' : 'pendente'),
    salesRepId: Number(salesRepId) || 1,
    notes: notes || ''
  };

  reservations.push(newRes);
  saveDatabase();
  res.status(201).json(newRes);
});

app.put('/api/reservations/:id', (req, res) => {
  const { id } = req.params;
  const resObj = reservations.find(r => r.id === Number(id));
  if (!resObj) return res.status(404).json({ error: 'Reserva não encontrada' });

  const { 
    propertyId, guestName, phone, email, cpf, 
    checkIn, checkOut, totalAmount, depositAmount, 
    cleaningFee, extraFees, paymentStatus, salesRepId, notes 
  } = req.body;

  const propId = propertyId ? Number(propertyId) : resObj.propertyId;
  const cIn = checkIn || resObj.checkIn;
  const cOut = checkOut || resObj.checkOut;

  if (new Date(cIn) >= new Date(cOut)) {
    return res.status(400).json({ error: 'A data de check-out deve ser posterior à data de check-in' });
  }

  const hasConflict = checkDateOverlap(propId, cIn, cOut, Number(id));
  if (hasConflict) {
    return res.status(409).json({ 
      error: '⚠️ Não foi possível alterar a reserva: O período selecionado entra em conflito com outra reserva já existente nesta propriedade.' 
    });
  }

  if (guestName !== undefined) resObj.guestName = guestName;
  if (phone !== undefined) resObj.phone = phone;
  if (email !== undefined) resObj.email = email;
  if (cpf !== undefined) resObj.cpf = cpf;
  if (checkIn !== undefined) resObj.checkIn = checkIn;
  if (checkOut !== undefined) resObj.checkOut = checkOut;
  if (salesRepId !== undefined) resObj.salesRepId = Number(salesRepId);
  if (notes !== undefined) resObj.notes = notes;
  if (propertyId !== undefined) resObj.propertyId = Number(propertyId);

  const total = totalAmount !== undefined ? Number(totalAmount) : resObj.totalAmount;
  const deposit = depositAmount !== undefined ? Number(depositAmount) : resObj.depositAmount;

  resObj.totalAmount = total;
  resObj.depositAmount = deposit;
  resObj.balanceDue = Math.max(0, total - deposit);
  if (cleaningFee !== undefined) resObj.cleaningFee = Number(cleaningFee);
  if (extraFees !== undefined) resObj.extraFees = Number(extraFees);
  
  resObj.paymentStatus = paymentStatus || (resObj.balanceDue === 0 ? 'pago' : resObj.depositAmount > 0 ? 'parcial' : 'pendente');

  saveDatabase();
  res.json(resObj);
});

app.delete('/api/reservations/:id', (req, res) => {
  const { id } = req.params;
  reservations = reservations.filter(r => r.id !== Number(id));
  saveDatabase();
  res.json({ success: true, id: Number(id) });
});

// CSV Export Endpoint
app.get('/api/export/csv', (req, res) => {
  const headers = ['ID', 'Hospede', 'Telefone', 'CPF', 'CheckIn', 'CheckOut', 'Valor Total', 'Entrada (Sinal)', 'Saldo Pendente', 'Taxa Limpeza', 'Status Pagamento', 'Responsavel Venda'];
  
  const rows = reservations.map(r => {
    const salesRep = users.find(u => u.id === r.salesRepId);
    return [
      r.id,
      `"${r.guestName.replace(/"/g, '""')}"`,
      `"${r.phone}"`,
      `"${r.cpf}"`,
      r.checkIn,
      r.checkOut,
      r.totalAmount.toFixed(2),
      r.depositAmount.toFixed(2),
      r.balanceDue.toFixed(2),
      r.cleaningFee.toFixed(2),
      r.paymentStatus.toUpperCase(),
      `"${salesRep ? salesRep.name : ''}"`
    ].join(';');
  });

  const csvContent = [headers.join(';'), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="relatorio_financeiro_reservas.csv"');
  res.send('\uFEFF' + csvContent);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ HostHub Backend rodando na porta ${PORT} com persistência em disco em /data/db.json`);
});
