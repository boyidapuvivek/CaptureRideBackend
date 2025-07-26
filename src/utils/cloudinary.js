import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

// OPTIMIZATION: Enhanced upload with compression and faster settings
const uploadToCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      // PERFORMANCE OPTIMIZATIONS:
      quality: "auto:good", // Automatic quality optimization
      fetch_format: "auto", // Automatic format optimization (WebP, AVIF)
      flags: "progressive", // Progressive JPEG loading
      timeout: 120000, // 2 minute timeout
      chunk_size: 6000000, // 6MB chunks for better upload speed
      // Add folder organization
      folder: "ride_documents",
      // Generate smaller versions for thumbnails if needed
      eager: [{ width: 300, height: 300, crop: "thumb", quality: "auto:low" }],
      eager_async: true, // Don't wait for eager transformations
    });

    // OPTIMIZATION: Non-blocking file cleanup
    fs.promises.unlink(localFilePath).catch((err) => {
      console.warn(`Failed to delete temp file ${localFilePath}:`, err.message);
    });

    return response;
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    // OPTIMIZATION: Non-blocking cleanup on error
    fs.promises.unlink(localFilePath).catch((err) => {
      console.warn(
        `Failed to delete temp file on error ${localFilePath}:`,
        err.message
      );
    });

    return null;
  }
};

// ALTERNATIVE: Batch upload function for even better performance
const uploadMultipleToCloudinary = async (filePaths) => {
  const uploadPromises = filePaths.map((path) => uploadToCloudinary(path));

  try {
    const results = await Promise.allSettled(uploadPromises);

    return results.map((result, index) => ({
      success: result.status === "fulfilled" && result.value !== null,
      data: result.status === "fulfilled" ? result.value : null,
      error: result.status === "rejected" ? result.reason : null,
      originalPath: filePaths[index],
    }));
  } catch (error) {
    console.error("Batch upload error:", error);
    return null;
  }
};

export { uploadToCloudinary, uploadMultipleToCloudinary };
