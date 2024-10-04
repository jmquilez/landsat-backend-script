// lib/openaiHelper.ts
import OpenAI from 'openai';

// Inicializar OpenAI con tu clave de API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!, // Asegúrate de definir tu clave API en .env.local
});

// Función que llama a OpenAI y acepta un mensaje dinámico
export async function callGPTWithDynamicData(dynamicData: string) {
  // El mensaje con datos dinámicos
  const prompt = `Este es un mensaje fijo con un dato dinámico: ${dynamicData}`;

  try {
    // Llama a la API de OpenAI con el mensaje dinámico
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-3.5-turbo', // Cambia a 'gpt-4' si está disponible
    });

    return chatCompletion.choices[0].message.content; // Devuelve la respuesta de GPT
  } catch (error) {
    throw new Error('Error fetching GPT response');
  }
}
