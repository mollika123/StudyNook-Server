const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require('express')
const dontenv = require('dotenv')
dontenv.config();

const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const uri = process.env.MONGODB_URI;

const app = express()
const port = process.env.PORT||8080

app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const JWKS = createRemoteJWKSet(
  new URL("http://localhost:3000/api/auth/jwks")
)
const verifyToken =async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({message:'Unauthorized'})
  }

  const token = authHeader.split(' ')[1];
   if (!token) {
    return res.status(401).json({message:'Unauthorized'})
  }
  console.log(token);
  try {
   const { payload } = await jwtVerify(token, JWKS)
    console.log(payload); 
    next()
  } catch (error) {
    return res.status(403).json({
      message:'Forbidden'
    })
  }
  

}
async function run() {
  try {

    await client.connect();
   const db = client.db("studynook");
    const roomsCollection = db.collection("rooms");
    const bookingCollection=db.collection("bookings")


    // app.get('/rooms', async (req, res) => {
    //   const result = await roomsCollection.find().toArray();
    //   res.json(result)
    // })

    app.get("/rooms", async (req, res) => {
  try {
    const {
      search,
      amenities,
      minRate,
      maxRate,
      floor,
    } = req.query;

    const query = {};

    // 🔍 Search by room name
    if (search) {
      query.roomName = {
        $regex: search,
        $options: "i",
      };
    }

    // ✅ Amenities filter
    if (amenities) {
      const amenitiesArray = amenities.split(",");

      query.amenities = {
        $in: amenitiesArray,
      };
    }

    // 💰 Hourly rate filter
    if (minRate || maxRate) {
      query.hourlyRate = {};

      if (minRate) {
        query.hourlyRate.$gte = Number(minRate);
      }

      if (maxRate) {
        query.hourlyRate.$lte = Number(maxRate);
      }
    }

    // 🏢 Floor filter
    if (floor) {
      query.floor = floor;
    }

    const result = await roomsCollection
      .find(query)
      .toArray();

    res.json(result);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Failed to fetch rooms",
    });
  }
});
    // middleware
    app.get('/rooms/:id',verifyToken,  async (req, res) => {
      const { id } = req.params;
      const result = await roomsCollection.findOne({
        _id: new ObjectId(id)
      });
      res.json(result)
    })
    app.get('/latest-rooms', async (req, res) => {
      const latestRooms=await roomsCollection.find({})
      .sort({ _id: -1 }) 
      .limit(6)          
      .toArray();
      
    res.json(latestRooms);
    })

       // My Listings - Single user rooms, without booking details

    app.get("/my-listings/:userId", async (req, res) => {
       const { userId } = req.params
      const result = await roomsCollection.find({ userId: userId }).toArray()
      res.json(result)
      
    })
    //   try {
    //     const userId = req.params.userId;

    //     const result = await roomsCollection
    //       .find({ creatorId: userId })
    //       .sort({ createdAt: -1 })
    //       .toArray();

    //     res.json(result);
    //   } catch (error) {
    //     res.json({
    //       success: false,
    //       message: "Failed to fetch listings",
    //       error,
    //     });
    //   }
    // });

    app.get('/booking/:userId', async (req, res) => {
      const { userId } = req.params
      const result = await bookingCollection.find({ userId: userId }).toArray()
      res.json(result)
      
    })
  app.delete("/booking/:bookingId", verifyToken,async (req, res) => {
  try {
    const { bookingId } = req.params;

    // 1. find booking first
    const booking = await bookingCollection.findOne({
      _id: new ObjectId(bookingId),
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    // 2. delete booking
    const result = await bookingCollection.deleteOne({
      _id: new ObjectId(bookingId),
    });

    // 3. remove from user bookings array ($pull requirement)
    await usersCollection.updateOne(
      { userId: booking.userId },
      {
        $pull: {
          bookings: bookingId,
        },
      }
    );

    res.json({
      success: true,
      message: "Booking deleted successfully",
      result,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Delete failed",
    });
  }
});
//     app.post('/booking', async (req, res) => {
//       const bookingData = req.body
//       const result = await bookingCollection.insertOne(bookingData);
//       res.json(result)
    // })
    
    app.post("/booking",verifyToken, async (req, res) => {
  try {
    const bookingData = req.body;

    const {
      roomId,
      date,
      startTime,
      endTime,
    } = bookingData;

    // 🔥 Convert to Date objects
    const newStart = new Date(`${date}T${startTime}`);
    const newEnd = new Date(`${date}T${endTime}`);

    // ✅ Check overlapping bookings
    const conflict =
      await bookingCollection.findOne({
        roomId,
        date,

        startDateTime: {
          $lt: newEnd,
        },

        endDateTime: {
          $gt: newStart,
        },
      });

    // ❌ Conflict found
    if (conflict) {
      return res.status(409).json({
        conflict: true,
        message:
          "This room is already booked for this time slot",
      });
    }

    // ✅ Final booking data
    const finalBooking = {
      ...bookingData,

      startDateTime: newStart,
      endDateTime: newEnd,

      createdAt: new Date(),
    };

    // ✅ Save booking
    const result =
      await bookingCollection.insertOne(
        finalBooking
      );

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Booking failed",
    });
  }
});

    
    app.patch('/rooms/:id',verifyToken, async (req, res) => {
      const { id } = req.params.id
      const updatedData = req.body
      console.log(updatedData);
      const result =await roomsCollection.updateOne(
        {_id:new ObjectId(id)},
        {$set:updatedData}
      )
      res.json(result)
    })
       app.delete("/rooms/:id",verifyToken,async (req, res) => {
      const { id } = req.params;
      const result = await roomsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });
    app.post("/rooms", async (req, res) => {
      const roomData = req.body;
      console.log(roomData);
  const result = await roomsCollection.insertOne(roomData);
  res.json(result);
});
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
app.get('/', (req, res) => {
  res.json('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
