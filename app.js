// ==========================================
// STATE MANAGEMENT & DATA
// ==========================================
let clientes = [];
let filteredClientes = [];
let currentUser = null; // Stored user object when logged in customer portal

let sortCol = '';
let sortAsc = true;

// Charts
let intentChartInst = null;
let reasonsChartInst = null;

// ==========================================
// DOM ELEMENTS CACHING
// ==========================================
const DOM = {
    // Views
    views: {
        customerLogin: document.getElementById('view-customer-login'),
        customerForm: document.getElementById('view-customer-form'),
        customerSuccess: document.getElementById('view-customer-success'),
        adminLogin: document.getElementById('view-admin-login'),
        adminDashboard: document.getElementById('view-admin-dashboard')
    },
    
    // Customer Portal
    customerLoginInput: document.getElementById('customerLoginInput'),
    btnCustomerLogin: document.getElementById('btnCustomerLogin'),
    customerLoginError: document.getElementById('customerLoginError'),
    linkAdminLogin: document.getElementById('linkAdminLogin'),
    
    // Customer Form
    surveyReason: document.getElementById('surveyReason'),
    surveyReasonOther: document.getElementById('surveyReasonOther'),
    btnSubmitSurvey: document.getElementById('btnSubmitSurvey'),
    radioIntent: document.getElementsByName('surveyIntent'),
    radioProduct: document.getElementsByName('surveyProduct'),
    
    // Customer Success
    btnBackToHome: document.getElementById('btnBackToHome'),
    
    // Admin Login
    adminLoginInput: document.getElementById('adminLoginInput'),
    btnAdminLogin: document.getElementById('btnAdminLogin'),
    adminLoginError: document.getElementById('adminLoginError'),
    linkCustomerPortal: document.getElementById('linkCustomerPortal'),
    btnExitAdmin: document.getElementById('btnExitAdmin'),

    // Admin Dashboard Elements
    btnLoadCsv: document.getElementById('btnLoadCsv'),
    csvFileInput: document.getElementById('csvFileInput'),
    btnExportCsv: document.getElementById('btnExportCsv'),
    alertContainer: document.getElementById('alertContainer'),
    
    // KPIs
    kpiTotal: document.getElementById('kpiTotal'),
    kpiEntered: document.getElementById('kpiEntered'),
    kpiResponded: document.getElementById('kpiResponded'),
    kpiIntentRate: document.getElementById('kpiIntentRate'),
    kpiReactivated: document.getElementById('kpiReactivated'),
    
    // Admin Filters
    filterSearch: document.getElementById('filterSearch'),
    filterIntent: document.getElementById('filterIntent'),
    filterEstado: document.getElementById('filterEstado'),
    filterMotivo: document.getElementById('filterMotivo'),
    btnClearFilters: document.getElementById('btnClearFilters'),
    
    // Admin Table
    tableBody: document.getElementById('tableBody'),
    tableResultsCount: document.getElementById('tableResultsCount'),
    emptyState: document.getElementById('emptyState'),
    crmTable: document.getElementById('crmTable'),
    sortableHeaders: document.querySelectorAll('.sortable')
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    loadData();
    // Default starting view
    showView('customerLogin');
});

// View Navigation System
function showView(viewKey) {
    Object.values(DOM.views).forEach(v => v.classList.remove('active'));
    DOM.views[viewKey].classList.add('active');
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    let icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
    
    alertDiv.innerHTML = `<i class="fa-solid ${icon}"></i> <span style="margin-left:5px">${message}</span>`;
    DOM.alertContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
}

// ==========================================
// EVENTS HUB
// ==========================================
function initEvents() {
    // Nav links
    DOM.linkAdminLogin.addEventListener('click', (e) => { e.preventDefault(); showView('adminLogin'); });
    DOM.linkCustomerPortal.addEventListener('click', (e) => { e.preventDefault(); showView('customerLogin'); });
    DOM.btnExitAdmin.addEventListener('click', () => { showView('customerLogin'); });
    
    // Customer Portal Events
    DOM.btnCustomerLogin.addEventListener('click', handleCustomerLogin);
    DOM.customerLoginInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleCustomerLogin(); });
    
    DOM.surveyReason.addEventListener('change', (e) => {
        if(e.target.value === 'Otro') DOM.surveyReasonOther.classList.remove('hidden');
        else DOM.surveyReasonOther.classList.add('hidden');
    });
    
    DOM.btnSubmitSurvey.addEventListener('click', handleSurveySubmit);
    DOM.btnBackToHome.addEventListener('click', () => {
        currentUser = null;
        DOM.customerLoginInput.value = '';
        showView('customerLogin');
    });

    // Admin Portal Events
    DOM.btnAdminLogin.addEventListener('click', handleAdminLogin);
    DOM.adminLoginInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAdminLogin(); });
    
    DOM.btnLoadCsv.addEventListener('click', () => DOM.csvFileInput.click());
    DOM.csvFileInput.addEventListener('change', handleFileUpload);
    DOM.btnExportCsv.addEventListener('click', exportToCsv);
    
    const filterInputs = [DOM.filterSearch, DOM.filterIntent, DOM.filterEstado, DOM.filterMotivo];
    filterInputs.forEach(input => {
        input.addEventListener('input', applyFilters);
        input.addEventListener('change', applyFilters);
    });
    
    DOM.btnClearFilters.addEventListener('click', () => {
        filterInputs.forEach(input => input.value = '');
        applyFilters();
    });

    DOM.sortableHeaders.forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if(sortCol === col) sortAsc = !sortAsc;
            else { sortCol = col; sortAsc = true; }
            applyFilters();
        });
    });
}

// ==========================================
// DATA LOADING
// ==========================================
const fallbackCSV = `"Nombre","Telefono","Email","Ultima_Compra","Frecuencia","Producto","Estado","Motivo_Abandono","Contactado","Respondio","Compro","Fecha_Reactivacion","Valor_Compra"
"Pedro 0","3170888712","user0@mail.com","2025-08-25","Alta","Leche","Inactivo","No lo encuentra","Sí","Sí","No","",""
"Laura 1","3102252729","user1@mail.com","2025-10-10","Baja","Yogur","Inactivo","Otra marca","Sí","No","No","",""
"Carlos 2","3549081593","user2@mail.com","2025-10-17","Baja","Yogur","Inactivo","Otro","Sí","Sí","Sí","2026-04-17","78754"
"Juan 3","3573426331","user3@mail.com","2025-10-15","Media","Queso","Inactivo","Precio","Sí","Sí","Sí","2026-04-17","30845"
"Diego 4","3658291399","user4@mail.com","2025-12-20","Baja","Leche","Inactivo","No lo encuentra","Sí","No","No","",""
"Luisa 5","3219344807","user5@mail.com","2025-10-25","Baja","Avena","Inactivo","No lo encuentra","Sí","No","No","",""
"Maria 6","3761314285","user6@mail.com","2026-01-19","Media","Queso","Inactivo","No lo encuentra","No","No","No","",""
"Luisa 7","3134785426","user7@mail.com","2026-03-04","Media","Yogur","Inactivo","Otra marca","Sí","Sí","No","",""
"Laura 8","3528944906","user8@mail.com","2025-04-24","Baja","Avena","Inactivo","Precio","Sí","No","No","",""
"Jorge 9","3590818685","user9@mail.com","2025-07-07","Baja","Queso","Inactivo","Otro","Sí","No","No","",""
"Pedro 10","3967833840","user10@mail.com","2025-10-30","Alta","Yogur","Inactivo","Otro","Sí","No","No","",""
"Laura 11","3591778722","user11@mail.com","2026-03-10","Alta","Queso","Inactivo","Otro","No","No","No","",""
"Jorge 12","3490903416","user12@mail.com","2025-06-09","Baja","Yogur","Inactivo","Precio","Sí","Sí","No","",""
"Ana 13","3779591622","user13@mail.com","2025-12-25","Media","Avena","Inactivo","No lo encuentra","Sí","No","No","",""
"Diego 14","3628531160","user14@mail.com","2025-11-03","Baja","Avena","Inactivo","No lo encuentra","No","No","No","",""
"Jorge 15","3668932798","user15@mail.com","2025-08-01","Baja","Yogur","Inactivo","Otro","No","No","No","",""
"Luisa 16","3562221129","user16@mail.com","2025-10-31","Alta","Queso","Inactivo","Otro","No","No","No","",""
"Jorge 17","3987455887","user17@mail.com","2025-08-21","Baja","Leche","Inactivo","Otra marca","No","No","No","",""
"Carlos 18","3763593273","user18@mail.com","2025-07-23","Media","Yogur","Inactivo","Otra marca","Sí","Sí","Sí","2026-04-17","41249"
"Carlos 19","3233605283","user19@mail.com","2026-03-12","Baja","Yogur","Inactivo","Otro","Sí","Sí","No","",""
"Ana 20","3782360434","user20@mail.com","2025-08-03","Alta","Yogur","Inactivo","Precio","No","No","No","",""
"Sofia 21","3217821252","user21@mail.com","2026-01-17","Alta","Avena","Inactivo","Otra marca","Sí","Sí","Sí","2026-04-17","43619"
"Luisa 22","3199983355","user22@mail.com","2025-06-21","Media","Leche","Inactivo","Precio","Sí","Sí","No","",""
"Laura 23","3797313917","user23@mail.com","2026-03-07","Alta","Leche","Inactivo","Otro","No","No","No","",""
"Carlos 24","3999426719","user24@mail.com","2025-09-02","Media","Queso","Inactivo","No lo encuentra","Sí","Sí","No","",""
"Luisa 25","3669122762","user25@mail.com","2025-07-20","Media","Avena","Inactivo","Otro","Sí","Sí","Sí","2026-04-17","56030"
"Pedro 26","3292633111","user26@mail.com","2025-05-25","Alta","Avena","Inactivo","Otra marca","Sí","Sí","No","",""
"Maria 27","3916241737","user27@mail.com","2025-06-02","Baja","Yogur","Inactivo","Otra marca","No","No","No","",""
"Jorge 28","3869974973","user28@mail.com","2025-09-18","Baja","Yogur","Inactivo","No lo encuentra","No","No","No","",""
"Maria 29","3114043896","user29@mail.com","2025-05-10","Alta","Leche","Inactivo","Otro","No","No","No","",""
"Laura 30","3119681609","user30@mail.com","2026-01-19","Media","Leche","Inactivo","Otro","Sí","Sí","No","",""
"Jorge 31","3768133809","user31@mail.com","2025-05-06","Alta","Queso","Inactivo","No lo encuentra","Sí","Sí","Sí","2026-04-17","16379"
"Jorge 32","3449364367","user32@mail.com","2025-12-14","Alta","Yogur","Inactivo","Otra marca","Sí","No","No","",""
"Carlos 33","3187204671","user33@mail.com","2025-12-10","Alta","Leche","Inactivo","Otro","Sí","Sí","No","",""
"Laura 34","3662830042","user34@mail.com","2025-09-09","Media","Queso","Inactivo","Otra marca","No","No","No","",""
"Pedro 35","3127938569","user35@mail.com","2025-12-11","Baja","Queso","Inactivo","Precio","Sí","No","No","",""
"Carlos 36","3960953113","user36@mail.com","2025-11-27","Baja","Avena","Inactivo","Precio","Sí","Sí","Sí","2026-04-17","66839"
"Luisa 37","3509083246","user37@mail.com","2025-07-08","Alta","Leche","Inactivo","Otra marca","Sí","No","No","",""
"Pedro 38","3767684710","user38@mail.com","2025-11-02","Media","Leche","Inactivo","No lo encuentra","No","No","No","",""
"Maria 39","3522313116","user39@mail.com","2025-11-15","Media","Queso","Inactivo","No lo encuentra","No","No","No","",""
"Sofia 40","3951485931","user40@mail.com","2026-03-08","Media","Avena","Inactivo","Otra marca","No","No","No","",""
"Carlos 41","3608623002","user41@mail.com","2026-02-18","Baja","Avena","Inactivo","Precio","No","No","No","",""
"Sofia 42","3897833595","user42@mail.com","2025-08-11","Media","Leche","Inactivo","Otra marca","Sí","No","No","",""
"Maria 43","3740742053","user43@mail.com","2025-09-28","Baja","Queso","Inactivo","Otra marca","Sí","No","No","",""
"Carlos 44","3582002842","user44@mail.com","2025-07-14","Media","Leche","Inactivo","Otra marca","Sí","No","No","",""
"Laura 45","3229781793","user45@mail.com","2025-09-28","Baja","Queso","Inactivo","Otra marca","No","No","No","",""
"Diego 46","3390543939","user46@mail.com","2025-10-04","Baja","Avena","Inactivo","Otro","Sí","Sí","No","",""
"Laura 47","3346877945","user47@mail.com","2025-05-13","Alta","Avena","Inactivo","Precio","No","No","No","",""
"Sofia 48","3349067626","user48@mail.com","2025-10-12","Baja","Avena","Inactivo","Otro","Sí","No","No","",""
"Maria 49","3788925066","user49@mail.com","2025-12-02","Baja","Leche","Inactivo","Otro","No","No","No","",""
"Diego 50","3724466206","user50@mail.com","2025-06-20","Baja","Yogur","Inactivo","Otra marca","No","No","No","",""
"Maria 51","3488882738","user51@mail.com","2026-02-07","Alta","Yogur","Inactivo","No lo encuentra","Sí","No","No","",""
"Laura 52","3588406947","user52@mail.com","2026-01-28","Alta","Leche","Inactivo","Otra marca","Sí","Sí","No","",""
"Jorge 53","3210097382","user53@mail.com","2025-08-14","Baja","Yogur","Inactivo","Precio","Sí","No","No","",""
"Laura 54","3241204545","user54@mail.com","2025-08-25","Alta","Yogur","Inactivo","No lo encuentra","No","No","No","",""
"Carlos 55","3693397487","user55@mail.com","2025-12-14","Baja","Leche","Inactivo","No lo encuentra","No","No","No","",""
"Carlos 56","3473619100","user56@mail.com","2025-06-07","Baja","Leche","Inactivo","Otra marca","No","No","No","",""
"Sofia 57","3850308758","user57@mail.com","2025-11-30","Baja","Yogur","Inactivo","Otro","No","No","No","",""
"Sofia 58","3870167630","user58@mail.com","2025-05-02","Baja","Queso","Inactivo","Otro","Sí","Sí","No","",""
"Luisa 59","3625917138","user59@mail.com","2025-10-28","Baja","Yogur","Inactivo","Otra marca","No","No","No","",""
"Juan 60","3197011239","user60@mail.com","2025-11-23","Baja","Yogur","Inactivo","No lo encuentra","No","No","No","",""
"Jorge 61","3757902148","user61@mail.com","2026-01-19","Alta","Yogur","Inactivo","No lo encuentra","No","No","No","",""
"Luisa 62","3585828834","user62@mail.com","2025-09-06","Baja","Yogur","Inactivo","Otro","Sí","Sí","Sí","2026-04-17","11271"
"Maria 63","3107013536","user63@mail.com","2025-11-22","Media","Leche","Inactivo","Precio","Sí","No","No","",""
"Laura 64","3160349789","user64@mail.com","2025-12-27","Media","Leche","Inactivo","Otro","No","No","No","",""
"Ana 65","3815567055","user65@mail.com","2025-11-18","Baja","Queso","Inactivo","Precio","Sí","Sí","Sí","2026-04-17","49109"
"Luisa 66","3165077743","user66@mail.com","2025-10-17","Alta","Queso","Inactivo","Otra marca","No","No","No","",""
"Juan 67","3974769316","user67@mail.com","2025-10-18","Baja","Avena","Inactivo","Precio","Sí","No","No","",""
"Maria 68","3847559408","user68@mail.com","2026-01-04","Baja","Avena","Inactivo","Otro","Sí","Sí","No","",""
"Maria 69","3536231925","user69@mail.com","2025-07-07","Media","Leche","Inactivo","Otra marca","Sí","No","No","",""
"Sofia 70","3109967858","user70@mail.com","2025-09-06","Alta","Avena","Inactivo","No lo encuentra","Sí","Sí","Sí","2026-04-17","27928"
"Laura 71","3599112038","user71@mail.com","2026-03-08","Alta","Queso","Inactivo","Otro","No","No","No","",""
"Jorge 72","3885847034","user72@mail.com","2025-05-30","Media","Yogur","Inactivo","No lo encuentra","No","No","No","",""
"Pedro 73","3116859545","user73@mail.com","2026-03-16","Baja","Leche","Inactivo","No lo encuentra","Sí","No","No","",""
"Pedro 74","3225537775","user74@mail.com","2026-03-04","Media","Avena","Inactivo","No lo encuentra","No","No","No","",""
"Diego 75","3207696872","user75@mail.com","2025-10-04","Baja","Yogur","Inactivo","Otro","No","No","No","",""
"Ana 76","3186136534","user76@mail.com","2025-12-26","Alta","Queso","Inactivo","Otra marca","Sí","Sí","Sí","2026-04-17","59722"
"Laura 77","3486322402","user77@mail.com","2025-08-29","Media","Avena","Inactivo","No lo encuentra","Sí","No","No","",""
"Pedro 78","3708973216","user78@mail.com","2026-03-02","Baja","Leche","Inactivo","Otro","Sí","Sí","No","",""
"Pedro 79","3288119255","user79@mail.com","2026-02-15","Media","Avena","Inactivo","No lo encuentra","Sí","No","No","",""
"Sofia 80","3956256883","user80@mail.com","2025-08-20","Media","Avena","Inactivo","Otro","No","No","No","",""
"Luisa 81","3214330834","user81@mail.com","2025-12-29","Media","Yogur","Inactivo","Otro","No","No","No","",""
"Carlos 82","3697595368","user82@mail.com","2025-08-22","Baja","Yogur","Inactivo","Otro","Sí","Sí","Sí","2026-04-17","37045"
"Diego 83","3969462026","user83@mail.com","2026-01-29","Media","Leche","Inactivo","No lo encuentra","Sí","No","No","",""
"Juan 84","3837356552","user84@mail.com","2025-11-12","Alta","Avena","Inactivo","Otro","Sí","Sí","No","",""
"Sofia 85","3160084723","user85@mail.com","2025-07-17","Alta","Yogur","Inactivo","No lo encuentra","Sí","Sí","No","",""
"Ana 86","3564615034","user86@mail.com","2025-07-29","Media","Yogur","Inactivo","No lo encuentra","No","No","No","",""
"Jorge 87","3871624813","user87@mail.com","2025-08-04","Alta","Leche","Inactivo","Otra marca","No","No","No","",""
"Carlos 88","3708553538","user88@mail.com","2025-12-13","Alta","Avena","Inactivo","No lo encuentra","No","No","No","",""
"Diego 89","3389003135","user89@mail.com","2025-11-05","Media","Leche","Inactivo","Otro","Sí","No","No","",""
"Pedro 90","3872685475","user90@mail.com","2026-02-18","Baja","Leche","Inactivo","Precio","Sí","Sí","Sí","2026-04-17","57686"
"Pedro 91","3321641298","user91@mail.com","2025-09-15","Media","Queso","Inactivo","No lo encuentra","Sí","Sí","Sí","2026-04-17","71303"
"Jorge 92","3861151586","user92@mail.com","2025-05-06","Baja","Leche","Inactivo","No lo encuentra","Sí","No","No","",""
"Diego 93","3701335084","user93@mail.com","2026-02-09","Media","Avena","Inactivo","Otra marca","No","No","No","",""
"Laura 94","3628131405","user94@mail.com","2025-12-18","Baja","Avena","Inactivo","Otro","No","No","No","",""
"Diego 95","3405212691","user95@mail.com","2026-03-04","Baja","Avena","Inactivo","No lo encuentra","Sí","Sí","No","",""
"Sofia 96","3572085336","user96@mail.com","2026-03-15","Baja","Leche","Inactivo","Otro","No","No","No","",""
"Diego 97","3586247158","user97@mail.com","2025-04-22","Alta","Leche","Inactivo","Otro","Sí","No","No","",""
"Juan 98","3607215404","user98@mail.com","2026-02-21","Media","Avena","Inactivo","Otra marca","Sí","Sí","No","",""
"Carlos 99","3472910292","user99@mail.com","2025-10-11","Baja","Yogur","Inactivo","Precio","No","No","No","",""`;

async function loadData() {
    const savedData = localStorage.getItem('crm_parmalat_data_v2');
    if (savedData) {
        clientes = JSON.parse(savedData);
        processDataLoaded();
        return;
    }
    
    try {
        const response = await fetch('CRM_Parmalat.csv');
        if (response.ok) {
            parseCSVText(await response.text());
        } else {
            throw new Error();
        }
    } catch (e) {
        console.warn("Cargando CSV en bruto de emergencia debido a políticas CORS local.");
        parseCSVText(fallbackCSV);
    }
    processDataLoaded();
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        parseCSVText(event.target.result);
        processDataLoaded();
        showAlert('Base actualizada e inyectada al sistema.', 'success');
        applyFilters(); 
    };
    reader.readAsText(file);
    DOM.csvFileInput.value = ''; 
}

function parseCSVText(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return;
    
    const splitLine = (line) => {
        let regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        return line.split(regex).map(val => val.replace(/^"|"$/g, '').trim());
    };

    const headers = splitLine(lines[0]);
    clientes = [];
    
    for(let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = splitLine(lines[i]);
        let clientObj = { id: i };
        
        headers.forEach((h, index) => { clientObj[h] = values[index] || ''; });
        
        // Ensure defaults for logic
        if(!clientObj.Estado) clientObj.Estado = 'Inactivo';
        if(!clientObj.Ingreso_Portal) clientObj.Ingreso_Portal = false;
        if(!clientObj.Intencion_Recompra) clientObj.Intencion_Recompra = '';
        if(!clientObj.Producto_Interes) clientObj.Producto_Interes = '';
        
        clientes.push(clientObj);
    }
    saveToLocalStorage();
}

function processDataLoaded() {
    populateMotivosFilter();
    applyFilters();
}

function saveToLocalStorage() {
    localStorage.setItem('crm_parmalat_data_v2', JSON.stringify(clientes));
}

// ==========================================
// MÓDULO 1: PORTAL CLIENTES
// ==========================================
function handleCustomerLogin() {
    const input = DOM.customerLoginInput.value.trim().toLowerCase();
    
    if(!input) return;
    if(clientes.length === 0) {
        DOM.customerLoginError.innerText = "Sistema en mantenimiento (Base vacía).";
        DOM.customerLoginError.classList.remove('hidden');
        return;
    }

    const found = clientes.find(c => 
        (c.Telefono && c.Telefono.trim() === input) || 
        (c.Email && c.Email.trim().toLowerCase() === input)
    );

    if (found) {
        DOM.customerLoginError.classList.add('hidden');
        currentUser = found;
        
        // Mutate state to indicate customer entered
        currentUser.Ingreso_Portal = true;
        currentUser.Estado = currentUser.Estado === 'Inactivo' ? 'En Proceso' : currentUser.Estado;
        saveToLocalStorage();
        
        // Clean up previous form data just in case
        document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        DOM.surveyReason.value = '';
        DOM.surveyReasonOther.value = '';
        DOM.surveyReasonOther.classList.add('hidden');
        
        showView('customerForm');
    } else {
        DOM.customerLoginError.innerText = "No encontramos tus datos, por favor verifica.";
        DOM.customerLoginError.classList.remove('hidden');
    }
}

// ==========================================
// MÓDULO 2 & 3: FORMULARIO Y ÉXITO
// ==========================================
function handleSurveySubmit() {
    if (!currentUser) return;

    let reason = DOM.surveyReason.value;
    if (reason === 'Otro') reason = DOM.surveyReasonOther.value.trim() || 'Otro';
    
    let intent = '';
    DOM.radioIntent.forEach(r => { if(r.checked) intent = r.value; });
    
    let product = '';
    DOM.radioProduct.forEach(r => { if(r.checked) product = r.value; });

    if(!reason || !intent || !product) {
        showAlert("Por favor, completa todas las preguntas para ayudarnos a mejorar.", "error");
        return;
    }

    // Save Responses
    currentUser.Motivo_Abandono = reason;
    currentUser.Intencion_Recompra = intent;
    currentUser.Producto_Interes = product;
    currentUser.Respondio = 'Sí';
    currentUser.Estado = 'Respondió';
    
    saveToLocalStorage();
    
    // Re-render Admin Panel in background essentially
    applyFilters();
    showView('customerSuccess');
}

// ==========================================
// MÓDULO 4: ADMIN LOGIN & PANEL
// ==========================================
function handleAdminLogin() {
    const pswd = DOM.adminLoginInput.value.trim();
    if(pswd === 'admin123') {
        DOM.adminLoginError.classList.add('hidden');
        DOM.adminLoginInput.value = '';
        applyFilters(); 
        showView('adminDashboard');
    } else {
        DOM.adminLoginError.classList.remove('hidden');
    }
}

function populateMotivosFilter() {
    const motivos = new Set(clientes.map(c => c.Motivo_Abandono).filter(m => m));
    DOM.filterMotivo.innerHTML = '<option value="">Todos</option>';
    motivos.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m; opt.textContent = m;
        DOM.filterMotivo.appendChild(opt);
    });
}

function applyFilters() {
    const sTerm = DOM.filterSearch.value.toLowerCase();
    const stIntent = DOM.filterIntent.value;
    const stEstado = DOM.filterEstado.value;
    const stMotivo = DOM.filterMotivo.value;

    // EL USUARIO PIDIÓ VER SOLO LOS QUE HAN INGRESADO/INTERACTUADO EN LA TABLA
    const portalUsers = clientes.filter(c => c.Ingreso_Portal === true);

    filteredClientes = portalUsers.filter(c => {
        const matchSearch = !sTerm || (c.Nombre && c.Nombre.toLowerCase().includes(sTerm)) || (c.Telefono && c.Telefono.includes(sTerm));
            
        let cIntent = c.Intencion_Recompra || 'Sin Respuesta';
        const matchIntent = !stIntent || cIntent === stIntent;
        const matchEstado = !stEstado || c.Estado === stEstado;
        const matchMotivo = !stMotivo || c.Motivo_Abandono === stMotivo;

        return matchSearch && matchIntent && matchEstado && matchMotivo;
    });

    if (sortCol) {
        filteredClientes.sort((a, b) => {
            let valA = a[sortCol] || ''; let valB = b[sortCol] || '';
            if (valA < valB) return sortAsc ? -1 : 1;
            if (valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });
    }

    renderAdminDashboard();
    renderAdminTable();
    renderAdminCharts();
}

// ==========================================
// ADMIN DASHBOARD RENDERERS
// ==========================================
function renderAdminDashboard() {
    // Mostrar Stats Globales sobre la base total
    const total = clientes.length;
    const ingresaron = clientes.filter(c => c.Ingreso_Portal).length;
    
    // EXCLUIR DATOS ANTIGUOS: Contar respuesta/reactivación solo si usaron el portal nuevo
    const respondieron = clientes.filter(c => c.Ingreso_Portal && c.Respondio === 'Sí').length;
    const reactivados = clientes.filter(c => c.Ingreso_Portal && c.Estado === 'Reactivado').length;
    
    const intentPositiva = clientes.filter(c => c.Ingreso_Portal && (c.Intencion_Recompra === 'Sí' || c.Intencion_Recompra === 'Tal vez')).length;
    const tasaIntent = respondieron === 0 ? 0 : Math.round((intentPositiva / respondieron) * 100);

    DOM.kpiTotal.innerText = total;
    DOM.kpiEntered.innerText = ingresaron;
    DOM.kpiResponded.innerText = respondieron;
    DOM.kpiReactivated.innerText = reactivados;
    DOM.kpiIntentRate.innerText = `${tasaIntent}%`;
}

function renderAdminTable() {
    DOM.tableResultsCount.innerText = `Mostrando ${filteredClientes.length} respuestas de portal`;
    DOM.tableBody.innerHTML = '';
    
    if (filteredClientes.length === 0) {
        DOM.crmTable.classList.add('hidden');
        DOM.emptyState.classList.remove('hidden');
        return;
    }
    
    DOM.crmTable.classList.remove('hidden');
    DOM.emptyState.classList.add('hidden');

    DOM.sortableHeaders.forEach(th => {
        const icon = th.querySelector('i');
        if(th.dataset.sort === sortCol) {
            icon.className = sortAsc ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
            icon.style.color = 'var(--primary-blue)';
        } else {
            icon.className = 'fa-solid fa-sort';
            icon.style.color = 'var(--status-inactivo)';
        }
    });

    const fragment = document.createDocumentFragment();

    filteredClientes.forEach(client => {
        const tr = document.createElement('tr');
        tr.dataset.estado = client.Estado || 'Inactivo';
        
        let intentBadge = '-';
        if (client.Intencion_Recompra) {
            let cls = 'talvez';
            if(client.Intencion_Recompra === 'Sí') cls = 'si';
            if(client.Intencion_Recompra === 'No') cls = 'no';
            intentBadge = `<span class="badge-intent ${cls}">${client.Intencion_Recompra}</span>`;
        }

        let isReactivado = client.Estado === 'Reactivado';
        let accBtn = isReactivado 
            ? `<button class="btn-action disabled" disabled><i class="fa-solid fa-check"></i> Reactivado</button>`
            : `<button class="btn-action" onclick="forceReactivate(${client.id})"><i class="fa-solid fa-bolt"></i> Forzar Compra</button>`;

        tr.innerHTML = `
            <td>
                <div class="user-info">
                    <span class="user-name">${client.Nombre}</span>
                    <span class="user-email">${client.Email || '-'}</span>
                </div>
            </td>
            <td>${client.Telefono}</td>
            <td>${client.Motivo_Abandono || '-'}</td>
            <td>${intentBadge}</td>
            <td>${client.Producto_Interes || client.Producto || '-'}</td>
            <td><span class="status-badge">${client.Estado}</span></td>
            <td>${accBtn}</td>
        `;
        fragment.appendChild(tr);
    });

    DOM.tableBody.appendChild(fragment);
}

// Global scope action for admin table
window.forceReactivate = function(id) {
    const client = clientes.find(c => c.id == id);
    if(client) {
        client.Estado = 'Reactivado';
        saveToLocalStorage();
        applyFilters();
        showAlert(`${client.Nombre} marcado como reactivado manualmente.`, 'success');
    }
}

function renderAdminCharts() {
    // Intent Chart - Sólo de usuarios que respondieron
    const intentsCount = { 'Sí': 0, 'No': 0, 'Tal vez': 0 };
    filteredClientes.forEach(c => {
        if(c.Intencion_Recompra && intentsCount[c.Intencion_Recompra] !== undefined) {
            intentsCount[c.Intencion_Recompra]++;
        }
    });

    const ctxIntent = document.getElementById('intentChart').getContext('2d');
    if (intentChartInst) intentChartInst.destroy();
    intentChartInst = new Chart(ctxIntent, {
        type: 'pie',
        data: {
            labels: Object.keys(intentsCount),
            datasets: [{
                data: Object.values(intentsCount),
                backgroundColor: ['#22C55E', '#EF4444', '#FBBF24'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // Reason Chart - De los usuarios del portal actual
    const reasonsCount = {};
    filteredClientes.forEach(c => {
        if(c.Motivo_Abandono && c.Respondio === 'Sí') {
            reasonsCount[c.Motivo_Abandono] = (reasonsCount[c.Motivo_Abandono] || 0) + 1;
        }
    });

    const ctxReason = document.getElementById('reasonsChart').getContext('2d');
    if (reasonsChartInst) reasonsChartInst.destroy();
    reasonsChartInst = new Chart(ctxReason, {
        type: 'bar',
        data: {
            labels: Object.keys(reasonsCount).length ? Object.keys(reasonsCount) : ['Sin Votos'],
            datasets: [{
                label: 'Resultados',
                data: Object.keys(reasonsCount).length ? Object.values(reasonsCount) : [1],
                backgroundColor: '#00A3E0',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// ==========================================
// EXPORTING TO CSV TO REFLECT UPDATES
// ==========================================
function exportToCsv() {
    if (clientes.length === 0) { showAlert('No hay datos para exportar.', 'error'); return; }
    
    const headersKeys = Object.keys(clientes[0]).filter(k => k !== 'id');
    const headerRow = headersKeys.map(k => `"${k}"`).join(',');
    
    const csvContent = [headerRow];
    clientes.forEach(client => {
        const row = headersKeys.map(k => {
            let val = client[k] === undefined ? '' : String(client[k]);
            return `"${val.replace(/"/g, '""')}"`;
        });
        csvContent.push(row.join(','));
    });
    
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CRM_Parmalat_Actualizado_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
