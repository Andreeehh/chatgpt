const axios = require("axios");
require('dotenv').config();

// Função para enviar uma requisição à API do ChatGPT
async function sendChatRequest(message) {
  
  try {
    const apiKey = process.env.API_KEY;
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo", // Modelo do ChatGPT
        messages: [
          {
            role: "system",
            content:
              "Você é um author de blog de tecnologia web, principais temas, React, Javascript, Estudo para emprego na europa, o post pode ter exemplos de código.",
          },
          { role: "user", content: message },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization:
          `Bearer ${apiKey}`, 
        },
      }
    );

    // Retornar a resposta do ChatGPT
    const reply = response.data.choices[0].message.content;
    return reply;
  } catch (error) {
    console.error("Erro ao enviar a requisição para o ChatGPT:", error);
    return null;
  }
}

async function getJWT() {
  const url = process.env.STRAPI_URL+'api/auth/local';
  const body = {
    identifier: process.env.STRAPI_IDENTIFIER,
    password: process.env.STRAPI_PASSWORD,
  };
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await axios.post(url, body, config);
    const jwt = response.data.jwt;
    return jwt;
  } catch (error) {
    // console.error('Erro ao obter JWT do Strapi:', error.response.data);
    // throw error;
  }
}

async function createPost(jwt, data = {}) {
  const url = process.env.STRAPI_URL+'api/posts';
  const body = {
    data: data,
  };
  console.log("body", body)
  console.log("data", data)
  const config = {
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  };


  try {
    const response = await axios.post(url, body, config);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar post:', error.response.data);
    // throw error;
  }
}


// Exemplo de uso
async function main() {
  const userInput = `Crie mais um post do blog, deve conter um título vindo do prefixo, um resumo curto de no máximo 150 caracteres, e o conteúdo, que pode conter tags html e ser mais longo, separando os paragrafos em tag <p>`;
  const chatResponseContent = await sendChatRequest(userInput);
  // console.log("Resposta do ChatGPT Titulo:", chatResponseContent);
  const titleRegex = /Título:(.*?)\n/;
  const excerptRegex = /Resumo:(.*?)\n\n/;
  const contentRegex = /Conteúdo:\n\n([\s\S]*)/;

  const titleMatch = chatResponseContent.match(titleRegex);
  const excerptMatch = chatResponseContent.match(excerptRegex);
  const contentMatch = chatResponseContent.match(contentRegex);

  const title = titleMatch ? titleMatch[1].trim() : '';
  const excerpt = excerptMatch ? excerptMatch[1].trim() : '';
  const content = contentMatch ? contentMatch[1].trim() : '';
  const slug = title.replace(" ", "-").replace(/[^0-9a-zA-Z-]+/g, "").toLowerCase().slice(0, 50);

  const data = {
    title,
    slug,
    except: excerpt.slice(0, 249),
    content,
    cover: randomInt(2, 100),
    categories: [4, 3, 5],
    tags: [3],
    author: 2,
  }

  const jwt = await getJWT()

  await createPost(jwt, data)
  
}

function randomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Função para agendar a execução do build hook uma vez por dia
function scheduleDailyExecution() {
  // Obter a data e hora atual
  const now = new Date();

  // Definir o horário de execução para as 8h da manhã
  const scheduledTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);

  // Calcular o tempo restante até o próximo agendamento
  let delay = scheduledTime.getTime() - now.getTime();
  if (delay < 0) {
    // Se já passou das 8h da manhã, agendar para o próximo dia
    delay += 24 * 60 * 60 * 1000;
  }

  // Agendar a execução
  setTimeout(() => {
    main();

    // Agendar a próxima execução
    scheduleDailyExecution();
  }, delay);
}

// Iniciar o agendamento da execução
scheduleDailyExecution();


