"""Agrège le fichier détail INSEE RP2022 MOBPRO en profils communaux légers."""
import json
from pathlib import Path

import pandas as pd
import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed" / "commune_profiles.json"


def distribution(df, column, groups):
    total = df.IPONDI.sum()
    result = []
    for label, values in groups:
        value = df.loc[df[column].astype(str).isin(values), "IPONDI"].sum()
        result.append({"label": label, "value": round(value, 1), "pct": round(value / total * 100, 1) if total else 0})
    return result


def ranks(df, column, names, limit=8):
    values = df.groupby(column, observed=True).IPONDI.sum().sort_values(ascending=False).head(limit)
    return [{"code": str(code), "label": names.get(str(code), str(code)), "value": round(value, 1)} for code, value in values.items()]


def main():
    meta = pd.read_csv(RAW / "varmod_mobpro_2022.csv", sep=";", dtype=str)
    labels = {var: dict(zip(part.COD_MOD, part.LIB_MOD)) for var, part in meta.groupby("COD_VAR")}
    commune_names = labels["COMMUNE"]
    codes = sorted(code for code in commune_names if code.startswith("95"))
    columns = ["COMMUNE", "DCLT", "AGEREVQ", "GS", "DIPL", "EMPL", "INEEM", "IPONDI", "SEXE", "STAT", "TP", "TRANS", "TYPL", "VOIT"]
    table = pq.read_table(RAW / "RP2022_mobpro.parquet", columns=columns)
    df = table.to_pandas()
    for col in columns:
        if col != "IPONDI": df[col] = df[col].astype(str).str.replace(r"\.0$", "", regex=True)
    residents = df[df.COMMUNE.isin(codes)].copy()
    incoming = df[df.DCLT.isin(codes)].copy()

    age = [("15-24 ans", ["015", "020"]), ("25-34 ans", ["025", "030"]), ("35-44 ans", ["035", "040"]), ("45-54 ans", ["045", "050"]), ("55-64 ans", ["055", "060"]), ("65 ans ou plus", [f"{n:03}" for n in range(65, 120, 5)])]
    diploma = [("Sans diplôme", ["01", "02", "03"]), ("Brevet", ["11", "12"]), ("CAP-BEP", ["13"]), ("Baccalauréat", ["14", "15"]), ("Bac+2", ["16"]), ("Bac+3 ou plus", ["17", "18", "19"])]
    employment = [("Emploi stable", ["16"]), ("Contrat court / insertion", ["11", "12", "13", "14", "15"]), ("Indépendant / employeur", ["21", "22", "23"])]
    profiles = {}
    for code in codes:
        r = residents[residents.COMMUNE.eq(code)]
        w = incoming[incoming.DCLT.eq(code)]
        total = r.IPONDI.sum()
        profiles[code] = {
            "code": code, "name": commune_names[code].rsplit(" (", 1)[0],
            "residents": round(total, 1), "workers": round(w.IPONDI.sum(), 1),
            "local": round(r.loc[r.DCLT.eq(code), "IPONDI"].sum(), 1),
            "sex": distribution(r, "SEXE", [("Hommes", ["1"]), ("Femmes", ["2"])]),
            "age": distribution(r, "AGEREVQ", age),
            "profession": distribution(r, "GS", [(labels["GS"].get(str(i), str(i)), [str(i)]) for i in range(1, 7)]),
            "diploma": distribution(r, "DIPL", diploma),
            "employment": distribution(r, "EMPL", employment),
            "worktime": distribution(r, "TP", [("Temps complet", ["1"]), ("Temps partiel", ["2"])]),
            "transport": distribution(r, "TRANS", [(labels["TRANS"].get(str(i), str(i)), [str(i)]) for i in range(1, 7)]),
            "housing": distribution(r, "TYPL", [("Maison", ["1"]), ("Appartement", ["2"]), ("Autre", ["3", "4", "5", "6", "Z"])]),
            "cars": distribution(r, "VOIT", [("Sans voiture", ["0"]), ("Une voiture", ["1"]), ("Deux voitures ou plus", ["2", "3"])]),
            "student_household_pct": round(r.loc[~r.INEEM.isin(["0", "Z"]), "IPONDI"].sum() / total * 100, 1) if total else 0,
            "destinations": ranks(r, "DCLT", labels["DCLT"]),
            "origins": ranks(w, "COMMUNE", commune_names),
        }
    OUT.write_text(json.dumps(profiles, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(profiles)} profils écrits dans {OUT} ({OUT.stat().st_size / 1024:.0f} Ko)")


if __name__ == "__main__":
    main()
