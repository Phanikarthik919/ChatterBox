package com.chatterbox.service;

import com.chatterbox.exception.FileStorageException;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Handles file uploads via Cloudinary cloud storage.
 * Files are uploaded directly to Cloudinary and served via their CDN URLs,
 * so uploads persist across redeploys and scale effortlessly.
 */
@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final Cloudinary cloudinary;

    @Value("${app.file.allowed-extensions}")
    private String allowedExtensions;

    /** Folder inside your Cloudinary account where files will be stored. */
    private static final String CLOUDINARY_FOLDER = "chatterbox";

    /**
     * Upload a file to Cloudinary and return the secure CDN URL.
     *
     * @param file the uploaded multipart file
     * @return the permanent, publicly-accessible Cloudinary URL
     */
    public String storeFile(MultipartFile file) {
        String originalFilename = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "file"
        );

        // Validate extension
        String extension = getFileExtension(originalFilename);
        List<String> allowedExtList = Arrays.asList(allowedExtensions.split(","));
        if (!allowedExtList.contains(extension.toLowerCase())) {
            throw new FileStorageException("File type not allowed: " + extension);
        }

        try {
            // Determine resource type: image, video, or raw (docs/zips/etc.)
            String resourceType = resolveResourceType(extension.toLowerCase());

            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", CLOUDINARY_FOLDER,
                            "resource_type", resourceType,
                            "use_filename", false,
                            "unique_filename", true
                    )
            );

            // Return the CDN-served secure URL
            return (String) uploadResult.get("secure_url");

        } catch (IOException e) {
            throw new FileStorageException("Failed to upload file to Cloudinary: " + originalFilename, e);
        }
    }

    /**
     * Map file extension to Cloudinary resource_type.
     * Cloudinary requires the correct resource_type for proper handling.
     */
    private String resolveResourceType(String ext) {
        List<String> imageTypes = Arrays.asList("jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff");
        List<String> videoTypes = Arrays.asList("mp4", "mp3", "mov", "avi", "mkv", "wav", "ogg", "webm");

        if (imageTypes.contains(ext)) return "image";
        if (videoTypes.contains(ext)) return "video";
        return "raw"; // PDFs, docs, zips, etc.
    }

    private String getFileExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex < 0) return "";
        return filename.substring(dotIndex + 1);
    }
}
