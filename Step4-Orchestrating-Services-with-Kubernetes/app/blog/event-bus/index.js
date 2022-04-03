const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const events = [];

app.get('/events', (req, res) => {
    res.send(events);
})

app.post('/events', async (req, res) => {
    const event = req.body;
    console.log('event bus received ', event);
    events.push(event);
    await axios.post('http://posts-clusterip-srv:4000/events', event).catch((err) => {console.log(err.message);}); // post
    // console.log('Emit to post');

    await axios.post('http://comments-clusterip-srv:4001/events', event).catch((err) => {console.log(err.message);}); // comment 
    // console.log('Emit to comment');

    await axios.post('http://query-clusterip-srv:4002/events', event).catch((err) => {console.log(err.message);}); // query
    // console.log('Emit to query');

    await axios.post('http://moderation-clusterip-srv:4003/events', event).catch((err) => {console.log(err.message);}); // moderation
    // console.log('Emit to moderation');

    res.send({status: 'OK'});
})


app.listen(4005, () => {
    console.log('V20');
    console.log('listening on port 4005');
}) 