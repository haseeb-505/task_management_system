import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const uploadToCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        // console.log("File path received in uploadToCloudinary:", localFilePath);
        // upload the file to cloudinary
       const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })

        // console.log("response from cloudinary: ", response);

        // file has been uploaded successfully
        // console.log("File uploaded successfully on cloudinary !!", response.url);
        // remove the locally saved temp file
        try {
            fs.unlinkSync(localFilePath);
        } catch (err) {
            console.error("Failed to delete file:", localFilePath, err.message);
        }
        return response; 
        // Note:
        // returning the complete response so that url can be extracted later, not the image itself
    } catch (error) {
        fs.unlinkSync(localFilePath); // remove the locally saved temp file as upload failed
    }
}

export {uploadToCloudinary};