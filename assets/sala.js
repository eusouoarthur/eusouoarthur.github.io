// Página de sala: grade de peças e o diálogo de cada peça.
(function () {
  var A = window.AR, S = A.S, esc = A.esc, caminho = A.caminho, thumb = A.thumb;
  var sala = document.body.getAttribute('data-sala');
  document.documentElement.style.setProperty('--cor', 'var(--' + sala + ')');
  var grid = document.getElementById('pecas');
  var dlg = document.getElementById('dlg');
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)');
  var modoCelular = window.matchMedia('(hover: none), (max-width: 599px)');
  if (!grid) return;

  var pecas = (window.PECAS || []).filter(function (p) { return p.salas.indexOf(sala) >= 0; });
  var itens = [];
  if (sala === 'fotos') {
    // Na sala de fotos, cada foto vira um cartão.
    pecas.forEach(function (p) {
      (p.imgs || []).forEach(function (img, i) {
        var c = {}; for (var k in p) c[k] = p[k];
        c.id = p.id + '-' + i; c.imgs = [img]; c.titulo = p.titulo; c._foto = true; c._n = i + 1;
        itens.push(c);
      });
    });
  } else {
    itens = pecas;
  }

  function papelOk(p) { return !!p.papel && p.papel.indexOf('a confirmar') < 0; }

  var TAMANHOS = { design: '(min-width: 1100px) 520px, 100vw', social: '(min-width: 1100px) 360px, 34vw', video: '(min-width: 600px) 33vw, 100vw', jornalismo: '(min-width: 600px) 33vw, 100vw', fotos: '(min-width: 600px) 33vw, 100vw' };
  function imgDaCapa(p) { return (p.imgs && p.imgs[0]) || p.poster || (p.videos && p.videos[0].poster) || ''; }
  // Proporção (largura / altura) da capa, pelas dimensões em data/imagens.js; sem elas, pelo formato da peça.
  var PROP_FORMA = { v: 9 / 16, sq: 1, wide: 16 / 9, h: 4 / 3 };
  function proporcao(p) {
    var d = window.IMAGENS && window.IMAGENS[imgDaCapa(p)];
    return d ? d[0] / d[1] : (PROP_FORMA[p.shape] || 4 / 3);
  }
  function capa(p) {
    var img = imgDaCapa(p);
    var ehVideo = !!(p.video || p.videos);
    if (!img) {
      return '<figure><div class="capa-texto"><span class="ct-veic">' + esc(p.onde || '') + '</span> <span class="ct-ano">' + esc(p.periodo || '') + '</span></div></figure>';
    }
    return '<figure>' + A.pic(img, TAMANHOS[sala] || '(min-width: 1100px) 260px, 50vw') + (ehVideo && sala !== 'social' ? '<span class="play">vídeo</span>' : '') + '</figure>';
  }
  function ehMateriaLink(p, salaAtual) {
    if (!p.materia) return false;
    if (salaAtual === 'video' && p.id === 'm-cool') return false;
    return true;
  }
  grid.innerHTML = itens.map(function (p, i) {
    var meta = [p.periodo, p.onde].filter(Boolean).join(' · ');
    var isLink = ehMateriaLink(p, sala);
    var m = p.materia && window.MATERIAS ? window.MATERIAS[p.materia] : null;
    var href = (isLink && m && m.url) ? m.url : '#' + encodeURIComponent(p.id);
    var target = isLink ? ' target="_blank" rel="noopener"' : '';
    if (p.paginaPropria && sala !== 'video') { href = A.ROOT + 'materia/?m=' + encodeURIComponent(p.id); target = ''; }
    var tag = isLink ? 'a' : 'button';
    var typeAttr = isLink ? '' : ' type="button"';
    return '<' + tag + ' class="peca" href="' + esc(href) + '"' + target + typeAttr + ' data-i="' + i + '" data-shape="' + (p.shape || 'h') + '" style="--r:' + proporcao(p).toFixed(4) + '"' + (p._foto ? ' aria-label="' + esc(p.titulo + ', foto ' + p._n) + '"' : '') + '>' + capa(p) +
      '<h3>' + esc(p.titulo) + '</h3><span class="meta">' + esc(meta) + '</span>' + (papelOk(p) ? '<span class="papel">' + esc(p.papel) + '</span>' : '') + '</' + tag + '>';
  }).join('');
  if (!itens.length) grid.innerHTML = '<p class="vazio">Ainda não tem nada aqui.</p>';
  // Mosaico (26/11/2026, pedido do Arthur): cada capa na proporção original, sem corte, com alturas diferentes.
  // Grade de 12 colunas; a peça ocupa colunas pelo formato (deitada 6, quadrada e em pé 3) e as linhas pela altura real;
  // as seguintes preenchem os buracos (grid-auto-flow: dense).
  if (itens.length && (sala === 'video' || sala === 'design' || sala === 'jornalismo')) {
    grid.classList.add('mosaico');
    [].slice.call(grid.querySelectorAll('.peca')).forEach(function (b) {
      var r = parseFloat(b.style.getPropertyValue('--r')) || 1.6;
      b.dataset.f = r < 0.8 ? 'v' : r < 1.2 ? 'q' : 'h';
    });
    var LINHA = 4;
    var medirMosaico = function () {
      [].slice.call(grid.querySelectorAll('.peca')).forEach(function (b) { b.style.gridRowEnd = 'auto'; });
      [].slice.call(grid.querySelectorAll('.peca')).forEach(function (b) {
        b.style.gridRowEnd = 'span ' + Math.ceil(b.getBoundingClientRect().height / LINHA);
      });
    };
    medirMosaico();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirMosaico);
    var esperaMosaico;
    window.addEventListener('resize', function () { clearTimeout(esperaMosaico); esperaMosaico = setTimeout(medirMosaico, 120); });
  }

  // Prévia. No computador: mover o mouse na horizontal folheia as imagens da peça; vídeo toca um trecho mudo em loop.
  // No celular: a peça mais perto do centro da tela entra em prévia ao rolar; toque abre.
  // Com "reduzir movimento", nada toca nem gira sozinho (folhear com o mouse continua, porque é o visitante que move).
  var TRECHO = 6; // segundos do trecho de vídeo em loop
  function imagensDe(p) { return p.imgs || []; }
  function videoDe(p) { return p.video || (p.videos && p.videos[0].src) || ''; }
  function mostrarImg(b, src) { var pc = b.querySelector('figure picture'), img = b.querySelector('figure img'); if (pc && src) pc.outerHTML = A.pic(src, TAMANHOS[sala] || '50vw'); else if (img && src) img.src = caminho(thumb(src)); }
  function tocarVideo(b, p) {
    var fig = b.querySelector('figure');
    if (!fig || fig.querySelector('video')) return;
    var v = document.createElement('video');
    v.className = 'previa-video'; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('aria-hidden', 'true');
    v.src = caminho(videoDe(p));
    v.addEventListener('timeupdate', function () { if (v.currentTime > TRECHO) v.currentTime = 0; });
    fig.appendChild(v);
    var tentativa = v.play();
    if (tentativa && tentativa.catch) tentativa.catch(function () {});
  }
  function iniciarPrevia(b) {
    var p = itens[+b.dataset.i], im = imagensDe(p);
    b.classList.add('previa');
    if (im.length > 1) {
      var k = 0;
      b._giro = setInterval(function () { k = (k + 1) % im.length; mostrarImg(b, im[k]); }, 900);
    } else if (videoDe(p)) tocarVideo(b, p);
  }
  function pararPrevia(b) {
    var p = itens[+b.dataset.i], v = b.querySelector('video.previa-video');
    b.classList.remove('previa');
    clearInterval(b._giro); b._giro = null; b._k = 0;
    if (v) { v.pause(); v.remove(); }
    if (imagensDe(p).length > 1) mostrarImg(b, imagensDe(p)[0]);
  }
  grid.querySelectorAll('.peca').forEach(function (b) {
    var p = itens[+b.dataset.i], im = imagensDe(p);
    b.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse' || modoCelular.matches) return;
      A.janelaMostrar(b, { titulo: p.titulo, meta: [p.periodo, p.onde].filter(Boolean).join(' · '), papel: papelOk(p) ? p.papel : '', img: im[0] || imgDaCapa(p), imgs: im, posters: (p.videos || []).map(function (v) { return v.poster; }).filter(Boolean), video: reduz.matches ? '' : videoDe(p), materia: p.materia || '' });
    });
    b.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.vivo'))) A.janelaEsconder(); });
  });
  if (!reduz.matches && 'IntersectionObserver' in window) {
    var naFaixa = [], centro = null;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var i = naFaixa.indexOf(en.target);
        if (en.isIntersecting && i < 0) naFaixa.push(en.target);
        if (!en.isIntersecting && i >= 0) naFaixa.splice(i, 1);
      });
      if (!modoCelular.matches) return;
      var cx = innerWidth / 2, cy = innerHeight / 2, melhor = null, dm = Infinity;
      naFaixa.forEach(function (b) {
        var r = b.querySelector('figure').getBoundingClientRect(), d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
        if (d < dm) { dm = d; melhor = b; }
      });
      if (melhor === centro) return;
      if (centro) pararPrevia(centro);
      centro = melhor;
      if (centro) iniciarPrevia(centro);
    }, { rootMargin: '-40% 0px -40% 0px' });
    grid.querySelectorAll('.peca').forEach(function (b) { io.observe(b); });
  }

  function corpo(p) {
    var m = p.materia && window.MATERIAS ? window.MATERIAS[p.materia] : null;
    var vert = p.shape === 'v', media = '';
    if (p.videos) {
      media = '<div><div class="dlg-media' + (vert ? ' vert' : '') + '"><video controls preload="metadata" playsinline poster="' + caminho(p.videos[0].poster) + '" src="' + caminho(p.videos[0].src) + '"></video></div>' +
        (p.videos.length > 1 ? '<div class="miniaturas">' + p.videos.map(function (v, k) { return '<button type="button" data-k="' + k + '"' + (k === 0 ? ' aria-current="true"' : '') + ' title="' + esc(v.titulo) + '"><img src="' + caminho(v.poster) + '" alt=""></button>'; }).join('') + '</div>' : '') +
        (p.imgs && p.imgs.length ? '<div class="dlg-media">' + p.imgs.map(function (i, k) { return '<img src="' + caminho(i) + '" alt="' + esc(p.titulo + ', imagem ' + (k + 1) + ' de ' + p.imgs.length) + '" loading="lazy">'; }).join('') + '</div>' : '') + '</div>';
    } else if (p.video) {
      media = '<div class="dlg-media' + (vert ? ' vert' : '') + '"><video controls preload="metadata" playsinline poster="' + caminho(p.poster) + '" src="' + caminho(p.video) + '"></video></div>';
    } else if (p.imgs && p.imgs.length) {
      media = '<div class="dlg-media">' + p.imgs.map(function (i, k) { return '<img src="' + caminho(i) + '" alt="' + esc(p.titulo + ', imagem ' + (k + 1) + ' de ' + p.imgs.length) + '" loading="lazy">'; }).join('') + '</div>';
    }
    // Etiqueta de museu: título, ano, onde e papel, em letra pequena.
    var linha = [p.periodo, p.onde].filter(Boolean).join(' · ');
    var info = '<div class="etiqueta"><h2 id="dlg-h">' + esc(p.titulo) + '</h2>' + (linha ? '<p class="et-linha">' + esc(linha) + '</p>' : '') + (papelOk(p) ? '<p class="et-papel papel">' + esc(p.papel) + '</p>' : '') + '</div>';
    if (m && m.linhafina) info += '<p class="linhafina">' + esc(m.linhafina) + '</p>';
    if (p.resumo) info += '<p class="resumo">' + esc(p.resumo) + '</p>';
    // "Como foi feito" só existe quando a peça tem esse texto (legendas a escrever, seção 4.3).
    var como = p.comoFoi || p.detalhe || '';
    var links = [];
    if (m && m.url) links.push('<a class="btn btn-leve" href="' + esc(m.url) + '" target="_blank" rel="noopener">Ler no ' + esc(m.veiculo) + '</a>');
    if (p.link) links.push('<a class="btn btn-leve" href="' + esc(p.link.url) + '" target="_blank" rel="noopener">' + esc(p.link.rotulo) + '</a>');
    if (m) links.push('<button class="btn btn-leve ler" type="button">Ler a matéria aqui</button>');
    if (como) links.push('<button class="btn btn-leve como" type="button">Como foi feito</button>');
    if (links.length) info += '<div class="links">' + links.join('') + '</div>';
    if (como) info += '<div class="como-texto" hidden>' + String(como).split(/\n\s*\n/).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>';
    if (m) {
      var rodape = 'Publicado em ' + esc(A.fmtData(m.data)) + ' no ' + esc(m.veiculo);
      if (m.credito && m.credito !== 'Arthur Ramos') rodape += ' · Texto: ' + esc(m.credito);
      info += '<div class="materia" hidden>' + m.html + '<p class="mono rodape-materia">' + rodape + '</p></div>';
    }
    return { media: media, info: '<div class="dlg-info">' + info + '</div>' };
  }

  // Fundo da peça aberta: a cor dominante da capa, bem escurecida. Sem imagem, a cor da sala.
  function corDe(expr) {
    var d = document.createElement('div'); d.style.color = expr; document.body.appendChild(d);
    var c = getComputedStyle(d).color.match(/[\d.]+/g).slice(0, 3).map(Number); d.remove(); return c;
  }
  function escurecer(rgb) {
    var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return 'hsl(' + Math.round(h) + ', ' + Math.round(Math.min(s, 0.45) * 100) + '%, 11%)';
  }
  function tingir(p) {
    dlg.style.removeProperty('--tinta');
    var img = (p.imgs && p.imgs[0]) || p.poster || (p.videos && p.videos[0].poster);
    if (!img) { dlg.style.setProperty('--tinta', escurecer(corDe('var(--' + sala + ')'))); return; }
    var im = new Image();
    im.onload = function () {
      if (dlg.dataset.peca !== p.id) return;
      var n = 24, cv = document.createElement('canvas'); cv.width = cv.height = n;
      var cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(im, 0, 0, n, n);
      var px = cx.getImageData(0, 0, n, n).data, faixas = {}, cinza = [0, 0, 0, 0];
      // Histograma por matiz (12 faixas de 30°): ganha a faixa com mais cor; a tinta é a média dela.
      for (var i = 0; i < px.length; i += 4) {
        var r = px[i], g = px[i + 1], b = px[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
        cinza[0] += r; cinza[1] += g; cinza[2] += b; cinza[3]++;
        if (sat < 0.2 || mx < 40) continue;
        var d = mx - mn, h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        var f = faixas[Math.floor(h * 2) % 12] || (faixas[Math.floor(h * 2) % 12] = [0, 0, 0, 0]);
        f[0] += r * sat; f[1] += g * sat; f[2] += b * sat; f[3] += sat;
      }
      var melhor = cinza;
      Object.keys(faixas).forEach(function (k) { if (faixas[k][3] > (melhor === cinza ? 0 : melhor[3])) melhor = faixas[k]; });
      var soma = melhor, peso = melhor[3];
      dlg.style.setProperty('--tinta', escurecer([soma[0] / peso, soma[1] / peso, soma[2] / peso]));
    };
    im.src = caminho(thumb(img));
  }

  function abrir(p) {
    var c = corpo(p), corpoEl = dlg.querySelector('.dlg-corpo');
    dlg.dataset.peca = p.id;
    tingir(p);
    corpoEl.innerHTML = c.media + c.info;
    corpoEl.classList.toggle('sem-media', !c.media);
    dlg.querySelector('.dlg-tit').textContent = S.nome + ' · ' + (S.salas.filter(function (s) { return s.id === sala; })[0] || {}).nome;
    dlg.setAttribute('aria-labelledby', 'dlg-h');
    dlg.showModal();
    dlg.scrollTop = 0;
    dlg.querySelectorAll('.miniaturas button').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = p.videos[+b.dataset.k], vid = dlg.querySelector('video');
        vid.pause(); vid.poster = caminho(v.poster); vid.src = caminho(v.src);
        dlg.querySelectorAll('.miniaturas button').forEach(function (x) { x.removeAttribute('aria-current'); });
        b.setAttribute('aria-current', 'true');
      });
    });
    var bComo = dlg.querySelector('.como');
    if (bComo) bComo.addEventListener('click', function () {
      var t = dlg.querySelector('.como-texto');
      t.hidden = !t.hidden;
      bComo.setAttribute('aria-expanded', t.hidden ? 'false' : 'true');
    });
    var ler = dlg.querySelector('.ler');
    if (ler) ler.addEventListener('click', function () {
      var t = dlg.querySelector('.materia');
      t.hidden = !t.hidden;
      ler.textContent = t.hidden ? 'Ler a matéria aqui' : 'Fechar o texto';
      if (!t.hidden) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  // Transição: a miniatura cresce até virar a peça aberta e volta ao fechar (View Transitions).
  // Sem suporte do navegador, ou com "reduzir movimento", a troca é normal.
  var figAberta = null;
  function nomear(el, sim) { if (el) el.style.viewTransitionName = sim ? 'peca' : ''; }
  function mediaAberta() { return dlg.querySelector('.dlg-media img, .dlg-media video') || dlg.querySelector('.etiqueta'); }
  function comTransicao(mudar, de, para) {
    if (!document.startViewTransition || reduz.matches || !de) { mudar(); return; }
    var alvo = null;
    nomear(de, true);
    var vt = document.startViewTransition(function () { nomear(de, false); mudar(); alvo = para(); nomear(alvo, true); });
    vt.ready.catch(function () {});
    vt.finished.then(function () { nomear(alvo, false); }, function () { nomear(alvo, false); });
  }
  function fechar() {
    if (!dlg.open) return;
    var fig = figAberta && document.body.contains(figAberta) ? figAberta : null;
    comTransicao(function () { dlg.close(); }, fig ? mediaAberta() : null, function () { return fig; });
  }
  // Social Media: no computador usa a mesma janela de prévia das outras salas (pedido do Arthur, 26/11/2026);
  // no celular, a etiqueta com data e papel aparece embaixo da imagem tocada (o segundo toque abre a peça).
  var etq = null, fio = null, etqDe = null;
  if (sala === 'social') {
    fio = document.createElement('div'); fio.className = 'fio'; fio.setAttribute('aria-hidden', 'true');
    etq = document.createElement('div'); etq.className = 'etq'; etq.setAttribute('aria-hidden', 'true');
    document.body.appendChild(fio); document.body.appendChild(etq);
  }
  function mostrarEtiqueta(b, embaixo) {
    var p = itens[+b.dataset.i], f = b.querySelector('figure').getBoundingClientRect();
    var sx = window.scrollX, sy = window.scrollY, margem = 12, LIGA = 40;
    etq.innerHTML = '<span class="etq-t">' + esc(p.titulo) + '</span><span class="etq-m">' + esc([p.periodo, p.onde].filter(Boolean).join(' · ')) + '</span>' + (papelOk(p) ? '<span class="etq-p">' + esc(p.papel) + '</span>' : '');
    etqDe = b;
    fio.classList.remove('on'); etq.classList.remove('on');
    var largura = document.documentElement.clientWidth, espaco = largura - margem - f.right - LIGA;
    var direita = !embaixo && espaco >= 160;
    etq.style.maxWidth = direita ? Math.min(240, espaco) + 'px' : '';
    var w = etq.offsetWidth, h = etq.offsetHeight, x, y;
    if (embaixo) {
      x = Math.max(margem, Math.min(f.left, innerWidth - w - margem));
      y = f.bottom + 6;
      fio.classList.add('oculto');
    } else {
      x = direita ? f.right + LIGA : f.left - LIGA - w;
      y = f.top + f.height / 2 - h / 2;
      fio.classList.remove('oculto');
      fio.classList.toggle('pela-esquerda', !direita);
      fio.style.left = (sx + (direita ? f.right : f.left - LIGA)) + 'px';
      fio.style.top = Math.round(sy + f.top + f.height / 2) + 'px';
      fio.style.width = LIGA + 'px';
    }
    etq.style.left = (sx + x) + 'px';
    etq.style.top = (sy + y) + 'px';
    void etq.offsetWidth;
    fio.classList.add('on'); etq.classList.add('on');
  }
  function esconderEtiqueta() {
    if (!etq) return;
    etqDe = null; fio.classList.remove('on'); etq.classList.remove('on');
  }
  if (etq) {
    grid.querySelectorAll('.peca').forEach(function (b) {
    });
    document.addEventListener('click', function (e) { if (modoCelular.matches && !e.target.closest('#pecas .peca')) esconderEtiqueta(); });
  }

  grid.addEventListener('click', function (e) {
    var b = e.target.closest('.peca');
    if (!b) return;
    var p = itens[+b.dataset.i];
    var isLink = ehMateriaLink(p, sala);
    if (isLink) return; // Deixa o link nativo funcionar (abre em nova aba)
    e.preventDefault();
    if (etq && modoCelular.matches && etqDe !== b) { mostrarEtiqueta(b, true); return; }
    esconderEtiqueta();
    figAberta = b.querySelector('figure');
    comTransicao(function () { abrir(p); }, figAberta, mediaAberta);
    try { history.replaceState(null, '', '#' + encodeURIComponent(p.id)); } catch (err) {}
  });
  function abrirDoEndereco() {
    var h = decodeURIComponent(location.hash.replace('#', ''));
    if (!h || dlg.open) return;
    // Support #m-* hashes for matérias
    var targetId = h.startsWith('m-') ? h : h;
    for (var i = 0; i < itens.length; i++) {
      if (itens[i].id === targetId || itens[i].id === targetId + '-0') { figAberta = grid.querySelector('.peca[data-i="' + i + '"] figure'); abrir(itens[i]); return; }
    }
  }
  abrirDoEndereco();
  window.addEventListener('hashchange', abrirDoEndereco);
  dlg.querySelector('.fechar').addEventListener('click', fechar);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) fechar(); });
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); fechar(); });
  dlg.addEventListener('close', function () {
    dlg.querySelectorAll('video').forEach(function (v) { v.pause(); });
    try { history.replaceState(null, '', location.pathname + location.search); } catch (err) {}
    dlg.querySelector('.dlg-corpo').innerHTML = '';
  });
})();
