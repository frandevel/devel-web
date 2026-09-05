import math
import pathlib
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

NAVY = "#265786"
CIAN = "#006699"
TINTA = "#10283F"
CLARO = "#D4DDE7"

CENTRO = 60.0


def polar(angulo, radio):
    t = math.radians(angulo)
    return CENTRO + radio * math.cos(t), CENTRO + radio * math.sin(t)


def barra_solida(angulo, desde, hasta, color, grosor):
    x1, y1 = polar(angulo, desde)
    x2, y2 = polar(angulo, hasta)
    return (f'<path d="M{x1:.2f} {y1:.2f} L{x2:.2f} {y2:.2f}" fill="none" stroke="{color}" '
            f'stroke-width="{grosor:.2f}" stroke-linecap="round"/>')


def barra_hueca(angulo, desde, hasta, color, grosor, contorno):
    radio = grosor / 2 - contorno / 2
    ax, ay = polar(angulo, desde)
    bx, by = polar(angulo, hasta)
    dx, dy = bx - ax, by - ay
    largo = math.hypot(dx, dy)
    nx, ny = -dy / largo * radio, dx / largo * radio
    p1, p2 = (ax + nx, ay + ny), (bx + nx, by + ny)
    p3, p4 = (bx - nx, by - ny), (ax - nx, ay - ny)
    d = (f"M{p1[0]:.2f} {p1[1]:.2f} L{p2[0]:.2f} {p2[1]:.2f} "
         f"A{radio:.2f} {radio:.2f} 0 0 0 {p3[0]:.2f} {p3[1]:.2f} "
         f"L{p4[0]:.2f} {p4[1]:.2f} "
         f"A{radio:.2f} {radio:.2f} 0 0 0 {p1[0]:.2f} {p1[1]:.2f} Z")
    return (f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{contorno:.2f}" '
            f'stroke-linejoin="round"/>')


def isotipo(color_aspa, color_check, grosor=23.0, contorno=3.2,
            interior=21.0, exterior=49.0, corto=40.0, largo=66.0):
    piezas = [
        barra_hueca(45, interior, exterior, color_aspa, grosor, contorno),
        barra_hueca(135, interior, exterior, color_aspa, grosor, contorno),
        barra_solida(225, 0.0, corto, color_check, grosor),
        barra_solida(315, 0.0, largo, color_check, grosor),
    ]
    cuerpo = "\n    ".join(piezas)
    return f'<g transform="translate(-5 5)">\n    {cuerpo}\n  </g>'


fuente = TTFont("plex600.woff2")
glifos = fuente.getGlyphSet()
mapa_caracteres = fuente.getBestCmap()
UNIDADES_POR_EM = fuente["head"].unitsPerEm


def logotipo(texto, altura_em, color, x_inicial, linea_base):
    escala = altura_em / UNIDADES_POR_EM
    trozos = []
    avance = 0.0
    for caracter in texto:
        nombre_glifo = mapa_caracteres[ord(caracter)]
        pluma = SVGPathPen(glifos)
        glifos[nombre_glifo].draw(pluma)
        contorno = pluma.getCommands()
        if contorno:
            x = x_inicial + avance * escala
            trozos.append(
                f'<g transform="translate({x:.2f} {linea_base:.2f}) scale({escala:.5f} {-escala:.5f})">'
                f'<path d="{contorno}" fill="{color}"/></g>'
            )
        avance += glifos[nombre_glifo].width
    return "\n  ".join(trozos), avance * escala


def documento(cuerpo, ancho, alto, etiqueta="Tradegun"):
    return ('<svg xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="0 0 {ancho:g} {alto:g}" width="{ancho:g}" height="{alto:g}" '
            f'role="img" aria-label="{etiqueta}">\n  {cuerpo}\n</svg>\n')


piezas = {
    "tradegun-isotipo": isotipo(NAVY, CIAN),
    "tradegun-isotipo-tinta": isotipo(TINTA, TINTA),
    "tradegun-isotipo-claro": isotipo(CLARO, CLARO),
    "tradegun-isotipo-compacto": isotipo(NAVY, CIAN, grosor=27.0, contorno=4.4,
                                         interior=23.0, exterior=50.0, corto=40.0, largo=64.0),
}
for nombre, cuerpo in piezas.items():
    pathlib.Path(f"{nombre}.svg").write_text(documento(cuerpo, 120, 120))

ALTURA_TEXTO = 56
SEPARACION = 20

texto_h, ancho_texto = logotipo("tradegun", ALTURA_TEXTO, NAVY, 113 + SEPARACION, 78)
cuerpo = f"{isotipo(NAVY, CIAN)}\n  {texto_h}"
pathlib.Path("tradegun-horizontal.svg").write_text(
    documento(cuerpo, round(113 + SEPARACION + ancho_texto + 4), 120))

texto_v, ancho_v = logotipo("tradegun", ALTURA_TEXTO, NAVY, 0, 182)
ancho_total = max(120, ancho_v)
cuerpo = (f'<g transform="translate({(ancho_total - 120) / 2:.2f} 0)">{isotipo(NAVY, CIAN)}</g>\n  '
          f'<g transform="translate({(ancho_total - ancho_v) / 2:.2f} 0)">{texto_v}</g>')
pathlib.Path("tradegun-vertical.svg").write_text(documento(cuerpo, round(ancho_total), 196))

print("kit generado:", ", ".join(sorted(p.name for p in pathlib.Path(".").glob("tradegun-*.svg"))))
