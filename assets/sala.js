// Página de sala: grade de peças e o diálogo de cada peça.
(function () {
  var A = window.AR, S = A.S, esc = A.esc, caminho = A.caminho, thumb = A.thumb;
  var sala = document.body.getAttribute('data-sala');
  document.documentElement.style.setProperty('--cor', 'var(--' + sala + ')');
  var grid = document.getElementById('pecas');
  var dlg = document.getElementById('dlg');
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

  function capa(p) {
    var img = (p.imgs && p.imgs[0]) || p.poster || (p.videos && p.videos[0].poster);
    var ehVideo = !!(p.video || p.videos);
    if (!img) {
      var m = p.materia && window.MATERIAS ? window.MATERIAS[p.materia] : null;
      var txt = (m && m.linhafina) ? m.linhafina : (p.resumo || p.titulo);
      return '<figure><div class="capa-texto">' + esc(txt) + '</div></figure>';
    }
    return '<figure><img src="' + caminho(thumb(img)) + '" alt="" loading="lazy">' + (ehVideo ? '<span class="play">vídeo</span>' : '') + '</figure>';
  }
  grid.innerHTML = itens.map(function (p, i) {
    var meta = [p.periodo, p.onde].filter(Boolean).join(' · ');
    return '<a class="peca" href="#' + encodeURIComponent(p.id) + '" data-i="' + i + '" data-shape="' + (p.shape || 'h') + '"' + (p._foto ? ' aria-label="' + esc(p.titulo + ', foto ' + p._n) + '"' : '') + '>' + capa(p) +
      '<h3>' + esc(p.titulo) + '</h3><span class="meta">' + esc(meta) + '</span>' + (papelOk(p) ? '<span class="papel">' + esc(p.papel) + '</span>' : '') + '</a>';
  }).join('');
  if (!itens.length) grid.innerHTML = '<p class="vazio">Ainda não tem nada aqui.</p>';

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
    var meta = [p.periodo, p.onde].filter(Boolean).join(' · ');
    var info = '<p class="mono">' + esc(meta) + '</p><h2 id="dlg-h">' + esc(p.titulo) + '</h2>';
    if (m && m.linhafina) info += '<p class="linhafina">' + esc(m.linhafina) + '</p>';
    if (p.resumo) info += '<p class="resumo">' + esc(p.resumo) + '</p>';
    if (papelOk(p)) info += '<p class="papel"><b>O que eu fiz:</b> ' + esc(p.papel) + '</p>';
    if (p.detalhe) info += '<div class="detalhe">' + esc(p.detalhe) + '</div>';
    var links = [];
    if (m && m.url) links.push('<a class="btn btn-leve" href="' + esc(m.url) + '" target="_blank" rel="noopener">Ler no ' + esc(m.veiculo) + '</a>');
    if (p.link) links.push('<a class="btn btn-leve" href="' + esc(p.link.url) + '" target="_blank" rel="noopener">' + esc(p.link.rotulo) + '</a>');
    if (m) links.push('<button class="btn btn-leve ler" type="button">Ler a matéria aqui</button>');
    if (links.length) info += '<div class="links">' + links.join('') + '</div>';
    if (m) {
      var rodape = 'Publicado em ' + esc(A.fmtData(m.data)) + ' no ' + esc(m.veiculo);
      if (m.credito && m.credito !== 'Arthur Ramos') rodape += ' · Texto: ' + esc(m.credito);
      info += '<div class="materia" hidden>' + m.html + '<p class="mono" style="margin-top:1.5em">' + rodape + '</p></div>';
    }
    return { media: media, info: '<div class="dlg-info">' + info + '</div>' };
  }

  function abrir(p) {
    var c = corpo(p), corpoEl = dlg.querySelector('.dlg-corpo');
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
    var ler = dlg.querySelector('.ler');
    if (ler) ler.addEventListener('click', function () {
      var t = dlg.querySelector('.materia');
      t.hidden = !t.hidden;
      ler.textContent = t.hidden ? 'Ler a matéria aqui' : 'Fechar o texto';
      if (!t.hidden) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  grid.addEventListener('click', function (e) {
    var b = e.target.closest('.peca');
    if (!b) return;
    e.preventDefault();
    var p = itens[+b.dataset.i];
    abrir(p);
    try { history.replaceState(null, '', '#' + encodeURIComponent(p.id)); } catch (err) {}
  });
  function abrirDoEndereco() {
    var h = decodeURIComponent(location.hash.replace('#', ''));
    if (!h || dlg.open) return;
    for (var i = 0; i < itens.length; i++) {
      if (itens[i].id === h || itens[i].id === h + '-0') { abrir(itens[i]); return; }
    }
  }
  abrirDoEndereco();
  window.addEventListener('hashchange', abrirDoEndereco);
  dlg.querySelector('.fechar').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () {
    dlg.querySelectorAll('video').forEach(function (v) { v.pause(); });
    try { history.replaceState(null, '', location.pathname + location.search); } catch (err) {}
    dlg.querySelector('.dlg-corpo').innerHTML = '';
  });
})();
