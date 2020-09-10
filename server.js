const express = require('express');

const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send('okii...')
})

app.listen(3000, () => {
    console.log(`app listens on ${port}`)
})