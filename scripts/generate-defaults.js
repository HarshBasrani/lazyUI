// scripts/generate-defaults.js
const colors = require('tailwindcss/colors');
const defaultTheme = require('tailwindcss/defaultTheme');

// Helper: Flatten nested color objects (e.g., { slate: { 50: '#...' } } -> { 'slate-50': '#...' })
// Handles the special "DEFAULT" key correctly.
const flattenColors = (obj, prefix = '') => {
    let result = {};
    for (const [key, value] of Object.entries(obj)) {
        // Skip deprecated colors like 'lightBlue' if they exist in some versions
        if (['lightBlue', 'warmGray', 'trueGray', 'coolGray', 'blueGray'].includes(key)) continue;

        const newKey = prefix 
            ? (key === 'DEFAULT' ? prefix : `${prefix}-${key}`) 
            : key;

        if (typeof value === 'string') {
            result[newKey] = value;
        } else if (typeof value === 'object' && value !== null) {
            Object.assign(result, flattenColors(value, newKey));
        }
    }
    return result;
};

const frozenDefaults = {
    // Flatten the colors immediately so runtime is fast
    colors: flattenColors(colors),
    spacing: defaultTheme.spacing
};

console.log(JSON.stringify(frozenDefaults, null, 2));
