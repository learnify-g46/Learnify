import mongoose from "mongoose";
import dns from "dns";

// Force Node's DNS resolver to use Google DNS. This works around a known
// Windows issue where Node.js fails to resolve MongoDB's SRV records
// (querySrv ECONNREFUSED) even when the network itself is fine.
dns.setServers(["8.8.8.8", "8.8.4.4"])

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log("DB connected")
    } catch (error) {
        console.log("DB error:", error.message)
    }
}
export default connectDb