const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const MEASUREMENT_ID = 'G-EZ6MPB43Q6';
const API_SECRET = 'iuFDSAUBTbaTZTY2dkmAdA';

const clientIdFile = path.join(__dirname, 'client_id.json');

function getClientId() {
    if (fs.existsSync(clientIdFile)) {
        return JSON.parse(fs.readFileSync(clientIdFile, 'utf-8')).client_id;
    } else {
        const newClientId = uuidv4();
        fs.writeFileSync(clientIdFile, JSON.stringify({ client_id: newClientId }, null, 2));
        return newClientId;
    }
}

async function sendEvent(eventName, eventParams = {}) {
    const payload = {
        client_id: getClientId(),
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

module.exports = { sendEvent,getClientId };