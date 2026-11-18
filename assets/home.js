// Página inicial: abertura, percurso (a história) e a home com o tambor do "Cuido".
(function () {
  var A = window.AR, S = A.S, esc = A.esc, caminho = A.caminho;
  var abertura = document.getElementById('abertura');
  var percurso = document.getElementById('percurso');
  var home = document.getElementById('home');
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var visitou = false;
  try { visitou = !!localStorage.getItem('visitou'); } catch (e) {}
  function marcarVisita() { try { localStorage.setItem('visitou', '1'); } catch (e) {} }

  // Troca de telas com fade.
  function mostrar(tela) {
    [abertura, percurso].forEach(function (t) {
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

  // Abertura: o interlocutor fala em cima, as opções ficam embaixo.
  var aberturaOk = false;
  function iniciarAbertura() {
    mostrar('abertura');
    if (aberturaOk) return;
    aberturaOk = true;
    var f1 = abertura.querySelector('.f1'), f2 = abertura.querySelector('.f2'), op = abertura.querySelector('.opcoes');
    // A fala aparece palavra por palavra; pausa maior na vírgula e no ponto. Clique ou tecla pula.
    var palavras = [];
    [f1, f2].forEach(function (p) {
      var txt = p.textContent.trim().split(/\s+/);
      p.textContent = '';
      txt.forEach(function (w, k) {
        var sp = document.createElement('span');
        sp.className = 'palavra'; sp.textContent = w;
        p.appendChild(sp);
        if (k < txt.length - 1) p.appendChild(document.createTextNode(' '));
        palavras.push(sp);
      });
    });
    var PALAVRA = 180, VIRGULA = 400, PONTO = 800, timers = [];
    function tudo() {
      timers.forEach(clearTimeout); timers = [];
      palavras.forEach(function (w) { w.classList.add('visivel'); });
      op.classList.add('visivel');
      document.removeEventListener('keydown', pular);
    }
    function pular(e) { if (!/^(Arrow|Enter$|Tab$)/.test(e.key)) tudo(); }
    if (reduz) setTimeout(tudo, 400);
    else {
      var t = 300;
      palavras.forEach(function (w) {
        (function (t0) { timers.push(setTimeout(function () { w.classList.add('visivel'); }, t0)); })(t);
        var fim = w.textContent.slice(-1);
        t += PALAVRA + (/[.?!]/.test(fim) ? PONTO : /[,;:]/.test(fim) ? VIRGULA : 0);
      });
      timers.push(setTimeout(function () { op.classList.add('visivel'); }, t));
    }
    abertura.addEventListener('click', function (e) { if (!e.target.closest('button')) tudo(); });
    document.addEventListener('keydown', pular);
    abertura.querySelector('.sim').addEventListener('click', function () { marcarVisita(); location.hash = 'historia'; });
    abertura.querySelector('.nao').addEventListener('click', function () { marcarVisita(); location.hash = 'site'; });
    // Teclado: as setas escolhem entre as duas opções; Enter confirma (é o próprio botão).
    var botoes = [abertura.querySelector('.sim'), abertura.querySelector('.nao')];
    document.addEventListener('keydown', function (e) {
      if (abertura.hidden) return;
      var i = botoes.indexOf(document.activeElement);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); botoes[(i + 1) % 2].focus(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); botoes[i < 0 ? 1 : (i + 1) % 2].focus(); }
    });
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
    return '<div class="s-media" data-n="' + n + '" data-shape="' + shape + '" style="--n:' + n + '">' + media + '</div><div class="s-texto"><p class="mono kicker">' + esc(s.kicker) + '</p><p>' + esc(s.texto) + '</p></div>';
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
      if (window.PERCURSO[idx].fim) { marcarVisita(); location.hash = 'site'; }
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
    renderSalas();
    renderContato();
    renderParede(null, false);
    tambor();
  }
  function renderSalas() {
    var el = document.getElementById('salas'), cont = {};
    (window.PECAS || []).forEach(function (p) {
      p.salas.forEach(function (s) { cont[s] = (cont[s] || 0) + (s === 'fotos' ? (p.imgs || []).length : 1); });
    });
    el.innerHTML = S.salas.map(function (s) {
      var peca = (window.PECAS || []).filter(function (p) { return p.salas.indexOf(s.id) >= 0 && capaDe(p); })[0];
      var fig = peca ? '<span class="ind-fig" data-peca="' + esc(peca.id) + '" aria-hidden="true">' + A.pic(capaDe(peca), '160px') + '</span>' : '';
      return '<a class="ind" href="' + A.ROOT + s.pasta + '/" style="--cor:var(--' + s.id + ')"><span class="ind-nome">' + esc(s.nome) + '</span>' + fig + '</a>';
    }).join('');
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
  function pecasDoTema(t) {
    var alvo = (t && t.salas) || [];
    return (window.PECAS || []).filter(function (p) {
      return p.salas.some(function (s) { return alvo.indexOf(s) >= 0; });
    });
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
    if (tema) {
      var dentro = p.salas.filter(function (s) { return tema.salas.indexOf(s) >= 0; });
      if (dentro.length) idSala = dentro[0];
    }
    return salaPorId(idSala) || S.salas[0];
  }
  function criarPeca(p, destaque) {
    var img = capaDe(p);
    var meta = [p.periodo, p.onde].filter(Boolean).join(' · ');
    var fig = img
      ? '<figure>' + A.pic(img, destaque ? '(min-width: 1100px) 1040px, 100vw' : '(min-width: 600px) 50vw, 50vw', destaque) + '</figure>'
      : '<figure class="pp-semimg"><span>' + esc(p.onde || '') + '</span></figure>';
    var d = document.createElement('div');
    d.innerHTML = '<a class="pp" data-id="' + esc(p.id) + '">' + fig + '<span class="pp-t">' + esc(p.titulo) + '</span>' + (meta ? '<span class="pp-m">' + esc(meta) + '</span>' : '') + '</a>';
    var a = d.firstChild;
    a.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      A.janelaMostrar(a, { titulo: p.titulo, meta: meta, papel: (p.papel && p.papel.indexOf('a confirmar') < 0) ? p.papel : '', img: img, video: '' });
    });
    a.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') A.janelaEsconder(); });
    var im = d.firstChild.querySelector('img');
    if (im && img) im.dataset.capa = img + !!destaque;
    return d.firstChild;
  }
  // Distribui as peças em linhas que fecham a largura (pela proporção --r de cada uma).
  // A última linha, se ficar curta demais, divide espaço com a anterior: nenhuma linha sobra pela metade.
  function justificarParede(el) {
    var nos = [].slice.call(el.querySelectorAll('.pp'));
    var W = el.clientWidth;
    if (!W || !nos.length) return;
    var cs = getComputedStyle(el), g = parseFloat(cs.columnGap) || 0, h = parseFloat(cs.getPropertyValue('--h')) || 200;
    var rs = nos.map(function (n) { return parseFloat(n.style.getPropertyValue('--r')) || 1.333; });
    // Escolhe onde quebrar as linhas para que todas fechem a largura com altura perto da ideal
    // (a primeira, da peça de destaque, mais alta). Poucas peças: busca completa é barata.
    function custo(i, j) {
      var sr = 0; for (var k = i; k < j; k++) sr += rs[k];
      var alt = (W - g * (j - i - 1)) / sr, ideal = i === 0 ? h * 1.9 : h, d = (alt - ideal) / ideal;
      return { alt: alt, c: d * d };
    }
    var melhor = [{ c: 0, de: -1 }];
    for (var j = 1; j <= rs.length; j++) {
      melhor[j] = { c: Infinity, de: 0 };
      for (var i = 0; i < j; i++) {
        var c = melhor[i].c + custo(i, j).c;
        if (c < melhor[j].c) melhor[j] = { c: c, de: i };
      }
    }
    var fim = rs.length;
    while (fim > 0) {
      var ini = melhor[fim].de, alt = custo(ini, fim).alt;
      for (var k = ini; k < fim; k++) nos[k].style.flex = '0 0 ' + Math.floor(rs[k] * alt) + 'px';
      fim = ini;
    }
  }
  var esperaParede;
  window.addEventListener('resize', function () {
    clearTimeout(esperaParede);
    esperaParede = setTimeout(function () { var el = document.getElementById('parede'); if (el) justificarParede(el); }, 120);
  });
  var trocaAtual = 0;
  function renderParede(tema, animar) {
    var el = document.getElementById('parede'), maisEl = document.getElementById('parede-mais');
    if (!el) return;
    var max = (S.parede && S.parede.max) || 9;
    var fixas = pecasFixas();
    var lista = tema ? pecasDoTema(tema).slice(0, max) : (fixas.length ? fixas : pecasDeTudo(max));
    var mais = '';
    if (tema) mais = tema.salas.map(salaPorId).filter(Boolean).map(function (s) { return '<a href="' + A.ROOT + s.pasta + '/">Ver todos: ' + esc(s.nome) + '</a>'; }).join('');
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
          pc.outerHTML = A.pic(capa, i === 0 ? '(min-width: 1100px) 1040px, 100vw' : '50vw', i === 0);
          n.querySelector('img').dataset.capa = capa + (i === 0);
        }
        n.className = 'pp' + (i === 0 ? ' pp-destaque' : '');
        var dim = capa && window.IMAGENS && window.IMAGENS[capa];
        n.style.setProperty('--r', dim ? (dim[0] / dim[1]).toFixed(3) : '1.333');
        n.setAttribute('href', A.ROOT + s.pasta + '/#' + encodeURIComponent(p.id));
        n.style.setProperty('--cor', 'var(--' + s.id + ')');
        return n;
      });
      el.replaceChildren.apply(el, nos);
      justificarParede(el);
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

  // O tambor: "Cuido" fixo, os temas rodando como um rolo, parando em "de tudo."
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
    var seq = temas.slice().reverse().map(function (t) { return t.frase; }).concat(['de tudo.']);
    var N = seq.length, ang = 360 / N;
    rolo.innerHTML = seq.map(function (t, i) { return '<li style="--i:' + i + '"' + (i === N - 1 ? ' class="fim"' : '') + '>' + esc(t) + '</li>'; }).join('');
    rolo.style.setProperty('--ang', ang + 'deg');
    rolo.style.setProperty('--rz', (0.55 / Math.tan((ang / 2) * Math.PI / 180)).toFixed(3) + 'em');
    var lis = rolo.querySelectorAll('li');

    var fim = (N - 1) * ang;
    var rot = fim;      // rotação atual do rolo, em graus
    var pos = N - 1;    // posição do rolo que está à mostra (N - 1 = "de tudo.")
    var sel = null;     // id do tema escolhido; null = tudo
    var larg = [];      // largura de cada palavra no tamanho cheio, em "em"

    // Mede cada palavra no tamanho cheio. Roda de novo quando a fonte carrega e quando a tela muda.
    // A palavra que não cabe primeiro condensa (eixo de largura da Archivo, até 62%); só depois a letra diminui.
    var LARGURA_MIN = 62;
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
      lis.forEach(function (li, i) { li.classList.toggle('atual', i === pos); });
    }
    function girarPara(i) {
      var d = ((i * ang - rot) % 360 + 540) % 360 - 180;
      rot += d;
      pos = i;
      rolo.style.setProperty('--rot', rot + 'deg');
      ajustar();
    }
    medir();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
    window.addEventListener('resize', medir);

    // Menu: os temas que têm peças viram botões. O botão "tudo" só aparece quando há um tema escolhido.
    lista.innerHTML = temas.map(function (t) {
      if (!pecasDoTema(t).length) return '<span class="tema-item">' + esc(t.curto) + '</span>';
      return '<button class="tema-item" type="button" data-tema="' + esc(t.id) + '" aria-pressed="false">' + esc(t.curto) + '</button>';
    }).join(' · ') + '<span class="tudo-wrap" hidden> · <button class="tema-item" type="button" data-tema="">tudo</button></span>';
    function escolher(id) {
      if (hero.classList.contains('animando')) return;
      sel = (id && id !== sel) ? id : null;
      var k = -1;
      temas.forEach(function (t, i) { if (t.id === sel) k = i; });
      girarPara(k < 0 ? N - 1 : N - 2 - k);
      if (falado) falado.textContent = k < 0 ? 'de tudo.' : temas[k].frase + '.';
      lista.querySelectorAll('button[data-tema]').forEach(function (b) {
        if (b.dataset.tema) b.setAttribute('aria-pressed', b.dataset.tema === sel ? 'true' : 'false');
      });
      lista.querySelector('.tudo-wrap').hidden = !sel;
      renderParede(k < 0 ? null : temas[k], true);
    }
    lista.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-tema]');
      if (b) escolher(b.dataset.tema);
    });
    renderParede(null, false);

    var visto = false;
    try { visto = !!sessionStorage.getItem('tamborVisto'); } catch (e) {}
    if (reduz || visto) { rolo.style.setProperty('--rot', fim + 'deg'); rolo.classList.add('suave'); return; }
    hero.classList.add('animando');
    var total = 360 + fim, dur = 7000, t0 = performance.now() + 500;
    function passo(now) {
      var t = (now - t0) / dur;
      if (t < 0) t = 0;
      if (t > 1) t = 1;
      var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      rolo.style.setProperty('--rot', (total * e) + 'deg');
      if (t < 1) requestAnimationFrame(passo);
      else setTimeout(function () { rot = total; rolo.classList.add('suave'); hero.classList.remove('animando'); try { sessionStorage.setItem('tamborVisto', '1'); } catch (e) {} }, 300);
    }
    requestAnimationFrame(passo);
  }

  // Rotas: #historia, #site ou nada.
  function rotear() {
    var h = location.hash.replace('#', '');
    if (h === 'historia') iniciarPercurso();
    else if (h === 'site' || h === 'conteudo' || visitou) mostrar('home');
    else iniciarAbertura();
  }
  window.addEventListener('hashchange', rotear);
  rotear();
})();
