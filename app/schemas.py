from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, model_validator


# =====================================================================
# DISTRIBUTION ZONES SCHEMAS
# =====================================================================

class DistributionZoneResponse(BaseModel):
    id: str
    operator: str
    name: str
    counties: List[str]
    region_label: str


# =====================================================================
# ENERGY COMMUNITIES & ANRE REGISTRY SCHEMAS
# =====================================================================

class EnergyCommunityBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    code: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    location: str = Field("România", max_length=150)

    # Zona de Distribuție (una din cele 8 din România)
    distribution_zone: str = Field(
        "deer_transilvania_nord",
        max_length=80,
        description="Zona de distribuție oficială din România (una din cele 8)"
    )

    # ANRE Community Registry Status:
    # grup_initiativa, cerere_trimisa, cerere_in_lucru, inregistrare_admisa, inregistrare_respinsa
    anre_status: str = Field(
        "grup_initiativa",
        pattern="^(grup_initiativa|cerere_trimisa|cerere_in_lucru|inregistrare_admisa|inregistrare_respinsa)$",
        description="Stadiul înregistrării la ANRE în registrul comunităților de energie"
    )
    anre_registration_number: Optional[str] = Field(
        None,
        max_length=100,
        description="Numărul de înregistrare acordat de ANRE (completat când înregistrarea este admisă)"
    )

    # Tariffs in RON/kWh
    internal_tariff: float = Field(0.65, gt=0, description="Tarif partajare intern în RON/kWh")
    grid_tariff: float = Field(1.30, gt=0, description="Tarif de rețea referință în RON/kWh")
    export_tariff: float = Field(0.35, ge=0, description="Tarif injecție excedent în rețea RON/kWh")
    default_algorithm: str = Field(
        "anre_algorithm_a",
        pattern="^(anre_algorithm_a|anre_algorithm_b|proportional_consumption|fixed_coefficients|equal_share|prosumer_priority)$",
        description="Algoritm de alocare ANRE: anre_algorithm_a (Proporțional cu consumul) sau anre_algorithm_b (Procent fix)"
    )


class EnergyCommunityCreate(EnergyCommunityBase):
    pass


class EnergyCommunityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    distribution_zone: Optional[str] = None
    anre_status: Optional[str] = Field(
        None,
        pattern="^(grup_initiativa|cerere_trimisa|cerere_in_lucru|inregistrare_admisa|inregistrare_respinsa)$"
    )
    anre_registration_number: Optional[str] = None
    internal_tariff: Optional[float] = None
    grid_tariff: Optional[float] = None
    export_tariff: Optional[float] = None
    default_algorithm: Optional[str] = None


# =====================================================================
# COMMUNITY MEMBERS (4 TYPES) SCHEMAS: PRODUCER, PROSUMER, CONSUMER, STORAGE (BESS)
# =====================================================================

class CommunityMemberBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    code_pod: str = Field(..., min_length=3, max_length=50, description="Cod POD / Punct de delimitare")
    member_type: str = Field(
        ...,
        pattern="^(sistem_productie|prosumator|consumator|stocare_bess|bess)$",
        description="Tip membru: sistem_productie (doar producție), prosumator (producție și consum), consumator (doar consum), stocare_bess (sistem de stocare BESS)"
    )
    address: Optional[str] = None
    installed_capacity_kw: float = Field(default=0.0, ge=0, description="Capacitate instalată kWp / Putere invertor/baterie kW")
    contracted_power_kw: float = Field(default=5.0, ge=0, description="Putere contractată consum / încărcare kW")
    share_percentage: float = Field(default=0.0, ge=0, le=100, description="Cotă fixă de participare %")
    notes: Optional[str] = None

    # Perioada de apartenență (luna/an intrare și opțional ieșire)
    start_year: int = Field(default=2025, ge=2000, le=2050, description="Anul intrării în comunitate")
    start_month: int = Field(default=1, ge=1, le=12, description="Luna intrării în comunitate (1-12)")
    end_year: Optional[int] = Field(default=None, ge=2000, le=2050, description="Anul ieșirii din comunitate (None dacă este activ)")
    end_month: Optional[int] = Field(default=None, ge=1, le=12, description="Luna ieșirii din comunitate (None dacă este activ)")

    @model_validator(mode="after")
    def validate_share_percentage(self):
        if self.member_type in ("sistem_productie", "stocare_bess", "bess"):
            if self.share_percentage > 0.0:
                raise ValueError("Instalațiile de producție și de stocare (BESS) nu pot avea alocat un procent de consum. Cota trebuie să fie 0%.")
            self.share_percentage = 0.0
        return self


class CommunityMemberCreate(CommunityMemberBase):
    community_id: int


class CommunityMemberUpdate(BaseModel):
    name: Optional[str] = None
    code_pod: Optional[str] = None
    member_type: Optional[str] = Field(None, pattern="^(sistem_productie|prosumator|consumator|stocare_bess|bess)$")
    address: Optional[str] = None
    installed_capacity_kw: Optional[float] = None
    contracted_power_kw: Optional[float] = None
    share_percentage: Optional[float] = None
    notes: Optional[str] = None
    start_year: Optional[int] = None
    start_month: Optional[int] = None
    end_year: Optional[int] = None
    end_month: Optional[int] = None

    @model_validator(mode="after")
    def validate_update_share_percentage(self):
        if self.member_type in ("sistem_productie", "stocare_bess", "bess"):
            if self.share_percentage is not None and self.share_percentage > 0.0:
                raise ValueError("Instalațiile de producție și de stocare (BESS) nu pot avea alocat un procent de consum. Cota trebuie să fie 0%.")
            if self.share_percentage is not None:
                self.share_percentage = 0.0
        return self


class CommunityMemberResponse(CommunityMemberBase):
    id: int
    community_id: int
    created_at: datetime
    is_active_now: Optional[bool] = True
    model_config = ConfigDict(from_attributes=True)


class EnergyCommunityResponse(EnergyCommunityBase):
    id: int
    created_at: datetime
    zone_details: Optional[Dict[str, Any]] = None
    members_count: Optional[int] = 0
    production_systems_count: Optional[int] = 0
    prosumers_count: Optional[int] = 0
    consumers_count: Optional[int] = 0
    storage_systems_count: Optional[int] = 0
    total_capacity_kwp: Optional[float] = 0.0
    total_allocated_share_pct: Optional[float] = 0.0
    remaining_share_pct: Optional[float] = 100.0
    members: Optional[List[CommunityMemberResponse]] = []
    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# MONTHLY DATA & CURVE UPLOAD SCHEMAS
# =====================================================================

class MonthlyEnergyDataBase(BaseModel):
    year: int = Field(..., ge=2020, le=2050)
    month: int = Field(..., ge=1, le=12)
    production_kwh: float = Field(default=0.0, ge=0)
    consumption_kwh: float = Field(default=0.0, ge=0)
    curve_source: Optional[str] = None
    notes: Optional[str] = None


class MonthlyEnergyDataCreate(MonthlyEnergyDataBase):
    community_id: int
    member_id: int


class MonthlyEnergyDataResponse(MonthlyEnergyDataBase):
    id: int
    community_id: int
    member_id: int
    member_name: Optional[str] = None
    member_type: Optional[str] = None
    code_pod: Optional[str] = None
    has_hourly_curve: Optional[bool] = False
    model_config = ConfigDict(from_attributes=True)


class BulkMonthlyGenerateRequest(BaseModel):
    year: int = Field(2026, ge=2020, le=2050)


class FileUploadResponse(BaseModel):
    status: str
    message: str
    filename: str
    community_id: int
    rows_imported: int
    members_updated: int
    years_detected: List[int]
    months_detected: List[int]
    warnings: List[str] = []


# =====================================================================
# SHARING ALGORITHM SCHEMAS
# =====================================================================

class RunSharingAlgorithmRequest(BaseModel):
    algorithm_type: Optional[str] = None
    year: int = Field(2026, ge=2020, le=2050)
    month: int = Field(0, ge=0, le=12, description="0 pentru tot anul (cumulat), 1-12 pentru lună specifică")
    save_run: bool = Field(default=True, description="Salvează rezultatul rulării în baza de date")


class MemberSharingResult(BaseModel):
    member_id: int
    name: str
    code_pod: str
    member_type: str
    is_active: bool = True
    active_status_label: Optional[str] = "Activ"
    membership_period: Optional[str] = None
    production_kwh: float
    consumption_kwh: float
    self_consumed_kwh: float
    energy_received_kwh: float
    energy_shared_out_kwh: float
    grid_import_kwh: float
    grid_export_kwh: float
    coverage_rate_pct: float
    share_of_production_pct: Optional[float] = 0.0
    share_of_shared_pct: Optional[float] = 0.0
    baseline_cost_ron: float
    actual_net_cost_ron: float
    savings_ron: float


class CommunitySharingRunResponse(BaseModel):
    id: Optional[int] = None
    community_id: int
    community_name: str
    distribution_zone: Optional[str] = None
    distribution_zone_name: Optional[str] = None
    distribution_operator: Optional[str] = None
    year: int
    month: int
    algorithm_type: str
    algorithm_name_ro: str
    active_members_count: int = 0
    total_members_count: int = 0
    calculation_resolution: str = "Intervale de 15 minute (96/zi)"
    total_production_kwh: float
    total_consumption_kwh: float
    total_surplus_kwh: float
    total_deficit_kwh: float
    total_shared_kwh: float
    shared_from_production_pct: Optional[float] = 0.0
    total_grid_import_kwh: float
    total_grid_export_kwh: float
    self_sufficiency_rate_pct: float
    total_savings_ron: float
    co2_saved_kg: float
    internal_tariff: float
    grid_tariff: float
    export_tariff: float
    members_results: List[MemberSharingResult]
    daily_15min_profile: Optional[List[Dict[str, Any]]] = None
