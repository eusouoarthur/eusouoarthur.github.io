(function () {
  'use strict';

  const STORAGE_KEY = 'curadoria-v1';
  let estadoAtual = null;
  let categoriaSelecionada = null;
  let pecaEditando = null;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function cloneEstado(estado) {
    return JSON.parse(JSON.stringify(estado));
  }

  function carregarEstado() {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) {
      try {
        return JSON.parse(salvo);
      } catch {
        return cloneEstado(window.CURADORIA_INICIAL);
      }
    }
    return cloneEstado(window.CURADORIA_INICIAL);
  }

  function salvarEstado() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estadoAtual));
    const aviso = document.getElementById('cur-salvo');
    if (aviso) aviso.textContent = 'Mudanças ainda não salvas no computador.';
  }

  // Salvar no computador: o servidor local (_paperclip/servidor.py) grava _paperclip/curadoria/selecao.json.
  function salvarNoComputador() {
    const aviso = document.getElementById('cur-salvo');
    aviso.textContent = 'Salvando…';
    fetch('salvar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(estadoAtual) })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        const h = new Date();
        aviso.textContent = 'Salvo às ' + String(h.getHours()).padStart(2, '0') + ':' + String(h.getMinutes()).padStart(2, '0') + '.';
      })
      .catch(function () { aviso.textContent = 'Não consegui salvar no computador. No navegador continua guardado.'; });
  }
  document.addEventListener('click', function (e) { if (e.target && e.target.id === 'cur-salvar') salvarNoComputador(); });

  function obterMiniatura(peca) {
    if (peca.imgs && peca.imgs.length > 0) {
      return '../../' + peca.imgs[0];
    }
    if (peca.poster) {
      return '../../' + peca.poster;
    }
    if (peca.videos && peca.videos.length > 0 && peca.videos[0].poster) {
      return '../../' + peca.videos[0].poster;
    }
    return null;
  }

  function encontrarPeca(id) {
    return window.PECAS.find(p => p.id === id);
  }

  function obterTodasSubcategorias() {
    const subs = [];
    estadoAtual.categorias.forEach(cat => {
      cat.subs.forEach(sub => {
        subs.push({ ...sub, categoriaId: cat.id, categoriaNome: cat.nome });
      });
    });
    return subs;
  }

  function pecaEstaNaSubcategoria(pecaId, subId) {
    const sub = estadoAtual.categorias
      .flatMap(c => c.subs)
      .find(s => s.id === subId);
    return sub && sub.pecas.includes(pecaId);
  }

  function pecaEstaEmFora(pecaId) {
    return estadoAtual.fora.includes(pecaId);
  }

  function removerPecaDeTodasSubcategorias(pecaId) {
    estadoAtual.categorias.forEach(cat => {
      cat.subs.forEach(sub => {
        const idx = sub.pecas.indexOf(pecaId);
        if (idx !== -1) sub.pecas.splice(idx, 1);
      });
    });
  }

  function obterPecasSemCategoria() {
    const idsEmSubs = new Set(
      estadoAtual.categorias.flatMap(c => c.subs.flatMap(s => s.pecas))
    );
    const idsEmFora = new Set(estadoAtual.fora);
    return window.PECAS
      .filter(p => !idsEmSubs.has(p.id) && !idsEmFora.has(p.id))
      .map(p => p.id);
  }

  function criarElemento(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    const booleanAttrs = new Set(['checked', 'disabled', 'selected', 'readonly', 'required', 'multiple', 'autofocus', 'autoplay', 'controls', 'loop', 'muted', 'open', 'hidden']);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'dataset') {
        Object.entries(v).forEach(([dk, dv]) => el.dataset[dk] = dv);
      } else if (booleanAttrs.has(k)) {
        if (v) el.setAttribute(k, '');
        else el.removeAttribute(k);
        el[k] = !!v;
      } else {
        el.setAttribute(k, v);
      }
    });
    children.forEach(c => {
      if (typeof c === 'string') el.appendChild(document.createTextNode(c));
      else if (c instanceof Node) el.appendChild(c);
    });
    return el;
  }

  function render() {
    renderAbas();
    renderSubs();
    renderFixas();
    atualizarBarra();
  }

  function renderAbas() {
    const container = $('.cur-abas');
    container.innerHTML = '';

    estadoAtual.categorias.forEach((cat, idx) => {
      const totalPecas = cat.subs.reduce((sum, s) => sum + s.pecas.length, 0);
      const aba = criarElemento('button', {
        role: 'tab',
        'aria-selected': idx === 0 && categoriaSelecionada === null ? 'true' : cat.id === categoriaSelecionada,
        'data-cat': cat.id,
        class: 'cur-aba' + (cat.id === categoriaSelecionada ? ' ativa' : ''),
        onclick: () => { if (!arrastou) selecionarCategoria(cat.id); }
      }, [
        criarElemento('span', { class: 'cur-aba-nome' }, [cat.nome]),
        criarElemento('span', { class: 'cur-aba-qtd' }, [String(totalPecas)]),
        criarElemento('button', {
          type: 'button',
          class: 'cur-aba-mover',
          'data-mover': '-1',
          'aria-label': 'Mover categoria para a esquerda',
          onclick: (e) => { e.stopPropagation(); moverCategoria(idx, idx - 1); }
        }, ['←']),
        criarElemento('button', {
          type: 'button',
          class: 'cur-aba-mover',
          'data-mover': '1',
          'aria-label': 'Mover categoria para a direita',
          onclick: (e) => { e.stopPropagation(); moverCategoria(idx, idx + 1); }
        }, ['→'])
      ]);

      arrastavel(aba, '.cur-abas .cur-aba', (para) => moverCategoria(idx, para));

      container.appendChild(aba);
    });

    if (categoriaSelecionada === null && estadoAtual.categorias.length > 0) {
      selecionarCategoria(estadoAtual.categorias[0].id);
    }
  }

  function selecionarCategoria(catId) {
    categoriaSelecionada = catId;
    $$('.cur-aba').forEach(aba => {
      aba.classList.toggle('ativa', aba.dataset.cat === catId);
      aba.setAttribute('aria-selected', aba.dataset.cat === catId ? 'true' : 'false');
    });
    renderSubs();
  }

  function renderSubs() {
    const container = $('.cur-subs');
    container.innerHTML = '';

    const cat = estadoAtual.categorias.find(c => c.id === categoriaSelecionada);
    if (!cat) return;

    cat.subs.forEach((sub, subIdx) => {
      const secao = criarElemento('section', {
        class: 'cur-sub',
        'data-sub': sub.id
      }, []);

      if (sub.nome) {
        secao.appendChild(criarElemento('h3', {}, [
          criarElemento('span', { class: 'cur-sub-nome' }, [sub.nome]),
          criarElemento('span', { class: 'cur-sub-qtd' }, [String(sub.pecas.length)])
        ]));
      }

      const grade = criarElemento('div', { class: 'cur-grade' });
      if (sub.pecas.length === 0) {
        grade.appendChild(criarElemento('p', { class: 'cur-vazio' }, ['Nenhuma peça ainda.']));
      } else {
        sub.pecas.forEach((pecaId, pIdx) => {
          grade.appendChild(criarCartaoPeca(pecaId, sub.id, pIdx));
        });
      }
      secao.appendChild(grade);
      container.appendChild(secao);
    });
  }

  function criarCartaoPeca(pecaId, subId, idx) {
    const peca = encontrarPeca(pecaId);
    if (!peca) return document.createElement('div');

    const miniatura = obterMiniatura(peca);
    const cartao = criarElemento('article', {
      class: 'cur-peca',
      'data-peca': pecaId,
      onclick: (e) => {
        if (arrastou) return;
        if (!e.target.closest('[data-mover]')) cliqueNaPeca(pecaId);
      }
    }, []);

    if (miniatura) {
      cartao.appendChild(criarElemento('img', {
        src: miniatura,
        loading: 'lazy',
        alt: '',
        class: 'cur-peca-img'
      }));
    } else {
      const placeholder = criarElemento('div', { class: 'cur-peca-placeholder' }, [peca.titulo]);
      cartao.appendChild(placeholder);
    }

    const info = criarElemento('div', { class: 'cur-peca-info' }, [
      criarElemento('h4', { class: 'cur-peca-titulo' }, [peca.titulo]),
      criarElemento('p', { class: 'cur-peca-papel' }, [peca.papel || ''])
    ]);
    cartao.appendChild(info);

    const moverDiv = criarElemento('div', { class: 'cur-peca-mover' }, [
      criarElemento('button', {
        type: 'button',
        class: 'cur-peca-mover-btn',
        'data-mover': '-1',
        'aria-label': 'Mover peça para cima',
        onclick: (e) => { e.stopPropagation(); moverPeca(subId, idx, idx - 1); }
      }, ['↑']),
      criarElemento('button', {
        type: 'button',
        class: 'cur-peca-mover-btn',
        'data-mover': '1',
        'aria-label': 'Mover peça para baixo',
        onclick: (e) => { e.stopPropagation(); moverPeca(subId, idx, idx + 1); }
      }, ['↓'])
    ]);
    cartao.appendChild(moverDiv);

    arrastavel(cartao, '.cur-sub[data-sub="' + subId + '"] .cur-peca', (para) => moverPeca(subId, idx, para));

    return cartao;
  }

  function renderFixas() {
    renderSemCategoria();
    renderFora();
  }

  function renderSemCategoria() {
    const container = $('#cur-sem .cur-grade');
    const ids = obterPecasSemCategoria();
    container.innerHTML = '';
    ids.forEach(pecaId => {
      container.appendChild(criarCartaoFixo(pecaId));
    });
  }

  function renderFora() {
    const container = $('#cur-fora .cur-grade');
    container.innerHTML = '';
    estadoAtual.fora.forEach(pecaId => {
      container.appendChild(criarCartaoFixo(pecaId));
    });
  }

  function criarCartaoFixo(pecaId) {
    const peca = encontrarPeca(pecaId);
    if (!peca) return document.createElement('div');

    const miniatura = obterMiniatura(peca);
    const cartao = criarElemento('article', {
      class: 'cur-peca',
      'data-peca': pecaId,
      onclick: () => cliqueNaPeca(pecaId)
    }, []);

    if (miniatura) {
      cartao.appendChild(criarElemento('img', {
        src: miniatura,
        loading: 'lazy',
        alt: '',
        class: 'cur-peca-img'
      }));
    } else {
      cartao.appendChild(criarElemento('div', { class: 'cur-peca-placeholder' }, [peca.titulo]));
    }

    cartao.appendChild(criarElemento('div', { class: 'cur-peca-info' }, [
      criarElemento('h4', { class: 'cur-peca-titulo' }, [peca.titulo]),
      criarElemento('p', { class: 'cur-peca-papel' }, [peca.papel || ''])
    ]));

    return cartao;
  }

  function abrirEditor(pecaId) {
    pecaEditando = pecaId;
    const peca = encontrarPeca(pecaId);
    if (!peca) return;

    const editor = $('.cur-editor');
    const tituloEl = $('#cur-editor-titulo');
    const corpo = $('.cur-editor-corpo');

    tituloEl.textContent = peca.titulo;
    corpo.innerHTML = '';

    const todasSubs = obterTodasSubcategorias();
    const categoriasAgrupadas = {};
    todasSubs.forEach(sub => {
      if (!categoriasAgrupadas[sub.categoriaNome]) {
        categoriasAgrupadas[sub.categoriaNome] = [];
      }
      categoriasAgrupadas[sub.categoriaNome].push(sub);
    });

    Object.entries(categoriasAgrupadas).forEach(([catNome, subs]) => {
      const grupo = criarElemento('fieldset', { class: 'cur-editor-grupo' }, [
        criarElemento('legend', {}, [catNome])
      ]);
      subs.forEach(sub => {
        const checked = pecaEstaNaSubcategoria(pecaId, sub.id);
        const labelNome = sub.nome || sub.categoriaNome;
        const checkbox = criarElemento('input', {
            type: 'checkbox',
            'data-sub': sub.id,
            checked: checked
          });
          ['change'].forEach(evt => {
            checkbox.addEventListener(evt, () => alternarSubcategoriaNoEditor(pecaId, sub.id));
          });
          const label = criarElemento('label', { class: 'cur-editor-opcao' }, [
            checkbox,
            document.createTextNode(' ' + labelNome)
          ]);
        grupo.appendChild(label);
      });
      corpo.appendChild(grupo);
    });

    const foraChecked = pecaEstaEmFora(pecaId);
    const foraCheckbox = criarElemento('input', {
        type: 'checkbox',
        'data-fora': 'true',
        checked: foraChecked
      });
      ['change'].forEach(evt => {
        foraCheckbox.addEventListener(evt, () => alternarForaNoEditor(pecaId));
      });
      const foraLabel = criarElemento('label', { class: 'cur-editor-opcao cur-editor-fora' }, [
        foraCheckbox,
        document.createTextNode(' Fora do site')
      ]);
    corpo.appendChild(foraLabel);
    corpo.appendChild(criarElemento('button', { type: 'button', class: 'btn cur-copiar', onclick: () => copiar(pecaId) }, ['Copiar estas categorias para outras peças']));
    corpo.appendChild(criarElemento('a', { class: 'btn cur-editar-peca', href: '../pecas/#' + encodeURIComponent(pecaId) }, ['Editar imagens, capa e arquivos desta peça']));

    editor.hidden = false;
    document.body.classList.add('travado');
    $('.cur-editor-fechar').focus();
  }

  function fecharEditor() {
    pecaEditando = null;
    const editor = $('.cur-editor');
    editor.hidden = true;
    document.body.classList.remove('travado');
  }

  function alternarSubcategoriaNoEditor(pecaId, subId) {
    alternar(pecaId, subId);
  }

  function alternarForaNoEditor(pecaId) {
    alternarFora(pecaId);
  }

  function moverCategoria(de, para) {
    if (de < 0 || de >= estadoAtual.categorias.length) return;
    if (para < 0 || para >= estadoAtual.categorias.length) return;
    if (de === para) return;

    const [item] = estadoAtual.categorias.splice(de, 1);
    estadoAtual.categorias.splice(para, 0, item);
    salvarEstado();
    render();
  }

  function moverPeca(subId, de, para) {
    const cat = estadoAtual.categorias.find(c => c.subs.some(s => s.id === subId));
    if (!cat) return;
    const sub = cat.subs.find(s => s.id === subId);
    if (!sub) return;
    if (de < 0 || de >= sub.pecas.length) return;
    if (para < 0 || para >= sub.pecas.length) return;
    if (de === para) return;

    const [item] = sub.pecas.splice(de, 1);
    sub.pecas.splice(para, 0, item);
    salvarEstado();
    render();
  }

  function alternar(pecaId, subId) {
    const sub = estadoAtual.categorias
      .flatMap(c => c.subs)
      .find(s => s.id === subId);
    if (!sub) return;

    const idx = sub.pecas.indexOf(pecaId);
    if (idx !== -1) {
      sub.pecas.splice(idx, 1);
    } else {
      sub.pecas.push(pecaId);
      const foraIdx = estadoAtual.fora.indexOf(pecaId);
      if (foraIdx !== -1) estadoAtual.fora.splice(foraIdx, 1);
    }
    salvarEstado();
    render();
  }

  function alternarFora(pecaId) {
    const foraIdx = estadoAtual.fora.indexOf(pecaId);
    if (foraIdx !== -1) {
      estadoAtual.fora.splice(foraIdx, 1);
    } else {
      estadoAtual.fora.push(pecaId);
      removerPecaDeTodasSubcategorias(pecaId);
    }
    salvarEstado();
    render();
  }

  function restaurarInicial() {
    if (confirm('Tem certeza que quer voltar à separação inicial?')) {
      localStorage.removeItem(STORAGE_KEY);
      estadoAtual = cloneEstado(window.CURADORIA_INICIAL);
      categoriaSelecionada = null;
      render();
    }
  }

  // ——— Arrastar com o mouse (o arrastar nativo não funcionava no navegador do app) ———
  let arrastou = false;
  function arrastavel(el, seletorGrupo, aoSoltar) {
    el.querySelectorAll('img').forEach(i => { i.draggable = false; });
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || modoColar || e.target.closest('[data-mover]')) return;
      const x0 = e.clientX, y0 = e.clientY;
      let fantasma = null, alvo = null;
      function mover(ev) {
        if (!fantasma) {
          if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
          const r = el.getBoundingClientRect();
          fantasma = el.cloneNode(true);
          fantasma.classList.add('cur-fantasma');
          fantasma.style.width = r.width + 'px';
          document.body.appendChild(fantasma);
          el.classList.add('arrastando');
          document.body.classList.add('cur-arrastando');
        }
        ev.preventDefault();
        fantasma.style.transform = 'translate(' + (ev.clientX + 8) + 'px,' + (ev.clientY + 8) + 'px)';
        const sob = document.elementFromPoint(ev.clientX, ev.clientY);
        const novo = sob ? sob.closest(seletorGrupo) : null;
        if (alvo && alvo !== novo) alvo.classList.remove('cur-alvo');
        alvo = (novo && novo !== el) ? novo : null;
        if (alvo) alvo.classList.add('cur-alvo');
        if (ev.clientY < 70) window.scrollBy(0, -18);
        else if (ev.clientY > window.innerHeight - 70) window.scrollBy(0, 18);
      }
      function soltar() {
        document.removeEventListener('pointermove', mover);
        document.removeEventListener('pointerup', soltar);
        document.removeEventListener('pointercancel', soltar);
        if (!fantasma) return;
        fantasma.parentNode.removeChild(fantasma);
        el.classList.remove('arrastando');
        document.body.classList.remove('cur-arrastando');
        arrastou = true;
        setTimeout(() => { arrastou = false; }, 50);
        if (alvo) {
          alvo.classList.remove('cur-alvo');
          const para = $$(seletorGrupo).indexOf(alvo);
          if (para >= 0) aoSoltar(para);
        }
      }
      document.addEventListener('pointermove', mover);
      document.addEventListener('pointerup', soltar);
      document.addEventListener('pointercancel', soltar);
    });
  }

  // ——— Copiar as categorias de uma peça e colar em outras ———
  let copiado = null, modoColar = false;
  const marcadas = new Set();

  function categoriasDe(id) {
    return {
      subs: obterTodasSubcategorias().filter(s => pecaEstaNaSubcategoria(id, s.id)).map(s => s.id),
      fora: pecaEstaEmFora(id)
    };
  }

  function copiar(id) {
    const p = encontrarPeca(id);
    copiado = Object.assign(categoriasDe(id), { de: id, titulo: p ? p.titulo : id });
    modoColar = true;
    marcadas.clear();
    fecharEditor();
    render();
  }

  // As peças coladas ficam com exatamente as mesmas categorias da copiada. Onde já estavam, mantêm a posição.
  function colar(ids) {
    if (!copiado) return;
    ids.forEach(id => {
      estadoAtual.categorias.forEach(c => c.subs.forEach(s => {
        const tem = s.pecas.indexOf(id), quer = copiado.subs.indexOf(s.id) >= 0;
        if (tem >= 0 && !quer) s.pecas.splice(tem, 1);
        if (tem < 0 && quer) s.pecas.push(id);
      }));
      const f = estadoAtual.fora.indexOf(id);
      if (copiado.fora && f < 0) estadoAtual.fora.push(id);
      if (!copiado.fora && f >= 0) estadoAtual.fora.splice(f, 1);
    });
    salvarEstado();
  }

  function sairDoModoColar() {
    modoColar = false; copiado = null; marcadas.clear();
    render();
  }

  function cliqueNaPeca(id) {
    if (!modoColar) { abrirEditor(id); return; }
    if (id === copiado.de) return;
    if (marcadas.has(id)) marcadas.delete(id); else marcadas.add(id);
    atualizarBarra();
  }

  function atualizarBarra() {
    let barra = document.getElementById('cur-barra-colar');
    document.body.classList.toggle('cur-modo-colar', modoColar);
    $$('.cur-peca').forEach(c => {
      c.classList.toggle('marcada', modoColar && marcadas.has(c.dataset.peca));
      c.classList.toggle('copiada', !!(modoColar && copiado && c.dataset.peca === copiado.de));
    });
    if (!modoColar) { if (barra) barra.parentNode.removeChild(barra); return; }
    if (!barra) {
      barra = document.createElement('div');
      barra.id = 'cur-barra-colar';
      barra.innerHTML = '<span class="cur-barra-txt"></span><span class="cur-barra-btns"><button type="button" class="btn btn-cheio" data-acao="colar"></button> <button type="button" class="btn btn-leve" data-acao="cancelar">Cancelar</button></span>';
      barra.addEventListener('click', (e) => {
        const acao = e.target.dataset.acao;
        if (acao === 'cancelar') sairDoModoColar();
        if (acao === 'colar' && marcadas.size) {
          const n = marcadas.size;
          colar([...marcadas]);
          sairDoModoColar();
          const aviso = document.getElementById('cur-salvo');
          if (aviso) aviso.textContent = 'Colado em ' + n + (n === 1 ? ' peça' : ' peças') + '. Aperte Salvar para guardar no computador.';
        }
      });
      document.body.appendChild(barra);
    }
    barra.querySelector('.cur-barra-txt').textContent = 'Categorias copiadas de "' + copiado.titulo + '". Clique nas peças que vão receber as mesmas categorias.';
    const n = marcadas.size, b = barra.querySelector('[data-acao="colar"]');
    b.textContent = n ? 'Colar em ' + n + (n === 1 ? ' peça' : ' peças') : 'Colar';
    b.disabled = !n;
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modoColar) sairDoModoColar(); });

  function init() {
    estadoAtual = carregarEstado();
    // Sem nada no navegador (outro endereço ou outro navegador): pega o que foi salvo no computador.
    if (!localStorage.getItem(STORAGE_KEY)) {
      fetch('selecao.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { if (d && d.categorias) { estadoAtual = d; localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); render(); } })
        .catch(function () {});
    }
    categoriaSelecionada = null;

    $('#cur-restaurar').addEventListener('click', restaurarInicial);

    $('.cur-editor-fechar').addEventListener('click', fecharEditor);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') fecharEditor();
    });

    $('.cur-editor').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) fecharEditor();
    });

    render();
  }

  window.curadoria = {
    estado: () => cloneEstado(estadoAtual),
    moverCategoria,
    moverPeca,
    alternar,
    alternarFora,
    copiar,
    colar: (ids) => { colar(ids); sairDoModoColar(); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();