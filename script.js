// Constants and Configuration
const CONFIG = {
    TEMPERATURE: {
        MIN_C: -20,
        MAX_C: 40,
        MIN_F: -4,
        MAX_F: 104
    },
    WEATHER_CONDITIONS: ['Sunny', 'Cloudy', 'Rainy', 'Stormy', 'Snowy', 'Windy'],
    WEATHER_ICONS: {
        'Sunny': 'wi-day-sunny',
        'Cloudy': 'wi-cloudy',
        'Rainy': 'wi-rain',
        'Stormy': 'wi-storm-showers',
        'Snowy': 'wi-snow',
        'Windy': 'wi-strong-wind'
    },
    ANIMATION_CLASSES: {
        'Sunny': 'sunny',
        'Cloudy': '',
        'Rainy': 'rainy',
        'Stormy': 'rainy',
        'Snowy': 'snowy',
        'Windy': 'windy'
    },
    TIME_ZONES: {
        'Eastern': -4,
        'Central': -5,
        'Pacific': -7,
        'Default': 0
    }
};

let weatherGlobe;

// Initialize the globe when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the globe
    weatherGlobe = new WeatherGlobe('globeContainer');
    weatherGlobe.onLocationSelect = async (location) => {
        try {
            // Get city name from coordinates using reverse geocoding
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.lat}&longitude=${location.lon}&localityLanguage=en`);
            const data = await response.json();
            
            // Update location input with the selected place
            const locationInput = document.getElementById('location');
            locationInput.value = data.city || data.locality || data.principalSubdivision;
            
            // Trigger weather update
            getWeather();
        } catch (error) {
            handleError(error, 'Error getting location name');
        }
    };

    // Initialize event listeners
    document.getElementById('getWeatherBtn').addEventListener('click', getWeather);
    document.getElementById('timeZoneSelect').addEventListener('change', updateTime);
    document.addEventListener('click', createClickEffect);
    document.getElementById('unitSelect').addEventListener('change', getWeather);
    
    // Initialize time
    updateTime();
    // Update time every second
    setInterval(updateTime, 1000);
});

// Error handling utility
const handleError = (error, message = 'An error occurred') => {
    console.error(error);
    alert(`${message}: ${error.message}`);
};

// Input validation utility
const validateInput = (location) => {
    if (!location || location.trim().length === 0) {
        throw new Error('Please enter a valid location');
    }
};

// Temperature conversion utility
const convertTemperature = {
    CtoF: (celsius) => (celsius * 9/5 + 32).toFixed(1),
    getRandomTemp: (unit) => {
        const tempC = Math.random() * (CONFIG.TEMPERATURE.MAX_C - CONFIG.TEMPERATURE.MIN_C) + CONFIG.TEMPERATURE.MIN_C;
        return unit === 'F' ? convertTemperature.CtoF(tempC) : tempC.toFixed(1);
    }
};

// Time formatting utility
const formatDateTime = {
    getTimeString: (date, options = {}) => {
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true,
            ...options 
        });
    },
    getDateString: (date, options = {}) => {
        return date.toLocaleDateString([], { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            ...options 
        });
    }
};

function updateTime() {
    try {
        const currentTimeDiv = document.getElementById('currentTime');
        const now = new Date();
        const timeZone = document.getElementById('timeZoneSelect').value;
        const offset = CONFIG.TIME_ZONES[timeZone] || CONFIG.TIME_ZONES.Default;

        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const time = new Date(utc + (3600000 * offset));

        currentTimeDiv.textContent = formatDateTime.getDateString(time) + ' ' + 
                                   formatDateTime.getTimeString(time);
    } catch (error) {
        handleError(error, 'Error updating time');
    }
}

async function getWeather() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading';
    loadingDiv.textContent = 'Loading weather data...';
    document.body.appendChild(loadingDiv);

    try {
        const location = document.getElementById('location').value;
        validateInput(location);

        // Get coordinates for the location
        const coordinates = await getCoordinates(location);
        
        // Update globe marker
        weatherGlobe.clearMarkers();
        weatherGlobe.addMarker(coordinates.lat, coordinates.lon);

        const unit = document.getElementById('unitSelect').value;
        const currentWeatherDiv = document.getElementById('currentWeather');
        const weeklyForecastDiv = document.getElementById('weeklyForecast');

        const currentWeather = CONFIG.WEATHER_CONDITIONS[
            Math.floor(Math.random() * CONFIG.WEATHER_CONDITIONS.length)
        ];
        const currentTemp = convertTemperature.getRandomTemp(unit);
        const tempUnit = unit === 'F' ? '°F' : '°C';

        updateCurrentWeather(currentWeatherDiv, {
            location,
            currentWeather,
            currentTemp,
            tempUnit,
            coordinates
        });

        const weeklyForecast = generateWeeklyForecast(unit);
        updateWeeklyForecast(weeklyForecastDiv, weeklyForecast);

        // Store forecast data
        window.weeklyForecastData = weeklyForecast;

        // Predict next day's weather
        await predictAndDisplayNextDayWeather(weeklyForecast, unit);
    } catch (error) {
        handleError(error, 'Error fetching weather data');
    } finally {
        document.body.removeChild(loadingDiv);
    }
}

function updateCurrentWeather(div, data) {
    const { location, currentWeather, currentTemp, tempUnit, coordinates } = data;
    div.innerHTML = `
        <h2>${location}</h2>
        <p>${formatDateTime.getDateString(new Date())}</p>
        <p class="coordinates">Lat: ${coordinates.lat.toFixed(2)}° Lon: ${coordinates.lon.toFixed(2)}°</p>
        <i class="wi ${CONFIG.WEATHER_ICONS[currentWeather]} weather-icon ${CONFIG.ANIMATION_CLASSES[currentWeather]}"></i>
        <p>${currentWeather}</p>
        <p>Temperature: ${currentTemp}${tempUnit}</p>
    `;
}

function generateWeeklyForecast(unit) {
    return Array.from({ length: 7 }, (_, i) => {
        const weather = CONFIG.WEATHER_CONDITIONS[
            Math.floor(Math.random() * CONFIG.WEATHER_CONDITIONS.length)
        ];
        const temp = convertTemperature.getRandomTemp(unit);
        const tempUnit = unit === 'F' ? '°F' : '°C';

        return {
            day: getDayName(i),
            weather,
            temp,
            tempUnit,
            date: getDateString(i),
            hourly: generateHourlyForecast(unit)
        };
    });
}

function updateWeeklyForecast(div, forecast) {
    div.innerHTML = forecast.map((day, index) => `
        <div class="forecastDay" onclick="showDailyForecast(${index})">
            <h3>${day.day}</h3>
            <p>${day.date}</p>
            <i class="wi ${CONFIG.WEATHER_ICONS[day.weather]} weather-icon ${CONFIG.ANIMATION_CLASSES[day.weather]}"></i>
            <p>${day.weather}</p>
            <p>${day.temp}${day.tempUnit}</p>
        </div>
    `).join('');
}

function getDayName(dayIndex) {
    const date = new Date();
    date.setDate(date.getDate() + dayIndex);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function getDateString(dayIndex) {
    const date = new Date();
    date.setDate(date.getDate() + dayIndex);
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

function generateHourlyForecast(unit) {
    return Array.from({ length: 24 }, (_, i) => {
        const weather = CONFIG.WEATHER_CONDITIONS[
            Math.floor(Math.random() * CONFIG.WEATHER_CONDITIONS.length)
        ];
        const temp = convertTemperature.getRandomTemp(unit);
        const tempUnit = unit === 'F' ? '°F' : '°C';

        return {
            time: formatTime(i),
            weather,
            temp,
            tempUnit,
            animation: CONFIG.ANIMATION_CLASSES[weather]
        };
    });
}

function formatTime(hour) {
    const timeZone = document.getElementById('timeZoneSelect').value;
    let offset;
    switch (timeZone) {
        case 'Eastern':
            offset = -4;
            break;
        case 'Central':
            offset = -5;
            break;
        case 'Pacific':
            offset = -7;
            break;
        default:
            offset = 0;
    }

    const utc = new Date().getTime() + (new Date().getTimezoneOffset() * 60000);
    const time = new Date(utc + (3600000 * offset));
    time.setHours(hour);

    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function showDailyForecast(dayIndex) {
    try {
        const dailyForecastDiv = document.getElementById('dailyForecast');
        const weeklyForecastDiv = document.getElementById('weeklyForecast');
        const dayData = window.weeklyForecastData[dayIndex];

        if (!dayData) {
            throw new Error('Forecast data not found');
        }

        weeklyForecastDiv.style.display = 'none';
        dailyForecastDiv.style.display = 'block';
        
        updateDailyForecast(dailyForecastDiv, dayData);
    } catch (error) {
        handleError(error, 'Error showing daily forecast');
        goBack();
    }
}

function updateDailyForecast(div, data) {
    div.innerHTML = `
        <h2>${data.day} - ${data.date}</h2>
        <div id="dailyForecastContent" style="display: flex; overflow-x: auto;">
            ${data.hourly.map(hour => `
                <div class="hourlyForecast">
                    <p>${hour.time}</p>
                    <i class="wi ${CONFIG.WEATHER_ICONS[hour.weather]} weather-icon ${hour.animation}"></i>
                    <p>${hour.temp}${hour.tempUnit}</p>
                </div>
            `).join('')}
        </div>
        <button id="backButton" onclick="goBack()">Back</button>
    `;
}

function goBack() {
    const dailyForecastDiv = document.getElementById('dailyForecast');
    const weeklyForecastDiv = document.getElementById('weeklyForecast');
    dailyForecastDiv.style.display = 'none';
    weeklyForecastDiv.style.display = 'flex';
}

// Improved click effect with debouncing
const createClickEffect = (() => {
    let timeout;
    return (e) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        
        const clickEffect = document.createElement('div');
        clickEffect.className = 'click-circle';
        clickEffect.style.left = `${e.pageX - 25}px`;
        clickEffect.style.top = `${e.pageY - 25}px`;
        document.body.appendChild(clickEffect);

        timeout = setTimeout(() => {
            clickEffect.remove();
            timeout = null;
        }, 600);
    };
})();

// Improved weather prediction model with proper cleanup
async function predictNextDayWeather(temps, conditions) {
    let model;
    try {
        model = tf.sequential();
        model.add(tf.layers.dense({ 
            units: 8, 
            activation: 'relu',
            inputShape: [1] 
        }));
        model.add(tf.layers.dense({ 
            units: 2,
            activation: 'linear'
        }));

        model.compile({ 
            optimizer: tf.train.adam(0.01),
            loss: 'meanSquaredError'
        });

        const xs = tf.tensor2d(temps.map((_, i) => [i]), [temps.length, 1]);
        const ys = tf.tensor2d(temps.map((temp, i) => [temp, conditions[i]]), [temps.length, 2]);

        await model.fit(xs, ys, {
            epochs: 100,
            batchSize: 4,
            shuffle: true
        });

        const nextDayIndex = temps.length;
        const prediction = model.predict(tf.tensor2d([[nextDayIndex]]));
        const [predictedTemp, predictedCondition] = await prediction.data();

        return {
            predictedTemp: Math.max(CONFIG.TEMPERATURE.MIN_C, Math.min(CONFIG.TEMPERATURE.MAX_C, predictedTemp)),
            predictedCondition: Math.round(Math.max(0, Math.min(CONFIG.WEATHER_CONDITIONS.length - 1, predictedCondition)))
        };
    } catch (error) {
        throw new Error(`Prediction failed: ${error.message}`);
    } finally {
        // Cleanup TensorFlow tensors
        if (model) {
            model.dispose();
        }
        tf.disposeVariables();
    }
}

async function predictAndDisplayNextDayWeather(forecast, unit) {
    try {
        const historicalTemps = forecast.map(day => parseFloat(day.temp));
        const historicalConditions = forecast.map(day => 
            CONFIG.WEATHER_CONDITIONS.indexOf(day.weather)
        );

        const { predictedTemp, predictedCondition } = 
            await predictNextDayWeather(historicalTemps, historicalConditions);

        const formattedTemp = unit === 'F' ? 
            convertTemperature.CtoF(predictedTemp) : 
            predictedTemp.toFixed(1);

        const prediction = document.createElement('div');
        prediction.className = 'weather-prediction';
        prediction.innerHTML = `
            <h3>Weather Prediction for Tomorrow:</h3>
            <p>${CONFIG.WEATHER_CONDITIONS[predictedCondition]}</p>
            <p>${formattedTemp}${unit === 'F' ? '°F' : '°C'}</p>
        `;

        const currentWeatherDiv = document.getElementById('currentWeather');
        currentWeatherDiv.appendChild(prediction);
    } catch (error) {
        handleError(error, 'Error predicting weather');
    }
}

// Update the getCoordinates function
async function getCoordinates(location) {
    try {
        // Using OpenStreetMap Nominatim API (free and no API key required)
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
        }
        throw new Error('Location not found');
    } catch (error) {
        throw new Error(`Error getting coordinates: ${error.message}`);
    }
}