const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());


app.post('/events', (req, res) => {
    const event = req.body;
    console.log('event bus received ', event);
    axios.post('http://121.5.150.79:4000/events', event);
    axios.post('http://121.5.150.79:4001/events', event);
    axios.post('http://121.5.150.79:4002/events', event);

    res.send({status: 'OK'});
})


app.listen(4005, () => {
    console.log('listening on port 4005');
}) 