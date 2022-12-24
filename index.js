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

const uri = process.env.MONGODB_URL;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const usersCollection = client.db('dorkarShop').collection('users');

        //registration start
        app.post('/register',async(req,res)=>{
            const user = req.body;
            const { name, email, password,role } = user;

            // Validate user input
            if (!(email && password && name && role)) {
                res.status(400).send("All input is required");
            }
            const oldUser = await usersCollection.findOne({ email });

            if (oldUser) {
                return res.status(409).send("User Already Exist. Please Login");
            }
            encryptedPassword = await bcrypt.hash(password, 10);

            // Create user in our database
            const result = await usersCollection.insertOne({
                name,
                email: email.toLowerCase(), //convert email to lowercase
                password: encryptedPassword,
                role
            });

            const token = jwt.sign(
                { user_id: result._id, email },
                process.env.TOKEN_KEY,
                {
                    expiresIn: "7d",
                }
            );
            // save user token
            const filter = {email};
            const createdUser = await usersCollection.findOne(filter);
            createdUser.token = token;

            // return new user
            res.status(201).json(createdUser);
        });
        //registration end

    }
    finally{

    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("Dorkar Shop server is running");
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})