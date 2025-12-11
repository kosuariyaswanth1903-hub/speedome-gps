// 🚀 SPEEDOME - Simple GPS Speedometer
console.log('SpeedoMe GPS loaded!');

// ========== STATE ==========
const state = {
    isTracking: false,
    unit: 'kmh', // kmh, mph, or ms
    speed: 0,
    watchId: null
};

// ========== DOM ELEMENTS ==========
const elements = {
    speedValue: document.getElementById('speed-value'),
    speedUnit: document.getElementById('speed-unit'),
    startBtn: document.getElementById('start-btn'),
    unitBtns: document.querySelectorAll('.unit-btn')
};

// ========== INITIALIZATION ==========
function init() {
    console.log('Initializing SpeedoMe...');
    
    // Check GPS availability
    if (!navigator.geolocation) {
        showError('❌ GPS not supported by your browser. Try Chrome on mobile.');
        return;
    }
    
    // Start button event
    elements.startBtn.addEventListener('click', toggleTracking);
    
    // Unit buttons events
    elements.unitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            elements.unitBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            // Update unit
            state.unit = btn.dataset.unit;
            updateUnitDisplay();
            convertSpeed();
        });
    });
    
    console.log('✅ SpeedoMe ready! Click START to begin.');
}

// ========== GPS TRACKING ==========
function toggleTracking() {
    if (!state.isTracking) {
        startTracking();
    } else {
        stopTracking();
    }
}

function startTracking() {
    console.log('🟢 Starting GPS tracking...');
    
    // Check GPS permission
    if (!navigator.geolocation) {
        showError('GPS not available on this device');
        return;
    }
    
    // Update UI
    elements.startBtn.textContent = '⏹️ STOP GPS SPEEDOMETER';
    elements.startBtn.classList.add('stop');
    state.isTracking = true;
    
    // Start watching GPS position
    state.watchId = navigator.geolocation.watchPosition(
        // Success callback
        (position) => {
            handlePositionUpdate(position);
        },
        // Error callback
        (error) => {
            handleGpsError(error);
        },
        // Options
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        }
    );
}

function stopTracking() {
    console.log('🔴 Stopping GPS tracking...');
    
    if (state.watchId) {
        navigator.geolocation.clearWatch(state.watchId);
        state.watchId = null;
    }
    
    // Update UI
    elements.startBtn.textContent = '🟢 START GPS SPEEDOMETER';
    elements.startBtn.classList.remove('stop');
    state.isTracking = false;
    
    // Reset speed display
    state.speed = 0;
    elements.speedValue.textContent = '0.0';
    elements.speedValue.style.color = '#fff';
}

// ========== GPS DATA HANDLING ==========
function handlePositionUpdate(position) {
    let speedMps = 0; // Speed in meters per second
    
    // Get speed from GPS if available
    if (position.coords.speed !== null && position.coords.speed > 0) {
        speedMps = position.coords.speed;
    }
    
    // Convert to selected unit
    let displaySpeed = convertMpsToUnit(speedMps, state.unit);
    
    // Update state and display
    state.speed = displaySpeed;
    elements.speedValue.textContent = displaySpeed.toFixed(1);
    
    // Update color based on speed
    updateSpeedColor(displaySpeed);
    
    // Log accuracy (optional)
    if (position.coords.accuracy) {
        console.log(`GPS Accuracy: ${position.coords.accuracy.toFixed(1)}m`);
    }
}

function handleGpsError(error) {
    console.error('GPS Error:', error);
    
    let message = '';
    switch(error.code)
