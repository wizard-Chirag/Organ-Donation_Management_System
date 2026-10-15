const db = require('../../config/db')
const {comparePassword} = require('../../utils/passwords')
const path = require('path')
const fs = require('fs')
const showOrganDashboard = (req,res)=>{

    try {
        console.log("Hospital organ request approval page loaded")
        return res.render('organ_requests/organDashboard')
    } catch (error) {
        console.log(error)
    }

}
const showDonorOrganPage = async (req,res)=>{
    try {
        const search = (req.query.search || "").trim();
            const status = (req.query.status || "").trim();
            const organ = (req.query.organ || "").trim();
    
            const allowedStatuses = [
                "Pending Verification",
                "Available",
                "Reserved",
                "Used",
                "Withdrawn",
                "Rejected"
            ];
    
            if (status && !allowedStatuses.includes(status)) {
                return res.status(400).send("Invalid status filter.");
            }
        let qurry = 
        `select  
                d_o.do_id,
				d_o.donor_id,
                d_o.organ_id,
                d_o.verified_hospital_id,
                d_o.verified_at,
                d_o.availability_status,
                d_o.verification_status,
                d_o.donor_consent,
                d_o.consent_provided_at,
                d_o.registered_at,
                h.hospital_name,
                d_o.medical_document_path,
                u.name AS donor_name,
                u.user_id,
                m.bloodgroup,
                ot.organ_name
                
                from donor_organ d_o
                
                JOIN donor_profile dp
                ON d_o.donor_id = dp.donor_id
                
                JOIN users u
                ON u.user_id = dp.user_id
                
                JOIN user_medical_info m
                ON m.user_id = u.user_id
                
                JOIN organ_type ot
                ON ot.organ_id = d_o.organ_id
                
                JOIN hospital h
                ON h.hospital_id = d_o.verified_hospital_id
                Where 1=1 `
    
                const values =[]
                if(search){
                    values.push(`%${search}%`)
    
                    qurry += 
                    `AND u.name ILIKE $${values.length}
                     OR CAST( u.user_id AS TEXT) ILIKE $${values.length} `
    
                }
    
                if(status){
                    values.push(status)
    
                    qurry += 
                    `AND d_o.availability_status ILIKE $${values.length} `
    
                }

                if(organ){
                    values.push(organ)
    
                    qurry += 
                    `AND ot.organ_name ILIKE $${values.length} `
    
                }

                console.log(qurry)
    
                const result = await db.query(qurry,values)
    
        return res.render('organ_requests/donor_organ',
            {
                hospital:req.hospital,
                organRequests:result.rows,
                search,
                status,
                organ,
                message:req.query.message || ""
            }
        )
    } catch (error) {
        console.error("Error fetching organ listing requests:", error);

        res.status(500).send(
            "Unable to load organ listing requests."
        );
    }
}

const DonorOrganAction = async (req,res) =>{
    try {
        
        const hospital_id = req.hospital.hospital_id

        const {
            organ_listing_id,
            action,
            password,
            rejection_reason
        } = req.body;

        if (!organ_listing_id || !action || !password) {
            return res.status(400).json({
                success: false,
                message: "Listing ID, action and hospital password are required."
            });
        }

        if (!["approve", "reject"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Invalid action."
            });
        }

        const reason = (rejection_reason || "").trim();

        if (action === "reject" && !reason) {
            return res.status(400).json({
                success: false,
                message: "A rejection reason is mandatory."
            });
        }

        if (reason.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "The rejection reason must not exceed 1000 characters."
            });
        }

        const hospitalResult = await db.query(
            `SELECT * 
             FROM hospital
             WHERE hospital_id = $1`,
            [hospital_id]
        );

        if (hospitalResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Hospital account not found."
            });
        }

        const passwordHash = hospitalResult.rows[0].hospital_password

        const compare = await comparePassword(password,passwordHash)

        if(!compare){
            return res.status(401).json({
                success: false,
                message: "Incorrect hospital password. No changes were made."
            });
        }

        let client;
        client = await db.connect()
        await client.query("BEGIN")

        const listing = await client.query(
            `select verification_status from donor_organ
            where verified_hospital_id = $1
            AND do_id = $2`,
            [hospital_id,organ_listing_id]
        )

        if(listing.rows.length==0 || listing.rows[0].verification_status != "Pending"){

            await client.query("ROLLBACK");
            return res.status(409).json({
                success: false,
                message: "Listing not found or already processed."
            });
        }

        if(action == "approve"){
            await client.query(
                `update donor_organ set verification_status = $1
                where verified_hospital_id = $2
                AND do_id = $3`,
                ['Approved',hospital_id,organ_listing_id]
            )
        }
        else{
            await client.query(
                `update donor_organ set verification_status = $1, rejection_reason = $2
                where verified_hospital_id = $3
                AND do_id = $4`,
                ['Rejected',reason,hospital_id,organ_listing_id]
            )
        }

        await client.query("COMMIT");


        return res.json({
            success: true,
            message: `Organ listing ${action}d successfully.`
        });

    } catch (error) {
         if (client) {
            await client.query("ROLLBACK").catch(() => {});
        }

        console.error("Organ listing action error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong."
        });

    } finally {
        // Return borrowed connection to the pool
        if (client) client.release();
    }
    
}

const serveOrganReport = async (req, res) => {
    try {
        const hospital_id = req.hospital.hospital_id
        const do_id = req.params.id

        // Fetch the listing – must belong to this hospital
        const result = await db.query(
            `SELECT medical_document_path
             FROM donor_organ
             WHERE do_id = $1
               AND verified_hospital_id = $2`,
            [do_id, hospital_id]
        )

        if (result.rows.length === 0) {
            return res.status(404).send('Report not found or access denied.')
        }

        const docPath = result.rows[0].medical_document_path

        if (!docPath) {
            return res.status(404).send('No medical document has been uploaded for this listing.')
        }

        // Build the absolute path. Paths are stored relative to project root
        // e.g. "uploads/DonorDocs/filename.pdf"
        const absolutePath = path.resolve(__dirname, '../../', docPath)

        if (!fs.existsSync(absolutePath)) {
            console.error('Medical document file missing on disk:', absolutePath)
            return res.status(404).send('Medical document file not found on server.')
        }

        // Serve inline so the browser opens it (works for PDF, images, etc.)
        res.sendFile(absolutePath, {
            headers: { 'Content-Disposition': 'inline' }
        })

    } catch (error) {
        console.error('Error serving medical report:', error)
        return res.status(500).send('Internal Server Error')
    }
}

module.exports = {
    showOrganDashboard,
    showDonorOrganPage,
    DonorOrganAction,
    serveOrganReport
}