// Página da matéria completa com vídeo
(function () {
  var A = window.AR, esc = A.esc, caminho = A.caminho, fmtData = A.fmtData;
  var params = new URLSearchParams(location.search);
  var mId = params.get('m');
  var wrap = document.querySelector('.materia-wrap');
  var voltar = '<a class="materia-voltar" href="../jornalismo/">← Jornalismo</a>';

  function capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  function formatDataBr(iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return iso;
    return m[3] + '/' + m[2] + '/' + m[1];
  }

  function insertVideoAfterSecondParagraph(html, videoId) {
    if (!videoId) return html;
    var div = document.createElement('div');
    div.innerHTML = html;
    var paragraphs = div.querySelectorAll('p');
    if (paragraphs.length < 2) return html;
    var videoFigure = document.createElement('figure');
    videoFigure.className = 'materia-video';
    var isVertical = videoId.indexOf('reel') >= 0 || videoId.indexOf('story') >= 0;
    var style = isVertical ? 'style="max-width:360px;margin:1.5em auto;display:block;"' : 'style="width:100%;margin:1.5em 0;display:block;"';
    videoFigure.innerHTML = '<video controls playsinline preload="metadata" poster="../media/video/' + videoId + '.jpg" src="../media/video/' + videoId + '.mp4" ' + style + '></video>';
    paragraphs[1].insertAdjacentElement('afterend', videoFigure);
    return div.innerHTML;
  }

  function makeLinksBlank(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('a').forEach(function (a) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    });
    return div.innerHTML;
  }

  if (!mId) {
    wrap.innerHTML = voltar + '<p class="materia-erro">Matéria não encontrada.</p>';
    document.title = 'Matéria não encontrada · Arthur Ramos';
    return;
  }

  var peca = (window.PECAS || []).find(function (p) { return p.id === mId; });
  if (!peca || !peca.materia) {
    wrap.innerHTML = voltar + '<p class="materia-erro">Matéria não encontrada.</p>';
    document.title = 'Matéria não encontrada · Arthur Ramos';
    return;
  }

  var materia = window.MATERIAS && window.MATERIAS[peca.materia];
  if (!materia) {
    wrap.innerHTML = voltar + '<p class="materia-erro">Matéria não encontrada.</p>';
    document.title = 'Matéria não encontrada · Arthur Ramos';
    return;
  }

  var papelCapitalizado = capitalizeFirst(peca.papel || 'Texto e vídeo');
  var metaLinha = (materia.veiculo || '') + (materia.editoria ? ' · ' + materia.editoria : '') + (materia.data ? ' · ' + formatDataBr(materia.data) : '');
  var metaAutor = papelCapitalizado + ': Arthur Ramos · ' + materia.veiculo;

  var htmlTexto = insertVideoAfterSecondParagraph(materia.html || '', materia.video);
  htmlTexto = makeLinksBlank(htmlTexto);

  var galeria = '';
  if (peca.imgs && peca.imgs.length > 1) {
    var fotos = peca.imgs.slice(1).map(function (img) {
      return '<figure><img src="../' + img + '" alt="" loading="lazy"></figure>';
    }).join('');
    galeria = '<div class="materia-fotos">' + fotos + '</div>';
  }

  var conteudo = voltar +
    '<p class="mono">' + esc(metaLinha) + '</p>' +
    '<h1>' + esc(materia.titulo) + '</h1>' +
    (materia.linhafina ? '<p class="materia-linhafina">' + esc(materia.linhafina) + '</p>' : '') +
    '<p class="materia-meta">' + esc(metaAutor) + '</p>' +
    '<figure class="materia-capa"><img src="../' + peca.imgs[0] + '" alt="" loading="eager"></figure>' +
    '<div class="materia-texto">' + htmlTexto + '</div>' +
    galeria +
    '<a class="materia-original btn" href="' + esc(materia.url) + '" target="_blank" rel="noopener">Ler no ' + esc(materia.veiculo) + ' ↗</a>';

  wrap.innerHTML = conteudo;
  document.title = esc(materia.titulo) + ' · Arthur Ramos';
})();