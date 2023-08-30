export const weatherIconMap: Record<number, [name: string, icon: string]> = {
    0: ["None", ""],
    1: ["Sunny Clouds", "mdi:weather-partly-cloudy"],
    2: ["Sunny", "mdi:weather-sunny"],
    3: ["Rainy", "mdi:weather-rainy"],
    4: ["Snowy", "mdi:weather-snowy"],
    5: ["Thunderstorm", "mdi:weather-lightning"],
    6: ["Foggy hor", "mdi:weather-fog"],
    7: ["Volcanic Ash", "mdi:weather-fog"],
    8: ["Sandstorm", "mdi:weather-fog"],
    9: ["Foggy dia", "mdi:weather-fog"],
    10: ["Underwater", "mdi:weather-fog"],
    11: ["Overcast", "mdi:weather-cloudy"],
    12: ["Drought", "mdi:weather-sunny-alert"],
    13: ["Downpour", "mdi:weather-pouring"],
    14: ["Underwater Bubbles", "ri:bubble-chart-line"],
    15: ["Abnormal", "mdi:weather-cloudy-alert"],
    16: ["Route 119 Cycle", "mdi:bicycle"],
    17: ["Route 123 Cycle", "mdi:bicycle"],
};

export const mapTypeNames: string[] = [
    "None", "Town", "City", "Route", "Underground", "Underwater", "Ocean Route", "Unknown", "Indoor", "Secret Base"
];