const db = require('../../config/db')

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
                d_o.donor_consent,
                d_o.consent_provided_at,
                d_o.availability_status,
                d_o.registered_at,
                h.hospital_name,
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



module.exports = {
    showOrganDashboard,
    showDonorOrganPage
}