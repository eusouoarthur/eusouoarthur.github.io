#!/usr/bin/env python3
"""
Gera miniaturas AVIF e WebP (400 e 800 px de largura) de todas as imagens do site
e um arquivo de dados com as dimensões de cada imagem.
"""
import os
import sys
from pathlib import Path
from PIL import Image, ImageOps

WORK_DIR = Path(__file__).parent.parent
MEDIA_IMG = WORK_DIR / "media" / "img"
MEDIA_VIDEO = WORK_DIR / "media" / "video"
DATA_DIR = WORK_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

THUMB_WIDTHS = [400, 800]
AVIF_QUALITY = 50
WEBP_QUALITY = 75
WEBP_METHOD = 6


def find_originals():
    """Encontra todas as imagens originais, ignorando miniaturas antigas (.t.jpg/.t.png)."""
    originals = []
    # media/img/**/*.jpg e media/img/**/*.png
    for ext in ("*.jpg", "*.png"):
        for f in MEDIA_IMG.rglob(ext):
            if not f.name.endswith((".t.jpg", ".t.png")):
                originals.append(f)
    # media/video/*.jpg
    for f in MEDIA_VIDEO.glob("*.jpg"):
        if not f.name.endswith(".t.jpg"):
            originals.append(f)
    return sorted(originals)


def has_transparency(img):
    """Verifica se a imagem tem transparência."""
    if img.mode in ("RGBA", "LA"):
        return True
    if img.mode == "P":
        # Verifica se a paleta tem transparência
        transparency = img.info.get("transparency")
        if transparency is not None:
            return True
    return False


def process_image(img_path):
    """Processa uma imagem original, gera miniaturas e retorna info para o JSON."""
    rel_path = img_path.relative_to(WORK_DIR).as_posix()
    
    with Image.open(img_path) as img:
        img = ImageOps.exif_transpose(img)
        w, h = img.size
        
        # Larguras a gerar (nunca amplia)
        widths = sorted(set(min(L, w) for L in THUMB_WIDTHS))
        
        # Converte para modo apropriado
        if has_transparency(img):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")
        
        for L in widths:
            new_h = round(h * L / w)
            thumb = img.resize((L, new_h), Image.LANCZOS)
            
            # Nomes dos arquivos de saída
            stem = img_path.stem
            parent = img_path.parent
            avif_name = f"{stem}.{L}.avif"
            webp_name = f"{stem}.{L}.webp"
            
            thumb.save(parent / avif_name, "AVIF", quality=AVIF_QUALITY)
            thumb.save(parent / webp_name, "WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)
        
        return rel_path, w, h, widths


def main():
    originals = find_originals()
    if not originals:
        print("Nenhuma imagem original encontrada.")
        return
    
    imagens_data = {}
    
    for img_path in originals:
        try:
            rel_path, w, h, widths = process_image(img_path)
            imagens_data[rel_path] = [w, h, widths]
            print(f"OK: {rel_path} -> {widths}")
        except Exception as e:
            print(f"ERRO: {img_path}: {e}", file=sys.stderr)
    
    # Gera data/imagens.js
    js_path = DATA_DIR / "imagens.js"
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("// Gerado por ferramentas/miniaturas.py. Não editar à mão.\n")
        f.write("// Cada imagem: [largura, altura, [larguras das miniaturas]].\n")
        f.write("window.IMAGENS = {\n")
        for key in sorted(imagens_data.keys()):
            w, h, widths = imagens_data[key]
            widths_str = ", ".join(str(x) for x in widths)
            f.write(f'  "{key}": [{w}, {h}, [{widths_str}]],\n')
        f.write("};\n")
    
    print(f"\nGerado: {js_path.relative_to(WORK_DIR)}")
    print(f"Total de imagens processadas: {len(imagens_data)}")


if __name__ == "__main__":
    main()