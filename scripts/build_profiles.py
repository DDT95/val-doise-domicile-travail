"""Agrège le fichier détail INSEE RP2022 MOBPRO aux échelles commune et EPCI."""
import json
import urllib.request
from pathlib import Path

import pandas as pd
import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"

EPCI_NAMES = {
    "200035970": "CC Vexin Centre",
    "200055655": "CA Roissy Pays de France",
    "200056380": "CA Plaine Vallée",
    "200058485": "CA Val Parisis",
    "200073013": "CC Carnelle Pays-de-France",
    "249500109": "CA de Cergy-Pontoise",
    "249500430": "CC Sausseron Impressionnistes",
    "249500455": "CC de la Vallée de l’Oise et des Trois Forêts",
    "249500489": "CC du Haut Val d’Oise",
    "249500513": "CC du Vexin-Val de Seine",
}


def distribution(df, column, groups):
    total = df.IPONDI.sum()
    return [
        {
            "label": label,
            "value": round(value := df.loc[df[column].isin(values), "IPONDI"].sum(), 1),
            "pct": round(value / total * 100, 1) if total else 0,
        }
        for label, values in groups
    ]


def ranks(df, column, names, limit=8):
    values = df.groupby(column, observed=True).IPONDI.sum().sort_values(ascending=False).head(limit)
    return [
        {"code": str(code), "label": names.get(str(code), str(code)), "value": round(value, 1)}
        for code, value in values.items()
    ]


def epci_members(code):
    url = f"https://geo.api.gouv.fr/epcis/{code}/communes?fields=code,nom&format=json"
    with urllib.request.urlopen(url, timeout=30) as response:
        return [item["code"] for item in json.load(response)]


def build_profile(code, name, members, df, labels, kind="commune", special=False):
    member_set = set(members)
    residents = df[df.COMMUNE.isin(member_set)].copy()
    workers = df[df.DCLT.isin(member_set)].copy()
    total = residents.IPONDI.sum()
    destination_names = dict(labels["DCLT"])
    origin_names = dict(labels["COMMUNE"])
    rank_residents = residents.copy()
    rank_workers = workers.copy()
    if kind == "epci":
        rank_residents.loc[rank_residents.DCLT.isin(member_set), "DCLT"] = "INTERNAL"
        rank_workers.loc[rank_workers.COMMUNE.isin(member_set), "COMMUNE"] = "INTERNAL"
        destination_names["INTERNAL"] = "Au sein de l’EPCI"
        origin_names["INTERNAL"] = "Au sein de l’EPCI"

    age = [("15-24 ans", ["015", "020"]), ("25-34 ans", ["025", "030"]), ("35-44 ans", ["035", "040"]), ("45-54 ans", ["045", "050"]), ("55-64 ans", ["055", "060"]), ("65 ans ou plus", [f"{n:03}" for n in range(65, 120, 5)])]
    diploma = [("Sans diplôme", ["01", "02", "03"]), ("Brevet", ["11", "12"]), ("CAP-BEP", ["13"]), ("Baccalauréat", ["14", "15"]), ("Bac+2", ["16"]), ("Bac+3 ou plus", ["17", "18", "19"])]
    employment = [("Emploi stable", ["16"]), ("Contrat court / insertion", ["11", "12", "13", "14", "15"]), ("Indépendant / employeur", ["21", "22", "23"])]
    return {
        "code": code,
        "name": name,
        "kind": kind,
        "special": special,
        "member_count": len(members),
        "members": members,
        "residents": round(total, 1),
        "workers": round(workers.IPONDI.sum(), 1),
        "local": round(residents.loc[residents.DCLT.isin(member_set), "IPONDI"].sum(), 1),
        "sex": distribution(residents, "SEXE", [("Hommes", ["1"]), ("Femmes", ["2"])]),
        "age": distribution(residents, "AGEREVQ", age),
        "profession": distribution(residents, "GS", [(labels["GS"].get(str(i), str(i)), [str(i)]) for i in range(1, 7)]),
        "diploma": distribution(residents, "DIPL", diploma),
        "employment": distribution(residents, "EMPL", employment),
        "worktime": distribution(residents, "TP", [("Temps complet", ["1"]), ("Temps partiel", ["2"])]),
        "transport": distribution(residents, "TRANS", [(labels["TRANS"].get(str(i), str(i)), [str(i)]) for i in range(1, 7)]),
        "housing": distribution(residents, "TYPL", [("Maison", ["1"]), ("Appartement", ["2"]), ("Autre", ["3", "4", "5", "6", "Z"])]),
        "cars": distribution(residents, "VOIT", [("Sans voiture", ["0"]), ("Une voiture", ["1"]), ("Deux voitures ou plus", ["2", "3"])]),
        "student_household_pct": round(residents.loc[~residents.INEEM.isin(["0", "Z"]), "IPONDI"].sum() / total * 100, 1) if total else 0,
        "destinations": ranks(rank_residents, "DCLT", destination_names),
        "origins": ranks(rank_workers, "COMMUNE", origin_names),
    }


def main():
    meta = pd.read_csv(RAW / "varmod_mobpro_2022.csv", sep=";", dtype=str)
    labels = {var: dict(zip(part.COD_MOD, part.LIB_MOD)) for var, part in meta.groupby("COD_VAR")}
    commune_names = labels["COMMUNE"]
    commune_codes = sorted(code for code in commune_names if code.startswith("95"))
    columns = ["COMMUNE", "DCLT", "AGEREVQ", "GS", "DIPL", "EMPL", "INEEM", "IPONDI", "SEXE", "TP", "TRANS", "TYPL", "VOIT"]
    df = pq.read_table(RAW / "RP2022_mobpro.parquet", columns=columns).to_pandas()
    for column in columns:
        if column != "IPONDI":
            df[column] = df[column].astype(str).str.replace(r"\.0$", "", regex=True)

    communes = {
        code: build_profile(code, commune_names[code].rsplit(" (", 1)[0], [code], df, labels)
        for code in commune_codes
    }
    epcis = {
        code: build_profile(code, name, epci_members(code), df, labels, kind="epci")
        for code, name in EPCI_NAMES.items()
    }
    for code in ("95018", "95063"):
        profile = dict(communes[code])
        profile.update({"code": f"special-{code}", "special": True})
        epcis[profile["code"]] = profile

    outputs = {
        PROCESSED / "commune_profiles.json": communes,
        PROCESSED / "epci_profiles.json": epcis,
    }
    for path, content in outputs.items():
        path.write_text(json.dumps(content, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"{len(content)} profils écrits dans {path.name} ({path.stat().st_size / 1024:.0f} Ko)")


if __name__ == "__main__":
    main()
