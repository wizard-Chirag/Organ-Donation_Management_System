const db = require('../../config/db')
const {comparePassword} = require('../../utils/passwords')

const showProfileReqestDash = (req,res)=>{

    console.log('Profile request index page loaded')
    res.render('profile_requests/ProfileModuleIndex')
}

const manageRequests = async (req, res) => {

    const hospital_id = req.hospital.hospital_id
    try {

        const search = req.query.search || "";
        const gender = req.query.gender || "";
        const status = req.query.status || "";

        let query = `
            SELECT
                d.donor_id,
                u.user_id,
                u.name,
                u.gender,
                u.dob,
                m.bloodgroup,
                h.hospital_name,
                d.attested_document_path,
                d.registered_at,
                d.verification_status

            FROM donor_profile d

            JOIN users u
                ON d.user_id = u.user_id

            JOIN hospital h
                ON d.registered_hospital_id = h.hospital_id

            JOIN user_medical_info m
                ON m.user_id = u.user_id

            WHERE 1 = 1
        `;


        const values = [];


        /*SEARCH BY NAME OR USER ID*/

        if (search !== "") {

            values.push(`%${search}%`);

            query += `
                AND (
                    u.name ILIKE $${values.length}
                    OR CAST(u.user_id AS TEXT) ILIKE $${values.length}
                )
            `;

        }

        /*FILTER BY GENDER*/

        if (gender !== "") {

            values.push(gender);

            query += `
                AND u.gender = $${values.length}
            `;

        }

        /*FILTER BY VERIFICATION STATUS*/

        if (status !== "") {

            values.push(status);

            query += `
                AND d.verification_status = $${values.length}
            `;

        }

        /*ORDER*/

        values.push(hospital_id)
        query += ` 
         AND d.registered_hospital_id = $${values.length}
             ORDER BY d.registered_at DESC
        `;


        const result =
            await db.query(query, values);


        res.render(
            "profile_requests/donor_Requests/1",
            {
                request: result.rows,

                search: search,

                gender: gender,

                status:status,

                hospitals : req.hospital
 
            }
        );

    }
    catch (error) {

        console.error(
            "Error fetching donor requests:",
            error
        );


        res.status(500).send(
            "Internal server error loading donor requests."
        );

    }

};

const requestAction = async (req,res) => {

    try {

        const hospital = req.hospital.hospital_id
        
        const {
            request_id,
            action,
            password
        } = req.body

        // ALL FILEDS ARE MANDATORY
        if(!request_id || !action || !password){
            return res.json({
                success:false,
                message:'Request ID, action and password are required'
            })
        }

        // EXTRACT PASSWORD FROM DATABASE
        const hashedPassword = await db.query(
            `select * from hospital
            where hospital_id = $1`,
            [hospital]
        )
        const hashed = hashedPassword.rows[0].hospital_password

        // COMPARE THE DATABASE PASSWORD WITH GIVEN PASSWORD

        const compare = await comparePassword(password,hashed)

        if(!compare){
            return res.status(401).json({
                success:false,
                message:'Incorrect Password'
            })
        }

        const request = await db.query(
            `select * from donor_profile
            where donor_id = $1`,
            [request_id]
        )

        if(request.rows.length==0){
            return res.json({
                success:false,
                message:'Donor Request doesnot exist'
            })
        }

        if(request.rows[0].verification_status != 'Pending'){
            return res.json({
                success:false,
                message:'Request has already been processed'
            })
        }

        if(action=='approve'){
             await db.query(
                `update donor_profile set
                verification_status = $1
                where donor_id = $2`,
                ['Approved',request_id]
            )
        }
        else{
            await db.query(
                `update donor_profile set
                verification_status = $1
                where donor_id = $2`,
                ['Rejected',request_id]
            )
        }

        return res.json({
            success:true,
            message:action === "approve"
                    ? "Donor request approved successfully."
                    : "Donor request rejected successfully."
        })
            
        
    } catch (error) {

        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Unable to process request."
        });
    }
    
}

const manageRecipientRequests = async (req,res) => {

    try {

        const hospital_id = req.hospital.hospital_id

        const search = req.query.search || ""
        const gender = req.query.gender || ""
        const status = req.query.status || ""

        let qurry =
        `select 
        r.recipient_id,
        u.user_id,
        u.name,
        u.gender,
        u.dob,
        m.bloodgroup,
        r.registered_at,
        r.attested_document_path
        
        from recipient_profile r
        JOIN users u 
        ON r.user_id = u.user_id
        JOIN user_medical_info m
        ON m.user_id = r.user_id
        
        where 1=1 `;

        const values =[]

        if(search != "")
        {
            values.push(`%${search}%`)

            qurry+=
            `AND 
            (
             u.name ILIKE $${values.length}
             OR
             CAST(u.user_id as TEXT) ILIKE $${values.length} 
             )`
        }

        if(gender != "")
        {
            values.push(gender)

            qurry+=
            ` AND u.gender = $${values.length} 
             `
        }

        /*FILTER BY VERIFICATION STATUS*/

        if (status !== "") {

            values.push(status);

            qurry += `
                 AND r.verification_status = $${values.length}
            `;

        }
        values.push(hospital_id)

        qurry+= 
        ` AND r.registered_hospital_id = $${values.length}
        ORDER BY r.registered_at DESC`

        console.log(qurry);
        console.log(values);
        const results = await db.query(qurry,values)

        res.render('profile_requests/recipient_requests/recipientRequests',{
            request : results.rows,
            hospitals: req.hospital,
             search: search,
             gender: gender,
             status:status
        })
    } catch (error) {

        console.log(error)
        res.send('Internal server error in loading requests')
        
    }
    
}

const RecipientRequestAction = async (req,res) => {
    
    try {
        
        const hospital_id = req.hospital.hospital_id

        const {
            request_id,
            action,
            password
        } = req.body

        if(!request_id || !action || !password){
            console.table(request_id,action,password)
            return res.json(
                {
                    success:false,
                    message:"Request ID, action and password are required"
                }
            )
        }

        const request = await db.query(
            `select * from recipient_profile
            where recipient_id = $1`,
            [request_id]
        )
        if(request.rows.length==0){
           return res.json(
                {
                    success:false,
                    message:"Recipient request Does not exist"
                }
            )
        }

        const hospital = await db.query(
            `select * from hospital
            where hospital_id = $1`,
            [hospital_id]
        )
        const hospital_password = hospital.rows[0].hospital_password

        const compare = await comparePassword(password,hospital_password)

        console.log(compare)
        if(!compare){
            return res.status(401).json(
                {
                    success:false,
                    message:'Incorrect Password'
                }
            )
        }

        console.log(password)
            console.log(hospital_password)


        if(request.rows[0].verification_status!='Pending'){
            console.log(request.rows[0].verification_status)
            return res.json(
                {
                    success:false,
                    message:"Request already processed"
                }
            )
        }

        let newAction
        if(action=='approve'){ newAction='Approved'}
        else{ newAction = 'Rejected'}

        await db.query(
            `update recipient_profile set
            verification_status = $1`,
            [newAction]
        )
        
        return res.json(
                {
                    success:true,
                    message:action === "approve"
                    ? "Recipient request approved successfully."
                    : "Recipient request rejected successfully."
                }
            )

    } catch (error) {
        
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Unable to process request."
        });
    }

}

module.exports = {
    showProfileReqestDash,
    manageRequests,
    requestAction,
manageRecipientRequests,
RecipientRequestAction}