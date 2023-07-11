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
              "Você é um author de blog de tecnologia web, viagens pelo mundo, e qualquer tema que esteja nas tendências na notícia, crie um post, o post pode ter exemplos de código, emojis, conteúdo markdown, no conteúdo as quebras de linha devem ser substituídas por tags <br>, lembre-se, toda a resposta estará no post, então seja direto para a resposta.",
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
    console.log("resposta gerada")
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
    console.log("jwt gerado")
    return jwt;
  } catch (error) {
    console.error('Erro ao obter JWT do Strapi:', error.response.data);
    // throw error;
  }
}

async function createPost(jwt, data = {}) {
  const url = process.env.STRAPI_URL+'api/posts';
  const body = {
    data: data,
  };
  const config = {
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  };


  try {
    const response = await axios.post(url, body, config);
    console.log("post gerado")
    return response.data;
  } catch (error) {
    console.error('Erro ao criar post:', error.response.data);
    // throw error;
  }
}


// Exemplo de uso
async function main() {
  const userInput = `Crie mais um post do blog, deve conter estar separado por um Título, um Resumo curto de no máximo 150 caracteres, e o Conteúdo markdown que pode conter tags html, separando os parágrafos em tag <p>, cabeçalhos em <h1>, e ser mais longo, no conteúdo as quebras de linha devem ser substituídas por tags <br>, marcando com # ou <h1> as partes importantes`;
  const chatResponseContent = await sendChatRequest(userInput);
  // console.log("Resposta do ChatGPT Titulo:", chatResponseContent);
  const titleRegex = /Título:(.*?)\n/;
  const excerptRegex = /Resumo:(.*?)\n\n/;
  const contentRegex = /Conteúdo:\n\n([\s\S]*)/;

  const titleMatch = chatResponseContent.match(titleRegex);
  const excerptMatch = chatResponseContent.match(excerptRegex);
  const contentMatch = chatResponseContent.match(contentRegex);

  let title = titleMatch ? titleMatch[1].trim() : '';
  if (!title){
    const input = `Crie um titulo do post do blog, começando direto do título`;
    title = await sendChatRequest(input);
  }
  let excerpt = excerptMatch ? excerptMatch[1].trim() : '';
  if (!excerpt){
    const input = `Crie um resumo curto (240 chars) do post do blog com esse título ${title}, começando direto do resumo`;
    excerpt = await sendChatRequest(input);
  }
  let content = contentMatch ? contentMatch[1].trim() : '';
  if (!content){
    const input = `Crie um conteúdo do post do blog com esse título ${title}, Conteúdo markdown que pode conter tags html, separando os parágrafos em tag <p>, cabeçalhos em <h1>, <h2>, etc., e ser mais longo, no conteúdo as quebras de linha devem ser substituídas por tags <br>, marcando com # ou <h1>, <h2>, etc. as partes importantes, começando direto do conteúdo`;
    content = await sendChatRequest(input);
  }
  let slug = title.replace(/ /g, "-").replace(/[^0-9a-zA-Z-]+/g, "").toLowerCase();
  if (slug.length > 50){
    slug = slug.slice(0, 49)
  }
  if (excerpt.length > 250){
    excerpt = excerpt.slice(0, 249)
  }


  if (content.includes("```")){
    content = prettifyCodeContent(content);
  } 


  const data = {
    title,
    slug,
    except: excerpt,
    content: content,
    cover: randomInt(6, 369),
    categories: [4, 3, 5],
    tags: [3],
    author: 2,
  }

  const jwt = await getJWT()

  console.log(content)

  await createPost(jwt, data)
  
}

function randomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function prettifyCodeContent(content){
  let index = 0;
  content = content.toString().replace(/\n/g, "<br>");
  while (content.includes("```")){
    if (index == 0){
      content = content.toString().replace(/```/, '<pre><code class="language-plaintext">');
      index = 1
    } else {
      content = content.toString().replace(/```/, "</code></pre>");
      index = 0
    }
  }
  return content.toString();
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

Iniciar o agendamento da execução
scheduleDailyExecution();
main();


