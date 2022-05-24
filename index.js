const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// middle ware --------- 
app.use(cors());
app.use(express.json());

//----------------- mongoDB connect ----------------

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8weku.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect();
        //------ collections---------
        const toolCollections = client.db("toolCollection").collection("tool");
        const reviewCollections = client.db("toolCollection").collection("review");
        const bookingCollections = client.db("toolCollection").collection("booking");
        const paymentCollections = client.db("toolCollection").collection("payment");


        // ---------- get tool data from DB ------- 
        app.get('/tool', async (req, res) => {
            const tools = await toolCollections.find().toArray();
            res.send(tools);
        });

        app.get('/tool/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await toolCollections.findOne(filter);
            res.send(result);
        });
        // ---------- get review data from DB ------- 
        app.get('/review', async (req, res) => {
            const tools = await reviewCollections.find().toArray();
            res.send(tools);
        });

        //--------- set booked data in mongoDB by client site ------
        app.post('/booking', async (req, res) => {
            const query = req.body;
            const result = await bookingCollections.insertOne(query);
            res.send(result);
        });

        // get booking data for client site --------------------
        app.get('/booking', async (req, res) => {
            const result = await bookingCollections.find().toArray();
            res.send(result);
        });


        //================== payment get ==================
        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };

            const result = await bookingCollections.findOne(filter);

            res.send(result);
        });

        // get payment by user ----------------
        app.post('/create-payment-intent', async (req, res) => {
            const { total } = req.body;
            const amount = total*100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types:['card'],
            });

            res.send({clientSecret: paymentIntent.client_secret});
        });

        //update payment info =================================
        app.put('/booking/:id',async(req,res)=>{
            const id = req.params.id;
            const payment = req.body;
            const filter = {_id:ObjectId(id)};
            const updateDoc = {
                $set:{
                    paid:true,
                    transactionId: payment.transactionId
                }
            };
            const allPayment = await paymentCollections.insertOne(payment);
            const updateBook = await bookingCollections.updateOne(filter,updateDoc);
            res.send(updateDoc);
        })

    }
    finally {
        // await client.close();
    }

}
run().catch(console.dir);


// start server
app.get('/', async (req, res) => {
    res.send('Wow! it"s working');
});


// listening--------
app.listen(port, () => {
    console.log('Running Port is :', port);
});