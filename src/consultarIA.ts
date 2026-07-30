import { RequestInit } from "node:http";

async function consultarIA() {
  const url = "http://localhost:11434/api/generate";

  const payload = {
    model: "qwen2.5-coder:1.5b-base", // Usamos el rápido para no derretir la RAM
    prompt:
      "Hola IA, confirma con la palabra 'CONECTADO' si recibes este mensaje en TypeScript.",
    stream: false,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Error en la petición: ${response.statusText}`);
    }

    const data: any = await response.json();
    console.log("\n🤖 Respuesta de Ollama desde tu código TS:");
    console.log(data.response);
  } catch (error) {
    console.error("❌ Error al conectar con Ollama:", error);
  }
}

consultarIA();
