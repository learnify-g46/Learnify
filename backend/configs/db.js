import mongoose from "mongoose";
import dns from "dns";

// Force Node's DNS resolver to use Google DNS. This works around a known
// Windows issue where Node.js fails to resolve MongoDB's SRV records
// (querySrv ECONNREFUSED) even when the network itself is fine.
dns.setServers(["8.8.8.8", "8.8.4.4"])

// Resolves when MongoDB is connected and throws when it cannot be reached (index.js then stops instead of
// serving requests that can only fail).
const connectDb = async () => {
    if (!process.env.MONGODB_URL) throw new Error("MONGODB_URL is missing in backend/.env")
    await mongoose.connect(process.env.MONGODB_URL, { serverSelectionTimeoutMS: 15000 })
    console.log("DB connected")
    mongoose.connection.on("disconnected", () => console.log("DB disconnected - requests will fail until it reconnects"))
    mongoose.connection.on("reconnected", () => console.log("DB reconnected"))
}
export default connectDb