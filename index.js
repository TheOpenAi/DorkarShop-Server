const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//username=dorkarShop
//password=pIP6gmNB07pJmLWE

const uri = "mongodb+srv://dorkarShop:pIP6gmNB07pJmLWE@cluster0.yund2vi.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{

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