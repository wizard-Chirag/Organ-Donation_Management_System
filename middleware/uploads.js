const multer = require("multer");

const path = require("path");


// Storage configuration

const uploadFolder = (folder)=>{
    const storage = multer.diskStorage({

    destination: function (req, file, cb) {

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


// File Filter

const fileFilter = (req, file, cb) => {

    const allowedTypes =

        /pdf|jpg|jpeg|png/;

    const extension =

        allowedTypes.test(

            path.extname(file.originalname).toLowerCase()

        );

    const mime =

        allowedTypes.test(file.mimetype);

    if (extension && mime) {

        cb(null, true);

    }

    else {

        cb(

            new Error(

                "Only PDF, JPG, JPEG and PNG files are allowed."

            ),

            false

        );

    }

};

return multer({
    fileFilter,
    storage,
    limits:{
        fileSize:10*1024*1024
    }
})
}


module.exports = uploadFolder;