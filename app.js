// Firebase Configuration (Fallback Local Storage αν δεν υπάρχει ενεργό config)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:123456"
};

let currentUser = null;
let db = null;

try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    
    firebase.auth().onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            document.getElementById('loginBtn').classList.add('hidden');
            document.getElementById('userInfo').classList.remove('hidden');
            document.getElementById('userAvatar').src = user.photoURL || '';
            document.getElementById('userName').innerText = user.displayName ? user.displayName.split(' ')[0] : 'User';
            syncCloudHistory();
        } else {
            document.getElementById('loginBtn').classList.remove('hidden');
            document.getElementById('userInfo').classList.add('hidden');
        }
    });
} catch (e) {
    console.log("Firebase setup skipped, using Local Storage fallback.");
}

function loginGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(error => {
        alert("Σφάλμα σύνδεσης: " + error.message);
    });
}

function logoutGoogle() {
    firebase.auth().signOut().then(() => {
        location.reload();
    });
}

let currentWater = 0;
let selectedMood = '';
let selectedMoodColor = '#333';

function showStep(stepNumber) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
    if (stepNumber === 0) {
        document.getElementById('mainMenu').classList.remove('hidden');
    } else {
        document.getElementById(`step${stepNumber}`).classList.remove('hidden');
    }
}

function updateTempUI() {
    const slider = document.getElementById('tempSlider');
    const val = slider.value;
    const tempText = document.getElementById('tempValue');
    const icon = document.getElementById('tempIcon');
    tempText.innerText = `${val}°C`;

    let color;
    if (val < 12) color = "#2196F3";
    else if (val < 22) color = "#FFD700";
    else if (val < 30) color = "#FF9800";
    else color = "#F44336";
    
    tempText.style.color = color;
    slider.style.accentColor = color;
    icon.style.filter = `drop-shadow(0px 0px 6px ${color})`;
}

function selectMood(moodName, color) {
    selectedMood = moodName;
    selectedMoodColor = color;
    const moodText = document.getElementById('selectedMoodText');
    moodText.innerText = `Επιλογή: ${moodName}`;
    moodText.style.color = color;
}

function addWater() {
    if (currentWater < 8) currentWater++;
    else currentWater = 0;
    document.getElementById('waterCount').innerText = currentWater;
    
    const fillPercent = (currentWater / 8) * 100;
    document.getElementById('waterLevel').style.height = `${fillPercent}%`;
}

async function finishLogging() {
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

    if (currentUser && db) {
        try {
            await db.collection('users').doc(currentUser.uid).collection('logs').add(newLog);
        } catch (err) {
            console.error("Cloud save failed, saved locally.", err);
        }
    }

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

async function syncCloudHistory() {
    if (!currentUser || !db) return;
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('logs').get();
        let cloudLogs = [];
        snapshot.forEach(doc => cloudLogs.push(doc.data()));
        if (cloudLogs.length > 0) {
            localStorage.setItem('myTrackerHistory', JSON.stringify(cloudLogs));
            if (!document.getElementById('historyScreen').classList.contains('hidden')) {
                renderHistory();
            }
        }
    } catch (e) {
        console.error("Failed to sync cloud history", e);
    }
}

function openHistory() {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
    document.getElementById('historyScreen').classList.remove('hidden');

    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('historyMonthPicker').value = monthStr;

    renderHistory();
}

function renderHistory() {
    const monthVal = document.getElementById('historyMonthPicker').value;
    if (!monthVal) return;

    const [year, month] = monthVal.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const history = JSON.parse(localStorage.getItem('myTrackerHistory')) || [];

    let tempColors = [];
    let moodColors = [];
    let totalWaterGlasses = 0;
    let totalSteps = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const entry = history.find(item => {
            if (!item.rawDate) return false;
            const d = new Date(item.rawDate);
            return d.getFullYear() === year && (d.getMonth() + 1) === month && d.getDate() === day;
        });

        tempColors.push(entry && entry.tempColor ? entry.tempColor : '#e0e0e0');
        moodColors.push(entry && entry.moodColor ? entry.moodColor : '#e0e0e0');

        if (entry) {
            totalWaterGlasses += Number(entry.water || 0);
            totalSteps += Number(entry.steps || 0);
        }
    }

    drawGradientSnake('tempCanvas', tempColors);
    drawGradientSnake('moodCanvas', moodColors);

    const totalLiters = (totalWaterGlasses * 0.25).toFixed(1);
    document.getElementById('pondText').innerText = `💧 ${totalLiters} L`;
    document.getElementById('frogSteps').innerText = `${totalSteps.toLocaleString()} βήματα`;
    
    const pondFill = Math.min((totalLiters / 50) * 100, 100);
    document.getElementById('pondWater').style.height = `${pondFill}%`;
}

function drawGradientSnake(canvasId, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(25, 0, canvas.width - 15, 0);
    const step = 1 / (colors.length - 1);
    colors.forEach((color, index) => {
        gradient.addColorStop(index * step, color);
    });

    ctx.beginPath();
    ctx.moveTo(25, 45);
    ctx.bezierCurveTo(70, 10, 110, 80, 160, 45);
    ctx.bezierCurveTo(200, 10, 220, 80, 265, 45);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    const headColor = colors[0] || '#ccc';
    ctx.beginPath();
    ctx.arc(18, 45, 9, 0, Math.PI * 2);
    ctx.fillStyle = headColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#333';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(15, 43, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
}