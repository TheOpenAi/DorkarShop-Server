const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const bcrypt = require('bcrypt');
const app = express();
const port = process.env.PORT || 5000;

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
        const prodcutsCollection = client.db('dorkarShop').collection('products');
   
        //registration start
        app.post('/register', async (req, res) => {
            const user = req.body ;
            console.log(user);
            const { name, email, password, role } = user;

            // Validate user input
            if (!(email && password && name && role)) {
                return res.status(400).send("All input is required");
            }
            const oldUser = await usersCollection.findOne({ email: email.toLowerCase() });

            if (oldUser) {
                return res.status(409).send({message:"User Already Exist. Please Login"});
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
                return res.status(400).send({message:"All input is required"});
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
            res.status(400).send({message:"Invalid Credentials"});
        });
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const categori ={category:id};
            console.log(categori);
            const products = await prodcutsCollection.find(categori).toArray();
            res.send(products);
        });
        app.get('/products', async (req, res) => {
            const products = await prodcutsCollection.find({}).toArray();
            res.send(products);
        });
        app.get('/productdetails/:id', async (req, res) => {
            const id = req.params.id;
            const product = await prodcutsCollection.findOne({ _id: ObjectId(id) });
            res.send(product);
        });
        // login end

        //get all users by role
        app.get('/users', async (req, res) => {
            const role = req.query.role;
            const query = { role: role };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        });

        //categories
        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
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
        })
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