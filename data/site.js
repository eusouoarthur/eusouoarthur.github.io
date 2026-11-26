// Configuração do site. Tudo que está aqui é texto e estrutura, sem código de comportamento.
window.SITE = {
  nome: "Arthur Ramos",
  // Endereço público do site. Vazio = calcula a partir da página atual (usado pelo painel para gerar links).
  url: "",
  // Temas do "Cuido …", na ordem básica decidida pelo Arthur. "frase" aparece no tambor; "curto" na lista.
  temas: [
    { id: "redacao",      frase: "da redação",             curto: "redação",             salas: ["jornalismo", "textos"] },
    { id: "video",        frase: "do vídeo",               curto: "vídeo",               salas: ["video"] },
    { id: "redes",        frase: "das redes sociais",      curto: "redes sociais",       salas: ["social"] },
    { id: "design",       frase: "do design",              curto: "design",              salas: ["design"] },
    { id: "automacao",    frase: "dos fluxos de automação", curto: "fluxos de automação", salas: [] },
    { id: "apuracao",     frase: "da apuração",            curto: "apuração",            salas: ["jornalismo"] },
    { id: "planejamento", frase: "do planejamento",        curto: "planejamento",        salas: [] },
    { id: "fotografia",   frase: "da fotografia",          curto: "fotografia",          salas: ["fotos"] }
  ],
  // PROVISÓRIO (não confirmado pelo Arthur) [sugestão do modelo]: "salas" liga cada tema às salas cujas peças aparecem na parede da home.
  // Parede da home: "max" é o número máximo de peças mostradas de cada vez.
  // "ids": peças fixas da parede, na ordem (ex.: ["pinheiros", "lago"]). Vazio = regra automática provisória.
  parede: { max: 9, ids: ["baladas", "m-cool", "carnaval-menino-de-ceilandia", "lago", "carnaval-id", "aline"] },
  // As sete salas decididas pelo Arthur. "pasta" é o endereço; "desc" é a linha de abertura de cada sala.
  salas: [
    { id: "design",     pasta: "design",     nome: "Design Gráfico", desc: "Identidade visual, cartilhas, revistas e capas de disco." },
    { id: "jornalismo", pasta: "jornalismo", nome: "Jornalismo",     desc: "Matérias, reportagens em vídeo e cobertura. Texto, foto e câmera, muitas vezes na mesma pauta." },
    { id: "social",     pasta: "social",     nome: "Social Media",   desc: "Conteúdo para redes: carrosséis, posts, stories e reels, do planejamento à publicação." },
    // RETIRADO por enquanto (17/11/2026, pedido do Arthur): { id: "textos",     pasta: "textos",     nome: "Textos",         desc: "Textos meus, fora de pauta. Comunicação, política, cinema, design e o que mais aparecer." },
    { id: "video",      pasta: "video",      nome: "Vídeo",          desc: "Reportagens, documentários curtos e reels. Captação e edição." },
    { id: "fotos",      pasta: "fotos",      nome: "Fotos",          desc: "Shows, eventos e reportagem." },
    // RETIRADO por enquanto (17/11/2026, pedido do Arthur): { id: "automacoes", pasta: "automacoes", nome: "Automações",     desc: "Scripts que tiram trabalho braçal da rotina de uma redação." }
  ],
  // Contato. Vazio até o Arthur dizer o que publicar.
  contato: {
    email: "arthuraramos@gmail.com",
    linkedin: "https://www.linkedin.com/in/arthuraramos"
  }
};
