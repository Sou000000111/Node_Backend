import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});



const uploadOnClodinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        console.log("Uploading:", localFilePath);



        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

       // console.log("Successfully Uploaded:", response.secure_url);
        console.log("Cloudinary Response:", response);
        fs.unlinkSync(localFilePath)

        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return response;
    } catch (error) {
        console.error("Cloudinary Error:", error);

        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return null;
    }

};
// const uploadOnClodinary = async (localFilePath) =>{
//     try {
//         if(!localFilePath){
//             return null
//         }
//         const response = await cloudinary.uploader.upload(localFilePath, {
//             resource_type: "auto"
//         })
//         // file has been uploaded
//         console.log("Succesfully Uploaded !!! ", response.url)
//         return response;
//     } catch (error) {
//         fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
//         return null
//     }
// }

export {uploadOnClodinary}