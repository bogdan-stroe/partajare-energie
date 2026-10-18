import csv
import io
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    EnergyCommunity,
    CommunityMember,
    MonthlyEnergyData,
    SharingRun
)
from app.schemas import (
    EnergyCommunityCreate,
    EnergyCommunityUpdate,
    CommunityMemberCreate,
    CommunityMemberUpdate,
    MonthlyEnergyDataCreate,
    FileUploadResponse
)
from app.algorithms import execute_sharing_algorithm


# =====================================================================
# ENERGY COMMUNITIES CRUD
# =====================================================================

def get_communities(db: Session, skip: int = 0, limit: int = 100) -> List[EnergyCommunity]:
    return db.query(EnergyCommunity).offset(skip).limit(limit).all()


def get_community(db: Session, community_id: int) -> Optional[EnergyCommunity]:
    return db.query(EnergyCommunity).filter(EnergyCommunity.id == community_id).first()


def get_community_by_code(db: Session, code: str) -> Optional[EnergyCommunity]:
    return db.query(EnergyCommunity).filter(EnergyCommunity.code == code).first()


def get_distribution_zones() -> List[Dict[str, Any]]:
    from app.models import DISTRIBUTION_ZONES
    return DISTRIBUTION_ZONES


def create_community(db: Session, community_in: EnergyCommunityCreate) -> EnergyCommunity:
    reg_num = community_in.anre_registration_number
    if community_in.anre_status != "inregistrare_admisa":
        # Only keep registration number if admitted
        reg_num = None if not reg_num else reg_num

    db_comm = EnergyCommunity(
        name=community_in.name,
        code=community_in.code,
        description=community_in.description,
        location=community_in.location,
        distribution_zone=community_in.distribution_zone,
        anre_status=community_in.anre_status,
        anre_registration_number=reg_num,
        internal_tariff=round(community_in.internal_tariff, 2),
        grid_tariff=round(community_in.grid_tariff, 2),
        export_tariff=round(community_in.export_tariff, 2),
        default_algorithm=community_in.default_algorithm,
    )
    db.add(db_comm)
    db.commit()
    db.refresh(db_comm)
    return db_comm


def update_community(db: Session, community_id: int, update_in: EnergyCommunityUpdate) -> Optional[EnergyCommunity]:
    comm = get_community(db, community_id)
    if not comm:
        return None
    data = update_in.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(comm, field, val)

    # If status is not admitted, registration number is optional/cleared unless provided
    if comm.anre_status != "inregistrare_admisa" and "anre_registration_number" not in data:
        pass  # keep existing or allow update

    db.commit()
    db.refresh(comm)
    return comm


def delete_community(db: Session, community_id: int) -> bool:
    comm = get_community(db, community_id)
    if not comm:
        return False
    db.delete(comm)
    db.commit()
    return True


# =====================================================================
# COMMUNITY MEMBERS (3 TYPES) CRUD
# =====================================================================

def get_community_members(db: Session, community_id: int) -> List[CommunityMember]:
    return db.query(CommunityMember).filter(CommunityMember.community_id == community_id).all()


def get_member(db: Session, member_id: int) -> Optional[CommunityMember]:
    return db.query(CommunityMember).filter(CommunityMember.id == member_id).first()


def create_community_member(db: Session, member_in: CommunityMemberCreate) -> CommunityMember:
    installed_cap = member_in.installed_capacity_kw
    contracted_p = member_in.contracted_power_kw
    share_pct = member_in.share_percentage or 0.0

    # 1. Enforce rules according to member type:
    # Instalațiile de stocare și producție nu au alocat un procent de consum
    if member_in.member_type == "sistem_productie":
        contracted_p = 0.0
        share_pct = 0.0
    elif member_in.member_type in ("stocare_bess", "bess"):
        share_pct = 0.0
    elif member_in.member_type == "consumator":
        installed_cap = 0.0

    # 2. Suma procentelor alocate pentru consum nu poate depăși 100 în cadrul unei comunități
    existing_members = get_community_members(db, member_in.community_id)
    current_total_share = sum(m.share_percentage or 0.0 for m in existing_members)
    if current_total_share + share_pct > 100.0001:
        available = max(0.0, round(100.0 - current_total_share, 2))
        raise ValueError(
            f"Suma procentelor alocate pentru consum nu poate depăși 100% în cadrul comunității. "
            f"Suma actuală a celorlalte locuri de consum este {round(current_total_share, 2)}%, "
            f"iar cota solicitată ({share_pct}%) ar duce totalul la {round(current_total_share + share_pct, 2)}% "
            f"(disponibil maxim: {available}%)."
        )

    db_member = CommunityMember(
        community_id=member_in.community_id,
        name=member_in.name,
        code_pod=member_in.code_pod,
        member_type=member_in.member_type,
        address=member_in.address,
        installed_capacity_kw=installed_cap,
        contracted_power_kw=contracted_p,
        share_percentage=share_pct,
        notes=member_in.notes,
        start_year=member_in.start_year,
        start_month=member_in.start_month,
        end_year=member_in.end_year,
        end_month=member_in.end_month,
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member


def update_community_member(db: Session, member_id: int, update_in: CommunityMemberUpdate) -> Optional[CommunityMember]:
    member = get_member(db, member_id)
    if not member:
        return None
    data = update_in.model_dump(exclude_unset=True)

    target_type = data.get("member_type", member.member_type)
    target_share = data.get("share_percentage", member.share_percentage or 0.0)

    # 1. Enforce rules according to member type:
    if target_type in ("sistem_productie", "stocare_bess", "bess"):
        target_share = 0.0
        data["share_percentage"] = 0.0
    if target_type == "sistem_productie":
        data["contracted_power_kw"] = 0.0
    elif target_type == "consumator":
        data["installed_capacity_kw"] = 0.0

    # 2. Check total share percentages in the community
    existing_members = get_community_members(db, member.community_id)
    other_members_share = sum(m.share_percentage or 0.0 for m in existing_members if m.id != member_id)
    if other_members_share + target_share > 100.0001:
        available = max(0.0, round(100.0 - other_members_share, 2))
        raise ValueError(
            f"Suma procentelor alocate pentru consum nu poate depăși 100% în cadrul comunității. "
            f"Celelalte locuri de consum au un total de {round(other_members_share, 2)}%, "
            f"iar cota solicitată ({target_share}%) ar duce totalul la {round(other_members_share + target_share, 2)}% "
            f"(disponibil maxim: {available}%)."
        )

    for field, val in data.items():
        setattr(member, field, val)

    if member.member_type == "sistem_productie":
        member.contracted_power_kw = 0.0
        member.share_percentage = 0.0
    elif member.member_type in ("stocare_bess", "bess"):
        member.share_percentage = 0.0
    elif member.member_type == "consumator":
        member.installed_capacity_kw = 0.0

    db.commit()
    db.refresh(member)
    return member


def delete_community_member(db: Session, member_id: int) -> bool:
    member = get_member(db, member_id)
    if not member:
        return False
    db.delete(member)
    db.commit()
    return True


# =====================================================================
# MONTHLY DATA & CURVE UPLOAD CRUD
# =====================================================================

def get_monthly_energy_data(
    db: Session,
    community_id: int,
    year: Optional[int] = None,
    month: Optional[int] = None
) -> List[MonthlyEnergyData]:
    query = db.query(MonthlyEnergyData).filter(MonthlyEnergyData.community_id == community_id)
    if year:
        query = query.filter(MonthlyEnergyData.year == year)
    if month and month > 0:
        query = query.filter(MonthlyEnergyData.month == month)
    return query.order_by(MonthlyEnergyData.year, MonthlyEnergyData.month, MonthlyEnergyData.member_id).all()


def upsert_monthly_data(db: Session, data_in: MonthlyEnergyDataCreate) -> MonthlyEnergyData:
    member = get_member(db, data_in.member_id)
    if not member:
        raise ValueError("Membrul nu a fost găsit.")

    prod = data_in.production_kwh
    cons = data_in.consumption_kwh

    if member.member_type == "sistem_productie":
        cons = 0.0
    elif member.member_type == "consumator":
        prod = 0.0

    existing = db.query(MonthlyEnergyData).filter(
        MonthlyEnergyData.member_id == data_in.member_id,
        MonthlyEnergyData.year == data_in.year,
        MonthlyEnergyData.month == data_in.month
    ).first()

    if existing:
        existing.production_kwh = round(prod, 2)
        existing.consumption_kwh = round(cons, 2)
        existing.curve_source = data_in.curve_source
        existing.notes = data_in.notes
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_row = MonthlyEnergyData(
            community_id=data_in.community_id,
            member_id=data_in.member_id,
            year=data_in.year,
            month=data_in.month,
            production_kwh=round(prod, 2),
            consumption_kwh=round(cons, 2),
            curve_source=data_in.curve_source,
            notes=data_in.notes
        )
        db.add(new_row)
        db.commit()
        db.refresh(new_row)
        return new_row


def import_curves_from_csv(
    db: Session,
    community_id: int,
    file_content_str: str,
    filename: str = "curbe_importate.csv",
    selected_year: Optional[int] = None,
    selected_month: Optional[int] = None
) -> FileUploadResponse:
    """
    Parses an uploaded CSV file containing production and consumption curve data for community members.
    Supports:
    1. Format matriceal lunar pe intervale de 15 minute (Wide Matrix):
       Fiecare rând = un interval de 15 min din acea lună (până la 2.976 rânduri).
       Coloane: timestamp / data / ora, urmate de [POD]_productie_kwh și [POD]_consum_kwh pentru toți membrii.
    2. Format listă (Long):
       Fiecare rând = code_pod, year, month, production_kwh, consumption_kwh.
    """
    import re
    comm = get_community(db, community_id)
    if not comm:
        raise ValueError("Comunitatea nu a fost găsită.")

    members = get_community_members(db, community_id)
    if not members:
        raise ValueError("Comunitatea nu are încă membri înregistrați. Adăugați mai întâi membrii.")

    # Create lookups for member matching
    pod_map = {m.code_pod.strip().upper(): m for m in members}
    name_map = {m.name.strip().lower(): m for m in members}

    def parse_float(val) -> float:
        if val is None or val == "":
            return 0.0
        try:
            return float(str(val).replace(",", ".").strip())
        except (ValueError, TypeError):
            return 0.0

    # Detect delimiter
    first_line = file_content_str.split("\n")[0]
    delimiter = ";" if ";" in first_line else ","

    reader = csv.DictReader(io.StringIO(file_content_str), delimiter=delimiter)
    if not reader.fieldnames:
        raise ValueError("Fișierul CSV este gol sau nu are antet de coloane valid.")

    def clean_key(k: str) -> str:
        return k.strip().lower().replace(" ", "_").replace("-", "_").replace("ă", "a").replace("â", "a").replace("î", "i").replace("ș", "s").replace("ț", "t")

    cleaned_headers = {clean_key(col): col for col in reader.fieldnames}

    # =========================================================================
    # 1. DETECȚIE FORMAT MATRICEAL LUNAR (WIDE) PE INTERVALE DE 15 MINUTE
    # =========================================================================
    wide_pod_columns = {}  # raw_col -> (member, flux: 'prod' | 'cons')
    for raw_col in reader.fieldnames:
        norm_col = raw_col.strip().upper()
        for pod, m in pod_map.items():
            if pod in norm_col:
                if any(x in norm_col for x in ["PROD", "PRODUCTIE", "GENERARE", "EXPORT", "_P"]):
                    wide_pod_columns[raw_col] = (m, "prod")
                elif any(x in norm_col for x in ["CONS", "CONSUM", "IMPORT", "_C"]):
                    wide_pod_columns[raw_col] = (m, "cons")
                break

    if len(wide_pod_columns) > 0:
        time_col = None
        for cand in ["timestamp", "data_ora", "date_time", "datetime", "data", "date"]:
            if cand in cleaned_headers:
                time_col = cleaned_headers[cand]
                break

        member_series = {m.id: [] for m in members}
        detected_year = selected_year
        detected_month = selected_month
        rows_count = 0

        for row in reader:
            rows_count += 1
            # Extrage anul și luna din coloana de timp dacă nu sunt specificate manual
            if (detected_year is None or detected_month is None) and time_col and row.get(time_col):
                t_str = str(row[time_col]).strip()
                m_iso = re.search(r'(\d{4})[-/.](\d{1,2})', t_str)
                if m_iso:
                    detected_year = detected_year or int(m_iso.group(1))
                    detected_month = detected_month or int(m_iso.group(2))
                else:
                    m_ro = re.search(r'(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})', t_str)
                    if m_ro:
                        detected_year = detected_year or int(m_ro.group(3))
                        detected_month = detected_month or int(m_ro.group(2))

            # Valori interval pentru fiecare membru
            member_row_vals = {m.id: {"prod": 0.0, "cons": 0.0} for m in members}
            for col, (m, flux) in wide_pod_columns.items():
                v = parse_float(row.get(col))
                if flux == "prod":
                    member_row_vals[m.id]["prod"] = v
                elif flux == "cons":
                    member_row_vals[m.id]["cons"] = v

            for m in members:
                vals = member_row_vals[m.id]
                if m.member_type == "sistem_productie":
                    vals["cons"] = 0.0
                elif m.member_type == "consumator":
                    vals["prod"] = 0.0
                # stocare_bess and prosumator can have both prod and cons
                member_series[m.id].append(vals)

        detected_year = detected_year or 2026
        detected_month = detected_month or 7

        active_in_file = set(m.id for m, _ in wide_pod_columns.values())
        for m_id in active_in_file:
            series = member_series[m_id]
            tot_prod = round(sum(s["prod"] for s in series), 2)
            tot_cons = round(sum(s["cons"] for s in series), 2)
            series_json = json.dumps(series)

            existing = db.query(MonthlyEnergyData).filter(
                MonthlyEnergyData.member_id == m_id,
                MonthlyEnergyData.year == detected_year,
                MonthlyEnergyData.month == detected_month
            ).first()

            if existing:
                existing.production_kwh = tot_prod
                existing.consumption_kwh = tot_cons
                existing.hourly_curve_json = series_json
                existing.curve_source = filename
                existing.notes = f"Curbe 15-min ({len(series)} intervale) din {filename}"
            else:
                db.add(MonthlyEnergyData(
                    community_id=community_id,
                    member_id=m_id,
                    year=detected_year,
                    month=detected_month,
                    production_kwh=tot_prod,
                    consumption_kwh=tot_cons,
                    hourly_curve_json=series_json,
                    curve_source=filename,
                    notes=f"Curbe 15-min ({len(series)} intervale) din {filename}"
                ))

        db.commit()
        return FileUploadResponse(
            status="success",
            message=f"Au fost importate cu succes {rows_count} intervale de 15 minute din luna {detected_month:02d}/{detected_year} pentru {len(active_in_file)} membri.",
            filename=filename,
            community_id=community_id,
            rows_imported=rows_count,
            members_updated=len(active_in_file),
            years_detected=[detected_year],
            months_detected=[detected_month],
            warnings=[]
        )

    # =========================================================================
    # 2. FORMAT CLASIC / LISTĂ (LONG)
    # =========================================================================
    col_pod = cleaned_headers.get("code_pod") or cleaned_headers.get("pod") or cleaned_headers.get("cod_pod")
    col_name = cleaned_headers.get("member_name") or cleaned_headers.get("nume") or cleaned_headers.get("membru") or cleaned_headers.get("nume_membru")
    col_year = cleaned_headers.get("year") or cleaned_headers.get("an") or cleaned_headers.get("anul")
    col_month = cleaned_headers.get("month") or cleaned_headers.get("luna")
    col_prod = cleaned_headers.get("production_kwh") or cleaned_headers.get("productie") or cleaned_headers.get("productie_kwh") or cleaned_headers.get("prod_kwh") or cleaned_headers.get("prod")
    col_cons = cleaned_headers.get("consumption_kwh") or cleaned_headers.get("consum") or cleaned_headers.get("consum_kwh") or cleaned_headers.get("cons_kwh") or cleaned_headers.get("cons")

    if not col_pod and not col_name:
        raise ValueError("Fișierul CSV trebuie să conțină coloane cu POD-urile membrilor (ex: [POD]_productie_kwh, [POD]_consum_kwh) sau coloană 'code_pod'.")

    rows_imported = 0
    updated_member_ids = set()
    years_detected = set()
    months_detected = set()
    warnings = []

    line_num = 1
    for row in reader:
        line_num += 1
        member = None
        if col_pod and row.get(col_pod):
            pod_val = str(row[col_pod]).strip().upper()
            member = pod_map.get(pod_val)
        if not member and col_name and row.get(col_name):
            name_val = str(row[col_name]).strip().lower()
            member = name_map.get(name_val)

        if not member:
            id_val = row.get(col_pod) or row.get(col_name)
            warnings.append(f"Rândul {line_num}: Membrul '{id_val}' nu a fost găsit în comunitate.")
            continue

        try:
            year_val = int(row[col_year]) if col_year and row.get(col_year) else (selected_year or 2026)
            month_val = int(row[col_month]) if col_month and row.get(col_month) else (selected_month or 7)
            if month_val < 1 or month_val > 12:
                warnings.append(f"Rândul {line_num}: Luna '{month_val}' este invalidă (trebuie 1-12).")
                continue
        except (ValueError, TypeError):
            warnings.append(f"Rândul {line_num}: Anul sau luna nu sunt numerice.")
            continue

        prod_val = parse_float(row.get(col_prod)) if col_prod else 0.0
        cons_val = parse_float(row.get(col_cons)) if col_cons else 0.0

        if member.member_type == "sistem_productie":
            cons_val = 0.0
        elif member.member_type == "consumator":
            prod_val = 0.0

        existing = db.query(MonthlyEnergyData).filter(
            MonthlyEnergyData.member_id == member.id,
            MonthlyEnergyData.year == year_val,
            MonthlyEnergyData.month == month_val
        ).first()

        if existing:
            existing.production_kwh = round(prod_val, 2)
            existing.consumption_kwh = round(cons_val, 2)
            existing.curve_source = filename
        else:
            db.add(MonthlyEnergyData(
                community_id=community_id,
                member_id=member.id,
                year=year_val,
                month=month_val,
                production_kwh=round(prod_val, 2),
                consumption_kwh=round(cons_val, 2),
                curve_source=filename,
                notes=f"Încărcat din fișier: {filename}"
            ))

        rows_imported += 1
        updated_member_ids.add(member.id)
        years_detected.add(year_val)
        months_detected.add(month_val)

    db.commit()

    return FileUploadResponse(
        status="success",
        message=f"Au fost importate cu succes {rows_imported} înregistrări lunare pentru {len(updated_member_ids)} membri.",
        filename=filename,
        community_id=community_id,
        rows_imported=rows_imported,
        members_updated=len(updated_member_ids),
        years_detected=sorted(list(years_detected)),
        months_detected=sorted(list(months_detected)),
        warnings=warnings[:10]
    )


def generate_csv_template(db: Session, community_id: int, year: int = 2026, month: int = 7) -> str:
    """
    Generates a downloadable pre-filled CSV template for a single month.
    Matrix (Wide) format:
    - Each row represents a 15-minute interval in that month (days_in_month * 96 rows).
    - Columns: timestamp, data, ora, interval_zi, followed by {pod}_productie_kwh and {pod}_consum_kwh
      for every community member (including producers, prosumers, consumers, and BESS storage).
    """
    import calendar
    from app.algorithms import _get_solar_weight, _get_consumption_weight, INTERVALS_PER_DAY

    members = get_community_members(db, community_id)
    if not (1 <= month <= 12):
        month = 7
    _, days_count = calendar.monthrange(year, month)

    output = io.StringIO()
    writer = csv.writer(output)

    # Header: coloane timestamp/data/ora urmate de perechi productie si consum pentru fiecare POD
    header = ["timestamp", "data", "ora", "interval_zi"]
    for m in members:
        pod = m.code_pod.strip().upper()
        header.append(f"{pod}_productie_kwh")
        header.append(f"{pod}_consum_kwh")
    writer.writerow(header)

    # Linii pentru fiecare zi a lunii (days_count * 96 intervale)
    for d in range(1, days_count + 1):
        date_str = f"{year}-{month:02d}-{d:02d}"
        for tod in range(INTERVALS_PER_DAY):
            hour = tod // 4
            minute = (tod % 4) * 15
            time_str = f"{hour:02d}:{minute:02d}"
            timestamp_str = f"{date_str} {time_str}"
            int_zi = tod + 1

            row = [timestamp_str, date_str, time_str, int_zi]
            sw = _get_solar_weight(tod)

            for m in members:
                cw = _get_consumption_weight(tod, m.member_type)
                is_act = m.is_active_in(year, month)

                if not is_act:
                    row.append("0.0000")
                    row.append("0.0000")
                    continue

                if m.member_type == "sistem_productie":
                    cap = m.installed_capacity_kw or 20.0
                    prod = round(sw * cap * 0.25, 4)
                    cons = 0.0
                elif m.member_type == "consumator":
                    prod = 0.0
                    p_contract = m.contracted_power_kw or 5.0
                    cons = round(cw * (p_contract * 0.08) * 0.25, 4)
                elif m.member_type in ["stocare_bess", "bess"]:
                    # BESS: Încărcare la amiază (surplus solar), Descărcare seara (vârf consum)
                    cap = m.installed_capacity_kw or 10.0
                    if 40 <= tod <= 60:  # 10:00 - 15:00 Încărcare
                        prod = 0.0
                        cons = round(sw * cap * 0.25, 4)
                    elif 72 <= tod <= 88:  # 18:00 - 22:00 Descărcare
                        prod = round(cap * 0.20, 4)
                        cons = 0.0
                    else:
                        prod = 0.0
                        cons = 0.0
                else:  # prosumator
                    cap = m.installed_capacity_kw or 5.0
                    p_contract = m.contracted_power_kw or 5.0
                    prod = round(sw * cap * 0.25, 4)
                    cons = round(cw * (p_contract * 0.07) * 0.25, 4)

                row.append(f"{prod:.4f}")
                row.append(f"{cons:.4f}")

            writer.writerow(row)

    return output.getvalue()


def export_saved_curves(db: Session, community_id: int, year: int, month: int) -> str:
    """
    Exports previously saved 15-minute load curves for a specific month and year as a matrix CSV.
    Extracts the recorded 15-minute interval readings for every member.
    """
    import calendar
    from app.algorithms import INTERVALS_PER_DAY, build_member_15min_series

    comm = get_community(db, community_id)
    if not comm:
        raise ValueError("Comunitatea nu a fost găsită.")

    members = get_community_members(db, community_id)
    if not members:
        raise ValueError("Comunitatea nu are membri înregistrați.")

    if not (1 <= month <= 12):
        raise ValueError("Luna specificată este invalidă (trebuie între 1 și 12).")

    _, days_count = calendar.monthrange(year, month)
    total_intervals = days_count * INTERVALS_PER_DAY

    # Fetch recorded monthly data for all members in this month
    records = db.query(MonthlyEnergyData).filter(
        MonthlyEnergyData.community_id == community_id,
        MonthlyEnergyData.year == year,
        MonthlyEnergyData.month == month
    ).all()
    records_by_member = {r.member_id: r for r in records}

    # Prepare 15-minute series for each member
    member_series = {}
    for m in members:
        rec = records_by_member.get(m.id)
        if rec and rec.hourly_curve_json:
            try:
                raw_ints = json.loads(rec.hourly_curve_json)
                p_arr, c_arr = build_member_15min_series(
                    production_kwh=rec.production_kwh,
                    consumption_kwh=rec.consumption_kwh,
                    member_type=m.member_type,
                    days_count=days_count,
                    existing_intervals=raw_ints
                )
            except Exception:
                p_arr, c_arr = build_member_15min_series(
                    production_kwh=rec.production_kwh if rec else 0.0,
                    consumption_kwh=rec.consumption_kwh if rec else 0.0,
                    member_type=m.member_type,
                    days_count=days_count
                )
        elif rec:
            p_arr, c_arr = build_member_15min_series(
                production_kwh=rec.production_kwh,
                consumption_kwh=rec.consumption_kwh,
                member_type=m.member_type,
                days_count=days_count
            )
        else:
            p_arr = [0.0] * total_intervals
            c_arr = [0.0] * total_intervals

        member_series[m.id] = (p_arr, c_arr)

    output = io.StringIO()
    writer = csv.writer(output)

    header = ["timestamp", "data", "ora", "interval_zi"]
    for m in members:
        pod = m.code_pod.strip().upper()
        header.append(f"{pod}_productie_kwh")
        header.append(f"{pod}_consum_kwh")
    writer.writerow(header)

    for t in range(total_intervals):
        d = (t // INTERVALS_PER_DAY) + 1
        tod = t % INTERVALS_PER_DAY
        hour = tod // 4
        minute = (tod % 4) * 15
        date_str = f"{year}-{month:02d}-{d:02d}"
        time_str = f"{hour:02d}:{minute:02d}"
        timestamp_str = f"{date_str} {time_str}"
        int_zi = tod + 1

        row = [timestamp_str, date_str, time_str, int_zi]
        for m in members:
            p_arr, c_arr = member_series[m.id]
            p_val = p_arr[t] if t < len(p_arr) else 0.0
            c_val = c_arr[t] if t < len(c_arr) else 0.0
            row.append(f"{p_val:.4f}")
            row.append(f"{c_val:.4f}")

        writer.writerow(row)

    return output.getvalue()


def generate_realistic_monthly_data(db: Session, community_id: int, year: int = 2026):
    """Generates realistic Romanian seasonal curve data for 12 months for testing/simulation."""
    members = get_community_members(db, community_id)
    if not members:
        return

    # Specific solar yield (kWh/kWp) per month in Romania
    solar_yield_per_kwp = [35, 50, 85, 110, 140, 155, 165, 150, 115, 75, 40, 30]
    # Seasonal consumption factor
    consumption_multipliers = [1.35, 1.25, 1.05, 0.90, 0.85, 0.95, 1.10, 1.05, 0.90, 1.00, 1.20, 1.35]

    for member in members:
        if member.member_type == "sistem_productie":
            base_cons = 0.0
        elif member.member_type == "prosumator":
            base_cons = 350.0
        else:
            # Consumator: diferențiat realist după puterea contractată (consumatori mari vs mici)
            if member.contracted_power_kw and member.contracted_power_kw >= 20.0:
                base_cons = round(member.contracted_power_kw * 100.0, 1)  # Consumator mare (ex: 30 kW -> 3000 kWh/lună)
            elif member.contracted_power_kw and member.contracted_power_kw > 0:
                base_cons = round(member.contracted_power_kw * 40.0, 1)   # Consumator mic (ex: 8 kW -> 320 kWh/lună)
            else:
                base_cons = 420.0

        for month_idx in range(12):
            month = month_idx + 1

            if not member.is_active_in(year, month):
                prod = 0.0
                cons = 0.0
            else:
                if member.member_type in ["sistem_productie", "prosumator"] and member.installed_capacity_kw > 0:
                    prod = round(member.installed_capacity_kw * solar_yield_per_kwp[month_idx], 2)
                else:
                    prod = 0.0

                if member.member_type == "sistem_productie":
                    cons = 0.0
                else:
                    cons = round(base_cons * consumption_multipliers[month_idx], 2)

            existing = db.query(MonthlyEnergyData).filter(
                MonthlyEnergyData.member_id == member.id,
                MonthlyEnergyData.year == year,
                MonthlyEnergyData.month == month
            ).first()

            if existing:
                existing.production_kwh = prod
                existing.consumption_kwh = cons
                existing.curve_source = "generare_simulata"
            else:
                db.add(MonthlyEnergyData(
                    community_id=community_id,
                    member_id=member.id,
                    year=year,
                    month=month,
                    production_kwh=prod,
                    consumption_kwh=cons,
                    curve_source="generare_simulata",
                    notes=f"Generat automat {year}-{month:02d}"
                ))

    db.commit()


# =====================================================================
# SHARING ALGORITHM RUNS CRUD
# =====================================================================

def run_community_sharing_algorithm(
    db: Session,
    community_id: int,
    year: int,
    month: int,
    algorithm_type: Optional[str] = None,
    save_run: bool = True
) -> Dict[str, Any]:
    comm = get_community(db, community_id)
    if not comm:
        raise ValueError("Comunitatea de energie nu a fost găsită.")

    members = get_community_members(db, community_id)
    if not members:
        raise ValueError("Comunitatea nu are niciun membru înregistrat. Adăugați mai întâi membri.")

    algo = algorithm_type or comm.default_algorithm or "anre_algorithm_a"

    # Check if data exists; if none exists, generate simulated baseline
    count = db.query(MonthlyEnergyData).filter(
        MonthlyEnergyData.community_id == community_id,
        MonthlyEnergyData.year == year
    ).count()

    if count == 0:
        generate_realistic_monthly_data(db, community_id, year=year)

    members_data = []
    for m in members:
        is_act = m.is_active_in(year, month)
        intervals_15min = None

        if not is_act:
            prod = 0.0
            cons = 0.0
        elif month > 0:
            row = db.query(MonthlyEnergyData).filter(
                MonthlyEnergyData.member_id == m.id,
                MonthlyEnergyData.year == year,
                MonthlyEnergyData.month == month
            ).first()
            prod = row.production_kwh if row else 0.0
            cons = row.consumption_kwh if row else 0.0
            if row and row.hourly_curve_json:
                try:
                    intervals_15min = json.loads(row.hourly_curve_json)
                except Exception:
                    intervals_15min = None
        else:
            rows = db.query(MonthlyEnergyData).filter(
                MonthlyEnergyData.member_id == m.id,
                MonthlyEnergyData.year == year
            ).all()
            prod = sum(r.production_kwh for r in rows)
            cons = sum(r.consumption_kwh for r in rows)

        members_data.append({
            "member_id": m.id,
            "name": m.name,
            "code_pod": m.code_pod,
            "member_type": m.member_type,
            "is_active": is_act,
            "start_year": m.start_year,
            "start_month": m.start_month,
            "end_year": m.end_year,
            "end_month": m.end_month,
            "production_kwh": prod,
            "consumption_kwh": cons,
            "share_percentage": m.share_percentage or 0.0,
            "intervals_15min": intervals_15min,
        })

    res = execute_sharing_algorithm(
        members_data=members_data,
        algorithm_type=algo,
        internal_tariff=comm.internal_tariff,
        grid_tariff=comm.grid_tariff,
        export_tariff=comm.export_tariff,
        year=year,
        month=month
    )

    res["community_id"] = comm.id
    res["community_name"] = comm.name
    res["distribution_zone"] = comm.distribution_zone
    res["distribution_zone_name"] = comm.zone_details.get("name")
    res["distribution_operator"] = comm.zone_details.get("operator")
    res["year"] = year
    res["month"] = month

    if save_run:
        sharing_run = SharingRun(
            community_id=comm.id,
            year=year,
            month=month,
            algorithm_type=algo,
            total_production_kwh=res["total_production_kwh"],
            total_consumption_kwh=res["total_consumption_kwh"],
            total_shared_kwh=res["total_shared_kwh"],
            total_grid_import_kwh=res["total_grid_import_kwh"],
            total_grid_export_kwh=res["total_grid_export_kwh"],
            self_sufficiency_rate=res["self_sufficiency_rate_pct"],
            total_savings_ron=res["total_savings_ron"],
            details_json=json.dumps(res["members_results"]),
            executed_at=datetime.now(timezone.utc)
        )
        db.add(sharing_run)
        db.commit()
        db.refresh(sharing_run)
        res["id"] = sharing_run.id

    return res


def get_sharing_runs(db: Session, community_id: int, limit: int = 20) -> List[SharingRun]:
    return db.query(SharingRun).filter(
        SharingRun.community_id == community_id
    ).order_by(SharingRun.id.desc()).limit(limit).all()
