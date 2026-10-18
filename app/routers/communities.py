import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud
from app.schemas import (
    DistributionZoneResponse,
    EnergyCommunityResponse,
    EnergyCommunityCreate,
    EnergyCommunityUpdate,
    CommunityMemberBase,
    CommunityMemberResponse,
    CommunityMemberCreate,
    CommunityMemberUpdate,
    MonthlyEnergyDataBase,
    MonthlyEnergyDataResponse,
    MonthlyEnergyDataCreate,
    BulkMonthlyGenerateRequest,
    FileUploadResponse,
    RunSharingAlgorithmRequest,
    CommunitySharingRunResponse
)

router = APIRouter(prefix="/api/communities", tags=["Comunități de Energie & Algoritmi"])


def enrich_community(comm) -> EnergyCommunityResponse:
    members = comm.members or []
    prod_sys = sum(1 for m in members if m.member_type == "sistem_productie")
    prosumers = sum(1 for m in members if m.member_type == "prosumator")
    consumers = sum(1 for m in members if m.member_type == "consumator")
    storage_sys = sum(1 for m in members if m.member_type in ("stocare_bess", "bess"))
    total_cap = sum(m.installed_capacity_kw or 0.0 for m in members)
    total_shares = sum(m.share_percentage or 0.0 for m in members if m.member_type in ("prosumator", "consumator"))

    return EnergyCommunityResponse(
        id=comm.id,
        name=comm.name,
        code=comm.code,
        description=comm.description,
        location=comm.location,
        distribution_zone=comm.distribution_zone,
        zone_details=comm.zone_details,
        anre_status=comm.anre_status,
        anre_registration_number=comm.anre_registration_number,
        internal_tariff=comm.internal_tariff,
        grid_tariff=comm.grid_tariff,
        export_tariff=comm.export_tariff,
        default_algorithm=comm.default_algorithm,
        created_at=comm.created_at,
        members_count=len(members),
        production_systems_count=prod_sys,
        prosumers_count=prosumers,
        consumers_count=consumers,
        storage_systems_count=storage_sys,
        total_capacity_kwp=round(total_cap, 2),
        total_allocated_share_pct=round(total_shares, 2),
        remaining_share_pct=round(max(0.0, 100.0 - total_shares), 2),
        members=[CommunityMemberResponse.model_validate(m) for m in members]
    )


# --------------------- DISTRIBUTION ZONES ---------------------
@router.get("/distribution-zones", response_model=List[DistributionZoneResponse])
def list_distribution_zones():
    """List the 8 official Romanian electricity distribution zones and operators."""
    return crud.get_distribution_zones()


# --------------------- COMMUNITIES CRUD ---------------------
@router.get("", response_model=List[EnergyCommunityResponse])
def list_communities(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all energy communities with ANRE status, member breakdowns, and capacities."""
    comms = crud.get_communities(db, skip=skip, limit=limit)
    return [enrich_community(c) for c in comms]


@router.post("", response_model=EnergyCommunityResponse, status_code=status.HTTP_201_CREATED)
def create_community(comm_in: EnergyCommunityCreate, db: Session = Depends(get_db)):
    """Create a new energy community with ANRE status tracking."""
    existing = crud.get_community_by_code(db, comm_in.code)
    if existing:
        raise HTTPException(status_code=400, detail="O comunitate cu acest cod există deja.")
    comm = crud.create_community(db, comm_in)
    return enrich_community(comm)


@router.get("/{community_id}", response_model=EnergyCommunityResponse)
def get_community(community_id: int, db: Session = Depends(get_db)):
    """Get single community details, ANRE status, and all its members."""
    comm = crud.get_community(db, community_id)
    if not comm:
        raise HTTPException(status_code=404, detail="Comunitatea nu a fost găsită.")
    return enrich_community(comm)


@router.put("/{community_id}", response_model=EnergyCommunityResponse)
def update_community(community_id: int, update_in: EnergyCommunityUpdate, db: Session = Depends(get_db)):
    """Update community parameters (name, ANRE status, ANRE registration number, tariffs, algorithm)."""
    comm = crud.update_community(db, community_id, update_in)
    if not comm:
        raise HTTPException(status_code=404, detail="Comunitatea nu a fost găsită.")
    return enrich_community(comm)


@router.delete("/{community_id}")
def delete_community(community_id: int, db: Session = Depends(get_db)):
    """Delete an energy community and all associated members and data."""
    ok = crud.delete_community(db, community_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Comunitatea nu a fost găsită.")
    return {"status": "success", "message": "Comunitatea a fost ștearsă cu succes."}


# --------------------- MEMBERS MANAGEMENT ---------------------
@router.get("/{community_id}/members", response_model=List[CommunityMemberResponse])
def get_members(community_id: int, db: Session = Depends(get_db)):
    """List all production systems, prosumers, and consumers in a community."""
    comm = crud.get_community(db, community_id)
    if not comm:
        raise HTTPException(status_code=404, detail="Comunitatea nu a fost găsită.")
    return crud.get_community_members(db, community_id)


@router.post("/{community_id}/members", response_model=CommunityMemberResponse, status_code=status.HTTP_201_CREATED)
def add_member_to_community(community_id: int, member_in: CommunityMemberBase, db: Session = Depends(get_db)):
    """
    Add a new member to the community.
    Types allowed: 'sistem_productie' (only production), 'prosumator' (prod + cons), 'consumator' (only consumption).
    """
    comm = crud.get_community(db, community_id)
    if not comm:
        raise HTTPException(status_code=404, detail="Comunitatea nu a fost găsită.")

    create_data = CommunityMemberCreate(
        community_id=community_id,
        **member_in.model_dump()
    )
    try:
        return crud.create_community_member(db, create_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/members/{member_id}", response_model=CommunityMemberResponse)
def update_member(member_id: int, update_in: CommunityMemberUpdate, db: Session = Depends(get_db)):
    """Update member details (capacity, contracted power, share %, etc.)."""
    try:
        member = crud.update_community_member(db, member_id, update_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not member:
        raise HTTPException(status_code=404, detail="Membrul nu a fost găsit.")
    return member


@router.delete("/members/{member_id}")
def delete_member_from_community(member_id: int, db: Session = Depends(get_db)):
    """Remove a production or consumption site from the energy community."""
    ok = crud.delete_community_member(db, member_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Membrul nu a fost găsit.")
    return {"status": "success", "message": "Punctul de producție/consum a fost șters din comunitate."}


# --------------------- MONTHLY DATA & CURVE UPLOAD ---------------------
@router.get("/{community_id}/monthly-data", response_model=List[MonthlyEnergyDataResponse])
def get_monthly_data(
    community_id: int,
    year: Optional[int] = Query(2026),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieve monthly production and consumption records for community members."""
    comm = crud.get_community(db, community_id)
    if not comm:
        raise HTTPException(status_code=404, detail="Comunitatea nu a fost găsită.")

    data_rows = crud.get_monthly_energy_data(db, community_id, year=year, month=month)
    results = []
    for r in data_rows:
        m = r.member
        results.append(MonthlyEnergyDataResponse(
            id=r.id,
            community_id=r.community_id,
            member_id=r.member_id,
            member_name=m.name if m else "Membru",
            member_type=m.member_type if m else "prosumator",
            code_pod=m.code_pod if m else "",
            year=r.year,
            month=r.month,
            production_kwh=r.production_kwh,
            consumption_kwh=r.consumption_kwh,
            curve_source=r.curve_source,
            has_hourly_curve=bool(r.hourly_curve_json),
            notes=r.notes
        ))
    return results


@router.post("/{community_id}/monthly-data", response_model=MonthlyEnergyDataResponse)
def upsert_monthly_reading(community_id: int, payload: MonthlyEnergyDataBase, member_id: int = Query(...), db: Session = Depends(get_db)):
    """Create or update monthly production/consumption for a specific member."""
    comm = crud.get_community(db, community_id)
    if not comm:
        raise HTTPException(status_code=404, detail="Comunitatea nu a fost găsită.")

    create_data = MonthlyEnergyDataCreate(
        community_id=community_id,
        member_id=member_id,
        year=payload.year,
        month=payload.month,
        production_kwh=payload.production_kwh,
        consumption_kwh=payload.consumption_kwh,
        curve_source=payload.curve_source,
        notes=payload.notes
    )
    row = crud.upsert_monthly_data(db, create_data)
    m = row.member
    return MonthlyEnergyDataResponse(
        id=row.id,
        community_id=row.community_id,
        member_id=row.member_id,
        member_name=m.name if m else "Membru",
        member_type=m.member_type if m else "prosumator",
        code_pod=m.code_pod if m else "",
        year=row.year,
        month=row.month,
        production_kwh=row.production_kwh,
        consumption_kwh=row.consumption_kwh,
        curve_source=row.curve_source,
        has_hourly_curve=bool(row.hourly_curve_json),
        notes=row.notes
    )


@router.post("/{community_id}/upload-curves", response_model=FileUploadResponse)
async def upload_curves_file(
    community_id: int,
    file: UploadFile = File(...),
    year: Optional[int] = Form(None),
    month: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Încarcă un fișier CSV cu curbele de producție și/sau consum ale membrilor comunității.
    Poate fi specificat opțional anul și luna țintă pentru alocare.
    """
    comm = crud.get_community(db, community_id)
    if not comm:
        raise HTTPException(status_code=404, detail="Comunitatea nu a fost găsită.")

    try:
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8-sig", errors="replace")
        res = crud.import_curves_from_csv(
            db=db,
            community_id=community_id,
            file_content_str=content_str,
            filename=file.filename or "curbe_importate.csv",
            selected_year=year,
            selected_month=month
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare la procesarea fișierului: {str(e)}")


@router.get("/{community_id}/export-curves")
def download_saved_curves(
    community_id: int,
    year: int = Query(2026),
    month: int = Query(7),
    db: Session = Depends(get_db)
):
    """
    Descarcă curbele de producție și consum înregistrate anterior pentru comunitate (format matriceal 15 min).
    """
    comm = crud.get_community(db, community_id)
    if not comm:
        raise HTTPException(status_code=404, detail="Comunitatea nu a fost găsită.")

    try:
        csv_text = crud.export_saved_curves(db, community_id, year=year, month=month)
        filename = f"curbe_inregistrate_{comm.code}_{year}_{month:02d}.csv"
        return Response(
            content=csv_text,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare la exportul curbelor: {str(e)}")


@router.get("/{community_id}/template-csv")
def download_template_csv(
    community_id: int,
    year: int = Query(2026),
    month: int = Query(7),
    db: Session = Depends(get_db)
):
    """Descarcă un șablon CSV lunar pe intervale de 15 minute (format matriceal cu toți membrii/POD-urile)."""
    comm = crud.get_community(db, community_id)
    if not comm:
        raise HTTPException(status_code=404, detail="Comunitatea nu a fost găsită.")

    csv_text = crud.generate_csv_template(db, community_id, year=year, month=month)
    filename = f"sablon_curbe_15min_{comm.code}_{year}_{month:02d}.csv"
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/{community_id}/generate-monthly-data")
def generate_monthly_demo_data(community_id: int, payload: BulkMonthlyGenerateRequest, db: Session = Depends(get_db)):
    """Generează automat date simulate pe 12 luni pe baza curbelor sezoniere fotovoltaice."""
    comm = crud.get_community(db, community_id)
    if not comm:
        raise HTTPException(status_code=404, detail="Comunitatea nu a fost găsită.")

    crud.generate_realistic_monthly_data(db, community_id, year=payload.year)
    return {"status": "success", "message": f"Datele lunare pentru anul {payload.year} au fost generate cu succes."}


# --------------------- ALGORITHM EXECUTION ---------------------
@router.post("/{community_id}/run-sharing", response_model=CommunitySharingRunResponse)
def execute_sharing(
    community_id: int,
    payload: RunSharingAlgorithmRequest,
    db: Session = Depends(get_db)
):
    """
    Rulează algoritmul de partajare a energiei pentru o comunitate pe baza curbelor de producție & consum.
    Algoritmi disponibili:
    - proportional_consumption: Pro-Rata la deficitul de consum
    - equal_share: Cote egale redistribuite iterativ
    - prosumer_priority: Prioritate prosumatori, apoi consumatori
    - fixed_coefficients: Coeficienți procentuali de participare
    """
    try:
        res = crud.run_community_sharing_algorithm(
            db=db,
            community_id=community_id,
            year=payload.year,
            month=payload.month,
            algorithm_type=payload.algorithm_type,
            save_run=payload.save_run
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
