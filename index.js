const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');


// middle ware --------- 
app.use(cors());
app.use(express.json());

//----------------- mongoDB connect ----------------

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8weku.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(err => {
  const collection = client.db("test").collection("devices");
  console.log('DB is connectING');
  // perform actions on the collection object
  client.close();
});


// start server
app.get('/',async(req,res)=>{
    res.send('Wow! it"s working');
});


// listening--------
app.listen(port, ()=>{
    console.log('Running Port is :' , port);
});