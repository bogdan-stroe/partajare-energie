# ⚡ Partajare Energie — Comunități de Energie Regenerabilă & Registru ANRE

Platformă full-stack dedicată **gestionării comunităților de energie regenerabilă (CER)**, evidenței stadiului de autorizare în **Registrul ANRE**, încărcării fișierelor cu curbele de sarcină/producție/consum și **rulării algoritmilor de partajare a energiei** între membrii comunității.

> **Dezvoltator**: Software scris și dezvoltat de **[Cooperativa de Energie](https://cooperativadeenergie.ro)**  
> **Finanțator**: Finanțat de **Uniunea Europeană prin programul [LIFE COMET](https://lifecomet.rescoop.eu/)** (*Community Energy Transition*)  
> **Licență**: **[Apache License 2.0](LICENSE)** (Open-Source, liber și transparent)

Include **backend Python (FastAPI)**, **bază de date SQLite (SQLAlchemy 2.0 ORM)** și **interfață web modernă (React 18 + Tailwind CSS + Chart.js)** ce funcționează imediat cu o singură comandă, fără a necesita Node.js sau npm.

---

## 🎨 Identitate Vizuală & Schemă de Culori

Aplicația respectă identitatea vizuală oficială a **Cooperativei de Energie** și a programului **LIFE COMET**:

| Culoare Hex | Denumire Brand | Utilizare în Aplicație |
|---|---|---|
| `#DBE200` | **Galben / Lime Cooperativa** | Sigla CE, accente primare, tab activ, autoconsum local, insigne ANRE admise |
| `#2F2F31` | **Antracit / Dark Slate** | Fundaluri carduri și panouri, header, bara de navigare |
| `#93A29B` | **Gri Salvie / Slate Muted** | Borduri, separatoare, subtitluri, text secundar |
| `#0B7A75` | **Teal / Albastru-Verde Închis** | Butoane de acțiune, partajare comunitară în grafic, fundaluri toast |
| `#FF9914` | **Portocaliu Solar / Energetic** | Energie din rețea, alerte, producție fotovoltaică, badge-uri de atenționare |

### 🖼️ Sigle Integrate în UI
1. **Sigla Dezvoltatorului**: `static/img/logo-cooperativa-yellow-trans.png` (Cooperativa de Energie)
2. **Sigla Finanțatorului**: `static/img/logo-life-comet-trans.png` (Uniunea Europeană — Programul LIFE COMET: https://lifecomet.rescoop.eu/)

---

## 🌟 Funcționalități Principale

### 1. 🏛️ Comunități de Energie & Evidență Registru ANRE
Fiecare comunitate include câmpuri dedicate pentru monitorizarea traseului de autorizare la Autoritatea Națională de Reglementare în domeniul Energiei (**ANRE**):
- **Stadiul Înregistrării la ANRE**:
  1. 🟡 **Grup de Inițiativă** (`grup_initiativa`) — etapa incipientă de constituire
  2. 🔵 **Cerere Trimisă la ANRE** (`cerere_trimisa`) — dosarul a fost depus
  3. 🟠 **Cerere în Lucru la ANRE** (`cerere_in_lucru`) — evaluare tehnică și juridică în derulare
  4. 🟢 **Înregistrare Admisă** (`inregistrare_admisa`) — comunitate autorizată oficial, cu **Număr de Înregistrare ANRE** (ex: `ANRE-CER-2025/014`)
  5. 🔴 **Înregistrare Respinsă** (`inregistrare_respinsa`) — necesită clarificări sau redepunere
- **Adăugare & Editare Comunitate**: setare nume, cod unic, locație, stadiu ANRE, număr ANRE, tarife interne și algoritm de partajare implicit.

---

### 2. 👥 Patru Tipuri Distincte de Membri în Comunitate
În cadrul fiecărei comunități pot fi adăugate sau șterse locuri de producție, consum și stocare grupate în 4 categorii conforme reglementărilor:
1. ☀️ **Sistem de Producție (`sistem_productie`)**:
   - Puncte dedicate exclusiv generării de energie (parcuri fotovoltaice pe sol, centrale solare pe acoperișuri industriale, turbine).
   - Consumul este automat 0; se configurează puterea instalată (kWp) și cota procentuală de participare.
2. 🔄 **Prosumator (`prosumator`)**:
   - Locuri care au **atât producție, cât și consum** (locuințe unifamiliale, IMM-uri sau clădiri de birouri cu panouri solare).
   - Realizează întâi autoconsum propriu, iar surplusul de energie este partajat cu ceilalți membri din comunitate.
3. 🏠 **Consumator Pur (`consumator`)**:
   - Locuri dedicate exclusiv consumului (apartamente, școli, grădinițe, ateliere).
   - Producția este automat 0; preiau energia verde partajată din comunitate la tariful intern avantajos.
4. 🔋 **Sistem de Stocare a Energiei în Baterii — BESS (`stocare_bess`)**:
   - Sisteme de stocare (baterii electrochimice comunitare sau individuale) capabile de absorbție/încărcare din surplus și injecție/descărcare în orele de vârf.

---

### 3. 📥 Încărcare Fișiere cu Curbe de Producție & Consum
- **Încărcare Fișier CSV**: utilizatorul poate încărca direct fișiere CSV cu curbele lunare de producție și/sau consum ale fiecărui membru.
  - Coloane acceptate: `code_pod, year, month, production_kwh, consumption_kwh` (sau `member_name`).
  - Separatori detectați automat (virgulă `,` sau punct și virgulă `;`).
- **Descărcare Șablon CSV Pre-completat**: butonul **„Descarcă Șablon CSV”** generează automat un fișier CSV gata structurat cu toate codurile POD și denumirile membrilor comunității curente pe lunile 1-12.
- **Tabel Date Lunare**: vizualizare, căutare și filtrare a datelor din baza de date pentru orice an/lună.

---

### 4. 🧠 Algoritmi de Partajare a Energiei Recunoscuți de ANRE

În conformitate cu reglementările **Autorității Naționale de Reglementare în domeniul Energiei (ANRE)** privind funcționarea comunităților de energie, pentru stabilirea energiei electrice alocate din energia electrică livrată în rețeaua electrică pentru fiecare loc de consum din cadrul comunității de energie se poate utiliza oricare dintre următorii algoritmi oficiali:

#### 🅰️ Algoritmul de Alocare A — Proporțional cu Consumul Efectiv (Pro-Rata pe 15 minute)
- **Definiție ANRE**: Alocarea energiei electrice partajate se realizează pe fiecare interval de decontare pentru fiecare loc de consum din cadrul comunității proporțional cu consumul înregistrat pe intervalul respectiv de decontare la locul de consum.
- **Formulă matematică** pe intervalul de 15 minute $t$:
  $$\text{Alocare}_{i,t} = \min\left(\text{Consum}_{i,t},\, \text{Surplus}_{t} \times \frac{\text{Consum}_{i,t}}{\sum_{k \in \mathcal{C}_{\text{activ}}} \text{Consum}_{k,t}}\right)$$
- **Caracteristici**:
  - Dinamic și adaptat în timp real consumului efectiv al fiecărui membru.
  - Asigură că niciun membru nu primește mai multă energie partajată decât necesarul său din cele 15 minute.
  - Excedentul rămas după prima alocare este redistribuit iterativ membrilor cu deficit rămas neacoperit.

#### 🅱️ Algoritmul de Alocare B — În Procent Fix pe fiecare Interval de Decontare (15 minute)
- **Definiție ANRE**: Alocarea energiei electrice partajate se realizează pe fiecare interval de decontare pentru fiecare loc de consum din cadrul comunității de energie în procent fix.
- **Formulă matematică** pe intervalul de 15 minute $t$:
  $$\text{Alocare}_{i,t} = \min\left(\text{Consum}_{i,t},\, \text{Surplus}_{t} \times \frac{\text{CotaFixa}_i}{100}\right)$$
- **Caracteristici**:
  - Fiecare loc de consum primește o cotă fixă din surplusul produs în respectivul sfert de oră, plafonată la consumul propriu pe interval.
  - Ideal pentru comunități în care membrii au finanțat investiția inițială în capacitatea de generare în cote procentuale specifice.
  - Surplusul neutilizat de un membru a cărui cotă fixă depășește consumul său instantaneu este redistribuit celorlalți membri cu deficit activi.

---

### 🛡️ Reguli Obligatorii în Partajarea Energiei

Platforma implementează și validează automat următoarele reguli fundamentale impuse de legislația ANRE:

#### 1. 🚫 Instalațiile de Producție și Stocare (BESS) NU au alocat un procent de consum (0%)
- Alocarea energiei partajate se adresează **exclusiv locurilor de consum** (`consumator`, `prosumator`).
- Instalațiile de producție exclusivă (`sistem_productie`, cum ar fi parcurile solare comunitare sau centralele montate pe hale) generează și injectează energie în rețea, având consum zero.
- Sistemele de stocare a energiei în baterii (`stocare_bess`) sunt active de stocare și flexibilitate — absorb surplusul fotovoltaic în miezul zilei și injectează energie la orele de vârf de seară; ele nu reprezintă locuri de consum beneficiar de cotă fixă de partajare.
- În consecință, cota de consum (`share_percentage`) pentru `sistem_productie` și `stocare_bess` este **fixată strict la 0.0%**. Orice tentativă de atribuire a unei cote pozitive este respinsă de backend (`400 Bad Request`) și blocată în interfața UI.

#### 2. 💯 Suma procentelor alocate pentru consum nu poate depăși 100% în cadrul unei comunități
- Suma cotelor fixe alocate membrilor cu drept de consum (`prosumator`, `consumator`) dintr-o comunitate este plafonată la **100.0%**:
  $$\sum_{i \in \text{LocuriConsum}} \text{CotaFixa}_i \le 100\%$$
- Backend-ul validează această condiție atât la crearea unui membru nou (`crud.create_community_member`), cât și la actualizarea unui membru existent (`crud.update_community_member`), transmițând erori clare cu privire la cota maximă disponibilă.
- Interfața web calculează dinamic cota rămasă disponibilă (`remaining_share_pct`), limitează câmpul numeric (`max`) și oferă feedback vizual direct pe ecran.

#### 3. ⏱️ Rezoluție pe intervale de decontare de 15 minute (96 intervale / zi)
- Calculele de partajare se efectuează pas cu pas pe toate cele **96 de intervale de 15 minute ale fiecărei zile** din luna analizată (aproximativ 2.880 – 2.976 intervale / lună).
- Toate curbele de sarcină încărcate prin fișierele matriceale CSV conțin înregistrări sincronizate la sfert de oră pentru fiecare cod POD din comunitate.

#### 4. 📅 Apartenență temporală & filtrare dinamică a membrilor
- Membrii au definită o perioadă contractuală de apartenență la comunitate: luna/anul intrării (`start_year`, `start_month`) și eventual luna/anul de ieșire (`end_year`, `end_month`).
- Algoritmul de partajare include în decontarea lunară **strict membrii activi** în luna selectată. Membrii inactivi sau care au părăsit comunitatea primesc automat 0 kWh partajare.

#### 5. 🗺️ Apartenență la o singură Zonă de Distribuție
- O comunitate de energie poate include doar membri conectați în cadrul **aceleiași zone de distribuție** dintre cele 8 zone oficiale din România (Rețele Electrice Muntenia, Banat, Dobrogea; DEER Transilvania Nord, Sud, Muntenia Nord; Delgaz Grid Moldova; Distribuție Oltenia).

---

### 5. 📊 Bilanț Energetic & Decontare Financiară
- Indicatori globali: Total generat, Total consumat, **Energie Verde Partajată în Comunitate**, **Grad de Autoconsum Colectiv (%)**, **Economii Totale (RON)** și Emisii CO₂ evitate.
- Grafic interactiv **Chart.js** în culorile brandului: distribuție între Autoconsum Local (`#DBE200`), Partajare Primită din Comunitate (`#0B7A75`) și Import din Rețea (`#FF9914`).
- Profilul pe 24 de ore cu rezoluție de 15 minute (96 puncte/zi) reprezentând curba de producție, curba de consum și curba de energie partajată.
- Tabel detaliat pe fiecare membru cu decontare financiară: Cost fără partajare vs Cost net final -> **Economie Netă (RON)**.

---

## 🚀 Pornire Rapidă (Quickstart)

### 1. Pornire server și aplicație

În PowerShell în directorul proiectului:

```powershell
.\venv\Scripts\python.exe run.py
```

### 2. Accesare în Navigator

- **Interfața Web**: [http://127.0.0.1:8000](http://127.0.0.1:8000) (se deschide automat)
- **Documentația interactivă Swagger OpenAPI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Informații Licență & Date Proiect**: [http://127.0.0.1:8000/api/license](http://127.0.0.1:8000/api/license)

---

## 🧪 Rularea Testelor Automate

Pentru a valida funcționarea completă a comunităților, stadiilor ANRE, încărcării fișierelor de curbe, algoritmilor de partajare și licenței Apache 2.0:

```powershell
.\venv\Scripts\python.exe test_app.py
```
*(Toate cele 11 suite de teste trec cu 100% succes).*

---

## 🔌 Rute API Principale

| Metodă | Rută | Descriere |
|---|---|---|
| `GET` | `/api/health` | Verificare stare server (indică dezvoltatorul, finanțatorul și licența) |
| `GET` | `/api/license` | **Date complete licență Apache-2.0, autori și grant LIFE COMET** |
| `GET` | `/api/communities` | Listare comunități de energie cu stadiul ANRE și statistici agregate |
| `POST` | `/api/communities` | Creare comunitate nouă cu stadiu ANRE |
| `GET` | `/api/communities/{id}` | Detalii comunitate, stadiu ANRE și lista de membri |
| `PUT` | `/api/communities/{id}` | Editare comunitate (nume, stadiu ANRE, nr. înregistrare ANRE, tarife) |
| `DELETE` | `/api/communities/{id}` | Ștergere comunitate |
| `POST` | `/api/communities/{id}/members` | Adăugare loc nou (`sistem_productie`, `prosumator`, `consumator`) |
| `DELETE` | `/api/communities/members/{member_id}` | Ștergere loc de producție/consum din comunitate |
| `GET` | `/api/communities/{id}/template-csv` | **Descărcare șablon CSV pre-completat cu membrii comunității** |
| `POST` | `/api/communities/{id}/upload-curves` | **Încărcare fișier CSV cu curbele de producție/consum** |
| `GET` | `/api/communities/{id}/monthly-data` | Vizualizare date lunare de producție & consum |
| `POST` | `/api/communities/{id}/run-sharing` | **Rulare algoritm de partajare pe baza curbelor încărcate** |

---

## ⚖️ Licență

Acest software este distribuit sub termenii licenței **[Apache License 2.0](LICENSE)**.

```
Copyright 2026 Cooperativa de Energie
Finanțat de Uniunea Europeană prin programul LIFE COMET
```
