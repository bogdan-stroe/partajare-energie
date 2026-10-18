"""
Energy Sharing Algorithms for Renewable Energy Communities (CER)
Simulates physical energy flows on 15-minute settlement intervals (96 intervals/day).
ANRE & EU Renewable Energy Directive (RED II) compliant settlement.

Supported Algorithms:
1. proportional_consumption: Pro-Rata la deficitul de consum pe fiecare interval de 15 min
2. equal_share: Partajare egalitară pe fiecare interval de 15 min (redistribuire iterativă)
3. prosumer_priority: Prioritate prosumatori cu deficit, apoi consumatori puri
4. fixed_coefficients: Coeficienți procentuali ficși de participare (%)
"""

import math
import calendar
from typing import List, Dict, Any, Optional, Tuple


INTERVALS_PER_DAY = 96  # 24 hours * 4 intervals/hour (15 minutes resolution)


def get_algorithm_label(algorithm_type: str) -> str:
    labels = {
        "anre_algorithm_a": "Algoritmul de Alocare A (ANRE) — Proporțional cu Consumul pe Interval",
        "anre_algorithm_b": "Algoritmul de Alocare B (ANRE) — În Procent Fix pe Interval",
        "proportional_consumption": "Algoritmul de Alocare A (ANRE) — Proporțional cu Consumul pe Interval",
        "fixed_coefficients": "Algoritmul de Alocare B (ANRE) — În Procent Fix pe Interval",
        "equal_share": "Partajare Egalitară (Cote Egale Redistribuite)",
        "prosumer_priority": "Prioritate Prosumatori, apoi Consumatori",
    }
    return labels.get(algorithm_type, "Algoritmul de Alocare A (ANRE)")


def _get_solar_weight(interval_in_day: int) -> float:
    """
    Standard solar irradiance curve for 15-minute intervals.
    Interval 0 is 00:00-00:15, Interval 48 is 12:00-12:15, Interval 95 is 23:45-24:00.
    Solar generation spans intervals 24 (06:00) to 80 (20:00), peaking at 48-52 (12:00-13:00).
    """
    if interval_in_day < 24 or interval_in_day > 80:
        return 0.0
    # Bell curve using sin^1.8
    norm = (interval_in_day - 24) / 56.0
    return max(0.0, math.sin(math.pi * norm)) ** 1.8


def _get_production_weight(interval_in_day: int, member_type: str = "prosumator") -> float:
    if member_type in ("stocare_bess", "bess"):
        # Storage discharges during evening peak (18:00 - 22:00, intervals 72 - 88)
        if 72 <= interval_in_day <= 88:
            return 1.0
        return 0.0
    return _get_solar_weight(interval_in_day)


def _get_consumption_weight(interval_in_day: int, member_type: str) -> float:
    """
    Standard electrical load profile for 15-minute intervals.
    - Household/Prosumer: morning peak (07:00-09:30), daytime valley, evening peak (18:00-22:30).
    - Commercial/Office: high plateau during working hours (08:00-18:00).
    - Storage BESS: charging peak during solar surplus (10:00-15:00, intervals 40-60).
    """
    if member_type == "sistem_productie":
        return 0.0

    if member_type in ("stocare_bess", "bess"):
        # Storage charges during midday solar surplus (10:00 - 15:00)
        if 40 <= interval_in_day <= 60:
            return 1.0
        return 0.05

    # Morning: 28 (07:00) to 38 (09:30)
    # Day: 38 to 72 (18:00)
    # Evening: 72 (18:00) to 90 (22:30)
    # Night: 90 to 28
    if 28 <= interval_in_day <= 38:
        # Morning peak
        return 0.75 + 0.20 * math.sin(math.pi * (interval_in_day - 28) / 10.0)
    elif 38 < interval_in_day < 72:
        # Daytime baseline / moderate activity
        return 0.45 + 0.10 * math.sin(math.pi * (interval_in_day - 38) / 34.0)
    elif 72 <= interval_in_day <= 90:
        # Evening peak
        return 0.85 + 0.35 * math.sin(math.pi * (interval_in_day - 72) / 18.0)
    else:
        # Night baseline
        return 0.20


def build_member_15min_series(
    production_kwh: float,
    consumption_kwh: float,
    member_type: str,
    days_count: int,
    existing_intervals: Optional[List[Dict[str, float]]] = None
) -> Tuple[List[float], List[float]]:
    """
    Constructs 15-minute interval arrays for production and consumption.
    Length = days_count * 96 intervals.
    If existing_intervals is provided, uses those; otherwise generates calibrated physical curves.
    """
    total_intervals = days_count * INTERVALS_PER_DAY

    if existing_intervals and len(existing_intervals) > 0:
        prod_arr = [max(0.0, float(x.get("prod", 0.0))) for x in existing_intervals[:total_intervals]]
        cons_arr = [max(0.0, float(x.get("cons", 0.0))) for x in existing_intervals[:total_intervals]]
        if len(prod_arr) < total_intervals:
            pad = total_intervals - len(prod_arr)
            prod_arr.extend([0.0] * pad)
            cons_arr.extend([0.0] * pad)
        return prod_arr, cons_arr

    # Enforce member type constraints
    if member_type == "sistem_productie":
        consumption_kwh = 0.0
    elif member_type == "consumator":
        production_kwh = 0.0

    # Build uncalibrated weights
    raw_prod = []
    raw_cons = []

    for d in range(days_count):
        # Slight day-to-day weather variation for realistic output
        day_weather = 1.0 + 0.12 * math.sin(d * 1.6 + 0.4)

        for t in range(INTERVALS_PER_DAY):
            sol = _get_production_weight(t, member_type) * day_weather if production_kwh > 0 else 0.0
            con = _get_consumption_weight(t, member_type) if consumption_kwh > 0 else 0.0
            raw_prod.append(sol)
            raw_cons.append(con)

    # Scale to match total monthly kWh exactly
    sum_raw_prod = sum(raw_prod)
    sum_raw_cons = raw_cons_sum = sum(raw_cons)

    if sum_raw_prod > 0 and production_kwh > 0:
        prod_arr = [round((p / sum_raw_prod) * production_kwh, 5) for p in raw_prod]
    else:
        prod_arr = [0.0] * total_intervals

    if sum_raw_cons > 0 and consumption_kwh > 0:
        cons_arr = [round((c / sum_raw_cons) * consumption_kwh, 5) for c in raw_cons]
    else:
        cons_arr = [0.0] * total_intervals

    return prod_arr, cons_arr


def execute_sharing_algorithm(
    members_data: List[Dict[str, Any]],
    algorithm_type: str = "proportional_consumption",
    internal_tariff: float = 0.65,
    grid_tariff: float = 1.30,
    export_tariff: float = 0.35,
    year: int = 2026,
    month: int = 7,
) -> Dict[str, Any]:
    """
    Executes an energy sharing simulation on 15-minute settlement intervals.
    Strictly applies sharing exclusively to members active in the specified period.
    Inactive members receive 0 kWh sharing.

    Returns:
    - Monthly aggregated KPIs and member balances
    - 24-hour representative 15-minute profile (96 points) for charting
    """
    # Determine days count
    if month > 0:
        _, days_in_month = calendar.monthrange(year, month)
    else:
        # Full year representative simulation (12 months x 30 days = 360 days or 365)
        days_in_month = 365

    total_intervals = days_in_month * INTERVALS_PER_DAY

    # Separate active vs inactive members
    active_members = []
    inactive_members = []

    for m in members_data:
        is_active = m.get("is_active", True)
        if is_active:
            active_members.append(m)
        else:
            inactive_members.append(m)

    # Prepare interval curves for active members
    active_series = []
    for m in active_members:
        prod_arr, cons_arr = build_member_15min_series(
            production_kwh=float(m.get("production_kwh", 0.0)),
            consumption_kwh=float(m.get("consumption_kwh", 0.0)),
            member_type=m.get("member_type", "prosumator"),
            days_count=days_in_month,
            existing_intervals=m.get("intervals_15min")
        )
        active_series.append({
            "member": m,
            "prod": prod_arr,
            "cons": cons_arr,
            # Accumulators
            "tot_prod": 0.0,
            "tot_cons": 0.0,
            "tot_self": 0.0,
            "tot_received": 0.0,
            "tot_shared_out": 0.0,
            "tot_grid_import": 0.0,
            "tot_grid_export": 0.0,
        })

    # Accumulators for 24-hour representative profile (sum per interval of day 0..95)
    rep_prod_24h = [0.0] * INTERVALS_PER_DAY
    rep_cons_24h = [0.0] * INTERVALS_PER_DAY
    rep_shared_24h = [0.0] * INTERVALS_PER_DAY
    rep_import_24h = [0.0] * INTERVALS_PER_DAY
    rep_export_24h = [0.0] * INTERVALS_PER_DAY

    # =========================================================================
    # SIMULARE PE INTERVALE DE 15 MINUTE
    # =========================================================================
    for t in range(total_intervals):
        tod = t % INTERVALS_PER_DAY  # Time of day (0..95)

        interval_surplus_total = 0.0
        interval_deficit_total = 0.0
        surplus_pool = []
        deficit_pool = []

        # Step 1: Compute self-consumption and surplus/deficit on interval t
        for entry in active_series:
            p_val = entry["prod"][t]
            c_val = entry["cons"][t]

            entry["tot_prod"] += p_val
            entry["tot_cons"] += c_val

            self_c = min(p_val, c_val)
            entry["tot_self"] += self_c

            surplus = max(0.0, p_val - c_val)
            deficit = max(0.0, c_val - p_val)

            interval_surplus_total += surplus
            interval_deficit_total += deficit

            if surplus > 1e-6:
                surplus_pool.append((entry, surplus))
            if deficit > 1e-6:
                deficit_pool.append((entry, deficit))

        # Step 2: Shared energy in interval t
        if interval_surplus_total > 1e-6 and interval_deficit_total > 1e-6:
            # 2a: Allocate received energy to deficit members
            if algorithm_type in ("anre_algorithm_b", "fixed_coefficients"):
                shared_in_interval = _interval_fixed_coefficients(deficit_pool, interval_surplus_total)
            elif algorithm_type == "equal_share":
                shared_in_interval = min(interval_surplus_total, interval_deficit_total)
                _interval_equal_sharing(deficit_pool, shared_in_interval)
            elif algorithm_type == "prosumer_priority":
                shared_in_interval = min(interval_surplus_total, interval_deficit_total)
                _interval_prosumer_priority(deficit_pool, shared_in_interval)
            else:
                # Default: anre_algorithm_a / proportional_consumption (Pro-Rata to deficit)
                shared_in_interval = min(interval_surplus_total, interval_deficit_total)
                _interval_proportional_sharing(deficit_pool, shared_in_interval, interval_deficit_total)

            # 2b: Allocate shared out energy proportionally to surplus providers
            for entry, surplus in surplus_pool:
                shared_out = shared_in_interval * (surplus / interval_surplus_total) if interval_surplus_total > 0 else 0.0
                entry["tot_shared_out"] += shared_out
                # Remaining surplus is exported to public grid
                grid_exp = surplus - shared_out
                entry["tot_grid_export"] += grid_exp

        else:
            shared_in_interval = 0.0
            # No sharing in this interval (e.g. at night when no solar production)
            for entry, surplus in surplus_pool:
                entry["tot_grid_export"] += surplus

        # 2c: For deficit members, any unsatisfied deficit is imported from public grid
        # Handled in the allocation helpers or here
        rep_shared_24h[tod] += shared_in_interval

    # Step 3: Compute final grid import for active members
    for entry in active_series:
        # Grid import = Total deficit - Total received
        tot_deficit = max(0.0, entry["tot_cons"] - entry["tot_self"])
        entry["tot_grid_import"] = max(0.0, tot_deficit - entry["tot_received"])

    # Aggregate 24h representative profile (average kW in each 15-min tick)
    daily_15min_profile = []
    for tod in range(INTERVALS_PER_DAY):
        hour = tod // 4
        minute = (tod % 4) * 15
        time_str = f"{hour:02d}:{minute:02d}"

        # Sum kWh across active members for this interval of day across all days
        interval_prod_kwh = sum(entry["prod"][d * INTERVALS_PER_DAY + tod] for entry in active_series for d in range(days_in_month))
        interval_cons_kwh = sum(entry["cons"][d * INTERVALS_PER_DAY + tod] for entry in active_series for d in range(days_in_month))
        interval_shared_kwh = rep_shared_24h[tod]

        # Average per day (kWh per 15 min), multiply by 4 to get average Power in kW
        avg_prod_kw = round((interval_prod_kwh / days_in_month) * 4.0, 2)
        avg_cons_kw = round((interval_cons_kwh / days_in_month) * 4.0, 2)
        avg_shared_kw = round((interval_shared_kwh / days_in_month) * 4.0, 2)
        avg_import_kw = max(0.0, round(avg_cons_kw - avg_shared_kw - min(avg_prod_kw, avg_cons_kw), 2))
        avg_export_kw = max(0.0, round(avg_prod_kw - avg_shared_kw - min(avg_prod_kw, avg_cons_kw), 2))

        daily_15min_profile.append({
            "interval_index": tod,
            "time": time_str,
            "production_kw": avg_prod_kw,
            "consumption_kw": avg_cons_kw,
            "shared_kw": avg_shared_kw,
            "grid_import_kw": avg_import_kw,
            "grid_export_kw": avg_export_kw
        })

    # =========================================================================
    # REZULTATE FINANCIARE ȘI CENTRALIZARE
    # =========================================================================
    members_results = []
    total_production = 0.0
    total_consumption = 0.0
    total_shared = 0.0
    total_grid_import = 0.0
    total_grid_export = 0.0
    total_savings = 0.0

    # Process active members
    for entry in active_series:
        m = entry["member"]
        prod = round(entry["tot_prod"], 2)
        cons = round(entry["tot_cons"], 2)
        self_c = round(entry["tot_self"], 2)
        received = round(entry["tot_received"], 2)
        shared_out = round(entry["tot_shared_out"], 2)
        grid_imp = round(entry["tot_grid_import"], 2)
        grid_exp = round(entry["tot_grid_export"], 2)

        total_production += prod
        total_consumption += cons
        total_shared += received
        total_grid_import += grid_imp
        total_grid_export += grid_exp

        green_consumed = round(self_c + received, 2)
        coverage_pct = 100.0 if cons <= 0 else min(100.0, round((green_consumed / cons) * 100.0, 1))

        # Financial balance
        baseline_cost = round(cons * grid_tariff, 2)
        cost_community = round(received * internal_tariff, 2)
        cost_grid = round(grid_imp * grid_tariff, 2)
        income_community = round(shared_out * internal_tariff, 2)
        income_export = round(grid_exp * export_tariff, 2)

        actual_net_cost = round((cost_community + cost_grid) - (income_community + income_export), 2)
        savings = round(baseline_cost - actual_net_cost, 2)
        total_savings += savings

        period_desc = _format_membership_period(m)

        members_results.append({
            "member_id": m.get("member_id"),
            "name": m.get("name"),
            "code_pod": m.get("code_pod", ""),
            "member_type": m.get("member_type"),
            "is_active": True,
            "active_status_label": "Activ",
            "membership_period": period_desc,
            "production_kwh": prod,
            "consumption_kwh": cons,
            "self_consumed_kwh": self_c,
            "energy_received_kwh": received,
            "energy_shared_out_kwh": shared_out,
            "grid_import_kwh": grid_imp,
            "grid_export_kwh": grid_exp,
            "coverage_rate_pct": coverage_pct,
            "baseline_cost_ron": baseline_cost,
            "actual_net_cost_ron": actual_net_cost,
            "savings_ron": savings,
        })

    # Add inactive members with 0 values and clear inactive status
    for m in inactive_members:
        period_desc = _format_membership_period(m)
        members_results.append({
            "member_id": m.get("member_id"),
            "name": m.get("name"),
            "code_pod": m.get("code_pod", ""),
            "member_type": m.get("member_type"),
            "is_active": False,
            "active_status_label": "Inactiv în această lună",
            "membership_period": period_desc,
            "production_kwh": 0.0,
            "consumption_kwh": 0.0,
            "self_consumed_kwh": 0.0,
            "energy_received_kwh": 0.0,
            "energy_shared_out_kwh": 0.0,
            "grid_import_kwh": 0.0,
            "grid_export_kwh": 0.0,
            "coverage_rate_pct": 0.0,
            "baseline_cost_ron": 0.0,
            "actual_net_cost_ron": 0.0,
            "savings_ron": 0.0,
        })

    # Calculate production sharing efficiency percentage
    shared_from_production_pct = 0.0
    if total_production > 0:
        shared_from_production_pct = min(100.0, round((total_shared / total_production) * 100.0, 1))

    # Add member percentage metrics of total production and shared energy
    for r in members_results:
        rec = r.get("energy_received_kwh", 0.0)
        r["share_of_production_pct"] = round((rec / total_production) * 100.0, 1) if total_production > 0 else 0.0
        r["share_of_shared_pct"] = round((rec / total_shared) * 100.0, 1) if total_shared > 0 else 0.0

    total_surplus = round(sum(r["energy_shared_out_kwh"] + r["grid_export_kwh"] for r in members_results if r["is_active"]), 2)
    total_deficit = round(sum(r["energy_received_kwh"] + r["grid_import_kwh"] for r in members_results if r["is_active"]), 2)
    self_sufficiency = 0.0
    if total_consumption > 0:
        total_green = sum(r["self_consumed_kwh"] + r["energy_received_kwh"] for r in members_results if r["is_active"])
        self_sufficiency = min(100.0, round((total_green / total_consumption) * 100.0, 1))

    return {
        "algorithm_type": algorithm_type,
        "algorithm_name_ro": get_algorithm_label(algorithm_type),
        "calculation_resolution": "Intervale de 15 minute (96 intervale/zi)",
        "active_members_count": len(active_members),
        "total_members_count": len(members_data),
        "total_production_kwh": round(total_production, 2),
        "total_consumption_kwh": round(total_consumption, 2),
        "total_surplus_kwh": total_surplus,
        "total_deficit_kwh": total_deficit,
        "total_shared_kwh": round(total_shared, 2),
        "shared_from_production_pct": shared_from_production_pct,
        "total_grid_import_kwh": round(total_grid_import, 2),
        "total_grid_export_kwh": round(total_grid_export, 2),
        "self_sufficiency_rate_pct": self_sufficiency,
        "total_savings_ron": round(total_savings, 2),
        "co2_saved_kg": round(total_shared * 0.42, 2),
        "internal_tariff": internal_tariff,
        "grid_tariff": grid_tariff,
        "export_tariff": export_tariff,
        "members_results": members_results,
        "daily_15min_profile": daily_15min_profile,
    }


def _format_membership_period(m: Dict[str, Any]) -> str:
    s_yr = m.get("start_year", 2025)
    s_mo = m.get("start_month", 1)
    e_yr = m.get("end_year")
    e_mo = m.get("end_month")

    start_str = f"{s_mo:02d}/{s_yr}"
    if e_yr and e_mo:
        return f"{start_str} – {e_mo:02d}/{e_yr}"
    return f"{start_str} – Prezent"


# =============================================================================
# HELPER FUNCTIONS PENTRU ALOCARE PE INTERVALUL t
# =============================================================================

def _interval_proportional_sharing(
    deficit_pool: List[Tuple[Any, float]],
    shared_amount: float,
    total_deficit: float
):
    """Alocare Pro-Rata pe intervalul de 15 minute."""
    if total_deficit <= 0 or shared_amount <= 0:
        return
    for entry, deficit in deficit_pool:
        ratio = deficit / total_deficit
        grant = min(deficit, shared_amount * ratio)
        entry["tot_received"] += grant


def _interval_equal_sharing(
    deficit_pool: List[Tuple[Any, float]],
    shared_amount: float
):
    """Partajare egalitară iterativă pe intervalul de 15 minute."""
    if not deficit_pool or shared_amount <= 0:
        return
    remaining = shared_amount
    active_pool = list(deficit_pool)

    while remaining > 1e-5 and active_pool:
        quota = remaining / len(active_pool)
        newly_full = []
        for entry, deficit in active_pool:
            grant = min(deficit, quota)
            entry["tot_received"] += grant
            remaining -= grant
            if grant >= deficit - 1e-5:
                newly_full.append((entry, deficit))
        if not newly_full:
            break
        for item in newly_full:
            active_pool.remove(item)


def _interval_prosumer_priority(
    deficit_pool: List[Tuple[Any, float]],
    shared_amount: float
):
    """Prioritate prosumatori pe intervalul de 15 minute."""
    if not deficit_pool or shared_amount <= 0:
        return
    # Phase 1: Prosumers
    prosumers = [(e, d) for e, d in deficit_pool if e["member"].get("member_type") == "prosumator"]
    sum_pros = sum(d for _, d in prosumers)
    remaining = shared_amount

    if sum_pros > 0 and remaining > 0:
        for entry, deficit in prosumers:
            grant = min(deficit, remaining * (deficit / sum_pros))
            entry["tot_received"] += grant
        remaining = max(0.0, remaining - sum(min(d, remaining * (d / sum_pros)) for _, d in prosumers))

    # Phase 2: Other members (consumers and BESS storage)
    if remaining > 1e-5:
        others = [(e, d) for e, d in deficit_pool if e["member"].get("member_type") != "prosumator"]
        sum_others = sum(d for _, d in others)
        if sum_others > 0:
            for entry, deficit in others:
                grant = min(deficit, remaining * (deficit / sum_others))
                entry["tot_received"] += grant


def _interval_fixed_coefficients(
    deficit_pool: List[Tuple[Any, float]],
    interval_surplus_total: float
) -> float:
    """
    Algoritmul de Alocare B (ANRE) — în procent fix pe fiecare interval de decontare.
    Fiecare loc de consum primește cota sa fixă stabilită din surplusul produs în interval:
    grant = min(deficit, interval_surplus * (share / 100.0)).
    Dacă consumul (deficitul) unui membru este mai mic decât cota sa alocată, surplusul neutilizat
    nu se redistribuie, ci rămâne ca energie injectată în rețeaua publică (export).
    """
    if not deficit_pool or interval_surplus_total <= 0:
        return 0.0

    sum_shares = sum(float(e["member"].get("share_percentage", 0.0)) for e, _ in deficit_pool)
    total_granted = 0.0

    if sum_shares <= 0:
        # Fallback dacă nu sunt setate cote procentuale: distribuire în cote egale
        equal_pct = 100.0 / len(deficit_pool)
        for entry, deficit in deficit_pool:
            quota = interval_surplus_total * (equal_pct / 100.0)
            grant = min(deficit, quota)
            entry["tot_received"] += grant
            total_granted += grant
        return total_granted

    for entry, deficit in deficit_pool:
        share = float(entry["member"].get("share_percentage", 0.0))
        quota = interval_surplus_total * (share / 100.0)
        grant = min(deficit, quota)
        entry["tot_received"] += grant
        total_granted += grant

    return total_granted
