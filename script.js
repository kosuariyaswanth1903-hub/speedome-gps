// ?? SPEEDOME - Real Speed Detector
// Complete JavaScript Code

// ========== APP STATE ==========
const state = {
    mode: 'offline',
    isTracking: false,
    unit: 'km/h',
    speed: 0,
    activity: 'stationary',
    confidence: 0,
    
    trip: {
        distance: 0,
        maxSpeed: 0,
        startTime: null,
        elapsedTime: 0,
        avgSpeed: 0,
        positions: []
    },
    
    sensors: {
        gps: { active: false, accuracy: null, lastUpdate: null },
        motion: { active: false, variance: 0 },
        steps: { count: 0 }
    },
    
    intervals: {
        gps: null,
        motion: null,
        update: null
    }
};

// Activity configuration
const activities = {
    stationary: { emoji: '??', label: 'Not Moving', min: 0, max: 0.5 },
    walking: { emoji: '??', label: 'Walking', min: 0.5, max: 6 },
    running: { emoji: '??', label: 'Running', min: 6, max: 20 },
    cycling: { emoji: '??', label: 'Cycling', min: 20, max: 35 },
    vehicle: { emoji: '??', label: 'In Vehicle', min: 35, max: 200 }
};

// ========== DOM ELEMENTS ==========
const elements = {
    speedValue: document.getElementById('speed-value'),
    speedUnit: document.getElementById('speed-unit'),
    needle: document.getElementById('needle'),
    
    midLabel: document.getElementById('mid-label'),
    maxLabel: document.getElementById('max-label'),
    
    activityIcon: document.getElementById('activity-icon'),
    activityName: document.getElementById('activity-name'),
    confidence: document.getElementById('confidence'),
    
    distanceValue: document.getElementById('distance-value'),
    maxSpeedValue: document.getElementById('max-speed-value'),
    timeValue: document.getElementById('time-value'),
    avgSpeedValue: document.getElementById('avg-speed-value'),
    distUnit: document.getElementById('dist-unit'),
    
    unitBtn: document.getElementById('unit-btn'),
    trackBtn: document.getElementById('track-btn'),
    simulateBtn: document.getElementById('simulate-btn'),
    
    gpsDot: document.getElementById('gps-dot'),
    gpsText: document.getElementById('gps-text'),
    accuracy: document.getElementById('accuracy'),
    gpsStatus: document.getElementById('gps-status'),
    motionStatus: document.getElementById('motion-status'),
    
    modeDot: document.getElementById('mode-dot'),
    modeText: document.getElementById('mode-text'),
    
    instructionText: document.getElementById('instruction-text'),
    
    lastUpdate: document.getElementById('last-update'),
    latitude: document.getElementById('latitude'),
    longitude: document.getElementById('longitude'),
    altitude: document.getElementById('altitude'),
    motionVar: document.getElementById('motion-var'),
    resetBtn: document.getElementById('reset-btn'),
    debugToggle: document.getElementById('debug-toggle'),
    debugContent: document.getElementById('debug-content')
};

// ========== INITIALIZATION ==========
function initApp() {
    // Set up event listeners
    elements.unitBtn.addEventListener('click', toggleUnit);
    elements.trackBtn.addEventListener('click', toggleTracking);
    elements.simulateBtn.addEventListener('click', toggleSimulation);
    elements.resetBtn.addEventListener('click', resetApp);
    elements.debugToggle.addEventListener('click', toggleDebug);
    
    // Initialize display
    updateUnitLabels();
    updateDisplay();
    showToast('SpeedoMe loaded! Select a mode to begin.', 'info');
    
    // Check browser compatibility
    checkCompatibility();
}

// ========== MODE MANAGEMENT ==========
function toggleSimulation() {
    if (state.mode === 'simulate') {
        stopSimulation();
        state.mode = 'offline';
        updateModeDisplay();
        showToast('Simulation stopped', 'info');
    } else {
        if (state.mode === 'real') {
            stopRealTracking();
        }
        startSimulation();
        state.mode = 'simulate';
        updateModeDisplay();
        showToast('Simulation mode started', 'success');
    }
}

function toggleTracking() {
    if (state.mode === 'real') {
        stopRealTracking();
        state.mode = 'offline';
        updateModeDisplay();
        showToast('Real tracking stopped', 'info');
    } else {
        if (state.mode === 'simulate') {
            stopSimulation();
        }
        startRealTracking();
    }
}

// ========== REAL GPS TRACKING ==========
function startRealTracking() {
    if (!navigator.geolocation) {
        showToast('GPS not supported by your browser', 'error');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        () => {
            state.mode = 'real';
            state.isTracking = true;
            
            elements.trackBtn.innerHTML = '<i class="fas fa-stop"></i> STOP REAL TRACKING';
            elements.trackBtn.classList.remove('start');
            elements.trackBtn.classList.add('stop');
            elements.instructionText.textContent = 'Move to see your actual speed!';
            
            state.intervals.gps = navigator.geolocation.watchPosition(
                handleRealPosition,
                handleGpsError,
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 10000
                }
            );
            
            startMotionDetection();
            state.intervals.update = setInterval(updateTripData, 1000);
            
            resetTrip();
            state.trip.startTime = Date.now();
            
            updateModeDisplay();
            showToast('Real GPS tracking started! Move around!', 'success');
        },
        (error) => {
            showToast('Location permission denied!', 'error');
            console.error('GPS Permission error:', error);
        }
    );
}

function stopRealTracking() {
    if (state.intervals.gps) {
        navigator.geolocation.clearWatch(state.intervals.gps);
        state.intervals.gps = null;
    }
    
    if (state.intervals.motion) {
        clearInterval(state.intervals.motion);
        state.intervals.motion = null;
    }
    
    if (state.intervals.update) {
        clearInterval(state.intervals.update);
        state.intervals.update = null;
    }
    
    state.isTracking = false;
    elements.trackBtn.innerHTML = '<i class="fas fa-play"></i> START REAL TRACKING';
    elements.trackBtn.classList.remove('stop');
    elements.trackBtn.classList.add('start');
    
    showTripSummary();
}

function handleRealPosition(position) {
    state.sensors.gps.active = true;
    state.sensors.gps.accuracy = position.coords.accuracy;
    state.sensors.gps.lastUpdate = new Date();
    
    elements.lastUpdate.textContent = new Date().toLocaleTimeString();
    elements.latitude.textContent = position.coords.latitude.toFixed(6);
    elements.longitude.textContent = position.coords.longitude.toFixed(6);
    elements.altitude.textContent = position.coords.altitude ? 
        position.coords.altitude.toFixed(1) : '--';
    elements.accuracy.textContent = `Accuracy: ${position.coords.accuracy.toFixed(1)} m`;
    
    let speedKmh = 0;
    if (position.coords.speed !== null && position.coords.speed > 0) {
        speedKmh = position.coords.speed * 3.6;
    }
    
    const newPos = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        time: Date.now()
    };
    
    if (state.trip.positions.length > 0) {
        const lastPos = state.trip.positions[state.trip.positions.length - 1];
        const distance = calculateDistance(
            lastPos.lat, lastPos.lon,
            newPos.lat, newPos.lon
        );
        
        state.trip.distance += distance / 1000;
        
        if (speedKmh === 0 && distance > 0) {
            const timeDiff = (newPos.time - lastPos.time) / 1000;
            if (timeDiff > 0) {
                speedKmh = (distance / timeDiff) * 3.6;
            }
        }
    }
    
    state.trip.positions.push(newPos);
    updateSpeed(speedKmh);
    detectActivity(speedKmh);
    updateSensorDisplays();
}

function handleGpsError(error) {
    let message = 'GPS Error: ';
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message += 'Permission denied';
            break;
        case error.POSITION_UNAVAILABLE:
            message += 'Signal unavailable';
            break;
        case error.TIMEOUT:
            message += 'Timeout';
            break;
        default:
            message += 'Unknown error';
    }
    
    showToast(message, 'error');
    elements.gpsText.textContent = 'GPS: Error';
    elements.gpsDot.classList.remove('active');
    state.sensors.gps.active = false;
}

// ========== SIMULATION MODE ==========
function startSimulation() {
    state.isTracking = true;
    state.mode = 'simulate';
    
    elements.simulateBtn.innerHTML = '<i class="fas fa-stop"></i> STOP SIMULATION';
    elements.instructionText.textContent = 'Simulation active. Speed is simulated.';
    
    resetTrip();
    state.trip.startTime = Date.now();
    
    let lastSpeed = 0;
    state.intervals.update = setInterval(() => {
        const activity = activities[state.activity];
        let targetSpeed = 0;
        
        if (state.activity !== 'stationary') {
            targetSpeed = activity.min + Math.random() * (activity.max - activity.min);
            const acceleration = 0.5;
            const diff = targetSpeed - lastSpeed;
            lastSpeed += Math.sign(diff) * Math.min(Math.abs(diff), acceleration);
        } else {
            lastSpeed *= 0.9;
            if (lastSpeed < 0.1) lastSpeed = 0;
        }
        
        let displaySpeed = state.unit === 'mph' ? lastSpeed * 0.621371 : lastSpeed;
        state.trip.distance += (lastSpeed / 3600);
        
        updateSpeed(displaySpeed);
        updateTripData();
        
        if (Math.random() < 0.05) {
            const activityKeys = Object.keys(activities);
            const randomActivity = activityKeys[Math.floor(Math.random() * activityKeys.length)];
            if (randomActivity !== state.activity) {
                state.activity = randomActivity;
                updateActivityDisplay();
            }
        }
    }, 1000);
    
    updateModeDisplay();
}

function stopSimulation() {
    if (state.intervals.update) {
        clearInterval(state.intervals.update);
        state.intervals.update = null;
    }
    
    state.isTracking = false;
    elements.simulateBtn.innerHTML = '<i class="fas fa-gamepad"></i> SIMULATION MODE';
    updateSpeed(0);
    showTripSummary();
}

// ========== MOTION DETECTION ==========
function startMotionDetection() {
    if (!window.DeviceMotionEvent) {
        elements.motionStatus.textContent = 'Motion: Not Supported';
        return;
    }
    
    let lastAcceleration = { x: 0, y: 0, z: 0 };
    let variance = 0;
    const history = [];
    
    window.addEventListener('devicemotion', (event) => {
        const acc = event.accelerationIncludingGravity;
        if (!acc) return;
        
        const delta = Math.sqrt(
            Math.pow(acc.x - lastAcceleration.x, 2) +
            Math.pow(acc.y - lastAcceleration.y, 2) +
            Math.pow(acc.z - lastAcceleration.z, 2)
        );
        
        history.push(delta);
        if (history.length > 10) history.shift();
        
        const avg = history.reduce((a, b) => a + b, 0) / history.length;
        variance = history.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / history.length;
        
        state.sensors.motion.variance = variance;
        state.sensors.motion.active = variance > 0.1;
        
        if (delta > 1.5) {
            state.sensors.steps.count++;
        }
        
        lastAcceleration = { x: acc.x, y: acc.y, z: acc.z };
        elements.motionVar.textContent = variance.toFixed(3);
    });
    
    elements.motionStatus.textContent = 'Motion: Active';
}

// ========== SPEED & ACTIVITY DETECTION ==========
function updateSpeed(speedKmh) {
    state.speed = state.unit === 'mph' ? speedKmh * 0.621371 : speedKmh;
    
    if (state.speed > state.trip.maxSpeed) {
        state.trip.maxSpeed = state.speed;
    }
    
    elements.speedValue.textContent = state.speed.toFixed(1);
    
    const maxSpeed = state.unit === 'km/h' ? 200 : 120;
    const percentage = Math.min((state.speed / maxSpeed) * 100, 100);
    const rotation = -135 + (percentage * 2.7);
    
    elements.needle.style.transform = `rotate(${rotation}deg)`;
    
    if (state.speed === 0) {
        elements.speedValue.style.color = '#a0a0c0';
    } else if (state.speed < 20) {
        elements.speedValue.style.color = '#4CAF50';
    } else if (state.speed < 60) {
        elements.speedValue.style.color = '#FF9800';
    } else {
        elements.speedValue.style.color = '#ff4444';
    }
}

function detectActivity(speedKmh) {
    let newActivity = 'stationary';
    let newConfidence = 0;
    
    if (speedKmh < 0.5) {
        newActivity = 'stationary';
        newConfidence = 95;
    } else if (speedKmh <= 6) {
        newActivity = 'walking';
        newConfidence = Math.min(95, (speedKmh / 6) * 100);
    } else if (speedKmh <= 20) {
        newActivity = 'running';
        newConfidence = Math.min(95, ((speedKmh - 6) / 14) * 100);
    } else if (speedKmh <= 35) {
        newActivity = 'cycling';
        newConfidence = Math.min(95, ((speedKmh - 20) / 15) * 100);
    } else {
        newActivity = 'vehicle';
        newConfidence = Math.min(95, ((speedKmh - 35) / 165) * 100);
    }
    
    if (newActivity !== state.activity) {
        state.activity = newActivity;
        state.confidence = newConfidence;
        updateActivityDisplay();
    }
}

function updateActivityDisplay() {
    const activity = activities[state.activity];
    elements.activityIcon.textContent = activity.emoji;
    elements.activityName.textContent = activity.label;
    elements.confidence.textContent = `${Math.round(state.confidence)}% confidence`;
}

// ========== UNIT CONVERSION ==========
function toggleUnit() {
    state.unit = state.unit === 'km/h' ? 'mph' : 'km/h';
    updateUnitLabels();
    
    const wasMph = state.unit === 'mph';
    elements.unitBtn.innerHTML = `<i class="fas fa-exchange-alt"></i> Switch to ${wasMph ? 'km/h' : 'mph'}`;
    
    // Convert current speed
    if (state.unit === 'mph') {
        state.speed *= 0.621371;
        state.trip.maxSpeed *= 0.621371;
        state.trip.avgSpeed *= 0.621371;
    } else {
        state.speed /= 0.621371;
        state.trip.maxSpeed /= 0.621371;
        state.trip.avgSpeed /= 0.621371;
    }
    
    updateSpeed(state.speed);
    updateDisplay();
    showToast(`Switched to ${state.unit}`, 'info');
}

function updateUnitLabels() {
    elements.speedUnit.textContent = state.unit;
    elements.distUnit.textContent = state.unit === 'km/h' ? 'km' : 'mi';
    elements.midLabel.textContent = state.unit === 'km/h' ? '50' : '30';
    elements.maxLabel.textContent = state.unit === 'km/h' ? '100' : '60';
}

// ========== TRIP DATA ==========
function updateTripData() {
    if (!state.trip.startTime) return;
    
    const now = Date.now();
    state.trip.elapsedTime = Math.floor((now - state.trip.startTime) / 1000);
    
    // Update time display
    const hours = Math.floor(state.trip.elapsedTime / 3600);
    const minutes = Math.floor((state.trip.elapsedTime % 3600) / 60);
    const seconds = state.trip.elapsedTime % 60;
    
    elements.timeValue.textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update distance
    elements.distanceValue.textContent = state.trip.distance.toFixed(2);
    
    // Update max speed
    elements.maxSpeedValue.textContent = state.trip.maxSpeed.toFixed(1);
    
    // Update average speed
    if (state.trip.elapsedTime > 0) {
        const avgSpeed = (state.trip.distance / state.trip.elapsedTime) * 3600;
        state.trip.avgSpeed = avgSpeed;
        elements.avgSpeedValue.textContent = avgSpeed.toFixed(1);
    }
}

function resetTrip() {
    state.trip = {
        distance: 0,
        maxSpeed: 0,
        startTime: null,
        elapsedTime: 0,
        avgSpeed: 0,
        positions: []
    };
    updateDisplay();
}

// ========== HELPER FUNCTIONS ==========
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const f1 = lat1 * Math.PI / 180;
    const f2 = lat2 * Math.PI / 180;
    const ?f = (lat2 - lat1) * Math.PI / 180;
    const ?? = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(?f/2) * Math.sin(?f/2) +
              Math.cos(f1) * Math.cos(f2) *
              Math.sin(??/2) * Math.sin(??/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

function updateDisplay() {
    elements.distanceValue.textContent = state.trip.distance.toFixed(2);
    elements.maxSpeedValue.textContent = state.trip.maxSpeed.toFixed(1);
    elements.avgSpeedValue.textContent = state.trip.avgSpeed.toFixed(1);
}

function updateSensorDisplays() {
    elements.gpsStatus.textContent = `GPS: ${state.sensors.gps.active ? 'Active' : 'Off'}`;
    elements.motionStatus.textContent = `Motion: ${state.sensors.motion.active ? 'Active' : 'Off'}`;
    elements.gpsText.textContent = state.sensors.gps.active ? 'GPS: Active' : 'GPS: Waiting';
    elements.gpsDot.classList.toggle('active', state.sensors.gps.active);
}

function updateModeDisplay() {
    elements.modeDot.className = 'mode-dot ' + state.mode;
    elements.modeText.textContent = 
        state.mode === 'offline' ? 'OFFLINE MODE' :
        state.mode === 'real' ? 'REAL TRACKING' : 'SIMULATION MODE';
}

function showTripSummary() {
    if (state.trip.elapsedTime > 0) {
        showToast(`Trip ended: ${state.trip.distance.toFixed(2)} ${state.unit === 'km/h' ? 'km' : 'mi'} in ${elements.timeValue.textContent}`, 'info');
    }
}

// ========== DEBUG & UTILITIES ==========
function toggleDebug() {
    elements.debugContent.style.display = 
        elements.debugContent.style.display === 'block' ? 'none' : 'block';
}

function resetApp() {
    stopRealTracking();
    stopSimulation();
    resetTrip();
    state.mode = 'offline';
    state.activity = 'stationary';
    updateActivityDisplay();
    updateModeDisplay();
    updateSpeed(0);
    showToast('All data reset', 'info');
}

function checkCompatibility() {
    const issues = [];
    if (!navigator.geolocation) issues.push('GPS not supported');
    if (!window.DeviceMotionEvent) issues.push('Motion sensors not available');
    
    if (issues.length > 0) {
        showToast(`Limitations: ${issues.join(', ')}`, 'warning');
    }
}

// ========== TOAST NOTIFICATIONS ==========
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    
    // Set color based on type
    if (type === 'error') {
        toast.style.borderLeftColor = '#ff4444';
    } else if (type === 'success') {
        toast.style.borderLeftColor = '#4CAF50';
    } else if (type === 'warning') {
        toast.style.borderLeftColor = '#FF9800';
    } else {
        toast.style.borderLeftColor = '#667eea';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========== INITIALIZE APP ==========
document.addEventListener('DOMContentLoaded', initApp);