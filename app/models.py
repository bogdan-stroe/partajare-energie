from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


# =====================================================================
# CELE 8 ZONE DE DISTRIBUȚIE ȘI OPERATORII DIN ROMÂNIA
# =====================================================================
DISTRIBUTION_ZONES: List[Dict[str, Any]] = [
    {
        "id": "retele_electrice_muntenia",
        "operator": "Rețele Electrice (fostul Grup Enel)",
        "name": "Rețele Electrice Muntenia",
        "counties": ["București", "Ilfov", "Giurgiu"],
        "region_label": "București, Ilfov, Giurgiu"
    },
    {
        "id": "retele_electrice_banat",
        "operator": "Rețele Electrice (fostul Grup Enel)",
        "name": "Rețele Electrice Banat",
        "counties": ["Timiș", "Arad", "Hunedoara", "Caraș-Severin"],
        "region_label": "Timiș, Arad, Hunedoara, Caraș-Severin"
    },
    {
        "id": "retele_electrice_dobrogea",
        "operator": "Rețele Electrice (fostul Grup Enel)",
        "name": "Rețele Electrice Dobrogea",
        "counties": ["Constanța", "Tulcea", "Călărași", "Ialomița"],
        "region_label": "Constanța, Tulcea, Călărași, Ialomița"
    },
    {
        "id": "deer_transilvania_nord",
        "operator": "DEER (Distribuție Energie Electrică România) – Grupul Electrica",
        "name": "DEER Transilvania Nord",
        "counties": ["Cluj", "Bihor", "Maramureș", "Satu Mare", "Bistrița-Năsăud", "Sălaj"],
        "region_label": "Cluj, Bihor, Maramureș, Satu Mare, Bistrița-Năsăud, Sălaj"
    },
    {
        "id": "deer_transilvania_sud",
        "operator": "DEER (Distribuție Energie Electrică România) – Grupul Electrica",
        "name": "DEER Transilvania Sud",
        "counties": ["Alba", "Brașov", "Covasna", "Harghita", "Mureș", "Sibiu"],
        "region_label": "Alba, Brașov, Covasna, Harghita, Mureș, Sibiu"
    },
    {
        "id": "deer_muntenia_nord",
        "operator": "DEER (Distribuție Energie Electrică România) – Grupul Electrica",
        "name": "DEER Muntenia Nord",
        "counties": ["Brăila", "Buzău", "Dâmbovița", "Galați", "Prahova", "Vrancea"],
        "region_label": "Brăila, Buzău, Dâmbovița, Galați, Prahova, Vrancea"
    },
    {
        "id": "delgaz_grid_nord_est",
        "operator": "Delgaz Grid (Grupul E.ON)",
        "name": "Delgaz Grid (Regiunea Nord-Est)",
        "counties": ["Suceava", "Botoșani", "Neamț", "Iași", "Bacău", "Vaslui"],
        "region_label": "Suceava, Botoșani, Neamț, Iași, Bacău, Vaslui"
    },
    {
        "id": "distributie_oltenia",
        "operator": "Distribuție Oltenia (Grupul E-Distribuție / Evryo / Oltenia)",
        "name": "Distribuție Oltenia",
        "counties": ["Dolj", "Argeș", "Olt", "Gorj", "Vâlcea", "Mehedinți", "Teleorman"],
        "region_label": "Dolj, Argeș, Olt, Gorj, Vâlcea, Mehedinți, Teleorman"
    }
]

DISTRIBUTION_ZONES_MAP: Dict[str, Dict[str, Any]] = {z["id"]: z for z in DISTRIBUTION_ZONES}


class EnergyCommunity(Base):
    __tablename__ = "energy_communities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(150), default="România")

    # Zona de Distribuție (una din cele 8 din România)
    distribution_zone = Column(String(80), default="deer_transilvania_nord", nullable=False)

    # ANRE Community Registry Status:
    # grup_initiativa, cerere_trimisa, cerere_in_lucru, inregistrare_admisa, inregistrare_respinsa
    anre_status = Column(String(50), default="grup_initiativa", nullable=False)
    anre_registration_number = Column(String(100), nullable=True)  # Filled when inregistrare_admisa

    # Financial tariffs
    internal_tariff = Column(Float, default=0.65)  # RON per kWh (sharing rate)
    grid_tariff = Column(Float, default=1.30)      # RON per kWh (reference grid rate)
    export_tariff = Column(Float, default=0.35)    # RON per kWh (grid feed-in compensation)
    default_algorithm = Column(String(50), default="proportional_consumption")
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    members = relationship("CommunityMember", back_populates="community", cascade="all, delete-orphan")
    monthly_data = relationship("MonthlyEnergyData", back_populates="community", cascade="all, delete-orphan")
    sharing_runs = relationship("SharingRun", back_populates="community", cascade="all, delete-orphan")

    @property
    def zone_details(self) -> Dict[str, Any]:
        return DISTRIBUTION_ZONES_MAP.get(
            self.distribution_zone,
            {
                "id": self.distribution_zone,
                "operator": "Operator Distribuție",
                "name": self.distribution_zone,
                "counties": [],
                "region_label": ""
            }
        )


class CommunityMember(Base):
    __tablename__ = "community_members"

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("energy_communities.id"), nullable=False)
    name = Column(String(120), nullable=False)
    code_pod = Column(String(50), nullable=False)  # Cod POD / Loc de Consum/Producție

    # Three member types as specified:
    # 1. sistem_productie (pure production, consumption is 0)
    # 2. prosumator (both production and consumption)
    # 3. consumator (pure consumption, production is 0)
    member_type = Column(String(50), nullable=False)
    address = Column(String(200), nullable=True)
    installed_capacity_kw = Column(Float, default=0.0)  # kWp for production/prosumer
    contracted_power_kw = Column(Float, default=5.0)     # kW for consumption/prosumer
    share_percentage = Column(Float, default=0.0)       # % participation / investment ratio
    notes = Column(Text, nullable=True)

    # Perioada de apartenență la comunitate (luna/an intrare și opțional ieșire)
    start_year = Column(Integer, default=2025, nullable=False)
    start_month = Column(Integer, default=1, nullable=False)  # 1-12
    end_year = Column(Integer, nullable=True)                # None dacă este activ în prezent
    end_month = Column(Integer, nullable=True)               # None dacă este activ în prezent

    created_at = Column(DateTime, default=utcnow)

    # Relationships
    community = relationship("EnergyCommunity", back_populates="members")
    monthly_data = relationship("MonthlyEnergyData", back_populates="member", cascade="all, delete-orphan")

    def is_active_in(self, year: int, month: int) -> bool:
        """
        Determină dacă membrul este activ în luna/anul specificat.
        Dacă month == 0 (an complet), verifică dacă a fost activ în oricare lună din acel an.
        """
        start_idx = self.start_year * 12 + self.start_month

        if month == 0:
            year_start_idx = year * 12 + 1
            year_end_idx = year * 12 + 12
            if self.end_year is not None and self.end_month is not None:
                end_idx = self.end_year * 12 + self.end_month
                return not (end_idx < year_start_idx or start_idx > year_end_idx)
            return start_idx <= year_end_idx

        cur_idx = year * 12 + month
        if cur_idx < start_idx:
            return False
        if self.end_year is not None and self.end_month is not None:
            end_idx = self.end_year * 12 + self.end_month
            if cur_idx > end_idx:
                return False
        return True


class MonthlyEnergyData(Base):
    __tablename__ = "monthly_energy_data"

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("energy_communities.id"), nullable=False)
    member_id = Column(Integer, ForeignKey("community_members.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)  # 1 to 12
    production_kwh = Column(Float, default=0.0)
    consumption_kwh = Column(Float, default=0.0)
    curve_source = Column(String(150), nullable=True)  # Name of uploaded file if applicable
    hourly_curve_json = Column(Text, nullable=True)     # Curbe pe intervale de 15 minute (JSON)
    notes = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    __table_args__ = (
        UniqueConstraint('member_id', 'year', 'month', name='uq_member_year_month'),
    )

    # Relationships
    community = relationship("EnergyCommunity", back_populates="monthly_data")
    member = relationship("CommunityMember", back_populates="monthly_data")


class SharingRun(Base):
    __tablename__ = "sharing_runs"

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("energy_communities.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)  # 0 for annual aggregate, 1-12 for specific month
    algorithm_type = Column(String(50), nullable=False)
    total_production_kwh = Column(Float, default=0.0)
    total_consumption_kwh = Column(Float, default=0.0)
    total_shared_kwh = Column(Float, default=0.0)
    total_grid_import_kwh = Column(Float, default=0.0)
    total_grid_export_kwh = Column(Float, default=0.0)
    self_sufficiency_rate = Column(Float, default=0.0)  # % of total consumption covered locally
    total_savings_ron = Column(Float, default=0.0)
    details_json = Column(Text, nullable=True)  # JSON-encoded array of MemberSharingResult
    executed_at = Column(DateTime, default=utcnow)

    # Relationships
    community = relationship("EnergyCommunity", back_populates="sharing_runs")
