import mongoose from "mongoose";

import {DB_NAME} from "../constants.js";

const connectDB = async () =>{
    try{
         console.log(process.env.MONGODB_URI);

        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`)
    }catch(error){
        console.log("Connection Error", error);
        process.exit(1);
    }

    // console.log(process.env.MONGODB_URI);
}

export default connectDB;


// testing purpose: ---

// import mongoose from "mongoose";
// import { DB_NAME } from "../constants.js";

// const connectDB = async () => {
//   try {
//     const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);

//     console.log(
//       `MongoDB Connected: ${connectionInstance.connection.host}`
//     );
//   } catch (error) {
//      console.error("Mongo Error Name:", error.name);
//     console.error("Mongo Error Message:", error.message);
//     console.error("Mongo Error Cause:", error.cause);
//     throw error; // process.exit(1) ki jagah throw
//   }
// };

// export default connectDB;