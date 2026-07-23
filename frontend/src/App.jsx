import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Users, 
  Plus, 
  FileSpreadsheet, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Copy, 
  Share2, 
  Trash2, 
  Info,
  Luggage,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Edit,
  UserCheck,
  History,
  Filter,
  QrCode,
  Smartphone,
  Download
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data States
  const [properties, setProperties] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Property Selection Filter State (null = All Properties)
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  // Modal States
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [editingReservationId, setEditingReservationId] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [conflictError, setConflictError] = useState('');

  // New/Edit Property Modal State
  const [showPropModal, setShowPropModal] = useState(false);
  const [editingPropId, setEditingPropId] = useState(null);
  const [propFormData, setPropFormData] = useState({
    name: '',
    color: '#c25e38',
    address: '',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    itemsToBring: '',
    rules: '',
    contractTerms: '',
    pixInfo: ''
  });

  const [copiedPixNotice, setCopiedPixNotice] = useState(false);

  // PWA Install Prompt State
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // Today's Date String (YYYY-MM-DD) based on local system date
  const todayStr = new Date().toISOString().split('T')[0];

  // Reservation Form State
  const [formData, setFormData] = useState({
    propertyId: 1,
    guestName: '',
    phone: '',
    email: '',
    cpf: '',
    checkIn: todayStr,
    checkOut: '',
    totalAmount: '',
    depositAmount: '',
    cleaningFee: '150',
    extraFees: '0',
    salesRepId: 1,
    notes: ''
  });

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
    }
    setDeferredInstallPrompt(null);
  };

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [propsRes, resRes, usersRes] = await Promise.all([
        fetch('/api/properties'),
        fetch('/api/reservations'),
        fetch('/api/users')
      ]);

      const propsData = await propsRes.json();
      const resData = await resRes.json();
      const usersData = await usersRes.json();

      setProperties(propsData);
      setReservations(resData);
      setUsers(usersData);
      if (usersData.length > 0 && !currentUser) {
        setCurrentUser(usersData[0]);
        setFormData(prev => ({ ...prev, salesRepId: usersData[0].id }));
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const primaryProp = properties[0] || {};

  // Filter reservations by selected property (if any)
  const filteredReservations = selectedPropertyId 
    ? reservations.filter(r => r.propertyId === Number(selectedPropertyId))
    : reservations;

  // Financial Calculations
  const totalRevenue = filteredReservations.reduce((acc, r) => acc + (r.totalAmount || 0), 0);
  const totalReceived = filteredReservations.reduce((acc, r) => acc + (r.depositAmount || 0), 0);
  const totalPending = filteredReservations.reduce((acc, r) => acc + (r.balanceDue || 0), 0);

  // Form Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'totalAmount' || name === 'depositAmount') {
        const tot = Number(name === 'totalAmount' ? value : updated.totalAmount) || 0;
        const dep = Number(name === 'depositAmount' ? value : updated.depositAmount) || 0;
        updated.balanceDue = Math.max(0, tot - dep);
      }
      return updated;
    });
    setConflictError('');
  };

  // Open Modal for New Reservation
  const handleOpenNewReservation = () => {
    setEditingReservationId(null);
    setConflictError('');
    setFormData({
      propertyId: selectedPropertyId || primaryProp.id || 1,
      guestName: '',
      phone: '',
      email: '',
      cpf: '',
      checkIn: todayStr,
      checkOut: '',
      totalAmount: '',
      depositAmount: '',
      cleaningFee: '150',
      extraFees: '0',
      salesRepId: currentUser ? currentUser.id : 1,
      notes: ''
    });
    setShowReservationModal(true);
  };

  // Open Modal for Editing Existing Reservation
  const handleOpenEditReservation = (resObj) => {
    setEditingReservationId(resObj.id);
    setConflictError('');
    setFormData({
      propertyId: resObj.propertyId || primaryProp.id || 1,
      guestName: resObj.guestName || '',
      phone: resObj.phone || '',
      email: resObj.email || '',
      cpf: resObj.cpf || '',
      checkIn: resObj.checkIn || '',
      checkOut: resObj.checkOut || '',
      totalAmount: resObj.totalAmount || '',
      depositAmount: resObj.depositAmount || '',
      cleaningFee: resObj.cleaningFee || '150',
      extraFees: resObj.extraFees || '0',
      salesRepId: resObj.salesRepId || 1,
      notes: resObj.notes || ''
    });
    setSelectedReservation(null);
    setShowReservationModal(true);
  };

  // Save Reservation (Validates past date)
  const handleSaveReservation = async (e) => {
    e.preventDefault();
    setConflictError('');

    const isEdit = Boolean(editingReservationId);

    // Strict Past Date Blocking Check
    if (!isEdit && formData.checkIn < todayStr) {
      setConflictError('Não é permitido realizar reservas para datas no passado. Selecione uma data a partir de hoje.');
      return;
    }

    const url = isEdit ? `/api/reservations/${editingReservationId}` : '/api/reservations';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        setConflictError(data.error || 'Erro ao salvar reserva');
        return;
      }

      setShowReservationModal(false);
      fetchData();
    } catch (err) {
      setConflictError('Falha na comunicação com o servidor');
    }
  };

  // Delete Reservation
  const handleDeleteReservation = async (id) => {
    if (!window.confirm('Tem certeza que deseja cancelar/remover esta reserva?')) return;
    try {
      await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
      setSelectedReservation(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao deletar reserva:', err);
    }
  };

  // Open Modal for New Property
  const handleOpenNewProp = () => {
    setEditingPropId(null);
    setPropFormData({
      name: '',
      color: '#c25e38',
      address: '',
      checkInTime: '14:00',
      checkOutTime: '11:00',
      itemsToBring: '• Documento com foto\n• Roupas de cama e banho\n• Itens de higiene pessoal',
      rules: 'Proibido som alto após as 22h. Não é permitido fumar nas dependências internas.',
      contractTerms: 'TERMO DE LOCAÇÃO DE TEMPORADA:\nAo realizar a reserva, o hóspede declara estar ciente e de acordo com as regras de convivência e conservação do imóvel.',
      pixInfo: 'Chave Pix (CNPJ/CPF): 12.345.678/0001-90 - Banco Itaú (Solar das Palmeiras)'
    });
    setShowPropModal(true);
  };

  // Open Modal for Edit Property
  const handleOpenEditProp = (prop) => {
    setEditingPropId(prop.id);
    setPropFormData({
      name: prop.name || '',
      color: prop.color || '#c25e38',
      address: prop.address || '',
      checkInTime: prop.checkInTime || '14:00',
      checkOutTime: prop.checkOutTime || '11:00',
      itemsToBring: Array.isArray(prop.itemsToBring) ? prop.itemsToBring.join('\n') : prop.itemsToBring || '',
      rules: prop.rules || '',
      contractTerms: prop.contractTerms || '',
      pixInfo: prop.pixInfo || ''
    });
    setShowPropModal(true);
  };

  // Save Property
  const handleSaveProperty = async (e) => {
    e.preventDefault();
    const isEdit = Boolean(editingPropId);
    const url = isEdit ? `/api/properties/${editingPropId}` : '/api/properties';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propFormData)
      });
      setShowPropModal(false);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar propriedade:', err);
    }
  };

  // Delete Property
  const handleDeleteProperty = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover esta propriedade?')) return;
    try {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Não foi possível remover a propriedade.');
        return;
      }
      if (selectedPropertyId === id) setSelectedPropertyId(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao excluir propriedade:', err);
    }
  };

  // WhatsApp Message Generator
  const generateWhatsAppURL = (resObj) => {
    const prop = properties.find(p => p.id === resObj.propertyId) || primaryProp;
    const phoneClean = (resObj.phone || '').replace(/\D/g, '');
    const targetPhone = phoneClean.startsWith('55') ? phoneClean : `55${phoneClean}`;

    const itemsText = (prop.itemsToBring || [])
      .map(item => item.startsWith('•') ? item : `• ${item}`)
      .join('\n');

    const headerText = `*CONFIRMAÇÃO DE RESERVA & REGRAS DA PROPRIEDADE* 🏡`;
    const introText = `Olá *${resObj.guestName}*, sua reserva na *${prop.name}* (Solar das Palmeiras) está confirmada!`;

    const pixSection = prop.pixInfo 
      ? `\n💳 *DADOS PARA PAGAMENTO VIA PIX*:\n${prop.pixInfo}\n`
      : '';

    const message = `${headerText}

${introText}

📅 *Check-in*: ${resObj.checkIn} às ${prop.checkInTime || '14:00'}
📅 *Check-out*: ${resObj.checkOut} às ${prop.checkOutTime || '11:00'}

💰 *RESUMO FINANCEIRO*:
- Valor Total: R$ ${resObj.totalAmount?.toFixed(2)}
- Entrada / Sinal Pago: R$ ${resObj.depositAmount?.toFixed(2)}
- Saldo a Pagar: *R$ ${resObj.balanceDue?.toFixed(2)}*
- Taxa de Limpeza: R$ ${resObj.cleaningFee?.toFixed(2)}
${pixSection}
🎒 *O QUE VOCÊ DEVE LEVAR (CHECKLIST DO HÓSPEDE)*:
${itemsText}

📜 *REGRAS DA CASA & MINI CONTRATO DE LOCAÇÃO*:
${prop.rules || ''}

${prop.contractTerms || ''}

Confirmação emitida por Solar das Palmeiras em ${new Date().toLocaleDateString('pt-BR')}. Desejamos uma excelente estadia! 😊`;

    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
  };

  // Export CSV
  const handleExportCSV = () => {
    window.open('/api/export/csv', '_blank');
  };

  // Copy Pix Info
  const handleCopyPix = (pixText) => {
    navigator.clipboard.writeText(pixText);
    setCopiedPixNotice(true);
    setTimeout(() => setCopiedPixNotice(false), 3000);
  };

  return (
    <div className="app-wrapper">
      {/* Sidebar Navigation - Desktop */}
      <aside className="sidebar">
        <div className="brand-header">
          <div className="brand-icon">
            <Building2 size={24} />
          </div>
          <div>
            <div className="brand-title">Solar das Palmeiras</div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>LOCAÇÃO DE TEMPORADA</span>
          </div>
        </div>

        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Building2 size={18} /> Início / Visão Geral
          </button>

          <button 
            className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <CalendarIcon size={18} /> Agenda em Calendário
          </button>

          <button 
            className={`nav-item ${activeTab === 'reservations' ? 'active' : ''}`}
            onClick={() => setActiveTab('reservations')}
          >
            <Users size={18} /> Gerenciar Reservas
          </button>

          <button 
            className={`nav-item ${activeTab === 'finance' ? 'active' : ''}`}
            onClick={() => setActiveTab('finance')}
          >
            <DollarSign size={18} /> Controle Financeiro
          </button>

          <button 
            className={`nav-item ${activeTab === 'properties' ? 'active' : ''}`}
            onClick={() => setActiveTab('properties')}
          >
            <ShieldCheck size={18} /> Propriedades & Regras
          </button>
        </nav>

        {currentUser && (
          <div className="user-badge">
            <div className="avatar-circle">{currentUser.name.charAt(0)}</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{currentUser.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Resp. Logado</div>
            </div>
          </div>
        )}
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-nav-items">
          <button 
            className={`mobile-nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Building2 size={20} />
            <span>Início</span>
          </button>

          <button 
            className={`mobile-nav-button ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <CalendarIcon size={20} />
            <span>Agenda</span>
          </button>

          <button 
            className={`mobile-nav-button ${activeTab === 'reservations' ? 'active' : ''}`}
            onClick={() => setActiveTab('reservations')}
          >
            <Users size={20} />
            <span>Reservas</span>
          </button>

          <button 
            className={`mobile-nav-button ${activeTab === 'finance' ? 'active' : ''}`}
            onClick={() => setActiveTab('finance')}
          >
            <DollarSign size={20} />
            <span>Financeiro</span>
          </button>

          <button 
            className={`mobile-nav-button ${activeTab === 'properties' ? 'active' : ''}`}
            onClick={() => setActiveTab('properties')}
          >
            <ShieldCheck size={20} />
            <span>Regras</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* PWA INSTALL BANNER */}
        {deferredInstallPrompt && !isAppInstalled && (
          <div style={{
            background: 'linear-gradient(135deg, #c25e38, #b45309)',
            color: '#ffffff',
            padding: '0.9rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'var(--shadow-md)',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Smartphone size={24} />
              <div>
                <strong style={{ fontSize: '0.95rem' }}>Instale o App Solar das Palmeiras!</strong>
                <p style={{ fontSize: '0.8rem', opacity: 0.95 }}>Acesse mais rápido direto da sua tela inicial no celular.</p>
              </div>
            </div>
            <button className="btn" style={{ background: '#ffffff', color: '#c25e38', fontWeight: 700, padding: '0.5rem 1rem' }} onClick={handleInstallPWA}>
              <Download size={16} /> Instalar PWA
            </button>
          </div>
        )}

        <div className="page-header">
          <div className="page-title">
            <h2>
              {activeTab === 'dashboard' && 'Painel Principal — Solar das Palmeiras'}
              {activeTab === 'calendar' && 'Calendário de Reservas'}
              {activeTab === 'reservations' && 'Gestão de Reservas'}
              {activeTab === 'finance' && 'Financeiro & Recebimentos'}
              {activeTab === 'properties' && 'Propriedades, Regras & Dados PIX'}
            </h2>
            <p>
              {selectedPropertyId 
                ? `Filtrando por: ${properties.find(p => p.id === Number(selectedPropertyId))?.name || 'Propriedade'}`
                : `Exibindo todas as ${properties.length} propriedades registradas`
              }
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              <FileSpreadsheet size={18} color="#4d7c0f" /> Exportar Excel
            </button>
            <button className="btn btn-primary" onClick={handleOpenNewReservation}>
              <Plus size={18} /> Nova Reserva
            </button>
          </div>
        </div>

        {/* MULTIPLE PROPERTIES PILL FILTER BAR */}
        <div className="property-filter-bar">
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Filter size={14} /> PROPRIEDADES:
          </span>

          <button 
            className={`prop-pill ${selectedPropertyId === null ? 'active' : ''}`}
            onClick={() => setSelectedPropertyId(null)}
          >
            Todas ({properties.length})
          </button>

          {properties.map(p => (
            <button 
              key={p.id}
              className={`prop-pill ${selectedPropertyId === p.id ? 'active' : ''}`}
              onClick={() => setSelectedPropertyId(p.id)}
            >
              <span className="property-color-dot" style={{ backgroundColor: p.color || '#c25e38' }}></span>
              {p.name}
            </button>
          ))}

          <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: 20 }} onClick={handleOpenNewProp}>
            <Plus size={14} /> Add Propriedade
          </button>
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">Receita Bruta Total</div>
                <div className="kpi-value" style={{ color: 'var(--primary)' }}>R$ {totalRevenue.toFixed(2)}</div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{filteredReservations.length} reservas listadas</span>
              </div>

              <div className="kpi-card">
                <div className="kpi-label">Valores Recebidos (Sinal/Total)</div>
                <div className="kpi-value" style={{ color: 'var(--emerald)' }}>R$ {totalReceived.toFixed(2)}</div>
                <span style={{ fontSize: '0.78rem', color: 'var(--emerald)' }}>✓ Confirmados no caixa</span>
              </div>

              <div className="kpi-card">
                <div className="kpi-label">Saldo a Receber (Pendências)</div>
                <div className="kpi-value" style={{ color: totalPending > 0 ? 'var(--amber)' : 'var(--text-secondary)' }}>
                  R$ {totalPending.toFixed(2)}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>A ser quitado no check-in</span>
              </div>
            </div>

            <div className="table-container">
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Próximas Reservas & Status</h3>
                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }} onClick={() => setActiveTab('reservations')}>
                  Ver Todas
                </button>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Propriedade</th>
                    <th>Hóspede</th>
                    <th>Telefone</th>
                    <th>Check-in / Check-out</th>
                    <th>Total (R$)</th>
                    <th>Saldo a Receber</th>
                    <th>Status Pago</th>
                    <th>Responsável</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map(res => (
                    <tr key={res.id}>
                      <td>
                        <span className="property-color-dot" style={{ backgroundColor: res.propertyColor || '#c25e38', marginRight: '0.4rem' }}></span>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{res.propertyName}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{res.guestName}</td>
                      <td>{res.phone || '---'}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{res.checkIn}</span> ➔ {res.checkOut}
                      </td>
                      <td style={{ fontWeight: 700 }}>R$ {res.totalAmount?.toFixed(2)}</td>
                      <td style={{ fontWeight: 700, color: res.balanceDue > 0 ? 'var(--amber)' : 'var(--emerald)' }}>
                        R$ {res.balanceDue?.toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge badge-${res.paymentStatus}`}>
                          {res.paymentStatus}
                        </span>
                      </td>
                      <td>{res.salesRepName}</td>
                      <td style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                          onClick={() => handleOpenEditReservation(res)}
                          title="Editar Reserva"
                        >
                          <Edit size={14} color="#c25e38" /> Editar
                        </button>

                        <a 
                          href={generateWhatsAppURL(res)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-whatsapp" 
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', textDecoration: 'none' }}
                          title="Enviar confirmação e termo via WhatsApp"
                        >
                          <MessageSquare size={14} /> WhatsApp
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="calendar-wrapper">
            <div className="calendar-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                Agenda de Reservas — {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {properties.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color || '#c25e38' }}></span>
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="calendar-grid">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, i) => (
                <div key={i} className="calendar-day-head">{day}</div>
              ))}

              {Array.from({ length: 31 }, (_, i) => i + 1).map(dayNum => {
                const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                
                const activeResList = filteredReservations.filter(res => {
                  return currentMonthStr >= res.checkIn && currentMonthStr <= res.checkOut;
                });

                return (
                  <div key={dayNum} className={`calendar-cell ${activeResList.length > 0 ? 'has-reservation' : ''}`}>
                    <div className="calendar-date-number">{dayNum}</div>
                    {activeResList.map(res => (
                      <div 
                        key={res.id} 
                        className="calendar-event-badge"
                        style={{ backgroundColor: res.propertyColor || '#c25e38' }}
                        onClick={() => setSelectedReservation(res)}
                        title={`${res.guestName} (${res.propertyName})`}
                      >
                        👤 {res.guestName}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: RESERVATIONS MANAGER */}
        {activeTab === 'reservations' && (
          <div className="table-container">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Todas as Reservas Cadastradas</h3>
              <button className="btn btn-primary" onClick={handleOpenNewReservation}>
                <Plus size={16} /> Nova Reserva
              </button>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Propriedade</th>
                  <th>Hóspede</th>
                  <th>Contato</th>
                  <th>CPF</th>
                  <th>Período Reservado</th>
                  <th>Valor Total</th>
                  <th>Sinal</th>
                  <th>Saldo Pendente</th>
                  <th>Vendedor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.map(res => (
                  <tr key={res.id}>
                    <td>#{res.id}</td>
                    <td>
                      <span className="property-color-dot" style={{ backgroundColor: res.propertyColor || '#c25e38', marginRight: '0.4rem' }}></span>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{res.propertyName}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{res.guestName}</td>
                    <td>{res.phone}<br/><span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{res.email}</span></td>
                    <td>{res.cpf || 'Não inf.'}</td>
                    <td><span style={{ color: 'var(--primary)', fontWeight: 600 }}>{res.checkIn}</span> até {res.checkOut}</td>
                    <td style={{ fontWeight: 700 }}>R$ {res.totalAmount?.toFixed(2)}</td>
                    <td style={{ color: 'var(--emerald)', fontWeight: 600 }}>R$ {res.depositAmount?.toFixed(2)}</td>
                    <td style={{ color: res.balanceDue > 0 ? 'var(--amber)' : 'var(--text-muted)', fontWeight: 700 }}>
                      R$ {res.balanceDue?.toFixed(2)}
                    </td>
                    <td>{res.salesRepName}</td>
                    <td style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.5rem' }}
                        onClick={() => handleOpenEditReservation(res)}
                        title="Editar Reserva"
                      >
                        <Edit size={14} color="#c25e38" />
                      </button>
                      <a 
                        href={generateWhatsAppURL(res)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-whatsapp" 
                        style={{ padding: '0.35rem 0.5rem', textDecoration: 'none' }}
                        title="Enviar via WhatsApp"
                      >
                        <MessageSquare size={14} />
                      </a>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.5rem', color: 'var(--rose)' }}
                        onClick={() => handleDeleteReservation(res.id)}
                        title="Deletar Reserva"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: FINANCE */}
        {activeTab === 'finance' && (
          <div>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">Faturamento Total Bruto</div>
                <div className="kpi-value" style={{ color: 'var(--primary)' }}>R$ {totalRevenue.toFixed(2)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Total em Caixa (Entradas/Sinais)</div>
                <div className="kpi-value" style={{ color: 'var(--emerald)' }}>R$ {totalReceived.toFixed(2)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Total a Receber (Pendências)</div>
                <div className="kpi-value" style={{ color: 'var(--amber)' }}>R$ {totalPending.toFixed(2)}</div>
              </div>
            </div>

            <div className="table-container">
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Relatório Detalhado de Recebimentos</h3>
                <button className="btn btn-success" onClick={handleExportCSV}>
                  <FileSpreadsheet size={16} /> Baixar Relatório Excel (.CSV)
                </button>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Propriedade</th>
                    <th>Hóspede</th>
                    <th>Valor Total</th>
                    <th>Entrada (Sinal)</th>
                    <th>Saldo Devedor</th>
                    <th>Taxa Limpeza</th>
                    <th>Status Pagamento</th>
                    <th>Responsável Venda</th>
                    <th>Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map(res => (
                    <tr key={res.id}>
                      <td>
                        <span className="property-color-dot" style={{ backgroundColor: res.propertyColor || '#c25e38', marginRight: '0.4rem' }}></span>
                        {res.propertyName}
                      </td>
                      <td style={{ fontWeight: 600 }}>{res.guestName}</td>
                      <td style={{ fontWeight: 700 }}>R$ {res.totalAmount?.toFixed(2)}</td>
                      <td style={{ color: 'var(--emerald)', fontWeight: 600 }}>R$ {res.depositAmount?.toFixed(2)}</td>
                      <td style={{ color: res.balanceDue > 0 ? 'var(--rose)' : 'var(--text-muted)', fontWeight: 700 }}>
                        R$ {res.balanceDue?.toFixed(2)}
                      </td>
                      <td>R$ {res.cleaningFee?.toFixed(2)}</td>
                      <td>
                        <span className={`badge badge-${res.paymentStatus}`}>
                          {res.paymentStatus}
                        </span>
                      </td>
                      <td>{res.salesRepName}</td>
                      <td>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                          onClick={() => handleOpenEditReservation(res)}
                        >
                          <Edit size={14} /> Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PROPERTIES, RULES & PIX */}
        {activeTab === 'properties' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Propriedades, Regras & Dados PIX</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cadastre suas propriedades, adicione as chaves PIX de recebimento e configure as regras da casa.</p>
              </div>
              <button className="btn btn-primary" onClick={handleOpenNewProp}>
                <Plus size={18} /> Nova Propriedade
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {properties.map(prop => (
                <div key={prop.id} className="glass-card" style={{ background: '#fff', borderTop: `4px solid ${prop.color || '#c25e38'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="property-color-dot" style={{ backgroundColor: prop.color || '#c25e38', width: 14, height: 14 }}></span>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{prop.name}</h4>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{prop.address || 'Sem endereço informado'}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem' }} onClick={() => handleOpenEditProp(prop)} title="Editar Propriedade e Dados PIX">
                        <Edit size={16} color="#c25e38" />
                      </button>
                      {properties.length > 1 && (
                        <button className="btn btn-secondary" style={{ padding: '0.35rem', color: 'var(--rose)' }} onClick={() => handleDeleteProperty(prop.id)} title="Excluir Propriedade">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', marginBottom: '1rem', background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                    <div>⏰ <strong>Check-in:</strong> {prop.checkInTime || '14:00'}</div>
                    <div>⏰ <strong>Check-out:</strong> {prop.checkOutTime || '11:00'}</div>
                  </div>

                  {/* PIX INFO DISPLAY */}
                  <div style={{ background: 'var(--primary-light)', border: '1px solid var(--border-focus)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <QrCode size={16} /> DADOS DE PAGAMENTO PIX:
                      </strong>
                      {prop.pixInfo && (
                        <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleCopyPix(prop.pixInfo)}>
                          <Copy size={12} /> {copiedPixNotice ? 'Copiado!' : 'Copiar'}
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                      {prop.pixInfo || '⚠️ Nenhuma chave PIX cadastrada. Clique no ícone de lápis para adicionar.'}
                    </p>
                  </div>

                  {/* CHECKLIST */}
                  <div style={{ marginBottom: '1rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>🎒 Checklist do Hóspede (O que levar):</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '0.3rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {(prop.itemsToBring || []).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                    <strong style={{ color: 'var(--primary)' }}>📜 Regras & Termos:</strong>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{prop.rules}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Users & Permissions List */}
            <div className="table-container">
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Controle de Permissões de Usuários</h3>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nome do Usuário</th>
                    <th>E-mail</th>
                    <th>Função no Sistema</th>
                    <th>Permissão de Edição</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td><span className="badge badge-pago">{u.role}</span></td>
                      <td>{u.canEdit ? '✓ Leitura, Edição e Reservas' : '👁 Apenas Leitura'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE RESERVA SELECIONADA DO CALENDÁRIO */}
      {selectedReservation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Reserva #{selectedReservation.id} — {selectedReservation.guestName}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setSelectedReservation(null)}>✕</button>
            </div>

            <div>
              <p><strong>Propriedade:</strong> {selectedReservation.propertyName}</p>
              <p><strong>Telefone:</strong> {selectedReservation.phone}</p>
              <p><strong>E-mail:</strong> {selectedReservation.email}</p>
              <p><strong>CPF:</strong> {selectedReservation.cpf || 'Não inf.'}</p>
              <p><strong>Período:</strong> {selectedReservation.checkIn} até {selectedReservation.checkOut}</p>
              <p><strong>Valor Total:</strong> R$ {selectedReservation.totalAmount?.toFixed(2)}</p>
              <p><strong>Entrada / Sinal:</strong> R$ {selectedReservation.depositAmount?.toFixed(2)}</p>
              <p><strong>Saldo Devedor:</strong> R$ {selectedReservation.balanceDue?.toFixed(2)}</p>
              <p><strong>Vendedor:</strong> {selectedReservation.salesRepName}</p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => handleOpenEditReservation(selectedReservation)}
              >
                <Edit size={16} /> Editar Dados
              </button>

              <a 
                href={generateWhatsAppURL(selectedReservation)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-whatsapp"
                style={{ textDecoration: 'none' }}
              >
                <MessageSquare size={16} /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR OU EDITAR PROPRIEDADE */}
      {showPropModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {editingPropId ? 'Editar Propriedade' : 'Nova Propriedade'}
            </h3>

            <form onSubmit={handleSaveProperty} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Nome da Propriedade *</label>
                  <input required className="form-input" value={propFormData.name} onChange={(e) => setPropFormData({ ...propFormData, name: e.target.value })} placeholder="Ex: Chalé Recanto" />
                </div>
                <div className="form-group">
                  <label>Cor de Identificação no Calendário</label>
                  <input type="color" className="form-input" style={{ height: 44, padding: 4 }} value={propFormData.color} onChange={(e) => setPropFormData({ ...propFormData, color: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label>Endereço Completo</label>
                <input className="form-input" value={propFormData.address} onChange={(e) => setPropFormData({ ...propFormData, address: e.target.value })} placeholder="Rua / Estrada, Nº, Bairro" />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Horário de Check-in</label>
                  <input className="form-input" value={propFormData.checkInTime} onChange={(e) => setPropFormData({ ...propFormData, checkInTime: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Horário de Check-out</label>
                  <input className="form-input" value={propFormData.checkOutTime} onChange={(e) => setPropFormData({ ...propFormData, checkOutTime: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <QrCode size={16} /> Chave PIX & Dados para Pagamento (Sinal / Saldo)
                </label>
                <input 
                  className="form-input" 
                  value={propFormData.pixInfo} 
                  onChange={(e) => setPropFormData({ ...propFormData, pixInfo: e.target.value })} 
                  placeholder="Ex: Chave CNPJ: 12.345.678/0001-90 (Banco Itaú - Solar das Palmeiras)" 
                />
              </div>

              <div className="form-group">
                <label>Itens que o Hóspede Deve Levar (um por linha)</label>
                <textarea 
                  rows={3} 
                  className="form-textarea" 
                  value={propFormData.itemsToBring} 
                  onChange={(e) => setPropFormData({ ...propFormData, itemsToBring: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label>Regras da Casa & Horários</label>
                <textarea rows={2} className="form-textarea" value={propFormData.rules} onChange={(e) => setPropFormData({ ...propFormData, rules: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Termos de Concordância / Mini Contrato</label>
                <textarea rows={3} className="form-textarea" value={propFormData.contractTerms} onChange={(e) => setPropFormData({ ...propFormData, contractTerms: e.target.value })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPropModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Propriedade</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR OU EDITAR RESERVA (DATAS PASSADAS BLOQUEADAS) */}
      {showReservationModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {editingReservationId ? `Editar Reserva #${editingReservationId}` : 'Nova Reserva de Propriedade'}
            </h3>

            {conflictError && (
              <div className="alert-danger">
                {conflictError}
              </div>
            )}

            <form onSubmit={handleSaveReservation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Propriedade *</label>
                <select className="form-select" name="propertyId" value={formData.propertyId} onChange={handleInputChange}>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Nome do Hóspede / Pessoa *</label>
                  <input required className="form-input" name="guestName" value={formData.guestName} onChange={handleInputChange} placeholder="Ex: Maria Santos" />
                </div>
                <div className="form-group">
                  <label>Telefone / WhatsApp *</label>
                  <input required className="form-input" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="(11) 99999-8888" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>E-mail</label>
                  <input className="form-input" name="email" value={formData.email} onChange={handleInputChange} placeholder="hospede@email.com" />
                </div>
                <div className="form-group">
                  <label>CPF (Opcional)</label>
                  <input className="form-input" name="cpf" value={formData.cpf} onChange={handleInputChange} placeholder="000.000.000-00" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Data Check-in * (Hoje em diante)</label>
                  <input required type="date" min={todayStr} className="form-input" name="checkIn" value={formData.checkIn} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Data Check-out *</label>
                  <input required type="date" min={formData.checkIn || todayStr} className="form-input" name="checkOut" value={formData.checkOut} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Valor Total da Reserva (R$) *</label>
                  <input required type="number" step="0.01" className="form-input" name="totalAmount" value={formData.totalAmount} onChange={handleInputChange} placeholder="1500.00" />
                </div>
                <div className="form-group">
                  <label>Entrada / Sinal Pago (R$)</label>
                  <input type="number" step="0.01" className="form-input" name="depositAmount" value={formData.depositAmount} onChange={handleInputChange} placeholder="500.00" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Taxa de Limpeza (R$)</label>
                  <input type="number" step="0.01" className="form-input" name="cleaningFee" value={formData.cleaningFee} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Responsável pela Venda</label>
                  <select className="form-select" name="salesRepId" value={formData.salesRepId} onChange={handleInputChange}>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReservationModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingReservationId ? 'Salvar Alterações' : 'Confirmar Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
