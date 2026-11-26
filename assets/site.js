// Funções compartilhadas: tema, cabeçalho, rodapé e a ordem personalizada dos temas.
(function () {
  var html = document.documentElement;
  var ROOT = html.getAttribute('data-root') || '';
  var HOME = ROOT || './';
  var S = window.SITE || { temas: [], salas: [], contato: {} };

  // Curadoria do Arthur (data/categorias.js): as categorias viram os temas do "e eu cuido ___"
  // e as peças marcadas "fora" somem do site inteiro.
  var C = window.CATEGORIAS;
  if (window.aplicarAjustes) window.aplicarAjustes();
  if (C) {
    var fora = C.fora || [];
    window.PECAS = (window.PECAS || []).filter(function (p) { return fora.indexOf(p.id) < 0; });
    var existe = {};
    window.PECAS.forEach(function (p) { existe[p.id] = true; });
    S.temas = C.categorias.map(function (c) {
      var subs = c.subs.map(function (s) {
        return { id: s.id, nome: s.nome, pecas: s.pecas.filter(function (id) { return existe[id]; }) };
      }).filter(function (s) { return s.pecas.length; });
      return { id: c.id, frase: c.frase, curto: c.nome.toLowerCase(), subs: subs };
    });
  }

  // Tema: escuro por padrão; o visitante pode trocar e a escolha fica no navegador dele.
  var tema = null;
  try { tema = localStorage.getItem('tema'); } catch (e) {}
  html.setAttribute('data-theme', 'dark'); // Só modo escuro (decisão do Arthur, 17/11/2026).
  function alternarTema() {
    var novo = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', novo);
    try { localStorage.setItem('tema', novo); } catch (e) {}
    atualizarBotoesTema();
  }
  function atualizarBotoesTema() {
    var escuro = html.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('.tema').forEach(function (b) { b.textContent = escuro ? 'Modo claro' : 'Modo escuro'; });
    var mt = document.querySelector('meta[name="theme-color"]');
    if (mt) mt.setAttribute('content', escuro ? '#0D1B2A' : '#F3EFE6');
  }

  // Ordem dos temas codificada no link (?r=xxxx). Código de Lehmer em base 36, com um caractere aleatório na frente.
  var B36 = '0123456789abcdefghijklmnopqrstuvwxyz';
  function codificar(perm) {
    var n = perm.length, num = 0, pool = [];
    for (var i = 0; i < n; i++) pool.push(i);
    for (var k = 0; k < n; k++) {
      var idx = pool.indexOf(perm[k]);
      num = num * (n - k) + idx;
      pool.splice(idx, 1);
    }
    var s = num.toString(36);
    while (s.length < 3) s = '0' + s;
    return B36[Math.floor(Math.random() * 36)] + s;
  }
  function decodificar(code, n) {
    if (!code || code.length !== 4 || !/^[0-9a-z]+$/.test(code)) return null;
    var num = parseInt(code.slice(1), 36);
    if (isNaN(num)) return null;
    var fat = 1;
    for (var i = 2; i <= n; i++) fat *= i;
    if (num >= fat) return null;
    var idxs = new Array(n), m = num;
    for (var k = n - 1; k >= 0; k--) { var r = n - k; idxs[k] = m % r; m = Math.floor(m / r); }
    var pool = [], perm = [];
    for (var j = 0; j < n; j++) pool.push(j);
    for (var q = 0; q < n; q++) perm.push(pool.splice(idxs[q], 1)[0]);
    return perm;
  }
  function ordemAtual() {
    var n = S.temas.length;
    var p = new URLSearchParams(location.search).get('r');
    if (p) {
      var perm = decodificar(p, n);
      if (perm) { try { sessionStorage.setItem('ordem', JSON.stringify(perm)); } catch (e) {} return perm; }
    }
    try {
      var s = sessionStorage.getItem('ordem');
      if (s) { var arr = JSON.parse(s); if (Array.isArray(arr) && arr.length === n) return arr; }
    } catch (e) {}
    var base = [];
    for (var i = 0; i < n; i++) base.push(i);
    return base;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function caminho(p) { return /^https?:/.test(p) ? p : ROOT + p; }
  function thumb(p) { return p.indexOf('/img/') >= 0 ? p.replace(/\.(jpg|png)$/, '.t.$1') : p; }
  function fmtData(iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return iso;
    var meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return parseInt(m[3], 10) + ' de ' + meses[parseInt(m[2], 10) - 1] + ' de ' + m[1];
  }

  function renderTopo(ativa) {
    var el = document.querySelector('.topo');
    if (!el) return;
    // Fase 13f (26/11/2026, pedido do Arthur): sem cabeçalho nem barra fixa. A navegação é o menu da palavra:
    // na home, categorias e "sobre mim"; nas outras páginas, a mesma frase no topo, com categorias, "sobre mim" e "home".
    var naHome = !document.body.getAttribute('data-sala');
    el.innerHTML = '<a class="pular" href="#conteudo">Pular para o conteúdo</a>' + (naHome ? '' : cabecalhoFrase(ativa));
    if (!naHome) ligarCabecalhoFrase(el);
    atualizarBotoesTema();
  }
  // Cabeçalho das outras páginas (26/11/2026, pedido do Arthur): a mesma frase da home é o topo de todas as páginas
  // (não fica presa ao rolar). A palavra vermelha é a da página; o menu da palavra leva à home já filtrada.
  var SALA_CAT = { design: 'design', social: 'redes', video: 'audiovisual', fotos: 'audiovisual', jornalismo: 'texto' };
  function cabecalhoFrase(ativa) {
    var cats = (window.CATEGORIAS && window.CATEGORIAS.categorias) || [];
    var atual = cats.filter(function (c) { return c.id === SALA_CAT[ativa]; })[0];
    var palavra = atual ? atual.frase : 'da comunicação.';
    var itens = cats.map(function (c, i) {
      return '<a class="tema-item" style="--k:' + i + '" href="' + HOME + '?cat=' + encodeURIComponent(c.id) + '#site" data-frase="' + esc(c.frase) + '"' + (atual && c.id === atual.id ? ' aria-current="page"' : '') + '>' + esc(c.nome.toLowerCase()) + '</a>';
    }).join('') +
      '<a class="tema-item" style="--k:' + cats.length + '" href="' + ROOT + 'sobre/"' + (ativa === 'sobre' ? ' aria-current="page"' : '') + '>sobre mim</a>' +
      '<a class="tema-item" style="--k:' + (cats.length + 1) + '" href="' + HOME + '#site">home</a>';
    return '<section class="hero hero-topo"><div class="cuido"><span class="cuido-verbo">Oi! Eu sou o Arthur Ramos <span class="quebra">e eu cuido</span></span> ' +
      // O mesmo rolo da home: as frases das categorias e "da comunicação." giram como um tambor.
      '<span class="tambor tambor-fixo" role="button" tabindex="0" aria-label="Escolher o que eu cuido (agora: ' + esc(palavra) + ')" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-cuido">' +
      '<span class="tambor-win" aria-hidden="true"><ul class="tambor-rolo">' +
      cats.map(function (c) { return c.frase; }).concat(['da comunicação.']).map(function (t, i) { return '<li style="--i:' + i + '"' + (t === palavra ? ' class="atual"' : '') + ' data-frase="' + esc(t) + '">' + esc(t) + '</li>'; }).join('') +
      '</ul></span></span></div>' +
      '<nav class="lista" id="menu-cuido" aria-label="O que eu cuido">' + itens + '</nav></section>';
  }
  function ligarCabecalhoFrase(el) {
    var hero = el.querySelector('.hero-topo');
    if (!hero) return;
    var palavra = hero.querySelector('.tambor'), lista = hero.querySelector('.lista');
    var rolo = hero.querySelector('.tambor-rolo'), lis = [].slice.call(rolo.querySelectorAll('li'));
    var N = lis.length, ang = 360 / N, rot = 0, pos = 0;
    lis.forEach(function (li, i) { if (li.classList.contains('atual')) pos = i; });
    var original = pos;
    rolo.style.setProperty('--ang', ang + 'deg');
    rolo.style.setProperty('--rz', (0.55 / Math.tan((ang / 2) * Math.PI / 180)).toFixed(3) + 'em');
    function girarPara(i) {
      var d = ((i * ang - rot) % 360 + 540) % 360 - 180;
      rot += d; pos = i;
      rolo.style.setProperty('--rot', rot + 'deg');
      palavra.style.width = lis[i].offsetWidth + 'px';
      lis.forEach(function (li, k) { li.classList.toggle('atual', k === i); });
    }
    function idxDaFrase(f) { for (var k = 0; k < N; k++) if (lis[k].dataset.frase === f) return k; return original; }
    // Começa parado na palavra da página; a transição só liga depois (sem giro ao carregar).
    rot = pos * ang; rolo.style.setProperty('--rot', rot + 'deg');
    girarPara(pos);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { palavra.style.width = lis[pos].offsetWidth + 'px'; });
    requestAnimationFrame(function () { requestAnimationFrame(function () { rolo.classList.add('suave'); }); });
    var veu = document.createElement('div'); veu.className = 'veu'; document.body.appendChild(veu);
    var aberto = false, espera = null, esperaVeu = null;
    function abrir() {
      clearTimeout(espera); if (aberto) return; aberto = true;
      clearTimeout(esperaVeu); document.body.classList.remove('veu-saindo');
      hero.classList.add('menu-aberto'); document.body.classList.add('com-veu'); palavra.setAttribute('aria-expanded', 'true');
    }
    function fechar() {
      clearTimeout(espera); if (!aberto) return; aberto = false;
      hero.classList.remove('menu-aberto'); document.body.classList.add('veu-saindo'); document.body.classList.remove('com-veu');
      palavra.setAttribute('aria-expanded', 'false'); if (pos !== original) girarPara(original);
      esperaVeu = setTimeout(function () { document.body.classList.remove('veu-saindo'); }, 480);
    }
    var mouse = function (e) { return e.pointerType === 'mouse'; };
    hero.addEventListener('pointerenter', function (e) { if (mouse(e)) abrir(); });
    hero.addEventListener('pointerleave', function (e) { if (mouse(e)) { clearTimeout(espera); espera = setTimeout(fechar, 220); } });
    palavra.addEventListener('click', function (e) { if (aberto && e.pointerType !== 'mouse') fechar(); else abrir(); });
    lista.addEventListener('pointerover', function (e) { var a = e.target.closest('a[data-frase]'); if (a && mouse(e)) girarPara(idxDaFrase(a.dataset.frase)); });
    lista.addEventListener('pointerout', function (e) { var para = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('a[data-frase]'); if (!para && pos !== original) girarPara(original); });
    palavra.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); var a = lista.querySelector('a'); if (a) a.focus(); } });
    veu.addEventListener('click', fechar);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && aberto) { fechar(); palavra.focus(); } });
  }
  function renderRodape() {
    var el = document.querySelector('.rodape');
    if (!el) return;
    el.innerHTML = '<span>' + esc(S.nome) + ' · Brasília</span>';
  }

  // <picture> com AVIF e WebP (tamanhos de data/imagens.js), carregamento sob demanda e width/height.
  // Sem entrada em IMAGENS, cai para a imagem simples.
  function pic(img, sizes, original) {
    var d = window.IMAGENS && window.IMAGENS[img];
    var fallback = caminho(original ? img : thumb(img));
    if (!d) return '<img src="' + fallback + '" alt="" loading="lazy">';
    function srcset(ext) { return d[2].map(function (L) { return caminho(img.replace(/\.(jpg|png)$/, '.' + L + '.' + ext)) + ' ' + L + 'w'; }).join(', '); }
    return '<picture><source type="image/avif" srcset="' + srcset('avif') + '" sizes="' + sizes + '"><source type="image/webp" srcset="' + srcset('webp') + '" sizes="' + sizes + '">' +
      '<img src="' + fallback + '" alt="" loading="lazy" width="' + d[0] + '" height="' + d[1] + '"></picture>';
  }
  // Prévia ao passar o mouse (só computador).
  // Peça com imagens: janela ao lado folheando as páginas sozinha (1,2 s cada), com contador e a ficha.
  // Peça com vídeo: a própria miniatura cresce (~1,6x, mínimo 380 px de largura) e o vídeo toca mudo ali.
  // Matérias: mosaico com as fotos + trecho do texto (janela-txt), sem "N páginas".
  var janelaEl = null, janelaTimer = 0, janelaGiro = 0, vivoEl = null, semMouse = window.matchMedia('(hover: none), (max-width: 599px)');
  var reduzMov = window.matchMedia('(prefers-reduced-motion: reduce)');
  function janelaMostrar(alvo, d) {
    if (semMouse.matches) return;
    clearTimeout(janelaTimer);
    janelaTimer = setTimeout(function () {
      // Peça com mais de um item (fotos + capas dos vídeos) mostra o mosaico; com um vídeo só, ele toca no lugar.
      var temPosters = !!(d.posters && d.posters.length);
      var itensTodos = (d.imgs && d.imgs.length ? d.imgs : (d.img && !temPosters ? [d.img] : [])).concat(d.posters || []);
      if (d.video && itensTodos.length < 2) { vivoMostrar(alvo, d.video); return; }
      if (!janelaEl) { janelaEl = document.createElement('div'); janelaEl.className = 'janela'; janelaEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(janelaEl); }
      var todas = itensTodos;
      var imgs = todas.slice(0, 6), resto = todas.length - imgs.length;
      var paginas = imgs.map(function (src, i) {
        var mais = (i === imgs.length - 1 && resto > 0) ? '<span class="janela-mais">+' + resto + '</span>' : '';
        return '<div class="janela-pg" style="--i:' + i + '">' + pic(src, i === 0 ? '340px' : '170px') + mais + '</div>';
      }).join('');
      janelaEl.dataset.n = String(imgs.length);
      // Feed (Social Media): todas as imagens do mesmo tamanho, em grade, como no Instagram (pares que se completam ficam lado a lado).
      janelaEl.dataset.feed = d.feed ? '1' : '';
      janelaEl.style.setProperty('--cols', String(Math.min(imgs.length, 3)));
      var ehMateria = !!(d.materia && window.MATERIAS && window.MATERIAS[d.materia]);
      var txtMateria = '';
      if (ehMateria) {
        var m = window.MATERIAS[d.materia];
        var html = m.html || '';
        var texto = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (texto.length > 220) {
          var corte = texto.lastIndexOf(' ', 220);
          if (corte > 0) texto = texto.slice(0, corte);
          texto += '…';
        }
        txtMateria = '<p class="janela-txt">' + esc(texto) + '</p>';
      }
      janelaEl.innerHTML = '<div class="janela-m">' + paginas + '</div><div class="janela-f"><span class="janela-t">' + esc(d.titulo || '') + '</span>' +
        (d.meta ? '<span class="janela-meta">' + esc(d.meta) + '</span>' : '') + (d.papel ? '<span class="janela-p">' + esc(d.papel) + '</span>' : '') +
        txtMateria +
        (!ehMateria && todas.length > 1 ? '<span class="janela-n">' + todas.length + ((d.posters && d.posters.length) ? ((d.imgs && d.imgs.length) ? ' peças' : ' vídeos') : ' páginas') + '</span>' : '') + '</div>';
      janelaEl.querySelectorAll('img').forEach(function (im) { im.loading = 'eager'; });
      janelaEl.style.setProperty('--cor', getComputedStyle(alvo).getPropertyValue('--cor') || 'var(--fg2)');
      var r = alvo.getBoundingClientRect(), W = janelaEl.offsetWidth || 380, M = 16;
      janelaEl.style.maxHeight = (innerHeight - 2 * M) + 'px';
      janelaEl.classList.add('on');
      var h = janelaEl.offsetHeight, x, y;
      if (r.right + M + W <= innerWidth - M) { x = r.right + M; y = r.top; }
      else if (r.left - M - W >= M) { x = r.left - M - W; y = r.top; }
      else {
        x = Math.max(M, Math.min(innerWidth - W - M, r.left));
        y = (r.bottom + M + h <= innerHeight - M) ? r.bottom + M : r.top - M - h;
      }
      y = Math.max(M, Math.min(innerHeight - h - M, y));
      janelaEl.style.left = x + 'px';
      janelaEl.style.top = y + 'px';
      clearInterval(janelaGiro);
    }, 250);
  }
  function vivoMostrar(alvo, src) {
    var fig = alvo.querySelector('figure') || alvo, r = fig.getBoundingClientRect(), M = 16;
    if (!vivoEl) {
      vivoEl = document.createElement('div'); vivoEl.className = 'vivo'; vivoEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(vivoEl);
      vivoEl.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') janelaEsconder(); });
      vivoEl.addEventListener('click', function () { if (vivoEl._alvo) vivoEl._alvo.click(); janelaEsconder(); });
    }
    vivoEl._alvo = alvo;
    var w = Math.min(innerWidth - 2 * M, Math.max(380, r.width * 1.6)), h = w * (r.height / r.width);
    if (h > innerHeight - 2 * M) { h = innerHeight - 2 * M; w = h * (r.width / r.height); }
    var x = Math.max(M, Math.min(innerWidth - w - M, r.left + r.width / 2 - w / 2));
    var y = Math.max(M, Math.min(innerHeight - h - M, r.top + r.height / 2 - h / 2));
    vivoEl.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;--cor:' + (getComputedStyle(alvo).getPropertyValue('--cor') || 'var(--fg2)') +
      ';--de-x:' + (r.left - x) + 'px;--de-y:' + (r.top - y) + 'px;--de-s:' + (r.width / w);
    vivoEl.innerHTML = '<video src="' + caminho(src) + '" muted loop playsinline autoplay preload="auto"></video>';
    var v = vivoEl.querySelector('video'); v.muted = true;
    var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
    vivoEl.classList.remove('on'); void vivoEl.offsetWidth; vivoEl.classList.add('on');
  }
  function janelaEsconder() {
    clearTimeout(janelaTimer); clearInterval(janelaGiro);
    if (janelaEl) janelaEl.classList.remove('on');
    if (vivoEl) { vivoEl.classList.remove('on'); var v = vivoEl.querySelector('video'); if (v) { v.pause(); v.removeAttribute('src'); v.load(); } vivoEl.innerHTML = ''; }
  }
  window.addEventListener('scroll', janelaEsconder, { passive: true });
  // Ícone da capa (26/11/2026, pedido do Arthur), na home e em todas as páginas.
  // Diz o tipo de mídia (vídeo, vídeo vertical, galeria de vídeos, matéria, galeria); a cor vem da categoria da curadoria.
  // Categoria da peça (a primeira da curadoria em que ela aparece): dá a cor da etiqueta.
  function categoriaDe(id) {
    var achou = '';
    ((window.CATEGORIAS && window.CATEGORIAS.categorias) || []).forEach(function (c) { if (!achou && c.subs.some(function (s) { return s.pecas.indexOf(id) >= 0; })) achou = c.id; });
    return achou;
  }
  function subsDe(id) {
    var out = [];
    ((window.CATEGORIAS && window.CATEGORIAS.categorias) || []).forEach(function (c) { c.subs.forEach(function (s) { if (s.pecas.indexOf(id) >= 0) out.push(s.nome); }); });
    return out;
  }
  function etiquetaDe(p, img) {
    var subs = subsDe(p.id), nVid = (p.videos || []).length + (p.video ? 1 : 0);
    var corp = subs.indexOf('Institucional e comercial') >= 0;
    var d = img && window.IMAGENS && window.IMAGENS[img], emPe = d && d[0] / d[1] < 0.8;
    if (nVid > 1) return 'galeria de vídeos';
    if (nVid === 1) {
      var v = corp ? 'vídeo corporativo' : emPe ? 'vídeo vertical' : 'vídeo';
      return p.materia ? v + ' e matéria' : v;
    }
    if (p.materia) return 'matéria';
    // Imagens: várias = "galeria"; uma só = sem etiqueta (a capa já mostra o que é).
    return (p.imgs || []).length > 1 ? 'galeria' : '';
  }
  // Ícone no canto da capa (pedido do Arthur, 26/11/2026): branco, minimalista, sem caixinha nem cor.
  // Um vídeo = play; vários vídeos = dois quadros sobrepostos com play; várias imagens = dois quadros com montanha e sol.
  // Foto única e matéria ficam sem ícone. O nome do tipo fica no aria-label.
  var ESCURO = '#0d1b2a';
  // Galeria: três quadros próximos, os de trás deslocados para cima e para a esquerda; o da frente leva o sinal.
  var PILHA = '<rect x="1" y="1" width="13" height="10" opacity=".4"/><rect x="3.5" y="3.5" width="13" height="10" opacity=".7"/><rect x="6" y="6" width="13" height="10"/>';
  var ICONES = {
    galeriaVideo: PILHA + '<path d="M11 8.4v5.2l4.4-2.6z" fill="' + ESCURO + '"/>',
    galeria: PILHA + '<path d="M7.4 14.7l3-3.6 1.9 2 1.2-1.2 2.4 2.8z" fill="' + ESCURO + '"/><circle cx="15.6" cy="9" r="1.1" fill="' + ESCURO + '"/>'
  };
  function iconeChave(etq) {
    if (etq === 'galeria de vídeos') return 'galeriaVideo';
    if (etq === 'galeria') return 'galeria';
    if (etq.indexOf('vídeo') === 0) return 'play';
    return '';
  }
  function iconeDe(etq) {
    return '<svg viewBox="0 0 20 17" width="22" height="19" fill="currentColor" aria-hidden="true">' + ICONES[iconeChave(etq)] + '</svg>';
  }
  // Um vídeo só: play grande no centro da capa, num círculo meio transparente (como botão de dar play).
  function playCentro(etq) {
    return '<span class="pp-play" role="img" aria-label="' + esc(etq) + '"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="rgba(0,0,0,.28)" stroke="#fff" stroke-width="2.5"/><path d="M26 20v24l19-12z" fill="#fff"/></svg></span>';
  }
  // HTML do ícone para a capa da peça: play grande no centro (um vídeo), pilha de quadros no canto (galerias) ou nada.
  function iconeCapa(p, img) {
    var etq = etiquetaDe(p, img), k = etq && iconeChave(etq);
    if (!k) return '';
    if (k === 'play') return playCentro(etq);
    return '<span class="pp-tag" role="img" aria-label="' + esc(etq) + '" title="' + esc(etq) + '">' + iconeDe(etq) + '</span>';
  }
  window.AR = { iconeCapa: iconeCapa, janelaMostrar: janelaMostrar, janelaEsconder: janelaEsconder, pic: pic, ROOT: ROOT, HOME: HOME, S: S, esc: esc, caminho: caminho, thumb: thumb, fmtData: fmtData, codificar: codificar, decodificar: decodificar, ordemAtual: ordemAtual, alternarTema: alternarTema, renderTopo: renderTopo, renderRodape: renderRodape };

  document.addEventListener('DOMContentLoaded', function () {
    renderTopo(document.body.getAttribute('data-sala'));
    renderRodape();
    atualizarBotoesTema();
  });
})();
