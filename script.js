let employees = [];
let persistentAttendance = {};
let branches = ['الفرع الرئيسي', 'فرع القاهرة', 'فرع الإسكندرية'];
let currentPrintMode = 'cards';

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupExcelListener();
    renderBranchSelects();
    renderBranchEmployees();
    renderSettingsList();
    initAttendanceGrid(); // تهيئة الجدول فارغ
    
    window.onclick = function(event) {
        if (event.target == document.getElementById('detailsModal')) closeModal();
    }
});

function loadData() {
    const empData = localStorage.getItem('HR_EmployeesDB');
    if(empData) employees = JSON.parse(empData);
    const attData = localStorage.getItem('HR_AttendanceData');
    if(attData) persistentAttendance = JSON.parse(attData);
    const branchData = localStorage.getItem('HR_Branches');
    if(branchData) branches = JSON.parse(branchData);
}

function saveData() { localStorage.setItem('HR_EmployeesDB', JSON.stringify(employees)); }
function saveBranches() { localStorage.setItem('HR_Branches', JSON.stringify(branches)); }

// --- إدارة الفروع ---
function addNewBranch() {
    const input = document.getElementById('newBranchInput');
    const name = input.value.trim();
    if(name && !branches.includes(name)) {
        branches.push(name); saveBranches(); renderBranchSelects(); renderSettingsList(); input.value = ''; alert("تم");
    } else alert("موجود مسبقاً");
}
function deleteBranch(name) {
    if(confirm("حذف الفرع؟")) { branches = branches.filter(b => b !== name); saveBranches(); renderBranchSelects(); renderSettingsList(); }
}
function renderSettingsList() {
    const list = document.getElementById('branchesList'); list.innerHTML = '';
    branches.forEach(b => { list.innerHTML += `<li><span>${b}</span> <i class="fa-solid fa-trash" onclick="deleteBranch('${b}')" style="color:red; cursor:pointer"></i></li>`; });
}
function renderBranchSelects() {
    const selects = document.querySelectorAll('.dynamic-branch-select');
    const currentMain = document.getElementById('mainBranchFilter').value;
    selects.forEach(s => { s.innerHTML = ''; branches.forEach(b => { s.innerHTML += `<option value="${b}">${b}</option>`; }); });
    if(branches.includes(currentMain)) document.getElementById('mainBranchFilter').value = currentMain;
}

// --- إدارة الموظفين ---
function renderBranchEmployees() {
    const branch = document.getElementById('mainBranchFilter').value;
    const month = document.getElementById('mainMonthFilter').value;
    const list = document.getElementById('branchEmployeesList'); list.innerHTML = '';
    const filtered = employees.filter(e => e.branch === branch && e.month === month);
    document.getElementById('empCount').innerText = filtered.length;
    filtered.forEach(emp => {
        const li = document.createElement('li'); 
        li.innerHTML = `<span>${emp.name}</span> <small>#${emp.id}</small>`;
        li.onclick = () => loadEmployeeToForm(emp.id);
        if(document.getElementById('empId').value === emp.id) li.classList.add('selected');
        list.appendChild(li);
    });
    document.getElementById('empBranch').value = branch; document.getElementById('empMonth').value = month;
}

function resetForm() {
    document.getElementById('empName').value = ''; document.getElementById('empId').value = '';
    document.getElementById('jobTitle').value = ''; document.getElementById('dailyWage').value = '';
    document.getElementById('insurance').value = ''; document.getElementById('loans').value = '';
    document.getElementById('loanMonths').value = '1'; document.getElementById('deduct10').value = ''; 
    document.getElementById('deduct20').value = ''; document.getElementById('bonus').value = ''; 
    document.getElementById('generalDeduct').value = '';
    document.getElementById('formTitle').innerText = 'موظف جديد'; 
    document.getElementById('delBtn').style.display = 'none';
    initAttendanceGrid();
}

// *** الحل لمشكلة الاسم والرقم ***
function saveEmployee() {
    const id = document.getElementById('empId').value.trim(); 
    const name = document.getElementById('empName').value.trim();
    const branch = document.getElementById('mainBranchFilter').value;
    const month = document.getElementById('mainMonthFilter').value;

    if (!id || !name) { alert("أكمل البيانات"); return; }

    // 1. التحقق من تطابق الاسم مع الرقم في كل قاعدة البيانات
    // نبحث عن أي موظف بنفس الرقم ولكن باسم مختلف
    const conflictEmp = employees.find(e => e.id === id && e.name !== name);
    if (conflictEmp) {
        alert(`خطأ: الرقم الوظيفي (${id}) مسجل بالفعل باسم الموظف "${conflictEmp.name}" في فرع (${conflictEmp.branch}).\nلا يمكن تسجيل نفس الرقم لاسم مختلف.`);
        return;
    }

    // 2. التحقق من التكرار داخل نفس الفرع والشهر
    const existingIndex = employees.findIndex(e => e.id === id && e.branch === branch && e.month === month);
    const isEditing = document.getElementById('formTitle').innerText.includes('تعديل');

    if (!isEditing && existingIndex >= 0) {
        alert("هذا الموظف مسجل بالفعل في هذا الفرع وهذا الشهر!");
        return;
    }

    const employee = {
        id, name, branch, month,
        job: document.getElementById('jobTitle').value,
        financials: {
            dailyWage: parseFloat(document.getElementById('dailyWage').value) || 0,
            insurance: parseFloat(document.getElementById('insurance').value) || 0,
            loans: parseFloat(document.getElementById('loans').value) || 0,
            loanMonths: parseFloat(document.getElementById('loanMonths').value) || 1,
            deduct10: parseFloat(document.getElementById('deduct10').value) || 0,
            deduct20: parseFloat(document.getElementById('deduct20').value) || 0,
            bonus: parseFloat(document.getElementById('bonus').value) || 0,
            generalDeduct: parseFloat(document.getElementById('generalDeduct').value) || 0
        }, 
        attendance: getTableData()
    };

    if (existingIndex >= 0) employees[existingIndex] = employee; 
    else employees.push(employee);

    saveData(); renderBranchEmployees(); alert("تم الحفظ");
}

function deleteEmployee() {
    if(confirm("حذف؟")) {
        const id = document.getElementById('empId').value;
        const branch = document.getElementById('mainBranchFilter').value;
        const month = document.getElementById('mainMonthFilter').value;
        employees = employees.filter(e => !(e.id === id && e.branch === branch && e.month === month));
        saveData(); renderBranchEmployees(); resetForm();
    }
}

function loadEmployeeToForm(id) {
    const branch = document.getElementById('mainBranchFilter').value;
    const month = document.getElementById('mainMonthFilter').value;
    const emp = employees.find(e => e.id === id && e.branch === branch && e.month === month);
    if(!emp) return;

    document.getElementById('empName').value = emp.name; document.getElementById('empId').value = emp.id;
    document.getElementById('jobTitle').value = emp.job;
    const f = emp.financials;
    document.getElementById('dailyWage').value = f.dailyWage; document.getElementById('insurance').value = f.insurance;
    document.getElementById('loans').value = f.loans; document.getElementById('loanMonths').value = f.loanMonths;
    document.getElementById('deduct10').value = f.deduct10; document.getElementById('deduct20').value = f.deduct20;
    document.getElementById('bonus').value = f.bonus; document.getElementById('generalDeduct').value = f.generalDeduct;
    
    document.getElementById('delBtn').style.display = 'block'; 
    document.getElementById('formTitle').innerText = 'تعديل: ' + emp.name;
    
    initAttendanceGrid();
    if(emp.attendance) {
        Object.entries(emp.attendance).forEach(([day, times]) => {
            const row = document.querySelector(`tr[data-day="${day}"]`);
            if(row) { 
                row.querySelector('.in-time').value = times.in; 
                row.querySelector('.out-time').value = times.out; 
                calcRowHours(row.querySelector('.in-time')); 
            }
        });
    }
}

// *** الحل لمشكلة قراءة الإكسيل والتواريخ ***
function ExcelDateToJSDate(serial) {
    // دالة لتحويل رقم الإكسيل (مثل 45000) إلى تاريخ
    var utc_days  = Math.floor(serial - 25569);
    var utc_value = utc_days * 86400;
    var date_info = new Date(utc_value * 1000);
    // تصحيح فرق التوقيت البسيط
    var fractional_day = serial - Math.floor(serial) + 0.0000001;
    var total_seconds = Math.floor(86400 * fractional_day);
    var seconds = total_seconds % 60; total_seconds -= seconds;
    var hours = Math.floor(total_seconds / (60 * 60));
    var minutes = Math.floor(total_seconds / 60) % 60;
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

function setupExcelListener() {
    document.getElementById('excelInput').addEventListener('change', function(e) {
        const file = e.target.files[0]; if (!file) return;
        
        // تحميل البيانات القديمة أولاً لضمان الدمج
        const storedAtt = localStorage.getItem('HR_AttendanceData');
        if(storedAtt) persistentAttendance = JSON.parse(storedAtt);

        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // raw: true مهم جداً لقراءة التواريخ كأرقام من الإكسيل بدقة
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1, raw: true});

            let counter = 0;
            jsonData.forEach(row => {
                let id = row[2]; // العمود C
                let rawDate = row[3]; // العمود D

                if (id != null && rawDate != null) {
                    id = id.toString().trim();
                    let dateObj;

                    // معالجة التاريخ سواء كان نصاً أو رقماً
                    if (typeof rawDate === 'number') {
                        dateObj = ExcelDateToJSDate(rawDate);
                    } else {
                        dateObj = new Date(rawDate);
                    }

                    if (!isNaN(dateObj)) {
                        if (!persistentAttendance[id]) persistentAttendance[id] = {};
                        
                        // صيغة المفتاح: YYYY-MM-DD
                        const dateKey = dateObj.getFullYear() + '-' + 
                                       String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                                       String(dateObj.getDate()).padStart(2, '0');
                        
                        // صيغة الوقت للتخزين
                        const timeStr = dateObj.toString(); 

                        if (!persistentAttendance[id][dateKey]) persistentAttendance[id][dateKey] = [];
                        
                        // إضافة الوقت فقط إذا لم يكن موجوداً مسبقاً (لمنع التكرار عند الرفع المتعدد)
                        let exists = persistentAttendance[id][dateKey].some(t => new Date(t).getTime() === dateObj.getTime());
                        if(!exists) {
                            persistentAttendance[id][dateKey].push(timeStr);
                            counter++;
                        }
                    }
                }
            });

            localStorage.setItem('HR_AttendanceData', JSON.stringify(persistentAttendance));
            alert(`تم دمج البيانات بنجاح.\nتمت إضافة ${counter} بصمة جديدة.`);
            
            // تحديث فوري إذا كان هناك موظف مفتوح
            if(document.getElementById('empId').value) autoLoadAttendance();
        };
        reader.readAsArrayBuffer(file);
        e.target.value = ''; // تصفير الحقل
    });
}

function autoLoadAttendance() {
    const id = document.getElementById('empId').value; 
    if(!id || !persistentAttendance[id]) return;

    // استدعاء البصمة للموظف الحالي
    if(confirm("هل تريد استدعاء بصمات هذا الموظف؟")) {
        const dates = persistentAttendance[id];
        // يجب أن نمر على كل الأيام المخزنة
        Object.keys(dates).forEach(dateKey => {
            const dateObj = new Date(dateKey);
            const day = dateObj.getDate(); // 1, 10, 20...
            
            // فرز الأوقات
            const times = dates[dateKey].map(t => new Date(t)).sort((a,b) => a-b);
            
            if (times.length > 0) {
                const row = document.querySelector(`tr[data-day="${day}"]`);
                if (row) {
                    const first = times[0];
                    row.querySelector('.in-time').value = String(first.getHours()).padStart(2,'0')+':'+String(first.getMinutes()).padStart(2,'0');
                    
                    if(times.length > 1) {
                        const last = times[times.length-1];
                        row.querySelector('.out-time').value = String(last.getHours()).padStart(2,'0')+':'+String(last.getMinutes()).padStart(2,'0');
                    }
                    calcRowHours(row.querySelector('.in-time'));
                }
            }
        });
    }
}

// --- الجدول والحسابات ---
function initAttendanceGrid() {
    const tbody = document.querySelector('#attendanceGrid tbody'); tbody.innerHTML = '';
    for (let i = 1; i <= 31; i++) {
        tbody.innerHTML += `<tr data-day="${i}">
            <td>${i}</td>
            <td><input type="time" class="in-time" onchange="calcRowHours(this)"></td>
            <td><input type="time" class="out-time" onchange="calcRowHours(this)"></td>
            <td class="hours-cell">0.00</td>
        </tr>`;
    }
}
function getTableData() {
    const data = {}; 
    document.querySelectorAll('#attendanceGrid tbody tr').forEach(row => { 
        const i = row.querySelector('.in-time').value; const o = row.querySelector('.out-time').value; 
        if(i || o) data[row.getAttribute('data-day')] = { in: i, out: o }; 
    }); return data;
}
function calcRowHours(input) {
    const row = input.closest('tr'); 
    const i = row.querySelector('.in-time').value; const o = row.querySelector('.out-time').value;
    if(i && o) { 
        let d1 = new Date("2000-01-01T"+i), d2 = new Date("2000-01-01T"+o);
        let diff = (d2 - d1) / 36e5; if(diff < 0) diff += 24;
        row.querySelector('.hours-cell').innerText = diff.toFixed(2); 
    } else row.querySelector('.hours-cell').innerText = "0.00";
}

// --- الطباعة والـ Modal ---
function switchTab(tabName) {
    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
    document.getElementById('mainSection').style.display = 'none';
    document.getElementById('payrollSection').style.display = 'none';
    document.getElementById('settingsSection').style.display = 'none';
    
    if (tabName === 'main') {
        document.querySelector('.sidebar li:nth-child(1)').classList.add('active');
        document.getElementById('mainSection').style.display = 'block';
        document.getElementById('headerActions').style.display = 'block';
    } else if (tabName === 'payroll') {
        document.querySelector('.sidebar li:nth-child(2)').classList.add('active');
        document.getElementById('payrollSection').style.display = 'block';
        document.getElementById('headerActions').style.display = 'none';
        document.getElementById('printBranchFilter').value = document.getElementById('mainBranchFilter').value;
        switchPrintMode();
    } else {
        document.querySelector('.sidebar li:nth-child(3)').classList.add('active');
        document.getElementById('settingsSection').style.display = 'block';
        document.getElementById('headerActions').style.display = 'none';
        renderSettingsList();
    }
}
function switchPrintMode() { setPrintMode(currentPrintMode); }
function setPrintMode(mode) {
    currentPrintMode = mode;
    document.getElementById('btnModeCard').className = mode === 'cards' ? 'btn-secondary active' : 'btn-secondary';
    document.getElementById('btnModeList').className = mode === 'list' ? 'btn-secondary active' : 'btn-secondary';
    renderPayrollPreview();
}
function calculateSalary(emp) {
    let workDays = 0; if (emp.attendance) Object.values(emp.attendance).forEach(d => { if (d.in) workDays++; });
    const f = emp.financials;
    const base = workDays * f.dailyWage;
    const loanPart = f.loans / (f.loanMonths || 1);
    const totalDeduct = f.insurance + loanPart + f.deduct10 + f.deduct20 + f.generalDeduct;
    return { workDays, base, totalDeduct, net: (base + f.bonus - totalDeduct).toFixed(2), deducts: { insurance: f.insurance, loanPart, d10: f.deduct10, d20: f.deduct20, general: f.generalDeduct } };
}
function renderPayrollPreview() {
    const container = document.getElementById('payrollPreview');
    const branch = document.getElementById('printBranchFilter').value;
    const month = document.getElementById('mainMonthFilter').value;
    container.innerHTML = '';
    const emps = employees.filter(e => e.branch === branch && e.month === month);
    if (emps.length === 0) { container.innerHTML = '<p style="text-align:center">لا بيانات</p>'; return; }
    emps.forEach(emp => {
        const c = calculateSalary(emp);
        const div = document.createElement('div'); div.className = 'preview-row';
        div.innerHTML = `<div class="preview-name">${emp.name}</div><div>${c.workDays} يوم</div><div class="preview-net">${c.net}</div>`;
        div.onclick = () => showEmployeeDetails(emp.id);
        container.appendChild(div);
    });
    generatePrintContent(emps, branch, month);
}
function showEmployeeDetails(id) {
    const branch = document.getElementById('printBranchFilter').value;
    const month = document.getElementById('mainMonthFilter').value;
    const emp = employees.find(e => e.id === id && e.branch === branch && e.month === month);
    if (!emp) return;
    const c = calculateSalary(emp);
    document.getElementById('modalBody').innerHTML = `
        <div class="details-header"><h3>${emp.name}</h3></div>
        <table class="details-table">
            <tr><td>أيام</td><td>${c.workDays}</td></tr>
            <tr><td>يومية</td><td>${emp.financials.dailyWage}</td></tr>
            <tr><td>إجمالي</td><td class="val-green">${c.base}</td></tr>
            <tr><td>خصومات</td><td class="val-red">${c.totalDeduct.toFixed(2)}</td></tr>
            <tr class="total-row"><td>صافي</td><td>${c.net}</td></tr>
        </table>`;
    document.getElementById('detailsModal').style.display = "block";
}
function generatePrintContent(emps, branch, month) {
    const div = document.getElementById('printArea'); div.innerHTML = `<div class="branch-header-print"><h2>${branch}</h2><p>${month}</p></div>`;
    if (currentPrintMode === 'cards') {
        const grid = document.createElement('div'); grid.className = 'cards-grid';
        emps.forEach(e => {
            const c = calculateSalary(e);
            grid.innerHTML += `<div class="pay-slip"><div class="slip-header"><span>${e.name}</span></div><div class="slip-footer">صافي: ${c.net}</div></div>`;
        });
        div.appendChild(grid);
    } else {
        let h = `<table class="manifesto-table"><thead><tr><th>م</th><th>الاسم</th><th>أيام</th><th>الصافي</th></tr></thead><tbody>`;
        emps.forEach((e,i) => { const c = calculateSalary(e); h += `<tr><td>${i+1}</td><td>${e.name}</td><td>${c.workDays}</td><td>${c.net}</td></tr>`; });
        div.innerHTML += h + `</tbody></table>`;
    }
}
function closeModal() { document.getElementById('detailsModal').style.display = "none"; }
