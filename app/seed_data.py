from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.models import (
    EnergyCommunity,
    CommunityMember,
    MonthlyEnergyData,
    SharingRun
)
from app.crud import generate_realistic_monthly_data


def seed_initial_data(db: Session, force: bool = False):
    """Populates the database with realistic demo energy communities, members, and curve data."""
    if not force and db.query(EnergyCommunity).count() > 0:
        return  # already seeded

    if force:
        # Clear existing tables in correct FK order
        db.query(SharingRun).delete()
        db.query(MonthlyEnergyData).delete()
        db.query(CommunityMember).delete()
        db.query(EnergyCommunity).delete()
        db.commit()

    now = datetime.now(timezone.utc)

    # 0. Comunitatea Demonstrativă ANRE: 1 Sistem de Producție + 4 Consumatori (2 Mari, 2 Mici)
    c_demo = EnergyCommunity(
        name="Comunitatea Demonstrativă ANRE (1 Producător + 4 Consumatori)",
        code="CER-DEMO-01",
        description="Comunitate demonstrativă etalon conformă ANRE pentru compararea Algoritmului A (proporțional cu consumul pe fiecare interval de 15 min) vs. Algoritmului B (cotă fixă egală de 25% fiecărui consumator). Include 1 sistem de producție dedicat (50 kWp) și 4 locuri de consum (2 mari, 2 mici).",
        location="Cluj-Napoca / Centru",
        distribution_zone="deer_transilvania_nord",
        anre_status="inregistrare_admisa",
        anre_registration_number="ANRE-CER-2026/001",
        internal_tariff=0.65,
        grid_tariff=1.30,
        export_tariff=0.35,
        default_algorithm="anre_algorithm_a",
        created_at=now - timedelta(days=150)
    )

    # 1. Comunitatea 1: Cluj (Zona DEER Transilvania Nord) - Înregistrare Admisă ANRE
    c1 = EnergyCommunity(
        name="Comunitatea Solară Zorilor Cluj",
        code="CER-CJ-01",
        description="Comunitate de energie regenerabilă constituită conform Directivei RED II și legislației ANRE, reunind un parc solar comunitar, prosumatori rezidențiali și consumatori din cartierul Zorilor.",
        location="Cluj-Napoca - Zorilor",
        distribution_zone="deer_transilvania_nord",
        anre_status="inregistrare_admisa",
        anre_registration_number="ANRE-CER-2025/014",
        internal_tariff=0.65,
        grid_tariff=1.30,
        export_tariff=0.35,
        default_algorithm="anre_algorithm_a",
        created_at=now - timedelta(days=120)
    )

    # 2. Comunitatea 2: București (Zona Rețele Electrice Muntenia) - Cerere în Lucru la ANRE
    c2 = EnergyCommunity(
        name="Microgrid Solar Vest București",
        code="CER-B-02",
        description="Microrețea urbană inteligentă pentru partajarea energiei solare între depozite logistice, IMM-uri și gospodării casnice din sectorul 6.",
        location="București - Sector 6",
        distribution_zone="retele_electrice_muntenia",
        anre_status="cerere_in_lucru",
        anre_registration_number=None,
        internal_tariff=0.60,
        grid_tariff=1.30,
        export_tariff=0.35,
        default_algorithm="anre_algorithm_b",
        created_at=now - timedelta(days=60)
    )

    # 3. Comunitatea 3: Brașov (Zona DEER Transilvania Sud) - Grup de Inițiativă
    c3 = EnergyCommunity(
        name="Cooperativa Verde Brașov Răcădău",
        code="CER-BV-03",
        description="Comunitate de energie în stadiu de constituire, formată dintr-un grup de inițiativă local pentru independență energetică.",
        location="Brașov - Răcădău",
        distribution_zone="deer_transilvania_sud",
        anre_status="grup_initiativa",
        anre_registration_number=None,
        internal_tariff=0.68,
        grid_tariff=1.30,
        export_tariff=0.35,
        default_algorithm="anre_algorithm_a",
        created_at=now - timedelta(days=20)
    )

    db.add_all([c_demo, c1, c2, c3])
    db.commit()
    db.refresh(c_demo)
    db.refresh(c1)
    db.refresh(c2)
    db.refresh(c3)

    # Members for Demonstration Community (c_demo)
    # 1 Sistem de Producție (50 kWp, cotă 0%) + 4 Locuri de Consum (2 Mari, 2 Mici, cote egale de 25% fiecare)
    m_demo_prod = CommunityMember(
        community_id=c_demo.id,
        name="Parc Solar Fotovoltaic Central (Producător)",
        code_pod="RO-DEMO-PROD-01",
        member_type="sistem_productie",
        address="Zona Industrială Nord, Parcela 1",
        installed_capacity_kw=50.0,
        contracted_power_kw=0.0,
        share_percentage=0.0,  # Sistemul de producție nu are cotă de consum alocată conform ANRE
        start_year=2025,
        start_month=1,
        end_year=None,
        end_month=None,
        notes="Sistem dedicat de producție fotovoltaică 50 kWp (consum 0, cotă alocare consum 0%)."
    )
    m_demo_c1 = CommunityMember(
        community_id=c_demo.id,
        name="Consumator Mare 1 - Atelier Fabricație & Producție",
        code_pod="RO-DEMO-CONS-01",
        member_type="consumator",
        address="Str. Industriei nr. 10",
        installed_capacity_kw=0.0,
        contracted_power_kw=30.0,
        share_percentage=25.0,  # 25% cotă fixă
        start_year=2025,
        start_month=1,
        end_year=None,
        end_month=None,
        notes="Loc de consum industrial cu consum ridicat (putere contractată 30 kW, cotă fixă 25%)."
    )
    m_demo_c2 = CommunityMember(
        community_id=c_demo.id,
        name="Consumator Mare 2 - Centru Comercial & Logistică",
        code_pod="RO-DEMO-CONS-02",
        member_type="consumator",
        address="Bvd. Muncii nr. 45",
        installed_capacity_kw=0.0,
        contracted_power_kw=25.0,
        share_percentage=25.0,  # 25% cotă fixă
        start_year=2025,
        start_month=1,
        end_year=None,
        end_month=None,
        notes="Loc de consum comercial cu consum ridicat (putere contractată 25 kW, cotă fixă 25%)."
    )
    m_demo_c3 = CommunityMember(
        community_id=c_demo.id,
        name="Consumator Mic 1 - Gospodărie Casnică Rezidențială",
        code_pod="RO-DEMO-CONS-03",
        member_type="consumator",
        address="Str. Salcâmilor nr. 7",
        installed_capacity_kw=0.0,
        contracted_power_kw=8.0,
        share_percentage=25.0,  # 25% cotă fixă
        start_year=2025,
        start_month=1,
        end_year=None,
        end_month=None,
        notes="Loc de consum casnic cu consum redus (putere contractată 8 kW, cotă fixă 25%)."
    )
    m_demo_c4 = CommunityMember(
        community_id=c_demo.id,
        name="Consumator Mic 2 - Magazin Mixt de Cartier",
        code_pod="RO-DEMO-CONS-04",
        member_type="consumator",
        address="Str. Primăverii nr. 18",
        installed_capacity_kw=0.0,
        contracted_power_kw=10.0,
        share_percentage=25.0,  # 25% cotă fixă
        start_year=2025,
        start_month=1,
        end_year=None,
        end_month=None,
        notes="Loc de consum comercial mic cu consum redus (putere contractată 10 kW, cotă fixă 25%)."
    )

    # Members for Community 1 (Cluj, DEER Transilvania Nord)
    # Demonstrating members entering/exiting over time:
    m1_1 = CommunityMember(
        community_id=c1.id,
        name="Parc Solar Comunitar Zorilor",
        code_pod="RO-CJ-POD-001",
        member_type="sistem_productie",
        address="Str. Observatorului nr. 105",
        installed_capacity_kw=50.0,
        contracted_power_kw=0.0,
        share_percentage=0.0,  # Producția nu are cotă de consum alocată
        start_year=2025,
        start_month=1,
        end_year=None,
        end_month=None,
        notes="Sistem dedicat de producție fotovoltaică (consum 0, cotă alocare consum 0%)."
    )
    m1_2 = CommunityMember(
        community_id=c1.id,
        name="Familia Popescu (Casă Solară)",
        code_pod="RO-CJ-POD-002",
        member_type="prosumator",
        address="Str. Frunzișului nr. 22",
        installed_capacity_kw=8.5,
        contracted_power_kw=10.0,
        share_percentage=30.0,
        start_year=2025,
        start_month=1,
        end_year=None,
        end_month=None,
        notes="Locuință unifamilială cu producție solară și consum casnic."
    )
    m1_3 = CommunityMember(
        community_id=c1.id,
        name="Birouri Tech & Coworking Zorilor",
        code_pod="RO-CJ-POD-003",
        member_type="prosumator",
        address="Str. Republicii nr. 45",
        installed_capacity_kw=15.0,
        contracted_power_kw=25.0,
        share_percentage=30.0,
        start_year=2025,
        start_month=3,
        end_year=None,
        end_month=None,
        notes="Clădire birouri cu panouri fotovoltaice pe terasă (aderat 03/2025)."
    )
    m1_4 = CommunityMember(
        community_id=c1.id,
        name="Grădinița Prichindel",
        code_pod="RO-CJ-POD-004",
        member_type="consumator",
        address="Str. Lunii nr. 8",
        installed_capacity_kw=0.0,
        contracted_power_kw=15.0,
        share_percentage=20.0,
        start_year=2025,
        start_month=1,
        end_year=None,
        end_month=None,
        notes="Consumator comunitar exclusiv (producție 0)."
    )
    m1_5 = CommunityMember(
        community_id=c1.id,
        name="Bloc Locuințe Scara A (Ieșit din mai 2026)",
        code_pod="RO-CJ-POD-005",
        member_type="consumator",
        address="Str. Meteor nr. 3",
        installed_capacity_kw=0.0,
        contracted_power_kw=30.0,
        share_percentage=10.0,
        start_year=2025,
        start_month=1,
        end_year=2026,
        end_month=5,  # Exited in May 2026!
        notes="Fost membru; a ieșit din comunitate în Mai 2026."
    )
    m1_6 = CommunityMember(
        community_id=c1.id,
        name="Depozit Comercial Zorilor (Intrat în aug 2026)",
        code_pod="RO-CJ-POD-006",
        member_type="consumator",
        address="Str. Pasteur nr. 18",
        installed_capacity_kw=0.0,
        contracted_power_kw=20.0,
        share_percentage=10.0,
        start_year=2026,
        start_month=8,  # Starts in August 2026!
        end_year=None,
        end_month=None,
        notes="Membru nou care se alătură comunității din August 2026."
    )
    m1_7 = CommunityMember(
        community_id=c1.id,
        name="Baterie Comunitară BESS Zorilor 40kWh",
        code_pod="RO-CJ-POD-007",
        member_type="stocare_bess",
        address="Str. Observatorului nr. 107",
        installed_capacity_kw=20.0,
        contracted_power_kw=20.0,
        share_percentage=0.0,  # Sistemul de stocare BESS nu are cotă de consum alocată
        start_year=2025,
        start_month=1,
        end_year=None,
        end_month=None,
        notes="Sistem de stocare baterii BESS pentru absorbție surplus și injecție la vârf (cotă alocare consum 0%)."
    )

    # Members for Community 2 (București, Rețele Electrice Muntenia)
    m2_1 = CommunityMember(
        community_id=c2.id,
        name="Centrală Solară Acoperiș Hala Vest",
        code_pod="RO-B-POD-101",
        member_type="sistem_productie",
        address="Bvd. Iuliu Maniu nr. 310",
        installed_capacity_kw=35.0,
        contracted_power_kw=0.0,
        share_percentage=0.0,  # Producția nu are cotă de consum alocată
        start_year=2025,
        start_month=1,
        notes="Centrală solară industrială dedicată generării (cotă alocare consum 0%)."
    )
    m2_2 = CommunityMember(
        community_id=c2.id,
        name="Depozit Logistic & Birouri Vest",
        code_pod="RO-B-POD-102",
        member_type="prosumator",
        address="Str. Preciziei nr. 14",
        installed_capacity_kw=12.0,
        contracted_power_kw=20.0,
        share_percentage=40.0,
        start_year=2025,
        start_month=1,
        notes="Prosumator industrial."
    )
    m2_3 = CommunityMember(
        community_id=c2.id,
        name="Atelier Meșteșugăresc & Tipografie",
        code_pod="RO-B-POD-103",
        member_type="consumator",
        address="Str. Valea Cascadelor nr. 5",
        installed_capacity_kw=0.0,
        contracted_power_kw=15.0,
        share_percentage=30.0,
        start_year=2025,
        start_month=1,
        notes="Consumator comercial."
    )
    m2_4 = CommunityMember(
        community_id=c2.id,
        name="Ansamblu Rezidențial Militari Vest",
        code_pod="RO-B-POD-104",
        member_type="consumator",
        address="Str. Apusului nr. 40",
        installed_capacity_kw=0.0,
        contracted_power_kw=25.0,
        share_percentage=30.0,
        start_year=2025,
        start_month=1,
        notes="Consumatori casnici asociați."
    )

    # Members for Community 3 (Brașov, DEER Transilvania Sud)
    m3_1 = CommunityMember(
        community_id=c3.id,
        name="Centrală Solară Colina Răcădău",
        code_pod="RO-BV-POD-201",
        member_type="sistem_productie",
        address="Str. Carpaților nr. 80",
        installed_capacity_kw=25.0,
        contracted_power_kw=0.0,
        share_percentage=0.0,  # Producția nu are cotă de consum alocată
        start_year=2025,
        start_month=1,
        notes="Sistem de producție fotovoltaică (cotă alocare consum 0%)."
    )
    m3_2 = CommunityMember(
        community_id=c3.id,
        name="Pensiunea Răcădău Green",
        code_pod="RO-BV-POD-202",
        member_type="prosumator",
        address="Str. Tâmpei nr. 12",
        installed_capacity_kw=10.0,
        contracted_power_kw=15.0,
        share_percentage=60.0,
        start_year=2025,
        start_month=1,
        notes="Prosumator ospitalitate."
    )
    m3_3 = CommunityMember(
        community_id=c3.id,
        name="Club Sportiv Tineret Brașov",
        code_pod="RO-BV-POD-203",
        member_type="consumator",
        address="Str. Molidului nr. 6",
        installed_capacity_kw=0.0,
        contracted_power_kw=20.0,
        share_percentage=40.0,
        start_year=2025,
        start_month=1,
        notes="Consumator comunitar."
    )

    db.add_all([
        m_demo_prod, m_demo_c1, m_demo_c2, m_demo_c3, m_demo_c4,
        m1_1, m1_2, m1_3, m1_4, m1_5, m1_6, m1_7,
        m2_1, m2_2, m2_3, m2_4,
        m3_1, m3_2, m3_3
    ])
    db.commit()

    # Generate complete 12 months realistic curve data for 2026
    generate_realistic_monthly_data(db, c_demo.id, year=2026)
    generate_realistic_monthly_data(db, c1.id, year=2026)
    generate_realistic_monthly_data(db, c2.id, year=2026)
    generate_realistic_monthly_data(db, c3.id, year=2026)
