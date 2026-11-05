let currentWater = 0;
let selectedMood = '';
let selectedMoodColor = '#333';

// Εναλλαγή Οθονών
function showStep(stepNumber) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
    if (stepNumber === 0) {
        document.getElementById('mainMenu').classList.remove('hidden');
    } else {
        document.getElementById(`step${stepNumber}`).classList.remove('hidden');
    }
}

// 1. Αλλαγή χρώματος Θερμοκρασίας
function updateTempUI() {
    const slider = document.getElementById('tempSlider');
    const val = slider.value;
    const tempText = document.getElementById('tempValue');
    const icon = document.getElementById('tempIcon');
    tempText.innerText = `${val}°C`;

    let color;
    if (val < 12) {
        color = "#2196F3"; // Μπλε
    } else if (val < 22) {
        color = "#FFD700"; // Κίτρινο
    } else if (val < 30) {
        color = "#FF9800"; // Πορτοκαλί
    } else {
        color = "#F44336"; // Κόκκινο
    }
    
    tempText.style.color = color;
    slider.style.accentColor = color;
    icon.style.filter = `drop-shadow(0px 0px 6px ${color})`;
}

// 2. Επιλογή Διάθεσης
function selectMood(moodName, color) {
    selectedMood = moodName;
    selectedMoodColor = color;
    const moodText = document.getElementById('selectedMoodText');
    moodText.innerText = `Επιλογή: ${moodName}`;
    moodText.style.color = color;
}

// 3. Ποτήρι Νερού
function addWater() {
    if (currentWater < 8) {
        currentWater++;
    } else {
        currentWater = 0;
    }
    document.getElementById('waterCount').innerText = currentWater;
    
    const fillPercent = (currentWater / 8) * 100;
    document.getElementById('waterLevel').style.height = `${fillPercent}%`;
}

// Ολοκλήρωση και αποθήκευση καταγραφής
function finishLogging() {
    const temp = document.getElementById('tempSlider').value;
    const steps = document.getElementById('stepInput').value || '0';
    
    let tempColor;
    if (temp < 12) tempColor = "#2196F3";
    else if (temp < 22) tempColor = "#FFD700";
    else if (temp < 30) tempColor = "#FF9800";
    else tempColor = "#F44336";

    const newLog = {
        rawDate: new Date().toISOString(),
        temp: temp,
        tempColor: tempColor,
        mood: selectedMood || 'Δεν ορίστηκε',
        moodColor: selectedMoodColor || '#ddd',
        water: currentWater,
        steps: steps
    };

    let history = JSON.parse(localStorage.getItem('myTrackerHistory')) || [];
    history.unshift(newLog);
    localStorage.setItem('myTrackerHistory', JSON.stringify(history));

    // Reset
    currentWater = 0;
    selectedMood = '';
    document.getElementById('waterCount').innerText = '0';
    document.getElementById('waterLevel').style.height = '0%';
    document.getElementById('stepInput').value = '';
    document.getElementById('tempSlider').value = 20;
    updateTempUI();

    alert("Η καταγραφή αποθηκεύτηκε με επιτυχία!");
    showStep(0);
}

// Άνοιγμα οθόνης Ιστορικού
function openHistory() {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
    document.getElementById('historyScreen').classList.remove('hidden');

    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const picker = document.getElementById('historyMonthPicker');
    picker.value = monthStr;

    renderHistory();
}

function renderHistory() {
    const monthVal = document.getElementById('historyMonthPicker').value;
    if (!monthVal) return;

    const [year, month] = monthVal.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const history = JSON.parse(localStorage.getItem('myTrackerHistory')) || [];

    const tempSnake = document.getElementById('tempSnake');
    const moodSnake = document.getElementById('moodSnake');
    tempSnake.innerHTML = '';
    moodSnake.innerHTML = '';

    let totalWaterGlasses = 0;
    let totalSteps = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const entry = history.find(item => {
            if (!item.rawDate) return false;
            const d = new Date(item.rawDate);
            return d.getFullYear() === year && (d.getMonth() + 1) === month && d.getDate() === day;
        });

        const tempSeg = document.createElement('div');
        tempSeg.className = 'snake-segment';
        tempSeg.innerText = day;
        if (entry && entry.tempColor) {
            tempSeg.style.backgroundColor = entry.tempColor;
            tempSeg.style.color = '#fff';
        }

        const moodSeg = document.createElement('div');
        moodSeg.className = 'snake-segment';
        moodSeg.innerText = day;
        if (entry && entry.moodColor) {
            moodSeg.style.backgroundColor = entry.moodColor;
            moodSeg.style.color = '#fff';
        }

        tempSnake.appendChild(tempSeg);
        moodSnake.appendChild(moodSeg);

        if (entry) {
            totalWaterGlasses += Number(entry.water || 0);
            totalSteps += Number(entry.steps || 0);
        }
    }

    const totalLiters = (totalWaterGlasses * 0.25).toFixed(1);
    document.getElementById('pondText').innerText = `💧 ${totalLiters} L`;
    document.getElementById('frogSteps').innerText = `${totalSteps.toLocaleString()} βήματα`;
    
    const pondFill = Math.min((totalLiters / 50) * 100, 100);
    document.getElementById('pondWater').style.height = `${pondFill}%`;
}