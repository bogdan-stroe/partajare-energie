const { useState, useEffect, useRef } = React;

// ANRE Status Definitions
const ANRE_STATUSES = [
    {
        id: "grup_initiativa",
        label: "Grup de Inițiativă",
        badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        icon: "fa-solid fa-people-group",
        desc: "Comunitatea este în stadiul incipient de organizare și inițiere a documentației."
    },
    {
        id: "cerere_trimisa",
        label: "Cerere Trimisă la ANRE",
        badgeClass: "bg-sky-500/20 text-sky-300 border-sky-500/40",
        icon: "fa-solid fa-paper-plane",
        desc: "Dosarul de înregistrare a fost depus oficial către registratura ANRE."
    },
    {
        id: "cerere_in_lucru",
        label: "Cerere în Lucru la ANRE",
        badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
        icon: "fa-solid fa-spinner fa-spin-pulse",
        desc: "Cererea este în evaluare tehnică și juridică de către inspectorii ANRE."
    },
    {
        id: "inregistrare_admisa",
        label: "Înregistrare Admisă",
        badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        icon: "fa-solid fa-circle-check",
        desc: "Comunitatea a fost aprobată oficial și înscrisă în Registrul Național al Comunităților de Energie."
    },
    {
        id: "inregistrare_respinsa",
        label: "Înregistrare Respinsă",
        badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        icon: "fa-solid fa-circle-xmark",
        desc: "Cererea de înregistrare a fost respinsă de ANRE (necesită remediere/redepunere)."
    }
];

// Cele 8 Zone de Distribuție și Operatorii din România
const DISTRIBUTION_ZONES = [
    {
        id: "retele_electrice_muntenia",
        operator: "Rețele Electrice (fostul Grup Enel)",
        name: "Rețele Electrice Muntenia",
        counties: ["București", "Ilfov", "Giurgiu"],
        region_label: "București, Ilfov, Giurgiu"
    },
    {
        id: "retele_electrice_banat",
        operator: "Rețele Electrice (fostul Grup Enel)",
        name: "Rețele Electrice Banat",
        counties: ["Timiș", "Arad", "Hunedoara", "Caraș-Severin"],
        region_label: "Timiș, Arad, Hunedoara, Caraș-Severin"
    },
    {
        id: "retele_electrice_dobrogea",
        operator: "Rețele Electrice (fostul Grup Enel)",
        name: "Rețele Electrice Dobrogea",
        counties: ["Constanța", "Tulcea", "Călărași", "Ialomița"],
        region_label: "Constanța, Tulcea, Călărași, Ialomița"
    },
    {
        id: "deer_transilvania_nord",
        operator: "DEER (Distribuție Energie Electrică România) – Grupul Electrica",
        name: "DEER Transilvania Nord",
        counties: ["Cluj", "Bihor", "Maramureș", "Satu Mare", "Bistrița-Năsăud", "Sălaj"],
        region_label: "Cluj, Bihor, Maramureș, Satu Mare, Bistrița-Năsăud, Sălaj"
    },
    {
        id: "deer_transilvania_sud",
        operator: "DEER (Distribuție Energie Electrică România) – Grupul Electrica",
        name: "DEER Transilvania Sud",
        counties: ["Alba", "Brașov", "Covasna", "Harghita", "Mureș", "Sibiu"],
        region_label: "Alba, Brașov, Covasna, Harghita, Mureș, Sibiu"
    },
    {
        id: "deer_muntenia_nord",
        operator: "DEER (Distribuție Energie Electrică România) – Grupul Electrica",
        name: "DEER Muntenia Nord",
        counties: ["Brăila", "Buzău", "Dâmbovița", "Galați", "Prahova", "Vrancea"],
        region_label: "Brăila, Buzău, Dâmbovița, Galați, Prahova, Vrancea"
    },
    {
        id: "delgaz_grid_nord_est",
        operator: "Delgaz Grid (Grupul E.ON)",
        name: "Delgaz Grid (Regiunea Nord-Est)",
        counties: ["Suceava", "Botoșani", "Neamț", "Iași", "Bacău", "Vaslui"],
        region_label: "Suceava, Botoșani, Neamț, Iași, Bacău, Vaslui"
    },
    {
        id: "distributie_oltenia",
        operator: "Distribuție Oltenia (Grupul E-Distribuție / Evryo / Oltenia)",
        name: "Distribuție Oltenia",
        counties: ["Dolj", "Argeș", "Olt", "Gorj", "Vâlcea", "Mehedinți", "Teleorman"],
        region_label: "Dolj, Argeș, Olt, Gorj, Vâlcea, Mehedinți, Teleorman"
    }
];

// Cei doi Algoritmi Oficiali Recunoscuți de ANRE pentru Partajarea Energiei
const SHARING_ALGORITHMS = [
    {
        id: "anre_algorithm_a",
        alias: "proportional_consumption",
        letter: "A",
        name: "Algoritmul de Alocare A (ANRE) — Proporțional cu Consumul pe Interval",
        shortName: "Algoritmul A (Proporțional cu consumul)",
        badge: "Oficial ANRE — Art. a",
        desc: "Alocarea energiei electrice partajate se realizează pe fiecare interval de decontare (15 min) pentru fiecare loc de consum din cadrul comunității proporțional cu consumul înregistrat pe intervalul de decontare la locul de consum."
    },
    {
        id: "anre_algorithm_b",
        alias: "fixed_coefficients",
        letter: "B",
        name: "Algoritmul de Alocare B (ANRE) — În Procent Fix pe Interval",
        shortName: "Algoritmul B (În procent fix)",
        badge: "Oficial ANRE — Art. b",
        desc: "Alocarea energiei electrice partajate se realizează pe fiecare interval de decontare (15 min) pentru fiecare loc de consum din cadrul comunității de energie în procent fix (cotă fixă % alocată fiecărui membru)."
    }
];

const normalizeAlgorithmId = (id) => {
    if (id === 'proportional_consumption' || id === 'anre_algorithm_a') return 'anre_algorithm_a';
    if (id === 'fixed_coefficients' || id === 'anre_algorithm_b') return 'anre_algorithm_b';
    return id || 'anre_algorithm_a';
};

const MONTH_NAMES = [
    "Toate Lunile (An Întreg)",
    "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
    "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
];

function App() {
    // Navigation Tabs: 'communities', 'upload', 'sharing'
    const [activeTab, setActiveTab] = useState('communities');

    // Core States
    const [communities, setCommunities] = useState([]);
    const [selectedCommunityId, setSelectedCommunityId] = useState(null);
    const [selectedCommunity, setSelectedCommunity] = useState(null);
    const [monthlyData, setMonthlyData] = useState([]);
    const [selectedYear, setSelectedYear] = useState(2026);
    const [selectedMonth, setSelectedMonth] = useState(7); // July default

    // Sharing Algorithm State
    const [selectedAlgorithm, setSelectedAlgorithm] = useState("anre_algorithm_a");
    const [algorithmResult, setAlgorithmResult] = useState(null);
    const [isRunningAlgorithm, setIsRunningAlgorithm] = useState(false);

    // File Upload State
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadYear, setUploadYear] = useState(2026);
    const [uploadMonth, setUploadMonth] = useState(7);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSummary, setUploadSummary] = useState(null);

    // UI Loading & Feedback
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);

    // Filter members table ('all', 'active', 'inactive')
    const [memberFilter, setMemberFilter] = useState('all');

    // Modals
    const [showCreateCommunity, setShowCreateCommunity] = useState(false);
    const [showEditCommunity, setShowEditCommunity] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [showEditMember, setShowEditMember] = useState(false);
    const [showLicenseModal, setShowLicenseModal] = useState(false);
    const [showAlgorithmsGuide, setShowAlgorithmsGuide] = useState(false);
    const [licenseData, setLicenseData] = useState(null);

    // Forms: Community
    const [newCommunity, setNewCommunity] = useState({
        name: '',
        code: '',
        description: '',
        location: 'România',
        distribution_zone: 'deer_transilvania_nord',
        anre_status: 'grup_initiativa',
        anre_registration_number: '',
        internal_tariff: 0.65,
        grid_tariff: 1.30,
        export_tariff: 0.35,
        default_algorithm: 'anre_algorithm_a'
    });

    const [editCommunityForm, setEditCommunityForm] = useState({
        name: '',
        description: '',
        location: '',
        distribution_zone: 'deer_transilvania_nord',
        anre_status: 'grup_initiativa',
        anre_registration_number: '',
        internal_tariff: 0.65,
        grid_tariff: 1.30,
        export_tariff: 0.35,
        default_algorithm: 'anre_algorithm_a'
    });

    // Forms: Add Member
    const [newMember, setNewMember] = useState({
        name: '',
        code_pod: '',
        member_type: 'prosumator',
        address: '',
        installed_capacity_kw: 10.0,
        contracted_power_kw: 10.0,
        share_percentage: 20.0,
        notes: '',
        start_year: 2025,
        start_month: 1,
        has_exit: false,
        end_year: '',
        end_month: ''
    });

    // Forms: Edit Member
    const [editMemberForm, setEditMemberForm] = useState({
        id: null,
        name: '',
        code_pod: '',
        member_type: 'prosumator',
        address: '',
        installed_capacity_kw: 10.0,
        contracted_power_kw: 10.0,
        share_percentage: 20.0,
        notes: '',
        start_year: 2025,
        start_month: 1,
        has_exit: false,
        end_year: '',
        end_month: 12
    });

    // Chart Refs
    const sharingChartRef = useRef(null);
    const sharingChartInstance = useRef(null);
    const curve15MinChartRef = useRef(null);
    const curve15MinChartInstance = useRef(null);

    const showToast = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4500);
    };

    // Load initial data
    const loadCommunities = async (targetId = null) => {
        try {
            const res = await fetch('/api/communities').then(r => r.json());
            setCommunities(res);
            if (res.length > 0) {
                const nextId = targetId || selectedCommunityId || res[0].id;
                setSelectedCommunityId(nextId);
                const full = await fetch(`/api/communities/${nextId}`).then(r => r.json());
                setSelectedCommunity(full);
                setSelectedAlgorithm(normalizeAlgorithmId(full.default_algorithm));
            }
        } catch (err) {
            console.error(err);
            showToast('Eroare la conectarea cu serverul!', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCommunities();
        fetch('/api/license')
            .then(r => r.json())
            .then(d => setLicenseData(d))
            .catch(err => console.error("Error loading license:", err));
    }, []);

    // When community, year or month changes, fetch monthly data
    useEffect(() => {
        if (!selectedCommunityId) return;
        fetch(`/api/communities/${selectedCommunityId}`)
            .then(r => r.json())
            .then(comm => {
                setSelectedCommunity(comm);
                setEditCommunityForm({
                    name: comm.name,
                    description: comm.description || '',
                    location: comm.location || '',
                    anre_status: comm.anre_status || 'grup_initiativa',
                    anre_registration_number: comm.anre_registration_number || '',
                    internal_tariff: comm.internal_tariff,
                    grid_tariff: comm.grid_tariff,
                    export_tariff: comm.export_tariff,
                    default_algorithm: comm.default_algorithm || 'proportional_consumption'
                });
            });
        fetchMonthlyData(selectedCommunityId, selectedYear, selectedMonth);
    }, [selectedCommunityId, selectedYear, selectedMonth]);

    const fetchMonthlyData = async (commId, year, month) => {
        try {
            const url = month > 0 
                ? `/api/communities/${commId}/monthly-data?year=${year}&month=${month}`
                : `/api/communities/${commId}/monthly-data?year=${year}`;
            const res = await fetch(url).then(r => r.json());
            setMonthlyData(res);
        } catch (e) {
            console.error(e);
        }
    };

    // File Upload Handler
    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile || !selectedCommunityId) {
            showToast('Vă rugăm să selectați un fișier CSV!', 'error');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        if (uploadYear) {
            formData.append('year', uploadYear);
        }
        if (uploadMonth) {
            formData.append('month', uploadMonth);
        }

        try {
            const res = await fetch(`/api/communities/${selectedCommunityId}/upload-curves`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Eroare la încărcarea fișierului');

            setUploadSummary(data);
            showToast(data.message, 'success');
            setUploadFile(null);
            // Refresh data for the target upload year & month
            if (uploadYear) setSelectedYear(uploadYear);
            if (uploadMonth) setSelectedMonth(uploadMonth);
            fetchMonthlyData(selectedCommunityId, uploadYear || selectedYear, uploadMonth || selectedMonth);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    // Run Sharing Algorithm
    const handleRunSharingAlgorithm = async () => {
        if (!selectedCommunityId) return;
        setIsRunningAlgorithm(true);
        try {
            const res = await fetch(`/api/communities/${selectedCommunityId}/run-sharing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    algorithm_type: selectedAlgorithm,
                    year: parseInt(selectedYear),
                    month: parseInt(selectedMonth),
                    save_run: true
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Eroare la rularea algoritmului');

            setAlgorithmResult(data);
            showToast(`Algoritmul "${data.algorithm_name_ro}" a fost calculat cu succes!`);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setIsRunningAlgorithm(false);
        }
    };

    // Chart.js render for Sharing Breakdown
    useEffect(() => {
        if (activeTab === 'sharing' && sharingChartRef.current && algorithmResult && algorithmResult.members_results) {
            if (sharingChartInstance.current) {
                sharingChartInstance.current.destroy();
            }

            const ctx = sharingChartRef.current.getContext('2d');
            const labels = algorithmResult.members_results.map(m => m.name.split(' ')[0] + ' (' + (m.member_type === 'sistem_productie' ? 'Prod' : m.member_type === 'prosumator' ? 'Pros' : (m.member_type === 'stocare_bess' || m.member_type === 'bess') ? 'BESS' : 'Cons') + ')');
            const greenSelf = algorithmResult.members_results.map(m => m.self_consumed_kwh);
            const greenShared = algorithmResult.members_results.map(m => m.energy_received_kwh);
            const gridImport = algorithmResult.members_results.map(m => m.grid_import_kwh);

            sharingChartInstance.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Autoconsum Local (kWh)',
                            data: greenSelf,
                            backgroundColor: '#DBE200', // Galben Cooperativa
                            stack: 'consum'
                        },
                        {
                            label: 'Partajare Verde Primită din Comunitate (kWh)',
                            data: greenShared,
                            backgroundColor: '#0B7A75', // Teal Brand
                            stack: 'consum'
                        },
                        {
                            label: 'Preluat din Rețeaua Națională (kWh)',
                            data: gridImport,
                            backgroundColor: '#FF9914', // Portocaliu Energie
                            stack: 'consum'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#94a3b8' } },
                        tooltip: {
                            callbacks: {
                                footer: (items) => {
                                    let sum = 0;
                                    items.forEach(i => sum += i.parsed.y);
                                    return `Total Consum: ${sum.toFixed(1)} kWh`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(51,65,85,0.2)' }, ticks: { color: '#94a3b8' } },
                        y: {
                            grid: { color: 'rgba(51,65,85,0.2)' },
                            ticks: { color: '#94a3b8', callback: v => v + ' kWh' },
                            stacked: true
                        }
                    }
                }
            });
        }
    }, [activeTab, algorithmResult]);

    // Chart.js render for 15-Minute Load Curve
    useEffect(() => {
        if (activeTab === 'sharing' && curve15MinChartRef.current && algorithmResult && algorithmResult.daily_15min_profile) {
            if (curve15MinChartInstance.current) {
                curve15MinChartInstance.current.destroy();
            }

            const ctx = curve15MinChartRef.current.getContext('2d');
            const profile = algorithmResult.daily_15min_profile;

            curve15MinChartInstance.current = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: profile.map(p => p.time),
                    datasets: [
                        {
                            label: 'Producție Solară (kW)',
                            data: profile.map(p => p.production_kw),
                            borderColor: '#DBE200',
                            backgroundColor: 'rgba(219, 226, 0, 0.15)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 2.5,
                            pointRadius: 0
                        },
                        {
                            label: 'Consum Total (kW)',
                            data: profile.map(p => p.consumption_kw),
                            borderColor: '#FF9914',
                            backgroundColor: 'rgba(255, 153, 20, 0.1)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 2,
                            pointRadius: 0
                        },
                        {
                            label: 'Partajare Verde Comunitară (kW)',
                            data: profile.map(p => p.shared_kw),
                            borderColor: '#0B7A75',
                            backgroundColor: 'rgba(11, 122, 117, 0.25)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 2.5,
                            pointRadius: 0
                        },
                        {
                            label: 'Preluat din Rețea (kW)',
                            data: profile.map(p => p.grid_import_kw),
                            borderColor: '#ef4444',
                            borderDash: [4, 4],
                            fill: false,
                            tension: 0.2,
                            borderWidth: 1.5,
                            pointRadius: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: { labels: { color: '#cbd5e1' } },
                        tooltip: {
                            callbacks: {
                                label: (item) => `${item.dataset.label}: ${item.parsed.y.toFixed(2)} kW`
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(51,65,85,0.2)' },
                            ticks: {
                                color: '#94a3b8',
                                maxTicksLimit: 24
                            }
                        },
                        y: {
                            grid: { color: 'rgba(51,65,85,0.2)' },
                            ticks: {
                                color: '#94a3b8',
                                callback: v => v + ' kW'
                            }
                        }
                    }
                }
            });
        }
    }, [activeTab, algorithmResult]);

    // Handle Create Community
    const handleCreateCommunitySubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/communities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newCommunity.name,
                    code: newCommunity.code.toUpperCase(),
                    description: newCommunity.description,
                    location: newCommunity.location,
                    distribution_zone: newCommunity.distribution_zone,
                    anre_status: newCommunity.anre_status,
                    anre_registration_number: newCommunity.anre_status === 'inregistrare_admisa' ? newCommunity.anre_registration_number : null,
                    internal_tariff: parseFloat(newCommunity.internal_tariff),
                    grid_tariff: parseFloat(newCommunity.grid_tariff),
                    export_tariff: parseFloat(newCommunity.export_tariff),
                    default_algorithm: newCommunity.default_algorithm
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Eroare la crearea comunității');

            showToast(`Comunitatea "${data.name}" a fost creată cu succes!`);
            setShowCreateCommunity(false);
            setNewCommunity({
                name: '',
                code: '',
                description: '',
                location: 'România',
                distribution_zone: 'deer_transilvania_nord',
                anre_status: 'grup_initiativa',
                anre_registration_number: '',
                internal_tariff: 0.65,
                grid_tariff: 1.30,
                export_tariff: 0.35,
                default_algorithm: 'proportional_consumption'
            });
            await loadCommunities(data.id);
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Handle Edit Community Settings
    const handleEditCommunitySubmit = async (e) => {
        e.preventDefault();
        if (!selectedCommunityId) return;

        try {
            const res = await fetch(`/api/communities/${selectedCommunityId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editCommunityForm.name,
                    description: editCommunityForm.description,
                    location: editCommunityForm.location,
                    distribution_zone: editCommunityForm.distribution_zone,
                    anre_status: editCommunityForm.anre_status,
                    anre_registration_number: editCommunityForm.anre_status === 'inregistrare_admisa' ? editCommunityForm.anre_registration_number : null,
                    internal_tariff: parseFloat(editCommunityForm.internal_tariff),
                    grid_tariff: parseFloat(editCommunityForm.grid_tariff),
                    export_tariff: parseFloat(editCommunityForm.export_tariff),
                    default_algorithm: editCommunityForm.default_algorithm
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Eroare la actualizarea comunității');

            showToast(`Datele comunității "${data.name}" au fost actualizate!`);
            setShowEditCommunity(false);
            setSelectedCommunity(data);
            loadCommunities(selectedCommunityId);
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Open Edit Community Modal
    const openEditCommunityModal = () => {
        if (!selectedCommunity) return;
        setEditCommunityForm({
            name: selectedCommunity.name,
            description: selectedCommunity.description || '',
            location: selectedCommunity.location || '',
            distribution_zone: selectedCommunity.distribution_zone || 'deer_transilvania_nord',
            anre_status: selectedCommunity.anre_status,
            anre_registration_number: selectedCommunity.anre_registration_number || '',
            internal_tariff: selectedCommunity.internal_tariff,
            grid_tariff: selectedCommunity.grid_tariff,
            export_tariff: selectedCommunity.export_tariff,
            default_algorithm: selectedCommunity.default_algorithm
        });
        setShowEditCommunity(true);
    };

    // Handle Add Member
    const handleAddMemberSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCommunityId) return;

        try {
            const isNoShareType = newMember.member_type === 'sistem_productie' || newMember.member_type === 'stocare_bess';
            const rawShare = isNoShareType ? 0.0 : parseFloat(newMember.share_percentage || 0.0);
            const remaining = selectedCommunity?.remaining_share_pct != null ? selectedCommunity.remaining_share_pct : 100.0;

            if (!isNoShareType && rawShare > remaining + 0.001) {
                showToast(`Suma procentelor alocate pentru consum nu poate depăși 100%. Maxim disponibil în comunitate: ${remaining.toFixed(1)}%`, 'error');
                return;
            }

            const res = await fetch(`/api/communities/${selectedCommunityId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newMember.name,
                    code_pod: newMember.code_pod.toUpperCase(),
                    member_type: newMember.member_type,
                    address: newMember.address,
                    installed_capacity_kw: newMember.member_type === 'consumator' ? 0.0 : parseFloat(newMember.installed_capacity_kw || 0),
                    contracted_power_kw: newMember.member_type === 'sistem_productie' ? 0.0 : parseFloat(newMember.contracted_power_kw || 5.0),
                    share_percentage: rawShare,
                    notes: newMember.notes,
                    start_year: parseInt(newMember.start_year || 2025),
                    start_month: parseInt(newMember.start_month || 1),
                    end_year: newMember.has_exit && newMember.end_year ? parseInt(newMember.end_year) : null,
                    end_month: newMember.has_exit && newMember.end_month ? parseInt(newMember.end_month) : null
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Eroare la adăugarea membrului');

            showToast(`Punctul "${data.name}" a fost adăugat în comunitate!`);
            setShowAddMember(false);
            setNewMember({
                name: '',
                code_pod: '',
                member_type: 'prosumator',
                address: '',
                installed_capacity_kw: 10.0,
                contracted_power_kw: 10.0,
                share_percentage: 20.0,
                notes: '',
                start_year: 2025,
                start_month: 1,
                has_exit: false,
                end_year: '',
                end_month: ''
            });

            loadCommunities(selectedCommunityId);
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Handle Delete Member
    const handleDeleteMember = async (memberId, memberName) => {
        if (!confirm(`Sigur doriți să ștergeți locul "${memberName}" din această comunitate?`)) return;

        try {
            const res = await fetch(`/api/communities/members/${memberId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Eroare la ștergerea membrului');

            showToast(`Punctul "${memberName}" a fost șters.`);
            loadCommunities(selectedCommunityId);
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Open Edit Member Modal
    const openEditMemberModal = (m) => {
        setEditMemberForm({
            id: m.id,
            name: m.name,
            code_pod: m.code_pod,
            member_type: m.member_type,
            address: m.address || '',
            installed_capacity_kw: m.installed_capacity_kw || 0.0,
            contracted_power_kw: m.contracted_power_kw || 0.0,
            share_percentage: (m.member_type === 'sistem_productie' || m.member_type === 'stocare_bess') ? 0.0 : (m.share_percentage || 0.0),
            notes: m.notes || '',
            start_year: m.start_year || 2025,
            start_month: m.start_month || 1,
            has_exit: Boolean(m.end_year && m.end_month),
            end_year: m.end_year || '',
            end_month: m.end_month || 12
        });
        setShowEditMember(true);
    };

    // Handle Edit Member Submit
    const handleEditMemberSubmit = async (e) => {
        e.preventDefault();
        if (!editMemberForm.id) return;

        try {
            const isNoShareType = editMemberForm.member_type === 'sistem_productie' || editMemberForm.member_type === 'stocare_bess';
            const rawShare = isNoShareType ? 0.0 : parseFloat(editMemberForm.share_percentage || 0.0);

            // Compute maximum allowed share for this member
            const currMember = selectedCommunity?.members?.find(m => m.id === editMemberForm.id);
            const currShare = (currMember && (currMember.member_type === 'prosumator' || currMember.member_type === 'consumator')) ? (currMember.share_percentage || 0.0) : 0.0;
            const otherSharesTotal = (selectedCommunity?.total_allocated_share_pct || 0.0) - currShare;
            const maxAllowedForThisMember = Math.max(0, parseFloat((100.0 - otherSharesTotal).toFixed(2)));

            if (!isNoShareType && rawShare > maxAllowedForThisMember + 0.001) {
                showToast(`Suma procentelor alocate pentru consum nu poate depăși 100%. Maxim permis pentru acest membru: ${maxAllowedForThisMember.toFixed(1)}%`, 'error');
                return;
            }

            const payload = {
                name: editMemberForm.name,
                code_pod: editMemberForm.code_pod.toUpperCase(),
                member_type: editMemberForm.member_type,
                address: editMemberForm.address,
                installed_capacity_kw: editMemberForm.member_type === 'consumator' ? 0.0 : parseFloat(editMemberForm.installed_capacity_kw || 0),
                contracted_power_kw: editMemberForm.member_type === 'sistem_productie' ? 0.0 : parseFloat(editMemberForm.contracted_power_kw || 0),
                share_percentage: rawShare,
                notes: editMemberForm.notes,
                start_year: parseInt(editMemberForm.start_year || 2025),
                start_month: parseInt(editMemberForm.start_month || 1),
                end_year: editMemberForm.has_exit && editMemberForm.end_year ? parseInt(editMemberForm.end_year) : null,
                end_month: editMemberForm.has_exit && editMemberForm.end_month ? parseInt(editMemberForm.end_month) : null
            };

            const res = await fetch(`/api/communities/members/${editMemberForm.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Eroare la actualizarea membrului');

            showToast(`Locul "${data.name}" a fost actualizat cu succes!`);
            setShowEditMember(false);
            loadCommunities(selectedCommunityId);
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Helper: Determine if a member is active in the currently selected period (year and month)
    const isMemberActiveInSelectedPeriod = (m) => {
        const sYr = m.start_year || 2025;
        const sMo = m.start_month || 1;
        const startIdx = sYr * 12 + sMo;
        if (selectedMonth === 0) {
            const yStart = selectedYear * 12 + 1;
            const yEnd = selectedYear * 12 + 12;
            if (m.end_year && m.end_month) {
                const endIdx = m.end_year * 12 + m.end_month;
                return !(endIdx < yStart || startIdx > yEnd);
            }
            return startIdx <= yEnd;
        } else {
            const curIdx = selectedYear * 12 + selectedMonth;
            if (curIdx < startIdx) return false;
            if (m.end_year && m.end_month) {
                const endIdx = m.end_year * 12 + m.end_month;
                if (curIdx > endIdx) return false;
            }
            return true;
        }
    };

    // Helper: render ANRE badge
    const renderAnreBadge = (statusId, regNumber = null) => {
        const found = ANRE_STATUSES.find(s => s.id === statusId) || ANRE_STATUSES[0];
        return (
            <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${found.badgeClass}`}>
                    <i className={found.icon}></i>
                    <span>{found.label}</span>
                </span>
                {statusId === 'inregistrare_admisa' && regNumber && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                        Nr: {regNumber}
                    </span>
                )}
            </div>
        );
    };

    // Helper: render member type badge
    const renderMemberBadge = (type) => {
        if (type === 'sistem_productie') {
            return (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 inline-flex">
                    <i className="fa-solid fa-solar-panel"></i>
                    <span>Sistem Producție</span>
                </span>
            );
        } else if (type === 'prosumator') {
            return (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 inline-flex">
                    <i className="fa-solid fa-arrows-rotate"></i>
                    <span>Prosumator (Prod + Cons)</span>
                </span>
            );
        } else if (type === 'stocare_bess' || type === 'bess') {
            return (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 inline-flex">
                    <i className="fa-solid fa-car-battery"></i>
                    <span>Stocare BESS</span>
                </span>
            );
        } else {
            return (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1.5 inline-flex">
                    <i className="fa-solid fa-house"></i>
                    <span>Consumator Pur</span>
                </span>
            );
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-slate-400 bg-[#242426]">
                <div className="relative w-20 h-20 mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-[#2F2F31]"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-[#DBE200] border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <img src="/static/img/logo-cooperativa-yellow-trans.png" alt="Cooperativa de Energie" className="w-10 h-auto" />
                    </div>
                </div>
                <p className="text-lg font-bold text-slate-200">Se încarcă Comunitățile de Energie...</p>
                <p className="text-xs text-[#93A29B] mt-1">Cooperativa de Energie • Finanțat prin LIFE COMET</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#242426] text-slate-100">
            {/* TOAST NOTIFICATION */}
            {notification && (
                <div className={`fixed top-5 right-5 z-50 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium transition-all transform animate-fade-in ${
                    notification.type === 'error' ? 'bg-rose-500/90 text-white border border-rose-400' :
                    notification.type === 'info' ? 'bg-[#0B7A75]/95 text-white border border-emerald-400' :
                    'bg-[#0B7A75]/95 text-white border border-[#DBE200]'
                }`}>
                    <i className={`fa-solid ${
                        notification.type === 'error' ? 'fa-triangle-exclamation' :
                        notification.type === 'info' ? 'fa-circle-info' : 'fa-circle-check text-[#DBE200]'
                    } text-base`}></i>
                    <span>{notification.message}</span>
                </div>
            )}

            {/* HEADER - Only Cooperativa de Energie logo up top */}
            <header className="sticky top-0 z-40 bg-[#2F2F31]/95 backdrop-blur-md border-b border-[#93A29B]/25">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="h-12 px-2.5 py-1 rounded-xl bg-[#202022] border border-[#DBE200]/40 flex items-center justify-center shadow-lg shadow-black/30">
                            <img 
                                src="/static/img/logo-cooperativa-yellow-trans.png" 
                                alt="Cooperativa de Energie" 
                                className="h-9 w-auto object-contain"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-black text-white tracking-tight">Partajare Energie</h1>
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#0B7A75]/30 text-[#DBE200] border border-[#0B7A75]/50">
                                    Comunități de Energie (CER)
                                </span>
                            </div>
                            <p className="text-xs text-[#93A29B]">
                                Calcul partajare energie pe intervale de 15 minute
                            </p>
                        </div>
                    </div>

                    {/* Right side: Apache 2.0 license, Community Switcher, New Community button */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Apache 2.0 License button */}
                        <button 
                            onClick={() => setShowLicenseModal(true)}
                            title="Vizualizează Licența Apache 2.0 & drepturile open-source"
                            className="px-2.5 py-1.5 rounded-xl bg-[#202022] hover:bg-[#2c2c2f] text-[#DBE200] border border-[#DBE200]/40 hover:border-[#DBE200] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                            <i className="fa-solid fa-scale-balanced text-sm"></i>
                            <span className="hidden sm:inline">Licență</span>
                            <span>Apache 2.0</span>
                        </button>

                        {/* Community Switcher */}
                        <div className="flex items-center gap-2 bg-[#202022] px-3 py-1.5 rounded-xl border border-[#93A29B]/30">
                            <i className="fa-solid fa-network-wired text-[#DBE200]"></i>
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] text-[#93A29B] uppercase font-bold tracking-wider">Comunitate:</span>
                                <select 
                                    className="bg-transparent text-sm font-semibold text-slate-100 outline-none cursor-pointer"
                                    value={selectedCommunityId || ''}
                                    onChange={(e) => setSelectedCommunityId(parseInt(e.target.value))}
                                >
                                    {communities.map(c => (
                                        <option key={c.id} value={c.id} className="bg-[#202022] text-white">
                                            {c.name} ({c.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowCreateCommunity(true)}
                            className="px-3.5 py-2 rounded-xl bg-[#0B7A75] hover:bg-[#09635f] text-white font-bold text-xs border border-[#0B7A75]/50 flex items-center gap-1.5 transition-all shadow-lg shadow-[#0B7A75]/25"
                        >
                            <i className="fa-solid fa-plus"></i>
                            <span className="hidden sm:inline">Comunitate Nouă</span>
                        </button>
                    </div>
                </div>

                {/* Subnav Tabs */}
                <div className="border-t border-[#93A29B]/20 bg-[#202022]/80">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-4 overflow-x-auto">
                        <button 
                            onClick={() => setActiveTab('communities')}
                            className={`py-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                                activeTab === 'communities' 
                                    ? 'border-[#DBE200] text-[#DBE200] font-bold' 
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <i className="fa-solid fa-sitemap"></i>
                            <span>Comunitate & Puncte ({selectedCommunity?.members?.length || 0})</span>
                        </button>

                        <button 
                            onClick={() => setActiveTab('upload')}
                            className={`py-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                                activeTab === 'upload' 
                                    ? 'border-[#DBE200] text-[#DBE200] font-bold' 
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <i className="fa-solid fa-file-arrow-up"></i>
                            <span>Încărcare Curbe & Date Lunare</span>
                        </button>

                        <button 
                            onClick={() => setActiveTab('sharing')}
                            className={`py-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                                activeTab === 'sharing' 
                                    ? 'border-[#DBE200] text-[#DBE200] font-bold' 
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <i className="fa-solid fa-microchip"></i>
                            <span>Rulare Algoritm Partajare</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

                {/* ============================================================ */}
                {/* TAB 1: COMUNITATE, STADIU ANRE & PUNCTE DE PRODUCȚIE / CONSUM */}
                {/* ============================================================ */}
                {activeTab === 'communities' && selectedCommunity && (
                    <div className="space-y-6">
                        {/* Community Profile & ANRE Status Box */}
                        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h2 className="text-xl font-extrabold text-white tracking-tight">{selectedCommunity.name}</h2>
                                        <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-emerald-400 border border-slate-700">
                                            {selectedCommunity.code}
                                        </span>
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <i className="fa-solid fa-location-dot text-slate-500"></i>
                                            {selectedCommunity.location}
                                        </span>
                                    </div>

                                    {/* STADIU ANRE BANNER */}
                                    <div className="mt-4 flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                                        <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                                            Stadiu ANRE:
                                        </span>
                                        {renderAnreBadge(selectedCommunity.anre_status, selectedCommunity.anre_registration_number)}
                                        <span className="text-xs text-slate-400 italic">
                                            {ANRE_STATUSES.find(s => s.id === selectedCommunity.anre_status)?.desc}
                                        </span>
                                    </div>

                                    {/* ZONA DE DISTRIBUȚIE BANNER */}
                                    <div className="mt-3 flex flex-wrap items-center gap-2 p-3 rounded-xl bg-[#202022] border border-[#0B7A75]/40 text-xs">
                                        <div className="flex items-center gap-2">
                                            <i className="fa-solid fa-tower-broadcast text-[#DBE200]"></i>
                                            <span className="text-[#93A29B] uppercase font-bold text-[11px]">Zonă Distribuție:</span>
                                            <span className="font-bold px-2 py-0.5 rounded bg-[#0B7A75]/30 text-[#DBE200] border border-[#0B7A75]/60">
                                                {selectedCommunity.zone_details?.name || selectedCommunity.distribution_zone}
                                            </span>
                                        </div>
                                        <span className="text-slate-500 hidden sm:inline">•</span>
                                        <span className="text-slate-300">
                                            <strong className="text-slate-200">Operator:</strong> {selectedCommunity.zone_details?.operator}
                                        </span>
                                        <span className="text-slate-500 hidden md:inline">•</span>
                                        <span className="text-xs text-[#93A29B] hidden md:inline">
                                            Județe: {selectedCommunity.zone_details?.region_label}
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-300 mt-3 max-w-3xl leading-relaxed">
                                        {selectedCommunity.description}
                                    </p>

                                    {/* Financial Tariffs */}
                                    <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
                                        <div className="bg-emerald-950/40 border border-emerald-800/50 px-3 py-1.5 rounded-lg">
                                            <span className="text-slate-400">Tarif Partajare Intern: </span>
                                            <span className="font-bold text-emerald-300">{selectedCommunity.internal_tariff.toFixed(2)} RON/kWh</span>
                                        </div>
                                        <div className="bg-slate-800/60 border border-slate-700 px-3 py-1.5 rounded-lg">
                                            <span className="text-slate-400">Tarif Rețea: </span>
                                            <span className="font-bold text-slate-200">{selectedCommunity.grid_tariff.toFixed(2)} RON/kWh</span>
                                        </div>
                                        <div className="bg-slate-800/60 border border-slate-700 px-3 py-1.5 rounded-lg">
                                            <span className="text-slate-400">Tarif Injecție: </span>
                                            <span className="font-bold text-slate-200">{selectedCommunity.export_tariff.toFixed(2)} RON/kWh</span>
                                        </div>
                                        <div className="bg-sky-950/40 border border-sky-800/50 px-3 py-1.5 rounded-lg">
                                            <span className="text-slate-400">Algoritm ANRE: </span>
                                            <span className="font-bold text-[#DBE200]">
                                                {SHARING_ALGORITHMS.find(a => a.id === normalizeAlgorithmId(selectedCommunity.default_algorithm))?.shortName || selectedCommunity.default_algorithm}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Community Actions */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                    <button 
                                        onClick={openEditCommunityModal}
                                        className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <i className="fa-solid fa-pen-to-square text-[#DBE200]"></i>
                                        <span>Editează Comunitate & Zonă</span>
                                    </button>

                                    <button 
                                        onClick={() => setShowAddMember(true)}
                                        className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 transition-all"
                                    >
                                        <i className="fa-solid fa-plus-circle"></i>
                                        <span>Adaugă Loc Producție/Consum</span>
                                    </button>
                                </div>
                            </div>

                            {/* Aggregates */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
                                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Membri</span>
                                    <div className="text-xl font-extrabold text-white mt-1">{selectedCommunity.members_count} puncte</div>
                                    <span className="text-[10px] text-slate-500">în rețea</span>
                                </div>

                                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[11px] text-amber-400 uppercase font-semibold">Sisteme Producție</span>
                                    <div className="text-xl font-extrabold text-amber-300 mt-1">{selectedCommunity.production_systems_count} centrale</div>
                                    <span className="text-[10px] text-slate-500">doar generare (0% cotă)</span>
                                </div>

                                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[11px] text-emerald-400 uppercase font-semibold">Prosumatori</span>
                                    <div className="text-xl font-extrabold text-emerald-300 mt-1">{selectedCommunity.prosumers_count} locuri</div>
                                    <span className="text-[10px] text-slate-500">prod + consum</span>
                                </div>

                                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[11px] text-purple-400 uppercase font-semibold">Stocare BESS</span>
                                    <div className="text-xl font-extrabold text-purple-300 mt-1">{selectedCommunity.storage_systems_count || 0} sisteme</div>
                                    <span className="text-[10px] text-slate-500">baterii (0% cotă)</span>
                                </div>

                                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[11px] text-sky-400 uppercase font-semibold">Capacitate Totală</span>
                                    <div className="text-xl font-extrabold text-sky-300 mt-1">{selectedCommunity.total_capacity_kwp} kWp</div>
                                    <span className="text-[10px] text-slate-500">putere fotovoltaică</span>
                                </div>

                                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-[#DBE200] uppercase font-semibold">Cote Consum (Alg. B)</span>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowAlgorithmsGuide(true)}
                                            title="Deschide Ghidul Algoritmilor de Partajare ANRE"
                                            className="text-slate-400 hover:text-[#DBE200] text-xs transition-colors"
                                        >
                                            <i className="fa-solid fa-circle-question"></i>
                                        </button>
                                    </div>
                                    <div className="text-xl font-extrabold text-white mt-1">
                                        {(selectedCommunity.total_allocated_share_pct || 0).toFixed(1)}% <span className="text-xs font-normal text-slate-400">/ 100%</span>
                                    </div>
                                    <span className={`text-[10px] font-medium ${(selectedCommunity.remaining_share_pct || 0) <= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        Disponibil: {(selectedCommunity.remaining_share_pct != null ? selectedCommunity.remaining_share_pct : 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Members List Table */}
                        <div className="glass-panel p-6 rounded-2xl">
                            {(() => {
                                const allMembers = selectedCommunity?.members || [];
                                const activeCount = allMembers.filter(m => isMemberActiveInSelectedPeriod(m)).length;
                                const inactiveCount = allMembers.length - activeCount;
                                const filteredMembers = allMembers.filter(m => {
                                    const isActive = isMemberActiveInSelectedPeriod(m);
                                    if (memberFilter === 'active') return isActive;
                                    if (memberFilter === 'inactive') return !isActive;
                                    return true;
                                });

                                return (
                                    <>
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                                            <div>
                                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                                    <i className="fa-solid fa-users-viewfinder text-emerald-400"></i>
                                                    <span>Punctele de Producție și de Consum ale Comunității</span>
                                                </h3>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    Patru tipuri: Sistem de Producție (generare), Prosumator (generare + consum), Consumator (consum pur) și Sistem Stocare BESS (baterii încărcare/descărcare).
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3">
                                                {/* Filter buttons for active / inactive */}
                                                <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setMemberFilter('all')}
                                                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                                                            memberFilter === 'all' 
                                                                ? 'bg-[#0B7A75] text-white shadow-sm' 
                                                                : 'text-slate-400 hover:text-white'
                                                        }`}
                                                    >
                                                        Toți ({allMembers.length})
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setMemberFilter('active')}
                                                        className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                                                            memberFilter === 'active' 
                                                                ? 'bg-emerald-600 text-white shadow-sm' 
                                                                : 'text-slate-400 hover:text-white'
                                                        }`}
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                                                        <span>Doar Activi ({activeCount})</span>
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setMemberFilter('inactive')}
                                                        className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                                                            memberFilter === 'inactive' 
                                                                ? 'bg-amber-600/90 text-white shadow-sm' 
                                                                : 'text-slate-400 hover:text-white'
                                                        }`}
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-amber-300"></span>
                                                        <span>Inactivi / Ieșiți ({inactiveCount})</span>
                                                    </button>
                                                </div>

                                                <button 
                                                    onClick={() => setShowAddMember(true)}
                                                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition-colors"
                                                >
                                                    <i className="fa-solid fa-plus text-emerald-400"></i>
                                                    <span>Adaugă Membru Nou</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                                                        <th className="py-3 px-4">Denumire & Adresă</th>
                                                        <th className="py-3 px-4">Cod POD</th>
                                                        <th className="py-3 px-4">Tip Membru</th>
                                                        <th className="py-3 px-4">Perioadă Apartenență</th>
                                                        <th className="py-3 px-4">Status în {selectedMonth > 0 ? MONTH_NAMES[selectedMonth] : 'An'} {selectedYear}</th>
                                                        <th className="py-3 px-4">Capacitate Inst.</th>
                                                        <th className="py-3 px-4">Putere Contractată</th>
                                                        <th className="py-3 px-4" title="Cotă procentuală fixă utilizată în Algoritmul B (ANRE)">Cotă Fixă Alg. B (%)</th>
                                                        <th className="py-3 px-4 text-right">Acțiuni</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/60">
                                                    {filteredMembers.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="9" className="py-8 text-center text-slate-400 text-xs">
                                                                {memberFilter === 'active' ? 'Nu există membri activi în această lună/an.' :
                                                                 memberFilter === 'inactive' ? 'Nu există membri inactivi în această lună/an.' :
                                                                 'Nu există niciun membru în această comunitate.'}
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredMembers.map(m => {
                                                            const sYr = m.start_year || 2025;
                                                            const sMo = m.start_month || 1;
                                                            const isActiveNow = isMemberActiveInSelectedPeriod(m);

                                                            return (
                                                                <tr key={m.id} className={`hover:bg-slate-800/30 transition-colors ${!isActiveNow ? 'opacity-65' : ''}`}>
                                                                    <td className="py-3.5 px-4">
                                                                        <div className="font-bold text-slate-100 text-sm">{m.name}</div>
                                                                        <div className="text-[11px] text-slate-400 mt-0.5">{m.address || 'Fără adresă menționată'}</div>
                                                                    </td>
                                                                    <td className="py-3.5 px-4 font-mono text-emerald-400 font-semibold">
                                                                        {m.code_pod}
                                                                    </td>
                                                                    <td className="py-3.5 px-4">
                                                                        {renderMemberBadge(m.member_type)}
                                                                    </td>
                                                                    <td className="py-3.5 px-4 text-slate-300">
                                                                        <div className="font-medium text-xs">
                                                                            {String(sMo).padStart(2, '0')}/{sYr}
                                                                            {' – '}
                                                                            {m.end_year ? (
                                                                                <span className="text-amber-300 font-semibold">{String(m.end_month).padStart(2, '0')}/{m.end_year} (Ieșit)</span>
                                                                            ) : (
                                                                                <span className="text-emerald-400 font-semibold">Prezent</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3.5 px-4">
                                                                        {isActiveNow ? (
                                                                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1.5 shadow-sm">
                                                                                <i className="fa-solid fa-circle-check text-[10px]"></i>
                                                                                <span>Activ în calcul</span>
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1.5 shadow-sm" title="Nu participă la partajare în această lună">
                                                                                <i className="fa-solid fa-clock-rotate-left text-[10px]"></i>
                                                                                <span>Inactiv în lună</span>
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                                                                        {m.installed_capacity_kw > 0 ? (
                                                                            <span className="text-amber-400">{m.installed_capacity_kw.toFixed(1)} kWp</span>
                                                                        ) : (
                                                                            <span className="text-slate-500">—</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-3.5 px-4 text-slate-300">
                                                                        {m.contracted_power_kw > 0 ? `${m.contracted_power_kw.toFixed(1)} kW` : '—'}
                                                                    </td>
                                                                    <td className="py-3.5 px-4 font-semibold">
                                                                        {(m.member_type === 'sistem_productie' || m.member_type === 'stocare_bess') ? (
                                                                            <span className="text-slate-500 font-normal text-[11px]" title="Instalațiile de producție și stocare BESS nu au alocat un procent de consum conform ANRE">
                                                                                0% <span className="opacity-75 text-[10px]">(fără cotă consum)</span>
                                                                            </span>
                                                                        ) : m.share_percentage > 0 ? (
                                                                            <span className="text-sky-400 font-mono">{m.share_percentage.toFixed(1)}%</span>
                                                                        ) : (
                                                                            <span className="text-slate-500">0%</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-3.5 px-4 text-right">
                                                                        <div className="flex items-center justify-end gap-1.5">
                                                                            <button 
                                                                                onClick={() => openEditMemberModal(m)}
                                                                                title="Editează acest membru (tip, capacitate, cotă %, marcare inactiv)"
                                                                                className="p-2 rounded-lg bg-slate-800 hover:bg-[#0B7A75]/40 text-slate-300 hover:text-[#DBE200] border border-slate-700 hover:border-[#0B7A75] transition-colors text-xs"
                                                                            >
                                                                                <i className="fa-solid fa-pen-to-square"></i>
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => handleDeleteMember(m.id, m.name)}
                                                                                title="Șterge acest loc din comunitate"
                                                                                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-colors text-xs"
                                                                            >
                                                                                <i className="fa-solid fa-trash-can"></i>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* ============================================================ */}
                {/* TAB 2: ÎNCĂRCARE CURBE & DATE LUNARE (CSV / CURVE FILES) */}
                {/* ============================================================ */}
                {activeTab === 'upload' && selectedCommunity && (
                    <div className="space-y-6">
                        {/* File Upload Box */}
                        <div className="glass-panel p-6 rounded-2xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <i className="fa-solid fa-file-arrow-up text-emerald-400"></i>
                                        <span>Încărcare Fișiere Lunare cu Curbele de Producție / Consum</span>
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Încarcă fișierul CSV cu curbele de producție și consum pe intervale de 15 minute pentru toți membrii comunității: <strong className="text-slate-200">{selectedCommunity.name}</strong>.
                                    </p>
                                </div>

                                {/* Actions: Download Template & Download Exported Curves */}
                                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] text-slate-400">An:</span>
                                        <select 
                                            value={selectedYear} 
                                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                            className="px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                                        >
                                            <option value={2026}>2026</option>
                                            <option value={2025}>2025</option>
                                            <option value={2024}>2024</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] text-slate-400">Luna:</span>
                                        <select 
                                            value={selectedMonth === 0 ? 7 : selectedMonth} 
                                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                            className="px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                                        >
                                            {MONTH_NAMES.slice(1).map((mName, idx) => (
                                                <option key={idx + 1} value={idx + 1}>{mName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <a 
                                        href={`/api/communities/${selectedCommunity.id}/template-csv?year=${selectedYear}&month=${selectedMonth === 0 ? 7 : selectedMonth}`}
                                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-[#0B7A75]/40 text-[#DBE200] hover:text-white border border-[#0B7A75]/50 font-bold text-xs flex items-center gap-1.5 transition-colors"
                                        title="Descarcă șablonul CSV cu 96 de intervale pe zi pentru toți membrii din comunitate"
                                    >
                                        <i className="fa-solid fa-file-arrow-down"></i>
                                        <span>Șablon CSV</span>
                                    </a>
                                    <a 
                                        href={`/api/communities/${selectedCommunity.id}/export-curves?year=${selectedYear}&month=${selectedMonth === 0 ? 7 : selectedMonth}`}
                                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/50 font-bold text-xs flex items-center gap-1.5 transition-colors"
                                        title="Descarcă curbele de sarcină de 15 minute salvate anterior pentru această lună"
                                    >
                                        <i className="fa-solid fa-download"></i>
                                        <span>Descarcă Curbele Înregistrate</span>
                                    </a>
                                </div>
                            </div>

                            {/* Upload Area */}
                            <form onSubmit={handleFileUpload} className="mt-6 space-y-4">
                                {/* Upload Period Selector (Year and Month) */}
                                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <i className="fa-solid fa-calendar-check text-[#DBE200]"></i>
                                        <span className="text-xs font-semibold text-slate-200">
                                            Perioadă Destinație pentru Fișierul Încărcat:
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-slate-400">An:</span>
                                            <select 
                                                value={uploadYear} 
                                                onChange={(e) => setUploadYear(parseInt(e.target.value))}
                                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold outline-none focus:border-emerald-500"
                                            >
                                                <option value={2026}>2026</option>
                                                <option value={2025}>2025</option>
                                                <option value={2024}>2024</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-slate-400">Luna:</span>
                                            <select 
                                                value={uploadMonth} 
                                                onChange={(e) => setUploadMonth(parseInt(e.target.value))}
                                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold outline-none focus:border-emerald-500"
                                            >
                                                {MONTH_NAMES.slice(1).map((mName, idx) => (
                                                    <option key={idx + 1} value={idx + 1}>{mName}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 border-2 border-dashed border-slate-700 hover:border-[#DBE200]/60 rounded-2xl bg-slate-900/40 text-center transition-all">
                                    <i className="fa-solid fa-cloud-arrow-up text-4xl text-[#DBE200] mb-3"></i>
                                    <p className="text-sm font-semibold text-slate-200">
                                        Selectați fișierul CSV cu curbele de sarcină pe intervale de 15 minute
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1 max-w-xl mx-auto">
                                        Format matriceal: Un fișier pe o lună conține 96 intervale/zi pentru toți membrii comunității. Coloane: <code className="text-[#DBE200] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[11px]">timestamp, data, ora, interval_zi, [COD_POD]_productie_kwh, [COD_POD]_consum_kwh, ...</code>
                                    </p>

                                    <div className="mt-4 flex justify-center">
                                        <input 
                                            type="file" 
                                            accept=".csv,.txt"
                                            onChange={(e) => setUploadFile(e.target.files[0])}
                                            className="text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500 hover:file:text-slate-950 cursor-pointer"
                                        />
                                    </div>

                                    {uploadFile && (
                                        <div className="mt-3 text-xs text-emerald-400 font-medium">
                                            Fișier selectat: <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024).toFixed(1)} KB)
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button 
                                        type="submit"
                                        disabled={!uploadFile || isUploading}
                                        className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40"
                                    >
                                        <i className={`fa-solid ${isUploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                                        <span>{isUploading ? 'Se procesează fișierul...' : 'Încarcă & Salvează Curbele'}</span>
                                    </button>
                                </div>
                            </form>

                            {/* Upload Summary Alert */}
                            {uploadSummary && (
                                <div className="mt-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs">
                                    <div className="flex items-center gap-2 text-emerald-300 font-bold mb-1">
                                        <i className="fa-solid fa-circle-check"></i>
                                        <span>{uploadSummary.message}</span>
                                    </div>
                                    <p className="text-slate-400">
                                        Fișier: {uploadSummary.filename} • Rânduri: {uploadSummary.rows_imported} • Membri actualizați: {uploadSummary.members_updated}
                                    </p>
                                    {uploadSummary.warnings && uploadSummary.warnings.length > 0 && (
                                        <div className="mt-2 text-amber-400 space-y-0.5">
                                            {uploadSummary.warnings.map((w, idx) => (
                                                <div key={idx}>⚠️ {w}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Current Monthly Data Table */}
                        <div className="glass-panel p-6 rounded-2xl">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                        <i className="fa-solid fa-table-list text-emerald-400"></i>
                                        <span>Curbe & Date Înregistrate în Baza de Date</span>
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Datele de producție și consum folosite ca bază pentru algoritmii de partajare
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">An:</span>
                                        <select 
                                            value={selectedYear} 
                                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                                        >
                                            <option value={2026}>2026</option>
                                            <option value={2025}>2025</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">Luna:</span>
                                        <select 
                                            value={selectedMonth} 
                                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                                        >
                                            {MONTH_NAMES.map((name, idx) => (
                                                <option key={idx} value={idx}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                                            <th className="py-2.5 px-3">Luna</th>
                                            <th className="py-2.5 px-3">Membru</th>
                                            <th className="py-2.5 px-3">Cod POD</th>
                                            <th className="py-2.5 px-3">Tip Membru</th>
                                            <th className="py-2.5 px-3">Producție (kWh)</th>
                                            <th className="py-2.5 px-3">Consum (kWh)</th>
                                            <th className="py-2.5 px-3">Sursă Date</th>
                                            <th className="py-2.5 px-3">Balanță Netă</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {monthlyData.map(r => {
                                            const net = r.production_kwh - r.consumption_kwh;
                                            return (
                                                <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="py-3 px-3 font-semibold text-slate-300">
                                                        {MONTH_NAMES[r.month]} {r.year}
                                                    </td>
                                                    <td className="py-3 px-3 font-bold text-slate-100">
                                                        {r.member_name}
                                                    </td>
                                                    <td className="py-3 px-3 font-mono text-emerald-400">
                                                        {r.code_pod}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        {renderMemberBadge(r.member_type)}
                                                    </td>
                                                    <td className="py-3 px-3 font-bold text-amber-400">
                                                        {r.production_kwh.toFixed(1)} kWh
                                                    </td>
                                                    <td className="py-3 px-3 font-bold text-orange-400">
                                                        {r.consumption_kwh.toFixed(1)} kWh
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-slate-300 font-mono text-[10px] truncate max-w-[130px]" title={r.curve_source}>
                                                                {r.curve_source || 'manual'}
                                                            </span>
                                                            {r.has_hourly_curve ? (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#0B7A75]/30 text-emerald-300 border border-[#0B7A75]/50 inline-flex items-center gap-1 w-max">
                                                                    <i className="fa-solid fa-chart-line"></i> 15 min (Real)
                                                                </span>
                                                            ) : (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] text-slate-400 bg-slate-800 border border-slate-700/80 inline-flex items-center gap-1 w-max">
                                                                    Simulat
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 font-bold">
                                                        {net >= 0 ? (
                                                            <span className="text-emerald-400">+{net.toFixed(1)} kWh (Surplus)</span>
                                                        ) : (
                                                            <span className="text-rose-400">{net.toFixed(1)} kWh (Deficit)</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================ */}
                {/* TAB 3: RULARE ALGORITM DE PARTAJARE A ENERGIEI */}
                {/* ============================================================ */}
                {activeTab === 'sharing' && selectedCommunity && (
                    <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-2xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <i className="fa-solid fa-microchip text-emerald-400"></i>
                                        <span>Rulare Algoritm de Partajare a Energiei</span>
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Simulează algoritmul ales pe baza curbelor încărcate pentru: <strong className="text-slate-200">{selectedCommunity.name}</strong>.
                                    </p>
                                </div>

                                <button 
                                    onClick={handleRunSharingAlgorithm}
                                    disabled={isRunningAlgorithm}
                                    className="py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
                                >
                                    <i className={`fa-solid ${isRunningAlgorithm ? 'fa-spinner fa-spin' : 'fa-play'}`}></i>
                                    <span>{isRunningAlgorithm ? 'Se calculează partajarea...' : 'Rulează Algoritmul'}</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                                {/* Algorithm options */}
                                <div className="md:col-span-2 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[#DBE200] flex items-center gap-1.5">
                                            <i className="fa-solid fa-stamp"></i>
                                            <span>Algoritmi de Alocare Recunoscuți de ANRE:</span>
                                        </label>
                                        <button 
                                            type="button"
                                            onClick={() => setShowAlgorithmsGuide(true)}
                                            className="px-2.5 py-1 rounded-lg bg-[#0B7A75]/30 hover:bg-[#0B7A75]/60 text-emerald-300 border border-[#0B7A75]/60 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                                        >
                                            <i className="fa-solid fa-book-open text-xs"></i>
                                            <span>Ghid & Reglementări ANRE</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {SHARING_ALGORITHMS.map(algo => (
                                            <div 
                                                key={algo.id}
                                                onClick={() => setSelectedAlgorithm(algo.id)}
                                                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                                                    selectedAlgorithm === algo.id 
                                                        ? 'bg-[#0B7A75]/25 border-[#DBE200] shadow-lg shadow-[#0B7A75]/15' 
                                                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center ${
                                                                selectedAlgorithm === algo.id 
                                                                    ? 'bg-[#DBE200] text-slate-950 font-black' 
                                                                    : 'bg-slate-800 text-slate-400'
                                                            }`}>
                                                                {algo.letter}
                                                            </div>
                                                            <span className="font-bold text-xs text-white leading-snug">{algo.shortName}</span>
                                                        </div>
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0B7A75]/30 text-emerald-300 border border-[#0B7A75]/50 whitespace-nowrap">
                                                            {algo.badge}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-300 mt-2.5 leading-relaxed">
                                                        {algo.desc}
                                                    </p>
                                                </div>
                                                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                                                    <span className={`font-semibold ${selectedAlgorithm === algo.id ? 'text-[#DBE200]' : 'text-slate-500'}`}>
                                                        {selectedAlgorithm === algo.id ? '✓ Algoritm Selectat' : 'Apasă pentru selectare'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono">15 min</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedAlgorithm === 'anre_algorithm_b' && (
                                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2 animate-fade-in">
                                            <div className="flex items-start gap-2.5">
                                                <i className="fa-solid fa-circle-info text-amber-400 mt-0.5 text-sm shrink-0"></i>
                                                <div>
                                                    <strong>Reguli Algoritmul B (ANRE):</strong> Alocarea energiei electrice livrate în rețea se realizează pe fiecare interval de decontare (15 minute) în procent fix pentru fiecare loc de consum.
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-amber-500/20 text-slate-300">
                                                <div>
                                                    • <strong>Instalațiile de producție & BESS:</strong> nu au cotă de consum alocată (0%).
                                                </div>
                                                <div>
                                                    • <strong>Plafon comunitar 100%:</strong> Alocat: <span className="font-bold text-[#DBE200]">{(selectedCommunity.total_allocated_share_pct || 0).toFixed(1)}%</span> (Disponibil: <span className="font-bold text-emerald-400">{(selectedCommunity.remaining_share_pct != null ? selectedCommunity.remaining_share_pct : 100).toFixed(1)}%</span>).
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Period */}
                                <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Perioada de Calcul:
                                    </label>
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-1">Anul:</label>
                                        <select 
                                            value={selectedYear} 
                                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold outline-none"
                                        >
                                            <option value={2026}>2026</option>
                                            <option value={2025}>2025</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-1">Luna:</label>
                                        <select 
                                            value={selectedMonth} 
                                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold outline-none"
                                        >
                                            {MONTH_NAMES.map((mName, idx) => (
                                                <option key={idx} value={idx}>{mName}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800 space-y-1">
                                        <div className="flex justify-between">
                                            <span>Tarif Partajare Intern:</span>
                                            <span className="font-bold text-emerald-400">{selectedCommunity.internal_tariff} RON</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Tarif Rețea Standard:</span>
                                            <span className="font-bold text-slate-300">{selectedCommunity.grid_tariff} RON</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Algorithm Results */}
                        {algorithmResult && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                    <div className="glass-card p-4 rounded-xl">
                                        <span className="text-[11px] font-semibold uppercase text-slate-400">Total Generat</span>
                                        <div className="text-2xl font-black text-amber-400 mt-1">
                                            {algorithmResult.total_production_kwh.toFixed(1)} <span className="text-xs font-normal">kWh</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">producție fotovoltaică</p>
                                    </div>

                                    <div className="glass-card p-4 rounded-xl">
                                        <span className="text-[11px] font-semibold uppercase text-slate-400">Total Consum</span>
                                        <div className="text-2xl font-black text-orange-400 mt-1">
                                            {algorithmResult.total_consumption_kwh.toFixed(1)} <span className="text-xs font-normal">kWh</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">necesar total</p>
                                    </div>

                                    <div className="glass-card p-4 rounded-xl border-emerald-500/30 bg-emerald-950/20">
                                        <span className="text-[11px] font-semibold uppercase text-emerald-400">Energie Verde Partajată</span>
                                        <div className="text-2xl font-black text-emerald-300 mt-1">
                                            {algorithmResult.total_shared_kwh.toFixed(1)} <span className="text-xs font-normal">kWh</span>
                                        </div>
                                        <p className="text-[10px] text-emerald-400/80 mt-1">schimb comunitar</p>
                                    </div>

                                    <div className="glass-card p-4 rounded-xl border-[#DBE200]/40 bg-[#DBE200]/10 shadow-lg shadow-[#DBE200]/5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#DBE200]">Producție Partajată</span>
                                            <i className="fa-solid fa-percent text-xs text-[#DBE200]"></i>
                                        </div>
                                        <div className="text-2xl font-black text-[#DBE200] mt-1">
                                            {(algorithmResult.shared_from_production_pct || 0).toFixed(1)}%
                                        </div>
                                        <p className="text-[10px] text-slate-300 mt-1">din producție alocată</p>
                                    </div>

                                    <div className="glass-card p-4 rounded-xl">
                                        <span className="text-[11px] font-semibold uppercase text-teal-400">Grad Autoconsum Colectiv</span>
                                        <div className="text-2xl font-black text-teal-300 mt-1">
                                            {algorithmResult.self_sufficiency_rate_pct.toFixed(1)}%
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">acoperit local</p>
                                    </div>

                                    <div className="glass-card p-4 rounded-xl border-sky-500/30 bg-sky-950/20">
                                        <span className="text-[11px] font-semibold uppercase text-sky-400">Economie Totală Comunitate</span>
                                        <div className="text-2xl font-black text-sky-300 mt-1">
                                            {algorithmResult.total_savings_ron.toFixed(2)} <span className="text-xs font-normal">RON</span>
                                        </div>
                                        <p className="text-[10px] text-sky-400/80 mt-1">față de rețea</p>
                                    </div>
                                </div>

                                {/* Information Banner on 15-min Intervals & Active Members */}
                                <div className="p-4 rounded-xl bg-[#202022] border border-[#0B7A75]/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2 text-slate-200">
                                        <i className="fa-solid fa-clock text-[#DBE200] text-sm"></i>
                                        <span>
                                            <strong className="text-white">Rezoluție de Calcul:</strong> {algorithmResult.calculation_resolution || "Intervale de 15 minute (96/zi)"}
                                        </span>
                                        <span className="text-slate-500">•</span>
                                        <span>
                                            <strong className="text-white">Membri Activi în {selectedMonth > 0 ? MONTH_NAMES[selectedMonth] : 'An'}:</strong>{' '}
                                            <span className="text-[#DBE200] font-bold">{algorithmResult.active_members_count}</span> din {algorithmResult.total_members_count}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-[#93A29B]">Zonă Distribuție:</span>
                                        <span className="px-2.5 py-0.5 rounded bg-[#0B7A75]/30 text-[#DBE200] border border-[#0B7A75]/50 font-bold text-[11px]">
                                            {algorithmResult.distribution_zone_name || selectedCommunity.zone_details?.name}
                                        </span>
                                    </div>
                                </div>

                                {/* 15-Minute Load & Sharing Curve Chart (96 intervals / 24h) */}
                                {algorithmResult.daily_15min_profile && (
                                    <div className="glass-panel p-6 rounded-2xl">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                            <div>
                                                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                                    <i className="fa-solid fa-chart-line text-[#DBE200]"></i>
                                                    <span>Curba de Sarcină & Partajare pe Intervale de 15 Minute (96 intervale / zi)</span>
                                                </h3>
                                                <p className="text-[11px] text-[#93A29B] mt-0.5">
                                                    Profil energetic mediu 24h (00:00 – 23:45) simulat pe intervale de 15 minute conform metodologiei ANRE
                                                </p>
                                            </div>
                                            <span className="text-[11px] font-mono font-semibold text-[#DBE200] bg-[#202022] border border-[#DBE200]/30 px-3 py-1 rounded-lg self-start sm:self-auto">
                                                Rezoluție: 15 min (96 puncte/zi)
                                            </span>
                                        </div>
                                        <div className="h-80 w-full relative">
                                            <canvas ref={curve15MinChartRef}></canvas>
                                        </div>
                                    </div>
                                )}

                                <div className="glass-panel p-6 rounded-2xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                            <i className="fa-solid fa-chart-column text-emerald-400"></i>
                                            <span>Bilanț Energetic pe Fiecare Membru (kWh)</span>
                                        </h3>
                                        <span className="text-xs font-mono text-slate-400 bg-slate-800 px-3 py-1 rounded-lg">
                                            Algoritm: {algorithmResult.algorithm_name_ro}
                                        </span>
                                    </div>
                                    <div className="h-72 w-full relative">
                                        <canvas ref={sharingChartRef}></canvas>
                                    </div>
                                </div>

                                <div className="glass-panel p-6 rounded-2xl">
                                    <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                                        <i className="fa-solid fa-table-cells text-emerald-400"></i>
                                        <span>Tabel Detaliat Rezultate Partajare & Decontare Financiară</span>
                                    </h3>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                                                    <th className="py-3 px-3">Membru</th>
                                                    <th className="py-3 px-3">Status</th>
                                                    <th className="py-3 px-3">Tip</th>
                                                    <th className="py-3 px-3">Producție</th>
                                                    <th className="py-3 px-3">Consum</th>
                                                    <th className="py-3 px-3">Autoconsum</th>
                                                    <th className="py-3 px-3">Primit Partajat</th>
                                                    <th className="py-3 px-3">% din Producție</th>
                                                    <th className="py-3 px-3">Cedat Partajat</th>
                                                    <th className="py-3 px-3">Rămas din Rețea</th>
                                                    <th className="py-3 px-3">Grad Acoperire</th>
                                                    <th className="py-3 px-3 text-right">Economie Netă (RON)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/60">
                                                {algorithmResult.members_results.map(m => (
                                                    <tr key={m.member_id} className={`hover:bg-slate-800/30 transition-colors ${!m.is_active ? 'opacity-55 bg-slate-900/40' : ''}`}>
                                                        <td className="py-3 px-3">
                                                            <div className="font-bold text-slate-100">{m.name}</div>
                                                            <div className="font-mono text-[10px] text-slate-400">{m.code_pod}</div>
                                                            {m.membership_period && (
                                                                <div className="text-[10px] text-[#93A29B]">{m.membership_period}</div>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            {m.is_active ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                                                                    <i className="fa-solid fa-circle-check text-[9px]"></i>
                                                                    <span>Activ</span>
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1" title="Inactiv în luna selectată">
                                                                    <i className="fa-solid fa-ban text-[9px]"></i>
                                                                    <span>Inactiv în lună</span>
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            {renderMemberBadge(m.member_type)}
                                                        </td>
                                                        <td className="py-3 px-3 font-semibold text-amber-400">
                                                            {m.production_kwh > 0 ? `${m.production_kwh.toFixed(1)} kWh` : '—'}
                                                        </td>
                                                        <td className="py-3 px-3 font-semibold text-orange-400">
                                                            {m.consumption_kwh > 0 ? `${m.consumption_kwh.toFixed(1)} kWh` : '—'}
                                                        </td>
                                                        <td className="py-3 px-3 font-medium text-emerald-400">
                                                            {m.self_consumed_kwh > 0 ? `${m.self_consumed_kwh.toFixed(1)} kWh` : '—'}
                                                        </td>
                                                        <td className="py-3 px-3 font-bold text-cyan-400">
                                                            {m.energy_received_kwh > 0 ? `+${m.energy_received_kwh.toFixed(1)} kWh` : '—'}
                                                        </td>
                                                        <td className="py-3 px-3 font-bold text-[#DBE200]">
                                                            {m.is_active && m.share_of_production_pct > 0 ? `${m.share_of_production_pct.toFixed(1)}%` : '—'}
                                                        </td>
                                                        <td className="py-3 px-3 font-medium text-purple-400">
                                                            {m.energy_shared_out_kwh > 0 ? `-${m.energy_shared_out_kwh.toFixed(1)} kWh` : '—'}
                                                        </td>
                                                        <td className="py-3 px-3 font-medium text-rose-400">
                                                            {m.grid_import_kwh > 0 ? `${m.grid_import_kwh.toFixed(1)} kWh` : '0 kWh'}
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            {m.is_active && m.consumption_kwh > 0 ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-emerald-400">{m.coverage_rate_pct.toFixed(0)}%</span>
                                                                    <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                                        <div 
                                                                            className="h-full bg-emerald-500 rounded-full" 
                                                                            style={{ width: `${Math.min(100, m.coverage_rate_pct)}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-500">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-3 text-right">
                                                            {m.is_active ? (
                                                                <span className="font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md text-xs">
                                                                    +{m.savings_ron.toFixed(2)} RON
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-500 font-mono text-xs">
                                                                    0.00 RON
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ============================================================ */}
            {/* MODAL: CREARE COMUNITATE (CU STADIU ANRE) */}
            {/* ============================================================ */}
            {showCreateCommunity && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button 
                            onClick={() => setShowCreateCommunity(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
                        >
                            &times;
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
                                <i className="fa-solid fa-plus-circle"></i>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base">Creare Comunitate Nouă de Energie</h3>
                                <p className="text-xs text-slate-400">Include evidența stadiului înregistrării la ANRE</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateCommunitySubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Denumire Comunitate:</label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="ex: Comunitatea Solară Transilvania"
                                    value={newCommunity.name}
                                    onChange={(e) => setNewCommunity({...newCommunity, name: e.target.value})}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Cod Identificare:</label>
                                    <input 
                                        type="text"
                                        required
                                        placeholder="ex: CER-BV-01"
                                        value={newCommunity.code}
                                        onChange={(e) => setNewCommunity({...newCommunity, code: e.target.value})}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Locație (Oraș / Comună):</label>
                                    <input 
                                        type="text"
                                        required
                                        placeholder="ex: Brașov"
                                        value={newCommunity.location}
                                        onChange={(e) => setNewCommunity({...newCommunity, location: e.target.value})}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* ZONA DE DISTRIBUȚIE */}
                            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-[#0B7A75]/40 space-y-2">
                                <label className="block text-xs font-bold text-[#DBE200] flex items-center gap-1.5">
                                    <i className="fa-solid fa-tower-broadcast"></i>
                                    <span>Zonă de Distribuție (Operator & Județe Eligibile):</span>
                                </label>
                                <p className="text-[11px] text-slate-400">
                                    Conform legislației, o comunitate poate include exclusiv membri conectați în aceeași zonă de distribuție.
                                </p>
                                <select 
                                    value={newCommunity.distribution_zone}
                                    onChange={(e) => setNewCommunity({...newCommunity, distribution_zone: e.target.value})}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-600 text-white text-xs font-semibold outline-none focus:border-emerald-500"
                                >
                                    {DISTRIBUTION_ZONES.map(z => (
                                        <option key={z.id} value={z.id}>
                                            {z.name} — {z.operator} ({z.region_label})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* ANRE STATUS FIELD */}
                            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                                        <i className="fa-solid fa-stamp"></i>
                                        <span>Stadiul Înregistrării la ANRE în Registrul Comunităților:</span>
                                    </label>
                                    <select 
                                        value={newCommunity.anre_status}
                                        onChange={(e) => setNewCommunity({...newCommunity, anre_status: e.target.value})}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-600 text-white text-xs font-semibold outline-none focus:border-emerald-500"
                                    >
                                        {ANRE_STATUSES.map(s => (
                                            <option key={s.id} value={s.id}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {newCommunity.anre_status === 'inregistrare_admisa' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-emerald-400 mb-1">
                                            Număr de Înregistrare acordat de ANRE:
                                        </label>
                                        <input 
                                            type="text"
                                            required
                                            placeholder="ex: ANRE-CER-2026/042"
                                            value={newCommunity.anre_registration_number}
                                            onChange={(e) => setNewCommunity({...newCommunity, anre_registration_number: e.target.value})}
                                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Tarif Partajare (RON):</label>
                                    <input 
                                        type="number"
                                        required
                                        step="0.01"
                                        value={newCommunity.internal_tariff}
                                        onChange={(e) => setNewCommunity({...newCommunity, internal_tariff: e.target.value})}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Tarif Rețea (RON):</label>
                                    <input 
                                        type="number"
                                        required
                                        step="0.01"
                                        value={newCommunity.grid_tariff}
                                        onChange={(e) => setNewCommunity({...newCommunity, grid_tariff: e.target.value})}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Tarif Injecție (RON):</label>
                                    <input 
                                        type="number"
                                        required
                                        step="0.01"
                                        value={newCommunity.export_tariff}
                                        onChange={(e) => setNewCommunity({...newCommunity, export_tariff: e.target.value})}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Algoritm Implicit:</label>
                                <select 
                                    value={newCommunity.default_algorithm}
                                    onChange={(e) => setNewCommunity({...newCommunity, default_algorithm: e.target.value})}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                                >
                                    {SHARING_ALGORITHMS.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Descriere:</label>
                                <textarea 
                                    rows="2"
                                    placeholder="Scopul comunității, profilul energetic..."
                                    value={newCommunity.description}
                                    onChange={(e) => setNewCommunity({...newCommunity, description: e.target.value})}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                                ></textarea>
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
                            >
                                Salvează Comunitatea
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* MODAL: EDITARE COMUNITATE & STADIU ANRE */}
            {/* ============================================================ */}
            {showEditCommunity && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button 
                            onClick={() => setShowEditCommunity(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
                        >
                            &times;
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
                                <i className="fa-solid fa-pen-to-square"></i>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base">Editare Comunitate & Stadiu ANRE</h3>
                                <p className="text-xs text-slate-400">Cod: {selectedCommunity?.code}</p>
                            </div>
                        </div>

                        <form onSubmit={handleEditCommunitySubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Denumire:</label>
                                <input 
                                    type="text"
                                    required
                                    value={editCommunityForm.name}
                                    onChange={(e) => setEditCommunityForm({...editCommunityForm, name: e.target.value})}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Locație (Oraș / Comună):</label>
                                <input 
                                    type="text"
                                    value={editCommunityForm.location}
                                    onChange={(e) => setEditCommunityForm({...editCommunityForm, location: e.target.value})}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                                />
                            </div>

                            {/* ZONA DE DISTRIBUȚIE */}
                            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-[#0B7A75]/40 space-y-1.5">
                                <label className="block text-xs font-bold text-[#DBE200] flex items-center gap-1.5">
                                    <i className="fa-solid fa-tower-broadcast"></i>
                                    <span>Zonă de Distribuție (Operator & Regiune):</span>
                                </label>
                                <p className="text-[11px] text-slate-400">
                                    Operatorul de rețea la care sunt arondate toate locurile de consum și producție din această comunitate.
                                </p>
                                <select 
                                    value={editCommunityForm.distribution_zone}
                                    onChange={(e) => setEditCommunityForm({...editCommunityForm, distribution_zone: e.target.value})}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-600 text-white text-xs font-semibold outline-none focus:border-emerald-500"
                                >
                                    {DISTRIBUTION_ZONES.map(z => (
                                        <option key={z.id} value={z.id}>
                                            {z.name} — {z.operator} ({z.region_label})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* ANRE Status */}
                            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                                        <i className="fa-solid fa-stamp"></i>
                                        <span>Stadiul Înregistrării la ANRE în Registrul Comunităților:</span>
                                    </label>
                                    <select 
                                        value={editCommunityForm.anre_status}
                                        onChange={(e) => setEditCommunityForm({...editCommunityForm, anre_status: e.target.value})}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-600 text-white text-xs font-semibold outline-none focus:border-emerald-500"
                                    >
                                        {ANRE_STATUSES.map(s => (
                                            <option key={s.id} value={s.id}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {editCommunityForm.anre_status === 'inregistrare_admisa' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-emerald-400 mb-1">
                                            Număr de Înregistrare acordat de ANRE:
                                        </label>
                                        <input 
                                            type="text"
                                            required
                                            placeholder="ex: ANRE-CER-2025/014"
                                            value={editCommunityForm.anre_registration_number}
                                            onChange={(e) => setEditCommunityForm({...editCommunityForm, anre_registration_number: e.target.value})}
                                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Tarif Partajare:</label>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        value={editCommunityForm.internal_tariff}
                                        onChange={(e) => setEditCommunityForm({...editCommunityForm, internal_tariff: e.target.value})}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Tarif Rețea:</label>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        value={editCommunityForm.grid_tariff}
                                        onChange={(e) => setEditCommunityForm({...editCommunityForm, grid_tariff: e.target.value})}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Tarif Injecție:</label>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        value={editCommunityForm.export_tariff}
                                        onChange={(e) => setEditCommunityForm({...editCommunityForm, export_tariff: e.target.value})}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Algoritm Implicit:</label>
                                <select 
                                    value={editCommunityForm.default_algorithm}
                                    onChange={(e) => setEditCommunityForm({...editCommunityForm, default_algorithm: e.target.value})}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                                >
                                    {SHARING_ALGORITHMS.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Descriere:</label>
                                <textarea 
                                    rows="2"
                                    value={editCommunityForm.description}
                                    onChange={(e) => setEditCommunityForm({...editCommunityForm, description: e.target.value})}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                                ></textarea>
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
                            >
                                Salvează Modificările
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* MODAL: ADĂUGARE PUNCT (MEMBRU) */}
            {/* ============================================================ */}
            {showAddMember && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button 
                            onClick={() => setShowAddMember(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
                        >
                            &times;
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
                                <i className="fa-solid fa-solar-panel"></i>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base">Adaugă Loc Producție / Consum</h3>
                                <p className="text-xs text-slate-400">Comunitate: {selectedCommunity?.name}</p>
                            </div>
                        </div>

                        {/* Distribution Zone Restriction Banner */}
                        {selectedCommunity?.zone_details && (
                            <div className="mb-4 p-3 rounded-xl bg-[#0B7A75]/20 border border-[#0B7A75]/40 text-xs">
                                <div className="flex items-center gap-2 text-[#DBE200] font-bold">
                                    <i className="fa-solid fa-tower-broadcast"></i>
                                    <span>Zonă Distribuție Obligatorie: {selectedCommunity.zone_details.name}</span>
                                </div>
                                <div className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                                    {selectedCommunity.zone_details.operator} — Toate punctele adăugate trebuie să fie situate în județele: <strong className="text-white">{selectedCommunity.zone_details.counties?.join(', ')}</strong>.
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleAddMemberSubmit} className="space-y-4">
                            {/* Member Type Selection (4 types) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-2">
                                    Tipul Membrului (Alege una din cele 4 opțiuni):
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setNewMember({...newMember, member_type: 'sistem_productie'})}
                                        className={`p-3 rounded-xl border text-center transition-all ${
                                            newMember.member_type === 'sistem_productie' 
                                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' 
                                                : 'bg-slate-800 border-slate-700 text-slate-400'
                                        }`}
                                    >
                                        <i className="fa-solid fa-solar-panel block text-lg mb-1"></i>
                                        <span className="text-[11px] block">Sistem Producție</span>
                                        <span className="text-[9px] opacity-75 font-normal block">Doar Generare</span>
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={() => setNewMember({...newMember, member_type: 'prosumator'})}
                                        className={`p-3 rounded-xl border text-center transition-all ${
                                            newMember.member_type === 'prosumator' 
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' 
                                                : 'bg-slate-800 border-slate-700 text-slate-400'
                                        }`}
                                    >
                                        <i className="fa-solid fa-arrows-rotate block text-lg mb-1"></i>
                                        <span className="text-[11px] block">Prosumator</span>
                                        <span className="text-[9px] opacity-75 font-normal block">Prod + Consum</span>
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={() => setNewMember({...newMember, member_type: 'consumator'})}
                                        className={`p-3 rounded-xl border text-center transition-all ${
                                            newMember.member_type === 'consumator' 
                                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold' 
                                                : 'bg-slate-800 border-slate-700 text-slate-400'
                                        }`}
                                    >
                                        <i className="fa-solid fa-house block text-lg mb-1"></i>
                                        <span className="text-[11px] block">Consumator</span>
                                        <span className="text-[9px] opacity-75 font-normal block">Doar Consum</span>
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={() => setNewMember({...newMember, member_type: 'stocare_bess'})}
                                        className={`p-3 rounded-xl border text-center transition-all ${
                                            newMember.member_type === 'stocare_bess' 
                                                ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold' 
                                                : 'bg-slate-800 border-slate-700 text-slate-400'
                                        }`}
                                    >
                                        <i className="fa-solid fa-car-battery block text-lg mb-1"></i>
                                        <span className="text-[11px] block">Stocare BESS</span>
                                        <span className="text-[9px] opacity-75 font-normal block">Baterie / Stocare</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Denumire Punct:</label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="ex: Centrală Solară Sud / Familia Ionescu / Sistem Baterie Nord"
                                    value={newMember.name}
                                    onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Cod POD:</label>
                                    <input 
                                        type="text"
                                        required
                                        placeholder="ex: RO-CJ-POD-010"
                                        value={newMember.code_pod}
                                        onChange={(e) => setNewMember({...newMember, code_pod: e.target.value})}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Adresă:</label>
                                    <input 
                                        type="text"
                                        placeholder="ex: Str. Observatorului 10"
                                        value={newMember.address}
                                        onChange={(e) => setNewMember({...newMember, address: e.target.value})}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                        {newMember.member_type === 'stocare_bess' ? 'Putere Descărcare (kW):' : 'Capacitate Solară (kWp):'}
                                    </label>
                                    <input 
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        disabled={newMember.member_type === 'consumator'}
                                        value={newMember.member_type === 'consumator' ? 0 : newMember.installed_capacity_kw}
                                        onChange={(e) => setNewMember({...newMember, installed_capacity_kw: e.target.value})}
                                        className={`w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold outline-none focus:border-emerald-500 ${
                                            newMember.member_type === 'consumator' ? 'opacity-40 cursor-not-allowed' : ''
                                        }`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                        {newMember.member_type === 'stocare_bess' ? 'Putere Încărcare (kW):' : 'Putere Contractată (kW):'}
                                    </label>
                                    <input 
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        disabled={newMember.member_type === 'sistem_productie'}
                                        value={newMember.member_type === 'sistem_productie' ? 0 : newMember.contracted_power_kw}
                                        onChange={(e) => setNewMember({...newMember, contracted_power_kw: e.target.value})}
                                        className={`w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold outline-none focus:border-emerald-500 ${
                                            newMember.member_type === 'sistem_productie' ? 'opacity-40 cursor-not-allowed' : ''
                                        }`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                        Cotă Consum Alg. B (%):
                                    </label>
                                    <input 
                                        type="number"
                                        min="0"
                                        max={selectedCommunity?.remaining_share_pct != null ? selectedCommunity.remaining_share_pct : 100}
                                        step="0.5"
                                        disabled={newMember.member_type === 'sistem_productie' || newMember.member_type === 'stocare_bess'}
                                        value={(newMember.member_type === 'sistem_productie' || newMember.member_type === 'stocare_bess') ? 0 : newMember.share_percentage}
                                        onChange={(e) => setNewMember({...newMember, share_percentage: e.target.value})}
                                        className={`w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold outline-none focus:border-emerald-500 ${
                                            (newMember.member_type === 'sistem_productie' || newMember.member_type === 'stocare_bess') ? 'opacity-40 cursor-not-allowed' : ''
                                        }`}
                                    />
                                    {(newMember.member_type === 'sistem_productie' || newMember.member_type === 'stocare_bess') ? (
                                        <p className="text-[10px] text-amber-400 mt-1 leading-tight">
                                            Producția & BESS nu au cotă de consum alocată (0%).
                                        </p>
                                    ) : (
                                        <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                                            Disponibil: {(selectedCommunity?.remaining_share_pct != null ? selectedCommunity.remaining_share_pct : 100).toFixed(1)}% (max 100%)
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* PERIOADĂ DE APARTENENȚĂ LA COMUNITATE */}
                            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                                        <i className="fa-solid fa-calendar-plus text-emerald-400"></i>
                                        <span>Perioadă Apartenență la Comunitate:</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-[10px] text-slate-400 block mb-0.5">Luna Intrării (start):</span>
                                            <select
                                                value={newMember.start_month}
                                                onChange={(e) => setNewMember({...newMember, start_month: parseInt(e.target.value)})}
                                                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                                            >
                                                {MONTH_NAMES.slice(1).map((m, idx) => (
                                                    <option key={idx + 1} value={idx + 1}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block mb-0.5">Anul Intrării:</span>
                                            <input 
                                                type="number"
                                                min="2020"
                                                max="2035"
                                                required
                                                value={newMember.start_year}
                                                onChange={(e) => setNewMember({...newMember, start_year: e.target.value})}
                                                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-bold outline-none focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-700/60">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 select-none">
                                        <input 
                                            type="checkbox"
                                            checked={newMember.has_exit}
                                            onChange={(e) => setNewMember({...newMember, has_exit: e.target.checked})}
                                            className="w-4 h-4 rounded text-rose-500 focus:ring-rose-400 border-slate-600 bg-slate-900"
                                        />
                                        <span>Locul are dată de ieșire (a părăsit / părăsește comunitatea)</span>
                                    </label>

                                    {newMember.has_exit && (
                                        <div className="grid grid-cols-2 gap-2 mt-2.5 pl-6">
                                            <div>
                                                <span className="text-[10px] text-rose-300 block mb-0.5">Luna Ieșirii (inclusiv):</span>
                                                <select
                                                    value={newMember.end_month || 12}
                                                    onChange={(e) => setNewMember({...newMember, end_month: parseInt(e.target.value)})}
                                                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-rose-500/50 text-rose-200 text-xs outline-none focus:border-rose-400"
                                                >
                                                    {MONTH_NAMES.slice(1).map((m, idx) => (
                                                        <option key={idx + 1} value={idx + 1}>{m}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-rose-300 block mb-0.5">Anul Ieșirii:</span>
                                                <input 
                                                    type="number"
                                                    min="2020"
                                                    max="2035"
                                                    placeholder="ex: 2026"
                                                    value={newMember.end_year || ''}
                                                    onChange={(e) => setNewMember({...newMember, end_year: e.target.value})}
                                                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-rose-500/50 text-rose-200 text-xs font-bold outline-none focus:border-rose-400"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
                            >
                                Salvează Punctul în Comunitate
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* MODAL: EDITARE PUNCT (MEMBRU) */}
            {/* ============================================================ */}
            {showEditMember && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button 
                            onClick={() => setShowEditMember(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
                        >
                            &times;
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[#0B7A75]/30 text-[#DBE200] border border-[#0B7A75]/50 flex items-center justify-center text-lg">
                                <i className="fa-solid fa-user-pen"></i>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base">Editează Membru Comunitate</h3>
                                <p className="text-xs text-slate-400">
                                    Punct: <strong className="text-slate-200">{editMemberForm.name}</strong> • POD: <span className="font-mono text-emerald-400">{editMemberForm.code_pod}</span>
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleEditMemberSubmit} className="space-y-4">
                            {/* Member Type Selection (Change type: e.g. consumer -> prosumer) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                                    <span>Tipul Membrului:</span>
                                    <span className="text-[10px] text-[#DBE200] font-normal">Modifică rolul (ex: la instalare panouri solare)</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setEditMemberForm({
                                            ...editMemberForm, 
                                            member_type: 'sistem_productie',
                                            contracted_power_kw: 0.0
                                        })}
                                        className={`p-3 rounded-xl border text-center transition-all ${
                                            editMemberForm.member_type === 'sistem_productie' 
                                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' 
                                                : 'bg-slate-800 border-slate-700 text-slate-400'
                                        }`}
                                    >
                                        <i className="fa-solid fa-solar-panel block text-lg mb-1"></i>
                                        <span className="text-[11px] block">Sistem Producție</span>
                                        <span className="text-[9px] opacity-75 font-normal block">Doar Generare</span>
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={() => setEditMemberForm({
                                            ...editMemberForm, 
                                            member_type: 'prosumator'
                                        })}
                                        className={`p-3 rounded-xl border text-center transition-all ${
                                            editMemberForm.member_type === 'prosumator' 
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' 
                                                : 'bg-slate-800 border-slate-700 text-slate-400'
                                        }`}
                                    >
                                        <i className="fa-solid fa-arrows-rotate block text-lg mb-1"></i>
                                        <span className="text-[11px] block">Prosumator</span>
                                        <span className="text-[9px] opacity-75 font-normal block">Prod + Consum</span>
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={() => setEditMemberForm({
                                            ...editMemberForm, 
                                            member_type: 'consumator',
                                            installed_capacity_kw: 0.0
                                        })}
                                        className={`p-3 rounded-xl border text-center transition-all ${
                                            editMemberForm.member_type === 'consumator' 
                                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold' 
                                                : 'bg-slate-800 border-slate-700 text-slate-400'
                                        }`}
                                    >
                                        <i className="fa-solid fa-house block text-lg mb-1"></i>
                                        <span className="text-[11px] block">Consumator</span>
                                        <span className="text-[9px] opacity-75 font-normal block">Doar Consum</span>
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={() => setEditMemberForm({
                                            ...editMemberForm, 
                                            member_type: 'stocare_bess'
                                        })}
                                        className={`p-3 rounded-xl border text-center transition-all ${
                                            editMemberForm.member_type === 'stocare_bess' 
                                                ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold' 
                                                : 'bg-slate-800 border-slate-700 text-slate-400'
                                        }`}
                                    >
                                        <i className="fa-solid fa-car-battery block text-lg mb-1"></i>
                                        <span className="text-[11px] block">Stocare BESS</span>
                                        <span className="text-[9px] opacity-75 font-normal block">Baterie / Stocare</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Denumire Punct:</label>
                                <input 
                                    type="text"
                                    required
                                    value={editMemberForm.name}
                                    onChange={(e) => setEditMemberForm({...editMemberForm, name: e.target.value})}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Cod POD:</label>
                                    <input 
                                        type="text"
                                        required
                                        value={editMemberForm.code_pod}
                                        onChange={(e) => setEditMemberForm({...editMemberForm, code_pod: e.target.value})}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Adresă:</label>
                                    <input 
                                        type="text"
                                        value={editMemberForm.address}
                                        onChange={(e) => setEditMemberForm({...editMemberForm, address: e.target.value})}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                        {editMemberForm.member_type === 'stocare_bess' ? 'Putere Descărcare (kW):' : 'Capacitate Solară (kWp):'}
                                    </label>
                                    <input 
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        disabled={editMemberForm.member_type === 'consumator'}
                                        value={editMemberForm.member_type === 'consumator' ? 0 : editMemberForm.installed_capacity_kw}
                                        onChange={(e) => setEditMemberForm({...editMemberForm, installed_capacity_kw: e.target.value})}
                                        className={`w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold outline-none focus:border-emerald-500 ${
                                            editMemberForm.member_type === 'consumator' ? 'opacity-40 cursor-not-allowed' : ''
                                        }`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                        {editMemberForm.member_type === 'stocare_bess' ? 'Putere Încărcare (kW):' : 'Putere Contractată (kW):'}
                                    </label>
                                    <input 
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        disabled={editMemberForm.member_type === 'sistem_productie'}
                                        value={editMemberForm.member_type === 'sistem_productie' ? 0 : editMemberForm.contracted_power_kw}
                                        onChange={(e) => setEditMemberForm({...editMemberForm, contracted_power_kw: e.target.value})}
                                        className={`w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold outline-none focus:border-emerald-500 ${
                                            editMemberForm.member_type === 'sistem_productie' ? 'opacity-40 cursor-not-allowed' : ''
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* COTA PROCENTUALĂ FIXĂ (PENTRU ALGORITMUL B ANRE) */}
                            {(() => {
                                const isNoShare = editMemberForm.member_type === 'sistem_productie' || editMemberForm.member_type === 'stocare_bess';
                                const currMember = selectedCommunity?.members?.find(m => m.id === editMemberForm.id);
                                const currShare = (currMember && (currMember.member_type === 'prosumator' || currMember.member_type === 'consumator')) ? (currMember.share_percentage || 0.0) : 0.0;
                                const otherSharesTotal = (selectedCommunity?.total_allocated_share_pct || 0.0) - currShare;
                                const maxAllowedForThisMember = Math.max(0, parseFloat((100.0 - otherSharesTotal).toFixed(2)));

                                return (
                                    <div className="p-3.5 rounded-xl bg-slate-800/80 border border-[#0B7A75]/50 space-y-1.5">
                                        <label className="block text-xs font-bold text-[#DBE200] flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                <i className="fa-solid fa-percent"></i>
                                                <span>Procent Fix Alocat — Algoritmul B (ANRE):</span>
                                            </span>
                                            <span className="text-white font-mono text-xs">
                                                {isNoShare ? '0.0%' : `${editMemberForm.share_percentage}%`}
                                            </span>
                                        </label>
                                        {isNoShare ? (
                                            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                                                <i className="fa-solid fa-circle-exclamation text-sm shrink-0"></i>
                                                <span>Instalațiile de producție pură și sistemele de stocare BESS nu primesc cotă de consum alocată (0% conform ANRE).</span>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-[11px] text-slate-400">
                                                    Cota procentuală fixă utilizată în Algoritmul B pe fiecare interval de 15 min.
                                                    <span className="text-emerald-400 font-semibold ml-1">
                                                        Maxim permis pentru acest loc: {maxAllowedForThisMember}% (din plafonul comunitar de 100%).
                                                    </span>
                                                </p>
                                                <input 
                                                    type="number"
                                                    min="0"
                                                    max={maxAllowedForThisMember}
                                                    step="0.5"
                                                    value={editMemberForm.share_percentage}
                                                    onChange={(e) => setEditMemberForm({...editMemberForm, share_percentage: e.target.value})}
                                                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold outline-none focus:border-[#DBE200]"
                                                />
                                            </>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* PERIOADĂ DE APARTENENȚĂ & MARCAJ INACTIV CU O ANUMITĂ LUNĂ */}
                            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                                        <i className="fa-solid fa-calendar-days text-emerald-400"></i>
                                        <span>Perioadă Apartenență & Data Intrării:</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-[10px] text-slate-400 block mb-0.5">Luna Intrării:</span>
                                            <select
                                                value={editMemberForm.start_month}
                                                onChange={(e) => setEditMemberForm({...editMemberForm, start_month: parseInt(e.target.value)})}
                                                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                                            >
                                                {MONTH_NAMES.slice(1).map((m, idx) => (
                                                    <option key={idx + 1} value={idx + 1}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block mb-0.5">Anul Intrării:</span>
                                            <input 
                                                type="number"
                                                min="2020"
                                                max="2035"
                                                required
                                                value={editMemberForm.start_year}
                                                onChange={(e) => setEditMemberForm({...editMemberForm, start_year: e.target.value})}
                                                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-bold outline-none focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-700/60">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 select-none">
                                        <input 
                                            type="checkbox"
                                            checked={editMemberForm.has_exit}
                                            onChange={(e) => setEditMemberForm({...editMemberForm, has_exit: e.target.checked})}
                                            className="w-4 h-4 rounded text-rose-500 focus:ring-rose-400 border-slate-600 bg-slate-900"
                                        />
                                        <span className={editMemberForm.has_exit ? 'text-rose-300 font-bold' : ''}>
                                            Marchează ca inactiv cu o anumită lună (Locul a părăsit comunitatea)
                                        </span>
                                    </label>

                                    {editMemberForm.has_exit ? (
                                        <div className="mt-2.5 p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <span className="text-[10px] text-rose-300 block mb-0.5">Luna Ieșirii (inclusiv activ):</span>
                                                    <select
                                                        value={editMemberForm.end_month || 12}
                                                        onChange={(e) => setEditMemberForm({...editMemberForm, end_month: parseInt(e.target.value)})}
                                                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-rose-500/50 text-rose-200 text-xs outline-none focus:border-rose-400 font-bold"
                                                    >
                                                        {MONTH_NAMES.slice(1).map((m, idx) => (
                                                            <option key={idx + 1} value={idx + 1}>{m}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-rose-300 block mb-0.5">Anul Ieșirii:</span>
                                                    <input 
                                                        type="number"
                                                        min="2020"
                                                        max="2035"
                                                        placeholder="ex: 2026"
                                                        value={editMemberForm.end_year || 2026}
                                                        onChange={(e) => setEditMemberForm({...editMemberForm, end_year: e.target.value})}
                                                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-rose-500/50 text-rose-200 text-xs font-bold outline-none focus:border-rose-400"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-rose-200/90 leading-relaxed">
                                                <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                                                Locul este activ până la sfârșitul lunii {MONTH_NAMES[editMemberForm.end_month || 12]} {editMemberForm.end_year || 2026}. Din luna următoare devine automat <strong>INACTIV</strong> și va primi <strong>0 kWh partajare</strong>.
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-emerald-400 mt-1 pl-6">
                                            ✓ Membrul este considerat ACTIV permanent (fără dată de ieșire).
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Note / Observații:</label>
                                <textarea 
                                    rows="2"
                                    placeholder="Detalii contractuale, modificări profil..."
                                    value={editMemberForm.notes}
                                    onChange={(e) => setEditMemberForm({...editMemberForm, notes: e.target.value})}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                                ></textarea>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setShowEditMember(false)}
                                    className="w-1/3 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                                >
                                    Anulează
                                </button>
                                <button 
                                    type="submit"
                                    className="w-2/3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
                                >
                                    Salvează Modificările Membrului
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* FOOTER */}
            <footer className="border-t border-[#93A29B]/25 bg-[#202022] py-8 text-xs text-[#93A29B] mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center pb-6 border-b border-[#2F2F31]">
                        {/* Developer Card */}
                        <div className="flex items-center gap-3.5">
                            <div className="p-2 rounded-xl bg-[#2F2F31] border border-[#DBE200]/30 shadow-sm shrink-0">
                                <img 
                                    src="/static/img/logo-cooperativa-yellow-trans.png" 
                                    alt="Cooperativa de Energie" 
                                    style={{ height: "32px", width: "auto", maxHeight: "32px", objectFit: "contain", display: "block" }}
                                />
                            </div>
                            <div className="text-left min-w-0">
                                <div className="font-bold text-white text-sm">Cooperativa de Energie</div>
                                <p className="text-[11px] text-[#93A29B]">
                                    Dezvoltatorul software-ului de partajare a energiei în comunități.
                                </p>
                                <a 
                                    href="https://cooperativadeenergie.ro" 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-[#DBE200] text-[11px] font-semibold hover:underline inline-flex items-center gap-1 mt-0.5"
                                >
                                    cooperativadeenergie.ro <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                                </a>
                            </div>
                        </div>

                        {/* Funder Card */}
                        <div className="flex items-center gap-3.5 justify-start md:justify-center">
                            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm shrink-0 overflow-hidden">
                                <img 
                                    src="/static/img/flag-eu.svg" 
                                    alt="Drapelul Uniunii Europene" 
                                    style={{ height: "24px", width: "36px", minWidth: "36px", objectFit: "contain", display: "block", flexShrink: 0 }}
                                    title="Uniunea Europeană"
                                />
                                <div style={{ height: "22px", width: "1px", backgroundColor: "#cbd5e1", flexShrink: 0 }}></div>
                                <img 
                                    src="/static/img/logo-life-comet-trans.png" 
                                    alt="LIFE COMET" 
                                    style={{ height: "28px", width: "auto", maxHeight: "28px", objectFit: "contain", display: "block", flexShrink: 0 }}
                                    title="Programul LIFE COMET"
                                />
                            </div>
                            <div className="text-left min-w-0">
                                <div className="font-bold text-white text-sm">Programul LIFE COMET</div>
                                <p className="text-[11px] text-[#93A29B]">
                                    Finanțat de Uniunea Europeană pentru sprijinirea comunităților de energie.
                                </p>
                                <a 
                                    href="https://lifecomet.rescoop.eu/" 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-emerald-400 text-[11px] font-semibold hover:underline inline-flex items-center gap-1 mt-0.5"
                                >
                                    lifecomet.rescoop.eu <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                                </a>
                            </div>
                        </div>

                        {/* License & Tech */}
                        <div className="flex flex-col items-start md:items-end gap-1.5 text-left md:text-right">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-full bg-[#DBE200]/20 text-[#DBE200] font-bold text-xs border border-[#DBE200]/40">
                                    Apache License 2.0
                                </span>
                                <button 
                                    onClick={() => setShowLicenseModal(true)} 
                                    className="text-xs text-white hover:text-[#DBE200] font-semibold underline"
                                >
                                    Termeni Licență
                                </button>
                            </div>
                            <p className="text-[11px] text-[#93A29B]">
                                Platformă Open-Source dedicată comunităților CER din România.
                            </p>
                            <div className="flex items-center gap-3 text-[11px] mt-1">
                                <a href="/docs" target="_blank" rel="noreferrer" className="text-[#0B7A75] hover:text-emerald-300 font-semibold">
                                    <i className="fa-solid fa-book-open mr-1"></i>OpenAPI / Docs
                                </a>
                                <span>•</span>
                                <a href="/api/license" target="_blank" rel="noreferrer" className="text-[#93A29B] hover:text-white">
                                    <i className="fa-solid fa-file-contract mr-1"></i>/api/license
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 text-center sm:text-left text-[11px] text-[#93A29B]">
                        © 2026 Cooperativa de Energie. Finanțat prin programul LIFE COMET al Uniunii Europene sub licența Apache-2.0.
                    </div>
                </div>
            </footer>

            {/* MODAL: APACHE 2.0 LICENSE & PROJECT CREDITS */}
            {showLicenseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-[#242426] border border-[#93A29B]/30 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 bg-[#2F2F31] border-b border-[#93A29B]/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#DBE200]/20 text-[#DBE200] border border-[#DBE200]/40 flex items-center justify-center text-lg">
                                    <i className="fa-solid fa-scale-balanced"></i>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Licență Apache 2.0 & Date Proiect</h3>
                                    <p className="text-xs text-[#93A29B]">Condiții de utilizare open-source, drepturi, dezvoltator și finanțare</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowLicenseModal(false)}
                                className="w-8 h-8 rounded-lg bg-[#202022] hover:bg-[#38383b] text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-300">
                            {/* Branding Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Developer */}
                                <div className="p-4 rounded-xl bg-[#2F2F31] border border-[#DBE200]/30 flex items-start gap-3.5">
                                    <div className="bg-[#202022] p-2 rounded-lg border border-[#DBE200]/30 flex items-center justify-center">
                                        <img 
                                            src="/static/img/logo-cooperativa-yellow-trans.png" 
                                            alt="Cooperativa de Energie" 
                                            className="h-10 w-auto object-contain"
                                        />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold uppercase text-[#DBE200] tracking-wider">Dezvoltator Software</div>
                                        <div className="text-base font-bold text-white">Cooperativa de Energie</div>
                                        <p className="text-xs text-slate-300 mt-1">
                                            Prima cooperativă de energie 100% verde din România, promotor activ al tranziției energetice cetățenești.
                                        </p>
                                        <a 
                                            href="https://cooperativadeenergie.ro" 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="text-xs text-[#DBE200] hover:underline inline-flex items-center gap-1 mt-2 font-semibold"
                                        >
                                            cooperativadeenergie.ro <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                                        </a>
                                    </div>
                                </div>

                                {/* Funder */}
                                <div className="p-4 rounded-xl bg-[#2F2F31] border border-[#0B7A75]/40 flex items-start gap-3.5">
                                    <div className="bg-white p-2 px-3 rounded-lg border border-slate-300 flex items-center gap-2.5 shrink-0 shadow-sm overflow-hidden">
                                        <img 
                                            src="/static/img/flag-eu.svg" 
                                            alt="Drapelul Uniunii Europene" 
                                            style={{ height: "26px", width: "39px", minWidth: "39px", objectFit: "contain", display: "block", flexShrink: 0 }}
                                            title="Uniunea Europeană"
                                        />
                                        <div style={{ height: "24px", width: "1px", backgroundColor: "#cbd5e1", flexShrink: 0 }}></div>
                                        <img 
                                            src="/static/img/logo-life-comet-trans.png" 
                                            alt="LIFE COMET" 
                                            style={{ height: "30px", width: "auto", maxHeight: "30px", objectFit: "contain", display: "block", flexShrink: 0 }}
                                            title="Programul LIFE COMET"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">Finanțator Program</div>
                                        <div className="text-base font-bold text-white">Uniunea Europeană — LIFE COMET</div>
                                        <p className="text-xs text-slate-300 mt-1">
                                            Finanțat prin Programul LIFE al Uniunii Europene pentru dezvoltarea Comunităților de Energie Regenerabilă.
                                        </p>
                                        <div className="text-[11px] text-slate-400 mt-1 font-mono">
                                            LIFE COMET — Community Energy Transition
                                        </div>
                                        <a 
                                            href="https://lifecomet.rescoop.eu/" 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="text-xs text-emerald-400 hover:underline inline-flex items-center gap-1 mt-1 font-semibold"
                                        >
                                            lifecomet.rescoop.eu <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Box */}
                            <div className="p-4 rounded-xl bg-[#202022] border border-[#93A29B]/20 space-y-2">
                                <div className="flex items-center gap-2 text-white font-bold text-sm">
                                    <i className="fa-solid fa-circle-check text-[#DBE200]"></i>
                                    <span>Ce permite licența Apache 2.0?</span>
                                </div>
                                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                                    <li><strong>Uz Comercial & Gratuit:</strong> Software-ul poate fi utilizat liber fără redevențe în comunități energetice.</li>
                                    <li><strong>Modificare & Distribuire:</strong> Codul sursă poate fi adaptat conform noilor reglementări ANRE.</li>
                                    <li><strong>Acordare de Brevete:</strong> Include acordare explicită a drepturilor de brevet de la fiecare colaborator.</li>
                                    <li><strong>Păstrarea Atribuirii:</strong> Se solicită menținerea numelui Cooperativa de Energie și al finanțatorului Uniunea Europeană (LIFE COMET).</li>
                                </ul>
                            </div>

                            {/* Full Text */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Textul Licenței (Apache License Version 2.0):</span>
                                    <a 
                                        href="https://www.apache.org/licenses/LICENSE-2.0" 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="text-xs text-[#DBE200] hover:underline inline-flex items-center gap-1 font-semibold"
                                    >
                                        apache.org/licenses/LICENSE-2.0 <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                                    </a>
                                </div>
                                <pre className="p-4 rounded-xl bg-[#18181a] border border-[#2F2F31] text-[11px] font-mono text-slate-300 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed select-all">
                                    {licenseData?.text || "Se încarcă textul licenței Apache 2.0..."}
                                </pre>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-[#2F2F31] border-t border-[#93A29B]/20 flex items-center justify-between">
                            <span className="text-xs text-[#93A29B]">
                                Copyright © 2026 Cooperativa de Energie • Programul LIFE COMET
                            </span>
                            <button 
                                onClick={() => setShowLicenseModal(false)}
                                className="px-5 py-2 rounded-xl bg-[#0B7A75] hover:bg-[#09635f] text-white font-bold text-xs transition-colors shadow-md"
                            >
                                Închide
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* MODAL: GHID & REGLEMENTĂRI ANRE ALGORITMI DE PARTAJARE */}
            {/* ============================================================ */}
            {showAlgorithmsGuide && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#242426] border border-[#93A29B]/30 w-full max-w-3xl rounded-2xl shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-6 bg-[#2F2F31] border-b border-[#93A29B]/20 flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-[#DBE200]/20 text-[#DBE200] border border-[#DBE200]/40 flex items-center justify-center text-xl shrink-0">
                                    <i className="fa-solid fa-scale-balanced"></i>
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                                        <span>Ghid & Reglementări ANRE: Partajarea Energiei Electrice</span>
                                    </h3>
                                    <p className="text-xs text-slate-300 mt-0.5">
                                        Regulamentul de funcționare a Comunităților de Energie Regenerabilă (CER) în România
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowAlgorithmsGuide(false)}
                                className="text-slate-400 hover:text-white text-2xl leading-none p-1 transition-colors"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-200">
                            {/* Definition Box */}
                            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-2">
                                <div className="flex items-center gap-2 text-[#DBE200] font-bold text-sm">
                                    <i className="fa-solid fa-gavel"></i>
                                    <span>Cadrul de Reglementare ANRE</span>
                                </div>
                                <blockquote className="text-slate-300 italic border-l-2 border-[#DBE200] pl-3 py-0.5 leading-relaxed">
                                    „Pentru stabilirea energiei electrice alocate din energia electrică livrată în rețeaua electrică pentru fiecare loc de consum din cadrul comunității de energie se poate utiliza în cadrul regulamentului de funcționare oricare din următorii algoritmi de alocare:
                                    <br /><br />
                                    <strong>a) Algoritmul de alocare A</strong> — alocarea energiei electrice partajate se realizează pe fiecare interval de decontare pentru fiecare loc de consum din cadrul comunității de energie proporțional cu consumul înregistrat pe intervalul de decontare la locul de consum;
                                    <br /><br />
                                    <strong>b) Algoritmul de alocare B</strong> — alocarea energiei electrice partajate se realizează pe fiecare interval de decontare pentru fiecare loc de consum din cadrul comunității de energie în procent fix.”
                                </blockquote>
                            </div>

                            {/* The 2 Algorithms Comparison */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-[#2F2F31] border border-emerald-500/40 space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                        <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-black">A</div>
                                        <span>Algoritmul de Alocare A (Proporțional)</span>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed">
                                        Surplusul livrat în rețea în fiecare interval de 15 minute este împărțit dinamic între membrii activi cu deficit, proporțional cu consumul fiecăruia:
                                    </p>
                                    <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-[#DBE200]">
                                        Alocare_i = Surplus * (Consum_i / Consum_Total_Deficit)
                                    </div>
                                    <p className="text-[11px] text-slate-400">
                                        ✓ Recomandat pentru comunități dinamice unde consumul variază considerabil de la un interval la altul.
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-[#2F2F31] border border-sky-500/40 space-y-2">
                                    <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                                        <div className="w-6 h-6 rounded-md bg-sky-500/20 text-sky-300 flex items-center justify-center text-xs font-black">B</div>
                                        <span>Algoritmul de Alocare B (Procent Fix)</span>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed">
                                        Fiecare loc de consum primește o cotă fixă din surplusul produs pe intervalul de 15 minute, conform procentului stabilit prin regulament:
                                    </p>
                                    <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-sky-300">
                                        Alocare_i = min(Consum_i, Surplus * Cota_Fixa_i %)
                                    </div>
                                    <p className="text-[11px] text-slate-400">
                                        ✓ Recomandat când membrii au contribuit cu investiții financiare proporționale în capacitatea de producție.
                                    </p>
                                </div>
                            </div>

                            {/* Core Rules */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                    <i className="fa-solid fa-shield-halved text-[#DBE200]"></i>
                                    <span>Reguli Fundamentale Implementate în Platformă</span>
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                                        <div className="font-bold text-amber-300 flex items-center gap-2">
                                            <i className="fa-solid fa-ban"></i>
                                            <span>1. Fără Cotă de Consum pt. Producție & BESS</span>
                                        </div>
                                        <p className="text-slate-300 text-[11px] leading-relaxed">
                                            Instalațiile dedicate exclusiv producției (<code className="text-amber-300">sistem_productie</code>) și sistemele de stocare (<code className="text-purple-300">stocare_bess</code>) nu au consum partajabil și primesc automat o cotă de consum de <strong>0%</strong>. Partajarea vizează exclusiv locurile de consum (<code className="text-emerald-300">prosumator</code>, <code className="text-sky-300">consumator</code>).
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                                        <div className="font-bold text-emerald-300 flex items-center gap-2">
                                            <i className="fa-solid fa-chart-pie"></i>
                                            <span>2. Plafonul Comunitar de Maxim 100%</span>
                                        </div>
                                        <p className="text-slate-300 text-[11px] leading-relaxed">
                                            Suma cotelor alocate pentru consum nu poate depăși <strong>100%</strong> în cadrul unei comunități. Platforma validează și blochează în timp real orice adăugare sau editare care ar depăși 100%.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                                        <div className="font-bold text-sky-300 flex items-center gap-2">
                                            <i className="fa-solid fa-clock"></i>
                                            <span>3. Rezoluție pe Intervale de 15 Minute</span>
                                        </div>
                                        <p className="text-slate-300 text-[11px] leading-relaxed">
                                            Conform standardului pieței de echilibrare și regulamentului ANRE, algoritmii rulează pe fiecare interval de decontare de <strong>15 minute (96 intervale/zi)</strong> dintr-o lună completă, asigurând o precizie maximă a partajării.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                                        <div className="font-bold text-[#DBE200] flex items-center gap-2">
                                            <i className="fa-solid fa-calendar-check"></i>
                                            <span>4. Filtrare Temporală & Dinamica Membrilor</span>
                                        </div>
                                        <p className="text-slate-300 text-[11px] leading-relaxed">
                                            Membrii pot intra sau ieși din comunitate în decursul timpului. Algoritmul de partajare se aplică <strong>strict pentru membrii activi</strong> în luna respectivă (între luna/anul de intrare și data de ieșire).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-[#2F2F31] border-t border-[#93A29B]/20 flex items-center justify-between">
                            <span className="text-xs text-[#93A29B]">
                                Documentație tehnică conform Ordinelor și Ghidurilor ANRE pentru Comunități de Energie
                            </span>
                            <button 
                                onClick={() => setShowAlgorithmsGuide(false)}
                                className="px-5 py-2 rounded-xl bg-[#0B7A75] hover:bg-[#09635f] text-white font-bold text-xs transition-colors shadow-md"
                            >
                                Am Înțeles
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Render React App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
