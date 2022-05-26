const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// middle ware --------- 
app.use(cors());
app.use(express.json());

// ---------- veryfy user function -------------- 
const verifyUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    

    if (!authHeader) {
        res.status(401).send({ message: 'Un-authorized user' })
    }
    const accessToken = authHeader.split(' ')[1];
    jwt.verify(accessToken, process.env.USER_ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            res.status(403).send({ message: 'Forbidden user' })
        }
        req.decoded = decoded;

        next();
    });


}

//----------------- mongoDB connect ----------------

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8weku.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



async function run() {
    try {
        await client.connect();
        //------ collections---------

        const userCollections = client.db("toolCollection").collection("user");
        const toolCollections = client.db("toolCollection").collection("tool");
        const reviewCollections = client.db("toolCollection").collection("review");
        const bookingCollections = client.db("toolCollection").collection("booking");
        const paymentCollections = client.db("toolCollection").collection("payment");
        const profileCollections = client.db("toolCollection").collection("profile");


        // -------======================================================================
        //                              product section
        // -------======================================================================

        //toolCollection-----------------------------------------------
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

        // remove tool --------------------
        app.delete('/tool/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await toolCollections.deleteOne(filter);
            res.send(result);
        });

        // add tool ----------------------- 
        app.post('/tool', async (req, res) => {
            const query = req.body;
            const result = await toolCollections.insertOne(query);
            res.send(result);
        });




        //reviewCollection-----------------------------------------------
        // ---------- get review data from DB ------- 
        app.get('/review', async (req, res) => {
            const tools = await reviewCollections.find().toArray();
            res.send(tools);
        });

        //------------ set new review -----------------
        app.post('/review', async (req, res) => {
            const query = req.body;
            const result = await reviewCollections.insertOne(query);
            res.send(result);
        })

        //--------- set booked data in mongoDB by client site ------
        app.post('/booking', async (req, res) => {
            const query = req.body;
            const result = await bookingCollections.insertOne(query);
            res.send(result);
        });

        // get booking data for client site --------------------
        app.get('/booking', verifyUser, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email === decodedEmail) {
                const filter = { email: email }
                const result = await bookingCollections.find(filter).toArray();
                return res.send(result);
            }
            else {
                return res.status(403).send({ message: 'Forbidden User' })
            }

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
            const amount = total * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card'],
            });

            res.send({ clientSecret: paymentIntent.client_secret });
        });

        //update payment info =================================
        app.put('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            };
            const allPayment = await paymentCollections.insertOne(payment);
            const updateBook = await bookingCollections.updateOne(filter, updateDoc);
            res.send(updateDoc);
        });

        // cencel book item ------------------------ 
        app.delete('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await bookingCollections.deleteOne(filter);
            res.send(result);
        });

        // ------- insert profile ------
        app.post('/profile', verifyUser, async (req, res) => {

            const query = req.body;

            const result = await profileCollections.insertOne(query);
            res.send(result);
        });

        // show up data client site --------------  
        app.get('/profile', async (req, res) => {
            const email = req.query.email;
            const filter = { email: email };
            const result = await profileCollections.findOne(filter);
            res.send(result);
        });

        //------------------------------------------------------------------ 
        //                          user section
        //------------------------------------------------------------------ 

        // --====================== normal user =========================

        // set user to mongoDB from client site -----------------
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateUser = {
                $set: user
            };
            const result = await userCollections.updateOne(filter, updateUser, options);
            const token = jwt.sign({ email: email }, process.env.USER_ACCESS_TOKEN, { expiresIn: '1d' });

            res.send({ result, token });
        })


        // --====================== admin user =========================
        // --====================== admin user =========================
        // get all user for admin ----------------------- 
        app.get('/admin', async (req, res) => {
            const result = await userCollections.find().toArray();
            res.send(result);
        });
        // set admin role -------------- 
        app.put('/admin/:email', verifyUser, async (req, res) => {
            const email = req.params.email;
            const requesterEmail = req.decoded.email;
            const runningRequester = await userCollections.findOne({ email: requesterEmail });
            if (runningRequester === 'admin') {
                const filter = { email: email };
                const updateRole = {
                    $set: {
                        role: 'admin'
                    }
                };
                const result = await userCollections.updateOne(filter, updateRole);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'Forbidden ' })
            }
        });

        // showing route for admin ---------------
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollections.findOne({ email: email });
            const findRole = user.role === 'admin';
            res.send({ admin: findRole });

        });

        // get all booking data form mongodb -----------------
        app.get('/manageorder',async(req,res)=>{
            const result = await bookingCollections.find().toArray();
            res.send(result);
        });

        // update sstatus by admin ------------------
        app.put('/manageorder/:statusId',async(req,res)=>{
            const id = req.params.statusId;
            const filter = {_id:ObjectId(id)};
            const updateStatus = {
                $set:{
                    shipped:true
                }
            };
            const result = await bookingCollections.updateOne(filter,updateStatus);
            res.send(updateStatus);
        });


        // deleted unpaid booked data ----------------  
        app.delete('/manageorder/:deletedId',async(req,res)=>{
            const id = req.params.deletedId;
            const filter = {_id:ObjectId(id)};
            const deletedData = await bookingCollections.deleteOne(filter);
            res.send(deletedData);
        });





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