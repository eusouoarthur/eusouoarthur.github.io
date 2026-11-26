// Painel "Editar peças": ordem das imagens, capa, quadro do vídeo como capa, arquivos novos e peças novas.
// Lê data/pecas.js (original, nunca alterado) + _paperclip/curadoria/pecas.json (o que ele mudou, pelo servidor local).
// Toda mudança é salva sozinha no servidor, que atualiza data/categorias.js; o site aplica os ajustes ao abrir.
(function () {
  'use strict';
  var R = '../../';
  var ORIG = {};
  (window.PECAS || []).forEach(function (p) { ORIG[p.id] = JSON.parse(JSON.stringify(p)); });
  var AJ = { pecas: {}, novas: [] };
  var atual = null;
  var CAMPOS = ['titulo', 'onde', 'periodo', 'papel', 'resumo', 'salas', 'shape', 'imgs', 'video', 'poster', 'videos'];
  var $ = function (s, c) { return (c || document).querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function copia(o) { return JSON.parse(JSON.stringify(o)); }
  function aviso(t) { $('#ped-aviso').textContent = t; }

  // ——— Dados ———
  function ehNova(id) { return AJ.novas.some(function (n) { return n.id === id; }); }
  function pegar(id) {
    var n = AJ.novas.filter(function (x) { return x.id === id; })[0];
    if (n) return copia(n);
    if (!ORIG[id]) return null;
    return Object.assign(copia(ORIG[id]), copia(AJ.pecas[id] || {}));
  }
  // Guarda a peça editada: peça nova inteira; peça antiga só com os campos que mudaram em relação ao original.
  function guardar(p) {
    if (ehNova(p.id)) {
      AJ.novas = AJ.novas.map(function (n) { return n.id === p.id ? p : n; });
    } else {
      var dif = {};
      CAMPOS.forEach(function (k) {
        if (JSON.stringify(p[k]) !== JSON.stringify(ORIG[p.id][k]) && !(p[k] === undefined)) dif[k] = p[k];
      });
      if (Object.keys(dif).length) AJ.pecas[p.id] = dif; else delete AJ.pecas[p.id];
    }
    salvar();
  }
  var esperaSalvar = 0;
  function salvar() {
    aviso('Salvando…');
    clearTimeout(esperaSalvar);
    esperaSalvar = setTimeout(function () {
      fetch('../pecas/salvar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(AJ) })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          var h = new Date();
          aviso('Salvo às ' + String(h.getHours()).padStart(2, '0') + ':' + String(h.getMinutes()).padStart(2, '0') + '. O site já mostra a mudança.');
        })
        .catch(function () { aviso('Não consegui salvar. O servidor do painel está ligado?'); });
    }, 400);
  }
  function mudar(fn) { var p = pegar(atual); fn(p); guardar(p); render(); lista(); }

  // Vídeos da peça num formato só: [{src, poster, titulo}].
  function videosDe(p) {
    if (p.videos && p.videos.length) return p.videos;
    if (p.video) return [{ src: p.video, poster: p.poster || '', titulo: p.titulo || '' }];
    return [];
  }
  function gravarVideos(p, vs) {
    if (vs.length <= 1 && !(p.videos && p.videos.length) && !(ORIG[p.id] && ORIG[p.id].videos)) {
      p.video = vs[0] ? vs[0].src : '';
      p.poster = vs[0] ? vs[0].poster : '';
    } else {
      p.videos = vs;
      if (p.video) { p.video = ''; p.poster = ''; }
    }
  }
  function capaDe(p) { var v = videosDe(p)[0]; return (p.imgs && p.imgs[0]) || p.poster || (v && v.poster) || ''; }
  function miniatura(src) {
    var d = window.IMAGENS && window.IMAGENS[src];
    return R + (d ? src.replace(/\.(jpg|png)$/, '.400.webp') : src);
  }

  // ——— Envio de arquivos ———
  function enviar(arquivo, nome) {
    return fetch('../enviar?peca=' + encodeURIComponent(atual) + '&nome=' + encodeURIComponent(nome || arquivo.name), { method: 'POST', body: arquivo })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.caminho) throw new Error(j.erro || r.status); return j.caminho; }); });
  }
  // Tira uma foto do quadro que está na tela do vídeo e envia como imagem.
  function capturar(video, nome) {
    var c = document.createElement('canvas');
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    return new Promise(function (ok, erro) { c.toBlob(function (b) { b ? ok(b) : erro(new Error('quadro vazio')); }, 'image/jpeg', 0.9); })
      .then(function (b) { return enviar(b, nome); });
  }
  // Vídeo novo sem capa: usa o quadro de 1 segundo.
  function capaAutomatica(src) {
    return new Promise(function (ok) {
      var v = document.createElement('video');
      v.muted = true; v.preload = 'auto'; v.src = R + src;
      v.addEventListener('loadeddata', function () { v.currentTime = Math.min(1, (v.duration || 2) / 2); }, { once: true });
      v.addEventListener('seeked', function () { capturar(v, atual + '-capa.jpg').then(ok, function () { ok(''); }); }, { once: true });
      v.addEventListener('error', function () { ok(''); }, { once: true });
    });
  }
  function formatoPor(w, h) { var r = w / h; return r > 1.6 ? 'wide' : r > 1.15 ? 'h' : r > 0.85 ? 'sq' : 'v'; }
  function adicionarArquivos(files) {
    files = [].slice.call(files);
    if (!files.length) return;
    var feitos = 0;
    aviso('Enviando ' + files.length + ' arquivo(s)…');
    files.reduce(function (cadeia, f) {
      return cadeia.then(function () {
        var video = /^video\//.test(f.type) || /\.(mp4|mov|webm|m4v)$/i.test(f.name);
        return enviar(f).then(function (cam) {
          if (!video) { mudar(function (p) { p.imgs = (p.imgs || []).concat([cam]); }); feitos++; return; }
          return capaAutomatica(cam).then(function (poster) {
            mudar(function (p) { var vs = videosDe(p).slice(); vs.push({ src: cam, poster: poster, titulo: f.name.replace(/\.[^.]+$/, '') }); gravarVideos(p, vs); });
            feitos++;
          });
        });
      });
    }, Promise.resolve())
      .then(function () { aviso(feitos + ' arquivo(s) adicionado(s).'); salvar(); })
      .catch(function (e) { aviso('Erro ao enviar: ' + e.message); });
  }

  // ——— Lista da esquerda ———
  function todas() {
    return Object.keys(ORIG).map(pegar).concat(AJ.novas.map(copia));
  }
  function lista() {
    var q = ($('#ped-busca').value || '').toLowerCase();
    $('#ped-lista').innerHTML = todas().filter(function (p) {
      return !q || (p.titulo + ' ' + p.id + ' ' + (p.onde || '')).toLowerCase().indexOf(q) >= 0;
    }).map(function (p) {
      var c = capaDe(p);
      return '<li><a href="#' + esc(p.id) + '"' + (p.id === atual ? ' aria-current="true"' : '') + '>' +
        (c ? '<img src="' + esc(miniatura(c)) + '" alt="" loading="lazy">' : '<span class="ped-semimg"></span>') +
        '<span>' + esc(p.titulo || '(sem título)') + (ehNova(p.id) ? ' <em>nova</em>' : '') + '</span></a></li>';
    }).join('');
  }

  // ——— Editor da peça ———
  function render() {
    var main = $('#ped-main'), p = atual && pegar(atual);
    if (!p) { main.innerHTML = '<p class="ped-vazio">Escolha uma peça na lista ao lado, ou crie uma peça nova.</p>'; return; }
    var imgs = p.imgs || [], vs = videosDe(p);
    var salas = (window.SITE.salas || []).map(function (s) { return '<option value="' + s.id + '"' + ((p.salas || [])[0] === s.id ? ' selected' : '') + '>' + esc(s.nome) + '</option>'; }).join('');
    var formatos = [['h', 'Horizontal (4:3)'], ['wide', 'Larga (16:9)'], ['sq', 'Quadrada'], ['v', 'Em pé (9:16)']].map(function (f) { return '<option value="' + f[0] + '"' + (p.shape === f[0] ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('');
    main.innerHTML =
      '<h1>' + esc(p.titulo || '(sem título)') + '</h1>' +
      '<p class="ped-id mono">' + esc(p.id) + (ehNova(p.id) ? ' · peça nova' : '') + '</p>' +

      (!imgs.length && vs.length ? '' : '<section class="ped-sec"><h2>Imagens</h2>' +
      (imgs.length ? '<p class="ped-dica">A primeira é a capa da peça. Arraste para mudar a ordem, ou use as setas.</p>' +
        '<div class="ped-grade" id="ped-imgs">' + imgs.map(function (src, k) {
          return '<figure class="ped-tile" data-k="' + k + '"><img src="' + esc(miniatura(src)) + '" alt="" draggable="false">' +
            '<figcaption><span class="ped-n">' + (k === 0 ? 'Capa' : k + 1) + '</span>' +
            '<button type="button" data-acao="esq" data-k="' + k + '" aria-label="Para trás"' + (k === 0 ? ' disabled' : '') + '>←</button>' +
            '<button type="button" data-acao="dir" data-k="' + k + '" aria-label="Para a frente"' + (k === imgs.length - 1 ? ' disabled' : '') + '>→</button>' +
            (k ? '<button type="button" data-acao="capa" data-k="' + k + '">Capa</button>' : '') +
            '<button type="button" data-acao="tirar" data-k="' + k + '">Tirar</button></figcaption></figure>';
        }).join('') + '</div>'
        : '<p class="ped-dica">Ainda sem imagens. Use "Adicionar arquivos", no fim da página.</p>') +
      '</section>') +

      (vs.length ? '<section class="ped-sec"><h2>' + (vs.length > 1 ? 'Vídeos' : 'Vídeo') + '</h2>' +
        '<p class="ped-dica">Para escolher a capa: toque o vídeo, pare no quadro que quiser e aperte "Usar este quadro como capa".' + (imgs.length ? ' (Nesta peça a capa na parede é a primeira imagem; o quadro vira a capa do vídeo.)' : '') + '</p>' +
        vs.map(function (v, k) {
          return '<div class="ped-video" data-k="' + k + '">' +
            '<video controls preload="metadata" playsinline src="' + esc(R + v.src) + '"' + (v.poster ? ' poster="' + esc(R + v.poster) + '"' : '') + '></video>' +
            '<div class="ped-video-lado">' +
            (v.poster ? '<p class="ped-dica">Capa atual:</p><img class="ped-capa-atual" src="' + esc(miniatura(v.poster)) + '" alt="">' : '<p class="ped-dica">Sem capa ainda.</p>') +
            (vs.length > 1 ? '<label>Nome do vídeo <input type="text" data-vtitulo="' + k + '" value="' + esc(v.titulo || '') + '"></label>' : '') +
            '<button class="btn btn-cheio" type="button" data-acao="quadro" data-k="' + k + '">Usar este quadro como capa</button>' +
            '<label class="btn ped-arquivo">Enviar uma imagem de capa<input type="file" accept="image/*" data-capa-video="' + k + '" hidden></label>' +
            (vs.length > 1 ? '<span class="ped-linha"><button type="button" data-acao="vesq" data-k="' + k + '"' + (k === 0 ? ' disabled' : '') + '>← Antes</button> <button type="button" data-acao="vdir" data-k="' + k + '"' + (k === vs.length - 1 ? ' disabled' : '') + '>Depois →</button></span>' : '') +
            '<button type="button" class="ped-tirar" data-acao="vtirar" data-k="' + k + '">Tirar este vídeo da peça</button>' +
            '</div></div>';
        }).join('') + '</section>' : '') +

      '<section class="ped-sec"><h2>Textos</h2>' +
      '<div class="ped-form">' +
      '<label>Título <input type="text" data-campo="titulo" value="' + esc(p.titulo) + '"></label>' +
      '<label>Onde / para quem <input type="text" data-campo="onde" value="' + esc(p.onde) + '"></label>' +
      '<label>Ano <input type="text" data-campo="periodo" value="' + esc(p.periodo) + '"></label>' +
      '<label class="ped-largo">Legenda <textarea data-campo="resumo" rows="3">' + esc(p.resumo) + '</textarea></label>' +
      '<label>Página do site <select data-campo="sala">' + salas + '</select></label>' +
      '<label>Formato da capa <select data-campo="shape">' + formatos + '</select></label>' +
      '</div></section>' +
      secaoCategorias(p.id) +
      '<section class="ped-sec"><h2>Adicionar arquivos</h2>' +
      '<label class="ped-solta" id="ped-solta">Solte aqui imagens ou vídeos que ficaram de fora, ou clique para escolher.<input type="file" id="ped-arquivos" accept="image/*,video/*" multiple hidden></label>' +
      '<p class="ped-dica">Imagens entram no fim da lista; vídeos entram com a capa no quadro de 1 segundo (dá para trocar depois).</p></section>' +

      (ehNova(p.id) ? '<section class="ped-sec"><p class="ped-dica">Peça nova: depois de pôr os arquivos, vá em <a href="../curadoria/">Separar as peças</a> e escolha a categoria dela (ela aparece em "Sem categoria").</p>' +
        '<button type="button" class="ped-tirar" data-acao="apagar">Apagar esta peça nova</button></section>' : '');
    ligarArrastar();
  }

  // ——— Categorias e "fora do site" (mesmos dados da página Separar as peças) ———
  // A curadoria guarda o estado no navegador (curadoria-v1) e no computador (selecao.json); aqui mexe nos dois.
  var CHAVE_CUR = 'curadoria-v1', CUR = null;
  function carregarCuradoria() {
    try { CUR = JSON.parse(localStorage.getItem(CHAVE_CUR)); } catch (e) { CUR = null; }
    if (CUR && CUR.categorias) return Promise.resolve();
    return fetch('../curadoria/selecao.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.categorias) CUR = d; }).catch(function () {});
  }
  var esperaCur = 0;
  function salvarCuradoria() {
    localStorage.setItem(CHAVE_CUR, JSON.stringify(CUR));
    aviso('Salvando…');
    clearTimeout(esperaCur);
    esperaCur = setTimeout(function () {
      fetch('../curadoria/salvar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(CUR) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); aviso('Salvo. O site já mostra a mudança.'); })
        .catch(function () { aviso('Não consegui salvar. O servidor do painel está ligado?'); });
    }, 400);
  }
  function secaoCategorias(id) {
    if (!CUR) return '';
    var fora = (CUR.fora || []).indexOf(id) >= 0;
    return '<section class="ped-sec"><h2>Categorias</h2>' +
      '<p class="ped-dica">Marque onde esta peça aparece no site. Pode marcar mais de uma.</p>' +
      '<div class="ped-cats' + (fora ? ' ped-apagado' : '') + '">' + CUR.categorias.map(function (c) {
        return '<fieldset><legend>' + esc(c.nome) + '</legend>' + (c.subs || []).map(function (s) {
          var em = (s.pecas || []).indexOf(id) >= 0;
          return '<label class="ped-chip"><input type="checkbox" data-cat="' + esc(c.id) + '" data-sub="' + esc(s.id) + '"' + (em ? ' checked' : '') + (fora ? ' disabled' : '') + '> ' + esc(s.nome) + '</label>';
        }).join('') + '</fieldset>';
      }).join('') + '</div>' +
      '<label class="ped-fora"><input type="checkbox" data-fora' + (fora ? ' checked' : '') + '> Deixar esta peça fora do site</label>' +
      '<p class="ped-dica">Fora do site, ela some das páginas, mas continua guardada aqui no painel.</p></section>';
  }

  // Arrastar imagens com o mouse ou o dedo (o arrastar nativo não funciona no navegador do app).
  function ligarArrastar() {
    var grade = $('#ped-imgs');
    if (!grade) return;
    grade.addEventListener('pointerdown', function (e) {
      var t = e.target.closest('.ped-tile');
      if (!t || e.target.closest('button') || e.button > 0) return;
      e.preventDefault();
      var movido = false, x0 = e.clientX, y0 = e.clientY;
      t.setPointerCapture(e.pointerId);
      function mover(ev) {
        if (!movido && Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) < 6) return;
        movido = true; t.classList.add('arrastando');
        t.style.pointerEvents = 'none';
        var alvo = document.elementFromPoint(ev.clientX, ev.clientY);
        t.style.pointerEvents = '';
        alvo = alvo && alvo.closest('.ped-tile');
        if (!alvo || alvo === t || alvo.parentNode !== grade) return;
        var r = alvo.getBoundingClientRect();
        grade.insertBefore(t, ev.clientX < r.left + r.width / 2 ? alvo : alvo.nextSibling);
      }
      function soltar() {
        t.removeEventListener('pointermove', mover);
        t.classList.remove('arrastando');
        if (!movido) return;
        var ordem = [].map.call(grade.children, function (n) { return +n.dataset.k; });
        mudar(function (p) { var antes = p.imgs.slice(); p.imgs = ordem.map(function (k) { return antes[k]; }); });
      }
      t.addEventListener('pointermove', mover);
      t.addEventListener('pointerup', soltar, { once: true });
      t.addEventListener('pointercancel', soltar, { once: true });
    });
  }
  function trocar(arr, a, b) { var x = arr[a]; arr[a] = arr[b]; arr[b] = x; }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-acao]');
    if (!b) return;
    var k = +b.dataset.k, acao = b.dataset.acao;
    if (acao === 'quadro') {
      var v = $('.ped-video[data-k="' + k + '"] video');
      // Parado no começo, o vídeo mostra a capa atual por cima, mas o quadro de verdade é o primeiro: não grava.
      if (!v.videoWidth || v.currentTime === 0) { aviso('Toque o vídeo (ou arraste a barra dele) e pare no quadro que quiser. Depois aperte o botão.'); return; }
      aviso('Guardando o quadro…');
      v.pause();
      capturar(v, atual + '-capa.jpg').then(function (cam) {
        mudar(function (p) { var vs = videosDe(p).slice(); vs[k] = Object.assign({}, vs[k], { poster: cam }); gravarVideos(p, vs); });
        aviso('Capa do vídeo trocada e salva. Veja em "Capa atual".');
      }, function (er) { aviso('Não consegui pegar o quadro: ' + er.message); });
      return;
    }
    if (acao === 'apagar') {
      if (!confirm('Apagar esta peça nova? Os arquivos enviados continuam guardados no computador.')) return;
      AJ.novas = AJ.novas.filter(function (n) { return n.id !== atual; });
      atual = null; location.hash = ''; salvar(); render(); lista(); return;
    }
    mudar(function (p) {
      var imgs = (p.imgs || []).slice(), vs = videosDe(p).slice();
      if (acao === 'esq') trocar(imgs, k, k - 1);
      if (acao === 'dir') trocar(imgs, k, k + 1);
      if (acao === 'capa') imgs.unshift(imgs.splice(k, 1)[0]);
      if (acao === 'tirar') imgs.splice(k, 1);
      if (acao === 'vesq') trocar(vs, k, k - 1);
      if (acao === 'vdir') trocar(vs, k, k + 1);
      if (acao === 'vtirar') { if (!confirm('Tirar este vídeo da peça? O arquivo continua no computador.')) return; vs.splice(k, 1); }
      if (p.imgs || imgs.length) p.imgs = imgs;
      if (/^v/.test(acao)) gravarVideos(p, vs);
    });
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'ped-arquivos') { adicionarArquivos(t.files); t.value = ''; return; }
    if (t.dataset.capaVideo != null) {
      var k = +t.dataset.capaVideo;
      enviar(t.files[0]).then(function (cam) {
        mudar(function (p) { var vs = videosDe(p).slice(); vs[k] = Object.assign({}, vs[k], { poster: cam }); gravarVideos(p, vs); });
      }, function (er) { aviso('Erro ao enviar: ' + er.message); });
      return;
    }
    if (t.dataset.sub && CUR) {
      CUR.categorias.forEach(function (c) {
        if (c.id !== t.dataset.cat) return;
        c.subs.forEach(function (sb) {
          if (sb.id !== t.dataset.sub) return;
          sb.pecas = (sb.pecas || []).filter(function (x) { return x !== atual; });
          if (t.checked) sb.pecas.push(atual);
        });
      });
      salvarCuradoria(); return;
    }
    if (t.hasAttribute('data-fora') && CUR) {
      CUR.fora = (CUR.fora || []).filter(function (x) { return x !== atual; });
      if (t.checked) CUR.fora.push(atual);
      salvarCuradoria(); render(); return;
    }
    if (t.dataset.vtitulo != null) {
      var j = +t.dataset.vtitulo, val = t.value;
      var p = pegar(atual), vs = videosDe(p).slice(); vs[j] = Object.assign({}, vs[j], { titulo: val }); gravarVideos(p, vs); guardar(p); return;
    }
    if (t.dataset.campo) {
      var q = pegar(atual), c = t.dataset.campo;
      if (c === 'sala') { var s = (q.salas || []).filter(function (x) { return x !== t.value; }); q.salas = [t.value].concat(s); }
      else q[c] = t.value;
      guardar(q);
      if (c === 'titulo') { $('#ped-main h1').textContent = t.value; lista(); }
    }
  });
  // Soltar arquivos na área.
  ['dragover', 'drop'].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      var zona = e.target.closest && e.target.closest('#ped-solta');
      if (!zona) return;
      e.preventDefault();
      if (ev === 'drop') adicionarArquivos(e.dataTransfer.files);
    });
  });

  // Peça nova.
  function limpo(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  $('#ped-nova').addEventListener('click', function () {
    var titulo = prompt('Nome da peça nova:');
    if (!titulo) return;
    var base = 'nova-' + (limpo(titulo) || 'peca'), id = base, n = 2;
    while (ORIG[id] || ehNova(id)) id = base + '-' + n++;
    AJ.novas.push({ id: id, salas: [(window.SITE.salas[0] || {}).id || 'design'], titulo: titulo, periodo: '', onde: '', papel: '', resumo: '', shape: 'h', imgs: [] });
    salvar();
    location.hash = id;
  });

  $('#ped-busca').addEventListener('input', lista);
  function rotear() {
    var id = decodeURIComponent(location.hash.slice(1));
    atual = (ORIG[id] || ehNova(id)) ? id : null;
    render(); lista();
    if (atual) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', rotear);

  fetch('../pecas.json').then(function (r) { return r.json(); }).then(function (j) {
    AJ = { pecas: j.pecas || {}, novas: j.novas || [] };
  }).catch(function () { aviso('Servidor do painel desligado: dá para ver, mas não para salvar.'); })
    .then(carregarCuradoria).then(rotear);

  window.painelPecas = { estado: function () { return copia(AJ); }, pegar: pegar, curadoria: function () { return copia(CUR); } };
})();
