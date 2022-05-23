const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// middle ware --------- 
app.use(cors());
app.use(express.json());

//----------------- mongoDB connect ----------------

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8weku.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run(){
    try{
        await client.connect();
        //------ collections---------
        const toolCollections = client.db("toolCollection").collection("tool");
        const reviewCollections = client.db("toolCollection").collection("review");
        

        // ---------- get tool data from DB ------- 
        app.get('/tool', async(req,res)=>{
            const tools = await toolCollections.find().toArray();
            res.send(tools);
        });

        app.get('/tool/:id',async( req, res)=>{
            const id = req.params.id;
            const filter = {_id:ObjectId(id)};
            const result = await toolCollections.findOne(filter);
            res.send(result);
        })
        // ---------- get review data from DB ------- 
        app.get('/review', async(req,res)=>{
            const tools = await reviewCollections.find().toArray();
            res.send(tools);
        })

    }
    finally{
        // await client.close();
    }

}
run().catch(console.dir);


// start server
app.get('/',async(req,res)=>{
    res.send('Wow! it"s working');
});


// listening--------
app.listen(port, ()=>{
    console.log('Running Port is :' , port);
});