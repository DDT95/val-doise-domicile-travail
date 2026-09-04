"""Agrège le fichier détail INSEE RP2023 MOBPRO aux échelles commune et EPCI."""
import json
import csv
import io
import urllib.request
import zipfile
from pathlib import Path

import pandas as pd
import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
POPULATION_URL = "https://www.insee.fr/fr/statistiques/fichier/8680726/ensemble.zip"

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


def employment_distribution(df):
    """Répartit les statuts RP2023, dont la codification a changé depuis le RP2022."""
    total = df.IPONDI.sum()
    groups = [
        ("Emploi stable", (df.STAT == "111") & (df.EMPL == "101")),
        ("Contrat court / insertion", (df.STAT == "111") & (df.EMPL == "102")),
        ("Indépendant / employeur", df.STAT.isin(["121", "122"])),
    ]
    return [
        {"label": label, "value": round(value := df.loc[mask, "IPONDI"].sum(), 1), "pct": round(value / total * 100, 1) if total else 0}
        for label, mask in groups
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


def population_reference():
    """Population municipale de référence 2023, en vigueur au 1er janvier 2026."""
    with urllib.request.urlopen(POPULATION_URL, timeout=60) as response:
        archive = zipfile.ZipFile(io.BytesIO(response.read()))
    with archive.open("donnees_communes.csv") as source:
        rows = csv.DictReader(io.TextIOWrapper(source, encoding="utf-8"), delimiter=";")
        return {row["COM"]: int(row["PMUN"]) for row in rows}


def build_profile(code, name, members, df, labels, populations, kind="commune", special=False):
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
    diploma = [("Sans diplôme", ["101", "102"]), ("Brevet", ["103"]), ("CAP-BEP", ["104"]), ("Baccalauréat", ["105", "106"]), ("Bac+2", ["108"]), ("Bac+3 ou plus", ["109", "110", "111"])]
    return {
        "code": code,
        "name": name,
        "kind": kind,
        "special": special,
        "member_count": len(members),
        "members": members,
        "population": sum(populations.get(member, 0) for member in members),
        "population_year": 2023,
        "residents": round(total, 1),
        "workers": round(workers.IPONDI.sum(), 1),
        "local": round(residents.loc[residents.DCLT.isin(member_set), "IPONDI"].sum(), 1),
        "sex": distribution(residents, "SEXE", [("Hommes", ["1"]), ("Femmes", ["2"])]),
        "age": distribution(residents, "AGEREVQ", age),
        "profession": distribution(residents, "GS", [(labels["GS"].get(str(i), str(i)), [str(i)]) for i in range(1, 7)]),
        "diploma": distribution(residents, "DIPL", diploma),
        "employment": employment_distribution(residents),
        "worktime": distribution(residents, "TP", [("Temps complet", ["11"]), ("Temps partiel", ["12"])]),
        "transport": distribution(residents, "TRANS", [(labels["TRANS"].get(str(i), str(i)), [str(i)]) for i in range(1, 7)]),
        "housing": distribution(residents, "TYPL", [("Maison", ["1"]), ("Appartement", ["2"]), ("Autre", ["3", "4", "5", "6", "Z"])]),
        "cars": distribution(residents, "VOIT", [("Sans voiture", ["0"]), ("Une voiture", ["1"]), ("Deux voitures ou plus", ["2", "3"])]),
        "student_household_pct": round(residents.loc[~residents.INEEM.isin(["0", "Z"]), "IPONDI"].sum() / total * 100, 1) if total else 0,
        "destinations": ranks(rank_residents, "DCLT", destination_names),
        "origins": ranks(rank_workers, "COMMUNE", origin_names),
    }


def main():
    meta = pd.read_csv(RAW / "varmod_mobpro_2023.csv", sep=";", dtype=str)
    labels = {var: dict(zip(part.COD_MOD, part.LIB_MOD)) for var, part in meta.groupby("COD_VAR")}
    commune_names = labels["COMMUNE"]
    commune_codes = sorted(code for code in commune_names if code.startswith("95"))
    populations = population_reference()
    columns = ["COMMUNE", "DCLT", "AGEREVQ", "GS", "DIPL", "EMPL", "STAT", "INEEM", "IPONDI", "SEXE", "TP", "TRANS", "TYPL", "VOIT"]
    df = pq.read_table(RAW / "RP2023_mobpro.parquet", columns=columns).to_pandas()
    for column in columns:
        if column != "IPONDI":
            df[column] = df[column].astype(str).str.replace(r"\.0$", "", regex=True)

    communes = {
        code: build_profile(code, commune_names[code].rsplit(" (", 1)[0], [code], df, labels, populations)
        for code in commune_codes
    }
    epcis = {
        code: build_profile(code, name, epci_members(code), df, labels, populations, kind="epci")
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
