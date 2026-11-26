# Gera data/categorias.js a partir da curadoria salva pelo Arthur (_paperclip/curadoria/selecao.json).
# Rodar de novo sempre que ele salvar a curadoria: python ferramentas/curadoria_para_site.py
import json, pathlib

AQUI = pathlib.Path(__file__).resolve().parent.parent          # ajuste-fino/
SELECAO = AQUI.parent / "curadoria" / "selecao.json"            # _paperclip/curadoria/selecao.json
SAIDA = AQUI / "data" / "categorias.js"

# Como cada categoria completa a frase "e eu cuido ___" (Textos do site, parte 1).
FRASES = {
    "audiovisual": "do audiovisual",
    "design": "do design",
    "redes": "das redes sociais",
    "texto": "do texto",
    "automacao": "da automação",
}

d = json.loads(SELECAO.read_text(encoding="utf-8"))
cats = []
for c in d["categorias"]:
    subs = [{"id": s["id"], "nome": s["nome"], "pecas": s["pecas"]} for s in c.get("subs", []) if s["pecas"]]
    cats.append({"id": c["id"], "nome": c["nome"], "frase": FRASES.get(c["id"], "d" + c["nome"].lower()), "subs": subs})

js = ("// GERADO por ferramentas/curadoria_para_site.py a partir de _paperclip/curadoria/selecao.json. Não editar à mão.\n"
      "// Categorias do \"e eu cuido ___\", com subcategorias (só as que têm peça). \"fora\": peças que não aparecem no site.\n"
      "window.CATEGORIAS = " + json.dumps({"categorias": cats, "fora": d.get("fora", [])}, ensure_ascii=False, indent=1) + ";\n")
SAIDA.write_text(js, encoding="utf-8")
print("ok:", SAIDA, len(cats), "categorias,", len(d.get("fora", [])), "fora")
