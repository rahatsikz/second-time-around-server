const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Mobile resale server is working fine");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.htrvoxc.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const productCollection = client
      .db("secondTimeAround")
      .collection("products");

    /* categorized product api */
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { categoryID: parseInt(id) };
      // console.log(query);
      const products = await productCollection.find(query).toArray();
      res.send(products);
    });
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`buying second hand phone on port ${port}`);
});
