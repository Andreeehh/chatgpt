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
              "Você é um author de blog de tecnologia web, hospedado nesse link 'https://blog-project-kappa-one.vercel.app/' os temas são, saúde e exercícios físicos, basquete, viagens pelo mundo, inteligência artificial, e qualquer tema que esteja nas tendências na notícia, crie um post em indentado com tags html, o post, pode ter exemplos de código, emojis, no conteúdo as quebras de linha devem ser substituídas por tags <br>, as informações mais importantes podem ser divididas por tags h, <h1> <h2> etc, links com tags <a> com propriedade href='link a ser inserido', algumas tags <img> espalhadas pelo conteúdo com um src e alt vazias, exemplo <img src='' alt=''>, mas com uma src diferente, lembre-se, toda a resposta estará no post, então seja direto para a resposta.",
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
  const tagRegex = /<[^>]*>/g;
  const inputTitle = `Crie um titulo do post do blog, começando direto do título`;
  let title = await sendChatRequest(inputTitle);
  
  title = title.replace(tagRegex, "");
  const inputExcerpt = `Crie um resumo curto (240 chars) do post do blog com esse título ${title}, começando direto do resumo`;
  let excerpt = await sendChatRequest(inputExcerpt);
  
  excerpt.replace(tagRegex, "");
  const inputContent = `Crie um conteúdo do post do blog com esse título ${title}, Conteúdo que pode conter tags html, começando direto do body, sem styles, separando os parágrafos em tag <p>, cabeçalhos em <h1>, <h2>, etc., links com tags <a> com propriedade href="link a ser inserido", e ser mais longo, no conteúdo as quebras de linha devem ser substituídas por tags <br>, marcando com # ou <h1>, <h2>, etc. as partes importantes, algumas tags <img> espalhadas pelo conteúdo com um src e alt vazias , exemplo <img src='' alt=''>, começando direto do conteúdo`;
  let content = await sendChatRequest(inputContent);
  
  let slug = title.replace(/ /g, "-").replace(/[^0-9a-zA-Z-]+/g, "").toLowerCase();
  if (slug.length > 50){
    slug = slug.slice(0, 49)
  }
  if (excerpt.length > 250){
    excerpt = excerpt.slice(0, 249)
  }
  const input = `Define a one word category, for search parameter to the unsplash API, about the title ${title}, in english`;
  const category = await sendChatRequest(input);

  console.log(category)
  console.log("Possuí src", content.includes("src=''") || content.includes("src=''"))
  content = await prettifyCodeContent(content, category);
  console.log(content)

  
  


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

function prettifyCodeContent(content, category){
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
  return updateContentWithRandomImage(content, category).then(updatedContent => {
    return updatedContent; // Imprime o conteúdo atualizado
  });
}

function updateContentWithRandomImage(content, category) {
  
  if (!content.includes("src=''") && !content.includes('src=""')) {
    return Promise.resolve(content); // Retorna a promessa resolvida quando não há mais tags "src" vazias
  }

  return getRandomImageUrlByCategory(category).then(r => {
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

async function getRandomImageUrlByCategory(category) {
  const apiKey = process.env.UNSPLASH_API_KEY; // Replace with your Unsplash API key
  const endpoint = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(category)}&per_page=10&client_id=${apiKey}`;

  try {
    const response = await axios.get(endpoint);
    const results = response.data.results;

    if (results.length > 0) {
      const randomIndex = Math.floor(Math.random() * results.length);
      const imageUrl = results[randomIndex].urls.regular;
      const imageAltText = results[randomIndex].alt_description;
      return { imageUrl, imageAltText };
    }
  } catch (error) {
    return getRandomImageUrl().then(r => {return r})
    console.log('Error:', error);
  }
}

main();




