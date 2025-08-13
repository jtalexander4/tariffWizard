const mongoose = require("mongoose");

const testConnection = async () => {
  console.log("🔍 Testing MongoDB connection...\n");

  const connectionOptions = [
    "mongodb://localhost:27017/tariffwizard",
    "mongodb://127.0.0.1:27017/tariffwizard",
  ];

  let connected = false;

  for (const uri of connectionOptions) {
    try {
      console.log(`Trying: ${uri}`);
      await mongoose.connect(uri);
      console.log(`✅ SUCCESS: Connected to ${uri}`);
      await mongoose.connection.close();
      connected = true;
      break;
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
    }
  }

  if (!connected) {
    console.log("\n🚨 MongoDB is not running or not installed!\n");
    console.log("📋 Setup Instructions:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Option 1: Install MongoDB locally");
    console.log("1. Download: https://www.mongodb.com/try/download/community");
    console.log("2. Install MongoDB Community Server");
    console.log("3. Start MongoDB service (usually automatic)");
    console.log("4. Or manually run: mongod --dbpath C:\\data\\db");
    console.log("");
    console.log("Option 2: Use MongoDB Atlas (Cloud)");
    console.log("1. Sign up: https://www.mongodb.com/atlas");
    console.log("2. Create a free cluster");
    console.log("3. Get connection string");
    console.log("4. Set environment variable:");
    console.log("   set MONGODB_URI");
    console.log("");
    console.log("Option 3: Use Docker");
    console.log("docker run -d -p 27017:27017 --name mongodb mongo:latest");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } else {
    console.log("\n✅ MongoDB is ready! You can now run the seed script.");
  }
};

testConnection().catch(console.error);
