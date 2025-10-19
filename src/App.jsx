import React, { useState, useEffect, useRef } from 'react';
import { List, Send, Package, Ruler, Layers, FileCode, Lock, LogOut, Download, Eye, Globe, Upload, Image as ImageIcon, Edit2, Check, X } from 'lucide-react';

const BACKEND_URL = 'http://localhost:3001';

export default function NELApp() {
  // Estados principales
  const [language, setLanguage] = useState('es');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [view, setView] = useState('chat');
  
  // Estados del chat
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationState, setConversationState] = useState('greeting');
  
  // Estados de la orden
  const [orderData, setOrderData] = useState({
    tipoPieza: '',
    dimensiones: { largo: '', ancho: '', alto: '' },
    material: '',
    espesorMaterial: '',
    acabado: '',
    cantidad: '',
    imagenReferencia: null
  });
  
  // Estados del admin
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingDXF, setEditingDXF] = useState(false);
  const [editedDXF, setEditedDXF] = useState('');
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'mobinel2025'
  };

  const translations = {
    es: {
      greeting: '¡Hola! Soy NEL, tu asistente de producción inteligente. 🤖\n\nEstoy aquí para ayudarte a crear tu orden de fabricación personalizada con MOBINEL.\n\n¿Qué tipo de pieza necesitas fabricar hoy?',
      chat: 'Chat',
      adminPanel: 'Panel Admin',
      logout: 'Cerrar Sesión',
      switchLanguage: 'Switch to English',
      login: 'Iniciar Sesión',
      username: 'Usuario',
      password: 'Contraseña',
      orders: 'Órdenes',
      orderDetails: 'Detalles de la Orden',
      status: 'Estado',
      pending: 'Pendiente',
      inProduction: 'En Producción',
      completed: 'Completada',
      downloadDXF: 'Descargar DXF',
      editDXF: 'Editar DXF',
      saveDXF: 'Guardar DXF',
      cancelEdit: 'Cancelar',
      preview2D: 'Vista Previa 2D',
      referenceImage: 'Imagen de Referencia',
      specifications: 'Especificaciones',
      noOrders: 'No hay órdenes aún',
      uploadImage: '📷 Sube tu imagen'
    },
    en: {
      greeting: 'Hello! I\'m NEL, your intelligent production assistant. 🤖\n\nI\'m here to help you create your custom manufacturing order with MOBINEL.\n\nWhat type of piece do you need to manufacture today?',
      chat: 'Chat',
      adminPanel: 'Admin Panel',
      logout: 'Logout',
      switchLanguage: 'Cambiar a Español',
      login: 'Login',
      username: 'Username',
      password: 'Password',
      orders: 'Orders',
      orderDetails: 'Order Details',
      status: 'Status',
      pending: 'Pending',
      inProduction: 'In Production',
      completed: 'Completed',
      downloadDXF: 'Download DXF',
      editDXF: 'Edit DXF',
      saveDXF: 'Save DXF',
      cancelEdit: 'Cancel',
      preview2D: '2D Preview',
      referenceImage: 'Reference Image',
      specifications: 'Specifications',
      noOrders: 'No orders yet',
      uploadImage: '📷 Upload your image'
    }
  };

  const t = translations[language];

  useEffect(() => {
    const savedOrders = localStorage.getItem('nelOrders');
    if (savedOrders) {
      setOrders(JSON.parse(savedOrders));
    }
    addMessage('nel', t.greeting);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text, timestamp: new Date() }]);
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const extractNumber = (text) => {
    const match = text.match(/(\d+\.?\d*)/);
    return match ? match[0] : null;
  };

  // Llamar al backend para obtener respuesta de Claude
  const getClaudeResponse = async (userMessage) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(m => ({ sender: m.sender, text: m.text })).concat([
            { sender: 'user', text: userMessage }
          ]),
          orderData: orderData,
          language: language
        })
      });

      const data = await response.json();
      
      if (data.success) {
        return data.message;
      } else {
        return language === 'es' 
          ? 'Lo siento, hubo un error. ¿Puedes repetir tu respuesta?'
          : 'Sorry, there was an error. Can you repeat your answer?';
      }
    } catch (error) {
      console.error('Error calling Claude API:', error);
      return language === 'es'
        ? 'Error de conexión. Por favor verifica que el servidor esté corriendo.'
        : 'Connection error. Please verify the server is running.';
    }
  };

  // Analizar imagen con Claude
  const analyzeImage = async (imageBase64) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imageBase64,
          language: language
        })
      });

      const data = await response.json();
      
      if (data.success) {
        return data.analysis;
      }
      return null;
    } catch (error) {
      console.error('Error analyzing image:', error);
      return null;
    }
  };

  const getMOBINELSize = (largo, ancho) => {
    const largoNum = parseFloat(largo);
    const anchoNum = parseFloat(ancho);

    if (largoNum <= 50 && anchoNum <= 50) {
      return {
        size: language === 'es' ? 'Pequeño' : 'Small',
        capacity: '500mm x 500mm x 250mm',
        description: language === 'es' 
          ? 'Ideal para piezas decorativas y pequeños componentes'
          : 'Ideal for decorative pieces and small components',
        color: 'green'
      };
    } else if (largoNum <= 90 && anchoNum <= 130) {
      return {
        size: language === 'es' ? 'Mediano (Estándar)' : 'Medium (Standard)',
        capacity: '900mm x 1300mm x 1000mm',
        description: language === 'es'
          ? 'Configuración estándar para la mayoría de proyectos'
          : 'Standard configuration for most projects',
        color: 'blue'
      };
    } else {
      return {
        size: language === 'es' ? 'Grande (Especial)' : 'Large (Special)',
        capacity: '1500mm x 2000mm x 1200mm',
        description: language === 'es'
          ? 'Para proyectos de gran formato - requiere configuración ampliada'
          : 'For large format projects - requires expanded configuration',
        color: 'orange'
      };
    }
  };

  const generateDXF = (data) => {
    const largo = parseFloat(data.dimensiones.largo) * 10;
    const ancho = parseFloat(data.dimensiones.ancho) * 10;

    const dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
9
$INSUNITS
70
4
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
0
10
0.0
20
0.0
30
0.0
11
${largo}
21
0.0
31
0.0
0
LINE
8
0
10
${largo}
20
0.0
30
0.0
11
${largo}
21
${ancho}
31
0.0
0
LINE
8
0
10
${largo}
20
${ancho}
30
0.0
11
0.0
21
${ancho}
31
0.0
0
LINE
8
0
10
0.0
20
${ancho}
30
0.0
11
0.0
21
0.0
31
0.0
0
TEXT
8
0
10
${largo/2}
20
${ancho/2}
30
0.0
40
10.0
1
${data.tipoPieza}
0
TEXT
8
0
10
5.0
20
${ancho + 10}
30
0.0
40
5.0
1
${largo}mm x ${ancho}mm
0
TEXT
8
0
10
5.0
20
${ancho + 20}
30
0.0
40
5.0
1
Material: ${data.material} ${data.espesorMaterial || ''}
0
TEXT
8
0
10
5.0
20
${ancho + 30}
30
0.0
40
5.0
1
Acabado: ${data.acabado}
0
TEXT
8
0
10
5.0
20
${ancho + 40}
30
0.0
40
5.0
1
Cantidad: ${data.cantidad}
0
TEXT
8
0
10
5.0
20
${ancho + 50}
30
0.0
40
4.0
1
AI Generated by NEL - MOBINEL 2025
0
ENDSEC
0
EOF`;
    
    return dxf;
  };

  const generateOrderSummary = (data) => {
    const fields = language === 'es' 
      ? ['🔹 **Tipo:**', '🔹 **Dimensiones:**', '🔹 **Material:**', '🔹 **Acabado:**', '🔹 **Cantidad:**']
      : ['🔹 **Type:**', '🔹 **Dimensions:**', '🔹 **Material:**', '🔹 **Finish:**', '🔹 **Quantity:**'];
    
    return `${fields[0]} ${data.tipoPieza}
${fields[1]} ${data.dimensiones.largo} x ${data.dimensiones.ancho}${data.dimensiones.alto !== '0' ? ` x ${data.dimensiones.alto}` : ''} cm
${fields[2]} ${data.material} ${data.espesorMaterial || ''}
${fields[3]} ${data.acabado}
${fields[4]} ${data.cantidad} ${language === 'es' ? 'unidad(es)' : 'unit(s)'}`;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageBase64 = event.target.result;
        setOrderData(prev => ({ ...prev, imagenReferencia: imageBase64 }));
        addMessage('user', '📷 [Imagen subida]');
        
        setIsTyping(true);
        const analysis = await analyzeImage(imageBase64);
        setIsTyping(false);
        
        if (analysis) {
          addMessage('nel', `📸 Análisis de imagen:\n\n${analysis}\n\n¿Estás de acuerdo con este análisis o quieres modificar algo?`);
        } else {
          addMessage('nel', language === 'es' 
            ? 'Imagen recibida. Ahora dime las dimensiones que necesitas.\n\n📏 **Largo** (en cm):'
            : 'Image received. Now tell me the dimensions you need.\n\n📏 **Length** (in cm):');
        }
        setConversationState('askLargo');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    addMessage('user', userMessage);
    setInputValue('');
    setIsTyping(true);

    await sleep(500);

    // Usar IA de Claude para responder
    const claudeResponse = await getClaudeResponse(userMessage);
    
    setIsTyping(false);
    addMessage('nel', claudeResponse);

    // Detectar intenciones básicas para actualizar el estado de la orden
    const lowerMessage = userMessage.toLowerCase();
    
    // Extraer datos simples de la respuesta
    if (conversationState === 'greeting' && !orderData.tipoPieza) {
      setOrderData(prev => ({ ...prev, tipoPieza: userMessage }));
      setConversationState('askImage');
    } else if (conversationState === 'askImage' && lowerMessage.includes('no')) {
      setConversationState('askLargo');
    } else if (conversationState === 'askLargo') {
      const largo = extractNumber(userMessage);
      if (largo) {
        setOrderData(prev => ({ ...prev, dimensiones: { ...prev.dimensiones, largo } }));
        setConversationState('askAncho');
      }
    } else if (conversationState === 'askAncho') {
      const ancho = extractNumber(userMessage);
      if (ancho) {
        setOrderData(prev => ({ ...prev, dimensiones: { ...prev.dimensiones, ancho } }));
        setConversationState('askAlto');
      }
    } else if (conversationState === 'askAlto') {
      const alto = extractNumber(userMessage) || '0';
      setOrderData(prev => ({ ...prev, dimensiones: { ...prev.dimensiones, alto } }));
      setConversationState('askMaterial');
    } else if (conversationState === 'askMaterial' && !orderData.material) {
      setOrderData(prev => ({ ...prev, material: userMessage }));
      if (userMessage.toLowerCase().includes('mdf')) {
        setConversationState('askEspesor');
      } else {
        setConversationState('askAcabado');
      }
    } else if (conversationState === 'askEspesor') {
      const espesor = extractNumber(userMessage);
      if (espesor) {
        setOrderData(prev => ({ ...prev, espesorMaterial: espesor + 'mm' }));
        setConversationState('askAcabado');
      }
    } else if (conversationState === 'askAcabado' && !orderData.acabado) {
      setOrderData(prev => ({ ...prev, acabado: userMessage }));
      setConversationState('askCantidad');
    } else if (conversationState === 'askCantidad' && !orderData.cantidad) {
      const cantidad = extractNumber(userMessage);
      if (cantidad) {
        setOrderData(prev => ({ ...prev, cantidad }));
        setConversationState('confirmation');
      }
    } else if (lowerMessage.includes('confirmar') || lowerMessage.includes('confirm')) {
      // Crear orden
      const dxfContent = generateDXF(orderData);
      
      const newOrder = {
        id: Date.now(),
        ...orderData,
        status: 'pending',
        mobinelSize: getMOBINELSize(
          orderData.dimensiones.largo,
          orderData.dimensiones.ancho
        ),
        dxfFile: dxfContent,
        createdAt: new Date().toISOString()
      };
      
      const updatedOrders = [...orders, newOrder];
      setOrders(updatedOrders);
      localStorage.setItem('nelOrders', JSON.stringify(updatedOrders));
      
      setConversationState('completed');
    } else if (lowerMessage.includes('nueva') || lowerMessage.includes('new')) {
      setOrderData({ tipoPieza: '', dimensiones: { largo: '', ancho: '', alto: '' }, material: '', espesorMaterial: '', acabado: '', cantidad: '', imagenReferencia: null });
      setConversationState('greeting');
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.username === ADMIN_CREDENTIALS.username && 
        loginForm.password === ADMIN_CREDENTIALS.password) {
      setIsAuthenticated(true);
      setView('admin');
    } else {
      alert(language === 'es' ? 'Credenciales incorrectas' : 'Invalid credentials');
    }
  };

  const downloadDXF = (order) => {
    const blob = new Blob([order.dxfFile], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MOBINEL_Order_${order.id}.dxf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const changeOrderStatus = (orderId, newStatus) => {
    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('nelOrders', JSON.stringify(updatedOrders));
  };

  const saveDXFEdit = () => {
    const updatedOrders = orders.map(order =>
      order.id === selectedOrder.id ? { ...order, dxfFile: editedDXF } : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('nelOrders', JSON.stringify(updatedOrders));
    setSelectedOrder({ ...selectedOrder, dxfFile: editedDXF });
    setEditingDXF(false);
  };

  const Preview2D = ({ order }) => {
    const largo = parseFloat(order.dimensiones.largo);
    const ancho = parseFloat(order.dimensiones.ancho);
    const maxDim = Math.max(largo, ancho);
    const scale = 200 / maxDim;
    
    return (
      <div className="bg-white border-2 border-gray-300 rounded-lg p-4 flex items-center justify-center" style={{ minHeight: '250px' }}>
        <svg width={largo * scale + 40} height={ancho * scale + 60} className="border border-gray-400">
          <rect 
            x="20" 
            y="20" 
            width={largo * scale} 
            height={ancho * scale} 
            fill="none" 
            stroke="#2563eb" 
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          <text x={largo * scale / 2 + 20} y={ancho * scale / 2 + 20} textAnchor="middle" fontSize="12" fill="#1e40af">
            {order.tipoPieza}
          </text>
          <text x={largo * scale / 2 + 20} y={ancho * scale + 40} textAnchor="middle" fontSize="10" fill="#64748b">
            {largo} x {ancho} cm
          </text>
        </svg>
      </div>
    );
  };

  if (!isAuthenticated && view === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Package className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-2">NEL 2025</h1>
          <p className="text-slate-400 text-center mb-8">{t.adminPanel}</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t.username}</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t.password}</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-5 h-5" />
              {t.login}
            </button>
          </form>
          
          <button
            onClick={() => setView('chat')}
            className="w-full mt-4 text-slate-400 hover:text-white transition-colors"
          >
            ← {t.chat}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <header className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">NEL 2025</h1>
              <p className="text-xs text-slate-400">
                {language === 'es' ? 'Asistente de Producción IA' : 'AI Production Assistant'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-2 transition-all text-sm"
            >
              <Globe className="w-4 h-4" />
              {language === 'es' ? 'EN' : 'ES'}
            </button>
            
            {!isAuthenticated ? (
              <button
                onClick={() => setView('admin')}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Admin
              </button>
            ) : (
              <>
                <button
                  onClick={() => setView(view === 'chat' ? 'admin' : 'chat')}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                    view === 'admin'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {view === 'admin' ? <List className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {view === 'admin' ? t.orders : t.chat}
                </button>
                <button
                  onClick={() => {
                    setIsAuthenticated(false);
                    setView('chat');
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  {t.logout}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {view === 'chat' && (
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : 'bg-slate-700 text-slate-100'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                      {msg.sender === 'user' && msg.text.includes('📷') && orderData.imagenReferencia && (
                        <img src={orderData.imagenReferencia} alt="Referencia" className="mt-2 rounded-lg max-w-xs" />
                      )}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-slate-700 p-4 bg-slate-800/80">
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {conversationState === 'askImage' && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center gap-2"
                    >
                      <Upload className="w-5 h-5" />
                      {t.uploadImage}
                    </button>
                  )}
                  
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={language === 'es' ? 'Escribe tu mensaje...' : 'Type your message...'}
                    className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'admin' && isAuthenticated && (
        <div className="container mx-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 120px)' }}>
            <div className="lg:col-span-1 bg-slate-800/50 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 p-4 overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">{t.orders}</h2>
              
              {orders.length === 0 ? (
                <p className="text-slate-400 text-center py-8">{t.noOrders}</p>
              ) : (
                <div className="space-y-2">
                  {orders.map(order => (
                    <button
                      key={order.id}
                      onClick={() => {
                        setSelectedOrder(order);
                        setEditingDXF(false);
                      }}
                      className={`w-full text-left p-4 rounded-lg transition-all ${
                        selectedOrder?.id === order.id
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold">#{order.id}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                          order.status === 'inProduction' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-green-500/20 text-green-300'
                        }`}>
                          {order.status === 'pending' ? t.pending : 
                           order.status === 'inProduction' ? t.inProduction : 
                           t.completed}
                        </span>
                      </div>
                      <p className="text-sm opacity-90">{order.tipoPieza}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {order.dimensiones.largo} x {order.dimensiones.ancho} cm
                      </p>
                      <p className="text-xs opacity-60 mt-1">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 p-6 overflow-y-auto">
              {selectedOrder ? (
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">{t.orderDetails} #{selectedOrder.id}</h2>
                      <p className="text-slate-400">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                    </div>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => changeOrderStatus(selectedOrder.id, e.target.value)}
                      className="px-4 py-2 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="pending">{t.pending}</option>
                      <option value="inProduction">{t.inProduction}</option>
                      <option value="completed">{t.completed}</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Ruler className="w-5 h-5 text-blue-400" />
                        {t.specifications}
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">{language === 'es' ? 'Tipo:' : 'Type:'}</span>
                          <span className="text-white font-medium">{selectedOrder.tipoPieza}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{language === 'es' ? 'Dimensiones:' : 'Dimensions:'}</span>
                          <span className="text-white font-medium">
                            {selectedOrder.dimensiones.largo} x {selectedOrder.dimensiones.ancho}
                            {selectedOrder.dimensiones.alto !== '0' && ` x ${selectedOrder.dimensiones.alto}`} cm
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{language === 'es' ? 'Material:' : 'Material:'}</span>
                          <span className="text-white font-medium">
                            {selectedOrder.material} {selectedOrder.espesorMaterial}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{language === 'es' ? 'Acabado:' : 'Finish:'}</span>
                          <span className="text-white font-medium">{selectedOrder.acabado}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{language === 'es' ? 'Cantidad:' : 'Quantity:'}</span>
                          <span className="text-white font-medium">{selectedOrder.cantidad}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-600">
                          <span className="text-slate-400">MOBINEL:</span>
                          <span className={`font-medium ${
                            selectedOrder.mobinelSize.color === 'green' ? 'text-green-400' :
                            selectedOrder.mobinelSize.color === 'blue' ? 'text-blue-400' :
                            'text-orange-400'
                          }`}>
                            {selectedOrder.mobinelSize.size}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedOrder.imagenReferencia && (
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                          <ImageIcon className="w-5 h-5 text-orange-400" />
                          {t.referenceImage}
                        </h3>
                        <img 
                          src={selectedOrder.imagenReferencia} 
                          alt="Referencia" 
                          className="w-full rounded-lg border-2 border-slate-600"
                        />
                      </div>
                    )}

                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Eye className="w-5 h-5 text-blue-400" />
                        {t.preview2D}
                      </h3>
                      <Preview2D order={selectedOrder} />
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <FileCode className="w-5 h-5 text-green-400" />
                        {language === 'es' ? 'Archivo DXF' : 'DXF File'}
                      </h3>
                      
                      {!editingDXF ? (
                        <div className="space-y-2">
                          <button
                            onClick={() => downloadDXF(selectedOrder)}
                            className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
                          >
                            <Download className="w-5 h-5" />
                            {t.downloadDXF}
                          </button>
                          <button
                            onClick={() => {
                              setEditingDXF(true);
                              setEditedDXF(selectedOrder.dxfFile);
                            }}
                            className="w-full px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-all flex items-center justify-center gap-2"
                          >
                            <Edit2 className="w-5 h-5" />
                            {t.editDXF}
                          </button>
                          <div className="bg-slate-800 rounded p-2 mt-2 max-h-32 overflow-y-auto">
                            <pre className="text-xs text-slate-300 font-mono">
                              {selectedOrder.dxfFile.substring(0, 300)}...
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            value={editedDXF}
                            onChange={(e) => setEditedDXF(e.target.value)}
                            className="w-full h-64 px-3 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveDXFEdit}
                              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
                            >
                              <Check className="w-5 h-5" />
                              {t.saveDXF}
                            </button>
                            <button
                              onClick={() => setEditingDXF(false)}
                              className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-all flex items-center justify-center gap-2"
                            >
                              <X className="w-5 h-5" />
                              {t.cancelEdit}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>{language === 'es' ? 'Selecciona una orden para ver los detalles' : 'Select an order to view details'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}