# Gera data/categorias.js a partir do que o Arthur salva no painel:
#   _paperclip/curadoria/selecao.json  (curadoria: categorias, subcategorias, peças fora do site)
#   _paperclip/curadoria/pecas.json    (editar peças: ordem das imagens, capas, peças novas)
# O servidor local (_paperclip/servidor.py) roda isto sozinho a cada "Salvar". À mão: python ferramentas/curadoria_para_site.py
import json, pathlib

AQUI = pathlib.Path(__file__).resolve().parent.parent          # ajuste-fino/
SELECAO = AQUI.parent / "curadoria" / "selecao.json"
PECAS_JSON = AQUI.parent / "curadoria" / "pecas.json"
SAIDA = AQUI / "data" / "categorias.js"

# Como cada categoria completa a frase "eu cuido ___" (Textos do site, parte 1).
FRASES = {
    "audiovisual": "do audiovisual",
    "design": "do design",
    "redes": "das redes sociais",
    "texto": "do texto",
    "automacao": "da automação",
}

# Aplica os ajustes do painel em window.PECAS: peças novas entram no fim; nas existentes,
# os campos salvos (imagens, vídeos, capas, textos) trocam pelos do painel.
# Chamado por assets/site.js e pela página de curadoria, depois de data/pecas.js.
APLICAR = """window.aplicarAjustes = function () {
  var A = (window.CATEGORIAS || {}).ajustes, P = window.PECAS;
  if (!A || !P || P.__ajustado) return;
  P.forEach(function (p) {
    var a = (A.pecas || {})[p.id];
    if (a) Object.keys(a).forEach(function (k) { p[k] = a[k]; });
  });
  (A.novas || []).forEach(function (n) { if (!P.some(function (p) { return p.id === n.id; })) P.push(n); });
  P.__ajustado = true;
};
"""

d = json.loads(SELECAO.read_text(encoding="utf-8"))
ajustes = json.loads(PECAS_JSON.read_text(encoding="utf-8")) if PECAS_JSON.exists() else {"pecas": {}, "novas": []}
cats = []
for c in d["categorias"]:
    subs = [{"id": s["id"], "nome": s["nome"], "pecas": s["pecas"]} for s in c.get("subs", []) if s["pecas"]]
    cats.append({"id": c["id"], "nome": c["nome"], "frase": FRASES.get(c["id"], "de " + c["nome"].lower()), "subs": subs})

dados = {"categorias": cats, "fora": d.get("fora", []), "ajustes": ajustes}
js = ("// GERADO por ferramentas/curadoria_para_site.py a partir do painel (curadoria e editar peças). Não editar à mão.\n"
      "// Categorias do \"eu cuido ___\" com subcategorias (só as que têm peça); \"fora\": peças que não aparecem no site;\n"
      "// \"ajustes\": mudanças feitas no painel em cada peça e peças novas.\n"
      "window.CATEGORIAS = " + json.dumps(dados, ensure_ascii=False, indent=1) + ";\n" + APLICAR)
SAIDA.write_text(js, encoding="utf-8")
print("ok:", SAIDA, len(cats), "categorias,", len(d.get("fora", [])), "fora,", len(ajustes.get("pecas", {})), "peças ajustadas,", len(ajustes.get("novas", [])), "novas")
