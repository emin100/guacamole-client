const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const MEASUREMENT_ID = 'G-EZ6MPB43Q6';
const API_SECRET = 'iuFDSAUBTbaTZTY2dkmAdA';

async function sendEvent(eventName, eventParams = {}) {
    const payload = {
        client_id: eventParams.client,
        events: [{
            name: eventName,
            params: eventParams
        }]
    };

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;

    try {
        await axios.post(url, payload);
        console.log(`Event gönderildi: ${eventName}`);
    } catch (err) {
        console.error('Event gönderilemedi:', err.message);
    }
}

module.exports = { sendEvent };