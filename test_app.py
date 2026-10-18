"""
Automated Integration and Functional Tests for Partajare Energie — Comunități de Energie (CER)
Validates:
1. Health check & Apache 2.0 license
2. Cele 8 Zone de Distribuție Oficiale din România și operatorii asociați
3. Listare Comunități Seed & Verificare Atribuire Zonă de Distribuție (DEER, Rețele Electrice)
4. Creare Comunitate Nouă cu Zonă de Distribuție Specifică
5. Adăugare cele 3 tipuri de membri cu perioadă de apartenență (start_year/month, end_year/month)
6. Șablon CSV și descărcare
7. Încărcare fișier CSV cu curbe de producție și consum
8. Rulare algoritm de partajare pe intervale de 15 minute (96/zi)
9. Verificare profil 24h pe intervale de 15 minute (96 puncte)
10. Verificare că membrii inactivi primesc 0 kWh partajare
11. Ștergere membru și curățare
"""

import sys
import io
import time
from pathlib import Path

# Force utf-8 encoding for Windows console output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.seed_data import seed_initial_data


def test_full_pipeline():
    # Ensure tables exist and seed demo data
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_initial_data(db, force=True)

    client = TestClient(app)

    print("=" * 75)
    print("[*] TESTARE PLATFORMĂ CER: ZONE DE DISTRIBUȚIE, APARTENENȚĂ & 15-MIN SHARING")
    print("=" * 75)

    ts = int(time.time())

    # 1. Health check & Apache 2.0 license & LIFE COMET link
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[OK] [1/15] Health Check:", res.json()["status"])

    res_lic = client.get("/api/license")
    assert res_lic.status_code == 200
    lic_json = res_lic.json()
    assert lic_json["funder_url"] == "https://lifecomet.rescoop.eu/"
    assert lic_json["project_url"] == "https://lifecomet.rescoop.eu/"
    print("[OK] [1b/15] Licență & Link oficial LIFE COMET:", lic_json["project_url"])

    # 2. Cele 8 Zone de Distribuție din România
    res_zones = client.get("/api/distribution-zones")
    assert res_zones.status_code == 200
    zones = res_zones.json()
    assert len(zones) == 8, f"Trebuie să existe exact 8 zone de distribuție, primite: {len(zones)}"
    zone_ids = [z["id"] for z in zones]
    assert "retele_electrice_muntenia" in zone_ids
    assert "retele_electrice_banat" in zone_ids
    assert "retele_electrice_dobrogea" in zone_ids
    assert "deer_transilvania_nord" in zone_ids
    assert "deer_transilvania_sud" in zone_ids
    assert "deer_muntenia_nord" in zone_ids
    assert "delgaz_grid_nord_est" in zone_ids
    assert "distributie_oltenia" in zone_ids
    print(f"[OK] [2/11] Zone de distribuție verificate: {len(zones)} zone oficiale ANRE validate.")
    for z in zones:
        print(f"     • {z['name']} ({z['operator']}) — Județe: {', '.join(z['counties'])}")

    # 3. Get Seeded Communities & check distribution zones
    res = client.get("/api/communities")
    assert res.status_code == 200
    comms = res.json()
    assert len(comms) >= 3, "Comunitățile inițiale demo lipsesc"
    print(f"[OK] [3/11] Listare comunități: {len(comms)} comunități găsite.")
    for c in comms:
        assert c.get("distribution_zone") is not None
        assert c.get("zone_details") is not None
        print(f"     • {c['code']} - {c['name']} | Zonă: {c['zone_details']['name']} ({c['zone_details']['operator']})")

    # 4. Create a NEW Energy Community in Dobrogea Distribution Zone
    new_comm_payload = {
        "name": f"Comunitatea Solară Dobrogea Verde {ts}",
        "code": f"CER-CT-{ts % 100000}",
        "description": "Comunitate de energie regenerabilă pentru zona Constanța.",
        "location": "Constanța",
        "distribution_zone": "retele_electrice_dobrogea",
        "anre_status": "cerere_trimisa",
        "anre_registration_number": None,
        "internal_tariff": 0.62,
        "grid_tariff": 1.30,
        "export_tariff": 0.35,
        "default_algorithm": "proportional_consumption"
    }
    res = client.post("/api/communities", json=new_comm_payload)
    assert res.status_code == 201, f"Creare comunitate eșuată: {res.text}"
    comm = res.json()
    comm_id = comm["id"]
    assert comm["distribution_zone"] == "retele_electrice_dobrogea"
    assert comm["zone_details"]["name"] == "Rețele Electrice Dobrogea"
    print(f"[OK] [4/11] Comunitate nouă creată cu zonă de distribuție: ID={comm_id}, Zonă={comm['zone_details']['name']}")

    # 5. Add the Member Types with membership periods & Validate ANRE Share Percentage Rules:
    # 5a. Sistem de Producție (activ din 2025-01) - Producția NU are cotă de consum alocată (0%)
    res_m1 = client.post(f"/api/communities/{comm_id}/members", json={
        "name": "Parc Fotovoltaic Tomis 60kWp",
        "code_pod": "RO-CT-POD-001",
        "member_type": "sistem_productie",
        "address": "Bvd. Tomis nr. 100",
        "installed_capacity_kw": 60.0,
        "contracted_power_kw": 0.0,
        "share_percentage": 0.0,
        "start_year": 2025,
        "start_month": 1,
        "end_year": None,
        "end_month": None
    })
    assert res_m1.status_code == 201
    m1 = res_m1.json()
    assert m1["share_percentage"] == 0.0

    # Test Regulă 1: Tentativă de adăugare sistem_productie cu cotă > 0 este respinsă cu 400
    res_prod_invalid = client.post(f"/api/communities/{comm_id}/members", json={
        "name": "Centrală Invalidă Cotă",
        "code_pod": "RO-CT-POD-ERR1",
        "member_type": "sistem_productie",
        "installed_capacity_kw": 10.0,
        "share_percentage": 25.0
    })
    assert res_prod_invalid.status_code in (400, 422), f"Trebuia respins cu 400/422: {res_prod_invalid.text}"
    print("[OK] [Regulă 1a] Adăugare sistem_productie cu share > 0 respinsă cu succes (422/400 Validation Error).")

    # 5b. Prosumator (activ din 2025-01) - 60% cotă
    res_m2 = client.post(f"/api/communities/{comm_id}/members", json={
        "name": "Pensiunea Marea Neagră",
        "code_pod": "RO-CT-POD-002",
        "member_type": "prosumator",
        "address": "Str. Falezei nr. 5",
        "installed_capacity_kw": 12.0,
        "contracted_power_kw": 20.0,
        "share_percentage": 60.0,
        "start_year": 2025,
        "start_month": 1,
        "end_year": None,
        "end_month": None
    })
    assert res_m2.status_code == 201
    m2 = res_m2.json()

    # 5c. Consumator Pur (activ din 2025-01) - 40% cotă (Total ajunge la 100%)
    res_m3 = client.post(f"/api/communities/{comm_id}/members", json={
        "name": "Centrul Comunitar Mamaia",
        "code_pod": "RO-CT-POD-003",
        "member_type": "consumator",
        "address": "Str. Siret nr. 12",
        "installed_capacity_kw": 0.0,
        "contracted_power_kw": 25.0,
        "share_percentage": 40.0,
        "start_year": 2025,
        "start_month": 1,
        "end_year": None,
        "end_month": None
    })
    assert res_m3.status_code == 201
    m3 = res_m3.json()

    # Test Regulă 2: Suma cotelor nu poate depăși 100%. Adăugarea unui nou consumator cu cotă 5% trebuie respinsă
    res_exceed = client.post(f"/api/communities/{comm_id}/members", json={
        "name": "Consumator Depășire Plafon",
        "code_pod": "RO-CT-POD-ERR2",
        "member_type": "consumator",
        "share_percentage": 5.0
    })
    assert res_exceed.status_code in (400, 422), f"Trebuia respins cu 400/422 (depășire 100%): {res_exceed.text}"
    print("[OK] [Regulă 2a] Adăugare membru ce depășește plafonul de 100% respinsă cu succes (400 Bad Request).")

    # 5d. Fost Membru care a ieșit din comunitate în Martie 2026 (va fi inactiv în Iulie 2026)
    res_m4 = client.post(f"/api/communities/{comm_id}/members", json={
        "name": "Restaurant Faleza Veche (Ieșit 03/2026)",
        "code_pod": "RO-CT-POD-004",
        "member_type": "consumator",
        "address": "Str. Traian nr. 2",
        "installed_capacity_kw": 0.0,
        "contracted_power_kw": 15.0,
        "share_percentage": 0.0,
        "start_year": 2025,
        "start_month": 1,
        "end_year": 2026,
        "end_month": 3  # Exited in March 2026!
    })
    assert res_m4.status_code == 201
    m4 = res_m4.json()

    # 5e. Sistem de Stocare a Energiei - BESS (activ din 2025-01) - Stocarea BESS NU are cotă de consum alocată (0%)
    res_bess_invalid = client.post(f"/api/communities/{comm_id}/members", json={
        "name": "Baterie Invalidă Cotă",
        "code_pod": "RO-CT-POD-ERR3",
        "member_type": "stocare_bess",
        "installed_capacity_kw": 10.0,
        "share_percentage": 10.0
    })
    assert res_bess_invalid.status_code in (400, 422)
    print("[OK] [Regulă 1b] Adăugare stocare_bess cu share > 0 respinsă cu succes (422/400 Validation Error).")

    res_m5 = client.post(f"/api/communities/{comm_id}/members", json={
        "name": "Baterie Comunitară Mamaia BESS 50kWh",
        "code_pod": "RO-CT-POD-005",
        "member_type": "stocare_bess",
        "address": "Bvd. Mamaia nr. 50",
        "installed_capacity_kw": 25.0,
        "contracted_power_kw": 25.0,
        "share_percentage": 0.0,
        "start_year": 2025,
        "start_month": 1,
        "end_year": None,
        "end_month": None
    })
    assert res_m5.status_code == 201, f"Creare membru BESS eșuată: {res_m5.text}"
    m5 = res_m5.json()
    assert m5["member_type"] == "stocare_bess"
    assert m5["share_percentage"] == 0.0

    # Test Regulă 2b: Update membru ce ar depăși 100% (ex: m3 de la 40% la 50% => total 110%)
    res_update_invalid = client.put(f"/api/communities/members/{m3['id']}", json={
        "share_percentage": 50.0
    })
    assert res_update_invalid.status_code in (400, 422)
    print("[OK] [Regulă 2b] Editare membru ce depășește plafonul de 100% respinsă cu succes (400 Bad Request).")

    # Verificare enrich comunitate pentru storage_systems_count și total_allocated_share_pct
    comm_info = client.get(f"/api/communities/{comm_id}").json()
    assert comm_info["storage_systems_count"] == 1
    assert comm_info["members_count"] == 5
    assert abs(comm_info["total_allocated_share_pct"] - 100.0) < 0.01
    assert abs(comm_info["remaining_share_pct"] - 0.0) < 0.01

    print("[OK] [5/15] Membri adăugați & Reguli ANRE validate (0% producție/stocare, 100% plafon):")
    print(f"     • ☀️ Sistem de Producție: {m1['name']} (cotă consum: {m1['share_percentage']}%)")
    print(f"     • 🔄 Prosumator: {m2['name']} (cotă consum: {m2['share_percentage']}%)")
    print(f"     • 🏠 Consumator Activ: {m3['name']} (cotă consum: {m3['share_percentage']}%)")
    print(f"     • 🚪 Fost Membru: {m4['name']}")
    print(f"     • 🔋 Sistem Stocare BESS: {m5['name']} (cotă consum: {m5['share_percentage']}%)")
    print(f"     • 📊 Total Cote Consum Comunitate: {comm_info['total_allocated_share_pct']}% / 100%")

    # 6. Download Pre-Filled 15-Minute Matrix CSV Template for July 2026
    res_tpl = client.get(f"/api/communities/{comm_id}/template-csv?year=2026&month=7")
    assert res_tpl.status_code == 200
    tpl_text = res_tpl.text
    assert "timestamp,data,ora,interval_zi" in tpl_text
    assert "RO-CT-POD-001_productie_kwh" in tpl_text
    assert "RO-CT-POD-001_consum_kwh" in tpl_text
    assert "RO-CT-POD-002_productie_kwh" in tpl_text
    assert "RO-CT-POD-002_consum_kwh" in tpl_text
    assert "RO-CT-POD-003_productie_kwh" in tpl_text
    assert "RO-CT-POD-003_consum_kwh" in tpl_text
    assert "RO-CT-POD-005_productie_kwh" in tpl_text
    assert "RO-CT-POD-005_consum_kwh" in tpl_text
    tpl_lines = [l for l in tpl_text.strip().split("\n") if l.strip()]
    assert len(tpl_lines) == 2977, f"Șablonul pentru 31 zile trebuie să conțină 1 header + 2976 rânduri de 15 min, primite: {len(tpl_lines)}"
    print(f"[OK] [6/15] Generare șablon CSV 15 min pentru Iulie 2026 confirmată (inclusiv coloane POD BESS).")

    # 7. Upload the 15-Minute Matrix CSV file with load curves (with year & month form fields)
    files = {"file": ("curbe_15min_iulie_2026.csv", io.BytesIO(tpl_text.encode("utf-8")), "text/csv")}
    res_upload = client.post(f"/api/communities/{comm_id}/upload-curves", files=files, data={"year": 2026, "month": 7})
    assert res_upload.status_code == 200, f"Upload curves failed: {res_upload.text}"
    upload_res = res_upload.json()
    assert upload_res["rows_imported"] == 2976, f"Așteptate 2976 rânduri, primite: {upload_res['rows_imported']}"
    assert upload_res["members_updated"] == 5
    assert upload_res["months_detected"] == [7]
    assert upload_res["years_detected"] == [2026]
    print(f"[OK] [7/15] Import curbe CSV matriceale 15 min cu selecție an/lună (2026/07): {upload_res['members_updated']} membri actualizați.")

    # 7b. Verify that classic Long-format CSV upload also works (backward compatibility)
    csv_long = f"""code_pod,member_name,year,month,production_kwh,consumption_kwh
RO-CT-POD-001,Parc Fotovoltaic Tomis 60kWp,2026,8,9100.0,0.0
RO-CT-POD-002,Pensiunea Marea Neagră,2026,8,1750.0,2300.0
"""
    files_long = {"file": ("curbe_august_2026.csv", io.BytesIO(csv_long.encode("utf-8")), "text/csv")}
    res_upload_long = client.post(f"/api/communities/{comm_id}/upload-curves", files=files_long)
    assert res_upload_long.status_code == 200
    assert res_upload_long.json()["rows_imported"] == 2
    print(f"[OK] [7b/15] Compatibilitate confirmată și pentru formatul alternativ CSV clasic.")

    # 7c. Download previously uploaded/saved curves
    res_export = client.get(f"/api/communities/{comm_id}/export-curves?year=2026&month=7")
    assert res_export.status_code == 200, f"Export curves failed: {res_export.text}"
    assert "attachment;" in res_export.headers.get("content-disposition", "")
    exp_lines = [l for l in res_export.text.strip().split("\n") if l.strip()]
    assert len(exp_lines) == 2977
    assert "RO-CT-POD-005_productie_kwh" in exp_lines[0]
    print(f"[OK] [7c/15] Export/descărcare curbe salvate confirmat ({len(exp_lines)-1} intervale 15-min generate pentru Iulie 2026).")

    # 8. Run 15-Minute Interval Sharing Algorithm for July 2026
    sharing_req = {
        "algorithm_type": "proportional_consumption",
        "year": 2026,
        "month": 7,
        "save_run": True
    }
    res_algo = client.post(f"/api/communities/{comm_id}/run-sharing", json=sharing_req)
    assert res_algo.status_code == 200, f"Rulare algoritm eșuată: {res_algo.text}"
    sim = res_algo.json()
    assert sim["total_production_kwh"] > 0
    assert sim["total_consumption_kwh"] > 0
    assert sim["total_shared_kwh"] > 0
    assert sim["total_savings_ron"] > 0
    assert "15 minute" in sim["calculation_resolution"]
    assert sim["active_members_count"] == 4
    assert sim["total_members_count"] == 5
    print("[OK] [8/15] Algoritm pe intervale de 15 minute (96/zi) executat:")
    print(f"     • Rezoluție simulare: {sim['calculation_resolution']}")
    print(f"     • Membri activi în Iulie: {sim['active_members_count']} din {sim['total_members_count']}")
    print(f"     • Energie partajată: {sim['total_shared_kwh']} kWh")
    print(f"     • Economii totale comunitate: {sim['total_savings_ron']} RON")

    # 9. Verify 24-Hour Representative 15-Minute Curve Profile (96 intervals)
    daily_profile = sim.get("daily_15min_profile")
    assert daily_profile is not None
    assert len(daily_profile) == 96, f"Profilul zilnic trebuie să aibă 96 de intervale de 15 min, primite: {len(daily_profile)}"
    assert daily_profile[0]["time"] == "00:00"
    assert daily_profile[48]["time"] == "12:00"
    assert daily_profile[95]["time"] == "23:45"
    assert daily_profile[48]["production_kw"] > 0  # Midday solar production
    print(f"[OK] [9/15] Curba de sarcină pe intervale de 15 min (96 puncte) generată:")
    print(f"     • Ora 00:00: Producție={daily_profile[0]['production_kw']} kW, Consum={daily_profile[0]['consumption_kw']} kW")
    print(f"     • Ora 12:00 (vârf solar): Producție={daily_profile[48]['production_kw']} kW, Partajare={daily_profile[48]['shared_kw']} kW")

    # 10. Verify that Inactive Member (m4) got 0 kWh and is marked inactive
    m4_result = next(r for r in sim["members_results"] if r["member_id"] == m4["id"])
    assert m4_result["is_active"] is False
    assert m4_result["energy_received_kwh"] == 0.0
    assert m4_result["energy_shared_out_kwh"] == 0.0
    assert m4_result["savings_ron"] == 0.0
    print(f"[OK] [10/15] Verificare membru ieșit: '{m4_result['name']}' este marcat {m4_result['active_status_label']} și a primit 0 kWh partajare.")

    # 11. Test PUT /api/communities/members/{member_id}: Edit member type & share percentage
    edit_payload = {
        "name": "Centrul Comunitar Mamaia (Solar Modernizat)",
        "member_type": "prosumator",
        "installed_capacity_kw": 8.5,
        "contracted_power_kw": 25.0,
        "share_percentage": 25.0,
        "notes": "Modernizat la prosumator cu 8.5 kWp"
    }
    res_edit = client.put(f"/api/communities/members/{m3['id']}", json=edit_payload)
    assert res_edit.status_code == 200, f"Edit member failed: {res_edit.text}"
    m3_updated = res_edit.json()
    assert m3_updated["member_type"] == "prosumator"
    assert m3_updated["installed_capacity_kw"] == 8.5
    assert m3_updated["share_percentage"] == 25.0
    print(f"[OK] [11/15] Editare membru: Conversie din consumator în prosumator (8.5 kWp, cotă fixă 25%) confirmată.")

    # 12. Test marking member inactive and then reactivating + Run Algoritmul B (ANRE)
    # 12a. Mark m3 inactive starting June 2026
    res_exit = client.put(f"/api/communities/members/{m3['id']}", json={
        "end_year": 2026,
        "end_month": 6
    })
    assert res_exit.status_code == 200
    assert res_exit.json()["end_month"] == 6

    # Verify run in July 2026 has 3 active members (m1, m2 and m5)
    res_algo_2 = client.post(f"/api/communities/{comm_id}/run-sharing", json={
        "algorithm_type": "anre_algorithm_a",
        "year": 2026,
        "month": 7,
        "save_run": False
    })
    assert res_algo_2.status_code == 200
    sim_2 = res_algo_2.json()
    assert sim_2["active_members_count"] == 3
    print(f"[OK] [12/15] Membru marcat inactiv în 06/2026: În Iulie 2026 sunt {sim_2['active_members_count']} membri activi.")

    # 12b. Reactivate m3 (clear end_year & end_month) and test ANRE Algoritmul B (Fixed percentage)
    res_reactivate = client.put(f"/api/communities/members/{m3['id']}", json={
        "end_year": None,
        "end_month": None
    })
    assert res_reactivate.status_code == 200
    assert res_reactivate.json()["end_year"] is None
    assert res_reactivate.json()["end_month"] is None

    res_algo_b = client.post(f"/api/communities/{comm_id}/run-sharing", json={
        "algorithm_type": "anre_algorithm_b",
        "year": 2026,
        "month": 7,
        "save_run": True
    })
    assert res_algo_b.status_code == 200, f"Rulare Algoritm B eșuată: {res_algo_b.text}"
    sim_b = res_algo_b.json()
    assert sim_b["active_members_count"] == 4
    assert sim_b["total_shared_kwh"] > 0
    assert "Algoritmul de Alocare B (ANRE)" in sim_b["algorithm_name_ro"]
    print(f"[OK] [13/15] Reactivare membru & Algoritmul de Alocare B (ANRE - procent fix) executat cu succes ({sim_b['total_shared_kwh']} kWh partajați).")

    # 14. Test Comunitate Demonstrativă ANRE (CER-DEMO-01): 1 Producător (50 kWp) + 4 Consumatori (2 Mari, 2 Mici)
    res_demo = client.get("/api/communities")
    demo_comm = next((c for c in res_demo.json() if c["code"] == "CER-DEMO-01"), None)
    assert demo_comm is not None, "Comunitatea demonstrativă CER-DEMO-01 nu a fost găsită în seed data."
    assert demo_comm["members_count"] == 5
    assert demo_comm["production_systems_count"] == 1
    assert demo_comm["consumers_count"] == 4
    assert demo_comm["total_allocated_share_pct"] == 100.0

    # Rulare Algoritmul A (ANRE - proporțional cu consumul pe 15 min) pe Iulie 2026
    res_demo_a = client.post(f"/api/communities/{demo_comm['id']}/run-sharing", json={
        "algorithm_type": "anre_algorithm_a",
        "year": 2026,
        "month": 7,
        "save_run": False
    })
    assert res_demo_a.status_code == 200
    demo_a = res_demo_a.json()
    assert demo_a["total_production_kwh"] > 0
    assert demo_a["shared_from_production_pct"] is not None
    assert demo_a["shared_from_production_pct"] > 0

    # Rulare Algoritmul B (ANRE - cotă fixă 25% fiecărui consumator) pe Iulie 2026
    res_demo_b = client.post(f"/api/communities/{demo_comm['id']}/run-sharing", json={
        "algorithm_type": "anre_algorithm_b",
        "year": 2026,
        "month": 7,
        "save_run": False
    })
    assert res_demo_b.status_code == 200
    demo_b = res_demo_b.json()
    assert demo_b["shared_from_production_pct"] is not None
    assert demo_b["shared_from_production_pct"] > 0

    print(f"\n[OK] [14/15] Comunitatea Demonstrativă ANRE (CER-DEMO-01) - Comparare Algoritm A vs Algoritm B:")
    print(f"     • Producție Totală Iulie 2026: {demo_a['total_production_kwh']} kWh")
    print(f"     • Consum Total Iulie 2026: {demo_a['total_consumption_kwh']} kWh")
    print(f"     • ALGORITM A (ANRE - Proporțional cu Consumul pe intervale de 15 min):")
    print(f"       - Energie Verde Partajată: {demo_a['total_shared_kwh']} kWh")
    print(f"       - Procent Total din Producție Partajat: {demo_a['shared_from_production_pct']}% din producție")
    print(f"       - Economie Netă Comunitate: {demo_a['total_savings_ron']} RON")
    for m in demo_a["members_results"]:
        if m["consumption_kwh"] > 0:
            print(f"         > {m['name']}: {m['energy_received_kwh']} kWh primiți ({m['share_of_production_pct']}% din producție)")
    print(f"     • ALGORITM B (ANRE - Cotă Fixă 25% Fiecărui Consumator pe intervale de 15 min):")
    print(f"       - Energie Verde Partajată: {demo_b['total_shared_kwh']} kWh")
    print(f"       - Procent Total din Producție Partajat: {demo_b['shared_from_production_pct']}% din producție")
    print(f"       - Economie Netă Comunitate: {demo_b['total_savings_ron']} RON")
    for m in demo_b["members_results"]:
        if m["consumption_kwh"] > 0:
            print(f"         > {m['name']}: {m['energy_received_kwh']} kWh primiți ({m['share_of_production_pct']}% din producție)")

    assert demo_a["shared_from_production_pct"] > demo_b["shared_from_production_pct"], \
        f"Algoritmul A ({demo_a['shared_from_production_pct']}%) ar trebui să aibă un randament de producție partajată mai mare decât Algoritmul B ({demo_b['shared_from_production_pct']}%)!"

    # 15. Delete Member and Verify Cleanup
    res_del = client.delete(f"/api/communities/members/{m4['id']}")
    assert res_del.status_code == 200
    res_comm_check = client.get(f"/api/communities/{comm_id}")
    assert res_comm_check.json()["members_count"] == 4
    print("[OK] [15/15] Ștergere membru verificată cu succes (membri rămași în comunitatea de test: 4).")

    print("\n[SUCCESS] Toate suitele de teste de integrare și conformitate ANRE au trecut cu 100% succes!")


if __name__ == "__main__":
    test_full_pipeline()

