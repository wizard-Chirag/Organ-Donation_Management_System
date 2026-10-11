const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Storage configuration
const uploadFolder = (folder) => {
    const targetDir = path.join(__dirname, "..", "uploads", folder);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            cb(null, `uploads/${folder}`);
        },
        filename: function (req, file, cb) {
            const uniqueName =
                Date.now() +
                "-" +
                Math.round(Math.random() * 1E9) +
                path.extname(file.originalname);
            cb(null, uniqueName);
        }
    });

    const fileFilter = (req, file, cb) => {
        const allowedTypes = /pdf|jpg|jpeg|png/;
        const extension = allowedTypes.test(
            path.extname(file.originalname).toLowerCase()
        );
        const mime = allowedTypes.test(file.mimetype);

        if (extension && mime) {
            cb(null, true);
        } else {
            cb(
                new Error("Only PDF, JPG, JPEG and PNG files are allowed."),
                false
            );
        }
    };

    return multer({
        fileFilter,
        storage,
        limits: {
            fileSize: 10 * 1024 * 1024
        }
    });
};

module.exports = uploadFolder;