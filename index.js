const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const SSLCommerzPayment = require('sslcommerz-lts')
const jwt = require('jsonwebtoken');
require('dotenv').config();
const bcrypt = require('bcrypt');
const app = express();
const port = process.env.PORT || 5000;

//Payment
const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = false //true for live, false for sandbox

app.use(cors());
app.use(express.json());

//username=dorkarShop
//password=pIP6gmNB07pJmLWE
const uri = "mongodb+srv://dorkarShop:pIP6gmNB07pJmLWE@cluster0.yund2vi.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoriesCollection = client.db('dorkarShop').collection('categories');
        const productsCollection = client.db('dorkarShop').collection('products');
        const usersCollection = client.db('dorkarShop').collection('users');
        const cartsCollection = client.db('dorkarShop').collection('carts');
        const ordersCollection = client.db('dorkarShop').collection('orders');

        //registration start
        app.post('/register', async (req, res) => {
            const user = req.body;
            console.log(user);
            const { name, email, password, role } = user;

            // Validate user input
            if (!(email && password && name && role)) {
                return res.status(400).send("All input is required");
            }
            const oldUser = await usersCollection.findOne({ email: email.toLowerCase() });

            if (oldUser) {
                return res.status(409).send({ message: "User Already Exist. Please Login" });
            }
            encryptedPassword = await bcrypt.hash(password, 10);

            // Create user in our database
            const result = await usersCollection.insertOne({
                name,
                email: email.toLowerCase(), //convert email to lowercase
                password: encryptedPassword,
                role
            });
            console.log();
            const token = jwt.sign(
                { user_id: result._id, email },
                process.env.TOKEN_KEY,
                {
                    expiresIn: "7d",
                }
            );
            // save user token
            const filter = { email };
            const createdUser = await usersCollection.findOne(filter);
            createdUser.token = token;

            // return new user
            res.status(201).json(createdUser);
        });
        //registration end


        // login start 
        app.post("/login", async (req, res) => {
            // Get user input
            const { email, password } = req.body;

            // Validate user input
            if (!(email && password)) {
                return res.status(400).send({ message: "All input is required" });
            }
            // Validate if user exist in our database
            const user = await usersCollection.findOne({ email });

            if (user && (await bcrypt.compare(password, user.password))) {
                // Create token
                const token = jwt.sign(
                    { user_id: user._id, email },
                    process.env.TOKEN_KEY,
                    {
                        expiresIn: "7d",
                    }
                );

                // save user token
                user.token = token;

                // user
                return res.status(200).json(user);
            }
            res.status(400).send({ message: "Invalid Credentials" });
        });

        // login end


        //get all users by role
        app.get('/users', async (req, res) => {
            const role = req.query.role;
            if (role) {
                const query = { role: role };
                const result = await usersCollection.find(query).toArray();
                return res.send(result);
            }
            const result = await usersCollection.find({}).toArray();
            res.send(result);

        });


        //for payment
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const orderedService = await productsCollection.findOne({ _id: ObjectId(order.productsId) })
            console.log(orderedService);
            // res.send(orderedService);
            const transectionId = new ObjectId().toString();


            const data = {
                total_amount: orderedService.price,
                currency: 'BDT',
                tran_id: transectionId, // use unique tran_id for each api call
                success_url: `http://localhost:5000/payment/success?transectionId=${transectionId}`,
                fail_url: 'http://localhost:5000/payment/fail',
                cancel_url: 'http://localhost:5000/payment/cancel',
                ipn_url: 'http://localhost:3030/ipn',
                shipping_method: 'Courier',
                product_name: 'Computer.',
                product_category: 'Electronic',
                product_profile: 'general',
                cus_name: 'Customer Name',
                cus_email: 'customer@example.com',
                cus_add1: 'Dhaka',
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: '01711111111',
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
            };

            console.log(data);
            // res.send(data);

            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
            sslcz.init(data).then(apiResponse => {
                // Redirect the user to payment gateway
                let GatewayPageURL = apiResponse.GatewayPageURL;
                console.log(apiResponse);

                ordersCollection.insertOne({
                    ...order,
                    price: orderedService.price,
                    transectionId,
                    paid: false,

                });
                // res.redirect(GatewayPageURL)
                // console.log('Redirecting to: ', GatewayPageURL);
                res.send({ url: GatewayPageURL, data: data });
            });

        });

        app.post('/payment/success', async (req, res) => {
            // console.log("success")
            const { transectionId } = req.query;
            // console.log(transectionId);
            const result = await ordersCollection.updateOne(
                { transectionId },
                { $set: { paid: true, paidAt: new Date() } }
            );

            if (result.modifiedCount > 0) {
                res.redirect(`http://localhost:3000/payment/success?transectionId=${transectionId}`)

            }


        });





        //categories
        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        });

        // get products 
        app.get('/products', async (req, res) => {
            const products = await productsCollection.find({}).toArray();
            res.send(products);
        });
        //get products by id
        app.get('/productdetails/:id', async (req, res) => {
            const id = req.params.id;
            const product = await productsCollection.findOne({ _id: ObjectId(id) });
            res.send(product);
        });
        //get products by category name
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { category: id };
            const product = await productsCollection.find(query).toArray();
            res.send(product);
        })
        //save products
        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        //carts
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const carts = await cartsCollection.find(query).toArray();
            res.send(carts);
        });
        //carts get by id
        app.get('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const cart = await cartsCollection.findOne(query);
            res.send(cart);
        });

        app.post('/carts', async (req, res) => {
            const cart = req.body;
            console.log(cart);
            const query = {};
            const result = await cartsCollection.insertOne(cart);
            res.send(result);
        });
        //carts delete
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await cartsCollection.deleteOne(query);
            res.send(result);
        });

    }

    finally {

    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("Dorkar Shop server is running");
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})