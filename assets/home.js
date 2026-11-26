// Página inicial: a home com o tambor do "eu cuido" e o percurso (a história, em #historia).
(function () {
  var A = window.AR, S = A.S, esc = A.esc, caminho = A.caminho;
  var percurso = document.getElementById('percurso');
  var home = document.getElementById('home');
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Troca de telas com fade.
  function mostrar(tela) {
    [percurso].forEach(function (t) {
      if (t.id === tela) {
        if (t.hidden) { t.classList.add('saindo'); t.hidden = false; requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.remove('saindo'); }); }); }
      } else if (!t.hidden) {
        t.classList.add('saindo');
        setTimeout(function () { t.hidden = true; }, 480);
      }
    });
    if (tela === 'home') {
      home.hidden = false;
      document.body.classList.remove('travado');
      requestAnimationFrame(iniciarHome);
    } else {
      document.body.classList.add('travado');
    }
  }

  // Percurso: slides com peças reais, em ordem cronológica.
  var idx = 0, percursoOk = false;
  function iniciarPercurso() {
    idx = 0;
    mostrar('percurso');
    renderSlide(true);
    if (!percursoOk) { percursoOk = true; ligarPercurso(); }
  }
  function htmlSlide(s) {
    if (s.prologo) return '<div class="s-texto">' + s.paragrafos.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>';
    if (s.fim) return '<div class="s-texto"><p>' + esc(s.texto) + '</p></div>';
    var n = s.media.length, shape = s.shape || 'h';
    var media = s.media.map(function (m) {
      if (m.video) return '<div class="m"><video controls preload="none" playsinline poster="' + caminho(m.poster) + '" src="' + caminho(m.video) + '"></video></div>';
      return '<div class="m"><img src="' + caminho(m.img) + '" alt="' + esc(m.alt || '') + '"></div>';
    }).join('');
    var tags = (s.tags && s.tags.length) ? '<ul class="tags">' + s.tags.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '';
    return '<div class="s-media" data-n="' + n + '" data-shape="' + shape + '" style="--n:' + n + '">' + media + '</div><div class="s-texto"><p class="mono kicker">' + esc(s.kicker) + '</p><p>' + esc(s.texto) + '</p>' + tags + '</div>';
  }
  function renderSlide(imediato) {
    var d = window.PERCURSO, s = d[idx], el = percurso.querySelector('.slide');
    function troca() {
      el.innerHTML = htmlSlide(s);
      el.classList.toggle('s-fim', !!(s.fim || s.prologo));
      el.classList.toggle('s-prologo', !!s.prologo);
      el.classList.remove('trocando');
      percurso.querySelector('.n').textContent = (idx + 1) + ' / ' + d.length;
      percurso.querySelector('.ant').disabled = idx === 0;
      var prox = percurso.querySelector('.prox');
      prox.textContent = s.fim ? 'Entrar no site' : 'Próximo';
      prox.classList.toggle('btn-cheio', !!s.fim);
      preCarregar(idx + 1);
      percurso.scrollTop = 0;
    }
    if (imediato || reduz) troca(); else { el.classList.add('trocando'); setTimeout(troca, 260); }
  }
  function preCarregar(i) {
    var s = window.PERCURSO[i];
    if (!s || !s.media) return;
    s.media.forEach(function (m) { if (m.img) { var im = new Image(); im.src = caminho(m.img); } });
  }
  function ligarPercurso() {
    var prox = percurso.querySelector('.prox'), ant = percurso.querySelector('.ant');
    prox.addEventListener('click', function () {
      if (window.PERCURSO[idx].fim) { location.hash = 'site'; }
      else { idx++; renderSlide(); }
    });
    ant.addEventListener('click', function () { if (idx > 0) { idx--; renderSlide(); } });
    document.addEventListener('keydown', function (e) {
      if (percurso.hidden) return;
      if (e.key === 'ArrowRight') prox.click();
      if (e.key === 'ArrowLeft') ant.click();
    });
    var x0 = null;
    percurso.addEventListener('touchstart', function (e) { x0 = e.target.closest('video') ? null : e.touches[0].clientX; }, { passive: true });
    percurso.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 60) (dx < 0 ? prox : ant).click();
    });
  }

  // Home.
  var homeOk = false;
  function iniciarHome() {
    if (homeOk) return;
    homeOk = true;
    renderContato();
    renderParede(null, false);
    tambor();
  }
  function renderContato() {
    var el = document.getElementById('contato'), c = S.contato || {}, itens = [];
    if (c.email) itens.push('<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>');
    if (c.linkedin) itens.push('<a href="' + esc(c.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a>');
    if (c.github) itens.push('<a href="' + esc(c.github) + '" target="_blank" rel="noopener">GitHub</a>');
    el.innerHTML = itens.join('');
    var sec = el.closest('section');
    if (sec) sec.hidden = !itens.length;
  }

  // Parede de peças da home. "tema" nulo = mostra de tudo (uma peça de cada sala, em rodízio).
  function capaDe(p) { return (p.imgs && p.imgs[0]) || p.poster || (p.videos && p.videos[0] && p.videos[0].poster) || ''; }
  function salaPorId(id) { return S.salas.filter(function (s) { return s.id === id; })[0]; }
  // Peças de uma categoria (todas as subcategorias, na ordem da curadoria, sem repetir) ou de uma subcategoria só.
  function pecasDoTema(t, subId) {
    var porId = {}, vistos = {}, out = [];
    (window.PECAS || []).forEach(function (p) { porId[p.id] = p; });
    ((t && t.subs) || []).forEach(function (s) {
      if (subId && s.id !== subId) return;
      s.pecas.forEach(function (id) { if (porId[id] && !vistos[id]) { vistos[id] = true; out.push(porId[id]); } });
    });
    return out;
  }
  function pecasDeTudo(max) {
    var porSala = S.salas.map(function (s) { return (window.PECAS || []).filter(function (p) { return p.salas[0] === s.id; }); });
    var out = [], volta = 0, achou = true;
    while (out.length < max && achou) {
      achou = false;
      porSala.forEach(function (l) { if (l[volta] && out.length < max) { out.push(l[volta]); achou = true; } });
      volta++;
    }
    return out;
  }
  function pecasFixas() {
    var ids = (S.parede && S.parede.ids) || [];
    return ids.map(function (id) { return (window.PECAS || []).filter(function (p) { return p.id === id; })[0]; }).filter(Boolean);
  }
  // Cada peça da parede é um elemento com data-id; na troca de tema os que ficam são reaproveitados (e deslizam).
  function salaNaParede(p, tema) {
    var idSala = p.salas[0];
    return salaPorId(idSala) || S.salas[0];
  }
  function ehMateriaLink(p) {
    if (!p.materia) return false;
    return true;
  }
  // Etiqueta do tipo de trabalho, no canto superior esquerdo da capa (só na home, 26/11/2026).
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
  // Ícone da etiqueta (pedido do Arthur, 26/11/2026): play para vídeo, quadradinhos para galeria,
  // quadradinhos com play para galeria de vídeos, folha com linhas para matéria. O texto fica no aria-label.
  var ICONES = {
    play: '<path d="M5 3v10l8.5-5z"/>',
    galeria: '<rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/>',
    galeriaVideo: '<rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><path d="M9.5 8.8v5.4l4.5-2.7z"/>',
    materia: '<path d="M3 1.5h7l3 3v10H3z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 7h5M5.5 9.5h5M5.5 12h3.5" stroke="currentColor" stroke-width="1.3"/>'
  };
  function iconeDe(etq) {
    var k = etq === 'galeria de vídeos' ? 'galeriaVideo' : etq === 'galeria' ? 'galeria' : etq === 'matéria' ? 'materia' : 'play';
    return '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">' + ICONES[k] + '</svg>';
  }
  function criarPeca(p, destaque) {
    var img = capaDe(p);
    var meta = [p.periodo, p.onde].filter(Boolean).join(' · ');
    var etq = etiquetaDe(p, img);
    var fig = img
      ? '<figure>' + A.pic(img, '(min-width: 1100px) 360px, (min-width: 900px) 33vw, 50vw', destaque) + (etq ? '<span class="pp-tag" data-cat="' + esc(categoriaDe(p.id)) + '" role="img" aria-label="' + esc(etq) + '" title="' + esc(etq) + '">' + iconeDe(etq) + '</span>' : '') + '</figure>'
      : '<figure class="pp-semimg"><span>' + esc([p.onde, p.periodo].filter(Boolean).join(' · ')) + '</span></figure>';
    var isLink = ehMateriaLink(p);
    var m = p.materia && window.MATERIAS ? window.MATERIAS[p.materia] : null;
    var href = (isLink && m && m.url) ? m.url : A.ROOT + (salaNaParede(p, null) || S.salas[0]).pasta + '/#' + encodeURIComponent(p.id);
    var target = isLink ? ' target="_blank" rel="noopener"' : '';
    if (p.paginaPropria) { href = A.ROOT + 'materia/?m=' + encodeURIComponent(p.id); target = ''; }
    var tag = isLink ? 'a' : 'a';
    var d = document.createElement('div');
    d.innerHTML = '<' + tag + ' class="pp" data-id="' + esc(p.id) + '" href="' + esc(href) + '"' + target + '>' + fig + '<span class="pp-t">' + esc(p.titulo) + '</span>' + (meta ? '<span class="pp-m">' + esc(meta) + '</span>' : '') + '</' + tag + '>';
    var a = d.firstChild;
    a.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      A.janelaMostrar(a, { titulo: p.titulo, meta: meta, papel: (p.papel && p.papel.indexOf('a confirmar') < 0) ? p.papel : '', img: img, imgs: p.imgs || [], posters: (p.videos || []).map(function (v) { return v.poster; }).filter(Boolean), video: p.video || (p.videos && p.videos[0] && p.videos[0].src) || '', materia: p.materia || '' });
    });
    a.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.vivo'))) A.janelaEsconder(); });
    var im = d.firstChild.querySelector('img');
    if (im && img) im.dataset.capa = img + !!destaque;
    return d.firstChild;
  }
  // Altura de cada peça no mosaico da parede, em linhas de 4 px (mesma regra das salas).
  function medirParede() {
    var el = document.getElementById('parede');
    if (!el) return;
    var nos = [].slice.call(el.querySelectorAll('.pp'));
    nos.forEach(function (n) { n.style.gridRowEnd = 'auto'; });
    nos.forEach(function (n) { n.style.gridRowEnd = 'span ' + Math.ceil(n.getBoundingClientRect().height / 4); });
  }
  var esperaParede;
  window.addEventListener('resize', function () { clearTimeout(esperaParede); esperaParede = setTimeout(medirParede, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirParede);
  var trocaAtual = 0;
  function renderParede(tema, animar, subId) {
    var el = document.getElementById('parede'), maisEl = document.getElementById('parede-mais');
    if (!el) return;
    var max = (S.parede && S.parede.max) || 9;
    var fixas = pecasFixas();
    // Com categoria escolhida a parede mostra todas as peças dela (ou da subcategoria).
    var lista = tema ? pecasDoTema(tema, subId) : (fixas.length ? fixas : pecasDeTudo(max));
    var mais = '';
    var vez = ++trocaAtual;
    var atuais = [].slice.call(el.querySelectorAll('.pp'));
    var porId = {};
    atuais.forEach(function (n) { porId[n.dataset.id] = n; });
    var ids = lista.map(function (p) { return p.id; });
    var saem = atuais.filter(function (n) { return ids.indexOf(n.dataset.id) < 0; });

    // Põe a lista nova na parede, reaproveitando os elementos que ficam.
    function montar() {
      var nos = lista.map(function (p, i) {
        var n = porId[p.id] || criarPeca(p, i === 0), s = salaNaParede(p, tema);
        var pc = n.querySelector('figure picture'), capa = capaDe(p);
        if (pc && capa && pc.querySelector('img').dataset.capa !== capa + (i === 0)) {
          pc.outerHTML = A.pic(capa, '(min-width: 1100px) 360px, (min-width: 900px) 33vw, 50vw', i === 0);
          n.querySelector('img').dataset.capa = capa + (i === 0);
        }
        n.className = 'pp';
        // Mosaico (26/11/2026): capa na proporção original, sem corte; em pé aparece em pé. A largura vem do formato.
        var dimC = capa && window.IMAGENS && window.IMAGENS[capa], rC = dimC ? dimC[0] / dimC[1] : 16 / 9;
        n.style.setProperty('--r', rC.toFixed(4));
        n.dataset.f = rC < 0.8 ? 'v' : rC < 1.2 ? 'q' : 'h';
        // Uma troca interrompida deixa o esmaecer preso (fill: forwards) e a peça reaproveitada fica invisível.
        if (n.getAnimations) n.getAnimations().forEach(function (a) { a.cancel(); });
        if (!ehMateriaLink(p)) {
          n.setAttribute('href', A.ROOT + s.pasta + '/#' + encodeURIComponent(p.id));
        }
        n.style.setProperty('--cor', 'var(--' + s.id + ')');
        return n;
      });
      el.replaceChildren.apply(el, nos);
      medirParede();
      if (maisEl) maisEl.innerHTML = mais;
      return nos;
    }
    if (!animar || reduz || !el.animate) { montar(); return; }

    // Troca de tema: as que saem esmaecem primeiro, as que ficam deslizam, as que entram aparecem por último.
    // Tudo em cascata de 40 ms.
    var mov = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mov')) || 800;
    var CASCATA = 40, SAI = mov * 0.3, DESLIZA = mov * 0.6, ENTRA = mov * 0.45, curva = 'cubic-bezier(.2, .7, .2, 1)';
    var saidas = saem.map(function (n, i) {
      return n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: SAI, delay: i * CASCATA, easing: 'ease', fill: 'forwards' }).finished;
    });
    Promise.all(saidas).then(function () {
      if (vez !== trocaAtual) return;
      var antes = new Map();
      atuais.forEach(function (n) { if (saem.indexOf(n) < 0) antes.set(n, n.getBoundingClientRect()); });
      var nos = montar();
      var ficam = nos.filter(function (n) { return antes.has(n); });
      var entram = nos.filter(function (n) { return !antes.has(n); });
      ficam.forEach(function (n, i) {
        var a = antes.get(n), b = n.getBoundingClientRect();
        var de = 'translate(' + (a.left - b.left) + 'px, ' + (a.top - b.top) + 'px) scale(' + (a.width / b.width) + ', ' + (a.height / b.height) + ')';
        n.animate([{ transform: de, transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }], { duration: DESLIZA, delay: i * CASCATA, easing: curva });
      });
      var depois = ficam.length ? DESLIZA * 0.6 : 0;
      entram.forEach(function (n, i) {
        n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ENTRA, delay: depois + i * CASCATA, easing: 'ease', fill: 'backwards' });
      });
    });
  }

  // O tambor: "e eu cuido" fixo, as categorias rodando como um rolo, parando em "da comunicação."
  // Depois da animação, a lista de temas vira menu: clicar num tema troca a palavra e filtra a parede.
  function tambor() {
    var hero = document.querySelector('.hero');
    var cuido = hero.querySelector('.cuido');
    var tamborEl = hero.querySelector('.tambor');
    var rolo = hero.querySelector('.tambor-rolo');
    var lista = hero.querySelector('.lista');
    var falado = hero.querySelector('.cuido-falado');
    var ordem = A.ordemAtual();
    var temas = ordem.map(function (i) { return S.temas[i]; });
    // O rolo passa pelos temas de trás para a frente: o primeiro da lista é o último que se lê antes de "tudo".
    var seq = temas.slice().reverse().map(function (t) { return t.frase; }).concat(['da comunicação.']);
    var N = seq.length, ang = 360 / N;
    rolo.innerHTML = seq.map(function (t, i) { return '<li style="--i:' + i + '"' + (i === N - 1 ? ' class="fim"' : '') + '>' + esc(t) + '</li>'; }).join('');
    rolo.style.setProperty('--ang', ang + 'deg');
    rolo.style.setProperty('--rz', (0.55 / Math.tan((ang / 2) * Math.PI / 180)).toFixed(3) + 'em');
    var lis = rolo.querySelectorAll('li');

    var fim = (N - 1) * ang;
    var rot = fim;      // rotação atual do rolo, em graus
    var pos = N - 1;    // posição do rolo que está à mostra (N - 1 = "de tudo.")
    var sel = null;     // id do tema escolhido; null = tudo
    var subSel = null;  // id da subcategoria escolhida; null = a categoria inteira
    var subcats = document.querySelector('.subcats'); // embaixo da linha, no topo de Trabalhos (26/11/2026)
    var larg = [];      // largura de cada palavra no tamanho cheio, em "em"

    // Mede cada palavra no tamanho cheio. Roda de novo quando a fonte carrega e quando a tela muda.
    // A fonte dos títulos não condensa (LARGURA_MIN = 100): se a palavra não couber, a letra diminui só o necessário.
    var LARGURA_MIN = 100;
    function medir() {
      var ft = parseFloat(getComputedStyle(tamborEl).fontSize) || 16;
      var fs = parseFloat(getComputedStyle(cuido).fontSize) || 16;
      var cabe = (hero.clientWidth / fs - 0.1) * ft;
      lis.forEach(function (li, i) {
        li.style.fontStretch = '';
        var w = li.offsetWidth;
        if (w > cabe) {
          li.style.fontStretch = LARGURA_MIN + '%';
          var wMin = li.offsetWidth, s = LARGURA_MIN;
          if (wMin < cabe) s = Math.floor(LARGURA_MIN + (100 - LARGURA_MIN) * (cabe - wMin) / (w - wMin));
          li.style.fontStretch = s + '%';
          w = li.offsetWidth;
          while (w > cabe && s > LARGURA_MIN) { s = Math.max(LARGURA_MIN, s - 2); li.style.fontStretch = s + '%'; w = li.offsetWidth; }
        }
        larg[i] = w / ft;
      });
      ajustar();
    }
    // A palavra à mostra tem que caber na largura: se não couber, a letra diminui só o necessário.
    function ajustar() {
      var fs = parseFloat(getComputedStyle(cuido).fontSize) || 16;
      var cabe = hero.clientWidth / fs - 0.1;
      var k = Math.min(1, cabe / (larg[pos] || 1));
      tamborEl.style.fontSize = k.toFixed(3) + 'em';
      // A palavra fica na mesma linha de "e eu cuido": a caixa do tambor acompanha a largura da palavra à mostra.
      tamborEl.style.width = (larg[pos] || 0).toFixed(3) + 'em';
      lis.forEach(function (li, i) { li.classList.toggle('atual', i === pos); });
    }
    function girarPara(i) {
      var d = ((i * ang - rot) % 360 + 540) % 360 - 180;
      rot += d;
      pos = i;
      rolo.style.setProperty('--rot', rot + 'deg');
      ajustar();
    }
    rolo.style.setProperty('--rot', fim + 'deg');
    medir();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
    window.addEventListener('resize', medir);

    // Menu: os temas que têm peças viram botões. O botão "tudo" só aparece quando há um tema escolhido.
    lista.innerHTML = temas.map(function (t) {
      if (!pecasDoTema(t).length) return '<span class="tema-item">' + esc(t.curto) + '</span>';
      return '<button class="tema-item" type="button" data-tema="' + esc(t.id) + '" aria-pressed="false">' + esc(t.curto) + '</button>';
    }).join('') + '<a class="tema-item" href="' + A.ROOT + 'sobre/">sobre mim</a>' +
      '<span class="tudo-wrap" hidden><button class="tema-item" type="button" data-tema="">home</button></span>';
    lista.id = 'menu-cuido';
    lista.setAttribute('role', 'menu');
    [].forEach.call(lista.querySelectorAll('.tema-item'), function (b, i) { b.style.setProperty('--k', i); });
    function escolher(id) {
      if (hero.classList.contains('animando')) return;
      sel = (id && id !== sel) ? id : null;
      subSel = null;
      var k = -1;
      temas.forEach(function (t, i) { if (t.id === sel) k = i; });
      girarPara(k < 0 ? N - 1 : N - 2 - k);
      if (falado) falado.textContent = k < 0 ? 'da comunicação.' : temas[k].frase + '.';
      lista.querySelectorAll('button[data-tema]').forEach(function (b) {
        if (b.dataset.tema) b.setAttribute('aria-pressed', b.dataset.tema === sel ? 'true' : 'false');
      });
      lista.querySelector('.tudo-wrap').hidden = !sel;
      renderSubcats(k < 0 ? null : temas[k]);
      renderParede(k < 0 ? null : temas[k], true);
    }
    // Subcategorias da categoria escolhida: "todas" + uma por subcategoria. Só aparecem se houver mais de uma.
    function renderSubcats(t) {
      if (!subcats) return;
      var subs = (t && t.subs) || [];
      if (subs.length < 2) { subcats.hidden = true; subcats.innerHTML = ''; return; }
      subcats.innerHTML = [{ id: '', nome: 'todas' }].concat(subs).map(function (s) {
        return '<button class="sub-item" type="button" data-sub="' + esc(s.id) + '" aria-pressed="' + ((s.id || null) === subSel) + '">' + esc(s.nome.toLowerCase()) + '</button>';
      }).join('');
      subcats.hidden = false;
    }
    lista.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-tema]');
      if (b) { escolher(b.dataset.tema); fecharMenu(); suprimido = true; }
    });

    // Menu da palavra (fase 13b): passar o mouse na palavra vermelha (ou tocar, no celular) abre as categorias
    // embaixo da frase; o resto da tela escurece um pouco e borra. Passar o mouse numa opção já gira a palavra.
    var veu = document.createElement('div');
    veu.className = 'veu';
    document.body.appendChild(veu);
    tamborEl.removeAttribute('aria-hidden');
    hero.querySelector('.tambor-win').setAttribute('aria-hidden', 'true');
    tamborEl.setAttribute('role', 'button');
    tamborEl.setAttribute('tabindex', '0');
    tamborEl.setAttribute('aria-label', 'Escolher o que eu cuido');
    tamborEl.setAttribute('aria-haspopup', 'menu');
    tamborEl.setAttribute('aria-controls', 'menu-cuido');
    tamborEl.setAttribute('aria-expanded', 'false');
    var aberto = false, esperaFechar = null, esperaVeu = null;
    function posDe(id) { var k = -1; temas.forEach(function (t, i) { if (t.id === id) k = i; }); return k < 0 ? N - 1 : N - 2 - k; }
    function abrirMenu() {
      clearTimeout(esperaFechar);
      if (aberto || hero.classList.contains('animando')) return;
      aberto = true;
      clearTimeout(esperaVeu);
      document.body.classList.remove('veu-saindo');
      hero.classList.add('menu-aberto');
      document.body.classList.add('com-veu');
      tamborEl.setAttribute('aria-expanded', 'true');
    }
    function fecharMenu() {
      clearTimeout(esperaFechar);
      if (!aberto) return;
      aberto = false;
      hero.classList.remove('menu-aberto');
      // O véu esmaece com o desfoque junto; a frase fica na frente até ele sumir.
      document.body.classList.add('veu-saindo');
      document.body.classList.remove('com-veu');
      clearTimeout(esperaVeu);
      esperaVeu = setTimeout(function () { document.body.classList.remove('veu-saindo'); }, 480);
      tamborEl.setAttribute('aria-expanded', 'false');
      if (pos !== posDe(sel)) girarPara(posDe(sel));
    }
    function fecharDepois() { clearTimeout(esperaFechar); esperaFechar = setTimeout(fecharMenu, 220); }
    var mouse = function (e) { return e.pointerType === 'mouse'; };
    // Área de hover: o bloco inteiro da frase, de ponta a ponta da tela (pedido do Arthur, 26/11/2026).
    // Depois de escolher, o menu só reabre quando o mouse sai da área e volta (a página muda de altura embaixo dele).
    var suprimido = false;
    // O submenu (subcategorias) fica fora da área do spotlight: em cima dele o menu não abre (e fecha se estava aberto).
    hero.addEventListener('pointermove', function (e) {
      if (!mouse(e)) return;
      if (e.target.closest('.subcats')) { if (aberto) fecharDepois(); }
      else if (!suprimido) abrirMenu();
    });
    document.addEventListener('pointermove', function (e) {
      if (!suprimido || !mouse(e)) return;
      var r = hero.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) suprimido = false;
    });
    hero.addEventListener('pointerleave', function (e) { if (mouse(e)) fecharDepois(); });
    lista.addEventListener('pointerenter', function (e) { if (mouse(e)) clearTimeout(esperaFechar); });
    lista.addEventListener('pointerleave', function (e) { if (mouse(e)) fecharDepois(); });
    // Com mouse o clique só abre (o passar do mouse já abriu); com toque ou teclado, abre e fecha.
    tamborEl.addEventListener('click', function (e) { if (aberto && e.pointerType !== 'mouse') fecharMenu(); else abrirMenu(); });
    tamborEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault(); abrirMenu();
        var b = lista.querySelector('button.tema-item'); if (b) b.focus();
      }
    });
    lista.addEventListener('pointerover', function (e) {
      var b = e.target.closest('button[data-tema]');
      if (b && aberto && mouse(e)) girarPara(posDe(b.dataset.tema || null));
    });
    // Saiu de cima das opções sem escolher: o rolo volta para a categoria que estava.
    lista.addEventListener('pointerout', function (e) {
      if (!mouse(e) || !e.target.closest('button[data-tema]')) return;
      var para = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('button[data-tema]');
      if (!para && pos !== posDe(sel)) girarPara(posDe(sel));
    });
    lista.addEventListener('focusin', function (e) {
      var b = e.target.closest('button[data-tema]');
      if (b && aberto) girarPara(posDe(b.dataset.tema || null));
    });
    lista.addEventListener('keydown', function (e) {
      var bs = [].filter.call(lista.querySelectorAll('button.tema-item'), function (b) { return b.offsetParent; });
      var i = bs.indexOf(document.activeElement);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length].focus(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); }
    });
    // O véu não segura o mouse; tocar ou clicar fora da frase e do menu fecha.
    document.addEventListener('pointerdown', function (e) {
      if (aberto && !e.target.closest('.hero')) fecharMenu();
    });
    // Vindo de outra página com ?cat=: abre a home já na categoria escolhida.
    var catUrl = new URLSearchParams(location.search).get('cat');
    if (catUrl && temas.some(function (t) { return t.id === catUrl; })) { escolher(catUrl); history.replaceState(null, '', location.pathname + '#site'); }

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && aberto) { fecharMenu(); tamborEl.focus(); } });
    if (subcats) subcats.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-sub]');
      if (!b || !sel) return;
      subSel = b.dataset.sub || null;
      var t = temas.filter(function (x) { return x.id === sel; })[0];
      renderSubcats(t);
      renderParede(t, true, subSel);
    });
    renderParede(null, false);

    // Sem giro na abertura (pedido do Arthur, 26/11/2026): a frase já chega parada em "da comunicação.".
    // O rolo só gira quando se passa pelas categorias do menu.
    // A transição só liga depois que a frase já apareceu parada (senão o rolo gira de 0 até "da comunicação.").
    requestAnimationFrame(function () { requestAnimationFrame(function () { rolo.classList.add('suave'); }); });
  }

  // Rotas: #historia abre o percurso; o resto abre a home direto.
  function rotear() {
    var h = location.hash.replace('#', '');
    if (h === 'historia') iniciarPercurso();
    else mostrar('home');
  }
  window.addEventListener('hashchange', rotear);
  rotear();
})();
