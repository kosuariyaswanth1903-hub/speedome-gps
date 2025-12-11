const speedValue = document.getElementById("speedValue");
const needle = document.getElementById("needle");
const progress = document.getElementById("progress");

// GPS tracking
if ("geolocation" in navigator) {

    navigator.geolocation.watchPosition(
        function (pos) {
            let speed = pos.coords.speed; // meters/second

            if (speed === null) {
                speedValue.textContent = "0";
                return;
            }

            // Convert m/s → km/h
            let kmh = Math.round(speed * 3.6);

            if (kmh > 180) kmh = 180;

            speedValue.textContent = kmh;

            // Change arc color by speed
            if (kmh < 60) {
                progress.style.stroke = "#4caf50"; // green
            } else if (kmh < 120) {
                progress.style.stroke = "#ff9800"; // orange
            } else {
                progress.style.stroke = "#f44336"; // red
            }

            // Rotate needle (-90° to +90°)
            let angle = -90 + (kmh / 180) * 180;
            needle.style.transform = `rotate(${angle}deg)`;

            // Arc progress
            let dashOffset = 283 - (kmh / 180) * 283;
            progress.style.strokeDashoffset = dashOffset;
        },

        function (error) {
            alert("Please allow GPS to use the speedometer.");
        },

        {
            enableHighAccuracy: true,
            maximumAge: 500
        }
    );

} else {
    alert("GPS not supported on this device.");
}
