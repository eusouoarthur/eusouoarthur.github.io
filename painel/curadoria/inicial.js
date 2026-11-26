// Separação inicial das peças (proposta do Claude, 24/11/2026). A página de curadoria parte daqui.
// Não editar à mão: o Arthur muda pela página; o resultado fica no navegador (localStorage "curadoria-v1").
window.CURADORIA_INICIAL = {
  categorias: [
    { id: "audiovisual", nome: "Audiovisual", subs: [
      { id: "edicao", nome: "Edição de vídeo", pecas: ["baladas", "pinheiros", "lago", "m-cool", "carnaval-menino-de-ceilandia", "carnaval-orquestra-marafreboi", "carnaval-baratona", "carnaval-baile-da-piki", "carnaval-baratinha", "carnaval-galinho", "carnaval-raparigueiros", "aline", "r-cerrado", "r-ipes", "r-margaridas", "r-indigenas", "r-beleza", "r-menos", "r-conune", "r-loteria", "conexis-videos", "r-ep1", "r-ep2", "r-formatura", "r-ganso", "r-park-shopping", "r-roland", "r-reel-1", "r-agua-mineral", "r-reel-2", "r-semana-universitaria", "correio-podcast-cortes", "ribaram-drone", "lombrinhas-drone"] },
      { id: "captacao", nome: "Captação de imagens", pecas: ["baladas", "pinheiros", "lago", "m-cool", "carnaval-menino-de-ceilandia", "carnaval-orquestra-marafreboi", "carnaval-baratona", "carnaval-baile-da-piki", "carnaval-baratinha", "carnaval-galinho", "carnaval-raparigueiros", "aline", "drone-lago", "r-cerrado", "r-ipes", "r-margaridas", "r-indigenas", "r-beleza", "r-menos", "r-conune", "r-loteria", "r-ep1", "r-ep2", "r-formatura", "r-ganso", "r-park-shopping", "r-roland", "r-reel-1", "r-agua-mineral", "r-reel-2", "r-semana-universitaria"] },
      { id: "drone", nome: "Operação de drone", pecas: ["drone-lago", "ribaram-drone", "lombrinhas-drone"] },
      { id: "institucional", nome: "Institucional e comercial", pecas: ["aline", "conexis-videos", "r-formatura", "r-agua-mineral", "r-park-shopping"] },
      { id: "fotografia", nome: "Fotografia", pecas: ["shows-2018", "m-cerrado", "m-menos"] },
      { id: "narracao", nome: "Narração", pecas: [] }
    ]},
    { id: "texto", nome: "Texto", subs: [
      { id: "materias", nome: "Matérias", pecas: ["m-cerrado", "m-cool", "m-menos", "m-sora", "m-roblox", "m-enem", "m-bananas", "m-detran"] },
      { id: "roteiros", nome: "Roteiros", pecas: [] },
      { id: "copywriting", nome: "Copywriting", pecas: [] }
    ]},
    { id: "redes", nome: "Redes sociais", subs: [
      { id: "criacao", nome: "Criação de conteúdo", pecas: [] },
      { id: "marcas", nome: "Conteúdo para marcas", pecas: ["cromo-social", "conexis-social", "vertice", "adfollow-social", "vanessa-bicho"] },
      { id: "eleicoes", nome: "Campanhas eleitorais 2022", pecas: ["psb-andreia", "psb-dora", "psb-maria-jose"] },
      { id: "musica-eventos", nome: "Música e eventos", pecas: ["bananas-social", "andergraundi"] },
      { id: "gestao", nome: "Gestão de redes", pecas: [] }
    ]},
    { id: "design", nome: "Design gráfico", subs: [
      { id: "identidade", nome: "Identidade visual", pecas: ["yt", "carnaval-id", "cromo-logo", "utilex", "adfollow-id", "buzz", "conexao"] },
      { id: "editorial", nome: "Editorial", pecas: ["propostas", "cartilha-5g", "antenado", "fac", "neo"] },
      { id: "musica", nome: "Música", pecas: ["tropecalia", "bananas-capas", "corujones", "omarazul", "maxicrimi", "bananas-camisetas"] },
      { id: "digitais", nome: "Peças digitais e ilustração", pecas: ["cau", "pintura", "cromo-social", "conexis-social", "adfollow-social", "vertice"] }
    ]},
    { id: "automacao", nome: "Automação de processos", subs: [
      { id: "automacao-todas", nome: "", pecas: ["auto-extrator", "auto-tweets"] }
    ]}
  ],
  fora: []
};
