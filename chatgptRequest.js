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
              "Você é um author de blog de tecnologia web, hospedado nesse link 'https://blog-project-kappa-one.vercel.app/', saúde e exercícios físicos, basquete, viagens pelo mundo, inteligência artificial, e qualquer tema que esteja nas tendências na notícia, crie um post em indentado com tags html, o post, pode ter exemplos de código, emojis, no conteúdo as quebras de linha devem ser substituídas por tags <br>, as informações mais importantes podem ser divididas por tags h, <h1> <h2> etc, links com tags <a> com propriedade href='link a ser inserido', algumas tags <img> espalhadas pelo conteúdo com um src e alt vazias, exemplo <img src='' alt=''>, mas com uma src diferente, lembre-se, toda a resposta estará no post, então seja direto para a resposta.",
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
  const userInput = `Crie mais um post do blog, deve conter estar separado por um Título, que não pode conter tags html, um Resumo curto de no máximo 150 caracteres, que não pode conter tags html, e o Conteúdo que pode conter tags html, começando direto do body, sem styles, separando os parágrafos em tag <p>, cabeçalhos em <h1>, e ser mais longo, no conteúdo as quebras de linha devem ser substituídas por tags <br>, marcando com <h1> as partes importantes, algumas tags <img> espalhadas pelo conteúdo com um src e alt vazias, exemplo <img src='' alt=''>, mas com uma src diferente`;
  const chatResponseContent = await sendChatRequest(userInput);
  const titleRegex = /Título:(.*?)\n/;
  const excerptRegex = /Resumo:(.*?)\n\n/;
  const contentRegex = /Conteúdo:\n\n([\s\S]*)/;

  const titleMatch = chatResponseContent.match(titleRegex);
  const excerptMatch = chatResponseContent.match(excerptRegex);
  const contentMatch = chatResponseContent.match(contentRegex);
  const tagRegex = /<[^>]+>/g;
  let title = titleMatch ? titleMatch[1].trim() : '';
  if (!title){
    const input = `Crie um titulo do post do blog, começando direto do título`;
    title = await sendChatRequest(input);
  }
  title = title.replace(tagRegex, "");
  let excerpt = excerptMatch ? excerptMatch[1].trim() : '';
  if (!excerpt){
    const input = `Crie um resumo curto (240 chars) do post do blog com esse título ${title}, começando direto do resumo`;
    excerpt = await sendChatRequest(input);
  }
  excerpt.replace(tagRegex, "");
  let content = contentMatch ? contentMatch[1].trim() : '';
  if (!content){
    const input = `Crie um conteúdo do post do blog com esse título ${title}, Conteúdo que pode conter tags html, começando direto do body, sem styles, separando os parágrafos em tag <p>, cabeçalhos em <h1>, <h2>, etc., links com tags <a> com propriedade href="link a ser inserido", e ser mais longo, no conteúdo as quebras de linha devem ser substituídas por tags <br>, marcando com # ou <h1>, <h2>, etc. as partes importantes, algumas tags <img> espalhadas pelo conteúdo com um src e alt vazias , exemplo <img src='' alt=''>, começando direto do conteúdo`;
    content = await sendChatRequest(input);
  }
  let slug = title.replace(/ /g, "-").replace(/[^0-9a-zA-Z-]+/g, "").toLowerCase();
  if (slug.length > 50){
    slug = slug.slice(0, 49)
  }
  if (excerpt.length > 250){
    excerpt = excerpt.slice(0, 249)
  }


  content = await prettifyCodeContent(content);

  console.log (content)
  


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

  await createPost(jwt, data)
  
}

function randomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function prettifyCodeContent(content){
  let index = 0;
  content = content.replace(/#/g, "");
  while (content.includes("```")){
    if (index == 0){
      content = content.toString().replace(/```/, '<pre><code class="language-plaintext">');
      index = 1
    } else {
      content = content.toString().replace(/```/, "</code></pre>");
      index = 0
    }
  }
  return updateContentWithRandomImage(content).then(updatedContent => {
    return updatedContent; // Imprime o conteúdo atualizado
  });
}

function updateContentWithRandomImage(content) {
  
  if (!content.includes("src=''") && !content.includes('src=""')) {
    return Promise.resolve(content); // Retorna a promessa resolvida quando não há mais tags "src" vazias
  }

  return getRandomImageUrl().then(r => {
    content = content.toString().replace(/src=''|src=""/, `src='${r.imageUrl}'`);
    content = content.toString().replace(/alt=''|alt=""/, `alt='${r.imageAltText}'`);

    return updateContentWithRandomImage(content); // Chama recursivamente a função para atualizar novamente o conteúdo
  });
}

async function getRandomImageUrl() {
  const apiKey = process.env.UNSPLASH_API_KEY;
  const endpoint = `https://api.unsplash.com/photos/random?client_id=${apiKey}`;

  try {
    const response = await axios.get(endpoint);
    const imageUrl = response.data.urls.regular;
    const imageAltText = response.data.alt_description;
    return { imageUrl, imageAltText };
  } catch (error) {
    console.log('Ocorreu um erro:', error);
  }
}

main();




