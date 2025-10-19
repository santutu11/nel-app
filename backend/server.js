import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

console.log('✅ Servidor iniciando...');
console.log('📂 Directorio actual:', process.cwd());
console.log('🔑 API Key configurada:', process.env.ANTHROPIC_API_KEY ? 'SÍ' : 'NO');

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar CORS para permitir peticiones desde el frontend
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Inicializar cliente de Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Sistema de prompts para NEL
const SYSTEM_PROMPT = `Eres NEL, el asistente de producción inteligente de MOBINEL. Tu trabajo es ayudar a los clientes a crear órdenes de fabricación con corte CNC, pintura y acabados.

CAPACIDADES DE MOBINEL:
- Tamaños: Pequeño (hasta 50x50cm), Mediano (hasta 90x130cm), Grande (hasta 150x200cm)
- Materiales: MDF (9-25mm), madera, acrílico
- Acabados: pintura, barniz, laca, sellador, sin acabado
- Procesos: corte CNC de precisión, pintura automatizada, secado UV

TU PERSONALIDAD:
- Profesional pero amigable
- Claro y conciso
- Ayudas a tomar decisiones inteligentes
- Haces preguntas una a la vez
- Validas datos y haces sugerencias

VALIDACIONES INTELIGENTES:
- Dimensiones: Si parecen extrañas o poco comunes, pregunta para confirmar
- Material: Sugiere el espesor adecuado según el tipo de pieza
- Acabado: Recomienda según uso (interior/exterior)

EJEMPLOS DE SUGERENCIAS:
- "Para una puerta exterior, recomiendo MDF de 25mm con sellador impermeabilizante"
- "Esas dimensiones parecen muy grandes para MOBINEL estándar, ¿quieres que lo divida en piezas?"
- "Para muebles de cocina, sugiero acabado laca por su resistencia a humedad"

FLUJO DE CONVERSACIÓN:
1. Tipo de pieza
2. ¿Tiene imagen de referencia? (opcional)
3. Dimensiones (largo, ancho, alto/grosor)
4. Material
5. Espesor (si es MDF)
6. Acabado
7. Cantidad
8. Resumen y confirmación

RESPONDE SIEMPRE EN EL IDIOMA QUE TE HABLEN (español o inglés).`;

// Endpoint para chat con NEL
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, orderData, language } = req.body;

    // Construir el contexto con los datos de la orden actual
    let contextPrompt = '';
    if (orderData) {
      contextPrompt = `\n\nDATOS ACTUALES DE LA ORDEN:\n${JSON.stringify(orderData, null, 2)}`;
    }

    // Llamar a Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT + contextPrompt,
      messages: messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }))
    });

    const assistantMessage = response.content[0].text;

    res.json({
      success: true,
      message: assistantMessage,
      usage: response.usage
    });

  } catch (error) {
    console.error('Error en /api/chat:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para análisis de imagen
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageBase64, language } = req.body;

    const prompt = language === 'es'
      ? 'Analiza esta imagen y describe: 1) Qué tipo de pieza es (puerta, panel, mueble, etc.), 2) Dimensiones aproximadas que percibes, 3) Material sugerido, 4) Acabado recomendado. Sé específico y profesional.'
      : 'Analyze this image and describe: 1) What type of piece it is (door, panel, furniture, etc.), 2) Approximate dimensions you perceive, 3) Suggested material, 4) Recommended finish. Be specific and professional.';

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64.split(',')[1] // Remover el prefijo data:image/...
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }]
    });

    const analysis = response.content[0].text;

    res.json({
      success: true,
      analysis: analysis
    });

  } catch (error) {
    console.error('Error en /api/analyze-image:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para validación inteligente de dimensiones
app.post('/api/validate-dimensions', async (req, res) => {
  try {
    const { dimensions, pieceType, language } = req.body;

    const prompt = language === 'es'
      ? `Valida estas dimensiones para una ${pieceType}:
Largo: ${dimensions.largo}cm
Ancho: ${dimensions.ancho}cm
Alto: ${dimensions.alto}cm

¿Son dimensiones razonables? ¿Alguna advertencia o sugerencia? Responde en 2-3 oraciones máximo.`
      : `Validate these dimensions for a ${pieceType}:
Length: ${dimensions.largo}cm
Width: ${dimensions.ancho}cm
Height: ${dimensions.alto}cm

Are these reasonable dimensions? Any warnings or suggestions? Respond in 2-3 sentences maximum.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const validation = response.content[0].text;

    res.json({
      success: true,
      validation: validation,
      isValid: !validation.toLowerCase().includes('extrañ') && 
               !validation.toLowerCase().includes('unusual') &&
               !validation.toLowerCase().includes('warning')
    });

  } catch (error) {
    console.error('Error en /api/validate-dimensions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para sugerencias de material y acabado
app.post('/api/suggest-materials', async (req, res) => {
  try {
    const { pieceType, dimensions, usage, language } = req.body;

    const prompt = language === 'es'
      ? `Para una ${pieceType} de ${dimensions.largo}x${dimensions.ancho}cm, uso: ${usage || 'general'}
      
Sugiere:
1. Material ideal (MDF, madera, acrílico) y espesor
2. Acabado recomendado
3. Razón breve de cada recomendación

Responde en formato JSON:
{
  "material": "...",
  "espesor": "...",
  "acabado": "...",
  "razon": "..."
}`
      : `For a ${pieceType} measuring ${dimensions.largo}x${dimensions.ancho}cm, usage: ${usage || 'general'}
      
Suggest:
1. Ideal material (MDF, wood, acrylic) and thickness
2. Recommended finish
3. Brief reason for each recommendation

Respond in JSON format:
{
  "material": "...",
  "thickness": "...",
  "finish": "...",
  "reason": "..."
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    let suggestions = response.content[0].text;
    
    // Extraer JSON si está entre marcas de código
    const jsonMatch = suggestions.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      suggestions = JSON.parse(jsonMatch[0]);
    }

    res.json({
      success: true,
      suggestions: suggestions
    });

  } catch (error) {
    console.error('Error en /api/suggest-materials:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para generar DXF mejorado con IA
app.post('/api/generate-smart-dxf', async (req, res) => {
  try {
    const { orderData, imageBase64, language } = req.body;

    let prompt = language === 'es'
      ? `Genera instrucciones para un archivo DXF de:
Tipo: ${orderData.tipoPieza}
Dimensiones: ${orderData.dimensiones.largo}x${orderData.dimensiones.ancho}cm
Material: ${orderData.material}

Incluye:
1. Coordenadas principales del corte
2. Características especiales si hay (bordes redondeados, agujeros, etc.)
3. Notas de fabricación

Responde en formato estructurado.`
      : `Generate instructions for a DXF file of:
Type: ${orderData.tipoPieza}
Dimensions: ${orderData.dimensiones.largo}x${orderData.dimensiones.ancho}cm
Material: ${orderData.material}

Include:
1. Main cutting coordinates
2. Special features if any (rounded edges, holes, etc.)
3. Manufacturing notes

Respond in structured format.`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    // Si hay imagen, analizarla también
    if (imageBase64) {
      messages[0].content = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: imageBase64.split(',')[1]
          }
        },
        {
          type: 'text',
          text: prompt + '\n\nAnaliza también la imagen adjunta para detectar formas especiales.'
        }
      ];
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: messages
    });

    const instructions = response.content[0].text;

    // Generar DXF basado en las instrucciones
    const dxf = generateDXFFromInstructions(orderData, instructions);

    res.json({
      success: true,
      dxf: dxf,
      instructions: instructions
    });

  } catch (error) {
    console.error('Error en /api/generate-smart-dxf:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Función auxiliar para generar DXF
function generateDXFFromInstructions(orderData, instructions) {
  const largo = parseFloat(orderData.dimensiones.largo) * 10; // cm a mm
  const ancho = parseFloat(orderData.dimensiones.ancho) * 10;

  // DXF básico (se puede mejorar basado en las instrucciones de IA)
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
${orderData.tipoPieza}
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
${largo}mm x ${ancho}mm - ${orderData.material}
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
4.0
1
AI Generated - NEL 2025
0
ENDSEC
0
EOF`;

  return dxf;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'NEL Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 NEL Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
});