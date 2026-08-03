"""
Construit les jeux de données utilisés par la carte à partir des sources brutes.

Sources (à télécharger dans data/raw/, voir README) :
- base-flux-mobilite-domicile-lieu-travail-2022.csv (INSEE, RP2022, flux commune x commune)
- communes-95.geojson (contours des communes du Val d'Oise, france-geojson / Etalab)
- all_communes.json (centroïdes de toutes les communes françaises, geo.api.gouv.fr)

Sortie : data/processed/flows.json, data/processed/communes95.json
"""
import json
import re
from pathlib import Path

import pandas as pd

RAW = Path(__file__).parent.parent / "data" / "raw"
PROCESSED = Path(__file__).parent.parent / "data" / "processed"

MIN_FLOW = 1.0  # seuil minimal conservé dans le jeu de données (le slider de l'UI filtre au-delà)


def remap_pseudo_commune(code, centre, name_of):
    """Paris/Lyon/Marseille sont publiés par arrondissement dans MOBPRO/flux ; on regroupe au niveau commune."""
    if re.match(r"^751\d\d$", code):
        return "75056", "Paris"
    if re.match(r"^691\d\d$", code):
        return "69123", "Lyon"
    if re.match(r"^132\d\d$", code):
        return "13055", "Marseille"
    return code, None


def resolve(code, fallback_name, centre, name_of):
    new_code, new_name = remap_pseudo_commune(code, centre, name_of)
    if new_code in centre:
        return new_code, (new_name or name_of.get(new_code, fallback_name))
    return None, None


def main():
    df = pd.read_csv(
        RAW / "base-flux-mobilite-domicile-lieu-travail-2022.csv",
        sep=";",
        dtype={"CODGEO": str, "DCLT": str},
    )

    geo95 = json.load(open(RAW / "communes-95.geojson"))
    vdo_codes = {f["properties"]["code"] for f in geo95["features"]}

    all_comm = json.load(open(RAW / "all_communes.json"))
    centre = {c["code"]: c["centre"]["coordinates"] for c in all_comm if "centre" in c}
    name_of = {c["code"]: c["nom"] for c in all_comm}

    mask = df["CODGEO"].isin(vdo_codes) | df["DCLT"].isin(vdo_codes)
    sub = df[mask].copy()
    sub = sub[sub["NBFLUX_C22_ACTOCC15P"] >= MIN_FLOW]

    rows = []
    for _, r in sub.iterrows():
        o, oname = resolve(r["CODGEO"], r["LIBGEO"], centre, name_of)
        d, dname = resolve(r["DCLT"], r["L_DCLT"], centre, name_of)
        if o is None or d is None:
            continue  # codes non géocodés : flux transfrontaliers (Belgique, Suisse, Allemagne, Luxembourg)
        rows.append(
            {
                "o": o, "oname": oname, "olon": centre[o][0], "olat": centre[o][1], "o95": o in vdo_codes,
                "d": d, "dname": dname, "dlon": centre[d][0], "dlat": centre[d][1], "d95": d in vdo_codes,
                "v": round(float(r["NBFLUX_C22_ACTOCC15P"]), 1),
            }
        )

    merged = {}
    for r in rows:
        key = (r["o"], r["d"])
        if key in merged:
            merged[key]["v"] += r["v"]
        else:
            merged[key] = r
    rows = list(merged.values())

    PROCESSED.mkdir(parents=True, exist_ok=True)
    with open(PROCESSED / "flows.json", "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False)

    tot = {}
    for r in rows:
        if r["o95"]:
            e = tot.setdefault(r["o"], {"name": r["oname"], "lon": r["olon"], "lat": r["olat"], "total": 0})
            e["total"] += r["v"]
        if r["d95"]:
            e = tot.setdefault(r["d"], {"name": r["dname"], "lon": r["dlon"], "lat": r["dlat"], "total": 0})
            e["total"] += r["v"]

    communes = [{"code": k, **v} for k, v in tot.items()]
    communes.sort(key=lambda x: -x["total"])
    with open(PROCESSED / "communes95.json", "w", encoding="utf-8") as f:
        json.dump(communes, f, ensure_ascii=False)

    print(f"{len(rows)} flux, {len(communes)} communes du Val d'Oise")


if __name__ == "__main__":
    main()
